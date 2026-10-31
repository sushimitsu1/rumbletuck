// Offline-friendly: precache the app shell; cache story pages/audio the first time they are opened.
const VERSION = 'rumbletuck-v8';
const SHELL = ['./','index.html','read.html','privacy.html','confirmed.html','styles.css','config.js','stories.js','home.js','reader.js','lightsoff.js','fonts/nunito-regular.ttf','fonts/nunito-extrabold.ttf','icons/icon-192.png','favicon.ico','manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const isStory = req.url.includes('/stories/');
  if (req.headers.has('range')) {
    // Audio asks for byte ranges. Serve them from a saved copy when we have one (offline listening),
    // otherwise let the request go straight to the network as before.
    if (!isStory) return;
    e.respondWith(caches.match(req.url).then(hit => hit ? rangeFrom(req, hit) : fetch(req)));
    return;
  }
  e.respondWith(
    isStory
      ? caches.match(req).then(hit => hit || fetch(req).then(res => { if (res.ok && res.status === 200) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return res; }))
      : fetch(req).then(res => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return res; }).catch(() => caches.match(req, {ignoreSearch: true}))
  );
});
function rangeFrom(req, res){
  return res.arrayBuffer().then(buf => {
    const size = buf.byteLength, m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') || '');
    let start = 0, end = size - 1;
    if (m && m[1]) { start = +m[1]; if (m[2]) end = Math.min(+m[2], size - 1); }
    else if (m && m[2]) start = Math.max(0, size - +m[2]);
    if (start >= size || start > end) return new Response(null, {status: 416, headers: {'Content-Range': `bytes */${size}`}});
    return new Response(buf.slice(start, end + 1), {status: 206, statusText: 'Partial Content', headers: {
      'Content-Type': res.headers.get('Content-Type') || 'audio/mpeg', 'Content-Length': String(end - start + 1),
      'Content-Range': `bytes ${start}-${end}/${size}`, 'Accept-Ranges': 'bytes'}});
  });
}
