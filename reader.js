// Lightweight picture-book reader: cover + pages, one pre-made narration MP3 per page,
// optional read-along that turns pages automatically when each page's narration ends.
(function(){
  const cfg = window.SITE_CONFIG || {};
  document.querySelectorAll('[data-full-count]').forEach(el => { if (cfg.fullLibraryCount) el.textContent = cfg.fullLibraryCount; });
  const id = new URLSearchParams(location.search).get('s');
  const story = (window.STORIES || []).find(s => s.id === id);
  if (!story) { location.replace('./#stories'); return; }
  const $ = i => document.getElementById(i);
  const img = $('r-img'), playBtn = $('r-play'), count = $('r-count'), end = $('r-end');
  document.title = `${story.title} — ${cfg.siteName || 'Rumbletuck'}`;
  $('r-title').textContent = story.title;

  const pad = n => String(n).padStart(2, '0');
  const imgSrc = p => p < 0 ? `stories/${story.id}/cover.webp` : `stories/${story.id}/p${pad(p + 1)}.webp`;
  const audSrc = p => `stories/${story.id}/p${pad(p + 1)}.mp3`;
  const audio = new Audio(); audio.preload = 'auto';
  let page = -1;            // -1 = cover
  const startP = parseInt(new URLSearchParams(location.search).get('p'), 10);
  if (startP >= 1 && startP <= story.pages) page = startP - 1; // ?p=N opens on page N (used by lights-off "next story")
  let readAlong = false;    // auto page-turn mode
  let advanceTimer = null;
  const preloaded = new Set();

  function preload(p){
    if (p < -1 || p >= story.pages || preloaded.has(p)) return;
    preloaded.add(p);
    const i = new Image(); i.src = imgSrc(p);
    if (p >= 0) { const a = new Audio(); a.preload = 'auto'; a.src = audSrc(p); }
  }
  function setPlayLabel(){
    const playing = !audio.paused && !audio.ended;
    playBtn.textContent = playing ? '❚❚ Pause' : (page < 0 ? '▶ Read to me' : '▶ Play');
  }
  function render(){
    end.classList.remove('show');
    img.src = imgSrc(page);
    img.alt = page < 0 ? `Cover: ${story.title}` : `Page ${page + 1}: ${story.text[page] || ''}`;
    count.textContent = page < 0 ? 'Cover' : `${page + 1} / ${story.pages}`;
    $('r-prev').disabled = page < 0;
    preload(page + 1); preload(page + 2);
    setPlayLabel();
  }
  function stopAudio(){ clearTimeout(advanceTimer); audio.pause(); }
  function playPage(){
    if (page < 0) return;
    clearTimeout(advanceTimer);
    audio.src = audSrc(page);
    audio.currentTime = 0;
    audio.play().catch(() => { readAlong = false; setPlayLabel(); });
  }
  function go(p, {auto = false} = {}){
    if (p < -1) return;
    if (p >= story.pages) { stopAudio(); readAlong = false; setPlayLabel(); end.classList.add('show'); return; }
    stopAudio(); page = p; render();
    if (readAlong && page >= 0) playPage();
    if (!auto && !readAlong) setPlayLabel();
  }
  audio.addEventListener('play', setPlayLabel);
  audio.addEventListener('pause', setPlayLabel);
  audio.addEventListener('ended', () => {
    setPlayLabel();
    if (readAlong) advanceTimer = setTimeout(() => go(page + 1, {auto: true}), 1100);
  });
  playBtn.addEventListener('click', () => {
    if (!audio.paused && !audio.ended) { readAlong = false; stopAudio(); return; }
    readAlong = true;
    if (page < 0) { go(0); return; }
    if (audio.src && audio.currentTime > 0 && !audio.ended && audio.src.endsWith(audSrc(page))) audio.play();
    else playPage();
  });
  $('r-next').addEventListener('click', () => go(page + 1));
  $('r-prev').addEventListener('click', () => go(page - 1));
  $('r-tap-next').addEventListener('click', () => go(page + 1));
  $('r-tap-prev').addEventListener('click', () => go(page - 1));
  $('r-again').addEventListener('click', () => { readAlong = false; go(-1); });
  document.addEventListener('keydown', e => {
    if (document.body.classList.contains('lo-on')) return; // lights-off mode has its own keys
    if (e.key === 'ArrowRight') go(page + 1);
    else if (e.key === 'ArrowLeft') go(page - 1);
    else if (e.key === ' ') { e.preventDefault(); playBtn.click(); }
  });
  // Swipe
  let sx = null, sy = null;
  const stage = $('r-stage');
  stage.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, {passive: true});
  stage.addEventListener('touchend', e => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; sx = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(page + (dx < 0 ? 1 : -1));
  }, {passive: true});
  img.addEventListener('contextmenu', e => e.preventDefault());
  // Small hook for lights-off mode (lightsoff.js).
  window.RTReader = {
    story,
    get page(){ return page; },
    stop(){ readAlong = false; stopAudio(); setPlayLabel(); },
    goTo(p){ readAlong = false; stopAudio(); page = Math.max(-1, Math.min(story.pages - 1, p)); render(); }
  };
  render();
})();

if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(()=>{});
