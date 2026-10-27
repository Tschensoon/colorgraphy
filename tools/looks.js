// Colorgraphy-Looks: Lightroom-Presets im Browser auf eigene Fotos anwenden.
// Jeder Look ist eine 3D-Farbtabelle (33³), die Lightroom selbst berechnet hat; Klarheit und Vignette kommen danach dazu.
// Alles passiert im Browser, Fotos werden nicht hochgeladen.
"use strict";

const $ = (id) => document.getElementById(id);
const klemmen = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const glatt = (a, b, x) => { const t = klemmen((x - a) / (b - a)); return t * t * (3 - 2 * t); };

/* ---------- 3D-Farbtabellen aus Lightroom ----------
   werkzeug/looks-lut.py erzeugt sie aus einem Testbild, das Lightroom mit dem jeweiligen Preset entwickelt hat.
   Bild 1089 × 33: x = Rot + 33 · Grün, y = Blau. */
const N = 33;
const tabelleLaden = (i) => new Promise((ok, fehler) => {
  const img = new Image();
  img.onload = async () => {
    const bmp = await createImageBitmap(img, { colorSpaceConversion: "none", premultiplyAlpha: "none" });
    const c = document.createElement("canvas"); c.width = bmp.width; c.height = bmp.height;
    const cg = c.getContext("2d", { willReadFrequently: true }); cg.drawImage(bmp, 0, 0);
    const d = cg.getImageData(0, 0, c.width, c.height).data, lut = new Float32Array(N * N * N * 3);
    for (let j = 0; j < N * N * N; j++) { lut[j * 3] = d[j * 4] / 255; lut[j * 3 + 1] = d[j * 4 + 1] / 255; lut[j * 3 + 2] = d[j * 4 + 2] / 255; }
    ok(lut);
  };
  img.onerror = () => { tabellen.delete(i); fehler(new Error("Look " + (i + 1) + " nicht geladen")); };
  img.src = "looks/cg" + (i + 1) + ".png?v=1";
});
const tabellen = new Map();
const tabelle = (i) => { if (!tabellen.has(i)) tabellen.set(i, tabelleLaden(i)); return tabellen.get(i); };

// Farbtabelle (trilinear) und Klarheit/Vignette auf Bilddaten anwenden
const anwenden = async (quelle, w, h, lookIndex, staerke, pause = false) => {
  const lut = await tabelle(lookIndex), p = LOOKS[lookIndex].w, aus = new Uint8ClampedArray(quelle.length), S = (N - 1) / 255;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      const fr = quelle[o] * S, fg = quelle[o + 1] * S, fb = quelle[o + 2] * S;
      const r0 = Math.min(N - 2, fr | 0), g0 = Math.min(N - 2, fg | 0), b0 = Math.min(N - 2, fb | 0);
      const dr = fr - r0, dg = fg - g0, db = fb - b0;
      const i000 = ((b0 * N + g0) * N + r0) * 3, i100 = i000 + 3, i010 = i000 + N * 3, i110 = i010 + 3, i001 = i000 + N * N * 3, i101 = i001 + 3, i011 = i001 + N * 3, i111 = i011 + 3;
      for (let k = 0; k < 3; k++) {
        const c00 = lut[i000 + k] + (lut[i100 + k] - lut[i000 + k]) * dr, c10 = lut[i010 + k] + (lut[i110 + k] - lut[i010 + k]) * dr;
        const c01 = lut[i001 + k] + (lut[i101 + k] - lut[i001 + k]) * dr, c11 = lut[i011 + k] + (lut[i111 + k] - lut[i011 + k]) * dr;
        const c0 = c00 + (c10 - c00) * dg, c1 = c01 + (c11 - c01) * dg;
        aus[o + k] = (c0 + (c1 - c0) * db) * 255 + 0.5;
      }
      aus[o + 3] = 255;
    }
    if (pause && y % 160 === 0) { fortschritt(y / h); await new Promise((r) => setTimeout(r, 0)); }
  }
  // Klarheit: lokaler Kontrast gegen eine stark weichgezeichnete Fassung
  const klarheit = (p.Clarity2012 + p.Texture * 0.3) / 100;
  let weich = null;
  if (Math.abs(klarheit) > 0.01) weich = weichzeichnen(aus, w, h);
  const va = p.PostCropVignetteAmount / 100, vm = p.PostCropVignetteMidpoint / 100, vf = p.PostCropVignetteFeather / 100, rund = p.PostCropVignetteRoundness / 100;
  const cx = w / 2, cy = h / 2, ax = rund > 0 ? Math.max(cx, cy) : cx, ay = rund > 0 ? Math.max(cx, cy) : cy;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4;
    let r = aus[o], g = aus[o + 1], b = aus[o + 2];
    if (weich) {
      const L = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255, Lw = (0.2126 * weich[o] + 0.7152 * weich[o + 1] + 0.0722 * weich[o + 2]) / 255;
      const d = (L - Lw) * klarheit * 0.9 * (4 * L * (1 - L)) * 255;
      r += d; g += d; b += d;
    }
    if (va) {
      const dx = (x - cx) / ax, dy = (y - cy) / ay, dist = Math.sqrt((dx * dx + dy * dy) / 2) * 1.41;
      const start = 0.3 + vm * 0.5, f = 1 + va * 0.6 * glatt(start, start + 0.2 + vf * 0.7, dist);
      r *= f; g *= f; b *= f;
    }
    aus[o] = quelle[o] + (r - quelle[o]) * staerke;
    aus[o + 1] = quelle[o + 1] + (g - quelle[o + 1]) * staerke;
    aus[o + 2] = quelle[o + 2] + (b - quelle[o + 2]) * staerke;
  }
  return aus;
};
const weichzeichnen = (daten, w, h) => {
  const a = document.createElement("canvas"); a.width = w; a.height = h;
  a.getContext("2d").putImageData(new ImageData(daten, w, h), 0, 0);
  const k = document.createElement("canvas"); k.width = Math.max(1, Math.round(w / 28)); k.height = Math.max(1, Math.round(h / 28));
  const kg = k.getContext("2d"); kg.imageSmoothingQuality = "high"; kg.drawImage(a, 0, 0, k.width, k.height);
  const z = document.createElement("canvas"); z.width = w; z.height = h;
  const zg = z.getContext("2d"); zg.imageSmoothingQuality = "high"; zg.drawImage(k, 0, 0, w, h);
  return zg.getImageData(0, 0, w, h).data;
};

/* ---------- Oberfläche ---------- */
let bild = null, name = "foto", gewaehlt = 0, vorschauDaten = null, vw = 0, vh = 0, teilung = 0.5, rechnet = 0;
const buehne = $("lk-buehne"), canvas = $("lk-canvas"), g = canvas.getContext("2d");
const original = document.createElement("canvas"), bearbeitet = document.createElement("canvas");
const fortschritt = (anteil) => { $("lk-status").textContent = anteil < 1 ? `Wird berechnet … ${Math.round(anteil * 100)} %` : ""; };

const kartenBauen = () => {
  $("lk-looks").innerHTML = "";
  LOOKS.forEach((l, i) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "lk-look"; b.setAttribute("aria-pressed", String(i === gewaehlt));
    b.innerHTML = `<canvas width="96" height="96" aria-hidden="true"></canvas><span><strong></strong><small></small></span>`;
    b.querySelector("strong").textContent = l.name; b.querySelector("small").textContent = l.text;
    b.addEventListener("click", () => { gewaehlt = i; document.querySelectorAll(".lk-look").forEach((x, k) => x.setAttribute("aria-pressed", String(k === i))); neuRechnen(); });
    $("lk-looks").append(b);
  });
};
const miniaturen = async () => {
  if (!bild) return;
  const s = 96, c = document.createElement("canvas"), sk = Math.max(s / bild.naturalWidth, s / bild.naturalHeight);
  c.width = c.height = s;
  const cg = c.getContext("2d");
  cg.drawImage(bild, (s - bild.naturalWidth * sk) / 2, (s - bild.naturalHeight * sk) / 2, bild.naturalWidth * sk, bild.naturalHeight * sk);
  const quelle = cg.getImageData(0, 0, s, s).data;
  const ziele = [...document.querySelectorAll(".lk-look canvas")];
  for (let i = 0; i < LOOKS.length; i++) {
    const aus = await anwenden(quelle, s, s, i, 1);
    ziele[i].getContext("2d").putImageData(new ImageData(aus, s, s), 0, 0);
    await new Promise((r) => setTimeout(r, 0));
  }
};
const laden = (datei) => {
  if (!datei) return;
  const img = new Image();
  $("lk-ablage-titel").textContent = "Foto wird geöffnet …";
  img.onload = async () => {
    bild = img;
    name = (datei.name.replace(/\.[^.]+$/, "").normalize("NFKD").replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "foto").slice(0, 40);
    $("lk-ablage-titel").textContent = "✓ " + datei.name;
    $("lk-ablage-info").textContent = `${img.naturalWidth} × ${img.naturalHeight} px · Tippen für ein anderes Foto`;
    $("lk-leer").hidden = true; canvas.hidden = false; $("lk-laden").disabled = false;
    vorschauVorbereiten();
    await neuRechnen();
    miniaturen();
  };
  img.onerror = () => { $("lk-ablage-titel").textContent = "Foto lässt sich nicht öffnen"; $("lk-ablage-info").textContent = "Bitte als JPG oder PNG versuchen (HEIC klappt nur in Safari)."; };
  img.src = URL.createObjectURL(datei);
};
const vorschauVorbereiten = () => {
  const box = buehne.getBoundingClientRect(), maxW = box.width, maxH = Math.min(innerHeight * 0.7, 720), dpr = Math.min(devicePixelRatio || 1, 2);
  const sk = Math.min(maxW / bild.naturalWidth, maxH / bild.naturalHeight, 1);
  const cw = Math.round(bild.naturalWidth * sk), ch = Math.round(bild.naturalHeight * sk);
  vw = Math.min(bild.naturalWidth, Math.round(cw * dpr)); vh = Math.min(bild.naturalHeight, Math.round(ch * dpr));
  canvas.style.width = cw + "px"; canvas.style.height = ch + "px";
  [canvas, original, bearbeitet].forEach((c) => { c.width = vw; c.height = vh; });
  const og = original.getContext("2d"); og.imageSmoothingQuality = "high"; og.drawImage(bild, 0, 0, vw, vh);
  vorschauDaten = og.getImageData(0, 0, vw, vh).data;
};
const neuRechnen = async () => {
  if (!bild) return;
  const nr = ++rechnet;
  const aus = await anwenden(vorschauDaten, vw, vh, gewaehlt, +$("lk-staerke").value / 100);
  if (nr !== rechnet) return;
  bearbeitet.getContext("2d").putImageData(new ImageData(aus, vw, vh), 0, 0);
  zeichnen();
};
const zeichnen = () => {
  g.drawImage(bearbeitet, 0, 0);
  if ($("lk-vergleich").checked) {
    const x = Math.round(vw * teilung);
    g.drawImage(original, 0, 0, x, vh, 0, 0, x, vh);
    g.fillStyle = "#ffffff"; g.fillRect(x - 1, 0, 2, vh);
    const m = vh / 2, r = Math.max(14, vw / 50);
    g.beginPath(); g.arc(x, m, r, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#16131f"; g.font = `700 ${r}px Figtree, Arial, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("⇆", x, m + 1);
    g.font = `700 ${Math.max(12, vw / 45)}px Figtree, Arial, sans-serif`; g.fillStyle = "rgba(0,0,0,.55)";
    const pad = Math.max(10, vw / 60);
    g.textAlign = "left"; g.fillText("Vorher", pad, pad * 1.6); g.textAlign = "right"; g.fillText("Nachher", vw - pad, pad * 1.6);
  }
};

// Vergleichslinie ziehen
let ziehen = false;
const linieSetzen = (e) => { const r = canvas.getBoundingClientRect(); teilung = klemmen((e.clientX - r.left) / r.width, 0.02, 0.98); zeichnen(); };
canvas.addEventListener("pointerdown", (e) => { if (!$("lk-vergleich").checked) return; ziehen = true; canvas.setPointerCapture(e.pointerId); linieSetzen(e); });
canvas.addEventListener("pointermove", (e) => ziehen && linieSetzen(e));
canvas.addEventListener("pointerup", () => (ziehen = false));
$("lk-vergleich").addEventListener("change", zeichnen);
let staerkeTimer = 0;
$("lk-staerke").addEventListener("input", () => { $("o-staerke").textContent = $("lk-staerke").value + " %"; clearTimeout(staerkeTimer); staerkeTimer = setTimeout(neuRechnen, 40); });

const ablage = $("lk-ablage"), eingabe = $("lk-datei");
eingabe.addEventListener("change", () => laden(eingabe.files[0]));
["dragenter", "dragover"].forEach((t) => ablage.addEventListener(t, (e) => { e.preventDefault(); ablage.classList.add("drueber"); }));
["dragleave", "drop"].forEach((t) => ablage.addEventListener(t, () => ablage.classList.remove("drueber")));
ablage.addEventListener("drop", (e) => { e.preventDefault(); laden(e.dataTransfer.files[0]); });
["dragover", "drop"].forEach((t) => addEventListener(t, (e) => { if (e.dataTransfer && [...e.dataTransfer.types].includes("Files")) e.preventDefault(); }));

// Speichern in voller Auflösung (Handy: höchstens 4096 px, Computer: 6000 px)
$("lk-laden").addEventListener("click", async () => {
  if (!bild) return;
  const knopf = $("lk-laden"), grenze = matchMedia("(pointer: coarse)").matches ? 4096 : 6000;
  const sk = Math.min(1, grenze / Math.max(bild.naturalWidth, bild.naturalHeight));
  const w = Math.round(bild.naturalWidth * sk), h = Math.round(bild.naturalHeight * sk);
  knopf.disabled = true;
  try {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const cg = c.getContext("2d"); cg.imageSmoothingQuality = "high"; cg.drawImage(bild, 0, 0, w, h);
    const aus = await anwenden(cg.getImageData(0, 0, w, h).data, w, h, gewaehlt, +$("lk-staerke").value / 100, true);
    cg.putImageData(new ImageData(aus, w, h), 0, 0);
    fortschritt(1);
    const blob = await new Promise((ok) => c.toBlob(ok, "image/jpeg", 0.92));
    const look = LOOKS[gewaehlt].name.toLowerCase().normalize("NFKD").replace(/[^\w]+/g, "-");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `${name}-${look}.jpg`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 8000);
    $("lk-status").textContent = `Gespeichert: ${w} × ${h} px, ${Math.round(blob.size / 1024)} KB, ohne Metadaten.`;
  } finally { knopf.disabled = false; }
});

let breite = 0;
new ResizeObserver(() => { const b = Math.round(buehne.getBoundingClientRect().width); if (b !== breite && bild) { breite = b; vorschauVorbereiten(); neuRechnen(); } else breite = b; }).observe(buehne);
kartenBauen();
