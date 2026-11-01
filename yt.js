// YouTube on the site: click-to-play Shorts (nothing loads from YouTube until a grown-up taps play),
// plus Subscribe / Watch-more buttons. Video IDs live in data/youtube.json (one line per story).
// Story pages are prerendered by tools/build_seo.py; this script also fills in a story's video at runtime
// if its ID was added to data/youtube.json after the last build.
(function(){
  const CHANNEL = 'https://www.youtube.com/@rumbletuckstories';
  const SUBSCRIBE = CHANNEL + '?sub_confirmation=1';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const shortName = t => String(t || '').split(' the ')[0];
  let dataP = null;
  const data = () => dataP || (dataP = fetch('/data/youtube.json').then(r => r.ok ? r.json() : {}).catch(() => ({})));

  function iframe(id, title){
    const f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&playsinline=1&rel=0';
    f.title = title || 'Rumbletuck video';
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.allowFullscreen = true;
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    return f;
  }
  function posterHTML(id, story, imgBase){
    const name = shortName(story.title);
    return `<button class="yt-poster" type="button" data-yt="${esc(id)}" data-title="${esc(name)} – Rumbletuck Short" aria-label="Play the ${esc(name)} video">
      <img src="${imgBase}stories/${esc(story.id)}/thumb.webp" alt="" width="640" height="480" loading="lazy">
      <span class="yt-pill">Short</span><span class="yt-play" aria-hidden="true"></span></button>`;
  }
  window.RTYouTube = { CHANNEL, SUBSCRIBE, data, posterHTML, shortName };

  // Inline posters (story pages, homepage): swap the poster for the player on tap.
  document.addEventListener('click', e => {
    const b = e.target.closest('.yt-poster');
    if (!b || b.closest('.r-end')) return;
    e.preventDefault();
    const frame = b.parentElement;
    frame.classList.add('playing');
    b.replaceWith(iframe(b.dataset.yt, b.dataset.title));
  });

  // Story page whose video was added to data/youtube.json after the last build.
  const slot = document.querySelector('.yt-block[data-story]:not([data-has-video])');
  if (slot && window.fetch) data().then(d => {
    const id = d.videos && d.videos[slot.dataset.story];
    const frame = slot.querySelector('.yt-frame');
    if (!id || !frame) return;
    const story = {id: slot.dataset.story, title: slot.dataset.title || ''};
    frame.innerHTML = posterHTML(id, story, '/');
    frame.hidden = false;
    slot.setAttribute('data-has-video', '');
    const h = slot.querySelector('h2'); if (h) h.textContent = `Watch ${shortName(story.title)} on YouTube`;
  });

  // Reader (read.html): add the story's Short to "The End" screen; it opens in a pop-up player.
  const endBox = document.querySelector('.r-end .box');
  const story = window.RTReader && window.RTReader.story;
  if (!endBox || !story) return;
  const block = document.createElement('div');
  block.className = 'r-yt';
  block.innerHTML = `<a class="yt-link" href="${SUBSCRIBE}" target="_blank" rel="noopener">▶ Subscribe on YouTube</a>`;
  endBox.appendChild(block);
  data().then(d => {
    const id = d.videos && d.videos[story.id];
    if (!id) return;
    const name = shortName(story.title);
    block.innerHTML = `<button class="r-yt-open" type="button"><img src="stories/${esc(story.id)}/thumb.webp" alt="" width="640" height="480"><span class="yt-play sm" aria-hidden="true"></span><span class="r-yt-txt"><b>Watch ${esc(name)}'s Short</b><small>A little animated video of this story</small></span></button>
      <p class="r-yt-links"><a class="yt-link" href="${CHANNEL}" target="_blank" rel="noopener">Watch more on YouTube</a> · <a class="yt-link" href="${SUBSCRIBE}" target="_blank" rel="noopener">Subscribe</a></p>`;
    block.querySelector('.r-yt-open').addEventListener('click', () => openModal(id, name));
  });

  let modal = null, lastFocus = null;
  function openModal(id, name){
    if (window.RTReader) window.RTReader.stop();
    lastFocus = document.activeElement;
    modal = document.createElement('div');
    modal.className = 'yt-modal';
    modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-label', `${name} video`);
    modal.innerHTML = `<div class="yt-modal-inner"><div class="yt-frame playing"></div>
      <div class="yt-modal-bar"><a class="btn btn-yt" href="${CHANNEL}" target="_blank" rel="noopener">Watch more on YouTube</a><button class="btn btn-ghost yt-close" type="button">✕ Close</button></div></div>`;
    modal.querySelector('.yt-frame').appendChild(iframe(id, `${name} – Rumbletuck Short`));
    modal.addEventListener('click', e => { if (e.target === modal || e.target.closest('.yt-close')) closeModal(); });
    document.body.appendChild(modal); document.body.classList.add('yt-on');
    modal.querySelector('.yt-close').focus();
  }
  function closeModal(){
    if (!modal) return;
    modal.remove(); modal = null; document.body.classList.remove('yt-on');
    if (lastFocus) lastFocus.focus();
  }
  document.addEventListener('keydown', e => { if (modal && e.key === 'Escape') closeModal(); });
})();
