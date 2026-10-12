(() => {
  const preview = document.getElementById('preview');
  const status = document.getElementById('status');
  const errorBox = document.getElementById('error');
  const modal = document.getElementById('modal');
  let record = null;

  function flash(text) {
    status.textContent = text;
    clearTimeout(flash.t);
    flash.t = setTimeout(() => { status.textContent = ''; }, 3000);
  }
  function showError(text) {
    errorBox.textContent = text;
    errorBox.hidden = !text;
  }

  async function load() {
    const id = new URLSearchParams(location.search).get('id');
    if (!id) return showError('No signature selected. Go back to the editor and generate one.');
    const res = await fetch(`/api/signatures/${encodeURIComponent(id)}`);
    if (!res.ok) return showError('That signature could not be found. Go back to the editor and generate a new one.');
    record = await res.json();
    preview.innerHTML = record.rendered_html;
    document.getElementById('back').href = `/?email=${encodeURIComponent(record.email)}&company=${record.company_id}`;
  }

  // Copy as rich text so mail clients paste the formatted signature.
  async function copyRich() {
    if (!record) return;
    const html = record.rendered_html;
    const text = preview.innerText;
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([text], { type: 'text/plain' })
          })
        ]);
        return flash('Signature copied. Paste it into your email client.');
      }
    } catch (_) { /* fall through to selection copy */ }
    const range = document.createRange();
    range.selectNodeContents(preview);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    const ok = document.execCommand('copy');
    sel.removeAllRanges();
    flash(ok ? 'Signature copied. Paste it into your email client.' : 'Copy failed. Select the signature and press Ctrl/⌘+C.');
  }

  async function copySource() {
    if (!record) return;
    try {
      await navigator.clipboard.writeText(record.rendered_html);
      flash('HTML source copied.');
    } catch (_) {
      flash('Copy failed. Your browser blocked clipboard access.');
    }
  }

  function openHowto(which) {
    for (const s of modal.querySelectorAll('.modal__body > section')) s.hidden = s.id !== `howto-${which}`;
    modal.hidden = false;
    document.body.classList.add('modal-open');
    modal.querySelector('.modal__close').focus();
  }
  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove('modal-open');
  }

  document.getElementById('copy').addEventListener('click', copyRich);
  document.getElementById('copy-source').addEventListener('click', copySource);
  document.querySelectorAll('[data-howto]').forEach((b) => b.addEventListener('click', () => openHowto(b.dataset.howto)));
  modal.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeModal));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

  load();
})();
