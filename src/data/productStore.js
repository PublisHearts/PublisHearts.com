import { randomUUID } from "crypto";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { products as seededProducts } from "./products.js";

dotenv.config();

const fallbackImageUrl = "https://placehold.co/600x800/f2ece1/35211f?text=Book+Cover";
const productsFilePath =
  (process.env.PRODUCTS_FILE || "").trim() || path.join(process.cwd(), "data", "products.json");
const parsedDefaultShippingFee = Number.parseFloat(String(process.env.DEFAULT_SHIPPING_FEE || "5"));
const defaultShippingFeeCents =
  Number.isFinite(parsedDefaultShippingFee) && parsedDefaultShippingFee >= 0
    ? Math.round(parsedDefaultShippingFee * 100)
    : 500;

let loaded = false;
let products = [];
let writeQueue = Promise.resolve();

export class ProductValidationError extends Error {}

function cloneProduct(product) {
  return {
    id: product.id,
    title: product.title,
    subtitle: product.subtitle,
    included: product.included,
    priceCents: product.priceCents,
    imageUrl: product.imageUrl,
    shippingEnabled: Boolean(product.shippingEnabled),
    shippingFeeCents: Number.isFinite(product.shippingFeeCents)
      ? product.shippingFeeCents
      : defaultShippingFeeCents,
    inStock: Boolean(product.inStock),
    sortOrder: Number.isFinite(product.sortOrder) ? product.sortOrder : 0
  };
}

function cleanText(value, maxLength, fieldName) {
  const text = String(value || "").trim();
  if (!text) {
    throw new ProductValidationError(`${fieldName} is required.`);
  }
  if (text.length > maxLength) {
    throw new ProductValidationError(`${fieldName} must be ${maxLength} characters or less.`);
  }
  return text;
}

function cleanOptionalText(value, maxLength, fieldName = "Description") {
  const text = String(value || "").trim();
  if (text.length > maxLength) {
    throw new ProductValidationError(`${fieldName} must be ${maxLength} characters or less.`);
  }
  return text;
}

function cleanPriceCents(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new ProductValidationError("Price is required.");
  }
  const rounded = Math.round(parsed);
  if (rounded < 50 || rounded > 1000000) {
    throw new ProductValidationError("Price must be between $0.50 and $10,000.00.");
  }
  return rounded;
}

function cleanImageUrl(value) {
  const candidate = String(value || "").trim();
  if (!candidate) {
    return fallbackImageUrl;
  }
  if (candidate.startsWith("/uploads/")) {
    return candidate;
  }
  if (/^https?:\/\//i.test(candidate)) {
    return candidate;
  }
  throw new ProductValidationError("Image URL must start with https://, http://, or /uploads/.");
}

function cleanInStock(value, defaultValue = true) {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  if (typeof value === "boolean") {
    return value;
  }

  const text = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "on", "instock", "in-stock", "available"].includes(text)) {
    return true;
  }
  if (["false", "0", "no", "off", "soldout", "sold-out", "outofstock", "out-of-stock"].includes(text)) {
    return false;
  }

  throw new ProductValidationError("In-stock flag must be true or false.");
}

function cleanShippingEnabled(value, defaultValue = true) {
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

  throw new ProductValidationError("Shipping toggle must be true or false.");
}

function cleanShippingFeeCents(value, defaultValue = defaultShippingFeeCents) {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new ProductValidationError("Shipping fee is invalid.");
  }

  const rounded = Math.round(parsed);
  if (rounded < 0 || rounded > 100000) {
    throw new ProductValidationError("Shipping fee must be between $0.00 and $1,000.00.");
  }
  return rounded;
}

function cleanSortOrder(value, fallbackSortOrder = 0) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallbackSortOrder;
  }
  return parsed;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function buildIdFromTitle(title, existingIds) {
  const base = slugify(title) || "book";
  let candidate = base;
  while (existingIds.has(candidate)) {
    candidate = `${base}-${randomUUID().slice(0, 6)}`;
  }
  return candidate;
}

function normalizeStoredProduct(raw, fallbackSortOrder = 0) {
  const title = cleanText(raw.title, 140, "Title");
  const subtitle = cleanOptionalText(raw.subtitle, 600, "Description");
  const included = cleanOptionalText(raw.included, 800, "What's included");
  const priceCents = cleanPriceCents(raw.priceCents);
  const imageUrl = cleanImageUrl(raw.imageUrl);
  const shippingEnabled = cleanShippingEnabled(raw.shippingEnabled, true);
  const shippingFeeCents = cleanShippingFeeCents(raw.shippingFeeCents, defaultShippingFeeCents);
  const inStock = cleanInStock(raw.inStock, true);
  const sortOrder = cleanSortOrder(raw.sortOrder, fallbackSortOrder);
  const idCandidate = slugify(raw.id) || buildIdFromTitle(title, new Set());

  return {
    id: idCandidate,
    title,
    subtitle,
    included,
    priceCents,
    imageUrl,
    shippingEnabled,
    shippingFeeCents,
    inStock,
    sortOrder
  };
}

function sortAndReindexInPlace(items) {
  items.sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }
    return left.title.localeCompare(right.title);
  });

  for (let index = 0; index < items.length; index += 1) {
    items[index].sortOrder = index;
  }
  return items;
}

async function persistProducts() {
  writeQueue = writeQueue.then(async () => {
    const directory = path.dirname(productsFilePath);
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(productsFilePath, `${JSON.stringify(products, null, 2)}\n`, "utf8");
  });
  return writeQueue;
}

async function loadFromDisk() {
  try {
    const raw = await fs.readFile(productsFilePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new ProductValidationError("Products file must contain an array.");
    }

    const seenIds = new Set();
    const normalized = [];
    for (let index = 0; index < parsed.length; index += 1) {
      const entry = parsed[index];
      const product = normalizeStoredProduct(entry, index);
      if (seenIds.has(product.id)) {
        throw new ProductValidationError(`Duplicate product id found: ${product.id}`);
      }
      seenIds.add(product.id);
      normalized.push(product);
    }
    products = sortAndReindexInPlace(normalized);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }

    const seenIds = new Set();
    products = seededProducts.map((entry, index) => {
      const normalized = normalizeStoredProduct(entry, index);
      if (seenIds.has(normalized.id)) {
        normalized.id = buildIdFromTitle(normalized.title, seenIds);
      }
      seenIds.add(normalized.id);
      return normalized;
    });
    sortAndReindexInPlace(products);
    await persistProducts();
  }

  loaded = true;
}

async function ensureLoaded() {
  if (!loaded) {
    await loadFromDisk();
  }
}

export async function ensureProductStore() {
  await ensureLoaded();
}

export async function listProducts() {
  await ensureLoaded();
  return products.map(cloneProduct);
}

export async function findProductById(productId) {
  await ensureLoaded();
  const found = products.find((product) => product.id === productId);
  return found ? cloneProduct(found) : null;
}

export async function createProduct({
  title,
  subtitle,
  included,
  priceCents,
  imageUrl,
  inStock,
  shippingEnabled,
  shippingFeeCents
}) {
  await ensureLoaded();

  const cleanTitle = cleanText(title, 140, "Title");
  const cleanSubtitle = cleanOptionalText(subtitle, 600, "Description");
  const cleanIncluded = cleanOptionalText(included, 800, "What's included");
  const cleanPrice = cleanPriceCents(priceCents);
  const cleanImage = cleanImageUrl(imageUrl);
  const cleanAvailability = cleanInStock(inStock, true);
  const cleanShippingToggle = cleanShippingEnabled(shippingEnabled, true);
  const cleanShippingFee = cleanShippingFeeCents(shippingFeeCents, defaultShippingFeeCents);
  const usedIds = new Set(products.map((product) => product.id));
  const id = buildIdFromTitle(cleanTitle, usedIds);

  const created = {
    id,
    title: cleanTitle,
    subtitle: cleanSubtitle,
    included: cleanIncluded,
    priceCents: cleanPrice,
    imageUrl: cleanImage,
    shippingEnabled: cleanShippingToggle,
    shippingFeeCents: cleanShippingFee,
    inStock: cleanAvailability,
    sortOrder: products.length
  };

  products.push(created);
  sortAndReindexInPlace(products);
  await persistProducts();
  return cloneProduct(created);
}

export async function updateProduct(productId, changes) {
  await ensureLoaded();
  const index = products.findIndex((product) => product.id === productId);
  if (index === -1) {
    return null;
  }

  const current = products[index];
  const updated = {
    ...current,
    title: changes.title !== undefined ? cleanText(changes.title, 140, "Title") : current.title,
    subtitle:
      changes.subtitle !== undefined
        ? cleanOptionalText(changes.subtitle, 600, "Description")
        : current.subtitle,
    included:
      changes.included !== undefined
        ? cleanOptionalText(changes.included, 800, "What's included")
        : current.included,
    priceCents:
      changes.priceCents !== undefined ? cleanPriceCents(changes.priceCents) : current.priceCents,
    imageUrl: changes.imageUrl !== undefined ? cleanImageUrl(changes.imageUrl) : current.imageUrl,
    shippingEnabled:
      changes.shippingEnabled !== undefined
        ? cleanShippingEnabled(changes.shippingEnabled, current.shippingEnabled)
        : current.shippingEnabled,
    shippingFeeCents:
      changes.shippingFeeCents !== undefined
        ? cleanShippingFeeCents(changes.shippingFeeCents, current.shippingFeeCents)
        : current.shippingFeeCents,
    inStock:
      changes.inStock !== undefined ? cleanInStock(changes.inStock, current.inStock) : current.inStock,
    sortOrder: current.sortOrder
  };

  products[index] = updated;
  sortAndReindexInPlace(products);
  await persistProducts();
  return cloneProduct(updated);
}

export async function deleteProduct(productId) {
  await ensureLoaded();
  const index = products.findIndex((product) => product.id === productId);
  if (index === -1) {
    return false;
  }

  products.splice(index, 1);
  sortAndReindexInPlace(products);
  await persistProducts();
  return true;
}

export async function reorderProducts(productIds) {
  await ensureLoaded();

  if (!Array.isArray(productIds) || productIds.length !== products.length) {
    throw new ProductValidationError("Product order update must include every product exactly once.");
  }

  const byId = new Map(products.map((product) => [product.id, product]));
  const seenIds = new Set();

  const reordered = productIds.map((rawId, index) => {
    const productId = String(rawId || "").trim();
    if (!productId || !byId.has(productId) || seenIds.has(productId)) {
      throw new ProductValidationError("Product order update contains invalid or duplicate product IDs.");
    }
    seenIds.add(productId);
    return {
      ...byId.get(productId),
      sortOrder: index
    };
  });

  products = reordered;
  await persistProducts();
  return products.map(cloneProduct);
}
