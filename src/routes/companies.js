import { Router } from 'express';
import { query } from '../db.js';

export const companiesRouter = Router();

companiesRouter.get('/', async (_req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, name, slug, logo_url, website_url, linkedin_url
         FROM companies WHERE is_active ORDER BY sort_order, name`
    );
    res.json(rows);
  } catch (err) { next(err); }
});
