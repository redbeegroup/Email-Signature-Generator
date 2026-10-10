import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeInput, validateInput } from '../src/normalize.js';

test('trims, lower-cases email, defaults missing fields', () => {
  const out = normalizeInput({ name: '  Wai ', email: ' Wai@Example.COM ', company_id: '5' });
  assert.equal(out.name, 'Wai');
  assert.equal(out.email, 'wai@example.com');
  assert.equal(out.company_id, 5);
  assert.equal(out.job_title, '');
  assert.equal(out.linkedin_url, '');
});

test('adds https:// to bare URLs', () => {
  const out = normalizeInput({ website_url: 'onelink.company', linkedin_url: 'www.linkedin.com/in/x' });
  assert.equal(out.website_url, 'https://onelink.company');
  assert.equal(out.linkedin_url, 'https://www.linkedin.com/in/x');
});

test('formats office and mobile phone numbers', () => {
  const out = normalizeInput({ office_phone: '09750066901', mobile_phone: '+959510 7034' });
  assert.equal(out.office_phone, '+95 9 750 066 901');
  assert.equal(out.mobile_phone, '+95 9 510 7034');
});

test('turns phone numbers into wa.me and viber links', () => {
  const out = normalizeInput({ whatsapp_url: '+95 9 510 7034', viber_url: '09 510 7034' });
  assert.equal(out.whatsapp_url, 'https://wa.me/9595107034');
  assert.equal(out.viber_url, 'viber://chat?number=%2B9595107034');
  const keep = normalizeInput({ whatsapp_url: 'https://wa.me/123', viber_url: 'viber://chat?number=%2B123' });
  assert.equal(keep.whatsapp_url, 'https://wa.me/123');
  assert.equal(keep.viber_url, 'viber://chat?number=%2B123');
});

test('validation errors for required fields', () => {
  assert.deepEqual(validateInput(normalizeInput({})), {
    name: 'Name is required',
    job_title: 'Job title is required',
    email: 'A valid email address is required',
    company_id: 'Please choose a company'
  });
  assert.deepEqual(validateInput(normalizeInput({ name: 'A', job_title: 'T', email: 'bad', company_id: 1 })), {
    email: 'A valid email address is required'
  });
  assert.deepEqual(validateInput(normalizeInput({ name: 'A', job_title: 'T', email: 'a@b.co', company_id: 1 })), {});
});
