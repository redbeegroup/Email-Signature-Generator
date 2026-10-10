import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderSignature } from '../src/render.js';

const company = {
  name: 'Onelink Technologies Co., Ltd.',
  logo_url: 'https://example.com/logo.png',
  website_url: 'https://onelink.company',
  template_html: `
    <b>{{name}}</b>|{{job_title}}|{{company_name}}|{{email}}|{{logo_url}}
    {{#if department}}[dept:{{department}}]{{/if}}
    {{#if linkedin_url}}[li:{{linkedin_url}}]{{/if}}
    {{#if (or office_phone mobile_phone)}}[phones]{{/if}}
    <a href="tel:{{tel mobile_phone}}">m</a>
    <img src="{{assets}}/phone-0066ff.png">`
};

const base = {
  name: 'Wai Phyo Lin',
  job_title: 'CTO',
  email: 'wai@example.com',
  mobile_phone: '+95 9 510 7034'
};

test('renders required fields and company data', () => {
  const html = renderSignature(company, base, { assetsBase: 'https://sig.test/icons' });
  assert.match(html, /<b>Wai Phyo Lin<\/b>\|CTO\|Onelink Technologies Co., Ltd\.\|wai@example\.com\|https:\/\/example\.com\/logo\.png/);
  assert.match(html, /src="https:\/\/sig\.test\/icons\/phone-0066ff\.png"/);
});

test('hides optional blocks when fields are empty', () => {
  const html = renderSignature(company, base, { assetsBase: '' });
  assert.doesNotMatch(html, /\[dept:/);
  assert.doesNotMatch(html, /\[li:/);
});

test('shows optional blocks when fields are set', () => {
  const html = renderSignature(company, { ...base, department: 'IT', linkedin_url: 'https://www.linkedin.com/in/x' }, { assetsBase: '' });
  assert.match(html, /\[dept:IT\]/);
  assert.match(html, /\[li:https:\/\/www\.linkedin\.com\/in\/x\]/);
});

test('"or" helper and "tel" helper', () => {
  const html = renderSignature(company, base, { assetsBase: '' });
  assert.match(html, /\[phones\]/);
  assert.match(html, /href="tel:\+9595107034"/);
  const none = renderSignature(company, { ...base, mobile_phone: '' }, { assetsBase: '' });
  assert.doesNotMatch(none, /\[phones\]/);
});

test('escapes HTML in user input', () => {
  const html = renderSignature(company, { ...base, name: '<script>x</script>' }, { assetsBase: '' });
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

test('website_url from data overrides company default', () => {
  const c = { ...company, template_html: '{{website_url}}' };
  assert.equal(renderSignature(c, base, { assetsBase: '' }), 'https://onelink.company');
  assert.equal(renderSignature(c, { ...base, website_url: 'https://other.test' }, { assetsBase: '' }), 'https://other.test');
});

test('URL fields keep "=" unescaped but still escape quotes', () => {
  const c = { ...company, template_html: '<a href="{{viber_url}}">v</a>{{#if viber_url}}[v]{{/if}}' };
  const html = renderSignature(c, { ...base, viber_url: 'viber://chat?number=%2B959' }, { assetsBase: '' });
  assert.equal(html, '<a href="viber://chat?number=%2B959">v</a>[v]');
  const evil = renderSignature(c, { ...base, viber_url: 'x" onmouseover="alert(1)' }, { assetsBase: '' });
  assert.doesNotMatch(evil, /onmouseover="alert/);
  assert.equal(renderSignature(c, base, { assetsBase: '' }), '<a href="">v</a>');
});

test('icon helper uses the map and falls back to assets path', () => {
  const c = { ...company, template_html: '<img src="{{icon "phone-0066ff"}}"><img src="{{icon "email-0066ff"}}">' };
  const html = renderSignature(c, base, { assetsBase: 'https://sig.test/icons', icons: { 'phone-0066ff': 'https://cdn.test/p?v=1&x=2' } });
  assert.equal(html, '<img src="https://cdn.test/p?v=1&amp;x=2"><img src="https://sig.test/icons/email-0066ff.png">');
  const none = renderSignature(c, base, { assetsBase: 'https://sig.test/icons' });
  assert.match(none, /https:\/\/sig\.test\/icons\/phone-0066ff\.png/);
});
