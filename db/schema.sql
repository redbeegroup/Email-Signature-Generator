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

-- One row per email address. Generating again for the same email updates the row.
CREATE TABLE IF NOT EXISTS signatures (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
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
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Upgrade path for databases created before the one-row-per-email rule:
-- keep the newest row per email, drop the old index, add the unique constraint.
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
DELETE FROM signatures s USING signatures t WHERE s.email = t.email AND s.id < t.id;
DROP INDEX IF EXISTS signatures_email_created_idx;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'signatures_email_key') THEN
    ALTER TABLE signatures ADD CONSTRAINT signatures_email_key UNIQUE (email);
  END IF;
END $$;

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
