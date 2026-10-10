# Email Signature Generator

Internal web app for generating branded email signatures for all group companies.
Staff choose their company, fill in their details, see a live preview, generate the signature, copy it, and follow the built-in Outlook / Apple Mail instructions. Every generated signature is stored, and typing a previously used email address pre-fills the form with the latest version.

## Run locally

```bash
cp .env.example .env        # edit POSTGRES_PASSWORD if you like
docker compose up --build
```

- App: http://localhost:8080
- Adminer (database browser): http://localhost:8081 — System: PostgreSQL, Server: `db`, user / password / database from `.env`.

Stop with `docker compose down` (add `-v` to also wipe the database volume).

## Deploy to production

```bash
git clone <this repo> && cd Email-Signature-Generator
cp .env.example .env
# set a strong POSTGRES_PASSWORD and PUBLIC_BASE_URL=https://<public host of this app>
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Put an HTTPS reverse proxy (Caddy, Nginx, Traefik) in front of port 8080. `PUBLIC_BASE_URL` must be that public HTTPS address: the icons inside generated signatures are loaded from `PUBLIC_BASE_URL/icons/...` by every recipient's mail client. If the app itself is not public, copy `public/icons/` to any public web host and point `PUBLIC_BASE_URL` there instead.

Adminer is bound to `127.0.0.1:8081` on production. Open it through an SSH tunnel:

```bash
ssh -L 8081:localhost:8081 user@production-host
```

then browse to http://localhost:8081.

Update: `git pull && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build`.

## Database

Three tables (see `db/schema.sql`), applied automatically on start:

- `companies` — `name`, `slug`, `logo_url`, `website_url`, `template_html`, `is_active`, `sort_order`.
- `signatures` — exactly one row per email address: person fields, `company_id`, `rendered_html`, `created_at`, `updated_at`. Generating again for the same email updates this row.
- `icons` — icon `name` → public `url` (seeded from `seeds/icons.json`, currently Cloudflare Images). Templates use `{{icon "name"}}`; an empty or missing url falls back to `PUBLIC_BASE_URL/icons/<name>.png`.
- `signature_logs` — one row per generate click: `signature_id`, `email`, `action` (`created` or `updated`), `data` (JSON snapshot of the submitted fields), `rendered_html`, `created_at`. This is the history.

### Adding or editing a company

Use Adminer. Insert a row into `companies` with at least `name` and `slug`; set `logo_url` (public image URL), `website_url` (auto-filled into the form), and `template_html`. Leave `template_html` empty and nothing will render, so copy the HTML from another company as a starting point. Set `is_active = false` to hide a company from the dropdown.

The seed in `seeds/companies.json` only inserts companies whose `slug` is missing. It never overwrites, so your edits in Adminer are preserved across restarts.

When the template files in `seeds/templates/` change (for example after a new company design is added to the repo), push them into the running database with:

```bash
docker compose exec app node src/seed.js --sync-templates
```

This overwrites `template_html` only, and only for companies listed in `seeds/companies.json`. Logo, website and name are left as they are in the database.

Icon URLs work the same way: `seeds/icons.json` is inserted once, edits in Adminer win, and `node src/seed.js --sync-icons` overwrites them from the file. To move an icon, upload the PNG from `public/icons/`, then put its URL in the `icons` table (or the seed file and sync).

### Template placeholders

Templates are [Handlebars](https://handlebarsjs.com/) HTML fragments.

| Placeholder | Value |
|---|---|
| `{{name}}` `{{job_title}}` `{{department}}` | from the form |
| `{{company_name}}` `{{logo_url}}` | from the company row |
| `{{office_phone}}` `{{mobile_phone}}` `{{email}}` | from the form |
| `{{website_url}}` | form value, or the company's `website_url` if blank |
| `{{linkedin_url}}` `{{whatsapp_url}}` `{{viber_url}}` | from the form (phone numbers are converted to `wa.me` / `viber://` links) |
| `{{icon "desk-phone-0066ff"}}` | URL from the `icons` table, else `PUBLIC_BASE_URL/icons/<name>.png` |
| `{{assets}}` | `PUBLIC_BASE_URL/icons` (plain fallback base) |

Helpers: `{{tel mobile_phone}}` (digits only for `tel:` links), `{{#if (or a b)}}`, `{{#if (and a b)}}`, `{{stripProtocol website_url}}`.
Wrap optional parts: `{{#if department}}<p>{{department}}</p>{{/if}}`.

Icons available in `public/icons/`: `desk-phone` (office), `phone` (mobile handset), `email`, `link` (coloured glyph, 32px, show at 16) and `linkedin`, `whatsapp`, `viber` (white glyph on coloured circle, 48px, show at 24), each as `<name>-<hex>.png`. Add colours in `scripts/make-icons.mjs` and run `npm run icons`.

## Development

```bash
npm install
npm test                                   # unit tests
DATABASE_URL=postgres://sig:<pw>@127.0.0.1:5433/signatures npm test   # + API tests (compose db running)
```

Project layout: `src/` (Express app, routes, renderer, seed), `db/schema.sql`, `seeds/` (company list + templates), `public/` (frontend), `test/`, `scripts/` (icon builder).
