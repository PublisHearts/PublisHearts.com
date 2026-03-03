import { randomUUID } from "crypto";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";

dotenv.config();

const addressBookFilePath =
  (process.env.ADDRESS_BOOK_FILE || "").trim() || path.join(process.cwd(), "data", "address-book.json");
const maxEntries = 5000;
const maxOrderRefs = 40;

let loaded = false;
let entries = [];
let writeQueue = Promise.resolve();

export class AddressBookValidationError extends Error {}

function cleanText(value, maxLength, fieldName, { required = false, upper = false } = {}) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  if (!text) {
    if (required) {
      throw new AddressBookValidationError(`${fieldName} is required.`);
    }
    return "";
  }
  if (text.length > maxLength) {
    throw new AddressBookValidationError(`${fieldName} must be ${maxLength} characters or less.`);
  }
  return upper ? text.toUpperCase() : text;
}

function cleanCountryCode(value) {
  const code = cleanText(value, 2, "Country code", { required: true, upper: true });
  if (!/^[A-Z]{2}$/.test(code)) {
    throw new AddressBookValidationError("Country code must be a 2-letter ISO code.");
  }
  return code;
}

function normalizeKeyPart(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function buildAddressKey(input) {
  return [
    normalizeKeyPart(input.line1),
    normalizeKeyPart(input.line2),
    normalizeKeyPart(input.city),
    normalizeKeyPart(input.state),
    normalizeKeyPart(input.postalCode),
    normalizeKeyPart(input.country)
  ].join("|");
}

function cloneEntry(entry) {
  return {
    id: entry.id,
    key: entry.key,
    name: entry.name,
    email: entry.email,
    phone: entry.phone,
    line1: entry.line1,
    line2: entry.line2,
    city: entry.city,
    state: entry.state,
    postalCode: entry.postalCode,
    country: entry.country,
    orderIds: Array.isArray(entry.orderIds) ? [...entry.orderIds] : [],
    ordersCount: entry.ordersCount || 0,
    createdAt: entry.createdAt || "",
    lastUsedAt: entry.lastUsedAt || ""
  };
}

function normalizeStoredEntry(raw) {
  const line1 = cleanText(raw?.line1, 120, "Street address", { required: true });
  const line2 = cleanText(raw?.line2, 120, "Address line 2");
  const city = cleanText(raw?.city, 80, "City", { required: true });
  const state = cleanText(raw?.state, 40, "State / province", { required: true, upper: true });
  const postalCode = cleanText(raw?.postalCode, 20, "Postal code", { required: true, upper: true });
  const country = cleanCountryCode(raw?.country);
  const orderIds = Array.isArray(raw?.orderIds)
    ? raw.orderIds
        .map((value) => String(value || "").trim())
        .filter(Boolean)
        .slice(0, maxOrderRefs)
    : [];
  const key = buildAddressKey({ line1, line2, city, state, postalCode, country });
  const createdAt = String(raw?.createdAt || "").trim() || new Date().toISOString();
  const lastUsedAt = String(raw?.lastUsedAt || "").trim() || createdAt;

  return {
    id: String(raw?.id || "").trim() || randomUUID(),
    key,
    name: cleanText(raw?.name, 120, "Recipient name"),
    email: cleanText(raw?.email, 254, "Email").toLowerCase(),
    phone: cleanText(raw?.phone, 40, "Phone"),
    line1,
    line2,
    city,
    state,
    postalCode,
    country,
    orderIds,
    ordersCount: Number.isFinite(raw?.ordersCount) ? Math.max(orderIds.length, Number(raw.ordersCount) || 0) : orderIds.length,
    createdAt,
    lastUsedAt
  };
}

function normalizeIncomingEntry(input) {
  const line1 = cleanText(input?.line1, 120, "Street address", { required: true });
  const line2 = cleanText(input?.line2, 120, "Address line 2");
  const city = cleanText(input?.city, 80, "City", { required: true });
  const state = cleanText(input?.state, 40, "State / province", { required: true, upper: true });
  const postalCode = cleanText(input?.postalCode, 20, "Postal code", { required: true, upper: true });
  const country = cleanCountryCode(input?.country);
  const orderId = String(input?.orderId || "").trim();

  return {
    name: cleanText(input?.name, 120, "Recipient name"),
    email: cleanText(input?.email, 254, "Email").toLowerCase(),
    phone: cleanText(input?.phone, 40, "Phone"),
    line1,
    line2,
    city,
    state,
    postalCode,
    country,
    orderId
  };
}

function sortEntriesInPlace(target) {
  target.sort((left, right) => {
    const leftTime = Date.parse(String(left.lastUsedAt || ""));
    const rightTime = Date.parse(String(right.lastUsedAt || ""));
    const leftScore = Number.isFinite(leftTime) ? leftTime : 0;
    const rightScore = Number.isFinite(rightTime) ? rightTime : 0;
    return rightScore - leftScore;
  });
  return target;
}

async function persistEntries() {
  writeQueue = writeQueue.then(async () => {
    const directory = path.dirname(addressBookFilePath);
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(addressBookFilePath, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
  });
  return writeQueue;
}

async function loadEntriesFromDisk() {
  try {
    const raw = await fs.readFile(addressBookFilePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new AddressBookValidationError("Address book file must contain an array.");
    }
    entries = sortEntriesInPlace(parsed.map((entry) => normalizeStoredEntry(entry))).slice(0, maxEntries);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
    entries = [];
    await persistEntries();
  }

  loaded = true;
}

async function ensureLoaded() {
  if (!loaded) {
    await loadEntriesFromDisk();
  }
}

export async function ensureAddressBookStore() {
  await ensureLoaded();
}

export async function listAddressBookEntries(limit = 100) {
  await ensureLoaded();
  const parsedLimit = Number.parseInt(String(limit || ""), 10);
  const safeLimit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(500, parsedLimit)) : 100;
  return entries.slice(0, safeLimit).map((entry) => cloneEntry(entry));
}

export async function upsertAddressBookEntry(input) {
  await ensureLoaded();
  const normalized = normalizeIncomingEntry(input);
  const key = buildAddressKey(normalized);
  const nowIso = new Date().toISOString();
  const existingIndex = entries.findIndex((entry) => entry.key === key);

  if (existingIndex >= 0) {
    const current = entries[existingIndex];
    const orderIds = Array.isArray(current.orderIds) ? [...current.orderIds] : [];
    if (normalized.orderId && !orderIds.includes(normalized.orderId)) {
      orderIds.unshift(normalized.orderId);
    }

    const updated = {
      ...current,
      name: normalized.name || current.name,
      email: normalized.email || current.email,
      phone: normalized.phone || current.phone,
      line1: normalized.line1,
      line2: normalized.line2,
      city: normalized.city,
      state: normalized.state,
      postalCode: normalized.postalCode,
      country: normalized.country,
      orderIds: orderIds.slice(0, maxOrderRefs),
      ordersCount: orderIds.length > 0 ? orderIds.length : Math.max(1, Number(current.ordersCount) || 1),
      lastUsedAt: nowIso
    };

    entries.splice(existingIndex, 1);
    entries.unshift(updated);
    await persistEntries();
    return cloneEntry(updated);
  }

  const orderIds = normalized.orderId ? [normalized.orderId] : [];
  const created = {
    id: randomUUID(),
    key,
    name: normalized.name,
    email: normalized.email,
    phone: normalized.phone,
    line1: normalized.line1,
    line2: normalized.line2,
    city: normalized.city,
    state: normalized.state,
    postalCode: normalized.postalCode,
    country: normalized.country,
    orderIds,
    ordersCount: orderIds.length > 0 ? orderIds.length : 1,
    createdAt: nowIso,
    lastUsedAt: nowIso
  };

  entries.unshift(created);
  entries = entries.slice(0, maxEntries);
  await persistEntries();
  return cloneEntry(created);
}
