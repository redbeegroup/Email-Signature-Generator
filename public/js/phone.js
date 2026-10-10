// Shared by the server (src/normalize.js) and the browser (editor.js).
// Formats Myanmar numbers as "+95 9 510 7034" / "+95 9 750 066 901".
// Numbers from other countries (any other "+" prefix) are left as typed.

const GROUPS = { 7: [3, 4], 8: [4, 4], 9: [3, 3, 3], 10: [3, 3, 4], 11: [3, 4, 4] };

function group(digits) {
  const pattern = GROUPS[digits.length];
  if (pattern) {
    const out = [];
    let i = 0;
    for (const len of pattern) { out.push(digits.slice(i, i + len)); i += len; }
    return out.join(' ');
  }
  const out = digits.match(/.{1,3}/g) || [];
  if (out.length > 1 && out[out.length - 1].length === 1) out.splice(-2, 2, out.slice(-2).join(''));
  return out.join(' ');
}

/** @returns {string} formatted number, or the trimmed input when it is not a Myanmar number */
export function formatPhone(raw) {
  const typed = String(raw || '').trim().replace(/\s+/g, ' ');
  if (!typed) return '';
  const compact = typed.replace(/[\s().-]/g, '');
  if (!/^\+?\d{6,15}$/.test(compact)) return typed;

  let national;
  if (compact.startsWith('+95')) national = compact.slice(3);
  else if (compact.startsWith('0095')) national = compact.slice(4);
  else if (compact.startsWith('+')) return typed;                       // another country
  else if (compact.startsWith('0')) national = compact.slice(1);        // local trunk prefix
  else if (compact.startsWith('95') && compact.length >= 10) national = compact.slice(2);
  else national = compact;                                              // bare digits, assume Myanmar

  national = national.replace(/^0+/, '');
  if (national.length < 6) return typed;
  return `+95 ${national[0]} ${group(national.slice(1))}`;
}

/** Digits only with country code, for wa.me / viber links. Empty when not a phone number. */
export function phoneDigits(raw) {
  const formatted = formatPhone(raw);
  const compact = formatted.replace(/[\s().-]/g, '');
  return /^\+?\d{6,15}$/.test(compact) ? compact.replace(/^\+/, '') : '';
}
