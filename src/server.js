import { createApp } from './app.js';
import { initDb } from './db.js';
import { seedCompanies, seedIcons, syncTemplates, syncIcons, syncCompanyLinks } from './seed.js';
import { PORT, PUBLIC_BASE_URL } from './config.js';
import { stripHiddenSocial } from './maintenance.js';

await initDb();
await seedCompanies();
await seedIcons();
// SYNC_SEEDS_ON_START=true makes the seed files authoritative on every start:
// templates, icon URLs, and each company's logo/website/linkedin are overwritten
// from seeds/ (edits to those made in Adminer are discarded; company name is kept).
if (/^(1|true|yes)$/i.test(process.env.SYNC_SEEDS_ON_START || '')) {
  await syncTemplates();
  await syncIcons();
  await syncCompanyLinks();
}

await stripHiddenSocial();

createApp().listen(PORT, () => {
  console.log(`[app] listening on :${PORT}  public URL ${PUBLIC_BASE_URL}`);
});
