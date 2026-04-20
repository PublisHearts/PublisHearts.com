import { randomUUID } from "crypto";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";

dotenv.config();

const premiumLibraryFilePath =
  (process.env.PREMIUM_LIBRARY_FILE || "").trim() || path.join(process.cwd(), "data", "premium-library.json");

const defaultItems = [
  {
    id: "starter-guide",
    title: "Premium Reader Starter Guide",
    monthLabel: "April 2026",
    description:
      "Welcome guide for members. Replace this with your first full ebook PDF link when your production files are ready.",
    fileUrl: "",
    coverImageUrl: "https://placehold.co/600x800/f2ece1/35211f?text=Premium+Guide"
  }
];

let loaded = false;
let items = [];
let writeQueue = Promise.resolve();

export class PremiumLibraryValidationError extends Error {}

function cleanText(value, label, maxLength, { required = true } = {}) {
  const text = String(value || "").trim();
  if (!text) {
    if (required) {
      throw new PremiumLibraryValidationError(`${label} is required.`);
    }
    return "";
  }
  if (text.length > maxLength) {
    throw new PremiumLibraryValidationError(`${label} must be ${maxLength} characters or less.`);
  }
  return text;
}

function cleanOptionalCoverImageUrl(value, label) {
  const text = cleanText(value, label, 800, { required: false });
  if (!text) {
    return "";
  }
  if (text.startsWith("/uploads/") || /^https?:\/\//i.test(text)) {
    return text;
  }
  throw new PremiumLibraryValidationError(`${label} must start with https://, http://, or /uploads/.`);
}

function cleanOptionalProtectedFileUrl(value, label) {
  const text = cleanText(value, label, 800, { required: false });
  if (!text) {
    return "";
  }
  if (text.startsWith("/uploads/premium-ebooks/") && !text.includes("..") && !text.includes("\\")) {
    return text;
  }
  throw new PremiumLibraryValidationError(
    `${label} must be stored under /uploads/premium-ebooks/ to keep member-only access protected.`
  );
}

function cloneItem(item) {
  return {
    ...item
  };
}

function normalizeStoredItem(raw = {}) {
  return {
    id: cleanText(raw.id || randomUUID(), "Ebook ID", 120),
    title: cleanText(raw.title, "Title", 180),
    monthLabel: cleanText(raw.monthLabel || "Upcoming", "Month label", 60),
    description: cleanText(raw.description || "Premium ebook.", "Description", 1000),
    fileUrl: cleanOptionalProtectedFileUrl(raw.fileUrl, "File URL"),
    coverImageUrl: cleanOptionalCoverImageUrl(raw.coverImageUrl, "Cover image URL")
  };
}

async function persistItems() {
  writeQueue = writeQueue.then(async () => {
    const directory = path.dirname(premiumLibraryFilePath);
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(premiumLibraryFilePath, `${JSON.stringify(items, null, 2)}\n`, "utf8");
  });
  return writeQueue;
}

async function loadItems() {
  try {
    const raw = await fs.readFile(premiumLibraryFilePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new PremiumLibraryValidationError("Premium library file must contain an array.");
    }
    const seenIds = new Set();
    items = parsed.map((entry) => {
      const normalized = normalizeStoredItem(entry);
      if (seenIds.has(normalized.id)) {
        throw new PremiumLibraryValidationError(`Duplicate premium ebook ID found: ${normalized.id}`);
      }
      seenIds.add(normalized.id);
      return normalized;
    });
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
    items = defaultItems.map((entry) => normalizeStoredItem(entry));
    await persistItems();
  }

  loaded = true;
}

async function ensureLoaded() {
  if (!loaded) {
    await loadItems();
  }
}

export async function ensurePremiumLibraryStore() {
  await ensureLoaded();
}

export async function listPremiumLibraryItems() {
  await ensureLoaded();
  return items.map(cloneItem);
}

export async function findPremiumLibraryItemById(itemId) {
  await ensureLoaded();
  const targetId = String(itemId || "").trim();
  if (!targetId) {
    return null;
  }
  const found = items.find((entry) => entry.id === targetId);
  return found ? cloneItem(found) : null;
}

export async function createPremiumLibraryItem({
  id,
  title,
  monthLabel,
  description,
  fileUrl = "",
  coverImageUrl = ""
}) {
  await ensureLoaded();
  const normalized = normalizeStoredItem({
    id: String(id || "").trim() || randomUUID(),
    title,
    monthLabel,
    description,
    fileUrl,
    coverImageUrl
  });
  if (items.some((entry) => entry.id === normalized.id)) {
    throw new PremiumLibraryValidationError(`A premium ebook with ID "${normalized.id}" already exists.`);
  }
  items.unshift(normalized);
  await persistItems();
  return cloneItem(normalized);
}

export async function updatePremiumLibraryItem(itemId, updates = {}) {
  await ensureLoaded();
  const targetId = String(itemId || "").trim();
  if (!targetId) {
    throw new PremiumLibraryValidationError("Ebook ID is required.");
  }
  const index = items.findIndex((entry) => entry.id === targetId);
  if (index === -1) {
    return null;
  }

  const current = items[index];
  const patch = updates && typeof updates === "object" ? updates : {};
  const normalized = normalizeStoredItem({
    ...current,
    id: current.id,
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.monthLabel !== undefined ? { monthLabel: patch.monthLabel } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    ...(patch.fileUrl !== undefined ? { fileUrl: patch.fileUrl } : {}),
    ...(patch.coverImageUrl !== undefined ? { coverImageUrl: patch.coverImageUrl } : {})
  });

  items[index] = normalized;
  await persistItems();
  return cloneItem(normalized);
}

export async function deletePremiumLibraryItem(itemId) {
  await ensureLoaded();
  const targetId = String(itemId || "").trim();
  if (!targetId) {
    return null;
  }
  const index = items.findIndex((entry) => entry.id === targetId);
  if (index === -1) {
    return null;
  }
  const [removed] = items.splice(index, 1);
  await persistItems();
  return removed ? cloneItem(removed) : null;
}
