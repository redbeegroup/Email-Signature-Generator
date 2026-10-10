import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { companiesRouter } from './routes/companies.js';
import { signaturesRouter } from './routes/signatures.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '256kb' }));

  app.use('/api/companies', companiesRouter);
  app.use('/api/signatures', signaturesRouter);
  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  app.get('/result', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'result.html')));
  // Icons are referenced from sent emails and never change once published: cache long.
  app.use('/icons', express.static(path.join(PUBLIC_DIR, 'icons'), { maxAge: '30d', immutable: true }));
  // Pages, CSS and JS must pick up deploys immediately.
  app.use(express.static(PUBLIC_DIR, { maxAge: 0, etag: true, extensions: ['html'] }));

  app.use('/api', (_req, res) => res.status(404).json({ error: 'not found' }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'internal error' });
  });
  return app;
}
