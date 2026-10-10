import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { query } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_DIR = path.join(__dirname, '..', 'seeds');

export function loadSeedCompanies() {
  const list = JSON.parse(fs.readFileSync(path.join(SEED_DIR, 'companies.json'), 'utf8'));
  return list.map((c) => {
    const file = path.join(SEED_DIR, 'templates', c.template || 'default.html');
    const fallback = path.join(SEED_DIR, 'templates', 'default.html');
    const template_html = fs.readFileSync(fs.existsSync(file) ? file : fallback, 'utf8');
    return { ...c, template_html };
  });
}

/**
 * Insert companies that do not exist yet (matched by slug).
 * Never updates existing rows, so edits made in Adminer are preserved.
 */
export async function seedCompanies() {
  let inserted = 0;
  for (const c of loadSeedCompanies()) {
    const res = await query(
      `INSERT INTO companies (name, slug, logo_url, website_url, template_html, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (slug) DO NOTHING`,
      [c.name, c.slug, c.logo_url || '', c.website_url || '', c.template_html, c.sort_order ?? 100]
    );
    inserted += res.rowCount;
  }
  console.log(`[seed] companies inserted: ${inserted}`);
  return inserted;
}
