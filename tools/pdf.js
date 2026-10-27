// PDF-Werkzeug: PDFs und Bilder laden, Seiten ordnen, drehen, löschen, zusammenfügen, aufteilen,
// Seitenzahlen und Wasserzeichen setzen, in Bilder umwandeln, komprimieren und Text herausholen.
// Alles passiert im Browser. Bibliotheken: pdf-lib (MIT) zum Bearbeiten, pdf.js (Apache 2.0) für Vorschau und Bilder.
"use strict";

const $ = (id) => document.getElementById(id);
const klemmen = (x, a, b) => Math.min(b, Math.max(a, x));
let PDFLib = null, pdfjs = null;
const dateien = []; // { name, art: "pdf"|"bild", daten: Uint8Array, doc (pdf.js), img }
let seiten = []; // { id, datei, nr, drehung, auswahl, leer?, breite?, hoehe? }
let zaehler = 0, beschaeftigt = false;
const vorschauCache = new Map();

/* ---------- Bibliotheken erst laden, wenn sie gebraucht werden ---------- */
const bibliotheken = async () => {
  if (!PDFLib) {
    await new Promise((ok, fehler) => {
      const s = document.createElement("script");
      s.src = new URL("../vendor/pdf-lib/pdf-lib.min.js", location.href).href;
      s.onload = ok; s.onerror = fehler;
      document.head.append(s);
    });
    PDFLib = window.PDFLib;
  }
  if (!pdfjs) {
    pdfjs = await import(new URL("../vendor/pdfjs/pdf.min.js", location.href).href);
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("../vendor/pdfjs/pdf.worker.min.js", location.href).href;
  }
};

/* ---------- Hilfen ---------- */
const status = (text) => { $("pdf-status").textContent = text || ""; };
const ergebnis = (text) => { $("pdf-ergebnis").textContent = text || ""; };
const groesseText = (b) => b < 1024 * 1024 ? Math.max(1, Math.round(b / 1024)) + " KB" : (b / 1024 / 1024).toFixed(1).replace(".", ",") + " MB";
const basisName = () => {
  const namen = [...new Set(seiten.filter((s) => !s.leer).map((s) => dateien[s.datei].name))];
  if (namen.length !== 1) return "dokument";
  return namen[0].replace(/\.[^.]+$/, "").normalize("NFKD").replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase().slice(0, 50) || "dokument";
};
const speichern = (blob, name) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 8000);
};
const bildLaden = (blob) => new Promise((ok, fehler) => {
  const img = new Image();
  img.onload = () => ok(img); img.onerror = fehler;
  img.src = URL.createObjectURL(blob);
});
const leerlauf = () => new Promise((r) => setTimeout(r, 0));

/* ---------- Dateien hinzufügen ---------- */
const hinzufuegen = async (liste) => {
  liste = [...liste];
  if (!liste.length || beschaeftigt) return;
  beschaeftigt = true;
  try {
    status("Wird geöffnet …");
    await bibliotheken();
    const meldungen = [];
    for (const f of liste) {
      const daten = new Uint8Array(await f.arrayBuffer());
      if (f.type === "application/pdf" || /\.pdf$/i.test(f.name)) {
        try {
          const doc = await pdfjs.getDocument({ data: daten.slice(), isEvalSupported: false }).promise;
          const i = dateien.push({ name: f.name, art: "pdf", daten, doc }) - 1;
          for (let n = 0; n < doc.numPages; n++) seiten.push({ id: ++zaehler, datei: i, nr: n, drehung: 0, auswahl: false });
          if (i === 0 || !$("meta-titel").value) eigenschaftenVorschlagen(doc);
        } catch (e) {
          meldungen.push(e && e.name === "PasswordException" ? `„${f.name}“ ist mit einem Passwort geschützt und kann nicht geöffnet werden.` : `„${f.name}“ ist kein lesbares PDF.`);
        }
      } else if (/^image\//.test(f.type)) {
        try {
          const img = await bildLaden(f);
          const i = dateien.push({ name: f.name, art: "bild", daten, img, typ: f.type }) - 1;
          seiten.push({ id: ++zaehler, datei: i, nr: 0, drehung: 0, auswahl: false });
        } catch (e) { meldungen.push(`„${f.name}“ lässt sich nicht öffnen.`); }
      } else {
        meldungen.push(`„${f.name}“ ist weder PDF noch Bild.`);
      }
    }
    status(meldungen.join(" "));
    zeichnen();
  } finally { beschaeftigt = false; }
};
const eigenschaftenVorschlagen = async (doc) => {
  try {
    const { info } = await doc.getMetadata();
    if (info) {
      if (info.Title && !$("meta-titel").value) $("meta-titel").value = info.Title;
      if (info.Author && !$("meta-autor").value) $("meta-autor").value = info.Author;
      if (info.Subject && !$("meta-betreff").value) $("meta-betreff").value = info.Subject;
      if (info.Keywords && !$("meta-stichwoerter").value) $("meta-stichwoerter").value = info.Keywords;
    }
  } catch (e) {}
};
const ablage = $("pdf-ablage"), eingabe = $("pdf-datei");
eingabe.addEventListener("change", () => { hinzufuegen(eingabe.files); eingabe.value = ""; });
["dragenter", "dragover"].forEach((t) => ablage.addEventListener(t, (e) => { e.preventDefault(); ablage.classList.add("drueber"); }));
["dragleave", "drop"].forEach((t) => ablage.addEventListener(t, () => ablage.classList.remove("drueber")));
ablage.addEventListener("drop", (e) => { e.preventDefault(); hinzufuegen(e.dataTransfer.files); });
["dragover", "drop"].forEach((t) => addEventListener(t, (e) => { if (e.dataTransfer && [...e.dataTransfer.types].includes("Files")) e.preventDefault(); }));

/* ---------- Vorschaubilder ---------- */
const warteschlange = [];
let laufend = 0;
const vorschauHolen = (s) => {
  const schluessel = s.leer ? "leer" : `${s.datei}:${s.nr}`;
  if (vorschauCache.has(schluessel)) return Promise.resolve(vorschauCache.get(schluessel));
  return new Promise((ok) => { warteschlange.push({ s, schluessel, ok }); naechsteVorschau(); });
};
const naechsteVorschau = async () => {
  if (laufend >= 2 || !warteschlange.length) return;
  laufend++;
  const { s, schluessel, ok } = warteschlange.shift();
  let url = "";
  try {
    if (vorschauCache.has(schluessel)) url = vorschauCache.get(schluessel);
    else {
      const c = await seiteZeichnen(s, 0, 220);
      url = c.toDataURL("image/jpeg", 0.8);
      vorschauCache.set(schluessel, url);
    }
  } catch (e) {}
  laufend--;
  ok(url);
  naechsteVorschau();
};

// Seite auf ein Canvas zeichnen: entweder mit dpi oder mit fester Breite (für Vorschauen, ohne Drehung)
const seiteZeichnen = async (s, dpi, festeBreite = 0, mitDrehung = false) => {
  const c = document.createElement("canvas"), g = c.getContext("2d");
  if (s.leer) {
    const sk = festeBreite ? festeBreite / s.breite : dpi / 72;
    const quer = mitDrehung && s.drehung % 180;
    c.width = Math.round((quer ? s.hoehe : s.breite) * sk); c.height = Math.round((quer ? s.breite : s.hoehe) * sk);
    g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
    return c;
  }
  const d = dateien[s.datei];
  if (d.art === "pdf") {
    const p = await d.doc.getPage(s.nr + 1);
    const drehung = mitDrehung ? (p.rotate + s.drehung) % 360 : p.rotate;
    const basis = p.getViewport({ scale: 1, rotation: drehung });
    let skala = festeBreite ? festeBreite / basis.width : dpi / 72;
    skala = Math.min(skala, Math.sqrt(30e6 / (basis.width * basis.height))); // Speicher schonen
    const vp = p.getViewport({ scale: skala, rotation: drehung });
    c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
    g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
    await p.render({ canvasContext: g, viewport: vp }).promise;
    return c;
  }
  // Bild
  const img = d.img, w = img.naturalWidth, h = img.naturalHeight, quer = mitDrehung && s.drehung % 180;
  let skala = festeBreite ? festeBreite / w : 1;
  skala = Math.min(skala, Math.sqrt(30e6 / (w * h)));
  c.width = Math.round((quer ? h : w) * skala); c.height = Math.round((quer ? w : h) * skala);
  g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
  g.translate(c.width / 2, c.height / 2);
  if (mitDrehung) g.rotate((s.drehung * Math.PI) / 180);
  g.imageSmoothingQuality = "high";
  g.drawImage(img, (-w * skala) / 2, (-h * skala) / 2, w * skala, h * skala);
  return c;
};

/* ---------- Seitenraster ---------- */
const raster = $("pdf-raster");
const zeichnen = () => {
  const n = seiten.length, gewaehlt = seiten.filter((s) => s.auswahl).length;
  const anzahlDateien = new Set(seiten.filter((s) => !s.leer).map((s) => s.datei)).size;
  $("pdf-info").textContent = n ? `${n} ${n === 1 ? "Seite" : "Seiten"} aus ${anzahlDateien} ${anzahlDateien === 1 ? "Datei" : "Dateien"}${gewaehlt ? ` · ${gewaehlt} ausgewählt` : ""}` : "Noch keine Seiten.";
  $("pdf-ablage-titel").textContent = n ? "Weitere PDFs oder Bilder hinzufügen" : "PDFs und Bilder hierher ziehen oder tippen";
  document.querySelector('[data-aktion="alle"]').textContent = n && gewaehlt === n ? "Auswahl aufheben" : "Alle auswählen";
  document.querySelector('[data-aktion="loeschen"]').disabled = !gewaehlt;
  ["drehen", "umkehren", "neu", "alle"].forEach((a) => (document.querySelector(`[data-aktion="${a}"]`).disabled = !n));
  ["ex-pdf", "ex-teilen", "ex-bilder", "ex-komprimieren", "ex-text"].forEach((id) => ($(id).disabled = !n || beschaeftigt));
  $("ex-auswahl").disabled = !gewaehlt || beschaeftigt;
  $("ex-text").disabled = !seiten.some((s) => !s.leer && dateien[s.datei].art === "pdf") || beschaeftigt;

  raster.innerHTML = "";
  seiten.forEach((s, i) => {
    const d = s.leer ? null : dateien[s.datei];
    const karte = document.createElement("div");
    karte.className = "pdf-seite" + (s.auswahl ? " gewaehlt" : "");
    karte.dataset.id = s.id;
    karte.innerHTML = `
      <button type="button" class="ps-bild" aria-pressed="${s.auswahl}" aria-label="Seite ${i + 1} ${s.auswahl ? "abwählen" : "auswählen"}"><span class="ps-rahmen"><img alt="" style="transform:rotate(${s.drehung}deg)"></span><span class="ps-haken" aria-hidden="true">✓</span></button>
      <div class="ps-kopf"><button type="button" class="ps-griff" aria-label="Seite ${i + 1} verschieben" title="Ziehen zum Verschieben">⠿</button><span class="ps-nr">${i + 1}</span></div>
      <span class="ps-quelle"></span>
      <div class="ps-aktionen">
        <button type="button" data-a="links" aria-label="Seite ${i + 1} nach vorne" ${i === 0 ? "disabled" : ""}>‹</button>
        <button type="button" data-a="links-drehen" aria-label="Seite ${i + 1} nach links drehen">↺</button>
        <button type="button" data-a="rechts-drehen" aria-label="Seite ${i + 1} nach rechts drehen">↻</button>
        <button type="button" data-a="doppeln" aria-label="Seite ${i + 1} duplizieren">⧉</button>
        <button type="button" data-a="weg" aria-label="Seite ${i + 1} löschen">✕</button>
        <button type="button" data-a="rechts" aria-label="Seite ${i + 1} nach hinten" ${i === n - 1 ? "disabled" : ""}>›</button>
      </div>`;
    karte.querySelector(".ps-quelle").textContent = s.leer ? "Leere Seite" : d.art === "pdf" ? `${d.name} · S. ${s.nr + 1}` : d.name;
    raster.append(karte);
    vorschauHolen(s).then((url) => { const img = karte.querySelector("img"); if (img && url) img.src = url; });
  });
};

const finden = (el) => seiten.findIndex((s) => String(s.id) === el.closest(".pdf-seite").dataset.id);
raster.addEventListener("click", (e) => {
  const knopf = e.target.closest("button");
  if (!knopf || knopf.classList.contains("ps-griff")) return;
  const i = finden(knopf), s = seiten[i];
  if (knopf.classList.contains("ps-bild")) s.auswahl = !s.auswahl;
  else {
    const a = knopf.dataset.a;
    if (a === "links" && i > 0) [seiten[i - 1], seiten[i]] = [seiten[i], seiten[i - 1]];
    if (a === "rechts" && i < seiten.length - 1) [seiten[i + 1], seiten[i]] = [seiten[i], seiten[i + 1]];
    if (a === "links-drehen") s.drehung = (s.drehung + 270) % 360;
    if (a === "rechts-drehen") s.drehung = (s.drehung + 90) % 360;
    if (a === "doppeln") seiten.splice(i + 1, 0, { ...s, id: ++zaehler, auswahl: false });
    if (a === "weg") seiten.splice(i, 1);
  }
  zeichnen();
});

// Verschieben per Ziehen am Griff (Maus und Finger)
let ziehen = null;
raster.addEventListener("pointerdown", (e) => {
  const griff = e.target.closest(".ps-griff");
  if (!griff) return;
  e.preventDefault();
  griff.setPointerCapture(e.pointerId);
  ziehen = { von: finden(griff), karte: griff.closest(".pdf-seite"), ziel: null, nach: false };
  ziehen.karte.classList.add("zieht");
});
raster.addEventListener("pointermove", (e) => {
  if (!ziehen) return;
  if (e.clientY < 70) scrollBy(0, -12); else if (e.clientY > innerHeight - 70) scrollBy(0, 12);
  const unter = document.elementFromPoint(e.clientX, e.clientY);
  const karte = unter && unter.closest && unter.closest(".pdf-seite");
  raster.querySelectorAll(".ziel-vor,.ziel-nach").forEach((k) => k.classList.remove("ziel-vor", "ziel-nach"));
  if (!karte || karte === ziehen.karte) { ziehen.ziel = null; return; }
  const r = karte.getBoundingClientRect();
  ziehen.ziel = finden(karte); ziehen.nach = e.clientX > r.left + r.width / 2;
  karte.classList.add(ziehen.nach ? "ziel-nach" : "ziel-vor");
});
const ziehenEnde = () => {
  if (!ziehen) return;
  const { von, ziel, nach } = ziehen;
  ziehen = null;
  if (ziel !== null) {
    const [s] = seiten.splice(von, 1);
    let neu = ziel + (nach ? 1 : 0);
    if (von < neu) neu--;
    seiten.splice(neu, 0, s);
  }
  zeichnen();
};
raster.addEventListener("pointerup", ziehenEnde);
raster.addEventListener("pointercancel", ziehenEnde);

// Werkzeugleiste
document.querySelector(".pdf-leiste").addEventListener("click", (e) => {
  const a = e.target.closest("button")?.dataset.aktion;
  if (!a) return;
  const gewaehlt = seiten.filter((s) => s.auswahl);
  if (a === "alle") { const alle = gewaehlt.length === seiten.length; seiten.forEach((s) => (s.auswahl = !alle)); }
  if (a === "drehen") (gewaehlt.length ? gewaehlt : seiten).forEach((s) => (s.drehung = (s.drehung + 90) % 360));
  if (a === "loeschen") seiten = seiten.filter((s) => !s.auswahl);
  if (a === "umkehren") seiten.reverse();
  if (a === "leer") {
    const ziel = seiten.findLastIndex ? seiten.findLastIndex((s) => s.auswahl) : -1;
    seiten.splice(ziel >= 0 ? ziel + 1 : seiten.length, 0, { id: ++zaehler, leer: true, breite: 595.28, hoehe: 841.89, drehung: 0, auswahl: false });
  }
  if (a === "neu" && confirm("Alle Seiten entfernen und neu anfangen?")) { seiten = []; ergebnis(""); status(""); }
  zeichnen();
});

/* ---------- PDF erzeugen ---------- */
const MM = 72 / 25.4;
const quellCache = new Map();
const quelle = async (i) => {
  if (!quellCache.has(i)) {
    let q = null;
    try { q = await PDFLib.PDFDocument.load(dateien[i].daten, { updateMetadata: false }); } catch (e) { q = null; }
    quellCache.set(i, q);
  }
  return quellCache.get(i);
};
const einstellungen = () => ({
  nummern: $("opt-nummern").checked && { format: $("nr-format").value, position: $("nr-position").value, groesse: +$("nr-groesse").value, start: +$("nr-start").value || 0, deckblatt: $("nr-deckblatt").checked },
  wasser: $("opt-wasser").checked && $("wz-text").value.trim() && { text: $("wz-text").value.trim(), lage: $("wz-lage").value, farbe: $("wz-farbe").value, deckkraft: +$("wz-deckkraft").value },
  meta: { titel: $("meta-titel").value.trim(), autor: $("meta-autor").value.trim(), betreff: $("meta-betreff").value.trim(), stichwoerter: $("meta-stichwoerter").value.trim(), leeren: $("meta-leeren").checked },
  bildFormat: $("bild-format").value, bildRand: +$("bild-rand").value,
});

// Seiten in ein neues Dokument übernehmen (Seiten aus derselben Datei gemeinsam kopieren, das hält die Datei klein)
const seitenUebernehmen = async (ziel, liste, opt, fortschritt) => {
  const kopien = new Map();
  for (const i of new Set(liste.filter((s) => !s.leer && dateien[s.datei].art === "pdf").map((s) => s.datei))) {
    const q = await quelle(i);
    if (!q) continue;
    const nummern = liste.filter((s) => !s.leer && s.datei === i).map((s) => s.nr);
    const kopiert = await ziel.copyPages(q, nummern);
    kopien.set(i, kopiert);
  }
  const zeiger = new Map();
  for (let k = 0; k < liste.length; k++) {
    const s = liste[k];
    fortschritt && fortschritt(k + 1, liste.length);
    if (s.leer) { ziel.addPage([s.breite, s.hoehe]).setRotation(PDFLib.degrees(s.drehung)); continue; }
    const d = dateien[s.datei];
    if (d.art === "pdf" && kopien.has(s.datei)) {
      const pos = zeiger.get(s.datei) || 0; zeiger.set(s.datei, pos + 1);
      const p = ziel.addPage(kopien.get(s.datei)[pos]);
      p.setRotation(PDFLib.degrees((p.getRotation().angle + s.drehung) % 360));
    } else if (d.art === "pdf") {
      // Datei lässt sich nicht bearbeiten (z. B. Kopierschutz): Seite als Bild übernehmen
      const c = await seiteZeichnen(s, 150, 0, true);
      const bild = await ziel.embedJpg(await (await new Promise((r) => c.toBlob(r, "image/jpeg", 0.88))).arrayBuffer());
      const w = (c.width * 72) / 150, h = (c.height * 72) / 150;
      ziel.addPage([w, h]).drawImage(bild, { x: 0, y: 0, width: w, height: h });
    } else {
      await bildSeite(ziel, s, opt);
    }
    if (k % 8 === 0) await leerlauf();
  }
};
const bildSeite = async (ziel, s, opt) => {
  const d = dateien[s.datei];
  let bild;
  if (/jpe?g/.test(d.typ)) bild = await ziel.embedJpg(d.daten);
  else if (/png/.test(d.typ)) bild = await ziel.embedPng(d.daten);
  else {
    const c = document.createElement("canvas"); c.width = d.img.naturalWidth; c.height = d.img.naturalHeight;
    c.getContext("2d").drawImage(d.img, 0, 0);
    bild = await ziel.embedPng(await (await new Promise((r) => c.toBlob(r, "image/png"))).arrayBuffer());
  }
  // Seitengröße: das gedrehte Bild bestimmt Hoch- oder Querformat
  const bw = bild.width, bh = bild.height, quer = s.drehung % 180 !== 0;
  const sichtW = quer ? bh : bw, sichtH = quer ? bw : bh;
  let pw, ph;
  if (opt.bildFormat === "bild") { pw = (sichtW * 72) / 150 + 2 * opt.bildRand * MM; ph = (sichtH * 72) / 150 + 2 * opt.bildRand * MM; }
  else {
    const hoch = opt.bildFormat === "a4" || (opt.bildFormat === "a4-auto" && sichtH >= sichtW);
    [pw, ph] = hoch ? [595.28, 841.89] : [841.89, 595.28];
  }
  // Seite wird ungedreht angelegt, das Bild gedreht hineingezeichnet
  const p = ziel.addPage([pw, ph]), rand = opt.bildRand * MM;
  const sk = Math.min((pw - 2 * rand) / sichtW, (ph - 2 * rand) / sichtH), w = bw * sk, h = bh * sk;
  const sw = sichtW * sk, sh = sichtH * sk, x0 = (pw - sw) / 2, y0 = (ph - sh) / 2;
  const r = s.drehung;
  const lage = r === 0 ? { x: x0, y: y0 } : r === 90 ? { x: x0, y: y0 + sh } : r === 180 ? { x: x0 + sw, y: y0 + sh } : { x: x0 + sw, y: y0 };
  p.drawImage(bild, { ...lage, width: w, height: h, rotate: PDFLib.degrees(-r) });
};

// Punkt aus der sichtbaren (gedrehten) Seite in Seitenkoordinaten umrechnen
const umrechnen = (seite, vx, vy) => {
  const { x, y, width: w, height: h } = seite.getMediaBox(), r = ((seite.getRotation().angle % 360) + 360) % 360;
  const p = r === 90 ? [w - vy, vx] : r === 180 ? [w - vx, h - vy] : r === 270 ? [vy, h - vx] : [vx, vy];
  return { x: x + p[0], y: y + p[1], drehung: r, sichtW: r % 180 ? h : w, sichtH: r % 180 ? w : h };
};
const FARBEN = { grau: [0.45, 0.45, 0.48], rot: [0.85, 0.12, 0.15], blau: [0.15, 0.35, 0.85], lila: [0.55, 0.36, 0.96] };
const verzieren = async (doc, opt) => {
  const seitenListe = doc.getPages(), gesamt = seitenListe.length;
  if (opt.nummern) {
    const schrift = await doc.embedFont(PDFLib.StandardFonts.Helvetica), n = opt.nummern, rand = 28;
    seitenListe.forEach((seite, i) => {
      if (n.deckblatt && i === 0) return;
      const zahl = n.start + i - (n.deckblatt ? 1 : 0), letzte = n.start + gesamt - 1 - (n.deckblatt ? 1 : 0);
      const text = n.format.replace("{n}", zahl).replace("{gesamt}", letzte);
      const tw = schrift.widthOfTextAtSize(text, n.groesse), { sichtW, sichtH } = umrechnen(seite, 0, 0);
      const [oben, wo] = n.position.split("-");
      const vx = wo === "links" ? rand : wo === "rechts" ? sichtW - rand - tw : (sichtW - tw) / 2;
      const vy = oben === "oben" ? sichtH - rand - n.groesse : rand;
      const p = umrechnen(seite, vx, vy);
      seite.drawText(text, { x: p.x, y: p.y, size: n.groesse, font: schrift, color: PDFLib.rgb(0.25, 0.25, 0.28), rotate: PDFLib.degrees(p.drehung) });
    });
  }
  if (opt.wasser) {
    const schrift = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold), wz = opt.wasser, [r, g, b] = FARBEN[wz.farbe];
    seitenListe.forEach((seite) => {
      const { sichtW, sichtH } = umrechnen(seite, 0, 0);
      const winkel = wz.lage === "diagonal" ? (Math.atan2(sichtH, sichtW) * 180) / Math.PI : 0;
      const laenge = wz.lage === "diagonal" ? Math.hypot(sichtW, sichtH) * 0.7 : sichtW * 0.8;
      const groesse = klemmen(laenge / schrift.widthOfTextAtSize(wz.text, 1), 12, 160);
      const tw = schrift.widthOfTextAtSize(wz.text, groesse), th = groesse * 0.7, a = (winkel * Math.PI) / 180;
      const vx = sichtW / 2 - Math.cos(a) * tw / 2 + Math.sin(a) * th / 2, vy = sichtH / 2 - Math.sin(a) * tw / 2 - Math.cos(a) * th / 2;
      const p = umrechnen(seite, vx, vy);
      seite.drawText(wz.text, { x: p.x, y: p.y, size: groesse, font: schrift, color: PDFLib.rgb(r, g, b), opacity: wz.deckkraft, rotate: PDFLib.degrees(p.drehung + winkel) });
    });
  }
};
const eigenschaften = (doc, m) => {
  if (m.leeren) {
    doc.setTitle(""); doc.setAuthor(""); doc.setSubject(""); doc.setKeywords([]); doc.setCreator(""); doc.setProducer("");
    return;
  }
  doc.setTitle(m.titel); doc.setAuthor(m.autor); doc.setSubject(m.betreff);
  doc.setKeywords(m.stichwoerter ? m.stichwoerter.split(",").map((w) => w.trim()).filter(Boolean) : []);
  doc.setCreator("PDF-Werkzeug von colorgraphy.de"); doc.setProducer("pdf-lib");
};
const pdfBauen = async (liste, fortschritt) => {
  const opt = einstellungen(), doc = await PDFLib.PDFDocument.create();
  await seitenUebernehmen(doc, liste, opt, fortschritt);
  await verzieren(doc, opt);
  eigenschaften(doc, opt.meta);
  return new Blob([await doc.save({ useObjectStreams: true })], { type: "application/pdf" });
};

/* ---------- ZIP ohne Kompression (PDFs und Bilder sind schon komprimiert) ---------- */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (u) => { let c = 0xffffffff; for (let i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const zipBauen = async (eintraege) => {
  const teile = [], zentral = [], enc = new TextEncoder();
  let pos = 0;
  for (const d of eintraege) {
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
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, eintraege.length, true); e.setUint16(10, eintraege.length, true); e.setUint32(12, groesse, true); e.setUint32(16, pos, true);
  return new Blob([...teile, ...zentral, e], { type: "application/zip" });
};

/* ---------- Aktionen ---------- */
const arbeit = async (knopf, aufgabe) => {
  if (beschaeftigt || !seiten.length) return;
  beschaeftigt = true; zeichnen();
  const text = knopf.textContent;
  knopf.textContent = "Bitte warten …";
  ergebnis("");
  try { await bibliotheken(); await aufgabe(); }
  catch (e) { if (e && e.eingabe) ergebnis(e.message); else { console.error(e); ergebnis("Das hat leider nicht geklappt: " + (e && e.message ? e.message : e)); } }
  finally { knopf.textContent = text; beschaeftigt = false; status(""); zeichnen(); }
};
const zaehlen = (wort) => (k, n) => status(`${wort}: Seite ${k} von ${n} …`);

$("ex-pdf").addEventListener("click", (e) => arbeit(e.currentTarget, async () => {
  const blob = await pdfBauen(seiten, zaehlen("PDF wird erstellt"));
  speichern(blob, `${basisName()}-bearbeitet.pdf`);
  ergebnis(`Fertig: ${seiten.length} Seiten, ${groesseText(blob.size)}.`);
}));
$("ex-auswahl").addEventListener("click", (e) => arbeit(e.currentTarget, async () => {
  const liste = seiten.filter((s) => s.auswahl);
  const blob = await pdfBauen(liste, zaehlen("PDF wird erstellt"));
  speichern(blob, `${basisName()}-auswahl.pdf`);
  ergebnis(`Fertig: ${liste.length} ausgewählte Seiten, ${groesseText(blob.size)}.`);
}));

// Aufteilen
$("teil-art").addEventListener("change", () => { $("teil-n-zeile").hidden = $("teil-art").value !== "n"; $("teil-b-zeile").hidden = $("teil-art").value !== "bereiche"; });
const eingabeFehler = (text) => Object.assign(new Error(text), { eingabe: true });
const bereicheLesen = (text, max) => {
  const gruppen = [];
  for (const teil of text.split(/[,;]+/).map((t) => t.trim()).filter(Boolean)) {
    const m = teil.match(/^(\d+)\s*(?:-|–|bis)\s*(\d+)$/) || teil.match(/^(\d+)$/);
    if (!m) throw eingabeFehler(`„${teil}“ verstehe ich nicht. Beispiel: 1-3, 4, 5-8`);
    const a = +m[1], b = +(m[2] || m[1]);
    if (a < 1 || b > max || a > b) throw eingabeFehler(`Bereich „${teil}“ passt nicht zu ${max} Seiten.`);
    gruppen.push([a, b]);
  }
  if (!gruppen.length) throw eingabeFehler("Bitte Seitenbereiche angeben, z. B. 1-3, 4, 5-8.");
  return gruppen;
};
$("ex-teilen").addEventListener("click", (e) => arbeit(e.currentTarget, async () => {
  const art = $("teil-art").value, n = seiten.length;
  let gruppen;
  if (art === "einzeln") gruppen = seiten.map((_, i) => [i + 1, i + 1]);
  else if (art === "n") { const k = Math.max(1, +$("teil-n").value || 1); gruppen = []; for (let a = 1; a <= n; a += k) gruppen.push([a, Math.min(n, a + k - 1)]); }
  else gruppen = bereicheLesen($("teil-b").value, n);
  const eintraege = [];
  for (let g = 0; g < gruppen.length; g++) {
    const [a, b] = gruppen[g];
    status(`Teil ${g + 1} von ${gruppen.length} wird erstellt …`);
    eintraege.push({ name: `${basisName()}-${a === b ? "seite-" + a : "seiten-" + a + "-" + b}.pdf`, blob: await pdfBauen(seiten.slice(a - 1, b)) });
    await leerlauf();
  }
  const zip = await zipBauen(eintraege);
  speichern(zip, `${basisName()}-aufgeteilt.zip`);
  ergebnis(`Fertig: ${eintraege.length} PDFs in einer ZIP-Datei (${groesseText(zip.size)}).`);
}));

// Seiten als Bilder
$("ex-bilder").addEventListener("click", (e) => arbeit(e.currentTarget, async () => {
  const typ = $("bilder-typ").value, dpi = +$("bilder-dpi").value, endung = typ === "image/png" ? "png" : "jpg", eintraege = [];
  for (let i = 0; i < seiten.length; i++) {
    status(`Bild ${i + 1} von ${seiten.length} wird erstellt …`);
    const c = await seiteZeichnen(seiten[i], dpi, 0, true);
    eintraege.push({ name: `${basisName()}-seite-${String(i + 1).padStart(String(seiten.length).length, "0")}.${endung}`, blob: await new Promise((r) => c.toBlob(r, typ, 0.9)) });
    c.width = c.height = 0;
    await leerlauf();
  }
  if (eintraege.length === 1) speichern(eintraege[0].blob, eintraege[0].name);
  else speichern(await zipBauen(eintraege), `${basisName()}-bilder.zip`);
  ergebnis(`Fertig: ${eintraege.length} ${endung.toUpperCase()}-${eintraege.length === 1 ? "Bild" : "Bilder"} mit ${dpi} dpi.`);
}));

// Komprimieren: jede Seite als JPG neu aufbauen
$("ex-komprimieren").addEventListener("click", (e) => arbeit(e.currentTarget, async () => {
  const [dpi, qualitaet] = $("komp-stufe").value.split("|").map(Number), opt = einstellungen(), doc = await PDFLib.PDFDocument.create();
  for (let i = 0; i < seiten.length; i++) {
    status(`Seite ${i + 1} von ${seiten.length} wird komprimiert …`);
    const c = await seiteZeichnen(seiten[i], dpi, 0, true);
    const bild = await doc.embedJpg(await (await new Promise((r) => c.toBlob(r, "image/jpeg", qualitaet))).arrayBuffer());
    const w = (c.width * 72) / dpi, h = (c.height * 72) / dpi;
    doc.addPage([w, h]).drawImage(bild, { x: 0, y: 0, width: w, height: h });
    c.width = c.height = 0;
    await leerlauf();
  }
  await verzieren(doc, opt);
  eigenschaften(doc, opt.meta);
  const blob = new Blob([await doc.save({ useObjectStreams: true })], { type: "application/pdf" });
  const vorher = [...new Set(seiten.filter((s) => !s.leer).map((s) => s.datei))].reduce((a, i) => a + dateien[i].daten.length, 0);
  if (vorher && blob.size >= vorher) {
    ergebnis(`Das Original (${groesseText(vorher)}) ist schon kleiner als die komprimierte Fassung (${groesseText(blob.size)}). Hier lohnt sich Komprimieren nicht, darum wurde nichts gespeichert.`);
    return;
  }
  speichern(blob, `${basisName()}-komprimiert.pdf`);
  ergebnis(vorher ? `Fertig: ${groesseText(vorher)} → ${groesseText(blob.size)} (${Math.round((1 - blob.size / vorher) * 100)} % kleiner).` : `Fertig: ${groesseText(blob.size)}.`);
}));

// Text herausholen
$("ex-text").addEventListener("click", (e) => arbeit(e.currentTarget, async () => {
  const teile = [];
  let mitText = 0;
  for (let i = 0; i < seiten.length; i++) {
    const s = seiten[i];
    if (s.leer || dateien[s.datei].art !== "pdf") continue;
    status(`Text von Seite ${i + 1} wird gelesen …`);
    const inhalt = await (await dateien[s.datei].doc.getPage(s.nr + 1)).getTextContent();
    const text = inhalt.items.map((t) => t.str + (t.hasEOL ? "\n" : "")).join("").replace(/[ \t]+\n/g, "\n").trim();
    if (!text) continue;
    mitText++;
    teile.push(`--- Seite ${i + 1} ---\n\n${text}`);
  }
  if (!mitText) { ergebnis("In diesen Seiten steckt kein auswählbarer Text, vermutlich sind es Scans."); return; }
  speichern(new Blob([teile.join("\n\n") + "\n"], { type: "text/plain;charset=utf-8" }), `${basisName()}-text.txt`);
  ergebnis(`Fertig: Text von ${mitText} ${mitText === 1 ? "Seite" : "Seiten"} gespeichert.`);
}));

zeichnen();
