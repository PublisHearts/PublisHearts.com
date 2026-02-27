import dotenv from "dotenv";
import express from "express";
import { createHash, randomUUID, timingSafeEqual } from "crypto";
import fs from "fs/promises";
import multer from "multer";
import path from "path";
import Stripe from "stripe";
import { fileURLToPath } from "url";
import {
  ProductValidationError,
  createProduct,
  deleteProduct,
  ensureProductStore,
  findProductById,
  listProducts,
  updateProduct
} from "./data/productStore.js";
import { sendCustomerReceipt, sendOwnerNotification } from "./lib/email.js";

dotenv.config();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const currency = (process.env.STRIPE_CURRENCY || "usd").toLowerCase();
const port = Number(process.env.PORT || 4242);
const adminPassword = (process.env.ADMIN_PASSWORD || "").trim();
const parsedShippingCountries = (process.env.ALLOWED_SHIPPING_COUNTRIES || "US")
  .split(",")
  .map((country) => country.trim().toUpperCase())
  .filter((country) => /^[A-Z]{2}$/.test(country));
const allowedShippingCountries = parsedShippingCountries.length > 0 ? parsedShippingCountries : ["US"];

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;
const app = express();
app.set("trust proxy", true);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "../public");
const uploadsDir = (process.env.UPLOADS_DIR || "").trim() || path.join(publicDir, "uploads");
const allowedImageMimes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname || "").toLowerCase().slice(0, 10);
    const safeExt = /^\.[a-z0-9]+$/.test(extension) ? extension : ".jpg";
    cb(null, `${Date.now()}-${randomUUID().slice(0, 8)}${safeExt}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 6 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (!allowedImageMimes.has(file.mimetype)) {
      cb(new Error("Only JPG, PNG, WEBP, or GIF image uploads are allowed."));
      return;
    }
    cb(null, true);
  }
});

function parseLineItemsFromMetadata(metadata = {}) {
  const summary = String(metadata.cart_summary || "").trim();
  if (!summary) {
    return [];
  }

  return summary
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((entry) => {
      const match = entry.match(/^(.*)\s+x(\d+)$/i);
      if (!match) {
        return {
          name: entry,
          quantity: 1,
          amountTotal: null
        };
      }

      return {
        name: match[1].trim() || "Book",
        quantity: Math.max(1, Number.parseInt(match[2], 10) || 1),
        amountTotal: null
      };
    });
}

function getAppUrl(req) {
  const configured = (process.env.APP_URL || "").trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  return `${req.protocol}://${req.get("host")}`;
}

function requireStripe(res) {
  if (!stripe) {
    res.status(500).json({
      error: "Stripe is not configured. Add STRIPE_SECRET_KEY in your .env file."
    });
    return false;
  }
  return true;
}

function secureEquals(left, right) {
  const leftHash = createHash("sha256").update(String(left || ""), "utf8").digest();
  const rightHash = createHash("sha256").update(String(right || ""), "utf8").digest();
  return timingSafeEqual(leftHash, rightHash);
}

function requireAdmin(req, res, next) {
  if (!adminPassword) {
    return res.status(503).json({
      error: "Admin is not configured. Add ADMIN_PASSWORD to environment variables."
    });
  }

  const supplied = String(req.headers["x-admin-password"] || "");
  if (!secureEquals(supplied, adminPassword)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  return next();
}

async function removeUploadedFile(file) {
  if (!file?.path) {
    return;
  }
  await fs.unlink(file.path).catch(() => {});
}

function priceToCents(priceInput) {
  const parsed = Number.parseFloat(String(priceInput || ""));
  if (!Number.isFinite(parsed)) {
    return Number.NaN;
  }
  return Math.round(parsed * 100);
}

function imageUrlFromRequest(req, { allowUnset = false } = {}) {
  const typedUrl = String(req.body?.imageUrl || "").trim();
  if (req.file?.filename) {
    return `/uploads/${req.file.filename}`;
  }
  if (typedUrl) {
    return typedUrl;
  }
  return allowUnset ? undefined : "";
}

app.post("/api/webhooks/stripe", express.raw({ type: "application/json" }), async (req, res) => {
  if (!stripe) {
    return res.status(500).send("Stripe not configured");
  }

  const signature = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return res.status(400).send("Missing webhook signature configuration");
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (error) {
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const eventSession = event.data.object;

    try {
      // Re-fetch the session from Stripe for complete customer/shipping fields.
      const session = await stripe.checkout.sessions.retrieve(eventSession.id);
      const lineItemsResponse = await stripe.checkout.sessions.listLineItems(session.id, {
        limit: 100
      });
      let lineItems = lineItemsResponse.data.map((item) => ({
        name: item.description || "Book",
        quantity: item.quantity || 1,
        amountTotal: item.amount_total || 0
      }));
      if (lineItems.length === 0) {
        lineItems = parseLineItemsFromMetadata(session.metadata);
        if (lineItems.length > 0) {
          console.warn(`Using metadata fallback for line items on session ${session.id}`);
        }
      }
      const customerEmail = session.customer_details?.email || session.customer_email || "";

      if (!customerEmail) {
        console.warn(`No customer email found for completed session ${session.id}`);
      } else {
        await sendCustomerReceipt({
          customerEmail,
          orderId: session.id,
          amountTotal: session.amount_total || 0,
          currency: session.currency || currency,
          lineItems,
          shippingDetails: session.shipping_details || {}
        });
        console.log(`Customer receipt sent for session ${session.id} -> ${customerEmail}`);
      }

      await sendOwnerNotification({
        orderId: session.id,
        amountTotal: session.amount_total || 0,
        currency: session.currency || currency,
        lineItems,
        customerDetails: session.customer_details || {},
        shippingDetails: session.shipping_details || {}
      });
      console.log(`Owner notification sent for session ${session.id}`);
    } catch (error) {
      console.error("Failed to process checkout completion:", error);
    }
  }

  return res.json({ received: true });
});

app.use(express.json());
app.use(express.static(publicDir));

if (path.resolve(uploadsDir) !== path.resolve(path.join(publicDir, "uploads"))) {
  app.use("/uploads", express.static(uploadsDir));
}

app.get("/api/products", async (req, res) => {
  const products = await listProducts();
  res.json(products);
});

app.post("/api/admin/login", (req, res) => {
  if (!adminPassword) {
    return res.status(503).json({
      error: "Admin is not configured. Add ADMIN_PASSWORD to environment variables."
    });
  }

  const provided = String(req.body?.password || "");
  if (!secureEquals(provided, adminPassword)) {
    return res.status(401).json({ error: "Invalid password" });
  }

  return res.json({ ok: true });
});

app.get("/api/admin/products", requireAdmin, async (req, res) => {
  const products = await listProducts();
  res.json(products);
});

app.post("/api/admin/products", requireAdmin, upload.single("image"), async (req, res) => {
  try {
    const created = await createProduct({
      title: req.body?.title,
      subtitle: req.body?.subtitle,
      priceCents: priceToCents(req.body?.price),
      imageUrl: imageUrlFromRequest(req)
    });
    return res.status(201).json(created);
  } catch (error) {
    await removeUploadedFile(req.file);
    if (error instanceof ProductValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error?.message) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: "Could not create product." });
  }
});

app.put("/api/admin/products/:id", requireAdmin, upload.single("image"), async (req, res) => {
  const removeImage = String(req.body?.removeImage || "").toLowerCase() === "true";
  const imageUrl = removeImage ? "" : imageUrlFromRequest(req, { allowUnset: true });
  const nextPriceRaw = String(req.body?.price || "").trim();
  const nextPrice = nextPriceRaw ? priceToCents(nextPriceRaw) : undefined;

  try {
    const updated = await updateProduct(req.params.id, {
      title: req.body?.title !== undefined ? req.body.title : undefined,
      subtitle: req.body?.subtitle !== undefined ? req.body.subtitle : undefined,
      priceCents: nextPriceRaw ? nextPrice : undefined,
      imageUrl
    });

    if (!updated) {
      await removeUploadedFile(req.file);
      return res.status(404).json({ error: "Product not found." });
    }

    return res.json(updated);
  } catch (error) {
    await removeUploadedFile(req.file);
    if (error instanceof ProductValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error?.message) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: "Could not update product." });
  }
});

app.delete("/api/admin/products/:id", requireAdmin, async (req, res) => {
  const deleted = await deleteProduct(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: "Product not found." });
  }
  return res.json({ ok: true });
});

app.post("/api/create-checkout-session", async (req, res) => {
  if (!requireStripe(res)) {
    return;
  }

  const cart = Array.isArray(req.body?.cart) ? req.body.cart : [];
  if (cart.length === 0) {
    return res.status(400).json({ error: "Your cart is empty." });
  }

  const lineItems = [];
  const cartSummaryParts = [];
  let unitsTotal = 0;
  for (const item of cart) {
    const product = await findProductById(item.id);
    if (!product) {
      return res.status(400).json({ error: `Unknown product id: ${item.id}` });
    }

    const quantity = Math.max(1, Math.min(10, Number.parseInt(item.quantity, 10) || 1));
    unitsTotal += quantity;
    cartSummaryParts.push(`${product.title} x${quantity}`);
    lineItems.push({
      price_data: {
        currency,
        unit_amount: product.priceCents,
        product_data: {
          name: product.title,
          description: product.subtitle
        }
      },
      quantity
    });
  }

  try {
    const appUrl = getAppUrl(req);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      billing_address_collection: "required",
      phone_number_collection: {
        enabled: true
      },
      shipping_address_collection: {
        allowed_countries: allowedShippingCountries
      },
      allow_promotion_codes: true,
      success_url: `${appUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/cancel.html`,
      metadata: {
        storefront: "publishearts.com",
        units_total: String(unitsTotal),
        cart_summary: cartSummaryParts.join(" | ").slice(0, 500)
      }
    });

    return res.json({ url: session.url });
  } catch (error) {
    console.error("Failed creating checkout session:", error);
    const details = typeof error?.message === "string" ? error.message : "";
    return res.status(500).json({
      error: details ? `Could not start checkout: ${details}` : "Could not start checkout right now."
    });
  }
});

app.get("/api/order/:sessionId", async (req, res) => {
  if (!requireStripe(res)) {
    return;
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
    if (!session || session.payment_status !== "paid") {
      return res.status(404).json({ error: "Order not found." });
    }

    const lineItemsResponse = await stripe.checkout.sessions.listLineItems(session.id, {
      limit: 100
    });
    let lineItems = lineItemsResponse.data.map((item) => ({
      name: item.description || "Book",
      quantity: item.quantity || 1,
      amountTotal: item.amount_total || 0
    }));
    if (lineItems.length === 0) {
      lineItems = parseLineItemsFromMetadata(session.metadata);
    }

    return res.json({
      id: session.id,
      amountTotal: session.amount_total || 0,
      currency: session.currency || currency,
      customerEmail: session.customer_details?.email || session.customer_email || "",
      shippingDetails: session.shipping_details || null,
      lineItems
    });
  } catch {
    return res.status(404).json({ error: "Order not found." });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/admin", (req, res) => {
  res.redirect("/admin.html");
});

app.use((error, req, res, next) => {
  if (!error) {
    return next();
  }

  const isApiRequest = String(req.path || "").startsWith("/api/");
  if (isApiRequest) {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "Image must be 6MB or smaller." });
      }
      return res.status(400).json({ error: error.message });
    }
    if (error?.message) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: "Unexpected server error." });
  }

  return next(error);
});

app.get("*", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

async function start() {
  await ensureProductStore();
  await fs.mkdir(uploadsDir, { recursive: true });

  app.listen(port, () => {
    if (!stripe) {
      console.warn("STRIPE_SECRET_KEY is missing. Checkout is disabled until configured.");
    }
    if (!adminPassword) {
      console.warn("ADMIN_PASSWORD is missing. Admin product editor is disabled.");
    }
    console.log(`PublisHearts store running on http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start PublisHearts store:", error);
  process.exit(1);
});
