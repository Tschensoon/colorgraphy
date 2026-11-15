/* Zwischenspeicher für eine private Unterseite: Kartenkacheln, Höhendaten und Bibliotheken
   werden beim ersten Laden gemerkt, damit die Karte auch im Funkloch funktioniert. */
const C = 'rad-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  const tile = u.host === 'tiles.openfreemap.org' || u.host === 'unpkg.com' || u.pathname.startsWith('/elevation-tiles-prod/');
  if (tile) {
    e.respondWith(caches.open(C).then(c => c.match(r).then(hit => hit || fetch(r).then(n => { if (n.ok) c.put(r, n.clone()); return n; }))));
    return;
  }
  if (u.origin === location.origin && u.pathname === '/rad.html') {
    // immer zuerst die neue Fassung holen, nur ohne Netz die gespeicherte nehmen
    e.respondWith(fetch(r).then(n => { const k = n.clone(); caches.open(C).then(c => c.put('/rad.html', k)); return n; })
      .catch(() => caches.match('/rad.html')));
  }
});
