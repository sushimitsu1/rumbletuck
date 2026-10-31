// Offline-friendly: precache the app shell; cache story pages/audio the first time they are opened.
const VERSION = 'rumbletuck-v5';
const SHELL = ['./','index.html','read.html','privacy.html','styles.css','config.js','stories.js','home.js','reader.js','fonts/nunito-regular.ttf','fonts/nunito-extrabold.ttf','icons/icon-192.png','favicon.ico','manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.headers.has('range')) return; // let the browser stream audio directly
  const isStory = req.url.includes('/stories/');
  e.respondWith(
    isStory
      ? caches.match(req).then(hit => hit || fetch(req).then(res => { if (res.ok && res.status === 200) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return res; }))
      : fetch(req).then(res => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return res; }).catch(() => caches.match(req, {ignoreSearch: true}))
  );
});
