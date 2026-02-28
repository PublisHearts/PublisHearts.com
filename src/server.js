import dotenv from "dotenv";
import express from "express";
import { createHash, randomUUID, timingSafeEqual } from "crypto";
import fs from "fs/promises";
import multer from "multer";
import os from "os";
import path from "path";
import Stripe from "stripe";
import { execFile } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";
import {
  ProductValidationError,
  createProduct,
  deleteProduct,
  ensureProductStore,
  findProductById,
  listProducts,
  reorderProducts,
  updateProduct
} from "./data/productStore.js";
import { sendCustomerReceipt, sendOwnerNotification } from "./lib/email.js";
import {
  SiteSettingsValidationError,
  ensureSiteSettingsStore,
  getSiteSettings,
  updateSiteSettings
} from "./data/siteSettingsStore.js";

dotenv.config();
const execFileAsync = promisify(execFile);

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const currency = (process.env.STRIPE_CURRENCY || "usd").toLowerCase();
const port = Number(process.env.PORT || 4242);
const adminPassword = (process.env.ADMIN_PASSWORD || "").trim();
const githubPushToken = (process.env.GITHUB_PUSH_TOKEN || "").trim();
const githubRepoRaw = (process.env.GITHUB_REPO || process.env.GITHUB_REPOSITORY || "").trim();
const githubRepoOwner = (process.env.GITHUB_REPO_OWNER || "PublisHearts").trim() || "PublisHearts";
const githubBranch = (process.env.GITHUB_BRANCH || "main").trim() || "main";
const githubAuthorName = (process.env.GITHUB_AUTHOR_NAME || "PublisHearts Admin Bot").trim();
const githubAuthorEmail = (process.env.GITHUB_AUTHOR_EMAIL || "admin@publishearts.com").trim();
const parsedShippingWeightPerUnitLbs = Number.parseFloat(String(process.env.SHIPPING_WEIGHT_PER_UNIT_LBS || "1.5"));
const shippingWeightPerUnitLbs =
  Number.isFinite(parsedShippingWeightPerUnitLbs) && parsedShippingWeightPerUnitLbs > 0
    ? parsedShippingWeightPerUnitLbs
    : 1.5;
const parsedShippingMinimumDollars = Number.parseFloat(String(process.env.SHIPPING_MIN_FEE || "10"));
const shippingMinimumCents =
  Number.isFinite(parsedShippingMinimumDollars) && parsedShippingMinimumDollars >= 0
    ? Math.round(parsedShippingMinimumDollars * 100)
    : 1000;
const uspsGroundAdvantageZone1Cents = [
  885, 1000, 1045, 1090, 1135, 1180, 1225, 1270, 1315, 1360, 1405, 1450, 1495, 1540, 1585, 1630, 1675, 1720, 1765,
  1810, 2220, 2280, 2340, 2400, 2460, 2520, 2580, 2640, 2700, 2760, 2820, 2880, 2940, 3000, 3060, 3120, 3180, 3240,
  3300, 3360, 3420, 3475, 3530, 3585, 3640, 3695, 3750, 3805, 3860, 3915, 3970, 4025, 4080, 4135, 4190, 4245, 4300,
  4355, 4410, 4465, 4520, 4575, 5620, 5660, 5700, 5740, 5780, 5820, 5875, 5935
];
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

function getUspsGroundAdvantageRetailCents(weightLbs) {
  const billableLbs = Math.max(1, Math.ceil(Number(weightLbs) || 0));
  if (billableLbs <= uspsGroundAdvantageZone1Cents.length) {
    return uspsGroundAdvantageZone1Cents[billableLbs - 1];
  }

  const lastRate = uspsGroundAdvantageZone1Cents[uspsGroundAdvantageZone1Cents.length - 1];
  const extraLbs = billableLbs - uspsGroundAdvantageZone1Cents.length;
  return lastRate + extraLbs * 60;
}

function calculateShippingFromUnits(shippableUnits) {
  const units = Math.max(0, Number(shippableUnits) || 0);
  if (units <= 0) {
    return 0;
  }
  const totalWeightLbs = units * shippingWeightPerUnitLbs;
  const weightBasedCents = getUspsGroundAdvantageRetailCents(totalWeightLbs);
  return Math.max(shippingMinimumCents, weightBasedCents);
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

async function removeUploadedFiles(files, fieldNames = []) {
  if (!files || typeof files !== "object") {
    return;
  }

  const namesToDelete = fieldNames.length > 0 ? fieldNames : Object.keys(files);
  const fileList = namesToDelete.flatMap((name) => (Array.isArray(files[name]) ? files[name] : []));
  await Promise.all(fileList.map((file) => removeUploadedFile(file)));
}

function parseBooleanFlag(value, defaultValue = undefined) {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }
  if (typeof value === "boolean") {
    return value;
  }

  const text = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(text)) {
    return true;
  }
  if (["false", "0", "no", "off"].includes(text)) {
    return false;
  }
  return defaultValue;
}

function priceToCents(priceInput) {
  const parsed = Number.parseFloat(String(priceInput || ""));
  if (!Number.isFinite(parsed)) {
    return Number.NaN;
  }
  return Math.round(parsed * 100);
}

function optionalPriceToCents(priceInput) {
  const raw = String(priceInput ?? "").trim();
  if (!raw) {
    return undefined;
  }
  return priceToCents(raw);
}

function imageUrlFromRequest(req, { allowUnset = false } = {}) {
  const typedUrl = String(req.body?.imageUrl || "").trim();
  const uploadedPrimary = uploadedImageUrl(req.files, "image");
  if (uploadedPrimary) {
    return uploadedPrimary;
  }
  if (req.file?.filename) {
    return `/uploads/${req.file.filename}`;
  }
  if (typedUrl) {
    return typedUrl;
  }
  return allowUnset ? undefined : "";
}

function uploadedImageUrl(files, fieldName) {
  const file = Array.isArray(files?.[fieldName]) ? files[fieldName][0] : null;
  if (!file?.filename) {
    return undefined;
  }
  return `/uploads/${file.filename}`;
}

function uploadedImageUrls(files, fieldName) {
  const list = Array.isArray(files?.[fieldName]) ? files[fieldName] : [];
  return list
    .map((file) => {
      if (!file?.filename) {
        return "";
      }
      return `/uploads/${file.filename}`;
    })
    .filter(Boolean);
}

function parseImageUrlList(raw, { defaultEmpty = false } = {}) {
  if (raw === undefined || raw === null) {
    return defaultEmpty ? [] : undefined;
  }

  if (Array.isArray(raw)) {
    return raw
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);
  }

  const text = String(raw).trim();
  if (!text) {
    return [];
  }

  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed
          .map((entry) => String(entry || "").trim())
          .filter(Boolean);
      }
    } catch {
      // Fall back to newline/comma parsing.
    }
  }

  return text
    .split(/\r?\n|,/g)
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);
}

function extractSiteSettingsChanges(req) {
  const removeLogo = String(req.body?.removeLogo || "").toLowerCase() === "true";
  const removeBanner = String(req.body?.removeBanner || "").toLowerCase() === "true";
  let logoImageUrl = uploadedImageUrl(req.files, "logoImage");
  let heroBannerImageUrl = uploadedImageUrl(req.files, "heroBannerImage");
  if (removeLogo) {
    logoImageUrl = "";
  } else {
    const typedLogoUrl = String(req.body?.logoImageUrl || "").trim();
    if (typedLogoUrl) {
      logoImageUrl = typedLogoUrl;
    }
  }
  if (removeBanner) {
    heroBannerImageUrl = "";
  } else {
    const typedBannerUrl = String(req.body?.heroBannerImageUrl || "").trim();
    if (typedBannerUrl) {
      heroBannerImageUrl = typedBannerUrl;
    }
  }

  const fields = [
    "brandName",
    "brandMark",
    "heroBannerImageUrl",
    "pageTitle",
    "pageDescription",
    "heroEyebrow",
    "heroTitle",
    "heroCopy",
    "heroCtaLabel",
    "featuredTitle",
    "featuredCopy",
    "promise1Title",
    "promise1Copy",
    "promise2Title",
    "promise2Copy",
    "promise3Title",
    "promise3Copy",
    "footerLeft",
    "footerRight",
    "themeAccent",
    "themeAccentStrong",
    "themeBackground",
    "themeInk"
  ];

  const changes = {};
  for (const key of fields) {
    if (req.body?.[key] !== undefined) {
      changes[key] = req.body[key];
    }
  }
  if (logoImageUrl !== undefined) {
    changes.logoImageUrl = logoImageUrl;
  }
  if (heroBannerImageUrl !== undefined) {
    changes.heroBannerImageUrl = heroBannerImageUrl;
  }

  return changes;
}

function normalizeGithubRepo(input) {
  const raw = String(input || "").trim();
  if (!raw) {
    return "";
  }

  let cleaned = raw
    .replace(/^https?:\/\/github\.com\//i, "")
    .replace(/^github\.com\//i, "")
    .replace(/\.git$/i, "")
    .replace(/^\/+|\/+$/g, "");

  if (!cleaned) {
    return "";
  }

  if (!cleaned.includes("/")) {
    cleaned = `${githubRepoOwner}/${cleaned}`;
  } else {
    const parts = cleaned.split("/").filter(Boolean);
    if (parts.length >= 2) {
      cleaned = `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
    }
  }

  return cleaned;
}

function buildAuthenticatedGithubRemoteUrl() {
  if (!githubPushToken) {
    return {
      remoteUrl: null,
      error: "GITHUB_PUSH_TOKEN is empty."
    };
  }

  const normalizedRepo =
    normalizeGithubRepo(githubRepoRaw) || "PublisHearts/PublisHearts.com";
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(normalizedRepo)) {
    return {
      remoteUrl: null,
      error: `GITHUB_REPO is invalid. Use owner/repo (current: "${githubRepoRaw || "(empty)"}").`
    };
  }

  const safeToken = encodeURIComponent(githubPushToken);
  return {
    remoteUrl: `https://x-access-token:${safeToken}@github.com/${normalizedRepo}.git`,
    repo: normalizedRepo,
    error: ""
  };
}

function maskSecrets(text) {
  let output = String(text || "");
  if (githubPushToken) {
    output = output.split(githubPushToken).join("***");
    output = output.split(encodeURIComponent(githubPushToken)).join("***");
  }
  return output;
}

async function runGit(args, { allowNonZero = false, cwd = process.cwd() } = {}) {
  try {
    const result = await execFileAsync("git", args, {
      cwd,
      windowsHide: true,
      maxBuffer: 1024 * 1024 * 8
    });
    return {
      code: 0,
      stdout: String(result.stdout || ""),
      stderr: String(result.stderr || "")
    };
  } catch (error) {
    const code = typeof error?.code === "number" ? error.code : 1;
    const stdout = String(error?.stdout || "");
    const stderr = String(error?.stderr || error?.message || "Git command failed.");
    if (allowNonZero) {
      return {
        code,
        stdout,
        stderr
      };
    }
    throw new Error(maskSecrets(stderr || stdout || "Git command failed."));
  }
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function syncPublishContent(targetRoot) {
  const sourceProducts = path.join(process.cwd(), "data/products.json");
  const sourceSettings = path.join(process.cwd(), "data/site-settings.json");
  const sourceUploads = path.join(process.cwd(), "public/uploads");

  const targetProducts = path.join(targetRoot, "data/products.json");
  const targetSettings = path.join(targetRoot, "data/site-settings.json");
  const targetUploads = path.join(targetRoot, "public/uploads");

  await fs.mkdir(path.dirname(targetProducts), { recursive: true });
  await fs.mkdir(path.dirname(targetSettings), { recursive: true });
  await fs.copyFile(sourceProducts, targetProducts);
  await fs.copyFile(sourceSettings, targetSettings);

  await fs.rm(targetUploads, { recursive: true, force: true });
  await fs.mkdir(path.dirname(targetUploads), { recursive: true });
  if (await pathExists(sourceUploads)) {
    await fs.cp(sourceUploads, targetUploads, { recursive: true });
  } else {
    await fs.mkdir(targetUploads, { recursive: true });
  }
}

async function publishAdminSnapshot(commitMessageInput = "") {
  const remoteConfig = buildAuthenticatedGithubRemoteUrl();
  if (!remoteConfig.remoteUrl) {
    throw new Error(`GitHub publish config error: ${remoteConfig.error}`);
  }
  const remoteUrl = remoteConfig.remoteUrl;

  const cleanMessage = String(commitMessageInput || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 120);
  const finalMessage =
    cleanMessage || `Admin content snapshot ${new Date().toISOString().replace(/\.\d{3}Z$/, "Z")}`;

  const localGitDir = path.join(process.cwd(), ".git");
  const hasLocalGit = await pathExists(localGitDir);

  if (hasLocalGit) {
    await runGit(["add", "-A", "--", "data/products.json", "data/site-settings.json", "public/uploads"]);

    const stagedCheck = await runGit(["diff", "--cached", "--quiet", "--"], { allowNonZero: true });
    if (stagedCheck.code === 0) {
      return {
        published: false,
        message: "No new changes to publish."
      };
    }

    await runGit([
      "-c",
      `user.name=${githubAuthorName}`,
      "-c",
      `user.email=${githubAuthorEmail}`,
      "commit",
      "-m",
      finalMessage
    ]);

    await runGit(["push", remoteUrl, `HEAD:${githubBranch}`]);
    const head = await runGit(["rev-parse", "--short", "HEAD"]);

    return {
      published: true,
      branch: githubBranch,
      commit: String(head.stdout || "").trim(),
      message: "Published to GitHub."
    };
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "publishearts-publish-"));
  try {
    await runGit(["init"], { cwd: tempDir });
    await runGit(["remote", "add", "origin", remoteUrl], { cwd: tempDir });
    await runGit(["fetch", "--depth", "1", "origin", githubBranch], { cwd: tempDir });
    await runGit(["checkout", "-B", githubBranch, "FETCH_HEAD"], { cwd: tempDir });

    await syncPublishContent(tempDir);
    await runGit(["add", "-A", "--", "data/products.json", "data/site-settings.json", "public/uploads"], {
      cwd: tempDir
    });

    const stagedCheck = await runGit(["diff", "--cached", "--quiet", "--"], {
      allowNonZero: true,
      cwd: tempDir
    });
    if (stagedCheck.code === 0) {
      return {
        published: false,
        message: "No new changes to publish."
      };
    }

    await runGit(
      [
        "-c",
        `user.name=${githubAuthorName}`,
        "-c",
        `user.email=${githubAuthorEmail}`,
        "commit",
        "-m",
        finalMessage
      ],
      { cwd: tempDir }
    );
    await runGit(["push", "origin", `HEAD:${githubBranch}`], { cwd: tempDir });
    const head = await runGit(["rev-parse", "--short", "HEAD"], { cwd: tempDir });

    return {
      published: true,
      branch: githubBranch,
      commit: String(head.stdout || "").trim(),
      message: "Published to GitHub."
    };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
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

app.get("/api/site-settings", async (req, res) => {
  const settings = await getSiteSettings();
  res.json(settings);
});

app.get("/api/products", async (req, res) => {
  const products = await listProducts();
  const visibleProducts = products.filter((product) => product.isVisible !== false);
  res.json(visibleProducts);
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

app.get("/api/admin/site-settings", requireAdmin, async (req, res) => {
  const settings = await getSiteSettings();
  res.json(settings);
});

const siteSettingsUpload = upload.fields([
  { name: "logoImage", maxCount: 1 },
  { name: "heroBannerImage", maxCount: 1 }
]);

const productUpload = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "productImages", maxCount: 16 },
  { name: "includedImages", maxCount: 16 }
]);

app.put("/api/admin/site-settings", requireAdmin, siteSettingsUpload, async (req, res) => {
  try {
    const updated = await updateSiteSettings(extractSiteSettingsChanges(req));
    return res.json(updated);
  } catch (error) {
    await removeUploadedFiles(req.files);
    if (error instanceof SiteSettingsValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error?.message) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: "Could not update site settings." });
  }
});

app.post("/api/admin/products", requireAdmin, productUpload, async (req, res) => {
  const productImageUrls = [
    ...parseImageUrlList(req.body?.productImageUrls, { defaultEmpty: true }),
    ...uploadedImageUrls(req.files, "productImages")
  ];
  const includedImageUrls = [
    ...parseImageUrlList(req.body?.includedImageUrls, { defaultEmpty: true }),
    ...uploadedImageUrls(req.files, "includedImages")
  ];

  try {
    const created = await createProduct({
      title: req.body?.title,
      subtitle: req.body?.subtitle,
      included: req.body?.included,
      priceCents: priceToCents(req.body?.price),
      imageUrl: imageUrlFromRequest(req),
      productImageUrls,
      includedImageUrls,
      inStock: parseBooleanFlag(req.body?.inStock, true),
      shippingEnabled: parseBooleanFlag(req.body?.shippingEnabled, true),
      shippingFeeCents: optionalPriceToCents(req.body?.shippingFee),
      isVisible: parseBooleanFlag(req.body?.isVisible, true),
      isComingSoon: parseBooleanFlag(req.body?.isComingSoon, false)
    });
    return res.status(201).json(created);
  } catch (error) {
    await removeUploadedFiles(req.files, ["image", "productImages", "includedImages"]);
    if (error instanceof ProductValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error?.message) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: "Could not create product." });
  }
});

app.put("/api/admin/products/:id", requireAdmin, productUpload, async (req, res) => {
  const removeImage = String(req.body?.removeImage || "").toLowerCase() === "true";
  const imageUrl = removeImage ? "" : imageUrlFromRequest(req, { allowUnset: true });
  const nextPriceRaw = String(req.body?.price || "").trim();
  const nextPrice = nextPriceRaw ? priceToCents(nextPriceRaw) : undefined;
  const shippingFeeRaw = String(req.body?.shippingFee || "").trim();
  const nextShippingFee = shippingFeeRaw ? priceToCents(shippingFeeRaw) : undefined;
  const uploadedProductImages = uploadedImageUrls(req.files, "productImages");
  const uploadedIncludedImages = uploadedImageUrls(req.files, "includedImages");
  const productImageListProvided = req.body?.productImageUrls !== undefined || uploadedProductImages.length > 0;
  const includedImageListProvided = req.body?.includedImageUrls !== undefined || uploadedIncludedImages.length > 0;
  const nextProductImageUrls = productImageListProvided
    ? [...parseImageUrlList(req.body?.productImageUrls, { defaultEmpty: true }), ...uploadedProductImages]
    : undefined;
  const nextIncludedImageUrls = includedImageListProvided
    ? [...parseImageUrlList(req.body?.includedImageUrls, { defaultEmpty: true }), ...uploadedIncludedImages]
    : undefined;

  try {
    const updated = await updateProduct(req.params.id, {
      title: req.body?.title !== undefined ? req.body.title : undefined,
      subtitle: req.body?.subtitle !== undefined ? req.body.subtitle : undefined,
      included: req.body?.included !== undefined ? req.body.included : undefined,
      priceCents: nextPriceRaw ? nextPrice : undefined,
      imageUrl,
      productImageUrls: nextProductImageUrls,
      includedImageUrls: nextIncludedImageUrls,
      shippingEnabled: parseBooleanFlag(req.body?.shippingEnabled, undefined),
      shippingFeeCents: shippingFeeRaw ? nextShippingFee : undefined,
      isVisible: parseBooleanFlag(req.body?.isVisible, undefined),
      isComingSoon: parseBooleanFlag(req.body?.isComingSoon, undefined),
      inStock: parseBooleanFlag(req.body?.inStock, undefined)
    });

    if (!updated) {
      await removeUploadedFiles(req.files, ["image", "productImages", "includedImages"]);
      return res.status(404).json({ error: "Product not found." });
    }

    return res.json(updated);
  } catch (error) {
    await removeUploadedFiles(req.files, ["image", "productImages", "includedImages"]);
    if (error instanceof ProductValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error?.message) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: "Could not update product." });
  }
});

app.post("/api/admin/products/reorder", requireAdmin, async (req, res) => {
  try {
    const productIds = Array.isArray(req.body?.productIds) ? req.body.productIds : [];
    const reordered = await reorderProducts(productIds);
    return res.json(reordered);
  } catch (error) {
    if (error instanceof ProductValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error?.message) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: "Could not reorder products." });
  }
});

app.delete("/api/admin/products/:id", requireAdmin, async (req, res) => {
  const deleted = await deleteProduct(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: "Product not found." });
  }
  return res.json({ ok: true });
});

app.post("/api/admin/publish", requireAdmin, async (req, res) => {
  try {
    const result = await publishAdminSnapshot(req.body?.message);
    return res.json(result);
  } catch (error) {
    const text = String(error?.message || "");
    if (text.includes("GitHub publish config error")) {
      return res.status(503).json({ error: text });
    }
    return res.status(500).json({ error: maskSecrets(text || "Could not publish changes.") });
  }
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
  let shippableUnits = 0;
  let itemsSubtotal = 0;
  for (const item of cart) {
    const product = await findProductById(item.id);
    if (!product) {
      return res.status(400).json({ error: `Unknown product id: ${item.id}` });
    }
    if (product.isVisible === false) {
      return res.status(400).json({ error: `${product.title} is currently unavailable.` });
    }
    if (product.isComingSoon === true) {
      return res.status(400).json({ error: `${product.title} is coming soon and not orderable yet.` });
    }
    if (!product.inStock) {
      return res.status(400).json({ error: `${product.title} is sold out right now.` });
    }

    const quantity = Math.max(1, Math.min(10, Number.parseInt(item.quantity, 10) || 1));
    unitsTotal += quantity;
    itemsSubtotal += product.priceCents * quantity;
    if (product.shippingEnabled === true) {
      shippableUnits += quantity;
    }
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

  const shippingTotal = calculateShippingFromUnits(shippableUnits);
  const shippingWeightLbs = Number((shippableUnits * shippingWeightPerUnitLbs).toFixed(2));

  if (shippingTotal > 0) {
    lineItems.push({
      price_data: {
        currency,
        unit_amount: shippingTotal,
        product_data: {
          name: "Shipping",
          description: `USPS Ground Advantage (est.) - ${shippingWeightLbs} lb`
        }
      },
      quantity: 1
    });
    cartSummaryParts.push("Shipping x1");
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
        shippable_units: String(shippableUnits),
        shipping_weight_lbs: String(shippingWeightLbs),
        items_subtotal_cents: String(itemsSubtotal),
        shipping_total_cents: String(shippingTotal),
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
  await ensureSiteSettingsStore();
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
