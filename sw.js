// Offline-Hilfe für die Spielseite: Online wird immer zuerst die frische Version aus dem Netz geholt
// und nebenbei gemerkt. Nur ohne Netz kommt die gemerkte Fassung, so ist die Seite nie veraltet.
const SPEICHER = "colorgraphy-v1";
const VORAB = ["spiel.html", "spiel.css", "spiel.js", "lauf.js", "lauf-welt.js", "lauf-ton.js", "lauf-flug.js", "style.css", "tools.css", "seite.js", "ziehen.js",
  "vendor/three/three.module.min.js", "spiel/vorschau-springen.jpg", "spiel/vorschau-rennen.jpg", "favicon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SPEICHER).then(c => c.addAll(VORAB)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then(alle => Promise.all(alle.filter(k => k !== SPEICHER).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const r = e.request, url = new URL(r.url);
  if (r.method !== "GET" || url.origin !== location.origin) return;   // Bestenliste und Zählung laufen immer übers Netz
  e.respondWith(
    fetch(r).then(antwort => {
      if (antwort.ok) { const kopie = antwort.clone(); caches.open(SPEICHER).then(c => c.put(r, kopie)); }
      return antwort;
    }).catch(() => caches.match(r).then(t => t || caches.match(r, { ignoreSearch: true })))
  );
});
