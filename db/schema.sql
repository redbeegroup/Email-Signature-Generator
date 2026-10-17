-- Applied idempotently on every app start (see src/db.js).

CREATE TABLE IF NOT EXISTS companies (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  slug          TEXT NOT NULL UNIQUE,
  logo_url      TEXT NOT NULL DEFAULT '',
  website_url   TEXT NOT NULL DEFAULT '',
  template_html TEXT NOT NULL DEFAULT '',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INTEGER NOT NULL DEFAULT 100,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per (email, company). Generating again for the same pair updates the row;
-- the same email can hold one signature per company.
CREATE TABLE IF NOT EXISTS signatures (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL,
  name          TEXT NOT NULL,
  job_title     TEXT NOT NULL DEFAULT '',
  department    TEXT NOT NULL DEFAULT '',
  company_id    INTEGER NOT NULL REFERENCES companies(id),
  office_phone  TEXT NOT NULL DEFAULT '',
  mobile_phone  TEXT NOT NULL DEFAULT '',
  website_url   TEXT NOT NULL DEFAULT '',
  linkedin_url  TEXT NOT NULL DEFAULT '',
  whatsapp_url  TEXT NOT NULL DEFAULT '',
  viber_url     TEXT NOT NULL DEFAULT '',
  rendered_html TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT signatures_email_company_key UNIQUE (email, company_id)
);

-- Upgrade path for databases created under earlier rules:
-- keep the newest row per (email, company), drop old indexes/constraints, add the composite one.
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
DELETE FROM signatures s USING signatures t
  WHERE s.email = t.email AND s.company_id = t.company_id AND s.id < t.id;
DROP INDEX IF EXISTS signatures_email_created_idx;
ALTER TABLE signatures DROP CONSTRAINT IF EXISTS signatures_email_key;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'signatures_email_company_key') THEN
    ALTER TABLE signatures ADD CONSTRAINT signatures_email_company_key UNIQUE (email, company_id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS signatures_email_idx ON signatures (email);

-- Activity log: one row per generate click, with a snapshot of what was generated.
CREATE TABLE IF NOT EXISTS signature_logs (
  id            SERIAL PRIMARY KEY,
  signature_id  INTEGER NOT NULL REFERENCES signatures(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  action        TEXT NOT NULL CHECK (action IN ('created', 'updated')),
  data          JSONB NOT NULL,
  rendered_html TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS signature_logs_email_idx ON signature_logs (email, created_at DESC);

-- Icon name -> public URL. Templates use {{icon "name"}}; when a name is missing
-- or its url is empty the app falls back to PUBLIC_BASE_URL/icons/<name>.png.
CREATE TABLE IF NOT EXISTS icons (
  name        TEXT PRIMARY KEY,
  url         TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- WhatsApp and Viber were removed from the editor: keep the columns but clear any stored values.
UPDATE signatures SET whatsapp_url = '', viber_url = '' WHERE whatsapp_url <> '' OR viber_url <> '';
UPDATE signature_logs SET data = (data - 'whatsapp_url') - 'viber_url' WHERE data ? 'whatsapp_url' OR data ? 'viber_url';
