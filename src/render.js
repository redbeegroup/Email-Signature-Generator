import Handlebars from 'handlebars';

const hb = Handlebars.create();

hb.registerHelper('or', (...args) => args.slice(0, -1).some(Boolean));
hb.registerHelper('and', (...args) => args.slice(0, -1).every(Boolean));
hb.registerHelper('tel', (value) => String(value || '').replace(/[^\d+]/g, ''));
hb.registerHelper('stripProtocol', (value) => String(value || '').replace(/^https?:\/\//, '').replace(/\/$/, ''));

const cache = new Map();
function compile(template) {
  let fn = cache.get(template);
  if (!fn) {
    fn = hb.compile(template, { strict: false });
    cache.set(template, fn);
  }
  return fn;
}

export const FIELDS = [
  'name', 'job_title', 'department', 'office_phone', 'mobile_phone',
  'website_url', 'email', 'linkedin_url', 'whatsapp_url', 'viber_url'
];

/**
 * Render a company's Handlebars template with a person's details.
 * @param {{name:string, logo_url:string, website_url:string, template_html:string}} company
 * @param {object} data  normalised form input
 * @param {{assetsBase:string}} opts  absolute base URL of /icons
 */
const URL_FIELDS = new Set(['website_url', 'linkedin_url', 'whatsapp_url', 'viber_url', 'logo_url', 'assets']);

// Escape for use inside HTML attributes/text but keep URL characters such as "=" readable.
const escapeUrl = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = (s) => (s ? new hb.SafeString(escapeUrl(s)) : '');

export function renderSignature(company, data, { assetsBase }) {
  const ctx = {};
  for (const f of FIELDS) ctx[f] = data[f] ? String(data[f]) : '';
  if (!ctx.website_url) ctx.website_url = company.website_url || '';
  ctx.company_name = company.name;
  ctx.logo_url = company.logo_url || '';
  ctx.assets = assetsBase;
  for (const f of URL_FIELDS) ctx[f] = safeUrl(ctx[f]);
  return compile(company.template_html)(ctx).trim();
}
