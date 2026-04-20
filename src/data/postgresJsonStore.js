import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;
const databaseUrl = String(process.env.DATABASE_URL || "").trim();
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
