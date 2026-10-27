// Foto-Splitter: ein Foto als Panorama-Karussell, Instagram-Profilraster oder Puzzle in mehrere Bilder teilen.
// Alles passiert im Browser, das Foto wird nirgends hochgeladen.
"use strict";

const $ = (id) => document.getElementById(id);
const klemmen = (x, a, b) => Math.min(b, Math.max(a, x));

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
