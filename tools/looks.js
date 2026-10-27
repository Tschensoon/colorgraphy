// Colorgraphy-Looks: Lightroom-Presets im Browser nachgebaut und auf eigene Fotos angewendet.
// Jeder Look wird einmal in eine 3D-Farbtabelle (33³) umgerechnet; Klarheit und Vignette kommen danach dazu.
// Alles passiert im Browser, Fotos werden nicht hochgeladen.
"use strict";

const $ = (id) => document.getElementById(id);
const klemmen = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const glatt = (a, b, x) => { const t = klemmen((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const linear = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
const gamma = (v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(Math.max(v, 0), 1 / 2.4) - 0.055);
const helligkeit = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/* ---------- Gradationskurve: monotone kubische Interpolation (wie Lightroom-Punktkurven) ---------- */
const kurvenTabelle = (punkte) => {
  const xs = punkte.map((p) => p[0] / 255), ys = punkte.map((p) => p[1] / 255), n = xs.length, tab = new Float32Array(256);
  if (n < 2) { for (let i = 0; i < 256; i++) tab[i] = i / 255; return tab; }
  const d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / Math.max(1e-6, xs[i + 1] - xs[i]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  for (let k = 0; k < 256; k++) {
    const x = k / 255;
    if (x <= xs[0]) { tab[k] = ys[0]; continue; }
    if (x >= xs[n - 1]) { tab[k] = ys[n - 1]; continue; }
    let i = 0;
    while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
    tab[k] = (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  }
  return tab;
};
const kurve = (tab, v) => { const x = klemmen(v) * 255, i = Math.min(254, Math.floor(x)), f = x - i; return tab[i] + (tab[i + 1] - tab[i]) * f; };

/* ---------- Farbräume ---------- */
const rgbZuHsl = (r, g, b) => {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (d < 1e-6) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1) + 1e-6);
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, klemmen(s), l];
};
const hslZuRgb = (h, s, l) => {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [r + m, g + m, b + m];
};
// Gewichte der 8 HSL-Farbbereiche (Rot, Orange, Gelb, Grün, Aquamarin, Blau, Lila, Magenta)
const ZENTREN = [0, 30, 60, 120, 180, 240, 270, 300];
const bandGewichte = (h) => {
  const w = new Array(8).fill(0);
  for (let i = 0; i < 8; i++) {
    const a = ZENTREN[i], b = i === 7 ? 360 : ZENTREN[i + 1];
    if (h >= a && h < b) { const t = (h - a) / (b - a); w[i] = 1 - t; w[(i + 1) % 8] = t; return w; }
  }
  w[0] = 1;
  return w;
};

/* ---------- Ein Pixel durch alle Regler eines Presets schicken ---------- */
const vorbereiten = (w) => ({
  ...w,
  tMaster: kurvenTabelle(w.Kurve), tRot: kurvenTabelle(w.KurveRed), tGruen: kurvenTabelle(w.KurveGreen), tBlau: kurvenTabelle(w.KurveBlue),
});
const bearbeiten = (p, r, g, b) => {
  // 1. Weißabgleich und Belichtung (linear)
  let lr = linear(r), lg = linear(g), lb = linear(b);
  const y0 = helligkeit(lr, lg, lb), t = p.IncrementalTemperature / 100, ti = p.IncrementalTint / 100;
  lr *= 1 + 0.22 * t; lb *= 1 - 0.22 * t; lg *= 1 - 0.16 * ti; lr *= 1 + 0.04 * ti; lb *= 1 + 0.04 * ti;
  const y1 = helligkeit(lr, lg, lb);
  const fw = y1 > 1e-6 ? y0 / y1 : 1, ev = Math.pow(2, p.Exposure2012);
  lr *= fw * ev; lg *= fw * ev; lb *= fw * ev;
  r = gamma(lr); g = gamma(lg); b = gamma(lb);

  // 2. Tonwerte über die Helligkeit: Kontrast, Lichter, Tiefen, Weiß, Schwarz, Dunst, parametrische Kurve
  const L0 = helligkeit(r, g, b);
  let L = L0;
  if (L > 0.9) L = 0.9 + 0.1 * Math.tanh((L - 0.9) / 0.1); // weiche Schulter, damit Überbelichtung nicht hart abreißt
  const dunst = p.Dehaze / 100, c = p.Contrast2012 / 100 * 0.9 + dunst * 0.35, e = Math.pow(2, c * 0.9);
  L = L < 0.5 ? 0.5 * Math.pow(2 * Math.max(L, 0), e) : 1 - 0.5 * Math.pow(2 * Math.max(1 - L, 0), e);
  L += (p.Highlights2012 / 100) * 0.17 * glatt(0.58, 0.9, L) * (1 - glatt(0.9, 1.0, L));
  L += (p.Shadows2012 / 100) * 0.2 * glatt(0.0, 0.14, L) * (1 - glatt(0.16, 0.5, L));
  L += (p.Whites2012 / 100) * 0.14 * glatt(0.55, 1.0, L);
  L += (p.Blacks2012 / 100) * 0.13 * (1 - glatt(0.0, 0.42, L)) - dunst * 0.05 * (1 - glatt(0, 0.35, L));
  const s1 = p.ParametricShadowSplit / 100, s2 = p.ParametricMidtoneSplit / 100, s3 = p.ParametricHighlightSplit / 100;
  [[p.ParametricShadows, s1 / 2, s1 / 1.6], [p.ParametricDarks, (s1 + s2) / 2, (s2 - s1) / 1.4 + 0.05], [p.ParametricLights, (s2 + s3) / 2, (s3 - s2) / 1.4 + 0.05], [p.ParametricHighlights, (s3 + 1) / 2, (1 - s3) / 1.6 + 0.03]]
    .forEach(([wert, mitte, breite]) => { if (wert) L += (wert / 100) * 0.16 * Math.exp(-(((L - mitte) / breite) ** 2)); });
  L = klemmen(L, 0, 1.2);
  if (L0 > 1e-4) { const f = L / L0; r *= f; g *= f; b *= f; } else { r += L; g += L; b += L; }
  const max = Math.max(r, g, b);
  if (max > 1) { const k = 1 / max; r = (r * k + Math.min(r, 1)) / 2; g = (g * k + Math.min(g, 1)) / 2; b = (b * k + Math.min(b, 1)) / 2; }

  // 3. Gradationskurven
  r = kurve(p.tMaster, r); g = kurve(p.tMaster, g); b = kurve(p.tMaster, b);
  r = kurve(p.tRot, r); g = kurve(p.tGruen, g); b = kurve(p.tBlau, b);

  // 4. HSL, Kalibrierung, Dynamik und Sättigung
  let [h, s, l] = rgbZuHsl(r, g, b);
  if (s > 0.001) {
    const gw = bandGewichte(h);
    let dh = 0, fs = 0, fl = 0;
    for (let i = 0; i < 8; i++) { dh += gw[i] * p.HslHue[i]; fs += gw[i] * p.HslSat[i]; fl += gw[i] * p.HslLum[i]; }
    dh = dh * 0.3 + (gw[0] * p.RedHue + (gw[2] * 0.5 + gw[3] + gw[4] * 0.5) * p.GreenHue + (gw[5] + gw[6] * 0.5) * p.BlueHue) * 0.12;
    fs += gw[0] * p.RedSaturation * 0.5 + (gw[3] + gw[2] * 0.5) * p.GreenSaturation * 0.5 + gw[5] * p.BlueSaturation * 0.5;
    h = (h + dh * Math.min(1, s * 3) + 360) % 360;
    s = klemmen(s * Math.max(0, 1 + fs / 100));
    l = klemmen(l + (fl / 100) * 0.28 * s * (1 - Math.abs(2 * l - 1) * 0.6));
  }
  s = klemmen(s * (1 + p.Saturation / 100));
  const v = p.Vibrance / 100;
  s = klemmen(s + v * 0.7 * s * (1 - s) * (v > 0 ? 1 : 1.2));
  s = klemmen(s * (1 + dunst * 0.25));
  [r, g, b] = hslZuRgb(h, s, l);

  // 5. Color Grading (Tiefen, Mitteltöne, Lichter), Helligkeit bleibt erhalten
  const Lc = helligkeit(r, g, b), bal = p.SplitToningBalance / 100, pivot = klemmen(0.5 - 0.22 * bal, 0.2, 0.8), weich = 0.5 + (p.ColorGradeBlending / 100) * 0.5;
  const tiefe = Math.pow(klemmen(1 - Lc / pivot), 1 / weich), licht = Math.pow(klemmen((Lc - pivot) / (1 - pivot)), 1 / weich), mitte = klemmen(1 - Math.abs(Lc - 0.5) * 2);
  [[p.SplitToningShadowHue, p.SplitToningShadowSaturation, tiefe], [p.SplitToningHighlightHue, p.SplitToningHighlightSaturation, licht], [p.ColorGradeMidtoneHue, p.ColorGradeMidtoneSat, mitte], [p.ColorGradeGlobalHue, p.ColorGradeGlobalSat, 1]]
    .forEach(([ton, satt, gewicht]) => {
      if (!satt || !gewicht) return;
      const [tr, tg, tb] = hslZuRgb(ton, 1, 0.5), k = (satt / 100) * 0.32 * gewicht;
      r += (tr - 0.5) * k; g += (tg - 0.5) * k; b += (tb - 0.5) * k;
    });
  const dl = Lc - helligkeit(r, g, b);
  r += dl; g += dl; b += dl;
  if (p.Grau) { const y = helligkeit(r, g, b); r = g = b = y; }
  return [klemmen(r), klemmen(g), klemmen(b)];
};

/* ---------- 3D-Farbtabelle ---------- */
const N = 33;
const tabelleBauen = (w) => {
  const p = vorbereiten(w), lut = new Float32Array(N * N * N * 3);
  let i = 0;
  for (let bi = 0; bi < N; bi++) for (let gi = 0; gi < N; gi++) for (let ri = 0; ri < N; ri++) {
    const [r, g, b] = bearbeiten(p, ri / (N - 1), gi / (N - 1), bi / (N - 1));
    lut[i++] = r; lut[i++] = g; lut[i++] = b;
  }
  return lut;
};
const tabellen = new Map();
const tabelle = (i) => { if (!tabellen.has(i)) tabellen.set(i, tabelleBauen(LOOKS[i].w)); return tabellen.get(i); };

// Farbtabelle (trilinear) und Klarheit/Vignette auf Bilddaten anwenden
const anwenden = async (quelle, w, h, lookIndex, staerke, pause = false) => {
  const lut = tabelle(lookIndex), p = LOOKS[lookIndex].w, aus = new Uint8ClampedArray(quelle.length), S = (N - 1) / 255;
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
