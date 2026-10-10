(() => {
  const form = document.getElementById('form');
  const preview = document.getElementById('preview');
  const notice = document.getElementById('notice');
  const errorBox = document.getElementById('error');
  const companySelect = form.elements.company_id;
  const emailInput = form.elements.email;
  const websiteInput = form.elements.website_url;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  let companies = [];
  let lastCompanyWebsite = '';
  let lastLookupEmail = '';
  let previewTimer;
  let previewSeq = 0;

  const formData = () => Object.fromEntries(new FormData(form).entries());

  async function api(method, path, body) {
    const res = await fetch(path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, json };
  }

  // ---- validity ticks -------------------------------------------------------
  function markValidity(el) {
    const v = el.value.trim();
    const valid = el.name === 'email' ? EMAIL_RE.test(v) : v !== '';
    el.classList.toggle('is-valid', valid);
  }
  function markAll() { for (const el of form.querySelectorAll('input, select')) markValidity(el); }

  // ---- companies ------------------------------------------------------------
  async function loadCompanies() {
    const { ok, json } = await api('GET', '/api/companies');
    if (!ok) return showError('Could not load companies. Please reload the page.');
    companies = json;
    for (const c of companies) {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      companySelect.append(opt);
    }
  }
  function onCompanyChange() {
    const c = companies.find((x) => String(x.id) === companySelect.value);
    const site = c ? c.website_url : '';
    const current = websiteInput.value.trim();
    if (!current || current === lastCompanyWebsite) websiteInput.value = site;
    lastCompanyWebsite = site;
    markValidity(websiteInput);
  }

  // ---- live preview ---------------------------------------------------------
  function schedulePreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(refreshPreview, 250);
  }
  async function refreshPreview() {
    const seq = ++previewSeq;
    const { ok, json } = await api('POST', '/api/signatures/preview', formData());
    if (seq !== previewSeq) return; // a newer request is in flight
    preview.innerHTML = ok ? json.html : '';
  }

  // ---- lookup by email ------------------------------------------------------
  function setNotice(text) {
    notice.textContent = text;
    notice.hidden = !text;
  }
  async function lookup(email) {
    email = email.trim().toLowerCase();
    if (!EMAIL_RE.test(email) || email === lastLookupEmail) return;
    lastLookupEmail = email;
    const { ok, json } = await api('GET', `/api/signatures/lookup?email=${encodeURIComponent(email)}`);
    if (!ok) { setNotice(''); return; }
    for (const [k, v] of Object.entries(json)) {
      const el = form.elements[k];
      if (el && typeof v === 'string') el.value = v;
    }
    companySelect.value = String(json.company_id);
    if (!companySelect.value) companySelect.value = '';
    lastCompanyWebsite = (companies.find((x) => x.id === json.company_id) || {}).website_url || '';
    const when = new Date(json.updated_at || json.created_at).toLocaleString();
    setNotice(`We found your signature (last generated ${when}) and loaded it. Edit anything you like and generate again to update it.`);
    markAll();
    schedulePreview();
  }

  // ---- generate -------------------------------------------------------------
  function showError(text) {
    errorBox.textContent = text;
    errorBox.hidden = !text;
  }
  function clientValidate(data) {
    const problems = [];
    if (!data.name.trim()) problems.push('Name is required');
    if (!data.job_title.trim()) problems.push('Job title is required');
    if (!data.company_id) problems.push('Please choose a company');
    if (!EMAIL_RE.test(data.email.trim())) problems.push('A valid email address is required');
    return problems;
  }
  async function generate() {
    showError('');
    const data = formData();
    const problems = clientValidate(data);
    if (problems.length) {
      form.querySelectorAll('[required]').forEach((el) => el.classList.toggle('is-invalid', !el.value.trim()));
      return showError(problems.join('. ') + '.');
    }
    const btn = document.getElementById('generate');
    btn.disabled = true;
    try {
      const { ok, json } = await api('POST', '/api/signatures', data);
      if (!ok) return showError(Object.values(json.errors || { e: 'Something went wrong' }).join('. ') + '.');
      location.href = `/result?id=${json.id}`;
    } finally {
      btn.disabled = false;
    }
  }

  function clearAll() {
    form.reset();
    lastCompanyWebsite = '';
    lastLookupEmail = '';
    preview.innerHTML = '';
    setNotice('');
    showError('');
    form.querySelectorAll('.is-valid, .is-invalid').forEach((el) => el.classList.remove('is-valid', 'is-invalid'));
    history.replaceState(null, '', '/');
  }

  // ---- wiring ---------------------------------------------------------------
  form.addEventListener('input', (e) => {
    markValidity(e.target);
    e.target.classList.remove('is-invalid');
    schedulePreview();
  });
  companySelect.addEventListener('change', () => { onCompanyChange(); schedulePreview(); });
  emailInput.addEventListener('blur', () => lookup(emailInput.value));
  emailInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); lookup(emailInput.value); } });
  form.addEventListener('submit', (e) => { e.preventDefault(); generate(); });
  document.getElementById('generate').addEventListener('click', generate);
  document.getElementById('clear').addEventListener('click', clearAll);

  (async () => {
    await loadCompanies();
    const fromUrl = new URLSearchParams(location.search).get('email');
    if (fromUrl) {
      emailInput.value = fromUrl;
      markValidity(emailInput);
      await lookup(fromUrl);
    }
  })();
})();
