// Lights-off listening mode: the whole story's narration plays page after page while the screen
// stays near-black (no pictures). Sleep timer with a gentle fade, optional "play the next story",
// lock-screen controls via the Media Session API, Wake Lock while playing. No dependencies, no tracking.
(function(){
  const R = window.RTReader, ALL = window.STORIES || [];
  const $ = i => document.getElementById(i);
  const openBtn = $('lo-open'), box = $('lo');
  if (!R || !openBtn || !box) { if (openBtn) openBtn.hidden = true; return; }

  const titleEl = $('lo-title'), statusEl = $('lo-status'), subEl = $('lo-sub');
  const playBtn = $('lo-play'), exitBtn = $('lo-exit'), nextBox = $('lo-next');
  const radios = Array.from(box.querySelectorAll('input[name="lo-timer"]'));
  const pad = n => String(n).padStart(2, '0');
  const audSrc = (s, p) => `stories/${s.id}/p${pad(p + 1)}.mp3`;
  const FADE_MS = 10000, END_FADE_S = 3, PAGE_GAP_MS = 900, STORY_GAP_MS = 2000;

  // iOS ignores audio.volume (always 1), so fades there become "finish the current page, then stop".
  const volumeWorks = (() => { try { const a = new Audio(); a.volume = 0.5; return a.volume === 0.5; } catch (_) { return false; } })();
  const store = { get(k, d){ try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (_) { return d; } },
                  set(k, v){ try { localStorage.setItem(k, v); } catch (_) {} } }; // preferences stay on this device only

  const audio = new Audio(); audio.preload = 'auto';
  let story = R.story, idx = ALL.findIndex(s => s.id === story.id), page = 0;
  let active = false, wantPlay = false, finished = false;
  let mode = store.get('rt-lo-timer', 'end');
  let remaining = null;          // ms of listening left on a 15/30 min timer
  let fadeStart = null;          // set while the timer fade is running
  let stopAfterPage = false;     // no-volume fallback: stop when this page ends
  let gapTimer = null, tickTimer = null, lastTick = 0, wakeLock = null, lastFocus = null;
  if (!radios.some(r => r.value === mode)) mode = 'end';

  // ---------- UI ----------
  function say(msg){ statusEl.textContent = msg; }
  function minsLeft(){ return Math.max(1, Math.ceil(remaining / 60000)); }
  function sub(){
    let t = `Page ${page + 1} of ${story.pages}`;
    if (mode === 'end') t += ' · stops at the end';
    else if (remaining !== null) t += fadeStart || stopAfterPage ? ' · drifting off…' : ` · ${minsLeft()} min left`;
    subEl.textContent = t;
  }
  function syncPlay(){
    const on = wantPlay && !finished;
    playBtn.textContent = on ? '❚❚' : '▶';
    playBtn.setAttribute('aria-label', on ? 'Pause' : (finished ? 'Play the story again' : 'Play'));
    if ('mediaSession' in navigator) try { navigator.mediaSession.playbackState = on ? 'playing' : 'paused'; } catch (_) {}
  }
  function syncTimerUI(){
    radios.forEach(r => { r.checked = r.value === mode; });
    nextBox.checked = store.get('rt-lo-next', '0') === '1';
    nextBox.disabled = mode === 'end';
    nextBox.parentElement.classList.toggle('off', mode === 'end');
    nextBox.parentElement.title = mode === 'end' ? 'Pick Off, 15 or 30 min to keep going into the next story' : '';
  }
  function setTimer(m){
    mode = m; store.set('rt-lo-timer', m);
    remaining = (m === '15' || m === '30') ? +m * 60000 : null;
    cancelFade(); syncTimerUI(); sub();
  }

  // ---------- Media Session (lock-screen controls) ----------
  function meta(){
    if (!('mediaSession' in navigator) || !window.MediaMetadata) return;
    const abs = u => new URL(u, location.href).href;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: story.title, artist: 'Rumbletuck', album: 'Lights-off bedtime stories',
        artwork: [{ src: abs('icons/icon-192.png'), sizes: '192x192', type: 'image/png' },
                  { src: abs(`stories/${story.id}/thumb.webp`), sizes: '640x480', type: 'image/webp' }]
      });
    } catch (_) {}
  }
  function handlers(on){
    if (!('mediaSession' in navigator)) return;
    const set = (a, fn) => { try { navigator.mediaSession.setActionHandler(a, on ? fn : null); } catch (_) {} };
    set('play', () => { if (!wantPlay || finished) toggle(); });
    set('pause', () => { if (wantPlay) toggle(); });
    set('stop', () => finish('Stopped. Sweet dreams.'));
    set('nexttrack', () => { if (page < story.pages - 1) { page++; playPage(); } });
    set('previoustrack', () => { if (page > 0) page--; playPage(); });
  }

  // ---------- Wake Lock (keeps the dark screen from locking mid-story; released when audio stops) ----------
  async function lock(){
    if (!('wakeLock' in navigator) || wakeLock || document.visibilityState !== 'visible') return;
    try { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } catch (_) { wakeLock = null; }
  }
  function unlock(){ if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; } }
  document.addEventListener('visibilitychange', () => { if (active && wantPlay && !finished) lock(); });

  // ---------- Playback ----------
  function prefetch(s){ // warm the offline cache so the rest of the story keeps playing without signal
    if (!navigator.onLine || !('caches' in window)) return;
    let p = 0; const next = () => { if (p >= s.pages || !active) return; fetch(audSrc(s, p++)).then(r => r.blob()).catch(() => {}).then(next); };
    next();
  }
  function playPage(){
    clearTimeout(gapTimer); finished = false; wantPlay = true;
    if (!fadeStart) audio.volume = 1;
    audio.src = audSrc(story, page);
    const pr = audio.play();
    if (pr && pr.catch) pr.catch(err => { if (err && err.name === 'AbortError') return; wantPlay = false; syncPlay(); say('Tap ▶ to start the story.'); });
    syncPlay(); sub(); lock();
    if ('mediaSession' in navigator) meta();
  }
  function finish(msg){
    clearTimeout(gapTimer); audio.pause(); cancelFade(); stopAfterPage = false;
    wantPlay = false; finished = true;
    if (mode === '15' || mode === '30') remaining = +mode * 60000;
    unlock(); syncPlay(); say(msg || 'The end. Sweet dreams.'); sub();
  }
  function cancelFade(){ fadeStart = null; stopAfterPage = false; if (volumeWorks) audio.volume = 1; }
  function endOfStoryStops(){ return mode === 'end' || !nextBox.checked || idx < 0 || idx >= ALL.length - 1; }

  audio.addEventListener('ended', () => {
    if (!active || !wantPlay) return;
    if (stopAfterPage) { finish('Sleep timer finished. Sweet dreams.'); return; }
    const go = (fn, ms) => { if (document.hidden) fn(); else gapTimer = setTimeout(fn, ms); }; // no gaps in the background (iOS)
    if (page < story.pages - 1) { page++; go(playPage, PAGE_GAP_MS); return; }
    if (endOfStoryStops()) { finish(idx >= ALL.length - 1 && mode !== 'end' && nextBox.checked ? 'That was the last story. Sweet dreams.' : 'The end. Sweet dreams.'); return; }
    idx++; story = ALL[idx]; page = 0; titleEl.textContent = story.title; document.title = `${story.title} — Lights off`;
    say(`Next story: ${story.title}`); prefetch(story); go(playPage, STORY_GAP_MS);
  });
  audio.addEventListener('playing', () => { if (active) say('Playing'); });
  audio.addEventListener('error', () => {
    if (!active || !audio.src) return;
    wantPlay = false; unlock(); syncPlay();
    say(navigator.onLine ? 'This page didn’t load. Tap ▶ to try again.' : 'You’re offline and this page isn’t saved yet. Tap ▶ when you’re back online.');
  });
  audio.addEventListener('timeupdate', tick);

  function tick(){
    const now = Date.now(), dt = lastTick ? Math.min(now - lastTick, 60000) : 0; lastTick = now;
    if (!active || !wantPlay || finished || audio.paused) return;
    if (remaining !== null && !fadeStart && !stopAfterPage) {
      const before = minsLeft();
      remaining -= dt;
      if (remaining <= 0) {
        remaining = 0;
        if (volumeWorks) fadeStart = now; else stopAfterPage = true;
        sub();
      } else if (minsLeft() !== before) sub();
    }
    if (fadeStart) {
      const v = 1 - (now - fadeStart) / FADE_MS;
      if (v <= 0) { finish('Sleep timer finished. Sweet dreams.'); return; }
      audio.volume = Math.max(0, Math.min(1, v));
    } else if (volumeWorks && page === story.pages - 1 && endOfStoryStops() && audio.duration) {
      const left = audio.duration - audio.currentTime; // soften the very last words of the story
      audio.volume = Math.max(0.15, Math.min(1, left / END_FADE_S));
    }
  }

  function toggle(){
    if (wantPlay && !finished) {
      clearTimeout(gapTimer); audio.pause(); wantPlay = false; unlock(); syncPlay(); say('Paused'); return;
    }
    if (finished) { finished = false; page = 0; playPage(); return; }
    wantPlay = true;
    if (audio.src && audio.currentTime > 0 && !audio.ended && !audio.error) {
      const pr = audio.play(); if (pr && pr.catch) pr.catch(() => { wantPlay = false; syncPlay(); });
      syncPlay(); lock();
    } else playPage();
  }

  // ---------- Open / exit ----------
  const themeMeta = document.querySelector('meta[name="theme-color"]'), themeDefault = themeMeta ? themeMeta.content : '';
  function theme(c){ if (themeMeta && c) themeMeta.content = c; }
  function open(){
    R.stop();
    story = R.story; idx = ALL.findIndex(s => s.id === story.id);
    const endShown = document.getElementById('r-end') && document.getElementById('r-end').classList.contains('show');
    page = (R.page < 0 || endShown) ? 0 : R.page;
    active = true; finished = false; lastTick = 0;
    lastFocus = document.activeElement;
    titleEl.textContent = story.title; say('Starting…');
    setTimer(mode);
    box.hidden = false; document.body.classList.add('lo-on'); theme('#000000');
    handlers(true); meta();
    playPage();                       // inside the tap, so autoplay rules are satisfied
    prefetch(story);
    clearInterval(tickTimer); tickTimer = setInterval(tick, 1000);
    playBtn.focus({ preventScroll: true });
  }
  function exit(){
    active = false; clearTimeout(gapTimer); clearInterval(tickTimer); audio.pause(); cancelFade();
    wantPlay = false; unlock(); handlers(false);
    if ('mediaSession' in navigator) try { navigator.mediaSession.metadata = null; navigator.mediaSession.playbackState = 'none'; } catch (_) {}
    box.hidden = true; document.body.classList.remove('lo-on'); theme(themeDefault);
    if (story.id !== R.story.id) { location.href = `read.html?s=${encodeURIComponent(story.id)}&p=${page + 1}`; return; }
    R.goTo(page);
    (lastFocus && lastFocus.focus ? lastFocus : openBtn).focus({ preventScroll: true });
  }

  openBtn.addEventListener('click', open);
  playBtn.addEventListener('click', toggle);
  exitBtn.addEventListener('click', exit);
  radios.forEach(r => r.addEventListener('change', () => { if (r.checked) setTimer(r.value); }));
  nextBox.addEventListener('change', () => store.set('rt-lo-next', nextBox.checked ? '1' : '0'));
  box.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); exit(); }
    else if (e.key === ' ' && e.target.tagName !== 'INPUT') { e.preventDefault(); toggle(); }
    else if (e.key === 'Tab') { // keep focus inside the dark screen
      const f = Array.from(box.querySelectorAll('button, input:not([disabled])'));
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  });
  syncTimerUI();
  // ?lo=1 (homepage "Start a story with the lights off"): open straight into the dark screen.
  // If the browser needs a tap before sound, the status line says "Tap ▶ to start the story."
  const qs = new URLSearchParams(location.search);
  if (qs.get('lo') === '1') {
    qs.delete('lo'); history.replaceState(null, '', `${location.pathname}?${qs}${location.hash}`);
    open();
  }
})();
