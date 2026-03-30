import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";

dotenv.config();

const manualOrdersFilePath =
  (process.env.MANUAL_ORDERS_FILE || "").trim() || path.join(process.cwd(), "data", "manual-orders.json");

let loaded = false;
let manualOrders = [];
let writeQueue = Promise.resolve();

export class ManualOrderValidationError extends Error {}

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function cleanOrderId(value) {
  const text = String(value || "").trim();
  if (!text) {
    throw new ManualOrderValidationError("Order ID is required.");
  }
  if (text.length > 220) {
    throw new ManualOrderValidationError("Order ID is too long.");
  }
  return text;
}

async function persistManualOrders() {
  writeQueue = writeQueue.then(async () => {
    const directory = path.dirname(manualOrdersFilePath);
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(manualOrdersFilePath, `${JSON.stringify(manualOrders, null, 2)}\n`, "utf8");
  });
  return writeQueue;
}

async function loadManualOrdersFromDisk() {
  try {
    const raw = await fs.readFile(manualOrdersFilePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new ManualOrderValidationError("Manual orders file must contain an array.");
    }
    manualOrders = parsed.map((entry) => cloneValue(entry));
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
    manualOrders = [];
    await persistManualOrders();
  }

  loaded = true;
}

async function ensureLoaded() {
  if (!loaded) {
    await loadManualOrdersFromDisk();
  }
}

export async function ensureManualOrderStore() {
  await ensureLoaded();
}

export async function listManualOrders() {
  await ensureLoaded();
  return manualOrders.map((order) => cloneValue(order));
}

export async function findManualOrderById(orderId) {
  await ensureLoaded();
  const cleanId = cleanOrderId(orderId);
  const found = manualOrders.find((order) => String(order?.id || "").trim() === cleanId);
  return found ? cloneValue(found) : null;
}

export async function createManualOrder(order) {
  await ensureLoaded();
  const cleanId = cleanOrderId(order?.id);
  if (manualOrders.some((entry) => String(entry?.id || "").trim() === cleanId)) {
    throw new ManualOrderValidationError("Manual order already exists.");
  }
  const created = {
    ...cloneValue(order),
    id: cleanId
  };
  manualOrders.unshift(created);
  await persistManualOrders();
  return cloneValue(created);
}

export async function updateManualOrder(orderId, updates) {
  await ensureLoaded();
  const cleanId = cleanOrderId(orderId);
  const index = manualOrders.findIndex((order) => String(order?.id || "").trim() === cleanId);
  if (index === -1) {
    return null;
  }

  const current = cloneValue(manualOrders[index]);
  const next =
    typeof updates === "function"
      ? updates(current)
      : {
          ...current,
          ...cloneValue(updates)
        };

  if (!next || typeof next !== "object") {
    throw new ManualOrderValidationError("Updated order payload is invalid.");
  }

  manualOrders[index] = {
    ...cloneValue(next),
    id: cleanId
  };
  await persistManualOrders();
  return cloneValue(manualOrders[index]);
}
