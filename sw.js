/* Offline copy of the report generator page. Holds no data, no keys, no images.
   The page always comes fresh from the internet when there is a connection; the saved copy is used only offline.
   Libraries (Excel, PDF) are kept so they also work offline. Google Drive calls are never touched. */
const C = 'adnan-page-1';
const LIBS = [
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];
const PAGE = new URL('./', self.location).href;

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(C).then(async c => {
    try { const r = await fetch(PAGE, { cache: 'no-cache' }); if (r.ok) await c.put(PAGE, r); } catch (x) {}
    for (const u of LIBS) { try { const r = await fetch(u, { mode: 'cors' }); if (r.ok) await c.put(u, r); } catch (x) {} }
  }));
});

self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== C) await caches.delete(k);
  await self.clients.claim();
})()));

self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin === self.location.origin) {
    const isPage = r.mode === 'navigate' || u.href.split(/[?#]/)[0] === PAGE || u.pathname.endsWith('/index.html');
    if (!isPage) return;
    e.respondWith(fetch(u.href, { cache: 'no-cache', credentials: 'same-origin' })
      .then(res => { if (res.ok) { const cp = res.clone(); caches.open(C).then(c => c.put(PAGE, cp)); } return res; })
      .catch(() => caches.match(PAGE).then(m => m || Response.error())));
    return;
  }
  if (u.hostname === 'cdn.jsdelivr.net' || u.hostname === 'cdnjs.cloudflare.com') {
    e.respondWith(caches.match(r.url).then(m => m || fetch(r).then(res => {
      if (res.ok || res.type === 'opaque') { const cp = res.clone(); caches.open(C).then(c => c.put(r.url, cp)); }
      return res;
    })));
  }
  // everything else (Google Drive sync, etc.) goes straight to the internet
});
