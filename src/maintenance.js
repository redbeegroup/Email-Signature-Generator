import { query } from './db.js';
import { renderSignature } from './render.js';
import { getIconMap } from './icons.js';
import { ASSETS_BASE } from './config.js';

/**
 * Re-render stored signatures whose HTML still contains WhatsApp or Viber icons
 * (the columns are already cleared by db/schema.sql). Idempotent and cheap.
 */
export async function stripHiddenSocial() {
  const { rows } = await query(
    `SELECT s.*, c.name AS c_name, c.logo_url AS c_logo_url, c.website_url AS c_website_url, c.template_html
       FROM signatures s JOIN companies c ON c.id = s.company_id
      WHERE s.rendered_html LIKE '%alt="whatsapp"%' OR s.rendered_html LIKE '%alt="viber"%'`
  );
  if (!rows.length) return 0;
  const icons = await getIconMap();
  for (const r of rows) {
    const company = { name: r.c_name, logo_url: r.c_logo_url, website_url: r.c_website_url, template_html: r.template_html };
    const html = renderSignature(company, r, { assetsBase: ASSETS_BASE, icons });
    await query('UPDATE signatures SET rendered_html = $1 WHERE id = $2', [html, r.id]);
  }
  console.log(`[maintenance] re-rendered ${rows.length} signature(s) without WhatsApp/Viber`);
  return rows.length;
}
