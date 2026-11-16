/* Zwischenspeicher für eine private Unterseite: Kartenkacheln, Höhendaten und Bibliotheken
   werden beim ersten Laden gemerkt, damit die Karte auch im Funkloch funktioniert. */
const C = 'rad-v1';
self.addEventListener('install', () => self.skipWaiting());
/* Morgen-Mitteilung: Text kommt fertig vom Server */
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Rad-Cockpit', {
    body: d.body || '', icon: '/rad-icon-192.png', badge: '/rad-icon-192.png', tag: 'rad-morgen', data: { url: d.url || '/rad.html' }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/rad.html';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(l => {
    for (const c of l) if (c.url.includes('/rad') && 'focus' in c) return c.focus();
    return self.clients.openWindow(url);
  }));
});
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
