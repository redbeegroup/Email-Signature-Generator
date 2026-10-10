import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatPhone, phoneDigits } from '../public/js/phone.js';

test('formats local Myanmar mobile numbers with +95 and spacing', () => {
  assert.equal(formatPhone('095107034'), '+95 9 510 7034');
  assert.equal(formatPhone('09 510 7034'), '+95 9 510 7034');
  assert.equal(formatPhone('09750066901'), '+95 9 750 066 901');
  assert.equal(formatPhone('09-750-066-901'), '+95 9 750 066 901');
});

test('normalises numbers already carrying the country code', () => {
  assert.equal(formatPhone('+959510 7034'), '+95 9 510 7034');
  assert.equal(formatPhone('+95 9 750 066 901'), '+95 9 750 066 901');
  assert.equal(formatPhone('959750066901'), '+95 9 750 066 901');
  assert.equal(formatPhone('0095 9 510 7034'), '+95 9 510 7034');
  assert.equal(formatPhone('9510 7034'), '+95 9 510 7034');
});

test('landline and other lengths', () => {
  assert.equal(formatPhone('01 234 5678'), '+95 1 234 5678');
  assert.equal(formatPhone('0943121234'), '+95 9 4312 1234');
  assert.equal(formatPhone('09 4312 1234 5'), '+95 9 431 212 345');
});

test('leaves foreign numbers and non-numbers alone', () => {
  assert.equal(formatPhone('+65 6123 4567'), '+65 6123 4567');
  assert.equal(formatPhone('  +1 (415) 555-0100 '), '+1 (415) 555-0100');
  assert.equal(formatPhone('ext 1234'), 'ext 1234');
  assert.equal(formatPhone('12345'), '12345');
  assert.equal(formatPhone(''), '');
});

test('phoneDigits gives the international number without plus', () => {
  assert.equal(phoneDigits('09 510 7034'), '959510 7034'.replace(' ', ''));
  assert.equal(phoneDigits('+95 9 750 066 901'), '959750066901');
  assert.equal(phoneDigits('+65 6123 4567'), '6561234567');
  assert.equal(phoneDigits('https://wa.me/123'), '');
});
