// Builds public/icons/*.png from scripts/svg/*.svg. Run locally: npm run icons
// Contact icons (phone/email/link): coloured glyph on transparent, 32x32 (shown at 16px).
// Social icons (linkedin/whatsapp/viber): white glyph on a coloured circle, 48x48 (shown at 24px).
// Add a colour to the lists below when a company template needs it, then re-run and commit.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const SVG_DIR = new URL('./svg/', import.meta.url).pathname;
const OUT_DIR = new URL('../public/icons/', import.meta.url).pathname;
fs.mkdirSync(OUT_DIR, { recursive: true });

const CONTACT = { names: ['phone', 'email', 'link'], colors: ['0066ff', '000000', '0a0f1f', 'ffffff', '666666'] };
const SOCIAL = { names: ['linkedin', 'whatsapp', 'viber'], colors: ['0a0f1f', '0066ff', '000000', '666666'] };

const readSvg = (name) => fs.readFileSync(path.join(SVG_DIR, `${name}.svg`), 'utf8');
const recolor = (svg, hex) => svg.replace(/#ffffff/gi, `#${hex}`);

async function contactIcon(name, hex) {
  const svg = recolor(readSvg(name), hex);
  await sharp(Buffer.from(svg)).resize(32, 32).png().toFile(path.join(OUT_DIR, `${name}-${hex}.png`));
}

async function socialIcon(name, hex) {
  const size = 48, pad = 11;
  const glyph = await sharp(Buffer.from(readSvg(name))).resize(size - pad * 2, size - pad * 2, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const circle = Buffer.from(`<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#${hex}"/></svg>`);
  await sharp(circle).composite([{ input: glyph, left: pad, top: pad }]).png().toFile(path.join(OUT_DIR, `${name}-${hex}.png`));
}

let count = 0;
for (const n of CONTACT.names) for (const c of CONTACT.colors) { await contactIcon(n, c); count++; }
for (const n of SOCIAL.names) for (const c of SOCIAL.colors) { await socialIcon(n, c); count++; }
console.log(`wrote ${count} icons to public/icons/`);
