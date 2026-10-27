// Lernseite: Belichtungs-Labor, Brennweiten-Regler, Farbkreis, Weißabgleich und Fotos nach Farbe.
// Alle Szenen werden im Browser gezeichnet, es werden keine Bilder geladen (außer deinen Galerie-Fotos).
"use strict";

const ruhig = matchMedia("(prefers-reduced-motion: reduce)").matches;
const klemmen = (x, a, b) => Math.min(b, Math.max(a, x));
const zahl = (x, n = 1) => x.toFixed(n).replace(".", ",");
const rng = (seed) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// Canvas auf Anzeigegröße bringen; zeichnet in logischen Einheiten (breite × hoehe)
function vorbereiten(canvas, breite, hoehe, dprMax = 2) {
  const r = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, dprMax);
  canvas.width = Math.max(1, Math.round(r.width * dpr));
  canvas.height = Math.max(1, Math.round(r.height * dpr));
  const g = canvas.getContext("2d");
  g.setTransform(canvas.width / breite, 0, 0, canvas.height / hoehe, 0, 0);
  return g;
}
// Neu zeichnen, wenn sich die Breite ändert
function beiGroesse(el, fn) {
  let w = 0;
  new ResizeObserver(() => {
    const nw = Math.round(el.getBoundingClientRect().width);
    if (nw && nw !== w) { w = nw; fn(); }
  }).observe(el);
}

/* ---------- Kapitel 1: Belichtung ---------- */
(() => {
  const BLENDEN = [1.8, 2, 2.8, 4, 5.6, 8, 11, 16, 22];
  const ZEITEN = [1 / 4000, 1 / 2000, 1 / 1000, 1 / 500, 1 / 250, 1 / 125, 1 / 60, 1 / 30, 1 / 15, 1 / 8, 1 / 4, 1 / 2, 1];
  const ISOS = [100, 200, 400, 800, 1600, 3200, 6400, 12800];
  const RAUSCHEN = [0, 0.05, 0.09, 0.15, 0.24, 0.34, 0.46, 0.6];
  const SZENE_EV = 11; // richtige Belichtung bei ISO 100: f/4 und 1/125 s
  const W = 600, H = 400;

  const szene = document.getElementById("b-szene");
  if (!szene) return;
  const [hinten, bahn, vorne, rauschen] = ["b-hinten", "b-bahn", "b-vorne", "b-rauschen"].map((k) => szene.querySelector("." + k));
  const stapel = document.createElement("div");
  stapel.className = "b-stapel";
  szene.prepend(stapel);
  stapel.append(hinten, bahn, vorne, rauschen);
  const r = { blende: document.getElementById("r-blende"), zeit: document.getElementById("r-zeit"), iso: document.getElementById("r-iso") };
  const zeitText = (t) => (t >= 1 ? t + " s" : "1/" + Math.round(1 / t) + " s");

  // Hintergrund: Abendhimmel, Stadt mit Fenstern, Lichterkette, Brücke und Fluss
  const malHinten = () => {
    const g = vorbereiten(hinten, W, H), z = rng(4);
    const himmel = g.createLinearGradient(0, 0, 0, 260);
    himmel.addColorStop(0, "#141a4a"); himmel.addColorStop(0.55, "#5b3a7e"); himmel.addColorStop(0.85, "#e07a5c"); himmel.addColorStop(1, "#ffb36b");
    g.fillStyle = himmel; g.fillRect(0, 0, W, 270);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + z() * 0.5})`; g.fillRect(z() * W, z() * 110, 1.2, 1.2); }
    // Häuser
    let x = -10;
    while (x < W) {
      const b = 30 + z() * 45, h = 50 + z() * 110, y = 245 - h;
      g.fillStyle = `rgb(${24 + z() * 14},${20 + z() * 12},${44 + z() * 20})`;
      g.fillRect(x, y, b, h + 20);
      if (z() < 0.35) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + b / 2, y - 18); g.lineTo(x + b, y); g.fill(); }
      for (let fy = y + 8; fy < 238; fy += 12) for (let fx = x + 5; fx < x + b - 6; fx += 9)
        if (z() < 0.42) { g.fillStyle = z() < 0.8 ? "#ffd27a" : "#9fd0ff"; g.fillRect(fx, fy, 4, 6); }
      x += b + 2;
    }
    // Brücke
    g.fillStyle = "#2a2440"; g.fillRect(0, 238, W, 12);
    g.fillStyle = "#1c1830"; for (let px = 20; px < W; px += 110) g.fillRect(px, 250, 14, 40);
    // Fluss mit Spiegelungen
    const wasser = g.createLinearGradient(0, 250, 0, H);
    wasser.addColorStop(0, "#3a2c5a"); wasser.addColorStop(1, "#0e0c20");
    g.fillStyle = wasser; g.fillRect(0, 250, W, H - 250);
    for (let i = 0; i < 90; i++) {
      const wx = z() * W, wy = 258 + z() * 140;
      g.fillStyle = z() < 0.75 ? `rgba(255,200,120,${0.15 + z() * 0.35})` : `rgba(160,200,255,${0.15 + z() * 0.3})`;
      g.fillRect(wx, wy, 6 + z() * 22, 1.5);
    }
    // Lichterkette (wird bei offener Blende zu Bokeh-Kreisen)
    for (let i = 0; i <= 26; i++) {
      const lx = -10 + i * 24, ly = 40 + Math.sin((i / 26) * Math.PI) * 50;
      const glow = g.createRadialGradient(lx, ly, 0, lx, ly, 9);
      const farbe = i % 3 === 0 ? "255,170,90" : i % 3 === 1 ? "255,225,140" : "255,120,150";
      glow.addColorStop(0, `rgba(${farbe},1)`); glow.addColorStop(0.35, `rgba(${farbe},.8)`); glow.addColorStop(1, `rgba(${farbe},0)`);
      g.fillStyle = glow; g.beginPath(); g.arc(lx, ly, 9, 0, 7); g.fill();
    }
  };

  // Vordergrund: Geländer und Sonnenblume (immer scharf, darauf ist fokussiert)
  const malVorne = () => {
    const g = vorbereiten(vorne, W, H);
    g.fillStyle = "#3a2618"; g.fillRect(0, 352, W, 10);
    g.fillStyle = "#2a1a10"; g.fillRect(0, 362, W, 38);
    for (let px = 8; px < W; px += 60) { g.fillStyle = "#33210f"; g.fillRect(px, 362, 10, 38); }
    g.fillStyle = "rgba(255,190,120,.25)"; g.fillRect(0, 352, W, 2);
    // Stängel und Blätter
    g.strokeStyle = "#3f6b2a"; g.lineWidth = 7; g.lineCap = "round";
    g.beginPath(); g.moveTo(470, 400); g.quadraticCurveTo(478, 260, 462, 175); g.stroke();
    g.fillStyle = "#4d7f31";
    [[474, 300, -1], [468, 240, 1]].forEach(([bx, by, s]) => {
      g.beginPath(); g.moveTo(bx, by);
      g.quadraticCurveTo(bx + s * 40, by - 30, bx + s * 70, by - 5);
      g.quadraticCurveTo(bx + s * 35, by + 12, bx, by); g.fill();
    });
    // Blüte
    const cx = 460, cy = 160;
    for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2 + ring * 0.14;
      g.save(); g.translate(cx + Math.cos(a) * 40, cy + Math.sin(a) * 40); g.rotate(a);
      g.fillStyle = ring ? "#f6b21b" : "#ffcf3a";
      g.beginPath(); g.ellipse(0, 0, 24, 8, 0, 0, 7); g.fill(); g.restore();
    }
    const kern = g.createRadialGradient(cx - 6, cy - 6, 2, cx, cy, 34);
    kern.addColorStop(0, "#7a4a1c"); kern.addColorStop(1, "#3a200c");
    g.fillStyle = kern; g.beginPath(); g.arc(cx, cy, 33, 0, 7); g.fill();
    g.fillStyle = "rgba(20,10,4,.6)";
    for (let i = 0; i < 160; i++) { const a = i * 2.39996, d = Math.sqrt(i) * 2.5; g.beginPath(); g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1.1, 0, 7); g.fill(); }
  };

  // Straßenbahn auf der Brücke; bei langer Belichtung als Wischspur
  let bahnX = 120;
  const malBahn = () => {
    const g = bahn.getContext("2d");
    g.setTransform(bahn.width / W, 0, 0, bahn.height / H, 0, 0);
    g.clearRect(0, 0, W, H);
    const t = ZEITEN[r.zeit.value];
    const spur = Math.min(260, 220 * t * 6); // Strecke während der Belichtung (überzeichnet, damit man es sieht)
    const n = klemmen(Math.ceil(spur / 3), 1, 70);
    const zeichne = (x) => {
      g.fillStyle = "#e8c440"; g.beginPath(); g.roundRect(x, 206, 130, 32, 8); g.fill();
      g.fillStyle = "#c23b3b"; g.fillRect(x, 228, 130, 5);
      g.fillStyle = "#fff2c4"; for (let f = 0; f < 6; f++) g.fillRect(x + 8 + f * 20, 212, 14, 11);
      g.fillStyle = "#222"; g.fillRect(x + 60, 196, 2, 10); g.fillRect(x + 50, 196, 22, 2);
      g.fillStyle = "#fff8d0"; g.fillRect(x + 126, 226, 4, 4);
    };
    g.globalAlpha = n === 1 ? 1 : Math.min(1, 2.2 / n);
    for (let i = 0; i < n; i++) zeichne(bahnX - (spur * i) / n);
    g.globalAlpha = 1;
  };

  const malRauschen = () => {
    const b = Math.max(1, Math.round(rauschen.getBoundingClientRect().width / 1.5)), h = Math.round((b * H) / W);
    rauschen.width = b; rauschen.height = h;
    const g = rauschen.getContext("2d"), bild = g.createImageData(b, h), d = bild.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = Math.random() * 255;
      d[i] = v + (Math.random() - 0.5) * 120; d[i + 1] = v + (Math.random() - 0.5) * 120; d[i + 2] = v + (Math.random() - 0.5) * 120; d[i + 3] = 255;
    }
    g.putImageData(bild, 0, 0);
  };

  const texte = {
    blende: (n) => n <= 2.8 ? "Weit offen: viel Licht und ein weicher, unscharfer Hintergrund. Die Lichter werden zu runden Bokeh-Kreisen. Ideal für Porträts."
      : n <= 5.6 ? "Mittlere Blende: Das Motiv ist scharf, der Hintergrund leicht weich. Ein guter Alltagswert."
      : n <= 11 ? "Weiter geschlossen: Vorder- und Hintergrund werden scharf. Typisch für Landschaften und Architektur."
      : "Sehr kleine Öffnung: maximale Schärfentiefe, aber wenig Licht. Durch Beugung wird das Bild sogar wieder etwas weicher.",
    zeit: (t) => t <= 1 / 1000 ? "Sehr kurz: friert selbst schnelle Bewegung ein, die Bahn steht still. Ideal für Sport und Tiere."
      : t <= 1 / 125 ? "Alltagszeit: Aus der Hand bleibt fast alles scharf, die Bahn verwischt kaum."
      : t <= 1 / 15 ? "Bewegung beginnt zu verwischen. Ab etwa 1/30 s wird es aus der Hand wackelig, der Bildstabilisator hilft."
      : "Langzeitbelichtung: Die Bahn wird zur Lichtspur. Das geht nur mit Stativ, sonst verwackelt alles.",
    iso: (i) => i <= 200 ? "Niedrig: sauberstes Bild, kaum Rauschen. Nimm diesen Wert, wann immer genug Licht da ist."
      : i <= 1600 ? "Mittel: macht das Bild heller, leichtes Rauschen. Gut nutzbar in Innenräumen und am Abend."
      : "Hoch: deutlich hellere Bilder, aber sichtbares Farbrauschen und weniger Details.",
  };

  const anwenden = () => {
    const n = BLENDEN[r.blende.value], t = ZEITEN[r.zeit.value], iso = ISOS[r.iso.value];
    const abw = Math.log2(iso / 100) - (Math.log2((n * n) / t) - SZENE_EV); // + zu hell, − zu dunkel
    document.getElementById("o-blende").textContent = "f/" + n;
    document.getElementById("o-zeit").textContent = zeitText(t);
    document.getElementById("o-iso").textContent = iso;
    r.blende.setAttribute("aria-valuetext", "f/" + n);
    r.zeit.setAttribute("aria-valuetext", zeitText(t));
    r.iso.setAttribute("aria-valuetext", "ISO " + iso);
    document.getElementById("w-blende").textContent = texte.blende(n);
    document.getElementById("w-zeit").textContent = texte.zeit(t);
    document.getElementById("w-iso").textContent = texte.iso(iso);
    szene.querySelector(".b-werte").textContent = `f/${n} · ${zeitText(t).replace(" s", "")} · ISO ${iso}`;
    szene.querySelector(".b-zeiger").style.left = 50 + (klemmen(abw, -3, 3) / 3) * 46 + "%";
    const messer = document.getElementById("messer");
    const stufen = Math.round(abw * 3) / 3;
    messer.classList.toggle("ok", Math.abs(stufen) < 0.34);
    messer.textContent = Math.abs(stufen) < 0.34 ? "✓ Richtig belichtet."
      : `${stufen > 0 ? "Zu hell" : "Zu dunkel"} um ${zahl(Math.abs(stufen))} ${Math.abs(stufen) === 1 ? "Stufe" : "Stufen"}. ${stufen > 0 ? "Blende schließen, kürzere Zeit oder niedrigere ISO." : "Blende öffnen, längere Zeit oder höhere ISO."}`;
    // Wirkung: Unschärfe abhängig von der Blende, Helligkeit von der Gesamtbelichtung, Rauschen von der ISO
    const breite = szene.getBoundingClientRect().width;
    const unschaerfe = (1.8 / n) * breite * 0.02;
    hinten.style.filter = `blur(${unschaerfe.toFixed(1)}px)`;
    bahn.style.filter = `blur(${(unschaerfe * 0.8).toFixed(1)}px)`;
    const hell = klemmen(Math.pow(2, abw), 0.06, 8);
    stapel.style.filter = `brightness(${hell.toFixed(3)}) saturate(${abw > 0 ? (1 / (1 + abw * 0.25)).toFixed(2) : 1})`;
    rauschen.style.opacity = RAUSCHEN[r.iso.value];
    document.querySelectorAll("#belichtungs-labor .vorlagen button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === [r.blende.value, r.zeit.value, r.iso.value].join(","))));
    malBahn();
  };

  Object.values(r).forEach((el) => el.addEventListener("input", anwenden));
  r.iso.addEventListener("change", malRauschen);
  document.querySelectorAll("#belichtungs-labor .vorlagen button").forEach((b) => b.addEventListener("click", () => {
    [r.blende.value, r.zeit.value, r.iso.value] = b.dataset.v.split(",");
    anwenden();
  }));
  beiGroesse(szene, () => {
    malHinten(); malVorne();
    vorbereiten(bahn, W, H);
    malRauschen(); anwenden();
  });

  // Die Bahn fährt nur, solange das Labor zu sehen ist
  let sichtbar = false, zuletzt = 0;
  const fahren = (zeit) => {
    if (!sichtbar) return;
    const dt = Math.min(0.05, (zeit - zuletzt) / 1000 || 0);
    zuletzt = zeit;
    bahnX += dt * 70;
    if (bahnX > W + 280) bahnX = -150;
    malBahn();
    requestAnimationFrame(fahren);
  };
  if (!ruhig) new IntersectionObserver((e) => {
    const war = sichtbar;
    sichtbar = e[0].isIntersecting;
    if (sichtbar && !war) { zuletzt = performance.now(); requestAnimationFrame(fahren); }
  }).observe(szene);
})();

/* ---------- Kapitel 2: Brennweite ---------- */
(() => {
  const bild = document.getElementById("z-bild");
  if (!bild) return;
  const mini = document.getElementById("z-mini"), rahmen = document.getElementById("z-rahmen"), regler = document.getElementById("r-mm");
  const W = 1200, H = 800, ZIEL = [770, 318]; // Burg

  // Landschaft als Vektorzeichnung: bleibt bei jedem Zoom scharf, Details tauchen erst nah auf
  const landschaft = (g) => {
    const z = rng(9);
    const himmel = g.createLinearGradient(0, 0, 0, 520);
    himmel.addColorStop(0, "#3d6fb6"); himmel.addColorStop(0.7, "#9cc3e6"); himmel.addColorStop(1, "#f2dcb0");
    g.fillStyle = himmel; g.fillRect(0, 0, W, H);
    // Wolken
    for (let i = 0; i < 9; i++) {
      const wx = z() * W, wy = 40 + z() * 160, s = 0.6 + z();
      g.fillStyle = "rgba(255,255,255,.75)";
      for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(wx + k * 22 * s, wy + Math.sin(k) * 6, 30 * s, 14 * s, 0, 0, 7); g.fill(); }
    }
    // Heißluftballon
    g.fillStyle = "#e0484f"; g.beginPath(); g.ellipse(250, 170, 22, 27, 0, 0, 7); g.fill();
    g.fillStyle = "#ffd23f"; g.beginPath(); g.ellipse(250, 170, 8, 27, 0, 0, 7); g.fill();
    g.strokeStyle = "#5a3a20"; g.lineWidth = 0.8; g.beginPath(); g.moveTo(236, 190); g.lineTo(246, 207); g.moveTo(264, 190); g.lineTo(254, 207); g.stroke();
    g.fillStyle = "#6b4423"; g.fillRect(245, 206, 10, 7);
    // Vögel
    g.strokeStyle = "#2c3346"; g.lineWidth = 1.4;
    [[880, 150], [900, 140], [915, 156], [560, 110]].forEach(([vx, vy]) => { g.beginPath(); g.moveTo(vx - 6, vy); g.quadraticCurveTo(vx - 3, vy - 4, vx, vy); g.quadraticCurveTo(vx + 3, vy - 4, vx + 6, vy); g.stroke(); });
    // Ferne Hügel
    const huegel = (y, amp, farbe, f) => {
      g.fillStyle = farbe; g.beginPath(); g.moveTo(0, H);
      for (let x = 0; x <= W; x += 10) g.lineTo(x, y - amp * (0.6 * Math.sin(x / (170 * f) + f) + 0.4 * Math.sin(x / (63 * f) + 2 * f)));
      g.lineTo(W, H); g.fill();
    };
    huegel(430, 40, "#8ea6c4", 1.3);
    huegel(470, 34, "#6f8f86", 0.9);
    // Burgberg mit Weinreben
    g.fillStyle = "#6c8a3a"; g.beginPath(); g.moveTo(420, 620); g.quadraticCurveTo(620, 330, 770, 352); g.quadraticCurveTo(930, 340, 1200, 560); g.lineTo(1200, H); g.lineTo(420, H); g.fill();
    g.save(); g.clip();
    g.strokeStyle = "rgba(60,80,30,.55)"; g.lineWidth = 2;
    for (let i = 0; i < 40; i++) { const y = 360 + i * 9; g.beginPath(); g.moveTo(440, y + 160); g.quadraticCurveTo(780, y - 30, 1200, y + 120); g.stroke(); }
    g.fillStyle = "rgba(160,60,40,.35)";
    for (let i = 0; i < 400; i++) { g.beginPath(); g.arc(470 + z() * 730, 380 + z() * 300, 1.6, 0, 7); g.fill(); }
    g.restore();
    // Burg
    const [bx, by] = ZIEL;
    g.fillStyle = "#c9b79a"; g.fillRect(bx - 70, by - 10, 140, 46);
    g.fillStyle = "#b5a283"; g.fillRect(bx - 20, by - 70, 34, 106);
    g.fillStyle = "#d8c7a8"; g.fillRect(bx - 66, by - 40, 22, 76); g.fillRect(bx + 40, by - 30, 24, 66);
    g.fillStyle = "#8c3b2e";
    [[bx - 3, by - 70, 22], [bx - 55, by - 40, 15], [bx + 52, by - 30, 16]].forEach(([tx, ty, s]) => { g.beginPath(); g.moveTo(tx - s, ty); g.lineTo(tx, ty - s * 1.6); g.lineTo(tx + s, ty); g.fill(); });
    g.fillStyle = "#c9b79a"; for (let k = 0; k < 7; k++) g.fillRect(bx - 70 + k * 21, by - 16, 11, 7);
    g.fillStyle = "#3a2f28"; [[bx - 8, by - 52], [bx + 2, by - 52], [bx - 3, by - 30], [bx - 59, by - 20], [bx + 48, by - 10], [bx + 20, by + 8], [bx - 34, by + 8]].forEach(([fx, fy]) => g.fillRect(fx, fy, 4, 7));
    g.fillStyle = "#4a3426"; g.beginPath(); g.arc(bx + 2, by + 36, 8, Math.PI, 0); g.fill();
    g.strokeStyle = "#3a2f28"; g.lineWidth = 1; g.beginPath(); g.moveTo(bx - 3, by - 104); g.lineTo(bx - 3, by - 124); g.stroke();
    g.fillStyle = "#8b5cf6"; g.beginPath(); g.moveTo(bx - 3, by - 124); g.lineTo(bx + 9, by - 120); g.lineTo(bx - 3, by - 116); g.fill();
    // Bäume
    const baum = (x, y, s, farbe = "#3f6a2e") => {
      g.fillStyle = "#4a3020"; g.fillRect(x - s * 0.08, y - s * 0.6, s * 0.16, s * 0.6);
      g.fillStyle = farbe; g.beginPath(); g.arc(x, y - s * 0.9, s * 0.5, 0, 7); g.fill();
      g.fillStyle = "rgba(255,255,255,.12)"; g.beginPath(); g.arc(x - s * 0.15, y - s * 1.05, s * 0.22, 0, 7); g.fill();
    };
    [[470, 560, 50], [530, 520, 40], [1000, 450, 46], [1080, 500, 52], [660, 400, 22], [880, 380, 20]].forEach(([x, y, s]) => baum(x, y, s));
    // Dorf im Tal
    const haus = (x, y, s, dach) => {
      g.fillStyle = "#efe6d6"; g.fillRect(x, y, s, s * 0.7);
      g.fillStyle = dach; g.beginPath(); g.moveTo(x - 3, y); g.lineTo(x + s / 2, y - s * 0.5); g.lineTo(x + s + 3, y); g.fill();
      g.fillStyle = "#5a7aa0"; g.fillRect(x + s * 0.2, y + s * 0.2, s * 0.18, s * 0.18); g.fillRect(x + s * 0.6, y + s * 0.2, s * 0.18, s * 0.18);
    };
    for (let i = 0; i < 9; i++) haus(80 + i * 42 + z() * 10, 600 - (i % 3) * 14, 30 + z() * 10, i % 2 ? "#a84a32" : "#7a3a2a");
    // Wiese im Vordergrund mit Bank und Blumen
    const wiese = g.createLinearGradient(0, 620, 0, H);
    wiese.addColorStop(0, "#7da34a"); wiese.addColorStop(1, "#4d7a2c");
    g.fillStyle = wiese; g.beginPath(); g.moveTo(0, 650); g.quadraticCurveTo(600, 600, 1200, 660); g.lineTo(1200, H); g.lineTo(0, H); g.fill();
    for (let i = 0; i < 160; i++) {
      g.fillStyle = ["#ffd23f", "#ffffff", "#e0484f", "#b78cff"][i % 4];
      g.beginPath(); g.arc(z() * W, 670 + z() * 130, 2 + z() * 2, 0, 7); g.fill();
    }
    g.fillStyle = "#6b4423"; g.fillRect(120, 700, 130, 10); g.fillRect(120, 684, 130, 8); g.fillRect(128, 710, 8, 30); g.fillRect(234, 710, 8, 30);
    baum(60, 760, 140, "#2f5a24");
  };

  // Hintergrund der Übersichtskarte einmal zeichnen
  const malMini = () => { landschaft(vorbereiten(mini, W, H)); };

  const anwenden = () => {
    const mm = Number(regler.value), zoom = mm / 24;
    const vb = W / zoom, vh = H / zoom;
    const cx = klemmen(ZIEL[0], vb / 2, W - vb / 2), cy = klemmen(ZIEL[1] - 35, vh / 2, H - vh / 2);
    const g = bild.getContext("2d"), sx = bild.width / vb, sy = bild.height / vh;
    g.setTransform(sx, 0, 0, sy, -(cx - vb / 2) * sx, -(cy - vh / 2) * sy);
    landschaft(g);
    // Übersicht: Rahmen zeigt den Ausschnitt
    Object.assign(rahmen.style, { left: ((cx - vb / 2) / W) * 100 + "%", top: ((cy - vh / 2) / H) * 100 + "%", width: (vb / W) * 100 + "%", height: (vh / H) * 100 + "%" });
    const winkel = (2 * Math.atan(43.27 / (2 * mm)) * 180) / Math.PI;
    const typ = mm < 35 ? "Weitwinkel" : mm < 60 ? "Normal" : mm < 85 ? "Leichtes Tele" : "Tele";
    document.getElementById("o-mm").textContent = mm + " mm";
    document.getElementById("z-hud-mm").textContent = mm + " mm";
    document.getElementById("z-hud-winkel").textContent = Math.round(winkel) + "°";
    document.getElementById("z-winkel").textContent = Math.round(winkel) + "°";
    document.getElementById("z-faktor").textContent = zahl(zoom) + "×";
    document.getElementById("z-typ").textContent = typ;
    regler.setAttribute("aria-valuetext", `${mm} Millimeter, Bildwinkel ${Math.round(winkel)} Grad, ${typ}`);
    document.getElementById("z-text").textContent =
      mm < 30 ? "Weitwinkel: die ganze Landschaft mit Himmel, Dorf und Wiese. Die Burg ist nur ein kleiner Punkt am Horizont."
      : mm < 45 ? "Leichter Weitwinkel: noch viel Umgebung, aber das Motiv rückt in den Blick. Klassisch für Reportage und Straße."
      : mm < 60 ? "Normalbrennweite: wirkt natürlich, ungefähr so, wie du die Szene ohne Kamera wahrnimmst."
      : mm < 85 ? "Leichtes Tele: Der Weinberg füllt das Bild, der Hintergrund rückt näher heran."
      : "Tele: Die Burg wird zum Hauptmotiv, jetzt siehst du Fenster und Fahne. Mein FE 85 mm ist genau für solche Ausschnitte und für Porträts gemacht.";
  };
  regler.addEventListener("input", anwenden);
  // Marken unter dem Regler an die richtigen Stellen setzen
  document.querySelectorAll(".mm-marken span").forEach((s) => (s.style.left = ((Number(s.textContent) - 24) / 81) * 100 + "%"));
  beiGroesse(bild, () => {
    const r = bild.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    bild.width = Math.round(r.width * dpr); bild.height = Math.round(r.height * dpr);
    malMini(); anwenden();
  });
})();

/* ---------- Kapitel 3: Farbkreis ---------- */
const hsl2hex = (h, s, l) => {
  s /= 100; l /= 100;
  const f = (n) => { const k = (n + h / 30) % 12, c = l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return Math.round(c * 255).toString(16).padStart(2, "0"); };
  return "#" + f(0) + f(8) + f(4);
};
const farbname = (h) => {
  h = ((h % 360) + 360) % 360;
  return h < 10 ? "Rot" : h < 25 ? "Rotorange" : h < 45 ? "Orange" : h < 65 ? "Gelb" : h < 90 ? "Gelbgrün" : h < 150 ? "Grün" : h < 180 ? "Türkis" : h < 200 ? "Cyan" : h < 245 ? "Blau" : h < 275 ? "Violett" : h < 310 ? "Lila" : h < 340 ? "Magenta" : "Rot";
};
(() => {
  const kreis = document.getElementById("f-kreis");
  if (!kreis) return;
  const g = kreis.getContext("2d"), S = kreis.width, M = S / 2, RA = S * 0.46, RI = S * 0.27;
  const ARTEN = {
    komplementaer: { v: [0, 180], text: "Gegenüberliegende Farben: maximaler Kontrast, kräftig und lebendig. Der Klassiker ist Orange mit Blau, etwa bei einem Sonnenuntergang über Wasser." },
    analog: { v: [-30, 0, 30], text: "Nachbarn im Farbkreis: harmonisch und ruhig. So wirken Herbstwälder oder ein Abendhimmel aus Rot, Orange und Gelb." },
    triade: { v: [0, 120, 240], text: "Drei gleichmäßig verteilte Farben: bunt und verspielt, aber ausgewogen. Am besten lässt du eine davon dominieren." },
    split: { v: [0, 150, 210], text: "Eine Farbe plus die beiden Nachbarn ihrer Gegenfarbe: fast so viel Kontrast wie komplementär, aber weniger hart." },
  };
  let ton = 25, art = "komplementaer";
  const punkt = (h, r) => { const a = ((h - 90) * Math.PI) / 180; return [M + Math.cos(a) * r, M + Math.sin(a) * r]; };

  const malen = () => {
    g.clearRect(0, 0, S, S);
    for (let h = 0; h < 360; h += 1) {
      const a0 = ((h - 90.6) * Math.PI) / 180, a1 = ((h - 89.2) * Math.PI) / 180;
      g.fillStyle = `hsl(${h},85%,55%)`;
      g.beginPath(); g.arc(M, M, RA, a0, a1); g.arc(M, M, RI, a1, a0, true); g.fill();
    }
    const toene = ARTEN[art].v.map((d) => (ton + d + 360) % 360);
    g.strokeStyle = "rgba(255,255,255,.85)"; g.lineWidth = 3;
    g.beginPath(); toene.forEach((h, i) => { const [x, y] = punkt(h, (RA + RI) / 2); i ? g.lineTo(x, y) : g.moveTo(x, y); });
    if (toene.length > 2) g.closePath();
    g.stroke();
    toene.forEach((h, i) => {
      const [x, y] = punkt(h, (RA + RI) / 2), gross = h === ton;
      g.fillStyle = `hsl(${h},85%,55%)`; g.strokeStyle = "#fff"; g.lineWidth = gross ? 6 : 4;
      g.beginPath(); g.arc(x, y, gross ? 24 : 16, 0, 7); g.fill(); g.stroke();
    });
    g.fillStyle = hsl2hex(ton, 85, 55);
    g.beginPath(); g.arc(M, M, RI - 18, 0, 7); g.fill();
    g.fillStyle = "rgba(0,0,0,.55)"; g.font = `700 ${S * 0.05}px Figtree, Arial, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(farbname(ton), M, M - S * 0.03);
    g.font = `500 ${S * 0.035}px "JetBrains Mono", monospace`; g.fillText(hsl2hex(ton, 85, 55).toUpperCase(), M, M + S * 0.035);

    document.getElementById("f-text").textContent = ARTEN[art].text;
    document.getElementById("f-palette").innerHTML = toene.map((h) => `<div class="farbfeld"><i style="background:${hsl2hex(h, 85, 55)}"></i><b>${farbname(h)}</b><span>${hsl2hex(h, 85, 55).toUpperCase()}</span></div>`).join("");
    const bsp = document.getElementById("f-beispiel").children, c = toene, dritte = c[2] ?? (c[1] + 25) % 360;
    bsp[0].style.background = `linear-gradient(${hsl2hex(c[0], 55, 22)}, ${hsl2hex(c[0], 60, 45)})`;
    bsp[1].style.background = hsl2hex(c[1], 90, 60);
    bsp[2].style.background = hsl2hex(dritte, 45, 30);
    bsp[3].style.background = hsl2hex(c[1], 80, 70);
    kreis.setAttribute("aria-valuenow", Math.round(ton));
    kreis.setAttribute("aria-valuetext", farbname(ton));
  };

  const ausZeiger = (e) => {
    const r = kreis.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * S - M, y = ((e.clientY - r.top) / r.height) * S - M;
    if (Math.hypot(x, y) < RI * 0.5) return;
    ton = (((Math.atan2(y, x) * 180) / Math.PI + 90) % 360 + 360) % 360;
    malen();
  };
  let ziehen = false;
  kreis.addEventListener("pointerdown", (e) => { ziehen = true; kreis.setPointerCapture(e.pointerId); ausZeiger(e); });
  kreis.addEventListener("pointermove", (e) => ziehen && ausZeiger(e));
  kreis.addEventListener("pointerup", () => (ziehen = false));
  kreis.addEventListener("keydown", (e) => {
    const d = { ArrowRight: 5, ArrowUp: 5, ArrowLeft: -5, ArrowDown: -5 }[e.key];
    if (!d) return;
    e.preventDefault(); ton = (ton + d + 360) % 360; malen();
  });
  document.querySelectorAll("#f-arten button").forEach((b) => b.addEventListener("click", () => {
    art = b.dataset.art;
    document.querySelectorAll("#f-arten button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    malen();
  }));
  document.fonts?.ready.then(malen);
  malen();
})();

/* ---------- Kapitel 3: Weißabgleich ---------- */
(() => {
  const bild = document.getElementById("wb-bild");
  if (!bild) return;
  const regler = document.getElementById("r-wb"), W = 600, H = 400;
  let basis = null;
  // Farbe einer Lichtquelle mit Temperatur k (Näherung nach Tanner Helland)
  const kelvin = (k) => {
    const t = k / 100;
    const r = t <= 66 ? 255 : 329.7 * Math.pow(t - 60, -0.1332);
    const gr = t <= 66 ? 99.47 * Math.log(t) - 161.12 : 288.12 * Math.pow(t - 60, -0.0755);
    const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.52 * Math.log(t - 10) - 305.04;
    return [r, gr, b].map((v) => klemmen(v, 1, 255));
  };

  // Stillleben bei Tageslicht: weiße Tasse, Graukarte, Pflanze, Holztisch
  const malBasis = () => {
    const c = document.createElement("canvas"), r = bild.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr);
    const g = c.getContext("2d");
    g.setTransform(c.width / W, 0, 0, c.height / H, 0, 0);
    const wand = g.createLinearGradient(0, 0, W, 0);
    wand.addColorStop(0, "#f2f2f0"); wand.addColorStop(1, "#bdbdbb");
    g.fillStyle = wand; g.fillRect(0, 0, W, 270);
    g.fillStyle = "rgba(255,255,255,.6)"; g.beginPath(); g.moveTo(40, 0); g.lineTo(200, 0); g.lineTo(330, 270); g.lineTo(130, 270); g.fill();
    const tisch = g.createLinearGradient(0, 270, 0, H);
    tisch.addColorStop(0, "#b98a5e"); tisch.addColorStop(1, "#7c5636");
    g.fillStyle = tisch; g.fillRect(0, 270, W, H - 270);
    g.strokeStyle = "rgba(90,55,30,.35)"; g.lineWidth = 2;
    for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(0, 285 + i * 14); g.bezierCurveTo(200, 280 + i * 15, 400, 292 + i * 13, W, 284 + i * 14); g.stroke(); }
    // Graukarte
    g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(392, 150, 120, 160);
    g.fillStyle = "#777777"; g.fillRect(386, 142, 120, 160);
    g.fillStyle = "#ffffff"; g.font = "700 16px Figtree, Arial, sans-serif"; g.textAlign = "center"; g.fillText("GRAUKARTE", 446, 218); g.font = "500 13px Figtree, Arial, sans-serif"; g.fillText("18 %", 446, 238);
    // Pflanze
    g.fillStyle = "#e9e4dc"; g.beginPath(); g.moveTo(60, 230); g.lineTo(130, 230); g.lineTo(120, 300); g.lineTo(70, 300); g.fill();
    g.fillStyle = "#3f7a3a";
    for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * 0.28; g.save(); g.translate(95, 230); g.rotate(a); g.beginPath(); g.ellipse(0, -38, 11, 40, 0, 0, 7); g.fill(); g.restore(); }
    // Tasse
    g.fillStyle = "rgba(0,0,0,.18)"; g.beginPath(); g.ellipse(250, 330, 80, 14, 0, 0, 7); g.fill();
    const tasse = g.createLinearGradient(180, 0, 320, 0);
    tasse.addColorStop(0, "#ffffff"); tasse.addColorStop(0.7, "#f1f1f1"); tasse.addColorStop(1, "#cfcfcf");
    g.fillStyle = tasse; g.beginPath(); g.moveTo(185, 230); g.lineTo(315, 230); g.quadraticCurveTo(312, 320, 280, 330); g.lineTo(220, 330); g.quadraticCurveTo(188, 320, 185, 230); g.fill();
    g.strokeStyle = "#e6e6e6"; g.lineWidth = 12; g.beginPath(); g.arc(325, 268, 24, -1.2, 1.3); g.stroke();
    g.fillStyle = "#ececec"; g.beginPath(); g.ellipse(250, 230, 65, 12, 0, 0, 7); g.fill();
    g.fillStyle = "#5a3418"; g.beginPath(); g.ellipse(250, 232, 57, 9, 0, 0, 7); g.fill();
    // Orange als Farbbezug
    g.fillStyle = "#f08a24"; g.beginPath(); g.arc(560, 320, 26, 0, 7); g.fill();
    g.fillStyle = "rgba(255,255,255,.35)"; g.beginPath(); g.arc(552, 312, 8, 0, 7); g.fill();
    basis = g.getImageData(0, 0, c.width, c.height);
    bild.width = c.width; bild.height = c.height;
  };

  const anwenden = () => {
    const k = Number(regler.value);
    if (!basis) return;
    // Licht ist Tageslicht (5500 K); die Kamera rechnet die eingestellte Temperatur heraus
    const licht = kelvin(5500), annahme = kelvin(k);
    let gain = licht.map((v, i) => klemmen(v / annahme[i], 0.25, 4));
    const lum = gain[0] * 0.3 + gain[1] * 0.59 + gain[2] * 0.11;
    gain = gain.map((v) => v / lum);
    const aus = new ImageData(new Uint8ClampedArray(basis.data), basis.width, basis.height), d = aus.data;
    for (let i = 0; i < d.length; i += 4) { d[i] *= gain[0]; d[i + 1] *= gain[1]; d[i + 2] *= gain[2]; }
    bild.getContext("2d").putImageData(aus, 0, 0);
    document.getElementById("o-wb").textContent = k + " K";
    document.getElementById("wb-hud").textContent = k + " K";
    regler.setAttribute("aria-valuetext", k + " Kelvin");
    document.getElementById("wb-text").textContent =
      k < 3300 ? "Viel zu niedrig für Tageslicht: Die Kamera erwartet Kerzen- oder Glühbirnenlicht und rechnet Orange heraus. Das Bild wird kräftig blau."
      : k < 4800 ? "Etwas zu niedrig: Das Bild wirkt kühl und leicht bläulich."
      : k <= 6200 ? "Passt zum Licht: Die Tasse ist weiß und die Graukarte neutral grau."
      : k <= 7800 ? "Etwas zu hoch: wärmer, goldener Look. Manchmal gewollt, zum Beispiel für Porträts."
      : "Viel zu hoch: kräftiger Orangestich, als hätte die Kamera Schattenlicht erwartet.";
    document.querySelectorAll(".wb-labor .vorlagen button").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.k) === k)));
  };
  regler.addEventListener("input", anwenden);
  document.querySelectorAll(".wb-labor .vorlagen button").forEach((b) => b.addEventListener("click", () => { regler.value = b.dataset.k; anwenden(); }));
  beiGroesse(bild, () => { malBasis(); anwenden(); });
})();

/* ---------- Kapitel 3: Meine Fotos nach Farbe (erscheint, sobald es Galerie-Fotos gibt) ---------- */
(() => {
  const box = document.getElementById("f-fotos");
  if (!box) return;
  const GRUPPEN = [["rot", "Rot", "#e8364f"], ["orange", "Orange", "#f08a24"], ["gelb", "Gelb", "#f2c230"], ["gruen", "Grün", "#3ca55c"], ["tuerkis", "Türkis", "#22b5b0"], ["blau", "Blau", "#3a7be0"], ["lila", "Lila", "#8b5cf6"], ["pink", "Pink", "#e04aa8"], ["neutral", "Schwarzweiß", "#9a9a9a"]];
  const gruppeVon = (h) => h < 15 || h >= 340 ? "rot" : h < 45 ? "orange" : h < 70 ? "gelb" : h < 160 ? "gruen" : h < 195 ? "tuerkis" : h < 255 ? "blau" : h < 295 ? "lila" : "pink";
  const url = (ordner, f) => ordner + "/" + encodeURIComponent(f.datei) + "?v=" + (f.sha || "").slice(0, 8);

  // Hauptfarbe eines Fotos: Farbtöne gewichtet nach Sättigung und Helligkeit
  const analysieren = (img) => {
    const c = document.createElement("canvas"); c.width = c.height = 40;
    const g = c.getContext("2d"); g.drawImage(img, 0, 0, 40, 40);
    const d = g.getImageData(0, 0, 40, 40).data, summe = {};
    let bunt = 0;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i] / 255, gr = d[i + 1] / 255, b = d[i + 2] / 255, max = Math.max(r, gr, b), min = Math.min(r, gr, b), s = max ? (max - min) / max : 0;
      if (s < 0.22 || max < 0.15) continue;
      let h = max === r ? ((gr - b) / (max - min)) % 6 : max === gr ? (b - r) / (max - min) + 2 : (r - gr) / (max - min) + 4;
      h = (h * 60 + 360) % 360;
      const gw = s * max;
      bunt += gw;
      summe[gruppeVon(h)] = (summe[gruppeVon(h)] || 0) + gw;
    }
    if (bunt < 40) return "neutral";
    return Object.entries(summe).sort((a, b) => b[1] - a[1])[0][0];
  };

  fetch("gallery.json", { cache: "no-cache" }).then((r) => (r.ok ? r.json() : [])).catch(() => []).then(async (liste) => {
    const fotos = (Array.isArray(liste) ? liste : []).filter((f) => f && f.datei).slice(0, 60);
    if (!fotos.length) return;
    const ergebnisse = await Promise.all(fotos.map((f) => new Promise((fertig) => {
      const img = new Image();
      img.onload = () => { try { fertig({ f, gruppe: analysieren(img) }); } catch (e) { fertig(null); } };
      img.onerror = () => fertig(null);
      img.src = url("vorschau", f);
    })));
    const da = ergebnisse.filter(Boolean);
    if (!da.length) return;
    box.hidden = false;
    const chips = document.getElementById("f-chips"), raster = document.getElementById("f-raster");
    const zeigen = (gruppe) => {
      raster.innerHTML = "";
      da.filter((e) => gruppe === "alle" || e.gruppe === gruppe).forEach(({ f }) => {
        const a = document.createElement("a"), img = document.createElement("img");
        a.href = url("fotos", f); a.target = "_blank"; a.rel = "noopener";
        img.src = url("vorschau", f); img.alt = f.titel || ""; img.loading = "lazy";
        a.append(img); raster.append(a);
      });
      chips.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.g === gruppe)));
    };
    const knopf = (g, name, farbe, anzahl) => {
      const b = document.createElement("button");
      b.type = "button"; b.dataset.g = g;
      b.innerHTML = `<i style="background:${farbe}"></i>${name} <span>${anzahl}</span>`;
      b.addEventListener("click", () => zeigen(g));
      chips.append(b);
    };
    knopf("alle", "Alle", "conic-gradient(#e8364f,#f2c230,#3ca55c,#3a7be0,#8b5cf6,#e8364f)", da.length);
    GRUPPEN.forEach(([g, name, farbe]) => { const n = da.filter((e) => e.gruppe === g).length; if (n) knopf(g, name, farbe, n); });
    zeigen("alle");
  });
})();

/* ---------- Kapitel 4: Bildgestaltung ---------- */
(() => {
  const bild = document.getElementById("g-bild");
  if (!bild) return;
  const gitter = document.getElementById("g-raster"), rH = document.getElementById("r-horizont"), rN = document.getElementById("r-neigung");
  const W = 600, H = 400;
  let baum = { x: 300, y: 330 }, art = "drittel";
  const horizont = () => (Number(rH.value) / 100) * H;
  const groesse = () => 150 * (0.45 + 0.55 * klemmen((baum.y - horizont()) / (H - horizont()), 0, 1));
  const krone = () => [baum.x, baum.y - groesse() * 0.72];

  const malen = () => {
    const g = bild.getContext("2d"), s = bild.width / W, hy = horizont(), neig = (Number(rN.value) * Math.PI) / 180, z = rng(3);
    g.setTransform(s, 0, 0, s, 0, 0);
    g.clearRect(0, 0, W, H);
    g.save();
    g.translate(W / 2, H / 2); g.rotate(neig); g.scale(1 + Math.abs(neig) * 1.6, 1 + Math.abs(neig) * 1.6); g.translate(-W / 2, -H / 2);
    const himmel = g.createLinearGradient(0, -60, 0, hy);
    himmel.addColorStop(0, "#4f86d4"); himmel.addColorStop(1, "#f4dcae");
    g.fillStyle = himmel; g.fillRect(-100, -100, W + 200, hy + 100);
    const sonne = g.createRadialGradient(140, hy - 70, 2, 140, hy - 70, 70);
    sonne.addColorStop(0, "rgba(255,248,220,1)"); sonne.addColorStop(0.2, "rgba(255,232,170,.8)"); sonne.addColorStop(1, "rgba(255,220,150,0)");
    g.fillStyle = sonne; g.fillRect(-100, -100, W + 200, hy + 100);
    for (let i = 0; i < 6; i++) {
      const wx = z() * W, wy = 20 + z() * Math.max(10, hy - 90);
      g.fillStyle = "rgba(255,255,255,.7)";
      for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(wx + k * 18, wy + Math.sin(k * 2) * 4, 24, 10, 0, 0, 7); g.fill(); }
    }
    g.fillStyle = "#7f9a7a"; g.beginPath(); g.moveTo(-100, hy + 2);
    for (let x = -100; x <= W + 100; x += 10) g.lineTo(x, hy - 10 - 8 * Math.sin(x / 60) - 5 * Math.sin(x / 23));
    g.lineTo(W + 100, hy + 2); g.fill();
    const feld = g.createLinearGradient(0, hy, 0, H);
    feld.addColorStop(0, "#9fbf5f"); feld.addColorStop(1, "#4e7d2c");
    g.fillStyle = feld; g.fillRect(-100, hy, W + 200, H - hy + 100);
    // Ackerfurchen laufen zum Fluchtpunkt
    g.strokeStyle = "rgba(60,90,30,.25)"; g.lineWidth = 1.5;
    for (let i = -12; i <= 12; i++) { g.beginPath(); g.moveTo(W / 2 + i * 6, hy); g.lineTo(W / 2 + i * 90, H + 60); g.stroke(); }
    // Weg als führende Linie, endet am Baum
    const bx = baum.x, by = baum.y;
    g.fillStyle = "#d8bf8a";
    g.beginPath(); g.moveTo(W / 2 - 70, H + 20);
    g.quadraticCurveTo(W / 2 - 40, (by + H) / 2, bx - 6, by + 2); g.lineTo(bx + 6, by + 2);
    g.quadraticCurveTo(W / 2 + 40, (by + H) / 2, W / 2 + 70, H + 20); g.fill();
    // Baum
    const h = groesse();
    g.fillStyle = "rgba(0,0,0,.18)"; g.beginPath(); g.ellipse(bx + h * 0.15, by + 2, h * 0.32, h * 0.05, 0, 0, 7); g.fill();
    g.fillStyle = "#5a3a22"; g.fillRect(bx - h * 0.045, by - h * 0.5, h * 0.09, h * 0.5);
    [[0, 0.72, 0.36, "#3f7a2e"], [-0.2, 0.6, 0.24, "#4a8a36"], [0.22, 0.62, 0.25, "#3a7029"], [0.05, 0.9, 0.24, "#58994a"]].forEach(([dx, dy, r, f]) => {
      g.fillStyle = f; g.beginPath(); g.arc(bx + dx * h, by - dy * h, r * h, 0, 7); g.fill();
    });
    g.restore();
    malGitter();
    bewerten();
  };

  const malGitter = () => {
    const g = gitter.getContext("2d"), s = gitter.width / W;
    g.setTransform(s, 0, 0, s, 0, 0); g.clearRect(0, 0, W, H);
    const teile = art === "drittel" ? [1 / 3, 2 / 3] : art === "gold" ? [0.382, 0.618] : art === "mitte" ? [0.5] : [];
    g.strokeStyle = "rgba(255,255,255,.75)"; g.lineWidth = 1.5; g.setLineDash(art === "gold" ? [6, 5] : []);
    teile.forEach((t) => { g.beginPath(); g.moveTo(t * W, 0); g.lineTo(t * W, H); g.moveTo(0, t * H); g.lineTo(W, t * H); g.stroke(); });
    if (art === "drittel" || art === "gold") {
      g.fillStyle = "rgba(255,255,255,.9)";
      teile.forEach((a) => teile.forEach((b) => { g.beginPath(); g.arc(a * W, b * H, 4, 0, 7); g.fill(); }));
    }
  };

  const bewerten = () => {
    const hp = horizont() / H, n = Number(rN.value), [cx, cy] = krone(), aus = [];
    const nahX = Math.min(Math.abs(cx - W / 3), Math.abs(cx - (2 * W) / 3)) < 30;
    const nahY = Math.min(Math.abs(cy - H / 3), Math.abs(cy - (2 * H) / 3)) < 30;
    if (Math.abs(cx - W / 2) < 30) aus.push(["mittel", "Der Baum steht genau in der Mitte. Das wirkt ruhig, aber oft statisch. Schieb ihn auf eine Drittellinie."]);
    else if (nahX && nahY) aus.push(["gut", "Der Baum sitzt auf einem Drittelpunkt. Das Auge findet ihn sofort, das Bild wirkt lebendig."]);
    else if (nahX) aus.push(["gut", "Der Baum steht auf einer senkrechten Drittellinie. Gut so!"]);
    else if (cx < 70 || cx > W - 70) aus.push(["schlecht", "Der Baum klebt am Rand und zieht den Blick aus dem Bild."]);
    else aus.push(["mittel", "Der Baum steht etwas zufällig. Probier eine Drittellinie aus."]);
    if (Math.abs(hp - 0.5) < 0.06) aus.push(["mittel", "Der Horizont teilt das Bild in zwei gleiche Hälften. Entscheide dich: mehr Himmel oder mehr Land?"]);
    else if (Math.abs(hp - 1 / 3) < 0.05) aus.push(["gut", "Horizont im oberen Drittel: Land, Weg und Baum bekommen die Bühne."]);
    else if (Math.abs(hp - 2 / 3) < 0.05) aus.push(["gut", "Horizont im unteren Drittel: Der Himmel wird zum Hauptdarsteller."]);
    else aus.push(["mittel", hp < 0.3 ? "Sehr wenig Himmel: wirkt eng, passt nur bei spannendem Vordergrund." : hp > 0.7 ? "Sehr viel Himmel: lohnt sich nur bei dramatischen Wolken." : "Der Horizont liegt zwischen Mitte und Drittel. Schieb ihn noch ein Stück."]);
    if (Math.abs(n) >= 1) aus.push(["schlecht", `Der Horizont ist um ${zahl(Math.abs(n))}° schief. Das fällt sofort auf und wirkt wie ein Versehen.`]);
    else if (n !== 0) aus.push(["mittel", "Fast gerade. Ein halbes Grad sieht man kaum, ganz gerade ist trotzdem besser."]);
    else aus.push(["gut", "Der Horizont ist gerade."]);
    aus.push(["gut", "Der Weg führt als Linie direkt zum Baum. Das gibt Tiefe."]);
    document.getElementById("g-bewertung").innerHTML = aus.map(([k, t]) => `<li class="${k}"><i aria-hidden="true">${k === "gut" ? "✓" : k === "mittel" ? "~" : "✕"}</i><span>${t}</span></li>`).join("");
    const p = Math.round(hp * 100);
    document.getElementById("o-horizont").textContent = Math.abs(p - 50) <= 2 ? "Mitte" : p < 50 ? "oben" : "unten";
    document.getElementById("o-neigung").textContent = zahl(n, Number.isInteger(n) ? 0 : 1) + "°";
    rH.setAttribute("aria-valuetext", p + " Prozent von oben");
    rN.setAttribute("aria-valuetext", zahl(n, 1) + " Grad");
  };

  const setzen = (x, y) => {
    baum.x = klemmen(x, 30, W - 30);
    baum.y = klemmen(y, horizont() + 12, H - 8);
    malen();
  };
  const logisch = (e) => { const r = bild.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]; };
  let ziehen = false;
  bild.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") return; ziehen = true; bild.setPointerCapture(e.pointerId); setzen(...logisch(e)); });
  bild.addEventListener("pointermove", (e) => ziehen && setzen(...logisch(e)));
  bild.addEventListener("pointerup", () => (ziehen = false));
  bild.addEventListener("click", (e) => { if (e.pointerType !== "mouse") setzen(...logisch(e)); });
  bild.addEventListener("keydown", (e) => {
    const d = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] }[e.key];
    if (!d) return;
    e.preventDefault(); setzen(baum.x + d[0], baum.y + d[1]);
  });
  [rH, rN].forEach((r) => r.addEventListener("input", () => { baum.y = klemmen(baum.y, horizont() + 12, H - 8); malen(); }));
  document.querySelectorAll("#g-raster-art button").forEach((b) => b.addEventListener("click", () => {
    art = b.dataset.r;
    document.querySelectorAll("#g-raster-art button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    malGitter();
  }));
  // Gute Lösung: Baum auf Drittelpunkt, Horizont im oberen Drittel, gerade
  document.getElementById("g-loesung").addEventListener("click", () => {
    const start = { x: baum.x, y: baum.y, h: Number(rH.value), n: Number(rN.value) }, ziel = { x: 400, y: 360, h: 33, n: 0 }, t0 = performance.now();
    const schritt = (t) => {
      const f = ruhig ? 1 : klemmen((t - t0) / 700, 0, 1), e = f * f * (3 - 2 * f);
      rH.value = Math.round(start.h + (ziel.h - start.h) * e);
      rN.value = Math.round((start.n + (ziel.n - start.n) * e) * 2) / 2;
      baum.x = start.x + (ziel.x - start.x) * e; baum.y = start.y + (ziel.y - start.y) * e;
      malen();
      if (f < 1) requestAnimationFrame(schritt);
    };
    requestAnimationFrame(schritt);
  });
  beiGroesse(bild, () => {
    const r = bild.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    [bild, gitter].forEach((c) => { c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr); });
    malen();
  });
})();

/* ---------- Kapitel 5: Licht und Goldene-Stunde-Rechner ---------- */
// Sonnenstand nach den Formeln von SunCalc (Vladimir Agafonkin, BSD-Lizenz), stark gekürzt
const sonne = (datum, lat, lon) => {
  const rad = Math.PI / 180, e = rad * 23.4397;
  const d = datum.valueOf() / 864e5 - 0.5 + 2440588 - 2451545;
  const M = rad * (357.5291 + 0.98560028 * d);
  const L = M + rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) + rad * 102.9372 + Math.PI;
  const dec = Math.asin(Math.sin(e) * Math.sin(L)), ra = Math.atan2(Math.sin(L) * Math.cos(e), Math.cos(L));
  const Hw = rad * (280.16 + 360.9856235 * d) - rad * -lon - ra, phi = rad * lat;
  const hoehe = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(Hw)) / rad;
  const azimut = (Math.atan2(Math.sin(Hw), Math.cos(Hw) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi)) / rad + 180 + 360) % 360;
  return { hoehe, azimut };
};
(() => {
  const bild = document.getElementById("l-bild");
  if (!bild) return;
  const rUhr = document.getElementById("r-uhr"), ort = document.getElementById("g-ort"), datum = document.getElementById("g-datum");
  const W = 600, H = 400, HOR = 268;
  const heute = new Date();
  datum.value = `${heute.getFullYear()}-${String(heute.getMonth() + 1).padStart(2, "0")}-${String(heute.getDate()).padStart(2, "0")}`;
  let lat = 49.1427, lon = 9.2109, tag = null, zeiten = null;

  const uhr = (t) => (t ? t.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "–");
  const spanne = ([a, b]) => (a && b ? `${uhr(a)} – ${uhr(b)}` : "–");
  const minuten = (t) => t.getHours() * 60 + t.getMinutes();
  const mitte = ([a, b]) => (a && b ? new Date((a.getTime() + b.getTime()) / 2) : null);
  const phase = (h) => h < -6 ? ["nacht", "Nacht"] : h < -4 ? ["blau", "Blaue Stunde"] : h < 6 ? ["gold", "Goldene Stunde"] : h < 35 ? ["tag", "Tag"] : ["mittag", "Mittagslicht"];
  const FARBE = { nacht: "#0b1030", blau: "#3557b8", gold: "#f2a54a", tag: "#9cc8ef", mittag: "#e2f0fb" };

  // Zeiten des Tages: Schwellen der Sonnenhöhe suchen (alle 2 Minuten, dann genau interpolieren)
  const berechnen = () => {
    const [j, m, t] = datum.value.split("-").map(Number);
    tag = new Date(j, m - 1, t);
    const proben = [];
    for (let i = 0; i <= 720; i++) { const z = new Date(j, m - 1, t, 0, i * 2); proben.push([z, sonne(z, lat, lon).hoehe]); }
    const kreuz = (grad, hoch) => {
      for (let i = 1; i < proben.length; i++) {
        const [t0, h0] = proben[i - 1], [t1, h1] = proben[i];
        if (hoch ? h0 < grad && h1 >= grad : h0 >= grad && h1 < grad) return new Date(t0.getTime() + ((grad - h0) / (h1 - h0)) * (t1 - t0));
      }
      return null;
    };
    const hoechst = proben.reduce((a, b) => (b[1] > a[1] ? b : a));
    zeiten = {
      "blau-m": [kreuz(-6, true), kreuz(-4, true)], "gold-m": [kreuz(-4, true), kreuz(6, true)], auf: kreuz(-0.833, true),
      unter: kreuz(-0.833, false), "gold-a": [kreuz(6, false), kreuz(-4, false)], "blau-a": [kreuz(-4, false), kreuz(-6, false)], mittag: hoechst[0],
    };
    document.getElementById("t-blau-m").textContent = spanne(zeiten["blau-m"]);
    document.getElementById("t-gold-m").textContent = spanne(zeiten["gold-m"]);
    document.getElementById("t-auf").textContent = uhr(zeiten.auf);
    document.getElementById("t-unter").textContent = uhr(zeiten.unter);
    document.getElementById("t-gold-a").textContent = spanne(zeiten["gold-a"]);
    document.getElementById("t-blau-a").textContent = spanne(zeiten["blau-a"]);
    // Farbiger Tagesbalken: Nacht, blaue und goldene Stunde, Tag
    const stopps = [];
    for (let i = 0; i <= 144; i++) { const z = new Date(j, m - 1, t, 0, i * 10); stopps.push(`${FARBE[phase(sonne(z, lat, lon).hoehe)[0]]} ${((i / 144) * 100).toFixed(2)}%`); }
    const verlauf = `linear-gradient(90deg, ${stopps.join(", ")})`;
    document.getElementById("g-balken").style.background = verlauf;
    document.getElementById("l-leiste").style.background = verlauf;
    document.querySelectorAll("#l-sprung button").forEach((b) => (b.disabled = !(b.dataset.p === "mittag" ? zeiten.mittag : mitte(zeiten[b.dataset.p]))));
  };

  // Farben von Himmel und Licht je nach Sonnenhöhe
  const STUFEN = [
    [-18, "#02030a", "#050818", "#0a0f26", "#151a33"], [-8, "#060a20", "#101a44", "#24336c", "#232d5c"],
    [-5, "#0d1a4e", "#26408c", "#5d74bd", "#46549a"], [-2, "#26306e", "#7d5590", "#ff9a62", "#b98a92"],
    [3, "#34508f", "#c47c75", "#ffbd6e", "#ffc48a"], [8, "#4777c0", "#a3c2e2", "#f6d7a2", "#ffe2b8"],
    [20, "#3d7ccd", "#8cc0ee", "#dcecf8", "#fff6ea"], [60, "#2f72ce", "#7fb6ec", "#d2e8f8", "#ffffff"],
  ];
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, f) => "#" + hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * f).toString(16).padStart(2, "0")).join("");
  const farben = (h) => {
    if (h <= STUFEN[0][0]) return STUFEN[0].slice(1);
    for (let i = 1; i < STUFEN.length; i++) if (h <= STUFEN[i][0]) {
      const f = (h - STUFEN[i - 1][0]) / (STUFEN[i][0] - STUFEN[i - 1][0]);
      return [1, 2, 3, 4].map((k) => mix(STUFEN[i - 1][k], STUFEN[i][k], f));
    }
    return STUFEN[STUFEN.length - 1].slice(1);
  };

  const malen = () => {
    if (!tag) return;
    const min = Number(rUhr.value), jetzt = new Date(tag.getFullYear(), tag.getMonth(), tag.getDate(), 0, min);
    const { hoehe, azimut } = sonne(jetzt, lat, lon), [oben, mittig, unten, licht] = farben(hoehe), z = rng(7);
    const g = bild.getContext("2d"), s = bild.width / W;
    g.setTransform(s, 0, 0, s, 0, 0);
    const himmel = g.createLinearGradient(0, 0, 0, HOR);
    himmel.addColorStop(0, oben); himmel.addColorStop(0.6, mittig); himmel.addColorStop(1, unten);
    g.fillStyle = himmel; g.fillRect(0, 0, W, HOR + 2);
    const sterne = klemmen((-hoehe - 6) / 6, 0, 1);
    if (sterne) for (let i = 0; i < 80; i++) { g.fillStyle = `rgba(255,255,255,${sterne * (0.3 + z() * 0.7)})`; g.fillRect(z() * W, z() * HOR * 0.8, 1.3, 1.3); }
    // Sonne: links Osten, Mitte Süden, rechts Westen
    const sx = W / 2 + (azimut - 180) * 3.1, sy = HOR - Math.min(hoehe, 40) * 6;
    if (hoehe > -3) {
      const warm = mix("#ff6a2a", "#fff8e2", klemmen(hoehe / 20, 0, 1));
      const glanz = g.createRadialGradient(sx, sy, 2, sx, sy, 130);
      glanz.addColorStop(0, warm + "cc"); glanz.addColorStop(1, warm + "00");
      g.fillStyle = glanz; g.fillRect(0, 0, W, HOR);
      g.fillStyle = warm; g.beginPath(); g.arc(sx, sy, 14, 0, 7); g.fill();
    }
    // Hügel und Wiese, eingefärbt mit der Lichtfarbe
    const tint = (f) => { const b = hex(licht); return "#" + hex(f).map((v, i) => Math.round((v * b[i]) / 255).toString(16).padStart(2, "0")).join(""); };
    const dunkel = klemmen((hoehe + 8) / 10, 0.12, 1);
    const dim = (f) => mix("#000000", f, dunkel);
    g.fillStyle = dim(tint("#7d93b5")); g.beginPath(); g.moveTo(0, HOR + 2);
    for (let x = 0; x <= W; x += 10) g.lineTo(x, HOR - 22 - 14 * Math.sin(x / 70) - 6 * Math.sin(x / 21));
    g.lineTo(W, HOR + 2); g.fill();
    g.fillStyle = dim(tint("#79a64a")); g.fillRect(0, HOR, W, H - HOR);
    g.fillStyle = dim(tint("#5e8f38")); g.beginPath(); g.moveTo(0, H); g.quadraticCurveTo(300, 330, W, H); g.fill();
    // Schatten (nur wenn die Sonne über dem Horizont steht)
    const objekte = [[140, 318, 70], [440, 330, 120]];
    if (hoehe > 0.5) {
      objekte.forEach(([ox, oy, oh]) => {
        const lang = klemmen(oh / Math.tan((hoehe * Math.PI) / 180), 0, 420) * 0.8, richtung = ox >= sx ? 1 : -1;
        g.fillStyle = `rgba(10,20,40,${0.15 + 0.25 * klemmen(hoehe / 35, 0, 1)})`;
        g.beginPath(); g.moveTo(ox - 14, oy); g.lineTo(ox + 14, oy);
        g.lineTo(ox + richtung * lang + 10, oy + lang * 0.08 + 6); g.lineTo(ox + richtung * lang - 10, oy + lang * 0.08 + 2); g.fill();
      });
    }
    // Haus
    const [hx, hyy] = objekte[0];
    g.fillStyle = dim(tint("#e9dcc6")); g.fillRect(hx - 40, hyy - 48, 80, 48);
    g.fillStyle = dim(tint("#9c3f2c")); g.beginPath(); g.moveTo(hx - 48, hyy - 46); g.lineTo(hx, hyy - 78); g.lineTo(hx + 48, hyy - 46); g.fill();
    const fenster = klemmen((-hoehe + 1) / 4, 0, 1);
    [[hx - 26, hyy - 36], [hx + 12, hyy - 36]].forEach(([fx, fy]) => {
      g.fillStyle = fenster ? mix(dim(tint("#5a7aa0")), "#ffd27a", fenster) : dim(tint("#5a7aa0"));
      g.fillRect(fx, fy, 14, 14);
      if (fenster > 0.3) { const l = g.createRadialGradient(fx + 7, fy + 7, 1, fx + 7, fy + 7, 30); l.addColorStop(0, `rgba(255,210,120,${fenster * 0.5})`); l.addColorStop(1, "rgba(255,210,120,0)"); g.fillStyle = l; g.fillRect(fx - 30, fy - 30, 74, 74); }
    });
    g.fillStyle = dim(tint("#6b4a30")); g.fillRect(hx - 6, hyy - 24, 12, 24);
    // Baum
    const [bx, by, bh] = objekte[1];
    g.fillStyle = dim(tint("#5a3a22")); g.fillRect(bx - 5, by - bh * 0.5, 10, bh * 0.5);
    [[0, 0.72, 0.36, "#3f7a2e"], [-0.2, 0.6, 0.24, "#4a8a36"], [0.22, 0.62, 0.25, "#3a7029"], [0.05, 0.9, 0.24, "#58994a"]].forEach(([dx, dy, r, f]) => {
      g.fillStyle = dim(tint(f)); g.beginPath(); g.arc(bx + dx * bh, by - dy * bh, r * bh, 0, 7); g.fill();
    });
    // Streiflicht der tiefen Sonne
    if (hoehe > -2 && hoehe < 12) {
      const k = 1 - Math.abs(hoehe - 4) / 8, glow = g.createRadialGradient(sx, sy, 10, sx, sy, 520);
      glow.addColorStop(0, `rgba(255,170,80,${0.35 * k})`); glow.addColorStop(1, "rgba(255,170,80,0)");
      g.globalCompositeOperation = "lighter"; g.fillStyle = glow; g.fillRect(0, 0, W, H); g.globalCompositeOperation = "source-over";
    }
    // Werte und Erklärung
    const [p, name] = phase(hoehe), zeit = uhr(jetzt);
    document.getElementById("o-uhr").textContent = zeit;
    document.getElementById("l-hud-zeit").textContent = zeit;
    document.getElementById("l-hud-phase").textContent = name;
    rUhr.setAttribute("aria-valuetext", `${zeit} Uhr, ${name}`);
    document.getElementById("l-hoehe").textContent = zahl(hoehe) + "°";
    document.getElementById("l-richtung").textContent = ["Nord", "Nordost", "Ost", "Südost", "Süd", "Südwest", "West", "Nordwest"][Math.round(azimut / 45) % 8];
    document.getElementById("l-schatten").textContent = hoehe > 0.5 ? (hoehe > 60 ? "sehr kurz" : zahl(1 / Math.tan((hoehe * Math.PI) / 180)) + "× Höhe") : "keine";
    document.getElementById("l-text").textContent = {
      nacht: "Nacht: Nur noch Kunstlicht und Sterne. Jetzt brauchst du ein Stativ, lange Zeiten oder eine hohe ISO.",
      blau: "Blaue Stunde: Der Himmel leuchtet tiefblau, in den Häusern gehen die Lichter an. Perfekt für Städte und Architektur, am besten mit Stativ.",
      gold: hoehe < 0 ? "Goldene Stunde, die Sonne ist gerade unter dem Horizont: Der Himmel glüht warm, das Licht ist ganz weich und schattenlos." : "Goldene Stunde: Die Sonne steht tief, das Licht ist warm und weich, die Schatten werden lang. Die beliebteste Zeit für Porträts und Landschaften.",
      tag: "Tageslicht: hell und neutral. Gut für alles, was klar und bunt sein soll. Die Schatten werden kürzer und härter, je höher die Sonne steigt.",
      mittag: "Mittagslicht: Die Sonne steht hoch, Schatten sind kurz und hart, Farben wirken flach. Such dir Schatten oder fotografiere Details.",
    }[p];
  };

  const aktualisieren = (uhrNeu) => {
    berechnen();
    if (uhrNeu) { const z = mitte(zeiten["gold-a"]) || zeiten.mittag; rUhr.value = Math.round(minuten(z) / 5) * 5; }
    malen();
    const balken = document.getElementById("g-balken");
    balken.querySelector("i")?.remove();
    const jetzt = new Date();
    if (jetzt.toDateString() === tag.toDateString()) { const i = document.createElement("i"); i.style.left = (minuten(jetzt) / 1440) * 100 + "%"; i.title = "Jetzt"; balken.append(i); }
  };
  rUhr.addEventListener("input", malen);
  document.querySelectorAll("#l-sprung button").forEach((b) => b.addEventListener("click", () => {
    const z = b.dataset.p === "mittag" ? zeiten.mittag : mitte(zeiten[b.dataset.p]);
    if (z) { rUhr.value = Math.round(minuten(z) / 5) * 5; malen(); }
  }));
  ort.addEventListener("change", () => { if (ort.value !== "hier") [lat, lon] = ort.value.split(",").map(Number); aktualisieren(false); });
  datum.addEventListener("change", () => datum.value && aktualisieren(false));
  document.getElementById("g-standort").addEventListener("click", () => {
    const hinweis = document.getElementById("g-standort-hinweis");
    if (!navigator.geolocation) { hinweis.textContent = "Dein Browser kann den Standort nicht bestimmen."; return; }
    hinweis.textContent = "Standort wird bestimmt …";
    navigator.geolocation.getCurrentPosition((pos) => {
      lat = pos.coords.latitude; lon = pos.coords.longitude;
      const opt = ort.querySelector('option[value="hier"]');
      opt.hidden = false; opt.textContent = `Mein Standort (${zahl(lat, 2)}°, ${zahl(lon, 2)}°)`; ort.value = "hier";
      hinweis.textContent = "Dein Standort wird nur in deinem Browser verwendet, nirgends gespeichert und an niemanden gesendet.";
      aktualisieren(false);
    }, () => { hinweis.textContent = "Standort nicht verfügbar. Wähl einfach einen Ort aus der Liste."; }, { maximumAge: 600000, timeout: 10000 });
  });
  beiGroesse(bild, () => {
    const r = bild.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    bild.width = Math.round(r.width * dpr); bild.height = Math.round(r.height * dpr);
    if (!tag) aktualisieren(true); else malen();
  });
})();

/* ---------- Hell/Dunkel und Menü (wie auf der Startseite) ---------- */
(() => {
  const btn = document.querySelector(".theme-btn"), meta = document.querySelector('meta[name="theme-color"]');
  const set = (light) => {
    if (light) document.documentElement.dataset.theme = "light"; else delete document.documentElement.dataset.theme;
    meta.content = light ? "#ffffff" : "#000000";
    btn.setAttribute("aria-label", light ? "Dunkles Design einschalten" : "Helles Design einschalten");
  };
  set(document.documentElement.dataset.theme === "light");
  btn.addEventListener("click", () => {
    const light = document.documentElement.dataset.theme !== "light";
    set(light);
    try { localStorage.setItem("theme", light ? "light" : "dark"); } catch (e) {}
  });
})();
(() => {
  const nav = document.querySelector(".nav"), btn = nav.querySelector(".menu-btn");
  const set = (open) => { nav.classList.toggle("open", open); btn.setAttribute("aria-expanded", String(open)); btn.setAttribute("aria-label", open ? "Menü schließen" : "Menü öffnen"); };
  btn.addEventListener("click", () => set(!nav.classList.contains("open")));
  nav.querySelectorAll("nav a").forEach((a) => a.addEventListener("click", () => set(false)));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") set(false); });
})();
