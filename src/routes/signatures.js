import { Router } from 'express';
import { query } from '../db.js';
import { renderSignature } from '../render.js';
import { normalizeInput, validateInput } from '../normalize.js';
import { ASSETS_BASE } from '../config.js';

export const signaturesRouter = Router();

const PUBLIC_COLS = `id, email, name, job_title, department, company_id, office_phone,
  mobile_phone, website_url, linkedin_url, whatsapp_url, viber_url, rendered_html, created_at`;

async function getCompany(id) {
  const { rows } = await query('SELECT * FROM companies WHERE id = $1 AND is_active', [id]);
  return rows[0];
}

/** Validate + render. Returns { data, company, html } or sends a 400/404 and returns null. */
async function prepare(req, res) {
  const data = normalizeInput(req.body);
  const errors = validateInput(data);
  if (Object.keys(errors).length) {
    res.status(400).json({ errors });
    return null;
  }
  const company = await getCompany(data.company_id);
  if (!company) {
    res.status(400).json({ errors: { company_id: 'Unknown company' } });
    return null;
  }
  const html = renderSignature(company, data, { assetsBase: ASSETS_BASE });
  return { data, company, html };
}

// Live preview: render without storing. Missing required fields are tolerated.
signaturesRouter.post('/preview', async (req, res, next) => {
  try {
    const data = normalizeInput(req.body);
    if (!data.company_id) return res.json({ html: '' });
    const company = await getCompany(data.company_id);
    if (!company) return res.json({ html: '' });
    res.json({ html: renderSignature(company, data, { assetsBase: ASSETS_BASE }) });
  } catch (err) { next(err); }
});

// Generate: validate, render, store.
signaturesRouter.post('/', async (req, res, next) => {
  try {
    const prepared = await prepare(req, res);
    if (!prepared) return;
    const { data, html } = prepared;
    const { rows } = await query(
      `INSERT INTO signatures (email, name, job_title, department, company_id, office_phone,
         mobile_phone, website_url, linkedin_url, whatsapp_url, viber_url, rendered_html)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [data.email, data.name, data.job_title, data.department, data.company_id, data.office_phone,
       data.mobile_phone, data.website_url, data.linkedin_url, data.whatsapp_url, data.viber_url, html]
    );
    res.status(201).json({ id: rows[0].id, html });
  } catch (err) { next(err); }
});

// Latest stored signature for an email (used to pre-fill the editor).
signaturesRouter.get('/lookup', async (req, res, next) => {
  try {
    const email = String(req.query.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'email is required' });
    const { rows } = await query(
      `SELECT ${PUBLIC_COLS} FROM signatures WHERE email = $1 ORDER BY created_at DESC, id DESC LIMIT 1`,
      [email]
    );
    if (!rows[0]) return res.status(404).json({ error: 'not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

signaturesRouter.get('/:id', async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(404).json({ error: 'not found' });
    const { rows } = await query(`SELECT ${PUBLIC_COLS} FROM signatures WHERE id = $1`, [id]);
    if (!rows[0]) return res.status(404).json({ error: 'not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});
