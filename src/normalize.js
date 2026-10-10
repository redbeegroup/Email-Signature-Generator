import { FIELDS } from './render.js';

const URL_FIELDS = ['website_url', 'linkedin_url', 'whatsapp_url', 'viber_url'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const digits = (s) => s.replace(/[^\d]/g, '');
const looksLikePhone = (s) => /^[+\d][\d\s().-]{4,}$/.test(s);

function normalizeUrl(field, raw) {
  const v = raw.trim();
  if (!v) return '';
  if (field === 'whatsapp_url' && looksLikePhone(v)) return `https://wa.me/${digits(v)}`;
  if (field === 'viber_url' && looksLikePhone(v)) return `viber://chat?number=%2B${digits(v)}`;
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return v; // already has a scheme (https:, viber:, mailto:)
  return `https://${v}`;
}

/** Trim everything, lower-case email, coerce company_id, fix URLs. */
export function normalizeInput(body = {}) {
  const out = {};
  for (const f of FIELDS) out[f] = typeof body[f] === 'string' ? body[f].trim() : '';
  out.email = out.email.toLowerCase();
  for (const f of URL_FIELDS) out[f] = normalizeUrl(f, out[f]);
  const id = Number.parseInt(body.company_id, 10);
  out.company_id = Number.isFinite(id) ? id : null;
  return out;
}

/** @returns {Record<string,string>} field -> message; empty when valid */
export function validateInput(data) {
  const errors = {};
  if (!data.name) errors.name = 'Name is required';
  if (!data.job_title) errors.job_title = 'Job title is required';
  if (!EMAIL_RE.test(data.email)) errors.email = 'A valid email address is required';
  if (!data.company_id) errors.company_id = 'Please choose a company';
  return errors;
}
