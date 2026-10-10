import { query } from './db.js';

const TTL_MS = 10_000;
let cache = { at: 0, map: {} };

/** name -> url for every icon with a non-empty url. Cached briefly so Adminer edits show quickly. */
export async function getIconMap() {
  if (Date.now() - cache.at < TTL_MS) return cache.map;
  const { rows } = await query(`SELECT name, url FROM icons WHERE url <> ''`);
  cache = { at: Date.now(), map: Object.fromEntries(rows.map((r) => [r.name, r.url])) };
  return cache.map;
}

export function clearIconCache() { cache = { at: 0, map: {} }; }
