import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";

dotenv.config();

const orderExclusionsFilePath =
  (process.env.ORDER_EXCLUSIONS_FILE || "").trim() ||
  path.join(process.cwd(), "data", "order-exclusions.json");
const maxReasonLength = 240;

let loaded = false;
let excludedOrders = [];
let writeQueue = Promise.resolve();

export class OrderExclusionValidationError extends Error {}

function cleanOrderId(value) {
  const text = String(value || "").trim();
  if (!text) {
    throw new OrderExclusionValidationError("Order ID is required.");
  }
  if (text.length > 220) {
    throw new OrderExclusionValidationError("Order ID is too long.");
  }
  return text;
}

function cleanReason(value, fallback = "refunded") {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  if (!text) {
    return fallback;
  }
  if (text.length > maxReasonLength) {
    throw new OrderExclusionValidationError(`Reason must be ${maxReasonLength} characters or less.`);
  }
  return text;
}

function normalizeStoredEntry(raw) {
  const orderId = cleanOrderId(raw?.orderId);
  const reason = cleanReason(raw?.reason, "refunded");
  const createdAt = String(raw?.createdAt || "").trim() || new Date().toISOString();
  return {
    orderId,
    reason,
    createdAt
  };
}

function cloneEntry(entry) {
  return {
    orderId: entry.orderId,
    reason: entry.reason,
    createdAt: entry.createdAt
  };
}

async function persistExcludedOrders() {
  writeQueue = writeQueue.then(async () => {
    const directory = path.dirname(orderExclusionsFilePath);
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(orderExclusionsFilePath, `${JSON.stringify(excludedOrders, null, 2)}\n`, "utf8");
  });
  return writeQueue;
}

async function loadExcludedOrdersFromDisk() {
  try {
    const raw = await fs.readFile(orderExclusionsFilePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new OrderExclusionValidationError("Order exclusions file must contain an array.");
    }
    excludedOrders = parsed.map((entry) => normalizeStoredEntry(entry));
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
    excludedOrders = [];
    await persistExcludedOrders();
  }

  loaded = true;
}

async function ensureLoaded() {
  if (!loaded) {
    await loadExcludedOrdersFromDisk();
  }
}

export async function ensureOrderExclusionStore() {
  await ensureLoaded();
}

export async function listOrderExclusions() {
  await ensureLoaded();
  return excludedOrders.map((entry) => cloneEntry(entry));
}

export async function excludeOrder(orderId, options = {}) {
  await ensureLoaded();
  const cleanId = cleanOrderId(orderId);
  const reason = cleanReason(options.reason, "refunded");
  const existingIndex = excludedOrders.findIndex((entry) => entry.orderId === cleanId);
  if (existingIndex >= 0) {
    const existing = excludedOrders[existingIndex];
    const updated = {
      ...existing,
      reason
    };
    excludedOrders.splice(existingIndex, 1);
    excludedOrders.unshift(updated);
    await persistExcludedOrders();
    return cloneEntry(updated);
  }

  const created = {
    orderId: cleanId,
    reason,
    createdAt: new Date().toISOString()
  };
  excludedOrders.unshift(created);
  await persistExcludedOrders();
  return cloneEntry(created);
}

export async function restoreExcludedOrder(orderId) {
  await ensureLoaded();
  const cleanId = cleanOrderId(orderId);
  const index = excludedOrders.findIndex((entry) => entry.orderId === cleanId);
  if (index === -1) {
    return false;
  }
  excludedOrders.splice(index, 1);
  await persistExcludedOrders();
  return true;
}
