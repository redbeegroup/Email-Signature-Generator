// Needs a running Postgres: DATABASE_URL=postgres://sig:pass@127.0.0.1:5433/signatures npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const DB = process.env.DATABASE_URL;
const TEST_EMAIL = 'api-test@example.test';

if (!DB) {
  test('api tests skipped: DATABASE_URL not set', { skip: true }, () => {});
} else {
  const { createApp } = await import('../src/app.js');
  const { initDb, query, closeDb } = await import('../src/db.js');
  const { seedCompanies, seedIcons } = await import('../src/seed.js');
  const request = (await import('supertest')).default;
  const app = createApp();
  let company;

  before(async () => {
    await initDb({ retries: 3, delayMs: 500 });
    await seedCompanies();
    await seedIcons();
    await query('DELETE FROM signatures WHERE email = $1', [TEST_EMAIL]);
    company = (await query(`SELECT * FROM companies WHERE slug = 'onelink'`)).rows[0];
  });
  after(async () => {
    await query('DELETE FROM signatures WHERE email = $1', [TEST_EMAIL]);
    await closeDb();
  });

  test('GET /api/companies lists seeded companies without template html', async () => {
    const res = await request(app).get('/api/companies').expect(200);
    assert.ok(res.body.length >= 7);
    assert.ok(res.body.some((c) => c.slug === 'onelink'));
    assert.equal(res.body[0].template_html, undefined);
  });

  test('POST /api/preview renders without storing', async () => {
    const res = await request(app).post('/api/signatures/preview')
      .send({ name: 'Preview Person', company_id: company.id }).expect(200);
    assert.match(res.body.html, /Preview Person/);
    assert.match(res.body.html, /imagedelivery\.net/, 'icons come from the icons table');
    const empty = await request(app).post('/api/signatures/preview').send({}).expect(200);
    assert.equal(empty.body.html, '');
  });

  test('POST /api/signatures validates', async () => {
    const res = await request(app).post('/api/signatures').send({ email: 'nope' }).expect(400);
    assert.ok(res.body.errors.name);
    assert.ok(res.body.errors.email);
    assert.ok(res.body.errors.company_id);
  });

  test('one row per email: generate twice updates the same row and logs both', async () => {
    const first = await request(app).post('/api/signatures')
      .send({ name: 'First', email: TEST_EMAIL.toUpperCase(), company_id: company.id, job_title: 'Eng' })
      .expect(201);
    assert.match(first.body.html, /First/);
    assert.equal(first.body.action, 'created');

    const second = await request(app).post('/api/signatures')
      .send({ name: 'Second', email: TEST_EMAIL, company_id: company.id, whatsapp_url: '+95 9 510 7034' })
      .expect(200);
    assert.equal(second.body.id, first.body.id);
    assert.equal(second.body.action, 'updated');

    const rows = await query('SELECT * FROM signatures WHERE email = $1', [TEST_EMAIL]);
    assert.equal(rows.rowCount, 1);
    assert.equal(rows.rows[0].name, 'Second');
    assert.equal(rows.rows[0].job_title, '');

    const byId = await request(app).get(`/api/signatures/${first.body.id}`).expect(200);
    assert.equal(byId.body.name, 'Second');
    assert.equal(byId.body.email, TEST_EMAIL);

    const latest = await request(app).get('/api/signatures/lookup').query({ email: TEST_EMAIL }).expect(200);
    assert.equal(latest.body.id, first.body.id);
    assert.equal(latest.body.whatsapp_url, 'https://wa.me/9595107034');

    const logs = await query('SELECT action, data FROM signature_logs WHERE email = $1 ORDER BY id', [TEST_EMAIL]);
    assert.deepEqual(logs.rows.map((r) => r.action), ['created', 'updated']);
    assert.equal(logs.rows[0].data.name, 'First');
    assert.equal(logs.rows[1].data.name, 'Second');

    await request(app).get('/api/signatures/lookup').query({ email: 'nobody@example.test' }).expect(404);
    await request(app).get('/api/signatures/999999999').expect(404);
  });
}
