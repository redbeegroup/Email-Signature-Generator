import Handlebars from 'handlebars';

const hb = Handlebars.create();

// Escape for use inside HTML attributes/text but keep URL characters such as "=" readable.
const escapeUrl = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

hb.registerHelper('or', (...args) => args.slice(0, -1).some(Boolean));
hb.registerHelper('and', (...args) => args.slice(0, -1).every(Boolean));
hb.registerHelper('tel', (value) => String(value || '').replace(/[^\d+]/g, ''));
// {{icon "desk-phone-0066ff"}} -> mapped URL, else <assets>/<name>.png
hb.registerHelper('icon', function (name, options) {
  const root = options.data.root;
  const url = (root.__icons && root.__icons[name]) || `${root.__assetsBase}/${name}.png`;
  return new hb.SafeString(escapeUrl(url));
});
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
 * @param {{assetsBase:string, icons?:Record<string,string>}} opts
 *   assetsBase: absolute base URL of /icons (fallback for {{assets}} and {{icon}})
 *   icons:      name -> url overrides used by the {{icon "name"}} helper
 */
const URL_FIELDS = new Set(['website_url', 'linkedin_url', 'whatsapp_url', 'viber_url', 'logo_url', 'assets']);

const safeUrl = (s) => (s ? new hb.SafeString(escapeUrl(s)) : '');

export function renderSignature(company, data, { assetsBase, icons = {} }) {
  const ctx = {};
  for (const f of FIELDS) ctx[f] = data[f] ? String(data[f]) : '';
  if (!ctx.website_url) ctx.website_url = company.website_url || '';
  ctx.company_name = company.name;
  ctx.logo_url = company.logo_url || '';
  ctx.assets = assetsBase;
  for (const f of URL_FIELDS) ctx[f] = safeUrl(ctx[f]);
  ctx.__assetsBase = assetsBase;
  ctx.__icons = icons;
  return compile(company.template_html)(ctx).trim();
}
