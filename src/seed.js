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

export function loadSeedIcons() {
  return JSON.parse(fs.readFileSync(path.join(SEED_DIR, 'icons.json'), 'utf8'));
}

/** Insert icon URLs that do not exist yet. Never updates, so Adminer edits win. */
export async function seedIcons() {
  let inserted = 0;
  for (const [name, url] of Object.entries(loadSeedIcons())) {
    const res = await query('INSERT INTO icons (name, url) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING', [name, url]);
    inserted += res.rowCount;
  }
  console.log(`[seed] icons inserted: ${inserted}`);
  return inserted;
}

/** Overwrite every icon url listed in seeds/icons.json. Explicit, opt-in. */
export async function syncIcons() {
  let updated = 0;
  for (const [name, url] of Object.entries(loadSeedIcons())) {
    const res = await query(
      'INSERT INTO icons (name, url) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET url = EXCLUDED.url, updated_at = now()',
      [name, url]
    );
    updated += res.rowCount;
  }
  console.log(`[seed] icons synced: ${updated}`);
  return updated;
}

/**
 * Overwrite template_html for every company listed in seeds/companies.json
 * with the current seed file. Explicit, opt-in: it discards template edits
 * made in Adminer for those companies (logo, website, name are untouched).
 */
export async function syncTemplates() {
  let updated = 0;
  for (const c of loadSeedCompanies()) {
    const res = await query(
      'UPDATE companies SET template_html = $1, updated_at = now() WHERE slug = $2',
      [c.template_html, c.slug]
    );
    updated += res.rowCount;
  }
  console.log(`[seed] templates synced: ${updated}`);
  return updated;
}

// CLI:  node src/seed.js                   -> insert missing companies and icons
//       node src/seed.js --sync-templates  -> also overwrite templates from seed files
//       node src/seed.js --sync-icons      -> also overwrite icon urls from seeds/icons.json
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const { initDb, closeDb } = await import('./db.js');
  await initDb();
  await seedCompanies();
  await seedIcons();
  if (process.argv.includes('--sync-templates')) await syncTemplates();
  if (process.argv.includes('--sync-icons')) await syncIcons();
  await closeDb();
}
