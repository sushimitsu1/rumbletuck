(function(){
  const cfg = window.SITE_CONFIG || {};
  document.querySelectorAll('[data-site-name]').forEach(el => { if (cfg.siteName) el.textContent = cfg.siteName; });
  document.querySelectorAll('[data-full-count]').forEach(el => { if (cfg.fullLibraryCount) el.textContent = cfg.fullLibraryCount; });
  document.getElementById('yr').textContent = new Date().getFullYear();

  // Story grid
  const grid = document.getElementById('story-grid');
  // index.html ships a prerendered grid (tools/build_seo.py); only render here if it is missing.
  if (!grid.querySelector('.card')) grid.innerHTML = (window.STORIES || []).map(s => `
    <a class="card" href="read.html?s=${encodeURIComponent(s.id)}">
      <img src="stories/${s.id}/thumb.webp" width="640" height="480" loading="lazy" alt="Cover of ${s.title.replace(/"/g,'&quot;')}">
      <div class="body"><span class="tag">${s.vehicle}</span><h3>${s.title}</h3><p>${s.description}</p></div>
    </a>`).join('');

  // Waitlist
  const wl = cfg.waitlist || {};
  const form = document.getElementById('wl-form');
  const status = document.getElementById('wl-status');
  const consent = document.getElementById('wl-consent');
  const configured = Boolean(wl.endpoint && wl.provider);
  if (!configured) {
    const note = document.createElement('div');
    note.className = 'wl-soon';
    note.innerHTML = '<b>Sign-ups open very soon.</b> Thanks for your interest! The waitlist isn\'t switched on yet, so please check back in a few days.';
    form.replaceWith(note);
    consent.parentElement.style.display = 'none';
    return;
  }
  // Our own badge-free double opt-in API (Cloudflare Worker + Resend). See /workspace/rumbletuck-waitlist/worker.
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const email = form.email.value.trim();
    if (form.company.value) { status.textContent = 'Almost there! Please check your inbox.'; return; } // bot honeypot
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { status.textContent = 'Please enter a valid email address.'; return; }
    if (!consent.checked) { status.textContent = 'Please tick the box to confirm you are a parent or guardian.'; consent.focus(); return; }
    const btn = form.querySelector('button'); btn.disabled = true; status.textContent = 'Sending…';
    try {
      const res = await fetch(wl.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email, parentConfirm: consent.checked, company: form.company.value })
      });
      let body = null; try { body = await res.json(); } catch (_) {}
      if (!res.ok || !body || !body.ok) {
        const bad = new Error('HTTP ' + res.status); bad.userMsg = body && body.message; throw bad;
      }
      form.reset(); consent.checked = false;
      status.textContent = body.message || 'Almost there! We\'ve sent you an email. Tap the button in it to confirm your spot.';
    } catch (err) {
      status.textContent = err.userMsg || 'Sorry, that didn\'t go through. Please try again in a moment.';
    } finally { btn.disabled = false; }
  });
})();

if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(()=>{});
