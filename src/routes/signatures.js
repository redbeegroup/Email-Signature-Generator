import { Router } from 'express';
import { query } from '../db.js';
import { renderSignature } from '../render.js';
import { normalizeInput, validateInput } from '../normalize.js';
import { ASSETS_BASE } from '../config.js';
import { getIconMap } from '../icons.js';

export const signaturesRouter = Router();

const PUBLIC_COLS = `id, email, name, job_title, department, company_id, office_phone,
  mobile_phone, website_url, linkedin_url, whatsapp_url, viber_url, rendered_html, created_at, updated_at`;

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
  const html = renderSignature(company, data, { assetsBase: ASSETS_BASE, icons: await getIconMap() });
  return { data, company, html };
}

// Live preview: render without storing. Missing required fields are tolerated.
signaturesRouter.post('/preview', async (req, res, next) => {
  try {
    const data = normalizeInput(req.body);
    if (!data.company_id) return res.json({ html: '' });
    const company = await getCompany(data.company_id);
    if (!company) return res.json({ html: '' });
    res.json({ html: renderSignature(company, data, { assetsBase: ASSETS_BASE, icons: await getIconMap() }) });
  } catch (err) { next(err); }
});

// Generate: validate, render, then insert or update the row for this (email, company)
// and append an entry to signature_logs.
signaturesRouter.post('/', async (req, res, next) => {
  try {
    const prepared = await prepare(req, res);
    if (!prepared) return;
    const { data, html } = prepared;
    const { rows } = await query(
      `INSERT INTO signatures (email, name, job_title, department, company_id, office_phone,
         mobile_phone, website_url, linkedin_url, whatsapp_url, viber_url, rendered_html)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (email, company_id) DO UPDATE SET
         name = EXCLUDED.name, job_title = EXCLUDED.job_title, department = EXCLUDED.department,
         company_id = EXCLUDED.company_id, office_phone = EXCLUDED.office_phone,
         mobile_phone = EXCLUDED.mobile_phone, website_url = EXCLUDED.website_url,
         linkedin_url = EXCLUDED.linkedin_url, whatsapp_url = EXCLUDED.whatsapp_url,
         viber_url = EXCLUDED.viber_url, rendered_html = EXCLUDED.rendered_html, updated_at = now()
       RETURNING id, (xmax = 0) AS inserted`,
      [data.email, data.name, data.job_title, data.department, data.company_id, data.office_phone,
       data.mobile_phone, data.website_url, data.linkedin_url, data.whatsapp_url, data.viber_url, html]
    );
    const { id, inserted } = rows[0];
    await query(
      `INSERT INTO signature_logs (signature_id, email, action, data, rendered_html) VALUES ($1, $2, $3, $4, $5)`,
      [id, data.email, inserted ? 'created' : 'updated', JSON.stringify(data), html]
    );
    res.status(inserted ? 201 : 200).json({ id, html, action: inserted ? 'created' : 'updated' });
  } catch (err) { next(err); }
});

// All stored signatures for an email, newest first, one per company (pre-fills the editor).
// Optional company_id narrows it to that company's signature.
signaturesRouter.get('/lookup', async (req, res, next) => {
  try {
    const email = String(req.query.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'email is required' });
    const companyId = Number.parseInt(req.query.company_id, 10);
    const params = [email];
    let where = 'email = $1';
    if (Number.isFinite(companyId)) { params.push(companyId); where += ' AND company_id = $2'; }
    const { rows } = await query(
      `SELECT s.id, s.email, s.name, s.job_title, s.department, s.company_id, c.name AS company_name,
              s.office_phone, s.mobile_phone, s.website_url, s.linkedin_url, s.whatsapp_url, s.viber_url,
              s.created_at, s.updated_at
         FROM signatures s JOIN companies c ON c.id = s.company_id
        WHERE ${where} ORDER BY s.updated_at DESC, s.id DESC`,
      params
    );
    if (!rows.length) return res.status(404).json({ error: 'not found', signatures: [] });
    res.json({ signatures: rows });
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
