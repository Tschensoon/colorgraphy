(() => {
  const cv = document.getElementById("spiel-canvas"), ctx = cv.getContext("2d");
  const rahmen = cv.closest(".spiel-rahmen"), zu = rahmen.querySelector(".spiel-zu");
  const H = 300, BODEN = 248, dpr = Math.min(window.devicePixelRatio || 1, 2);
  const handy = matchMedia("(pointer: coarse)").matches;
  let W = 900, vollbild = false;

  // Spielfeldbreite passend zur Fläche: auf dem Handy schmaler, im Vollbild so breit wie der Bildschirm
  function groesse() {
    const gedreht = vollbild && innerHeight > innerWidth; // Hochformat ohne Drehsperre: Spiel per CSS quer legen
    rahmen.classList.toggle("gedreht", gedreht);
    if (vollbild) {
      const b = gedreht ? innerHeight : innerWidth, h = gedreht ? innerWidth : innerHeight;
      W = Math.round(Math.min(1200, Math.max(480, H * b / h)));
    } else W = rahmen.clientWidth < 600 ? 540 : 900;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Handy: beim ersten Tippen ins Vollbild und quer. Wo der Browser das nicht kann (iPhone),
  // füllt der Rahmen trotzdem den Bildschirm und wird bei Hochformat gedreht.
  async function vollbildAn() {
    vollbild = true; rahmen.classList.add("vollbild"); document.body.classList.add("spiel-offen");
    groesse();
    try { await (rahmen.requestFullscreen || rahmen.webkitRequestFullscreen).call(rahmen); } catch (e) {}
    // Drehsperre nicht abwarten: manche Browser antworten nie, die Größe folgt über "resize"
    try { screen.orientation.lock("landscape").catch(() => {}); } catch (e) {}
    groesse();
  }
  function vollbildAus() {
    if (!vollbild) return;
    vollbild = false; halten = false; rahmen.classList.remove("vollbild", "gedreht"); document.body.classList.remove("spiel-offen");
    try { screen.orientation.unlock(); } catch (e) {}
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    if (zustand === "laeuft") ende();
    groesse();
  }
  zu.addEventListener("click", vollbildAus);
  document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement) vollbildAus(); });
  addEventListener("resize", () => groesse());
  groesse();

  // Logo im Hintergrund (fehlt die Datei, bleibt der Himmel einfach leer)
  const logo = new Image(); let logoOk = false;
  logo.onload = () => { logoOk = true; }; logo.src = "spiel/froebel-logo.png";

  let rekord = 0;
  try { rekord = +localStorage.getItem("froebelinchen-rekord") || 0; } catch (e) {}

  const G = { x: 90, y: BODEN, vy: 0, amBoden: true, lauf: 0 };
  // Verfolgungsjagd: alle 20 s rennt Fröbelinchen in die Bildmitte, eine Läuferin jagt ihr 5 s lang hinterher
  const JAGD_ALLE = 20, JAGD_DAUER = 5, START_X = 90;
  const F = { x: -90, y: BODEN, vy: 0, lauf: 0, da: false };
  let jagd = null, bisJagd = JAGD_ALLE;
  let endeZeit = 0, laufzeit = 0, baelle = [], wolken = [], tempo, strecke, naechster, zustand = "start", halten = false, blitz = 0, zeitAlt = 0;
  const FARBEN = [["#e53935", "#ffcdd2"], ["#1e88e5", "#bbdefb"], ["#fdd835", "#fff9c4"], ["#43a047", "#c8e6c9"], ["#8e24aa", "#e1bee7"]];

  function neu() {
    baelle = []; tempo = 330; strecke = 0; naechster = 500; blitz = 0; laufzeit = 0;
    G.y = BODEN; G.vy = 0; G.amBoden = true; G.x = START_X;
    jagd = null; bisJagd = JAGD_ALLE; F.da = false;
    wolken = Array.from({ length: 4 }, (_, i) => ({ x: i * 260 + Math.random() * 120, y: 30 + Math.random() * 60, s: .7 + Math.random() * .5 }));
  }
  neu();

  function springen() {
    if (zustand === "aus" && performance.now() - endeZeit < 500) return; // kein versehentlicher Neustart
    if (zustand !== "laeuft") { neu(); zustand = "laeuft"; eintragenZu(); return; }
    if (G.amBoden) { G.vy = -760; G.amBoden = false; }
  }
  const druck = (an) => { halten = an; if (an) springen(); };
  // Tasten nur abfangen, wenn das Spiel sichtbar ist und kein Knopf/Link den Fokus hat
  const imBild = () => { const r = cv.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };
  addEventListener("keydown", e => {
    if (!["Space", "ArrowUp", "KeyW"].includes(e.code) || !imBild()) return;
    if (e.target.closest && e.target.closest("a, button, input, textarea, select")) return;
    e.preventDefault(); if (!e.repeat) druck(true);
  });
  addEventListener("keyup", e => { if (["Space", "ArrowUp", "KeyW"].includes(e.code)) halten = false; });
  cv.addEventListener("pointerdown", e => {
    e.preventDefault();
    if (handy && !vollbild) { vollbildAn(); return; }
    druck(true);
  });
  addEventListener("pointerup", () => { halten = false; });

  // Teilen: Text mit dem eigenen Rekord, falls schon gespielt
  const LINK = "https://colorgraphy.de/spiel.html";
  const teilText = () => (rekord > 0 ? `Ich habe ${rekord} Punkte bei Fröbelinchen springt geschafft. Schaffst du mehr?`
                                     : "Schaffst du mehr Punkte als ich? Fröbelinchen springt:");
  const wa = document.getElementById("spiel-whatsapp"), kopiert = document.getElementById("spiel-kopiert");
  wa.addEventListener("click", () => { wa.href = "https://wa.me/?text=" + encodeURIComponent(teilText() + " " + LINK); });
  document.getElementById("spiel-teilen").addEventListener("click", async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "Fröbelinchen springt", text: teilText(), url: LINK }); return; }
      catch (e) { if (e.name === "AbortError") return; }
    }
    try { await navigator.clipboard.writeText(teilText() + " " + LINK); kopiert.textContent = "Link kopiert, jetzt einfach einfügen und verschicken."; }
    catch (e) { kopiert.textContent = LINK; }
  });

  // ---------- Bestenliste (Supabase) ----------
  // Projekt-URL und öffentlicher Schlüssel (publishable/anon) aus Supabase. Leer = Bestenliste ausgeblendet.
  const DB = { url: "", key: "" };
  const dbAn = !!(DB.url && DB.key);
  const blBereich = document.getElementById("bestenliste-bereich"), blListe = document.getElementById("bestenliste");
  const form = document.getElementById("spiel-eintragen"), seName = document.getElementById("se-name");
  const seMeldung = document.getElementById("se-meldung"), sePunkte = document.getElementById("se-punkte");
  const ERLAUBT = /^[A-Za-zÄÖÜäöüßÀ-ÿ0-9 ._-]+$/;
  const SPERRE = ["arsch", "fick", "fotze", "hure", "nazi", "hitler", "wichs", "schlampe", "spast", "missgeburt", "fuck", "shit", "bitch", "cunt", "nigg", "porn"];
  let offen = null, meinEintrag = null;

  const zeile = (rang, name, punkte, eigen) => {
    const li = document.createElement("li");
    if (eigen) li.className = "eigen";
    for (const [k, t] of [["bl-rang", rang], ["bl-name", name], ["bl-punkte", punkte]]) {
      const sp = document.createElement("span"); sp.className = k; sp.textContent = t; li.append(sp);
    }
    return li;
  };
  async function bestenlisteLaden() {
    if (!dbAn) return;
    blBereich.hidden = false;
    try {
      const r = await fetch(`${DB.url}/rest/v1/bestenliste?select=name,punkte&order=punkte.desc,erstellt.asc&limit=10`,
                            { headers: { apikey: DB.key }, cache: "no-store" });
      if (!r.ok) throw new Error(r.status);
      const daten = await r.json();
      let markiert = false;
      blListe.replaceChildren(...daten.map((e, i) => {
        const eigen = !markiert && meinEintrag && e.name === meinEintrag.name && e.punkte === meinEintrag.punkte;
        if (eigen) markiert = true;
        return zeile(i + 1 + ".", e.name, e.punkte, eigen);
      }));
      if (!daten.length) blListe.replaceChildren(zeile("", "Noch keine Einträge. Spiel eine Runde und trag dich als Erstes ein!", "", false));
    } catch (e) {
      blListe.replaceChildren(zeile("", "Die Bestenliste ist gerade nicht erreichbar.", "", false));
    }
  }
  function eintragenAnbieten(punkte, sekunden) {
    if (!dbAn || punkte < 10) return;
    offen = { punkte, sekunden };
    sePunkte.textContent = punkte; seMeldung.textContent = "";
    try { seName.value = localStorage.getItem("froebelinchen-name") || ""; } catch (e) {}
    form.hidden = false;
    if (!handy) seName.focus({ preventScroll: true });
  }
  function eintragenZu() { form.hidden = true; offen = null; }
  document.getElementById("se-nein").addEventListener("click", eintragenZu);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!offen) return;
    const name = seName.value.replace(/\s+/g, " ").trim();
    if (!name || name.length > 16) { seMeldung.textContent = "Bitte einen Namen mit 1 bis 16 Zeichen eingeben."; return; }
    if (!ERLAUBT.test(name)) { seMeldung.textContent = "Bitte nur Buchstaben, Zahlen, Leerzeichen, Punkt und Bindestrich."; return; }
    const zusammen = name.toLowerCase().replace(/[\s._-]/g, ""); // auch „Ar sch“ oder „f.u.c.k“ erkennen
    if (SPERRE.some(w => zusammen.includes(w))) { seMeldung.textContent = "Bitte einen anderen Namen wählen."; return; }
    const runde = offen; offen = null; // jede Runde nur einmal eintragen, auch bei doppeltem Tippen
    const knopf = form.querySelector("button[type=submit]"); knopf.disabled = true; seMeldung.textContent = "Wird eingetragen …";
    try {
      const r = await fetch(`${DB.url}/rest/v1/rpc/eintragen`, {
        method: "POST", headers: { apikey: DB.key, "Content-Type": "application/json" },
        body: JSON.stringify({ p_name: name, p_punkte: runde.punkte, p_sekunden: runde.sekunden }) });
      if (!r.ok) { let m = ""; try { m = (await r.json()).message; } catch (x) {} throw new Error(m || "Fehler " + r.status); }
      try { localStorage.setItem("froebelinchen-name", name); } catch (x) {}
      meinEintrag = { name, punkte: runde.punkte };
      eintragenZu();
      await bestenlisteLaden();
    } catch (err) {
      offen = runde;
      seMeldung.textContent = "Hat nicht geklappt: " + err.message;
    } finally { knopf.disabled = false; }
  });
  bestenlisteLaden();

  function ballNeu() {
    const r = 11 + Math.random() * 11;
    const huepft = strecke > 6000 && Math.random() < .35;
    baelle.push({ x: W + r, r, f: FARBEN[Math.floor(Math.random() * FARBEN.length)], dreh: 0, huepft, phase: Math.random() * 6 });
    const abstand = 260 + Math.random() * 320;
    naechster = abstand * Math.max(.75, tempo / 330 * .8);
    if (Math.random() < .15 && strecke > 3000) naechster *= .45; // gelegentlich zwei Bälle kurz hintereinander
  }

  function schritt(dt) {
    if (zustand !== "laeuft") return;
    tempo = Math.min(820, tempo + dt * 9); laufzeit += dt;
    const dx = tempo * dt; strecke += dx; G.lauf += dx;
    jagdSchritt(dt, dx);

    // Springen: festhalten bremst die Schwerkraft beim Steigen
    const g = (halten && G.vy < 0) ? 1500 : 3000;
    G.vy += g * dt; G.y += G.vy * dt;
    if (G.y >= BODEN) { G.y = BODEN; G.vy = 0; G.amBoden = true; }

    naechster -= dx; if (naechster <= 0) ballNeu();
    for (const b of baelle) {
      b.x -= dx * 1.08; b.dreh -= dx * 1.08 / b.r;
      b.phase += dt * 5;
      b.hoehe = b.huepft ? Math.abs(Math.sin(b.phase)) * 60 : 0;
    }
    baelle = baelle.filter(b => b.x > -40);
    for (const w of wolken) { w.x -= dx * .15; if (w.x < -120) { w.x = W + Math.random() * 200; w.y = 30 + Math.random() * 60; } }

    // Kollision: Körper und Hals als Rechtecke, etwas großzügig zugunsten des Spielers
    const boxen = [[G.x - 26, G.y - 52, 52, 26], [G.x + 10, G.y - 92, 22, 42]];
    for (const b of baelle) {
      const by = BODEN - b.r - b.hoehe;
      for (const [x, y, w, h] of boxen) {
        const nx = Math.max(x, Math.min(b.x, x + w)), ny = Math.max(y, Math.min(by, y + h));
        if ((b.x - nx) ** 2 + (by - ny) ** 2 < (b.r * .85) ** 2) { ende(); return; }
      }
    }
    const punkte = Math.floor(strecke / 10);
    if (punkte > 0 && punkte % 100 === 0 && blitz <= 0) blitz = .6;
    blitz -= dt;
  }

  function ende() {
    zustand = "aus"; endeZeit = performance.now();
    const p = Math.floor(strecke / 10);
    if (p > rekord) { rekord = p; try { localStorage.setItem("froebelinchen-rekord", rekord); } catch (e) {} }
    eintragenAnbieten(p, Math.ceil(laufzeit));
  }

  // ---------- Zeichnen ----------
  function rund(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

  function hintergrund() {
    const himmel = ctx.createLinearGradient(0, 0, 0, BODEN);
    himmel.addColorStop(0, "#dff1fb"); himmel.addColorStop(1, "#f7fbf3");
    ctx.fillStyle = himmel; ctx.fillRect(0, 0, W, H);

    if (logoOk) {
      const h = 110, w = logo.width / logo.height * h;
      ctx.globalAlpha = .22; ctx.drawImage(logo, (W - w) / 2, 52, w, h); ctx.globalAlpha = 1;
    }
    ctx.fillStyle = "#fff";
    for (const w of wolken) {
      for (const [ox, oy, rx, ry] of [[0, 0, 34, 14], [22, -8, 22, 14], [-20, -4, 18, 11]]) {
        ctx.beginPath(); ctx.ellipse(w.x + ox * w.s, w.y + oy * w.s, rx * w.s, ry * w.s, 0, 0, 7); ctx.fill();
      }
    }
    // Wiese mit Grashalmen, die mitlaufen
    ctx.fillStyle = "#8bc34a"; ctx.fillRect(0, BODEN, W, H - BODEN);
    ctx.fillStyle = "#7cb342"; ctx.fillRect(0, BODEN, W, 5);
    ctx.fillStyle = "#689f38";
    const off = strecke % 46;
    for (let x = -off; x < W; x += 46) {
      ctx.fillRect(x, BODEN + 16, 3, 7); ctx.fillRect(x + 6, BODEN + 14, 3, 9);
      ctx.fillRect(x + 23, BODEN + 34, 3, 6);
    }
  }

  const glatt = (k) => k * k * (3 - 2 * k);
  function jagdSchritt(dt, dx) {
    if (!jagd) {
      bisJagd -= dt;
      if (bisJagd > 0) return;
      jagd = { t: 0 }; Object.assign(F, { x: -90, y: BODEN, vy: 0, da: true });
    }
    const t = (jagd.t += dt), mitte = W * .42;
    const hin = glatt(Math.min(1, t / 1.2)), zurueck = t > JAGD_DAUER ? glatt(Math.min(1, (t - JAGD_DAUER) / 1.8)) : 0;
    G.x = START_X + (mitte - START_X) * (hin - zurueck);
    if (t < JAGD_DAUER) G.lauf += dx * .6; // schnellere Beine während der Flucht

    // Läuferin: kommt von links, bleibt dicht dran, wird nach 5 s langsamer und fällt zurück
    if (t < JAGD_DAUER) {
      const ziel = G.x - 160 + Math.sin(t * 2.6) * 14;
      F.x += (ziel - F.x) * Math.min(1, dt * 3);
    } else {
      F.x -= (40 + 320 * Math.min(1, (t - JAGD_DAUER) / 1.5)) * dt;
    }
    F.lauf += dx * (t < JAGD_DAUER ? 1.25 : .8);
    // Sie springt automatisch über Bälle
    if (F.y >= BODEN && baelle.some(b => b.x - F.x > 0 && b.x - F.x < 75 && b.hoehe < 30)) F.vy = -700;
    F.vy += 3000 * dt; F.y = Math.min(BODEN, F.y + F.vy * dt);
    if (F.y >= BODEN) F.vy = 0;

    if (t > JAGD_DAUER && F.x < -80 && zurueck >= 1) { jagd = null; bisJagd = JAGD_ALLE; F.da = false; G.x = START_X; }
  }

  // Blonde Läuferin (gezeichnet von den Füßen aus)
  function laeuferin() {
    if (!F.da) return;
    const x = F.x, y = F.y, p = F.lauf / 13, am = y >= BODEN;
    const HAUT = "#f3c6a0", HAAR = "#f1cf5e", HAAR_D = "#d9b13c", SHIRT = "#e8577a", HOSE = "#2f4b7c";
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,.12)";
    ctx.beginPath(); ctx.ellipse(x, BODEN + 2, 22 * (1 - Math.min(.5, (BODEN - y) / 200)), 4.5, 0, 0, 7); ctx.fill();
    ctx.translate(x, y - (am ? Math.abs(Math.sin(p)) * 3 : 0));
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    const glied = (x0, y0, len, w, farbe) => { ctx.strokeStyle = farbe; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + len[0], y0 + len[1]); ctx.stroke(); };
    const bein = (ph, farbe) => {
      const a = am ? Math.sin(p + ph) * .75 : (ph ? .5 : -.6);
      const kx = Math.sin(a) * 24, ky = Math.cos(a) * 24;            // Knie
      const b = a - (am ? Math.max(0, Math.sin(p + ph + 1.4)) * 1.1 : .9); // Unterschenkel angewinkelt
      glied(0, -48, [kx, ky], 9, farbe);
      glied(kx, -48 + ky, [Math.sin(b) * 22, Math.cos(b) * 22], 8, farbe);
      ctx.fillStyle = "#fafafa";
      ctx.beginPath(); ctx.ellipse(kx + Math.sin(b) * 22 + 4, -48 + ky + Math.cos(b) * 22 + 1, 7, 3.5, 0, 0, 7); ctx.fill();
    };
    const arm = (ph, farbe) => {
      const a = am ? -Math.sin(p + ph) * .9 : -1.2;
      const ex = Math.sin(a) * 15, ey = Math.cos(a) * 15;
      glied(2, -76, [ex, ey], 6.5, farbe);
      glied(2 + ex, -76 + ey, [Math.sin(a - 1.5) * 13, Math.cos(a - 1.5) * 13], 6, HAUT);
    };
    bein(Math.PI, "#243b63"); arm(0, "#c9405f");
    // Pferdeschwanz hinter dem Kopf, wippt beim Laufen
    ctx.fillStyle = HAAR_D;
    ctx.beginPath(); ctx.ellipse(-14, -95 + Math.sin(p * 2) * 3, 11, 5, -.5 + Math.sin(p * 2) * .25, 0, 7); ctx.fill();
    // Oberkörper leicht nach vorn geneigt
    ctx.save(); ctx.rotate(.18);
    ctx.fillStyle = SHIRT; ctx.beginPath(); ctx.roundRect(-9, -84, 20, 38, 8); ctx.fill();
    ctx.restore();
    bein(0, HOSE); arm(Math.PI, SHIRT);
    // Kopf
    ctx.fillStyle = HAUT; ctx.beginPath(); ctx.arc(6, -95, 11, 0, 7); ctx.fill();
    ctx.fillStyle = HAAR;
    ctx.beginPath(); ctx.arc(5, -97, 11.5, Math.PI * .95, Math.PI * 2.05); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-3, -93, 6, 9, .2, 0, 7); ctx.fill();
    ctx.fillStyle = "#3a2a1e"; ctx.beginPath(); ctx.arc(11, -95, 1.6, 0, 7); ctx.fill();
    ctx.strokeStyle = "#a0523d"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(12, -89, 2.6, .2, Math.PI - .2); ctx.stroke();
    ctx.restore();
  }

  function giraffe() {
    const { x } = G, y = G.y;
    const lauf = G.amBoden && zustand === "laeuft" ? G.lauf / 9 : 0;
    const wipp = G.amBoden ? Math.abs(Math.sin(lauf)) * 2 : 0;
    const O = "#f28c1a", OD = "#c9650a", FLECK = "#d97012", HELL = "#ffd9a8";
    ctx.save(); ctx.translate(x, y - wipp);
    ctx.lineJoin = "round"; ctx.lineCap = "round";

    // Schatten am Boden
    ctx.save(); ctx.translate(0, wipp); ctx.fillStyle = "rgba(0,0,0,.12)";
    ctx.beginPath(); ctx.ellipse(0, 2 + (BODEN - y), 30 * (1 - Math.min(.5, (BODEN - y) / 200)), 5, 0, 0, 7); ctx.fill(); ctx.restore();

    // Beine (hinten dunkler, vorne heller), schwingen beim Laufen
    const bein = (bx, phase, farbe) => {
      const s = G.amBoden ? Math.sin(lauf + phase) * 7 : (phase ? 6 : -6);
      ctx.fillStyle = farbe; rund(bx + s * .4 - 5, -30, 10, 30, 5); ctx.fill();
      ctx.fillStyle = "#8d4b12"; rund(bx + s * .4 - 5.5, -6, 11, 7, 3); ctx.fill();
    };
    bein(-16, Math.PI, OD); bein(14, 0, OD);
    bein(-10, 0, O); bein(20, Math.PI, O);

    // Schwanz
    ctx.strokeStyle = OD; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-26, -44); ctx.quadraticCurveTo(-38, -40 + Math.sin(lauf) * 3, -36, -28); ctx.stroke();
    ctx.fillStyle = "#8d4b12"; ctx.beginPath(); ctx.ellipse(-36, -27, 3.5, 5, 0, 0, 7); ctx.fill();

    // Körper (plüschig rund)
    ctx.fillStyle = O; ctx.beginPath(); ctx.ellipse(0, -42, 30, 18, 0, 0, 7); ctx.fill();
    ctx.fillStyle = HELL; ctx.beginPath(); ctx.ellipse(2, -34, 20, 8, 0, 0, 7); ctx.fill();

    // Hals
    ctx.fillStyle = O;
    ctx.beginPath(); ctx.moveTo(10, -54); ctx.lineTo(18, -92); ctx.lineTo(32, -90); ctx.lineTo(28, -46); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(25, -91, 8, 6, 0, 0, 7); ctx.fill();
    // Mähne
    ctx.fillStyle = "#a95510";
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(13 + i * 1.3, -60 - i * 7, 3, 4, -.3, 0, 7); ctx.fill(); }

    // Flecken
    ctx.fillStyle = FLECK;
    [[-14, -48, 6, 5], [4, -50, 5, 4], [-2, -40, 4, 3.5], [16, -44, 5, 4], [-20, -38, 3.5, 3], [22, -66, 3.5, 3], [24, -80, 3, 2.6]]
      .forEach(([fx, fy, rx, ry]) => { ctx.beginPath(); ctx.ellipse(fx, fy, rx, ry, .4, 0, 7); ctx.fill(); });

    // Kopf
    ctx.fillStyle = O; ctx.beginPath(); ctx.ellipse(32, -100, 15, 12, -.15, 0, 7); ctx.fill();
    ctx.fillStyle = HELL; ctx.beginPath(); ctx.ellipse(44, -96, 9, 8, 0, 0, 7); ctx.fill();
    // Hörnchen
    ctx.strokeStyle = OD; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(26, -110); ctx.lineTo(24, -120); ctx.moveTo(33, -111); ctx.lineTo(33, -122); ctx.stroke();
    ctx.fillStyle = "#8d4b12";
    ctx.beginPath(); ctx.arc(24, -121, 3.6, 0, 7); ctx.arc(33, -123, 3.6, 0, 7); ctx.fill();
    // Ohr
    ctx.fillStyle = OD; ctx.beginPath(); ctx.ellipse(19, -106, 7, 3.5, -.6, 0, 7); ctx.fill();
    ctx.fillStyle = "#f7a6a0"; ctx.beginPath(); ctx.ellipse(19, -106, 4, 1.8, -.6, 0, 7); ctx.fill();
    // Auge, Nasenloch, Lächeln, Bäckchen
    const tot = zustand === "aus";
    ctx.fillStyle = "#2b1a0e";
    if (tot) {
      ctx.strokeStyle = "#2b1a0e"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(32, -106); ctx.lineTo(38, -100); ctx.moveTo(38, -106); ctx.lineTo(32, -100); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(35, -103, 3.6, 0, 7); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(36.3, -104.4, 1.3, 0, 7); ctx.fill();
    }
    ctx.fillStyle = "#8d4b12"; ctx.beginPath(); ctx.ellipse(49, -98, 1.6, 1.2, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = "#8d4b12"; ctx.lineWidth = 1.8;
    ctx.beginPath(); tot ? ctx.arc(44, -88, 4, 1.15 * Math.PI, 1.85 * Math.PI) : ctx.arc(44, -94, 4, .15 * Math.PI, .85 * Math.PI); ctx.stroke();
    ctx.fillStyle = "rgba(240,110,110,.45)"; ctx.beginPath(); ctx.ellipse(30, -94, 4, 2.5, 0, 0, 7); ctx.fill();
    ctx.restore();
  }

  function ball(b) {
    const y = BODEN - b.r - b.hoehe;
    ctx.fillStyle = "rgba(0,0,0,.12)";
    ctx.beginPath(); ctx.ellipse(b.x, BODEN + 2, b.r * (1 - b.hoehe / 160), 3.5, 0, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(b.x, y); ctx.rotate(b.dreh);
    ctx.fillStyle = b.f[0]; ctx.beginPath(); ctx.arc(0, 0, b.r, 0, 7); ctx.fill();
    ctx.fillStyle = b.f[1];
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, b.r, 0, Math.PI / 3); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, b.r, Math.PI * 2 / 3, Math.PI); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, b.r, Math.PI * 4 / 3, Math.PI * 5 / 3); ctx.fill();
    ctx.restore();
    ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.beginPath(); ctx.arc(b.x - b.r * .35, y - b.r * .4, b.r * .25, 0, 7); ctx.fill();
  }

  function texte() {
    const p = Math.floor(strecke / 10);
    ctx.textAlign = "right"; ctx.font = "600 18px Segoe UI, system-ui, sans-serif";
    ctx.fillStyle = blitz > 0 && Math.floor(blitz * 10) % 2 ? "#3b8f3c" : "#24332f";
    ctx.fillText(String(p).padStart(5, "0"), W - 18, 30);
    ctx.fillStyle = "#6b7b76"; ctx.font = "15px Segoe UI, system-ui, sans-serif";
    ctx.fillText("Rekord " + String(rekord).padStart(5, "0"), W - 18, 52);

    if (zustand !== "laeuft" && form.hidden) { // während der Namenseingabe liegt die Karte darüber
      ctx.fillStyle = "rgba(255,255,255,.82)"; rund(W / 2 - 200, 92, 400, 96, 16); ctx.fill();
      ctx.textAlign = "center"; ctx.fillStyle = "#034a3e";
      ctx.font = "700 26px Segoe UI, system-ui, sans-serif";
      ctx.fillText(zustand === "start" ? "Fröbelinchen springt!" : "Hoppla, ein Ball!", W / 2, 132);
      ctx.font = "16px Segoe UI, system-ui, sans-serif"; ctx.fillStyle = "#24332f";
      const los = handy ? (vollbild ? "Tippen" : "Tippen für Vollbild") : "Leertaste oder Tippen";
      ctx.fillText(zustand === "start" ? `${los} zum Starten` : `${p} Punkte · ${los} für neue Runde`, W / 2, 164);
    }
  }

  function bild(t) {
    const dt = Math.min(.05, (t - zeitAlt) / 1000 || 0); zeitAlt = t;
    schritt(dt);
    hintergrund();
    baelle.forEach(ball);
    laeuferin();
    giraffe();
    texte();
    requestAnimationFrame(bild);
  }
  requestAnimationFrame(bild);
})();
