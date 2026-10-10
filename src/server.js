import { createApp } from './app.js';
import { initDb } from './db.js';
import { seedCompanies, seedIcons } from './seed.js';
import { PORT, PUBLIC_BASE_URL } from './config.js';

await initDb();
await seedCompanies();
await seedIcons();

createApp().listen(PORT, () => {
  console.log(`[app] listening on :${PORT}  public URL ${PUBLIC_BASE_URL}`);
});
