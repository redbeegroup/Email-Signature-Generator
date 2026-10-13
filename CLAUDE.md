# Email Signature Generator

Internal web app: staff pick a company, fill in details, preview live, generate, copy, and follow Outlook / Apple Mail how-tos. `signatures` holds one row per (email, company) pair (upserted on generate), so one person can have a signature for each company; `signature_logs` records every generate click. Entering a known email pre-fills the form from the newest row, and switching company loads that company's row if it exists.

## Stack
Node 22 + Express (ESM, no build step), PostgreSQL 16, Handlebars templates stored in the DB, vanilla JS/CSS frontend in `public/`. Three containers: `app` (8080), `db`, `adminer` (8081).

## Run / test
- Local: `cp .env.example .env` then `docker compose up --build` (auto-loads `compose.override.yml`, which exposes Postgres on 127.0.0.1:5433 for tests).
- Unit tests: `npm test` (API tests self-skip unless `DATABASE_URL` is set).
- API tests: `DATABASE_URL=postgres://sig:<pw>@127.0.0.1:5433/signatures npm test`
- Production: `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build` (Adminer bound to localhost only; reach via `ssh -L 8081:localhost:8081`).
- Rebuild icons after editing `scripts/svg/` or colour lists: `npm run icons` (needs dev deps, run on the host, commit the PNGs).

## Conventions
- `db/schema.sql` is applied idempotently on every start (`CREATE ... IF NOT EXISTS`). Schema changes must be additive or guarded.
- One (email, company) = one `signatures` row. Never insert duplicates; generate does `INSERT ... ON CONFLICT (email, company_id) DO UPDATE` and appends to `signature_logs`. `GET /api/signatures/lookup?email=` returns `{ signatures: [...] }` newest first (optional `company_id` filter).
- `src/seed.js` only INSERTs companies whose slug is missing. It never updates rows, so edits made in Adminer are authoritative. To push updated seed templates into an existing DB rebuild the image first, then `docker compose exec app node src/seed.js --sync-templates --only=<slug>` (overwrites `template_html` only; without `--only` all slugs in `companies.json`).
- Templates are Handlebars fragments with placeholders: `name job_title department company_name office_phone mobile_phone website_url email logo_url linkedin_url whatsapp_url viber_url assets`. Helpers: `tel` (digits only), `or`, `and`, `stripProtocol`. Wrap every optional field in `{{#if field}}...{{/if}}`.
- Icons: `phone` (candy-bar mobile), `desk-phone` (office), `email`, `link`, `globe`, `linkedin`, `whatsapp`, `viber`. Company-specific icon sets uploaded by the user get a colour suffix per company (Onelink `0066ff`, Yathar Cho `ff0000`, Zarla and Cannopy `000000`, Cho Cho Industry `017dc5`). Templates reference them as `{{icon "<name>-<hex>"}}`, resolved through the `icons` table (seeded from `seeds/icons.json`, hosted on Cloudflare Images) with fallback `PUBLIC_BASE_URL/icons/<name>.png`. `--sync-icons` on `src/seed.js` overwrites the table from the file. Recipients' mail clients fetch these URLs, so they must be public HTTPS.
- To add a company design: save the HubSpot "Copy signature source code" output as `seeds/templates/<slug>.html`, convert values to placeholders, add `{{#if}}` guards, swap icon URLs, register in `seeds/companies.json`.
- No auth: the app is for an intranet. Lookup by email returns anyone's latest record.
