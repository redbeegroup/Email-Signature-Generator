import { createApp } from './app.js';
import { initDb } from './db.js';
import { seedCompanies } from './seed.js';
import { PORT, PUBLIC_BASE_URL } from './config.js';

await initDb();
await seedCompanies();

createApp().listen(PORT, () => {
  console.log(`[app] listening on :${PORT}  public URL ${PUBLIC_BASE_URL}`);
});
