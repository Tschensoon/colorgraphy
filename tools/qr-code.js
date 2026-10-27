// QR-Code-Generator: Link, WLAN, Kontakt, Text, E-Mail, Telefon, SMS, WhatsApp, Ort und Termin.
// Codierung mit qrcode-generator (Kazuhiko Arase, MIT), Zeichnen und Export selbst. Alles läuft im Browser.
"use strict";

const $ = (id) => document.getElementById(id);
qrcode.stringToBytes = qrcode.stringToBytesFuncs["UTF-8"];
let art = "link", logo = null;

/* ---------- Inhalt je nach Art zusammensetzen ---------- */
const wert = (id) => $(id).value.trim();
const ziffern = (s) => s.replace(/[^\d+]/g, "");
const wlanEsc = (s) => String(s).replace(/([\\;,:"])/g, "\\$1");
const vEsc = (s) => String(s).replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/([,;])/g, "\\$1");
const zwei = (n) => String(n).padStart(2, "0");
const lokal = (d) => `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}T${zwei(d.getHours())}:${zwei(d.getMinutes())}`;
const icsZeit = (s) => { const r = s.replace(/[-:]/g, ""); return r.length === 13 ? r + "00" : r; };

const inhalt = () => {
  switch (art) {
    case "link": {
      let u = wert("f-link");
      if (!u) return "";
      return /^[a-z][a-z0-9+.-]*:/i.test(u) ? u : "https://" + u;
    }
    case "wlan": {
      const ssid = $("f-ssid").value, typ = $("f-wlan-typ").value;
      if (!ssid) return "";
      return `WIFI:T:${typ};S:${wlanEsc(ssid)};${typ !== "nopass" ? `P:${wlanEsc($("f-wlan-pw").value)};` : ""}${$("f-wlan-versteckt").checked ? "H:true;" : ""};`;
    }
    case "kontakt": {
      const v = wert("f-vorname"), n = wert("f-nachname"), firma = wert("f-firma");
      if (!v && !n && !firma) return "";
      const z = ["BEGIN:VCARD", "VERSION:3.0", `N:${vEsc(n)};${vEsc(v)};;;`, `FN:${vEsc([v, n].filter(Boolean).join(" ") || firma)}`];
      if (firma) z.push(`ORG:${vEsc(firma)}`);
      if (wert("f-position")) z.push(`TITLE:${vEsc(wert("f-position"))}`);
      if (wert("f-k-telefon")) z.push(`TEL;TYPE=WORK,VOICE:${wert("f-k-telefon")}`);
      if (wert("f-k-mobil")) z.push(`TEL;TYPE=CELL:${wert("f-k-mobil")}`);
      if (wert("f-k-email")) z.push(`EMAIL;TYPE=INTERNET:${wert("f-k-email")}`);
      if (wert("f-k-web")) z.push(`URL:${wert("f-k-web")}`);
      if (wert("f-k-strasse") || wert("f-k-plz") || wert("f-k-ort")) z.push(`ADR;TYPE=WORK:;;${vEsc(wert("f-k-strasse"))};${vEsc(wert("f-k-ort"))};;${vEsc(wert("f-k-plz"))};`);
      z.push("END:VCARD");
      return z.join("\r\n");
    }
    case "text": return $("f-text").value;
    case "email": {
      const m = wert("f-mail");
      if (!m) return "";
      const q = [["subject", wert("f-mail-betreff")], ["body", $("f-mail-text").value]].filter((x) => x[1]).map(([k, w]) => `${k}=${encodeURIComponent(w)}`).join("&");
      return `mailto:${m}${q ? "?" + q : ""}`;
    }
    case "telefon": { const t = ziffern(wert("f-tel")); return t ? `tel:${t}` : ""; }
    case "sms": { const t = ziffern(wert("f-sms-nr")); return t ? `SMSTO:${t}:${$("f-sms-text").value}` : ""; }
    case "whatsapp": {
      let t = ziffern(wert("f-wa-nr")).replace(/^\+/, "").replace(/^00/, "");
      if (t.startsWith("0")) t = "49" + t.slice(1);
      if (!t) return "";
      const x = $("f-wa-text").value.trim();
      return `https://wa.me/${t}${x ? "?text=" + encodeURIComponent(x) : ""}`;
    }
    case "ort": {
      const la = parseFloat(wert("f-lat").replace(",", ".")), lo = parseFloat(wert("f-lon").replace(",", "."));
      if (!isFinite(la) || !isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) return "";
      const name = wert("f-ort-name");
      return `geo:${la},${lo}${name ? `?q=${la},${lo}(${encodeURIComponent(name)})` : ""}`;
    }
    case "termin": {
      const titel = wert("f-t-titel"), start = $("f-t-start").value;
      if (!titel || !start) return "";
      let ende = $("f-t-ende").value;
      if (!ende) { const d = new Date(start); d.setHours(d.getHours() + 1); ende = lokal(d); }
      const z = ["BEGIN:VEVENT", `SUMMARY:${vEsc(titel)}`, `DTSTART:${icsZeit(start)}`, `DTEND:${icsZeit(ende)}`];
      if (wert("f-t-ort")) z.push(`LOCATION:${vEsc(wert("f-t-ort"))}`);
      if (wert("f-t-text")) z.push(`DESCRIPTION:${vEsc(wert("f-t-text"))}`);
      z.push("END:VEVENT");
      return z.join("\r\n");
    }
  }
  return "";
};

/* ---------- Code berechnen ---------- */
const design = () => ({
  farbe: $("d-farbe").value, hinter: $("d-hinter").value, transparent: $("d-transparent").checked,
  form: $("d-form").value, ecl: logo ? "H" : $("d-ecl").value, rand: +$("d-rand").value, text: $("d-text").value.trim(),
});
const berechnen = (text, ecl) => {
  const q = qrcode(0, ecl);
  q.addData(text, "Byte");
  q.make();
  return { n: q.getModuleCount(), dunkel: (r, c) => q.isDark(r, c) };
};
const finder = (n, r, c) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);

// Maße in Modulen: Code + Rand, darunter Platz für die Beschriftung
const masse = (code, d) => {
  const seite = code.n + 2 * d.rand, textHoehe = d.text ? Math.max(3, seite * 0.13) : 0;
  return { seite, breite: seite, hoehe: seite + textHoehe, textHoehe };
};

/* ---------- Auf ein Canvas zeichnen (Vorschau und PNG) ---------- */
const zeichnen = (g, pxProModul, code, d) => {
  const m = masse(code, d), u = pxProModul, n = code.n, o = d.rand * u;
  g.clearRect(0, 0, m.breite * u, m.hoehe * u);
  if (!d.transparent) { g.fillStyle = d.hinter; g.fillRect(0, 0, m.breite * u, m.hoehe * u); }
  g.fillStyle = d.farbe;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (!code.dunkel(r, c) || finder(n, r, c)) continue;
    const x = o + c * u, y = o + r * u;
    if (d.form === "punkt") { g.beginPath(); g.arc(x + u / 2, y + u / 2, u * 0.43, 0, Math.PI * 2); g.fill(); }
    else if (d.form === "rund") { g.beginPath(); g.roundRect(x + u * 0.04, y + u * 0.04, u * 0.92, u * 0.92, u * 0.32); g.fill(); }
    else g.fillRect(Math.floor(x), Math.floor(y), Math.ceil(u + 0.5), Math.ceil(u + 0.5));
  }
  // Die drei Ecken-Markierungen immer als geschlossene Form (bessere Lesbarkeit)
  const rund = d.form === "quadrat" ? 0 : 1;
  [[0, 0], [0, n - 7], [n - 7, 0]].forEach(([r, c]) => {
    const x = o + c * u, y = o + r * u;
    g.beginPath();
    g.roundRect(x, y, 7 * u, 7 * u, rund * 1.8 * u);
    g.roundRect(x + u, y + u, 5 * u, 5 * u, rund * 1.2 * u);
    g.fill("evenodd");
    g.beginPath(); g.roundRect(x + 2 * u, y + 2 * u, 3 * u, 3 * u, rund * 0.9 * u); g.fill();
  });
  if (logo) {
    const flaeche = n * u * 0.22, x = o + (n * u - flaeche) / 2, y = o + (n * u - flaeche) / 2, pad = flaeche * 0.08;
    g.fillStyle = d.transparent ? "#ffffff" : d.hinter;
    g.beginPath(); g.roundRect(x - pad, y - pad, flaeche + 2 * pad, flaeche + 2 * pad, pad * 1.5); g.fill();
    const s = Math.min(flaeche / logo.naturalWidth, flaeche / logo.naturalHeight), lw = logo.naturalWidth * s, lh = logo.naturalHeight * s;
    g.drawImage(logo, x + (flaeche - lw) / 2, y + (flaeche - lh) / 2, lw, lh);
  }
  if (d.text) {
    g.fillStyle = d.farbe; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = `700 ${m.textHoehe * u * 0.5}px Figtree, Arial, sans-serif`;
    g.fillText(d.text, (m.breite * u) / 2, (m.seite - d.rand * 0.35 + m.textHoehe / 2) * u, m.breite * u * 0.92);
  }
};

/* ---------- SVG (für den Druck, beliebig skalierbar) ---------- */
const xml = (s) => String(s).replace(/[&<>"]/g, (z) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[z]);
const svgBauen = (code, d) => {
  const m = masse(code, d), n = code.n, o = d.rand, teile = [];
  if (!d.transparent) teile.push(`<rect width="${m.breite}" height="${m.hoehe}" fill="${d.hinter}"/>`);
  let pfad = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (!code.dunkel(r, c) || finder(n, r, c)) continue;
    const x = o + c, y = o + r;
    if (d.form === "punkt") teile.push(`<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.43"/>`);
    else if (d.form === "rund") teile.push(`<rect x="${x + 0.04}" y="${y + 0.04}" width="0.92" height="0.92" rx="0.32"/>`);
    else pfad += `M${x} ${y}h1v1h-1z`;
  }
  if (pfad) teile.push(`<path d="${pfad}" shape-rendering="crispEdges"/>`);
  const rund = d.form === "quadrat" ? 0 : 1;
  [[0, 0], [0, n - 7], [n - 7, 0]].forEach(([r, c]) => {
    const x = o + c, y = o + r;
    teile.push(`<path fill-rule="evenodd" d="${rrPfad(x, y, 7, 7, rund * 1.8)}${rrPfad(x + 1, y + 1, 5, 5, rund * 1.2)}"/>`);
    teile.push(`<rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="${rund * 0.9}"/>`);
  });
  if (logo) {
    const f = n * 0.22, x = o + (n - f) / 2, pad = f * 0.08;
    teile.push(`<rect x="${x - pad}" y="${x - pad}" width="${f + 2 * pad}" height="${f + 2 * pad}" rx="${pad * 1.5}" fill="${d.transparent ? "#ffffff" : d.hinter}"/>`);
    teile.push(`<image href="${logoDaten()}" x="${x}" y="${x}" width="${f}" height="${f}" preserveAspectRatio="xMidYMid meet"/>`);
  }
  if (d.text) teile.push(`<text x="${m.breite / 2}" y="${m.seite - d.rand * 0.35 + m.textHoehe / 2}" font-family="Figtree, Arial, sans-serif" font-weight="700" font-size="${m.textHoehe * 0.5}" text-anchor="middle" dominant-baseline="middle">${xml(d.text)}</text>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${m.breite} ${m.hoehe}" width="${m.breite * 10}mm" height="${m.hoehe * 10}mm"><g fill="${d.farbe}">${teile.join("")}</g></svg>`;
};
const rrPfad = (x, y, w, h, r) => r
  ? `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}z`
  : `M${x} ${y}h${w}v${h}h${-w}z`;
let logoUrl = "";
const logoDaten = () => {
  if (!logoUrl) {
    const c = document.createElement("canvas"), s = Math.min(1, 400 / Math.max(logo.naturalWidth, logo.naturalHeight));
    c.width = Math.round(logo.naturalWidth * s); c.height = Math.round(logo.naturalHeight * s);
    c.getContext("2d").drawImage(logo, 0, 0, c.width, c.height);
    logoUrl = c.toDataURL("image/png");
  }
  return logoUrl;
};

/* ---------- Lesbarkeit prüfen ---------- */
const helligkeit = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const lesbarkeit = (d) => {
  const hinweise = [];
  const lv = helligkeit(d.farbe), lh = d.transparent ? 1 : helligkeit(d.hinter), kontrast = (Math.max(lv, lh) + 0.05) / (Math.min(lv, lh) + 0.05);
  if (lv > lh) hinweise.push("Der Code ist heller als der Hintergrund. Viele Scanner lesen solche invertierten Codes nicht. Nimm eine dunkle Farbe auf hellem Grund.");
  else if (kontrast < 4) hinweise.push("Der Kontrast zwischen Code und Hintergrund ist schwach. Manche Handys erkennen den Code dann nicht.");
  if (d.transparent) hinweise.push("Bei durchsichtigem Hintergrund braucht der Untergrund, auf dem der Code später liegt, einen hellen und ruhigen Hintergrund.");
  if (d.rand < 2) hinweise.push("Mit schmalem Rand kann der Code schlechter erkannt werden, wenn er nah an anderen Inhalten steht.");
  return hinweise;
};

/* ---------- Vorschau ---------- */
const canvas = $("qr-canvas");
let aktuell = null; // { text, code, d }
const aktualisieren = () => {
  const text = inhalt(), d = design();
  $("qr-roh").textContent = text || "(noch leer)";
  $("d-farbe-code").textContent = d.farbe.toUpperCase(); $("d-hinter-code").textContent = d.hinter.toUpperCase();
  $("qr-karte").hidden = !(art === "wlan" && $("f-ssid").value);
  const fehler = $("qr-fehler"), knoepfe = ["qr-png", "qr-svg", "qr-kopieren", "qr-karte"].map($);
  aktuell = null;
  if (!text) { fehler.hidden = false; fehler.textContent = "Gib links einen Inhalt ein, dann erscheint hier dein QR-Code."; }
  else {
    try { aktuell = { text, code: berechnen(text, d.ecl), d }; fehler.hidden = true; }
    catch (e) { fehler.hidden = false; fehler.textContent = "Das ist zu viel Inhalt für einen QR-Code. Kürze den Text oder wähle eine niedrigere Fehlerkorrektur."; }
  }
  knoepfe.forEach((k) => (k.disabled = !aktuell));
  canvas.hidden = !aktuell;
  const warn = $("d-warnung"), hinweise = lesbarkeit(d);
  warn.hidden = !hinweise.length; warn.textContent = hinweise.join(" ");
  if (!aktuell) return;
  const m = masse(aktuell.code, d), box = Math.min($("qr-buehne").getBoundingClientRect().width, 380), dpr = Math.min(devicePixelRatio || 1, 2);
  const u = (box / m.breite) * dpr;
  canvas.width = Math.round(m.breite * u); canvas.height = Math.round(m.hoehe * u);
  canvas.style.width = canvas.width / dpr + "px"; canvas.style.height = canvas.height / dpr + "px";
  zeichnen(canvas.getContext("2d"), u, aktuell.code, d);
  $("o-groesse").textContent = `${$("ex-groesse").value} px`;
};
let geplant = false;
const spaeter = () => { if (!geplant) { geplant = true; requestAnimationFrame(() => { geplant = false; aktualisieren(); }); } };
document.querySelector(".qr-bank").addEventListener("input", spaeter);
document.querySelector(".qr-bank").addEventListener("change", spaeter);
new ResizeObserver(spaeter).observe($("qr-buehne"));

document.querySelectorAll("#qr-arten button").forEach((b) => b.addEventListener("click", () => {
  art = b.dataset.art;
  document.querySelectorAll("#qr-arten button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  document.querySelectorAll(".qr-felder[data-fuer]").forEach((f) => (f.hidden = f.dataset.fuer !== art));
  if (art === "termin" && !$("f-t-start").value) { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0); $("f-t-start").value = lokal(d); }
  aktualisieren();
}));

// Logo
$("d-logo").addEventListener("change", () => {
  const f = $("d-logo").files[0];
  if (!f) return;
  const img = new Image();
  img.onload = () => {
    logo = img; logoUrl = "";
    $("d-logo-weg").hidden = false;
    $("d-logo-info").textContent = "Fehlerkorrektur steht mit Logo automatisch auf „Sehr hoch“, damit der Code lesbar bleibt.";
    $("d-ecl").disabled = true;
    aktualisieren();
  };
  img.src = URL.createObjectURL(f);
  $("d-logo").value = "";
});
$("d-logo-weg").addEventListener("click", () => { logo = null; logoUrl = ""; $("d-logo-weg").hidden = true; $("d-logo-info").textContent = ""; $("d-ecl").disabled = false; aktualisieren(); });

/* ---------- Speichern ---------- */
const speichern = (blob, name) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 8000);
};
const dateiname = (endung) => {
  const zusatz = art === "wlan" ? $("f-ssid").value : art === "kontakt" ? [wert("f-vorname"), wert("f-nachname")].join(" ") : art === "link" ? wert("f-link").replace(/^https?:\/\//, "").split("/")[0] : "";
  const teil = zusatz.normalize("NFKD").replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase().slice(0, 30);
  return `qr-code-${art}${teil ? "-" + teil : ""}.${endung}`;
};
const pngBlob = () => new Promise((ok) => {
  const ziel = +$("ex-groesse").value, m = masse(aktuell.code, aktuell.d), u = ziel / m.breite, c = document.createElement("canvas");
  c.width = Math.round(m.breite * u); c.height = Math.round(m.hoehe * u);
  zeichnen(c.getContext("2d"), u, aktuell.code, aktuell.d);
  c.toBlob(ok, "image/png");
});
const meldung = (t) => { $("qr-ergebnis").textContent = t; };
$("qr-png").addEventListener("click", async () => { if (!aktuell) return; speichern(await pngBlob(), dateiname("png")); meldung(`PNG mit ${$("ex-groesse").value} px gespeichert.`); });
$("qr-svg").addEventListener("click", () => { if (!aktuell) return; speichern(new Blob([svgBauen(aktuell.code, aktuell.d)], { type: "image/svg+xml" }), dateiname("svg")); meldung("SVG gespeichert, ideal für den Druck."); });
$("qr-kopieren").addEventListener("click", async () => {
  if (!aktuell) return;
  try {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob() })]);
    meldung("Kopiert. Du kannst den Code jetzt z. B. in Word, PowerPoint oder eine E-Mail einfügen.");
  } catch (e) { meldung("Kopieren klappt in diesem Browser nicht. Speichere den Code stattdessen als PNG."); }
});

// WLAN-Karte im Format A6 (300 dpi) zum Ausdrucken
$("qr-karte").addEventListener("click", async () => {
  if (!aktuell || art !== "wlan") return;
  const W = 1240, H = 1748, c = document.createElement("canvas"), g = c.getContext("2d"), d = { ...aktuell.d, transparent: false, text: "" };
  c.width = W; c.height = H;
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, W, H);
  g.fillStyle = d.farbe; g.textAlign = "center"; g.textBaseline = "alphabetic";
  // WLAN-Symbol
  g.strokeStyle = d.farbe; g.lineWidth = 22; g.lineCap = "round";
  [150, 105, 60].forEach((r) => { g.beginPath(); g.arc(W / 2, 330, r, Math.PI * 1.25, Math.PI * 1.75); g.stroke(); });
  g.beginPath(); g.arc(W / 2, 330, 18, 0, Math.PI * 2); g.fill();
  g.font = "800 120px Figtree, Arial, sans-serif"; g.fillText("WLAN", W / 2, 520);
  g.font = "500 44px Figtree, Arial, sans-serif"; g.fillStyle = "#555"; g.fillText("Mit der Handy-Kamera scannen und verbinden", W / 2, 600);
  const code = aktuell.code, m = masse(code, { ...d, rand: 2 }), u = Math.floor(820 / m.breite), q = document.createElement("canvas");
  q.width = m.breite * u; q.height = m.hoehe * u;
  zeichnen(q.getContext("2d"), u, code, { ...d, rand: 2 });
  g.drawImage(q, (W - q.width) / 2, 660);
  const y = 660 + q.height + 110, typ = $("f-wlan-typ").value;
  g.fillStyle = "#777"; g.font = "600 40px Figtree, Arial, sans-serif";
  g.fillText("Netzwerk", W / 2, y);
  g.fillStyle = "#111"; g.font = "700 64px Figtree, Arial, sans-serif";
  g.fillText($("f-ssid").value, W / 2, y + 80, W - 160);
  if (typ !== "nopass") {
    g.fillStyle = "#777"; g.font = "600 40px Figtree, Arial, sans-serif";
    g.fillText("Passwort", W / 2, y + 180);
    g.fillStyle = "#111"; g.font = "600 56px 'JetBrains Mono', Consolas, monospace";
    g.fillText($("f-wlan-pw").value, W / 2, y + 255, W - 160);
  }
  speichern(await new Promise((ok) => c.toBlob(ok, "image/png")), dateiname("png").replace("qr-code-wlan", "wlan-karte"));
  meldung("WLAN-Karte gespeichert (A6, 300 dpi). Einfach ausdrucken und aufstellen.");
});

document.fonts?.ready.then(aktualisieren);
aktualisieren();
