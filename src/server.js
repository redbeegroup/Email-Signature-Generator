import { createApp } from './app.js';
import { initDb } from './db.js';
import { seedCompanies, seedIcons, syncTemplates, syncIcons } from './seed.js';
import { PORT, PUBLIC_BASE_URL } from './config.js';

await initDb();
await seedCompanies();
await seedIcons();
// SYNC_SEEDS_ON_START=true pushes seeds/templates/*.html and seeds/icons.json over the
// database copies on every start (template and icon edits made in Adminer are discarded;
// company name, logo and website are untouched).
if (/^(1|true|yes)$/i.test(process.env.SYNC_SEEDS_ON_START || '')) {
  await syncTemplates();
  await syncIcons();
}

createApp().listen(PORT, () => {
  console.log(`[app] listening on :${PORT}  public URL ${PUBLIC_BASE_URL}`);
});
