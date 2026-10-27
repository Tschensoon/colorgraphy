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

/* ---------- Foto-Splitter: ein Foto in mehrere Teile schneiden ---------- */
(() => {
  const ARTEN = {
    karussell: {
      formate: [["4:5", 1080, 1350], ["1:1", 1080, 1080], ["3:4", 1080, 1440]],
      hinweis: "Instagram zeigt alle Bilder eines Karussells im Format des ersten Bildes, deshalb haben alle Teile dasselbe Format.",
      anleitung: (n) => `So postest du es: neuen Beitrag erstellen, mehrere Bilder auswählen und die Teile in der Reihenfolge 1 bis ${n} antippen. Beim Durchwischen entsteht ein nahtloses Panorama.`,
    },
    raster: {
      formate: [["3:4", 1080, 1440], ["1:1", 1080, 1080]],
      hinweis: "Das Instagram-Profil zeigt Beiträge seit 2025 im Format 3:4. Nimm 1:1 nur, wenn dein Raster noch quadratisch ist.",
      anleitung: (n) => `So postest du es: jedes Teil als eigenen Beitrag posten, angefangen mit Nr. 1 (unten rechts) bis Nr. ${n} (oben links). Das zuletzt gepostete Bild erscheint im Profil oben links. Dazwischen nichts anderes posten und angepinnte Beiträge vorher lösen.`,
    },
    frei: {
      formate: [["Original", 0, 0], ["1:1", 1080, 1080], ["4:5", 1080, 1350]],
      hinweis: "„Original“ teilt das ganze Foto ohne Zuschnitt in gleich große Stücke.",
      anleitung: () => "Die Teile sind von links oben nach rechts unten nummeriert.",
    },
  };
  const VORGABE = { karussell: [3, 1], raster: [3, 2], frei: [3, 3] };
  let foto = null, fw0 = 0, fh0 = 0, basis = "foto", stufenP = [];
  let art = "karussell", fmt = 0, spalten = 3, reihen = 1, zoomP = 1, mx = 0, my = 0;

  /* Foto laden (eigene Ablage oder aus dem Zuschneider) */
  const pAblage = $("p-ablage"), pDatei = $("p-datei");
  const pMelden = (t, i) => { $("p-ablage-titel").textContent = t; $("p-ablage-info").textContent = i; };
  const fotoSetzen = (img, dateiname) => {
    foto = img; fw0 = img.naturalWidth; fh0 = img.naturalHeight; stufenP = [];
    basis = (dateiname.replace(/\.[^.]+$/, "").normalize("NFKD").replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "foto").slice(0, 40);
    mx = fw0 / 2; my = fh0 / 2;
    pAblage.classList.add("geladen");
    pMelden("✓ " + dateiname, `${fw0} × ${fh0} px · Tippen, um ein anderes Foto zu wählen`);
    $("p-leer").hidden = true; $("p-vorschau").hidden = false;
    $("p-zip").disabled = false; $("p-teilen").disabled = false;
    $("p-uebernehmen").hidden = true;
    pAktualisieren();
  };
  const pLaden = (datei) => {
    if (!datei) return;
    const url = URL.createObjectURL(datei), img = new Image();
    pMelden("Foto wird geöffnet …", datei.name);
    img.onload = () => fotoSetzen(img, datei.name);
    img.onerror = () => { URL.revokeObjectURL(url); pMelden("Foto lässt sich nicht öffnen", "Dein Browser kann dieses Format nicht lesen (z. B. HEIC außerhalb von Safari). Speichere es als JPG."); };
    img.src = url;
  };
  pDatei.addEventListener("change", () => pLaden(pDatei.files[0]));
  ["dragenter", "dragover"].forEach((t) => pAblage.addEventListener(t, (e) => { e.preventDefault(); pAblage.classList.add("drueber"); }));
  ["dragleave", "drop"].forEach((t) => pAblage.addEventListener(t, () => pAblage.classList.remove("drueber")));
  pAblage.addEventListener("drop", (e) => { e.preventDefault(); pLaden(e.dataTransfer.files[0]); });
  // Ist oben im Zuschneider schon ein Foto geladen, kann man es übernehmen
  setInterval(() => { if (bild && !foto) $("p-uebernehmen").hidden = false; }, 800);
  $("p-uebernehmen").addEventListener("click", () => bild && fotoSetzen(bild, basisName + ".jpg"));

  /* Geometrie: Gesamtgröße, Teilgröße und welcher Bereich des Fotos genutzt wird */
  const geo = () => {
    const [, w, h] = ARTEN[art].formate[fmt];
    if (!w) {
      const k = Math.min(1, 2160 / Math.max(fw0 / spalten, fh0 / reihen));
      const tw = Math.max(1, Math.floor((fw0 * k) / spalten)), th = Math.max(1, Math.floor((fh0 * k) / reihen));
      return { tw, th, W: tw * spalten, H: th * reihen, sx: (tw * spalten) / fw0, sy: (th * reihen) / fh0, x0: 0, y0: 0, original: true };
    }
    const W = w * spalten, H = h * reihen, s = Math.max(W / fw0, H / fh0) * zoomP, hw = W / (2 * s), hh = H / (2 * s);
    mx = klemmen(mx, hw, fw0 - hw); my = klemmen(my, hh, fh0 - hh);
    return { tw: w, th: h, W, H, sx: s, sy: s, x0: mx - hw, y0: my - hh };
  };
  const quelleP = (s) => {
    let src = foto, f = 1, i = 0;
    while (s / f < 0.5 && Math.min(fw0 * f, fh0 * f) > 128) {
      f /= 2; i++;
      if (!stufenP[i]) {
        const c = document.createElement("canvas"); c.width = Math.round(fw0 * f); c.height = Math.round(fh0 * f);
        const g = c.getContext("2d"); g.imageSmoothingQuality = "high"; g.drawImage(stufenP[i - 1] || foto, 0, 0, c.width, c.height);
        stufenP[i] = c;
      }
      src = stufenP[i];
    }
    return { src, f };
  };
  // Bereich (in Ausgabe-Pixeln des Gesamtbilds) auf eine Zielfläche zeichnen
  const bereich = (g, G, ax, ay, aw, ah, zw, zh) => {
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
    const { src, f } = quelleP(Math.min(G.sx, G.sy) * Math.min(zw / aw, zh / ah));
    g.drawImage(src, (G.x0 + ax / G.sx) * f, (G.y0 + ay / G.sy) * f, (aw / G.sx) * f, (ah / G.sy) * f, 0, 0, zw, zh);
  };
  const nummer = (r, c) => art === "karussell" ? c + 1 : art === "raster" ? spalten * reihen - (r * spalten + c) : r * spalten + c + 1;

  /* Vorschau mit Trennlinien und Nummern */
  const pv = $("p-vorschau");
  let pvSkala = 1;
  const pZeigen = () => {
    if (!foto) return;
    const G = geo(), box = $("p-rahmen").getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    const sk = Math.min(box.width / G.W, Math.min(innerHeight * 0.6, 520) / G.H), cw = Math.round(G.W * sk), ch = Math.round(G.H * sk);
    pv.style.width = cw + "px"; pv.style.height = ch + "px";
    pv.width = Math.round(cw * dpr); pv.height = Math.round(ch * dpr);
    pvSkala = sk;
    const g = pv.getContext("2d");
    bereich(g, G, 0, 0, G.W, G.H, pv.width, pv.height);
    const zx = pv.width / spalten, zy = pv.height / reihen, linie = Math.max(2, pv.width / 400);
    g.strokeStyle = "rgba(0,0,0,.45)"; g.lineWidth = linie * 2.2; g.beginPath();
    for (let c = 1; c < spalten; c++) { g.moveTo(c * zx, 0); g.lineTo(c * zx, pv.height); }
    for (let r = 1; r < reihen; r++) { g.moveTo(0, r * zy); g.lineTo(pv.width, r * zy); }
    g.stroke();
    g.strokeStyle = "#ffffff"; g.lineWidth = linie; g.stroke();
    const rad = Math.max(11, Math.min(zx, zy) * 0.11) ;
    g.font = `700 ${rad * 1.05}px Figtree, Arial, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
    for (let r = 0; r < reihen; r++) for (let c = 0; c < spalten; c++) {
      const x = (c + 0.5) * zx, y = (r + 0.5) * zy;
      g.fillStyle = "rgba(10,8,20,.72)"; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#ffffff"; g.fillText(String(nummer(r, c)), x, y + rad * 0.06);
    }
  };

  /* Teile erzeugen */
  const teilDateiname = (n, G) => `${basis}-${art}-${String(n).padStart(2, "0")}-von-${String(spalten * reihen).padStart(2, "0")}-${G.tw}x${G.th}.jpg`;
  const alleTeile = async () => {
    const G = geo(), liste = [];
    for (let r = 0; r < reihen; r++) for (let c = 0; c < spalten; c++) {
      const cv = document.createElement("canvas"); cv.width = G.tw; cv.height = G.th;
      bereich(cv.getContext("2d"), G, c * G.tw, r * G.th, G.tw, G.th, G.tw, G.th);
      const blob = await new Promise((f) => cv.toBlob(f, "image/jpeg", 0.92));
      liste.push({ n: nummer(r, c), name: teilDateiname(nummer(r, c), G), blob });
    }
    return liste.sort((a, b) => a.n - b.n);
  };

  /* Minimales ZIP (ohne Kompression, JPGs sind schon komprimiert) */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (u) => { let c = 0xffffffff; for (let i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const zipBauen = async (dateien) => {
    const teile = [], zentral = [], enc = new TextEncoder();
    let pos = 0;
    for (const d of dateien) {
      const daten = new Uint8Array(await d.blob.arrayBuffer()), n = enc.encode(d.name), crc = crc32(daten), len = daten.length;
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(12, 0x21, true);
      h.setUint32(14, crc, true); h.setUint32(18, len, true); h.setUint32(22, len, true); h.setUint16(26, n.length, true);
      teile.push(h, n, daten);
      const z = new DataView(new ArrayBuffer(46));
      z.setUint32(0, 0x02014b50, true); z.setUint16(4, 20, true); z.setUint16(6, 20, true); z.setUint16(8, 0x0800, true); z.setUint16(14, 0x21, true);
      z.setUint32(16, crc, true); z.setUint32(20, len, true); z.setUint32(24, len, true); z.setUint16(28, n.length, true); z.setUint32(42, pos, true);
      zentral.push(z, n);
      pos += 30 + n.length + len;
    }
    const groesse = zentral.reduce((a, x) => a + x.byteLength, 0), e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, dateien.length, true); e.setUint16(10, dateien.length, true); e.setUint32(12, groesse, true); e.setUint32(16, pos, true);
    return new Blob([...teile, ...zentral, e], { type: "application/zip" });
  };
  const speichern = (blob, name) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };

  /* Oberfläche */
  const formatKnoepfeP = () => {
    $("p-formate").innerHTML = "";
    ARTEN[art].formate.forEach(([name, w, h], i) => {
      const b = document.createElement("button");
      b.type = "button"; b.setAttribute("aria-pressed", String(i === fmt));
      b.textContent = w ? `${name} · ${w} × ${h}` : name;
      b.addEventListener("click", () => { fmt = i; formatKnoepfeP(); pAktualisieren(); });
      $("p-formate").append(b);
    });
  };
  const pAktualisieren = () => {
    const istRaster = art === "raster", istFrei = art === "frei", original = !ARTEN[art].formate[fmt][1];
    $("p-spalten-name").textContent = art === "karussell" ? "Anzahl Bilder" : "Spalten";
    $("p-zeile-spalten").hidden = istRaster;
    $("p-zeile-reihen").hidden = art === "karussell";
    $("p-spalten").max = istFrei ? 5 : 10; $("p-spalten").min = istFrei ? 1 : 2;
    $("p-spalten").value = spalten; $("p-reihen").value = reihen;
    $("o-spalten").textContent = spalten; $("o-reihen").textContent = reihen;
    $("p-zoom-zeile").hidden = original; $("p-tipp").textContent = original ? "Die Zahlen zeigen die Reihenfolge der Teile." : "Zum Verschieben das Bild in der Vorschau ziehen. Die Zahlen zeigen die Reihenfolge.";
    $("p-hinweis").textContent = ARTEN[art].hinweis;
    const n = spalten * reihen;
    $("p-anleitung").textContent = ARTEN[art].anleitung(n);
    if (!foto) return;
    const G = geo();
    $("p-ergebnis").innerHTML = `${n} Bilder à ${G.tw} × ${G.th} px<small>zusammen ${G.W} × ${G.H} px · JPG ohne Metadaten und Standortdaten</small>`;
    const faktor = Math.max(G.sx, G.sy), warn = $("p-warnung");
    warn.hidden = faktor <= 1.02;
    if (!warn.hidden) warn.textContent = `Für ${n} Bilder in dieser Größe hat dein Foto zu wenige Pixel und wird um das ${faktor.toFixed(1).replace(".", ",")}-Fache vergrößert. Weniger Teile, weniger Zoom oder ein größeres Foto helfen.`;
    $("p-teile").innerHTML = "";
    for (let i = 1; i <= n; i++) {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = i; b.setAttribute("aria-label", `Teil ${i} einzeln laden`);
      b.addEventListener("click", async () => { const t = (await alleTeile()).find((x) => x.n === i); speichern(t.blob, t.name); });
      $("p-teile").append(b);
    }
    pZeigen();
  };
  document.querySelectorAll("#p-arten button").forEach((b) => b.addEventListener("click", () => {
    art = b.dataset.a; fmt = 0; [spalten, reihen] = VORGABE[art]; zoomP = 1; $("p-zoom").value = 1; $("o-pzoom").textContent = "100 %";
    if (foto) { mx = fw0 / 2; my = fh0 / 2; }
    document.querySelectorAll("#p-arten button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    formatKnoepfeP(); pAktualisieren();
  }));
  $("p-spalten").addEventListener("input", () => { spalten = Number($("p-spalten").value); pAktualisieren(); });
  $("p-reihen").addEventListener("input", () => { reihen = Number($("p-reihen").value); pAktualisieren(); });
  $("p-zoom").addEventListener("input", () => { zoomP = Number($("p-zoom").value); $("o-pzoom").textContent = Math.round(zoomP * 100) + " %"; pAktualisieren(); });
  let ziehen = null;
  pv.addEventListener("pointerdown", (e) => { if (!foto) return; ziehen = [e.clientX, e.clientY]; pv.setPointerCapture(e.pointerId); });
  pv.addEventListener("pointermove", (e) => {
    if (!ziehen) return;
    const G = geo();
    mx -= (e.clientX - ziehen[0]) / (pvSkala * G.sx); my -= (e.clientY - ziehen[1]) / (pvSkala * G.sy);
    ziehen = [e.clientX, e.clientY]; pZeigen();
  });
  ["pointerup", "pointercancel"].forEach((t) => pv.addEventListener(t, () => (ziehen = null)));
  pv.addEventListener("keydown", (e) => {
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!d || !foto) return;
    e.preventDefault(); mx += d[0] * fw0 * 0.02; my += d[1] * fh0 * 0.02; pZeigen();
  });
  $("p-zip").addEventListener("click", async () => {
    if (!foto) return;
    const knopf = $("p-zip"), text = knopf.textContent;
    knopf.textContent = "Wird erstellt …"; knopf.disabled = true;
    try { speichern(await zipBauen(await alleTeile()), `${basis}-${art}-${spalten}x${reihen}.zip`); }
    finally { knopf.textContent = text; knopf.disabled = false; }
  });
  const kannAlleTeilen = (() => { try { return !!(navigator.canShare && navigator.canShare({ files: [new File([""], "a.jpg", { type: "image/jpeg" }), new File([""], "b.jpg", { type: "image/jpeg" })] })); } catch (e) { return false; } })();
  if (kannAlleTeilen) $("p-teilen").hidden = false;
  $("p-teilen").addEventListener("click", async () => {
    if (!foto) return;
    const dateien = (await alleTeile()).map((t) => new File([t.blob], t.name, { type: "image/jpeg" }));
    try { await navigator.share({ files: dateien }); } catch (e) {}
  });
  let pBreite = 0;
  new ResizeObserver(() => { const w = Math.round($("p-rahmen").getBoundingClientRect().width); if (w !== pBreite) { pBreite = w; pZeigen(); } }).observe($("p-rahmen"));
  formatKnoepfeP(); pAktualisieren();
})();

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
