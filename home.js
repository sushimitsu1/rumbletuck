(function(){
  const cfg = window.SITE_CONFIG || {};
  document.querySelectorAll('[data-site-name]').forEach(el => { if (cfg.siteName) el.textContent = cfg.siteName; });
  document.querySelectorAll('[data-full-count]').forEach(el => { if (cfg.fullLibraryCount) el.textContent = cfg.fullLibraryCount; });
  document.getElementById('yr').textContent = new Date().getFullYear();

  // Story grid
  const grid = document.getElementById('story-grid');
  grid.innerHTML = (window.STORIES || []).map(s => `
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
  const PROVIDERS = {
    formspree:    { field: 'email', mode: 'cors' },
    buttondown:   { field: 'email', mode: 'no-cors' },
    kit:          { field: 'email_address', mode: 'no-cors' },
    mailerlite:   { field: 'fields[email]', mode: 'no-cors' },
    'google-form':{ field: '', mode: 'no-cors' },
    netlify:      { field: 'email', mode: 'cors', urlencoded: true },
    generic:      { field: 'email', mode: 'cors' }
  };
  const p = PROVIDERS[wl.provider] || PROVIDERS.generic;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const email = form.email.value.trim();
    if (form.company.value) return; // bot
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { status.textContent = 'Please enter a valid email address.'; return; }
    if (!consent.checked) { status.textContent = 'Please tick the box to confirm you are a parent or guardian.'; return; }
    const field = wl.emailField || p.field || 'email';
    const data = new FormData();
    data.append(field, email);
    if (wl.provider === 'netlify') data.append('form-name', 'waitlist');
    const btn = form.querySelector('button'); btn.disabled = true; status.textContent = 'Sending…';
    try {
      const opts = { method: 'POST', mode: p.mode };
      if (p.urlencoded) { opts.body = new URLSearchParams(data).toString(); opts.headers = { 'Content-Type': 'application/x-www-form-urlencoded' }; }
      else { opts.body = data; if (p.mode === 'cors') opts.headers = { 'Accept': 'application/json' }; }
      const res = await fetch(wl.endpoint, opts);
      if (p.mode === 'cors' && !res.ok) throw new Error('HTTP ' + res.status);
      form.reset(); consent.checked = false;
      status.textContent = 'You\'re on the list! We\'ll email you when the full library opens. 🌙';
    } catch (err) {
      status.textContent = 'Sorry, that didn\'t go through. Please try again in a moment.';
    } finally { btn.disabled = false; }
  });
})();

if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(()=>{});
