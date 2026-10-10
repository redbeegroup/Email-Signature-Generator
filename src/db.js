import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = path.join(__dirname, '..', 'db', 'schema.sql');

let pool;

export function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}

export const query = (text, params) => getPool().query(text, params);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Wait for Postgres, then apply db/schema.sql (idempotent). */
export async function initDb({ retries = 30, delayMs = 2000 } = {}) {
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  for (let attempt = 1; ; attempt++) {
    try {
      await query(schema);
      return;
    } catch (err) {
      if (attempt >= retries) throw err;
      console.log(`[db] not ready (${err.code || err.message}); retry ${attempt}/${retries}`);
      await sleep(delayMs);
    }
  }
}

export async function closeDb() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
