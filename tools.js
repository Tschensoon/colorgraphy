// Social-Media-Zuschneider: Foto laden, Format wählen, automatisch zuschneiden, als JPG speichern.
// Alles passiert im Browser, das Foto wird nirgends hochgeladen.
"use strict";

const DATEN = JSON.parse(document.getElementById("format-daten").textContent);
const $ = (id) => document.getElementById(id);
const klemmen = (x, a, b) => Math.min(b, Math.max(a, x));

let bild = null, iw = 0, ih = 0, basisName = "foto", stufen = [], energie = null;
let plattform = "instagram", formatIdx = 0, modus = "zuschnitt", rand = "unscharf", zoom = 1, cx = 0, cy = 0;
try {
  const g = JSON.parse(localStorage.getItem("zuschneider") || "{}");
  if (DATEN[g.p]) { plattform = g.p; formatIdx = klemmen(g.f | 0, 0, DATEN[g.p].formate.length - 1); }
} catch (e) {}
const ziel = () => DATEN[plattform].formate[formatIdx];
const merken = () => { try { localStorage.setItem("zuschneider", JSON.stringify({ p: plattform, f: formatIdx })); } catch (e) {} };

/* ---------- Auswahl von Plattform und Format ---------- */
const plattformKnoepfe = () => {
  $("plattformen").innerHTML = "";
  Object.entries(DATEN).forEach(([k, p]) => {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = p.name; b.setAttribute("aria-pressed", String(k === plattform));
    b.addEventListener("click", () => { plattform = k; formatIdx = 0; merken(); plattformKnoepfe(); formatKnoepfe(); neuesFormat(); });
    $("plattformen").append(b);
  });
};
const formatKnoepfe = () => {
  $("formate").innerHTML = "";
  DATEN[plattform].formate.forEach((f, i) => {
    const b = document.createElement("button"), q = 30;
    const bw = f.w >= f.h ? q : Math.round((q * f.w) / f.h), bh = f.h >= f.w ? q : Math.round((q * f.h) / f.w);
    b.type = "button"; b.setAttribute("aria-pressed", String(i === formatIdx));
    b.innerHTML = `<span class="form" aria-hidden="true"><i class="${f.rund ? "rund" : ""}" style="width:${bw}px;height:${bh}px"></i></span><span><b></b><small>${f.w} × ${f.h} · ${f.ratio}</small></span>`;
    b.querySelector("b").textContent = f.name;
    b.addEventListener("click", () => { formatIdx = i; merken(); formatKnoepfe(); neuesFormat(); });
    $("formate").append(b);
  });
  $("format-hinweis").textContent = ziel().hinweis || "";
};

/* ---------- Foto laden ---------- */
const ablage = $("ablage"), dateiFeld = $("datei");
const melden = (titel, info) => { $("ablage-titel").textContent = titel; $("ablage-info").textContent = info; };
const laden = (datei) => {
  if (!datei) return;
  if (!/^image\//.test(datei.type) && !/\.(jpe?g|png|webp|gif|avif|heic|heif)$/i.test(datei.name)) { melden("Das ist kein Bild", "Bitte wähle ein Foto im Format JPG, PNG oder WebP."); return; }
  const url = URL.createObjectURL(datei), img = new Image();
  melden("Foto wird geöffnet …", datei.name);
  img.onload = () => {
    bild = img; iw = img.naturalWidth; ih = img.naturalHeight; stufen = [];
    basisName = (datei.name.replace(/\.[^.]+$/, "").normalize("NFKD").replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "foto").slice(0, 40);
    energie = energieKarte();
    ablage.classList.add("geladen");
    melden("✓ " + datei.name, `${iw} × ${ih} px · Tippen, um ein anderes Foto zu wählen`);
    $("leer").hidden = true; $("vorschau").hidden = false;
    $("laden").disabled = false; $("teilen").disabled = false;
    neuesFormat();
  };
  img.onerror = () => { URL.revokeObjectURL(url); melden("Foto lässt sich nicht öffnen", "Dein Browser kann dieses Format nicht lesen (z. B. HEIC vom iPhone außerhalb von Safari). Speichere es als JPG und versuch es noch einmal."); };
  img.src = url;
};
dateiFeld.addEventListener("change", () => laden(dateiFeld.files[0]));
["dragenter", "dragover"].forEach((t) => ablage.addEventListener(t, (e) => { e.preventDefault(); ablage.classList.add("drueber"); }));
["dragleave", "drop"].forEach((t) => ablage.addEventListener(t, () => ablage.classList.remove("drueber")));
ablage.addEventListener("drop", (e) => { e.preventDefault(); laden(e.dataTransfer.files[0]); });
// Daneben fallengelassene Dateien nicht im Browser öffnen
["dragover", "drop"].forEach((t) => addEventListener(t, (e) => { if (e.dataTransfer && [...e.dataTransfer.types].includes("Files")) e.preventDefault(); }));

/* ---------- Automatisch ausrichten: Bereich mit den meisten Details und Farben finden ---------- */
const energieKarte = () => {
  const m = 160 / Math.max(iw, ih), ew = Math.max(1, Math.round(iw * m)), eh = Math.max(1, Math.round(ih * m));
  const c = document.createElement("canvas"); c.width = ew; c.height = eh;
  const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(bild, 0, 0, ew, eh);
  const d = g.getImageData(0, 0, ew, eh).data, luma = new Float32Array(ew * eh), wert = new Float32Array(ew * eh);
  for (let i = 0; i < ew * eh; i++) {
    const r = d[i * 4], gr = d[i * 4 + 1], b = d[i * 4 + 2];
    luma[i] = 0.3 * r + 0.59 * gr + 0.11 * b;
    wert[i] = (Math.max(r, gr, b) - Math.min(r, gr, b)) * 0.35;
  }
  for (let y = 1; y < eh - 1; y++) for (let x = 1; x < ew - 1; x++) {
    const i = y * ew + x;
    wert[i] += Math.abs(luma[i + 1] - luma[i - 1]) + Math.abs(luma[i + ew] - luma[i - ew]);
  }
  // Summenbild für schnelle Fenstersummen
  const s = new Float64Array((ew + 1) * (eh + 1));
  for (let y = 0; y < eh; y++) for (let x = 0; x < ew; x++) s[(y + 1) * (ew + 1) + x + 1] = wert[y * ew + x] + s[y * (ew + 1) + x + 1] + s[(y + 1) * (ew + 1) + x] - s[y * (ew + 1) + x];
  return { ew, eh, s, m };
};
const autoAusrichten = () => {
  if (!bild) return;
  zoom = 1; $("zoom").value = 1;
  const f = ziel(), { ew, eh, s, m } = energie;
  const sk = Math.max(f.w / iw, f.h / ih), fw = Math.min(ew, Math.round((f.w / sk) * m)), fh = Math.min(eh, Math.round((f.h / sk) * m));
  const summe = (x, y) => s[(y + fh) * (ew + 1) + x + fw] - s[y * (ew + 1) + x + fw] - s[(y + fh) * (ew + 1) + x] + s[y * (ew + 1) + x];
  let best = -1, bx = (ew - fw) / 2, by = (eh - fh) / 2;
  for (let y = 0; y <= eh - fh; y++) for (let x = 0; x <= ew - fw; x++) {
    const mitte = Math.hypot((x + fw / 2 - ew / 2) / ew, (y + fh / 2 - eh / 2) / eh);
    const wert = summe(x, y) * (1 - 0.35 * mitte);
    if (wert > best) { best = wert; bx = x; by = y; }
  }
  cx = (bx + fw / 2) / m; cy = (by + fh / 2) / m;
};

/* ---------- Zeichnen (Vorschau und Export mit derselben Funktion) ---------- */
// Für starke Verkleinerung zuerst in Halbierungsschritten verkleinern, das ergibt schärfere Bilder
const quelle = (s) => {
  let src = bild, f = 1, i = 0;
  while (s / f < 0.5 && Math.min(iw * f, ih * f) > 128) {
    f /= 2; i++;
    if (!stufen[i]) {
      const c = document.createElement("canvas"); c.width = Math.round(iw * f); c.height = Math.round(ih * f);
      const g = c.getContext("2d"); g.imageSmoothingQuality = "high";
      g.drawImage(stufen[i - 1] || bild, 0, 0, c.width, c.height);
      stufen[i] = c;
    }
    src = stufen[i];
  }
  return { src, f };
};
const zeichnen = (g, W, H) => {
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
  if (modus === "zuschnitt") {
    const s = Math.max(W / iw, H / ih) * zoom, hw = W / (2 * s), hh = H / (2 * s);
    cx = klemmen(cx, hw, iw - hw); cy = klemmen(cy, hh, ih - hh);
    const { src, f } = quelle(s);
    g.drawImage(src, (cx - hw) * f, (cy - hh) * f, 2 * hw * f, 2 * hh * f, 0, 0, W, H);
    return s;
  }
  // Ganz zeigen: Foto passt komplett hinein, Rest wird aufgefüllt
  if (rand === "unscharf") {
    const sc = Math.max(W / iw, H / ih), klein = document.createElement("canvas");
    klein.width = Math.max(4, Math.round(W / 40)); klein.height = Math.max(4, Math.round(H / 40));
    const k = klein.getContext("2d"), { src, f } = quelle(sc / 40);
    k.drawImage(src, ((iw - W / sc) / 2) * f, ((ih - H / sc) / 2) * f, (W / sc) * f, (H / sc) * f, 0, 0, klein.width, klein.height);
    const mittel = document.createElement("canvas"); mittel.width = klein.width * 4; mittel.height = klein.height * 4;
    const mg = mittel.getContext("2d"); mg.imageSmoothingQuality = "high"; mg.drawImage(klein, 0, 0, mittel.width, mittel.height);
    g.drawImage(mittel, 0, 0, W, H);
    g.fillStyle = "rgba(0,0,0,.22)"; g.fillRect(0, 0, W, H);
  } else {
    g.fillStyle = rand === "weiss" ? "#ffffff" : "#000000"; g.fillRect(0, 0, W, H);
  }
  const s = Math.min(W / iw, H / ih), { src, f } = quelle(s);
  g.drawImage(src, 0, 0, iw * f, ih * f, (W - iw * s) / 2, (H - ih * s) / 2, iw * s, ih * s);
  return s;
};

/* ---------- Vorschau ---------- */
const vorschau = $("vorschau");
let vorschauSkala = 1;
const zeigeVorschau = () => {
  if (!bild) return;
  const f = ziel(), box = $("vorschau-rahmen").getBoundingClientRect();
  const maxW = box.width, maxH = Math.min(innerHeight * 0.62, 560);
  const sk = Math.min(maxW / f.w, maxH / f.h), cw = Math.round(f.w * sk), ch = Math.round(f.h * sk), dpr = Math.min(devicePixelRatio || 1, 2);
  vorschau.style.width = cw + "px"; vorschau.style.height = ch + "px";
  if (vorschau.width !== Math.round(cw * dpr) || vorschau.height !== Math.round(ch * dpr)) { vorschau.width = Math.round(cw * dpr); vorschau.height = Math.round(ch * dpr); }
  const g = vorschau.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, vorschau.width, vorschau.height);
  vorschauSkala = zeichnen(g, vorschau.width, vorschau.height) / dpr;
  if ($("hilfen").checked) hilfslinien(g, vorschau.width, vorschau.height, f);
};
const hilfslinien = (g, W, H, f) => {
  if (f.rund) {
    g.save(); g.fillStyle = "rgba(0,0,0,.5)"; g.beginPath(); g.rect(0, 0, W, H); g.arc(W / 2, H / 2, Math.min(W, H) / 2, 0, Math.PI * 2, true); g.fill("evenodd"); g.restore();
  }
  if (f.sicher) {
    const [o, r, u, l] = f.sicher;
    g.fillStyle = "rgba(0,0,0,.42)";
    g.fillRect(0, 0, W, H * o); g.fillRect(0, H * (1 - u), W, H * u);
    g.fillRect(0, H * o, W * l, H * (1 - o - u)); g.fillRect(W * (1 - r), H * o, W * r, H * (1 - o - u));
  }
  if (modus === "zuschnitt") {
    g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = Math.max(1, W / 600);
    g.beginPath();
    [1, 2].forEach((k) => { g.moveTo((W * k) / 3, 0); g.lineTo((W * k) / 3, H); g.moveTo(0, (H * k) / 3); g.lineTo(W, (H * k) / 3); });
    g.stroke();
  }
};

/* ---------- Ergebnis, Warnung, Dateigröße ---------- */
let blobAktuell = null, rechenZeit = 0;
const exportieren = () => new Promise((fertig) => {
  const f = ziel(), c = document.createElement("canvas");
  c.width = f.w; c.height = f.h;
  zeichnen(c.getContext("2d"), f.w, f.h);
  c.toBlob(fertig, "image/jpeg", 0.92);
});
const dateiname = () => {
  const f = ziel(), teil = f.name.toLowerCase().normalize("NFKD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "");
  return `${basisName}-${plattform}-${teil}-${f.w}x${f.h}.jpg`;
};
const ergebnisAktualisieren = () => {
  const f = ziel();
  if (!bild) return;
  $("ergebnis").innerHTML = `${f.w} × ${f.h} px · ${f.ratio} · JPG<small id="groesse">Dateigröße wird berechnet …</small>`;
  // Hat das Foto (bzw. der Ausschnitt) weniger Pixel als das Ziel, wird es vergrößert
  const faktor = modus === "zuschnitt" ? Math.max(f.w / iw, f.h / ih) * zoom : Math.min(f.w / iw, f.h / ih);
  const warn = $("warnung");
  warn.hidden = faktor <= 1.02;
  if (!warn.hidden) warn.textContent = `Dein ${modus === "zuschnitt" ? "Ausschnitt" : "Foto"} hat weniger Pixel als das Zielformat und wird um das ${faktor.toFixed(1).replace(".", ",")}-Fache vergrößert. Das kann etwas unscharf wirken. Weniger Zoom oder ein größeres Foto hilft.`;
  clearTimeout(rechenZeit);
  rechenZeit = setTimeout(async () => {
    blobAktuell = await exportieren();
    const el = $("groesse");
    if (el && blobAktuell) el.textContent = `ca. ${Math.max(1, Math.round(blobAktuell.size / 1024))} KB · ohne Metadaten und Standortdaten · Name: ${dateiname()}`;
  }, 350);
};
const aktualisieren = () => { zeigeVorschau(); ergebnisAktualisieren(); };
const neuesFormat = () => { $("format-hinweis").textContent = ziel().hinweis || ""; autoAusrichten(); aktualisieren(); };

/* ---------- Bedienung: Ziehen, Zwei-Finger-Zoom, Tasten, Regler ---------- */
const zeiger = new Map();
let startAbstand = 0, startZoom = 1;
vorschau.addEventListener("pointerdown", (e) => {
  if (!bild) return;
  vorschau.setPointerCapture(e.pointerId);
  zeiger.set(e.pointerId, [e.clientX, e.clientY]);
  if (zeiger.size === 2) { const [a, b] = [...zeiger.values()]; startAbstand = Math.hypot(a[0] - b[0], a[1] - b[1]); startZoom = zoom; }
});
vorschau.addEventListener("pointermove", (e) => {
  if (!zeiger.has(e.pointerId) || modus !== "zuschnitt") return;
  const alt = zeiger.get(e.pointerId);
  zeiger.set(e.pointerId, [e.clientX, e.clientY]);
  if (zeiger.size === 2) {
    const [a, b] = [...zeiger.values()];
    zoom = klemmen((startZoom * Math.hypot(a[0] - b[0], a[1] - b[1])) / startAbstand, 1, 3);
    $("zoom").value = zoom; $("o-zoom").textContent = Math.round(zoom * 100) + " %";
  } else {
    cx -= (e.clientX - alt[0]) / vorschauSkala; cy -= (e.clientY - alt[1]) / vorschauSkala;
  }
  zeigeVorschau();
});
["pointerup", "pointercancel"].forEach((t) => vorschau.addEventListener(t, (e) => { if (zeiger.delete(e.pointerId) && !zeiger.size) ergebnisAktualisieren(); }));
vorschau.addEventListener("keydown", (e) => {
  const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
  if (!d || !bild || modus !== "zuschnitt") return;
  e.preventDefault(); cx += d[0] * iw * 0.02; cy += d[1] * ih * 0.02; aktualisieren();
});
$("zoom").addEventListener("input", () => { zoom = Number($("zoom").value); $("o-zoom").textContent = Math.round(zoom * 100) + " %"; aktualisieren(); });
$("auto").addEventListener("click", () => { autoAusrichten(); $("o-zoom").textContent = "100 %"; aktualisieren(); });
$("hilfen").addEventListener("change", zeigeVorschau);
document.querySelectorAll("#modus button").forEach((b) => b.addEventListener("click", () => {
  modus = b.dataset.m;
  document.querySelectorAll("#modus button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  $("zoom-zeile").hidden = modus !== "zuschnitt"; $("rand-wahl").hidden = modus === "zuschnitt";
  $("auto").hidden = modus !== "zuschnitt";
  document.querySelector(".tipp").hidden = modus !== "zuschnitt";
  aktualisieren();
}));
document.querySelectorAll("#rand-wahl button").forEach((b) => b.addEventListener("click", () => {
  rand = b.dataset.r;
  document.querySelectorAll("#rand-wahl button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  aktualisieren();
}));

/* ---------- Speichern und Teilen ---------- */
$("laden").addEventListener("click", async () => {
  if (!bild) return;
  const blob = await exportieren(), a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = dateiname();
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
});
const kannTeilen = (() => { try { return !!(navigator.canShare && navigator.canShare({ files: [new File([""], "t.jpg", { type: "image/jpeg" })] })); } catch (e) { return false; } })();
if (kannTeilen) $("teilen").hidden = false;
$("teilen").addEventListener("click", async () => {
  if (!bild) return;
  const blob = await exportieren(), datei = new File([blob], dateiname(), { type: "image/jpeg" });
  try { await navigator.share({ files: [datei] }); } catch (e) {}
});

let breite = 0;
new ResizeObserver(() => { const w = Math.round($("vorschau-rahmen").getBoundingClientRect().width); if (w !== breite) { breite = w; zeigeVorschau(); } }).observe($("vorschau-rahmen"));
vorschau.hidden = true;
plattformKnoepfe(); formatKnoepfe();

/* ---------- Hell/Dunkel und Menü (wie auf den anderen Seiten) ---------- */
(() => {
  const btn = document.querySelector(".theme-btn"), meta = document.querySelector('meta[name="theme-color"]');
  const set = (light) => {
    if (light) document.documentElement.dataset.theme = "light"; else delete document.documentElement.dataset.theme;
    meta.content = light ? "#ffffff" : "#000000";
    btn.setAttribute("aria-label", light ? "Dunkles Design einschalten" : "Helles Design einschalten");
  };
  set(document.documentElement.dataset.theme === "light");
  btn.addEventListener("click", () => { const light = document.documentElement.dataset.theme !== "light"; set(light); try { localStorage.setItem("theme", light ? "light" : "dark"); } catch (e) {} });
  const nav = document.querySelector(".nav"), menu = nav.querySelector(".menu-btn");
  const auf = (o) => { nav.classList.toggle("open", o); menu.setAttribute("aria-expanded", String(o)); menu.setAttribute("aria-label", o ? "Menü schließen" : "Menü öffnen"); };
  menu.addEventListener("click", () => auf(!nav.classList.contains("open")));
  nav.querySelectorAll("nav a").forEach((a) => a.addEventListener("click", () => auf(false)));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") auf(false); });
})();
