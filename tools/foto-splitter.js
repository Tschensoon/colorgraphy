// Foto-Splitter: ein Foto als Panorama-Karussell, Instagram-Profilraster, Puzzle oder Druck in A1–A6 in mehrere Bilder teilen.
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
    // Papierformate in mm (Hochformat); die Pixelgröße ergibt sich aus der Auflösung, siehe papier()
    druck: {
      formate: [["A1", 594, 841], ["A2", 420, 594], ["A3", 297, 420], ["A4", 210, 297], ["A5", 148, 210], ["A6", 105, 148]],
      papier: true,
      hinweis: "Jedes Teil wird ein Blatt in echter Papiergröße. Mit mehr Spalten oder Reihen entsteht ein Poster aus einzelnen Blättern.",
      anleitung: (n) => (n === 1
        ? "So druckst du: PDF öffnen und mit „Tatsächliche Größe“ bzw. 100 % drucken, nicht „An Seite anpassen“."
        : `So druckst du: PDF öffnen und alle ${n} Seiten mit „Tatsächliche Größe“ bzw. 100 % drucken. Die Blätter sind von links oben nach rechts unten nummeriert und ergeben aneinandergelegt das Poster.`)
        + " Viele Drucker bedrucken die äußersten Millimeter nicht, dort bleibt ein schmaler weißer Rand. Randlos geht es nur, wenn dein Drucker das kann.",
    },
  };
  const VORGABE = { karussell: [3, 1], raster: [3, 2], frei: [3, 3], druck: [1, 1] };
  let foto = null, fw0 = 0, fh0 = 0, basis = "foto", stufenP = [];
  let art = "karussell", fmt = 0, spalten = 3, reihen = 1, zoomP = 1, mx = 0, my = 0, quer = false;

  // Druck: Blattgröße in Pixeln. Ziel 300 dpi, aber nicht mehr als das Foto hergibt (mindestens 150 dpi)
  // und höchstens 16 Megapixel pro Blatt, damit auch Handys die Bilder berechnen können.
  const papier = () => {
    const [name, a, b] = ARTEN.druck.formate[fmt], mmW = quer ? b : a, mmH = quer ? a : b, inW = mmW / 25.4, inH = mmH / 25.4;
    const quelle = foto ? Math.min(fw0 / (spalten * inW), fh0 / (reihen * inH)) / zoomP : 300;
    const dpi = Math.round(Math.min(300, Math.max(150, quelle), Math.sqrt(16e6 / (inW * inH))));
    return { name, mmW, mmH, dpi, w: Math.round(inW * dpi), h: Math.round(inH * dpi) };
  };
  const cm = (mm) => String(Math.round(mm) / 10).replace(".", ",");

  /* Foto laden (eigene Ablage oder aus dem Zuschneider) */
  const pAblage = $("p-ablage"), pDatei = $("p-datei");
  const pMelden = (t, i) => { $("p-ablage-titel").textContent = t; $("p-ablage-info").textContent = i; };
  const fotoSetzen = (img, dateiname) => {
    foto = img; fw0 = img.naturalWidth; fh0 = img.naturalHeight; stufenP = [];
    basis = (dateiname.replace(/\.[^.]+$/, "").normalize("NFKD").replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "foto").slice(0, 40);
    mx = fw0 / 2; my = fh0 / 2;
    if (art === "druck") { quer = fw0 > fh0; ausrichtungZeigen(); formatKnoepfeP(); }
    pAblage.classList.add("geladen");
    pMelden("✓ " + dateiname, `${fw0} × ${fh0} px · Tippen, um ein anderes Foto zu wählen`);
    $("p-leer").hidden = true; $("p-vorschau").hidden = false;
    $("p-zip").disabled = false; $("p-teilen").disabled = false; $("p-pdf").disabled = false;
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
    let [, w, h] = ARTEN[art].formate[fmt];
    if (ARTEN[art].papier) ({ w, h } = papier());
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
      liste.push({ n: nummer(r, c), name: teilDateiname(nummer(r, c), G), blob, w: G.tw, h: G.th });
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
  /* Minimales PDF: jede Seite in echter Papiergröße, darauf das JPG randfüllend */
  const pdfBauen = async (teile, mmW, mmH) => {
    const enc = new TextEncoder(), stuecke = [], xref = [];
    let pos = 0;
    const add = (x) => { const u = typeof x === "string" ? enc.encode(x) : x; stuecke.push(u); pos += u.length; };
    const obj = (nr, kopf, strom) => {
      xref[nr] = pos; add(`${nr} 0 obj\n${kopf}\n`);
      if (strom) { add("stream\n"); add(strom); add("\nendstream\n"); }
      add("endobj\n");
    };
    const W = ((mmW * 72) / 25.4).toFixed(2), H = ((mmH * 72) / 25.4).toFixed(2), anzahl = 3 + teile.length * 3;
    add("%PDF-1.4\n"); add(new Uint8Array([37, 226, 227, 207, 211, 10]));
    obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
    obj(2, `<< /Type /Pages /Count ${teile.length} /Kids [${teile.map((_, i) => `${3 + i * 3} 0 R`).join(" ")}] >>`);
    for (let i = 0; i < teile.length; i++) {
      const t = teile[i], bild = new Uint8Array(await t.blob.arrayBuffer()), s = 3 + i * 3, inhalt = `q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`;
      obj(s, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 ${s + 2} 0 R >> >> /Contents ${s + 1} 0 R >>`);
      obj(s + 1, `<< /Length ${inhalt.length} >>`, inhalt);
      obj(s + 2, `<< /Type /XObject /Subtype /Image /Width ${t.w} /Height ${t.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bild.length} >>`, bild);
    }
    const start = pos;
    add(`xref\n0 ${anzahl}\n0000000000 65535 f \n` + xref.slice(1).map((o) => String(o).padStart(10, "0") + " 00000 n \n").join(""));
    add(`trailer\n<< /Size ${anzahl} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`);
    return new Blob(stuecke, { type: "application/pdf" });
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
      b.textContent = ARTEN[art].papier ? `${name} · ${cm(quer ? h : w)} × ${cm(quer ? w : h)} cm` : w ? `${name} · ${w} × ${h}` : name;
      b.addEventListener("click", () => { fmt = i; formatKnoepfeP(); pAktualisieren(); });
      $("p-formate").append(b);
    });
  };
  const ausrichtungZeigen = () => document.querySelectorAll("#p-ausrichtung button").forEach((b) => b.setAttribute("aria-pressed", String((b.dataset.o === "quer") === quer)));
  const pAktualisieren = () => {
    const istRaster = art === "raster", istDruck = art === "druck", istFrei = art === "frei" || istDruck, original = !ARTEN[art].formate[fmt][1];
    $("p-ausrichtung-zeile").hidden = !istDruck; $("p-pdf").hidden = !istDruck;
    $("p-format-zeile").querySelector(".klein-titel").textContent = istDruck ? "Papierformat jedes Blatts" : "Format jedes Bildes";
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
    const faktor = Math.max(G.sx, G.sy), warn = $("p-warnung");
    warn.hidden = faktor <= 1.02;
    if (istDruck) {
      const P = papier();
      $("p-ergebnis").innerHTML = `${n} ${n === 1 ? "Blatt" : "Blätter"} ${P.name} ${quer ? "quer" : "hoch"}${n > 1 ? ` · Poster ${cm(P.mmW * spalten)} × ${cm(P.mmH * reihen)} cm` : ""}<small>${G.tw} × ${G.th} px pro Blatt (${P.dpi} dpi) · PDF oder JPG ohne Metadaten</small>`;
      if (!warn.hidden) warn.textContent = `Dein Foto hat für diese Größe nur etwa ${Math.round(P.dpi / faktor)} dpi und kann ausgedruckt etwas weich wirken. Ab 150 dpi sieht es gut aus, 300 dpi ist ideal. Kleineres Papier, weniger Blätter oder weniger Zoom helfen.`;
    } else {
      $("p-ergebnis").innerHTML = `${n} Bilder à ${G.tw} × ${G.th} px<small>zusammen ${G.W} × ${G.H} px · JPG ohne Metadaten und Standortdaten</small>`;
      if (!warn.hidden) warn.textContent = `Für ${n} Bilder in dieser Größe hat dein Foto zu wenige Pixel und wird um das ${faktor.toFixed(1).replace(".", ",")}-Fache vergrößert. Weniger Teile, weniger Zoom oder ein größeres Foto helfen.`;
    }
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
    art = b.dataset.a; fmt = art === "druck" ? 3 : 0; [spalten, reihen] = VORGABE[art];
    if (art === "druck") { quer = foto ? fw0 > fh0 : false; ausrichtungZeigen(); } zoomP = 1; $("p-zoom").value = 1; $("o-pzoom").textContent = "100 %";
    if (foto) { mx = fw0 / 2; my = fh0 / 2; }
    document.querySelectorAll("#p-arten button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    formatKnoepfeP(); pAktualisieren();
  }));
  document.querySelectorAll("#p-ausrichtung button").forEach((b) => b.addEventListener("click", () => {
    quer = b.dataset.o === "quer"; ausrichtungZeigen(); formatKnoepfeP(); pAktualisieren();
  }));
  $("p-pdf").addEventListener("click", async () => {
    if (!foto) return;
    const knopf = $("p-pdf"), text = knopf.textContent, P = papier();
    knopf.textContent = "Wird erstellt …"; knopf.disabled = true;
    try { speichern(await pdfBauen(await alleTeile(), P.mmW, P.mmH), `${basis}-${P.name}-${quer ? "quer" : "hoch"}-${spalten}x${reihen}.pdf`); }
    finally { knopf.textContent = text; knopf.disabled = false; }
  });
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
