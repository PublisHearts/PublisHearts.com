import { randomUUID } from "crypto";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { products as seededProducts } from "./products.js";

dotenv.config();

const fallbackImageUrl = "https://placehold.co/600x800/f2ece1/35211f?text=Book+Cover";
const productsFilePath =
  (process.env.PRODUCTS_FILE || "").trim() || path.join(process.cwd(), "data", "products.json");

let loaded = false;
let products = [];
let writeQueue = Promise.resolve();

export class ProductValidationError extends Error {}

function cloneProduct(product) {
  return {
    id: product.id,
    title: product.title,
    subtitle: product.subtitle,
    priceCents: product.priceCents,
    imageUrl: product.imageUrl
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

function cleanOptionalText(value, maxLength) {
  const text = String(value || "").trim();
  if (text.length > maxLength) {
    throw new ProductValidationError(`Description must be ${maxLength} characters or less.`);
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

function normalizeStoredProduct(raw) {
  const title = cleanText(raw.title, 140, "Title");
  const subtitle = cleanOptionalText(raw.subtitle, 600);
  const priceCents = cleanPriceCents(raw.priceCents);
  const imageUrl = cleanImageUrl(raw.imageUrl);
  const idCandidate = slugify(raw.id) || buildIdFromTitle(title, new Set());

  return {
    id: idCandidate,
    title,
    subtitle,
    priceCents,
    imageUrl
  };
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
    for (const entry of parsed) {
      const product = normalizeStoredProduct(entry);
      if (seenIds.has(product.id)) {
        throw new ProductValidationError(`Duplicate product id found: ${product.id}`);
      }
      seenIds.add(product.id);
      normalized.push(product);
    }
    products = normalized;
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }

    const seenIds = new Set();
    products = seededProducts.map((entry) => {
      const normalized = normalizeStoredProduct(entry);
      if (seenIds.has(normalized.id)) {
        normalized.id = buildIdFromTitle(normalized.title, seenIds);
      }
      seenIds.add(normalized.id);
      return normalized;
    });
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

export async function createProduct({ title, subtitle, priceCents, imageUrl }) {
  await ensureLoaded();

  const cleanTitle = cleanText(title, 140, "Title");
  const cleanSubtitle = cleanOptionalText(subtitle, 600);
  const cleanPrice = cleanPriceCents(priceCents);
  const cleanImage = cleanImageUrl(imageUrl);
  const usedIds = new Set(products.map((product) => product.id));
  const id = buildIdFromTitle(cleanTitle, usedIds);

  const created = {
    id,
    title: cleanTitle,
    subtitle: cleanSubtitle,
    priceCents: cleanPrice,
    imageUrl: cleanImage
  };

  products.push(created);
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
      changes.subtitle !== undefined ? cleanOptionalText(changes.subtitle, 600) : current.subtitle,
    priceCents:
      changes.priceCents !== undefined ? cleanPriceCents(changes.priceCents) : current.priceCents,
    imageUrl: changes.imageUrl !== undefined ? cleanImageUrl(changes.imageUrl) : current.imageUrl
  };

  products[index] = updated;
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
  await persistProducts();
  return true;
}
