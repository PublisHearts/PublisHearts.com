import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;
const databaseUrlCandidates = [
  { key: "DATABASE_URL", value: process.env.DATABASE_URL },
  { key: "POSTGRES_URL", value: process.env.POSTGRES_URL },
  { key: "NEON_DATABASE_URL", value: process.env.NEON_DATABASE_URL }
];
const selectedDatabaseUrlEntry = databaseUrlCandidates.find((entry) => String(entry.value || "").trim());
const databaseUrl = String(selectedDatabaseUrlEntry?.value || "").trim();
const databaseUrlSource = selectedDatabaseUrlEntry?.key || "";
const disableDbTls = String(process.env.DATABASE_DISABLE_SSL || "")
  .trim()
  .toLowerCase();
const shouldDisableTls = disableDbTls === "1" || disableDbTls === "true" || disableDbTls === "yes";

const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: shouldDisableTls ? false : { rejectUnauthorized: false }
    })
  : null;

let schemaReadyPromise = null;
let lastConnectionError = "";

function parseStoreValue(rawValue) {
  if (rawValue === null || rawValue === undefined) {
    return null;
  }
  if (typeof rawValue === "string") {
    try {
      return JSON.parse(rawValue);
    } catch {
      return null;
    }
  }
  return rawValue;
}

async function ensureSchema() {
  if (!pool) {
    return false;
  }
  if (!schemaReadyPromise) {
    schemaReadyPromise = pool.query(`
      CREATE TABLE IF NOT EXISTS app_json_store (
        store_key TEXT PRIMARY KEY,
        store_value JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  }
  await schemaReadyPromise;
  return true;
}

export function isPostgresJsonStoreEnabled() {
  return Boolean(pool);
}

export function getPostgresJsonStoreRuntimeInfo() {
  return {
    enabled: Boolean(pool),
    databaseUrlSource,
    tlsDisabled: shouldDisableTls,
    lastConnectionError
  };
}

export async function checkPostgresJsonStoreConnection() {
  if (!pool) {
    return {
      enabled: false,
      ok: false,
      error: "No Postgres connection string found. Set DATABASE_URL (or POSTGRES_URL / NEON_DATABASE_URL)."
    };
  }
  try {
    await ensureSchema();
    await pool.query("SELECT 1");
    lastConnectionError = "";
    return {
      enabled: true,
      ok: true,
      error: ""
    };
  } catch (error) {
    const details = String(error?.message || "").trim();
    lastConnectionError = details || "Unknown Postgres connection error.";
    return {
      enabled: true,
      ok: false,
      error: lastConnectionError
    };
  }
}

export async function readPostgresJsonStore(storeKey) {
  if (!pool) {
    return { found: false, value: null };
  }
  const key = String(storeKey || "").trim();
  if (!key) {
    throw new Error("Postgres JSON store key is required.");
  }
  await ensureSchema();
  const result = await pool.query("SELECT store_value FROM app_json_store WHERE store_key = $1 LIMIT 1", [key]);
  if (!result.rowCount) {
    return { found: false, value: null };
  }
  return {
    found: true,
    value: parseStoreValue(result.rows[0]?.store_value)
  };
}

export async function writePostgresJsonStore(storeKey, value) {
  if (!pool) {
    return false;
  }
  const key = String(storeKey || "").trim();
  if (!key) {
    throw new Error("Postgres JSON store key is required.");
  }
  await ensureSchema();
  await pool.query(
    `INSERT INTO app_json_store (store_key, store_value, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (store_key)
     DO UPDATE SET store_value = EXCLUDED.store_value, updated_at = NOW()`,
    [key, JSON.stringify(value)]
  );
  return true;
}
