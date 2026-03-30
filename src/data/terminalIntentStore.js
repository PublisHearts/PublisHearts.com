import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";

dotenv.config();

const terminalIntentsFilePath =
  (process.env.TERMINAL_INTENTS_FILE || "").trim() || path.join(process.cwd(), "data", "terminal-intents.json");

let loaded = false;
let terminalIntents = [];
let writeQueue = Promise.resolve();

export class TerminalIntentValidationError extends Error {}

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function cleanTerminalIntentId(value) {
  const text = String(value || "").trim();
  if (!text) {
    throw new TerminalIntentValidationError("Terminal payment intent ID is required.");
  }
  if (text.length > 220) {
    throw new TerminalIntentValidationError("Terminal payment intent ID is too long.");
  }
  return text;
}

async function persistTerminalIntents() {
  writeQueue = writeQueue.then(async () => {
    const directory = path.dirname(terminalIntentsFilePath);
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(terminalIntentsFilePath, `${JSON.stringify(terminalIntents, null, 2)}\n`, "utf8");
  });
  return writeQueue;
}

async function loadTerminalIntentsFromDisk() {
  try {
    const raw = await fs.readFile(terminalIntentsFilePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new TerminalIntentValidationError("Terminal intents file must contain an array.");
    }
    terminalIntents = parsed.map((entry) => cloneValue(entry));
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
    terminalIntents = [];
    await persistTerminalIntents();
  }

  loaded = true;
}

async function ensureLoaded() {
  if (!loaded) {
    await loadTerminalIntentsFromDisk();
  }
}

export async function ensureTerminalIntentStore() {
  await ensureLoaded();
}

export async function findTerminalIntentById(paymentIntentId) {
  await ensureLoaded();
  const cleanId = cleanTerminalIntentId(paymentIntentId);
  const found = terminalIntents.find((entry) => String(entry?.id || "").trim() === cleanId);
  return found ? cloneValue(found) : null;
}

export async function upsertTerminalIntent(intent) {
  await ensureLoaded();
  const cleanId = cleanTerminalIntentId(intent?.id);
  const nextIntent = {
    ...cloneValue(intent),
    id: cleanId
  };
  const index = terminalIntents.findIndex((entry) => String(entry?.id || "").trim() === cleanId);
  if (index >= 0) {
    terminalIntents[index] = nextIntent;
  } else {
    terminalIntents.unshift(nextIntent);
  }
  await persistTerminalIntents();
  return cloneValue(nextIntent);
}

export async function deleteTerminalIntent(paymentIntentId) {
  await ensureLoaded();
  const cleanId = cleanTerminalIntentId(paymentIntentId);
  const nextIntents = terminalIntents.filter((entry) => String(entry?.id || "").trim() !== cleanId);
  const changed = nextIntents.length !== terminalIntents.length;
  if (changed) {
    terminalIntents = nextIntents;
    await persistTerminalIntents();
  }
  return changed;
}
