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
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS signatures_email_created_idx
  ON signatures (email, created_at DESC);
