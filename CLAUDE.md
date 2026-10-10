# Email Signature Generator

Internal web app: staff pick a company, fill in details, preview live, generate, copy, and follow Outlook / Apple Mail how-tos. `signatures` holds exactly one row per email (upserted on generate); `signature_logs` records every generate click. Entering a known email pre-fills the form from its row.

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
- One email = one `signatures` row. Never insert duplicates; generate does `INSERT ... ON CONFLICT (email) DO UPDATE` and appends to `signature_logs`.
- `src/seed.js` only INSERTs companies whose slug is missing. It never updates rows, so edits made in Adminer are authoritative. To change a seeded company's template after first run, edit it in Adminer (or delete the row and restart).
- Templates are Handlebars fragments with placeholders: `name job_title department company_name office_phone mobile_phone website_url email logo_url linkedin_url whatsapp_url viber_url assets`. Helpers: `tel` (digits only), `or`, `and`, `stripProtocol`. Wrap every optional field in `{{#if field}}...{{/if}}`.
- Icons are referenced as `{{assets}}/<name>-<hex>.png`; `assets` = `PUBLIC_BASE_URL/icons`. Recipients' mail clients fetch these, so `PUBLIC_BASE_URL` on production must be a public HTTPS URL.
- To add a company design: save the HubSpot "Copy signature source code" output as `seeds/templates/<slug>.html`, convert values to placeholders, add `{{#if}}` guards, swap icon URLs, register in `seeds/companies.json`.
- No auth: the app is for an intranet. Lookup by email returns anyone's latest record.
