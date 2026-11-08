// Menschen für „Detektiv Fröbelinchen“: ein durchgehender Körper mit Gelenken und handgemalten Oberflächen.
// Alles entsteht hier aus Code. Eine Figur ist ein einziges Netz, das spart am Handy viele Zeichenaufrufe. Figuren schauen nach -z.
export function figurenWerkstatt(T, handy) {
  const FARBE = {
    anja: { kopfBreite: 1.07, haut: "#f0bf9e", hautDunkel: "#c88a6a", shirt: "#2a3247", shirtHell: "#4b5774", shirtDunkel: "#141926", hose: "#232a3c", hoseHell: "#46506a", hoseDunkel: "#10141f", haar: "#d2a55c", haarHell: "#f2d79a", haarDunkel: "#8f6a35", schuh: "#23252c", iris: "#6f8fa6", lippe: "#c9625f", lang: true, vorhang: true, blazer: true, laecheln: true, naegel: "#6d1524" },
    anke: { kopfBreite: 1.07, nase: .72, scheitel: .045, ansatz: .45, brauen: 8, haut: "#f4c8ab", hautDunkel: "#c98d6c", shirt: "#1d2438", shirtHell: "#3a4566", shirtDunkel: "#0f1320", hose: "#1f2536", hoseHell: "#3f475f", hoseDunkel: "#0e111b", haar: "#c39a5e", haarHell: "#efd6a0", haarDunkel: "#4e3420", schuh: "#23252c", iris: "#6b5a3e", lippe: "#c9706a", lang: true, vorhang: true, kurz: true, rund: .38, blazer: true, laecheln: true },   // Anke: Haare nur bis zu den Schultern
    aylin: { haut: "#d9a27a", hautDunkel: "#a66b48", shirt: "#2d9b86", shirtHell: "#62c9b0", shirtDunkel: "#14594d", hose: "#39394a", hoseHell: "#66667c", hoseDunkel: "#1b1b26", haar: "#27191a", haarHell: "#6b4a3d", haarDunkel: "#0d0809", schuh: "#3a2a22", iris: "#5a3a1e", lippe: "#a84a4a", lang: true },
  };

  // Felder auf der gemalten Fläche (x, y, Breite, Höhe als Anteil)
  const FELD = {
    haut: [0, 0, .25, .25], gesicht: [.25, 0, .5, .5], haar: [.75, 0, .25, .5], aermel: [0, .25, .25, .25],
    shirt: [0, .5, .5, .25], hose: [.5, .5, .5, .25], schuh: [0, .75, .25, .25], guertel: [.25, .75, .25, .25], auge: [.5, .75, .25, .25],
  };

  function zufallVon(saat) { let s = saat; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
  function malen(P, saat) {
    const G = handy ? 512 : 1024, c = document.createElement("canvas"); c.width = c.height = G;
    const g = c.getContext("2d"), z = zufallVon(saat);
    const feld = (n) => { const [x, y, b, h] = FELD[n]; return [x * G, y * G, b * G, h * G]; };
    const verlauf = (x, y, b, h, oben, mitte, unten) => { const v = g.createLinearGradient(0, y, 0, y + h); v.addColorStop(0, oben); v.addColorStop(.45, mitte); v.addColorStop(1, unten); g.fillStyle = v; g.fillRect(x, y, b, h); };
    // Pinselstriche: der handgemalte Eindruck kommt aus vielen weichen, halbtransparenten Strichen
    const striche = (x, y, b, h, farben, n, laenge, dicke, senkrecht = false, staerke = 1) => {
      g.save(); g.beginPath(); g.rect(x, y, b, h); g.clip(); g.lineCap = "round";
      for (let i = 0; i < n; i++) {
        const px = x + z() * b, py = y + z() * h, w = (senkrecht ? Math.PI / 2 : 0) + (z() - .5) * .5, l = laenge * (.5 + z());
        g.strokeStyle = farben[Math.floor(z() * farben.length)]; g.globalAlpha = (.05 + z() * .1) * staerke; g.lineWidth = dicke * (.5 + z());
        g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px + Math.cos(w) * l * .5 + (z() - .5) * dicke, py + Math.sin(w) * l * .5, px + Math.cos(w) * l, py + Math.sin(w) * l); g.stroke();
      }
      g.restore();
    };
    const s = G / 1024;

    // Haut
    let [x, y, b, h] = feld("haut");
    g.fillStyle = P.haut; g.fillRect(x, y, b, h);
    striche(x, y, b, h, [P.hautDunkel, "#fff0dc"], 60, 90 * s, 30 * s, true, .45);

    { const v = g.createLinearGradient(0, y, 0, y + h * .12); v.addColorStop(0, P.hautDunkel); v.addColorStop(1, P.haut); g.fillStyle = v; g.fillRect(x, y, b, h * .12); }
    if (P.naegel) {
      g.fillStyle = P.naegel;
      for (let i = 0; i < 10; i++) { g.beginPath(); g.ellipse(x + b * (i + .5) / 10, y + h * .965, b * .03, h * .035, 0, 0, Math.PI * 2); g.fill(); }
    }

    // Gesicht: u läuft um den Kopf, die Mitte schaut nach vorn
    [x, y, b, h] = feld("gesicht");
    g.fillStyle = P.haut; g.fillRect(x, y, b, h);
    striche(x, y, b, h, [P.hautDunkel, "#fff0dc"], 50, 90 * s, 34 * s, true, .22);
    const mx = x + b / 2, gy = (t) => y + h * t, gx = (u) => mx + b * u;
    const weich = (cx, cy, r, farbe, a) => { const v = g.createRadialGradient(cx, cy, 0, cx, cy, r); v.addColorStop(0, farbe); v.addColorStop(1, "rgba(0,0,0,0)"); g.save(); g.globalAlpha = a; g.fillStyle = v; g.fillRect(cx - r, cy - r, r * 2, r * 2); g.restore(); };
    // Augenhöhlen, Wangen, Kinn und Nase als gemalte Schatten
    for (const si of [-1, 1]) {
      weich(gx(si * .082), gy(.47), 34 * s, P.hautDunkel, .24);
      weich(gx(si * .112), gy(.625), P.laecheln ? 54 * s : 40 * s, "#ee7464", P.laecheln ? .27 : .2);
      // Lidkanten und Falte über dem Auge, das Auge selbst ist eine eigene Form
      g.save(); g.translate(gx(si * .082), gy(.49));
      const offen = P.laecheln ? .78 : 1;
      g.strokeStyle = "#2a1610"; g.lineCap = "round"; g.lineWidth = 3.6 * s; g.beginPath(); g.moveTo(-20 * s, 3 * s); g.quadraticCurveTo(-3 * s, -15 * offen * s, 20 * s, 1 * s); g.stroke();
      g.strokeStyle = P.hautDunkel; g.globalAlpha = .55; g.lineWidth = 2.2 * s; g.beginPath(); g.moveTo(-19 * s, -8 * s); g.quadraticCurveTo(0, -24 * offen * s, 19 * s, -9 * s); g.stroke();
      g.globalAlpha = .4; g.lineWidth = 1.8 * s; g.beginPath(); g.moveTo(-17 * s, 7 * s); g.quadraticCurveTo(0, 14 * offen * s, 17 * s, 6 * s); g.stroke(); g.globalAlpha = 1;
      if (P.laecheln) {                                  // Lachfältchen
        g.strokeStyle = P.hautDunkel; g.globalAlpha = .5; g.lineWidth = 2.4 * s;
        for (const o of [0, 5]) { g.beginPath(); g.moveTo(si * -24 * s, (o - 1) * s); g.lineTo(si * -32 * s, (o - 4) * s); g.stroke(); }
        g.globalAlpha = 1;
      }
      g.restore();
      // Augenbraue
      g.strokeStyle = P.haarDunkel; g.globalAlpha = P.brauen ? .95 : .8; g.lineCap = "round"; g.lineWidth = (P.brauen || 6) * s; g.beginPath(); g.moveTo(gx(si * .048), gy(.432)); g.quadraticCurveTo(gx(si * .08), gy(.408), gx(si * .118), gy(.43)); g.stroke(); g.globalAlpha = 1;
    }
    weich(mx, gy(.64), 24 * s, "#e0705f", .22);
    weich(mx, gy(.68), 15 * s, P.hautDunkel, .18);                         // unter der Nase
    if (P.laecheln) {
      // Breites Lachen mit Zähnen
      const mb = .074;
      g.fillStyle = P.lippe; g.beginPath(); g.moveTo(gx(-mb - .006), gy(.722)); g.quadraticCurveTo(mx, gy(.706), gx(mb + .006), gy(.722)); g.quadraticCurveTo(gx(.04), gy(.812), mx, gy(.82)); g.quadraticCurveTo(gx(-.04), gy(.812), gx(-mb - .006), gy(.722)); g.fill();
      g.fillStyle = "#4a1b1c"; g.beginPath(); g.moveTo(gx(-mb), gy(.727)); g.quadraticCurveTo(mx, gy(.718), gx(mb), gy(.727)); g.quadraticCurveTo(gx(.036), gy(.792), mx, gy(.8)); g.quadraticCurveTo(gx(-.036), gy(.792), gx(-mb), gy(.727)); g.fill();
      g.fillStyle = "#fbf8f0"; g.beginPath(); g.moveTo(gx(-mb + .004), gy(.728)); g.quadraticCurveTo(mx, gy(.719), gx(mb - .004), gy(.728)); g.quadraticCurveTo(gx(.036), gy(.77), mx, gy(.776)); g.quadraticCurveTo(gx(-.036), gy(.77), gx(-mb + .004), gy(.728)); g.fill();
      g.strokeStyle = "#ded8cb"; g.lineWidth = 1 * s;
      for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(gx(i * .014), gy(.726)); g.lineTo(gx(i * .012), gy(.764)); g.stroke(); }
      g.strokeStyle = P.hautDunkel; g.globalAlpha = .65; g.lineWidth = 3.4 * s;
      for (const si of [-1, 1]) { g.beginPath(); g.moveTo(gx(si * .05), gy(.665)); g.quadraticCurveTo(gx(si * .088), gy(.7), gx(si * .086), gy(.748)); g.stroke(); }
      g.globalAlpha = .16; g.fillStyle = P.hautDunkel;
      for (let i = 0; i < 22; i++) { g.beginPath(); g.arc(gx((z() - .5) * .24), gy(.55 + z() * .06), (.8 + z()) * s, 0, Math.PI * 2); g.fill(); }
      g.globalAlpha = 1;
    } else {
      g.fillStyle = P.lippe; g.beginPath(); g.moveTo(gx(-.052), gy(.742)); g.quadraticCurveTo(gx(-.018), gy(.72), mx, gy(.73)); g.quadraticCurveTo(gx(.018), gy(.72), gx(.052), gy(.742)); g.quadraticCurveTo(mx, gy(.785), gx(-.052), gy(.742)); g.fill();
      g.strokeStyle = "#5e2826"; g.lineWidth = 2.8 * s; g.beginPath(); g.moveTo(gx(-.05), gy(.743)); g.quadraticCurveTo(mx, gy(.752), gx(.05), gy(.743)); g.stroke();
    }
    weich(mx, gy(.82), 30 * s, P.hautDunkel, .14);

    // Haare: viele senkrechte Strähnen in drei Tönen
    [x, y, b, h] = feld("haar");
    verlauf(x, y, b, h, P.haarHell, P.haar, P.haarDunkel);
    if (P.ansatz) { const v = g.createLinearGradient(0, y, 0, y + h * P.ansatz); v.addColorStop(0, P.haarDunkel); v.addColorStop(.55, P.haarDunkel + "b0"); v.addColorStop(1, P.haarDunkel + "00"); g.fillStyle = v; g.fillRect(x, y, b, h * P.ansatz); }   // dunkler Ansatz, blonde Längen
    g.save(); g.beginPath(); g.rect(x, y, b, h); g.clip(); g.lineCap = "round";
    for (let i = 0; i < 520; i++) {
      const sx = x + z() * b, sy = y + z() * h * .75, l = h * (.15 + z() * .45);
      g.strokeStyle = [P.haarDunkel, P.haarDunkel, P.haarHell, P.haarHell, P.haar][Math.floor(z() * 5)];
      g.globalAlpha = .16 + z() * .24; g.lineWidth = (1.4 + z() * 3.4) * s;
      g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo(sx + (z() - .5) * 8 * s, sy + l * .5, sx + (z() - .5) * 10 * s, sy + l); g.stroke();
    }
    g.restore();

    { const v = g.createLinearGradient(0, y + h * .3, 0, y + h * .56); v.addColorStop(0, "rgba(255,255,255,0)"); v.addColorStop(.5, "rgba(255,255,255,.2)"); v.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = v; g.fillRect(x, y + h * .3, b, h * .26); }
    if (P.vorhang) {                                     // Mittelscheitel: Die Vorderseite des Haars liegt bei u = 0,75
      g.save(); g.beginPath(); g.rect(x, y, b, h); g.clip();
      const sx = x + b * (.75 + (P.scheitel || 0)), v = g.createLinearGradient(sx - 16 * s, 0, sx + 16 * s, 0);
      v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(.5, P.haarDunkel); v.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = v; g.fillRect(sx - 16 * s, y, 32 * s, h * .3); g.restore();
    }

    // Ärmel
    [x, y, b, h] = feld("aermel");
    if (P.blazer) { g.fillStyle = P.shirt; g.fillRect(x, y, b, h); } else verlauf(x, y, b, h, P.shirtHell, P.shirt, P.shirtDunkel);
    striche(x, y, b, h, [P.shirtDunkel, P.shirtHell], 30, 80 * s, 20 * s, true, .8);
    if (!P.blazer) { g.fillStyle = P.shirtDunkel; g.fillRect(x, y + h * .9, b, h * .1); }

    // Shirt mit Falten, Kragen und Schatten unter der Brust
    [x, y, b, h] = feld("shirt");
    verlauf(x, y, b, h, P.shirtHell, P.shirt, P.shirtDunkel);
    striche(x, y, b, h, [P.shirtDunkel, P.shirtHell], 70, 110 * s, 30 * s, true, .9);
    g.strokeStyle = P.shirtDunkel; g.lineCap = "round";
    for (let i = 0; i < 12; i++) { const fx = x + z() * b, fy = y + h * (.45 + z() * .42); g.globalAlpha = .13; g.lineWidth = (5 + z() * 8) * s; g.beginPath(); g.moveTo(fx, fy); g.quadraticCurveTo(fx + (z() - .5) * 60 * s, fy + 34 * s, fx + (z() - .5) * 90 * s, fy + 70 * s); g.stroke(); }
    g.globalAlpha = 1;
    const brustMitte = x + b / 2;
    weich(brustMitte, y + h * .32, 150 * s, "#ffffff", .15);
    weich(brustMitte, y + h * .58, 120 * s, P.shirtDunkel, .45);
    if (P.blazer) {
      // Weißes Oberteil im offenen Blazer, darüber die Revers
      g.fillStyle = "#f3f1ea"; g.beginPath(); g.moveTo(brustMitte - 76 * s, y); g.lineTo(brustMitte + 76 * s, y); g.lineTo(brustMitte + 8 * s, y + h * .62); g.lineTo(brustMitte - 8 * s, y + h * .62); g.closePath(); g.fill();
      weich(brustMitte, y + h * .6, 40 * s, "#a9b0bb", .4);
      for (const si of [-1, 1]) {
        g.fillStyle = P.shirtHell; g.beginPath(); g.moveTo(brustMitte + si * 76 * s, y); g.lineTo(brustMitte + si * 108 * s, y + h * .08); g.lineTo(brustMitte + si * 84 * s, y + h * .27); g.lineTo(brustMitte + si * 60 * s, y + h * .23); g.lineTo(brustMitte + si * 8 * s, y + h * .62); g.closePath(); g.fill();
        g.strokeStyle = P.shirtDunkel; g.lineWidth = 4 * s; g.stroke();
      }
      g.fillStyle = P.haut; g.beginPath(); g.ellipse(brustMitte, y, 62 * s, 32 * s, 0, 0, Math.PI); g.fill();
      g.strokeStyle = "#d8d5cd"; g.lineWidth = 5 * s; g.beginPath(); g.ellipse(brustMitte, y, 62 * s, 32 * s, 0, 0, Math.PI); g.stroke();
      g.strokeStyle = "#8c939c"; g.lineWidth = 3 * s; g.beginPath(); g.moveTo(brustMitte - 44 * s, y); g.quadraticCurveTo(brustMitte, y + 62 * s, brustMitte + 44 * s, y); g.stroke();
      g.fillStyle = "#59606b"; g.beginPath(); g.ellipse(brustMitte, y + 32 * s, 7 * s, 8 * s, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = P.shirtDunkel; g.fillRect(brustMitte - 2 * s, y + h * .72, 4 * s, h * .28);
    } else {
      g.fillStyle = P.haut; g.beginPath(); g.ellipse(brustMitte, y, 72 * s, 38 * s, 0, 0, Math.PI); g.fill();
      g.strokeStyle = P.shirtDunkel; g.lineWidth = 7 * s; g.beginPath(); g.ellipse(brustMitte, y, 72 * s, 38 * s, 0, 0, Math.PI); g.stroke();
    }

    // Hose mit Naht und Knie
    [x, y, b, h] = feld("hose");
    verlauf(x, y, b, h, P.hose, P.hose, P.hoseDunkel);
    striche(x, y, b, h, [P.hoseDunkel, P.hoseHell], 120, 90 * s, 18 * s, true, .9);
    g.globalAlpha = .55; g.strokeStyle = P.hoseHell; g.lineWidth = 3 * s; g.setLineDash([9 * s, 7 * s]);
    for (const u of [.24, .76]) { g.beginPath(); g.moveTo(x + b * u, y); g.lineTo(x + b * u, y + h); g.stroke(); }
    g.setLineDash([]); g.globalAlpha = .28; g.fillStyle = P.hoseHell;
    g.beginPath(); g.ellipse(x + b / 2, y + h * .52, 60 * s, 26 * s, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;

    // Gürtel und Hüfte
    [x, y, b, h] = feld("guertel");
    g.fillStyle = P.hose; g.fillRect(x, y, b, h);
    striche(x, y, b, h, [P.hoseDunkel, P.hoseHell], 50, 60 * s, 12 * s, true, .9);
    g.fillStyle = "#2c1d15"; g.fillRect(x, y, b, h * .2);
    g.fillStyle = "#c9a54f"; g.fillRect(x + b / 2 - 20 * s, y + h * .025, 40 * s, h * .15);

    // Schuhe: Oberseite hell, unten dunkle Sohle
    [x, y, b, h] = feld("schuh");
    g.fillStyle = P.schuh; g.fillRect(x, y, b, h);
    striche(x, y, b, h, ["#00000044", "#ffffff66"], 40, 50 * s, 10 * s);
    g.fillStyle = "#3c3a38"; g.fillRect(x + b * .28, y, b * .44, h);
    g.fillStyle = "#6e6964"; g.fillRect(x + b * .28, y, b * .03, h); g.fillRect(x + b * .69, y, b * .03, h);

    // Auge: oben Pupille, dann Iris, darunter das Weiße
    [x, y, b, h] = feld("auge");
    g.fillStyle = "#f7f3ea"; g.fillRect(x, y, b, h);
    const iv = g.createLinearGradient(0, y, 0, y + h * .24);
    iv.addColorStop(0, "#090605"); iv.addColorStop(.34, "#090605"); iv.addColorStop(.42, P.iris); iv.addColorStop(.84, P.iris); iv.addColorStop(1, "#1b1512");
    g.fillStyle = iv; g.fillRect(x, y, b, h * .24);
    for (let i = 0; i < 90; i++) { g.strokeStyle = z() < .5 ? "rgba(255,255,255,.2)" : "rgba(0,0,0,.22)"; g.lineWidth = 1.5 * s; const fx = x + z() * b; g.beginPath(); g.moveTo(fx, y + h * .1); g.lineTo(fx, y + h * .22); g.stroke(); }
    { const v = g.createLinearGradient(0, y + h * .24, 0, y + h); v.addColorStop(0, "#e5ded3"); v.addColorStop(.15, "#f7f3ea"); v.addColorStop(1, "#d8cbc0"); g.fillStyle = v; g.fillRect(x, y + h * .24, b, h * .76); }

    // Feines Relief: Haare und Stoff bekommen aus der Malerei eine Normalenkarte, Gesicht und Haut bleiben glatt
    const hoehe = document.createElement("canvas"); hoehe.width = hoehe.height = G;
    const hg = hoehe.getContext("2d"); hg.drawImage(c, 0, 0); hg.fillStyle = "#808080";
    for (const n of ["haut", "gesicht", "auge"]) { const [fx, fy, fb, fh] = feld(n); hg.fillRect(fx, fy, fb, fh); }
    const quelle = hg.getImageData(0, 0, G, G).data, ziel = new ImageData(G, G), o = ziel.data, stark = handy ? 1.3 : 2.2;
    const H = (px, py) => { const k = ((py + G) % G * G + (px + G) % G) * 4; return (quelle[k] + quelle[k + 1] + quelle[k + 2]) / 765; };
    for (let py = 0; py < G; py++) for (let px = 0; px < G; px++) {
      const nx = (H(px - 1, py) - H(px + 1, py)) * stark, ny = (H(px, py + 1) - H(px, py - 1)) * stark, l = Math.hypot(nx, ny, 1), k = (py * G + px) * 4;
      o[k] = (nx / l * .5 + .5) * 255; o[k + 1] = (ny / l * .5 + .5) * 255; o[k + 2] = (1 / l * .5 + .5) * 255; o[k + 3] = 255;
    }
    hg.putImageData(ziel, 0, 0);
    const normalen = new T.CanvasTexture(hoehe); normalen.anisotropy = 2;

    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = handy ? 2 : 4; t.generateMipmaps = true;
    return { farbe: t, normalen };
  }

  // ---------- Formen: Röhren aus Ringen, jeder Ring ist an Gelenke gebunden ----------
  function neuesNetz() {
    return { pos: [], nor: [], uv: [], knochen: [], gewicht: [], index: [] };
  }
  // ring: { c: Mittelpunkt, a: erste Halbachse, b: zweite Halbachse, t: Stelle auf der gemalten Fläche, j: [[Gelenk, Gewicht], ...] }
  function roehre(n, ringe, feldName, seg = 10, u0 = 0, u1 = 1) {
    const [fx, fy, fb, fh] = FELD[feldName], start = n.pos.length / 3, indexVon = n.index.length;
    ringe.forEach((r) => {
      const al = r.form ? 1 : r.a[0] * r.a[0] + r.a[1] * r.a[1] + r.a[2] * r.a[2], bl = r.form ? 1 : r.b[0] * r.b[0] + r.b[1] * r.b[1] + r.b[2] * r.b[2];
      for (let i = 0; i <= seg; i++) {
        if (r.form) {
          const f = r.form(i / seg); n.pos.push(...f.p); n.nor.push(...f.n);
        } else {
          const w = i / seg * Math.PI * 2 + (r.dreh || 0), co = Math.cos(w), si = Math.sin(w);
          for (let k = 0; k < 3; k++) n.pos.push(r.c[k] + r.a[k] * co + r.b[k] * si);
          const nx = r.a[0] / al * co + r.b[0] / bl * si, ny = r.a[1] / al * co + r.b[1] / bl * si, nz = r.a[2] / al * co + r.b[2] / bl * si;
          const l = Math.hypot(nx, ny, nz) || 1; n.nor.push(nx / l, ny / l, nz / l);
        }
        n.uv.push(fx + (u0 + (u1 - u0) * i / seg) * fb, 1 - (fy + r.t * fh));
        const j = r.j.concat([[0, 0], [0, 0], [0, 0]]).slice(0, 4);
        j.forEach(([k]) => n.knochen.push(k)); j.forEach(([, g]) => n.gewicht.push(g));
      }
    });
    const p = n.pos, nn = n.nor, zeile = seg + 1;
    for (let q = 0; q < ringe.length - 1; q++) for (let i = 0; i < seg; i++) {
      const a = start + q * zeile + i, b = a + 1, c = a + zeile, d = c + 1;
      for (const [x, y, z] of [[a, c, b], [b, c, d]]) {
        // Richtung so wählen, dass die Fläche nach außen zeigt
        const ux = p[y * 3] - p[x * 3], uy = p[y * 3 + 1] - p[x * 3 + 1], uz = p[y * 3 + 2] - p[x * 3 + 2];
        const vx = p[z * 3] - p[x * 3], vy = p[z * 3 + 1] - p[x * 3 + 1], vz = p[z * 3 + 2] - p[x * 3 + 2];
        const fnx = uy * vz - uz * vy, fny = uz * vx - ux * vz, fnz = ux * vy - uy * vx;
        const dot = fnx * (nn[x * 3] + nn[y * 3] + nn[z * 3]) + fny * (nn[x * 3 + 1] + nn[y * 3 + 1] + nn[z * 3 + 1]) + fnz * (nn[x * 3 + 2] + nn[y * 3 + 2] + nn[z * 3 + 2]);
        const summe = Math.hypot(nn[x * 3] + nn[y * 3] + nn[z * 3], nn[x * 3 + 1] + nn[y * 3 + 1] + nn[z * 3 + 1], nn[x * 3 + 2] + nn[y * 3 + 2] + nn[z * 3 + 2]);
        if (summe < 1.2) n.index.push(x, y, z, x, z, y);
        else if (dot >= 0) n.index.push(x, y, z); else n.index.push(x, z, y);
      }
    }
    return { start, indexVon, seg, zeilen: ringe.length };
  }
  // Glatte Flächenrichtungen aus den echten Dreiecken, damit auch modellierte Formen richtig im Licht liegen
  function glaetten(n, teil, geschlossen = true) {
    const { start, indexVon, seg, zeilen } = teil, anz = (seg + 1) * zeilen, feld = new Float64Array(anz * 3), p = n.pos, ix = n.index;
    for (let i = indexVon; i < ix.length; i += 3) {
      const a = ix[i], b = ix[i + 1], c = ix[i + 2];
      if (a < start || a >= start + anz) continue;
      const ux = p[b * 3] - p[a * 3], uy = p[b * 3 + 1] - p[a * 3 + 1], uz = p[b * 3 + 2] - p[a * 3 + 2], vx = p[c * 3] - p[a * 3], vy = p[c * 3 + 1] - p[a * 3 + 1], vz = p[c * 3 + 2] - p[a * 3 + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      for (const e of [a, b, c]) { const q = (e - start) * 3; feld[q] += nx; feld[q + 1] += ny; feld[q + 2] += nz; }
    }
    if (geschlossen) for (let r = 0; r < zeilen; r++) {
      const a = r * (seg + 1) * 3, b = (r * (seg + 1) + seg) * 3;
      for (let k = 0; k < 3; k++) { const w = feld[a + k] + feld[b + k]; feld[a + k] = w; feld[b + k] = w; }
    }
    for (let i = 0; i < anz; i++) {
      const q = i * 3, l = Math.hypot(feld[q], feld[q + 1], feld[q + 2]) || 1, z = (start + i) * 3;
      n.nor[z] = feld[q] / l; n.nor[z + 1] = feld[q + 1] / l; n.nor[z + 2] = feld[q + 2] / l;
    }
  }
  const senk = (x, y, z, rx, rz, t, j, dreh) => ({ c: [x, y, z], a: [rx, 0, 0], b: [0, 0, rz], t, j, dreh });

  function bauen(wer) {
    const P = FARBE[wer], n = neuesNetz(), gruppe = new T.Group();
    // Gelenke: Name, Elternteil, Lage im Raum
    const def = [
      ["huefte", -1, 0, .96, 0], ["brust", 0, 0, 1.2, 0], ["hals", 1, 0, 1.49, -.005], ["kopf", 2, 0, 1.525, -.01],
      ["armLO", 1, .205, 1.42, 0], ["armLU", 4, .218, 1.14, 0], ["armRO", 1, -.205, 1.42, 0], ["armRU", 6, -.218, 1.14, 0],
      ["beinLO", 0, .088, .92, 0], ["beinLU", 8, .092, .52, 0], ["beinRO", 0, -.088, .92, 0], ["beinRU", 10, -.092, .52, 0],
      ["zopf", 3, 0, 1.655, .12],
    ];
    const J = Object.fromEntries(def.map((d, i) => [d[0], i]));
    const knochen = def.map(() => new T.Bone());
    def.forEach(([, eltern, x, y, z], i) => {
      if (eltern < 0) knochen[i].position.set(x, y, z);
      else { const e = def[eltern]; knochen[i].position.set(x - e[2], y - e[3], z - e[4]); knochen[eltern].add(knochen[i]); }
    });
    const h = J.huefte, br = J.brust, ha = J.hals, ko = J.kopf;

    // Hüfte und Rumpf (mit „rund“ wird die Taille voller, für eine rundere Figur)
    const rund = (y) => 1 + (P.rund || 0) * Math.exp(-(((y - 1.12) / .13) ** 2));
    const vorn = Math.PI / 2;
    roehre(n, [
      senk(0, 1.1, 0, .128 * rund(1.1), .094 * rund(1.1), 0, [[br, .5], [h, .5]], vorn), senk(0, 1.05, 0, .146 * rund(1.05), .104 * rund(1.05), .16, [[h, 1]], vorn), senk(0, 1.0, .004, .166 * rund(1.0), .116 * rund(1.0), .34, [[h, 1]], vorn), senk(0, .93, .006, .178 * rund(.93), .124 * rund(.93), .58, [[h, 1]], vorn),
      senk(0, .86, .006, .152 * rund(.86), .092 * rund(.86), .8, [[h, .7], [J.beinLO, .15], [J.beinRO, .15]], vorn), senk(0, .8, .004, .05 * rund(.8), .05 * rund(.8), 1, [[h, .4], [J.beinLO, .3], [J.beinRO, .3]], vorn),
    ], "guertel", 16);
    roehre(n, [
      senk(0, 1.5, -.003, .052 * rund(1.5), .052 * rund(1.5), 0, [[ha, 1]], vorn), senk(0, 1.485, -.003, .082 * rund(1.485), .066 * rund(1.485), .04, [[br, .35], [ha, .65]], vorn), senk(0, 1.465, -.002, .135 * rund(1.465), .083 * rund(1.465), .09, [[br, 1]], vorn),
      senk(0, 1.435, 0, .172 * rund(1.435), .098 * rund(1.435), .17, [[br, 1]], vorn), senk(0, 1.39, -.006, .183 * rund(1.39), .116 * rund(1.39), .3, [[br, 1]], vorn), senk(0, 1.33, -.012, .172 * rund(1.33), .126 * rund(1.33), .45, [[br, 1]], vorn), senk(0, 1.26, -.009, .152 * rund(1.26), .116 * rund(1.26), .62, [[br, .85], [h, .15]], vorn),
      senk(0, 1.18, -.002, .134 * rund(1.18), .098 * rund(1.18), .78, [[br, .55], [h, .45]], vorn), senk(0, 1.11, 0, .13 * rund(1.11), .096 * rund(1.11), .9, [[br, .3], [h, .7]], vorn), senk(0, 1.045, 0, .15 * rund(1.045), .106 * rund(1.045), 1, [[h, 1]], vorn),
    ], "shirt", 18);
    // Hals
    roehre(n, [
      senk(0, 1.58, -.014, .058, .06, .01, [[ko, .8], [ha, .2]]), senk(0, 1.52, -.006, .06, .06, .06, [[ha, 1]]), senk(0, 1.45, 0, .07, .066, .115, [[ha, .4], [br, .6]]),
    ], "haut", 10);

    // Kopf: eine modellierte Fläche. u läuft einmal herum (0,5 = vorn), t vom Scheitel zum Kinn
    const kh = 1.525, kb = P.kopfBreite || 1, kopfAb = n.pos.length / 3;
    const kopfTafel = [[.3, .004, .004, 0], [.292, .062, .068, 0], [.275, .096, .106, 0], [.245, .113, .124, 0], [.205, .119, .13, 0], [.16, .118, .128, -.002], [.115, .111, .12, -.004], [.075, .098, .106, -.008], [.04, .079, .09, -.013], [.015, .052, .066, -.018], [.002, .008, .014, -.021]];
    const glocke = (a, s0) => Math.exp(-(a * a) / (s0 * s0));
    const stufe = (a, e, x) => { const q = Math.max(0, Math.min(1, (x - a) / (e - a))); return q * q * (3 - 2 * q); };
    const hoeheLid = P.laecheln ? .0165 : .02;
    function kopfVersatz(u, t) {
      const du = u - .5;
      let d = 0;
      for (const si of [-1, 1]) {
        d -= .0135 * glocke(du - si * .082, .036) * glocke(t - .49, hoeheLid);    // Augenhöhle
        d += .0055 * glocke(du - si * .082, .034) * glocke(t - .462, .011);       // Oberlid
        d += .0055 * glocke(du - si * .092, .052) * glocke(t - .425, .02);        // Brauenbogen
        d += (P.laecheln ? .0105 : .0065) * glocke(du - si * .118, .05) * glocke(t - .62, .055);   // Wange
        d += .0075 * (P.nase || 1) * glocke(du - si * .024, .013 * (P.nase || 1)) * glocke(t - .655, .018);         // Nasenflügel
      }
      const nasenTiefe = .033 * (P.nase || 1) * stufe(.44 + (1 - (P.nase || 1)) * .1, .625, t) * (1 - stufe(.63, .71, t));   // nase < 1: kleinere, kürzere Nase
      d += nasenTiefe * glocke(du, .011 + .009 * stufe(.54, .64, t));
      d += .0055 * glocke(du, P.laecheln ? .07 : .05) * glocke(t - .733, .016);    // Oberlippe
      d += .007 * glocke(du, P.laecheln ? .062 : .045) * glocke(t - .785, .018);   // Unterlippe
      d -= .0032 * glocke(du, P.laecheln ? .09 : .058) * glocke(t - .758, .007);   // Mundspalt
      d += .0065 * glocke(du, .04) * glocke(t - .895, .035);                       // Kinn
      return d;
    }
    function kopfGrund(u, t) {
      const q = Math.min(kopfTafel.length - 1.0001, t * (kopfTafel.length - 1)), i = Math.floor(q), f = q - i, a = kopfTafel[i], b = kopfTafel[i + 1], m = f * f * (3 - 2 * f), l = (x) => a[x] + (b[x] - a[x]) * (f * .4 + m * .6);
      const w = u * Math.PI * 2 + Math.PI / 2;
      return { y: kh + l(0), rx: l(1) * kb, rz: l(2), cz: -.015 + l(3), si: Math.sin(w), co: Math.cos(w) };
    }
    function kopfPunkt(u, t, extra = 0) {
      const g = kopfGrund(u, t), d = kopfVersatz(u, t) + extra, nx = g.co / g.rx, nz = g.si / g.rz, ll = Math.hypot(nx, nz) || 1;
      return { p: [g.rx * g.co + nx / ll * d, g.y, g.cz + g.rz * g.si + nz / ll * d], n: [nx / ll, .0, nz / ll] };
    }
    const kopfZeilen = handy ? 26 : 34, kopfSeg = handy ? 30 : 40, kopfForm = [];
    for (let r = 0; r <= kopfZeilen; r++) { const t = r / kopfZeilen; kopfForm.push({ t, j: [[ko, 1]], form: (u) => kopfPunkt(u, t) }); }
    glaetten(n, roehre(n, kopfForm, "gesicht", kopfSeg));

    // Augäpfel liegen in den Höhlen, die Pupille schaut nach vorn
    for (const si of [-1, 1]) {
      const m = kopfPunkt(.5 + si * .082, .49, .0135 - .0165).p, r = .0185, ringe = [];
      for (let i = 0; i <= 11; i++) { const w = i / 11 * Math.PI, ra = Math.max(.0006, Math.sin(w) * r); ringe.push({ c: [m[0], m[1], m[2] - Math.cos(w) * r], a: [ra, 0, 0], b: [0, ra, 0], t: i / 11, j: [[ko, 1]] }); }
      roehre(n, ringe, "auge", 14);
    }
    // Ohren
    for (const si of [-1, 1]) roehre(n, [
      { c: [si * .108 * kb, kh + .158, -.015], a: [.002, 0, 0], b: [0, .002, 0], t: .5, j: [[ko, 1]] },
      { c: [si * .12 * kb, kh + .158, -.014], a: [0, .032, 0], b: [0, 0, .02], t: .5, j: [[ko, 1]] },
      { c: [si * .127 * kb, kh + .16, -.008], a: [0, .024, 0], b: [0, 0, .015], t: .5, j: [[ko, 1]] },
      { c: [si * .13 * kb, kh + .16, -.006], a: [0, .002, 0], b: [0, 0, .002], t: .5, j: [[ko, 1]] },
    ], "haut", 7);

    // Haare: Die Vorderkante der Kappe bildet den Haaransatz über der Stirn
    const kappe = P.vorhang
      ? [[.3, .006, .006, .01], [.29, .06, .072, .004], [.272, .098, .114, .004], [.25, .118, .14, .006], [.232, .12, .142, .008]]
      : [[.322, .006, .006, .01], [.312, .068, .076, .012], [.292, .108, .122, .018], [.262, .124, .143, .028], [.228, .129, .146, .038]];
    const unten = P.vorhang
      ? [[.215, .105, .1, .03], [.19, .07, .07, .03]]
      : P.lang
      ? [[.19, .132, .126, .058], [.13, .131, .112, .08], [.06, .133, .105, .1], [-.02, .13, .09, .108], [-.1, .135, .066, .112, .75], [-.19, .142, .056, .112, .4], [-.27, .118, .044, .108, .1]]
      : [[.19, .128, .122, .052], [.145, .122, .106, .066], [.1, .108, .09, .075], [.06, .082, .068, .074], [.035, .036, .036, .062]];
    const haarRinge = [...kappe, ...unten];
    if (!P.vorhang) roehre(n, haarRinge.map(([y, rx, rz, dz, g], i) => {
      const j = g === undefined ? [[ko, 1]] : [[ko, g], [J.zopf, 1 - g]];
      return senk(0, kh + y, dz - .015, rx, rz, i / (haarRinge.length - 1), j);
    }), "haar", 18);
    if (P.vorhang) {
      // Ein durchgehender Haarmantel: vom Scheitel um das Gesicht, über die Schultern und vorn wie hinten bis auf die Brust.
      // Jede Lage ist vorn offen und hat eine Innenseite, damit man nirgends hindurchschaut.
      const lage = (y, rx, rz, rzHinten, cz, offen, dicke, t, j, spitzen = 0) => ({
        y, t, j, form: (u) => {
          const aussen = u <= .5, v = aussen ? u * 2 : (1 - u) * 2, w = offen + (Math.PI * 2 - offen * 2) * v, si = Math.sin(w), co = Math.cos(w);
          const rand = Math.min(1, Math.min(v, 1 - v) * 14), d = aussen ? 1 : 1 - dicke * rand, tiefe = co > 0 ? rz : rzHinten;
          const nx = si / rx, nz = -co / tiefe, l = Math.hypot(nx, nz), au = aussen ? 1 : -1;
          const bueschel = aussen ? 1 + rand * stufe(.27, .14, y) * (.022 * Math.sin(w * 9 + .8) + .014 * Math.sin(w * 19 + 2.1) + .006 * Math.sin(w * 37)) : 1;
          const zack = spitzen * (Math.sin(w * 13 + 1) * .55 + Math.sin(w * 31) * .45);
          return { p: [rx * d * bueschel * si, kh + y + zack, cz - tiefe * d * bueschel * co], n: [au * nx / l, 0, au * nz / l] };
        },
      });
      const a = .0174533;
      const lagen = [
        lage(.325, .012, .014, .016, .012, .4 * a, .1, .22, [[ko, 1]]), lage(.318, .058, .066, .08, .012, .4 * a, .12, .24, [[ko, 1]]), lage(.302, .094, .11, .128, .012, .5 * a, .13, .27, [[ko, 1]]), lage(.28, .118, .134, .16, .01, 2.5 * a, .15, .3, [[ko, 1]]), lage(.26, .13, .146, .176, .004, 14 * a, .18, .33, [[ko, 1]]), lage(.24, .134, .152, .184, -.002, 34 * a, .2, .36, [[ko, 1]]), lage(.215, .137, .154, .188, -.002, 46 * a, .22, .41, [[ko, 1]]), lage(.19, .142, .152, .19, .002, 52 * a, .24, .46, [[ko, 1]]),
        lage(.13, .147, .143, .188, .012, 55 * a, .28, .54, [[ko, 1]]), lage(.06, .152, .128, .184, .017, 59 * a, .3, .62, [[ko, 1]]), lage(-.02, .165, .126, .182, .012, 55 * a, .32, .7, [[ko, .85], [br, .15]]),
        lage(-.1, .205, .15, .188, .002, 42 * a, .28, .77, [[ko, .45], [br, .55]]), lage(-.17, .24, .178, .195, -.012, 37 * a, .24, .83, [[ko, .15], [br, .85]]), lage(-.245, .242, .184, .197, -.018, 35 * a, .2, .89, [[br, 1]]),
        lage(-.31, .225, .18, .19, -.018, 38 * a, .15, .95, [[br, 1]], .008), lage(-.37, .185, .165, .165, -.015, 48 * a, .06, 1, [[br, 1]], .024),
      ];
      glaetten(n, roehre(n, P.kurz ? lagen.filter(l => l.y > -.13) : lagen, "haar", handy ? 44 : 64, .05, .95), false);
    } else if (P.lang) {
      // Zwei Strähnen rahmen das Gesicht
      for (const si of [-1, 1]) roehre(n, [
        senk(si * .1, kh + .24, -.09, .015, .012, .05, [[ko, 1]]), senk(si * .116, kh + .18, -.092, .03, .018, .25, [[ko, 1]]), senk(si * .122, kh + .09, -.075, .032, .022, .5, [[ko, 1]]),
        senk(si * .128, kh - .02, -.05, .034, .024, .75, [[ko, .8], [J.zopf, .2]]), senk(si * .132, kh - .11, -.03, .01, .01, 1, [[ko, .5], [J.zopf, .5]]),
      ], "haar", 8);
    } else {
      // Pferdeschwanz
      const pz = .15;
      roehre(n, [
        senk(0, kh + .165, pz - .012, .015, .015, 0, [[ko, 1]]), senk(0, kh + .135, pz + .01, .036, .036, .1, [[J.zopf, .6], [ko, .4]]), senk(0, kh + .07, pz + .032, .05, .05, .35, [[J.zopf, 1]]),
        senk(0, kh - .03, pz + .036, .048, .046, .6, [[J.zopf, 1]]), senk(0, kh - .13, pz + .026, .03, .028, .85, [[J.zopf, 1]]), senk(0, kh - .2, pz + .012, .006, .006, 1, [[J.zopf, 1]]),
      ], "haar", 9);
      roehre(n, [senk(0, kh + .172, pz - .018, .022, .022, .02, [[ko, 1]]), senk(0, kh + .15, pz - .003, .028, .028, .02, [[ko, 1]]), senk(0, kh + .13, pz + .01, .022, .022, .02, [[ko, 1]])], "aermel", 8);
    }

    {
      const kopfBis = n.pos.length / 3, faktor = .9;
      for (let i = kopfAb; i < kopfBis; i++) {
        const q = i * 3, y = n.pos[q + 1], w = stufe(kh - .06, kh + .1, y), sk = 1 + (faktor - 1) * w;
        n.pos[q] *= sk; n.pos[q + 2] = -.012 + (n.pos[q + 2] + .012) * sk; n.pos[q + 1] = y < kh ? y : kh + (y - kh) * sk;
      }
    }

    // Arme und Hände
    for (const [si, o, u] of [[1, J.armLO, J.armLU], [-1, J.armRO, J.armRU]]) {
      const x0 = si * .205, x1 = si * .218, x2 = si * .226;
      roehre(n, [
        senk(si * .165, 1.445, 0, .01, .01, 0, [[br, 1]]), senk(si * .185, 1.436, 0, .04, .046, .08, [[o, .5], [br, .5]]), senk(si * .205, 1.4, 0, .054, .058, .28, [[o, 1]]),
        senk(si * .212, 1.34, 0, .056, .059, .62, [[o, 1]]), ...(P.blazer ? [] : [senk(si * .216, 1.27, 0, .057, .059, .96, [[o, 1]]), senk(si * .216, 1.262, 0, .052, .054, 1, [[o, 1]])]),
      ], "aermel", 12);
      const dick = P.blazer ? .012 : 0;
      roehre(n, [
        ...(P.blazer ? [senk(si * .212, 1.34, 0, .056, .059, .02, [[o, 1]])] : []),
        senk(x0 + si * .011, 1.3, 0, .047 + dick, .049 + dick, .05, [[o, 1]]), senk(x0 + si * .012, 1.2, 0, .045 + dick, .046 + dick, .28, [[o, .78], [u, .22]]), senk(x1, 1.14, -.003, .043 + dick, .044 + dick, .4, [[o, .4], [u, .6]]),
        senk(x1 + si * .002, 1.07, -.007, .049 + dick, .049 + dick, .55, [[u, 1]]), senk(x2, .96, -.009, .04 + dick, .039 + dick, .78, [[u, 1]]), senk(x2 + si * .002, .885, -.01, .032 + dick, .03 + dick, .88, [[u, 1]]),
      ], P.blazer ? "aermel" : "haut", 10);
      // Hand mit Fingern und Daumen
      roehre(n, [
        senk(x2 + si * .002, .89, -.011, .03, .027, .1, [[u, 1]]), senk(x2 + si * .004, .85, -.013, .041, .023, .3, [[u, 1]]), senk(x2 + si * .004, .805, -.015, .045, .021, .55, [[u, 1]]), senk(x2 + si * .004, .785, -.016, .04, .016, .7, [[u, 1]]),
      ], "haut", 8);
      [[-.03, .074], [-.01, .087], [.01, .082], [.03, .066]].forEach(([dx, lang]) => {
        const fx = x2 + si * .004 + dx, fz = -.016;
        roehre(n, [
          senk(fx, .795, fz, .0095, .0105, .68, [[u, 1]]), senk(fx, .795 - lang * .5, fz - .004, .0088, .0095, .75, [[u, 1]]), senk(fx, .795 - lang * .9, fz - .012, .0078, .0085, .82, [[u, 1]]),
          senk(fx, .795 - lang * .98, fz - .014, .0074, .0078, .965, [[u, 1]]), senk(fx, .795 - lang * 1.02, fz - .016, .0025, .0025, .99, [[u, 1]]),
        ], "haut", 6);
      });
      roehre(n, [
        senk(x2 - si * .032, .86, -.03, .012, .012, .3, [[u, 1]]), senk(x2 - si * .04, .815, -.044, .0115, .0115, .5, [[u, 1]]), senk(x2 - si * .038, .78, -.052, .0095, .0095, .965, [[u, 1]]), senk(x2 - si * .037, .768, -.054, .003, .003, .99, [[u, 1]]),
      ], "haut", 6);
    }

    // Beine und Schuhe
    for (const [si, o, u] of [[1, J.beinLO, J.beinLU], [-1, J.beinRO, J.beinRU]]) {
      const x0 = si * .088, x1 = si * .092;
      roehre(n, [
        senk(x0, .93, .004, .074, .094, 0, [[h, .55], [o, .45]]), senk(x0, .85, .004, .086, .108, .16, [[o, 1]]), senk(x0 + si * .002, .7, .002, .08, .094, .36, [[o, 1]]),
        senk(x1, .57, -.003, .064, .07, .49, [[o, .78], [u, .22]]), senk(x1, .515, -.006, .06, .066, .55, [[o, .45], [u, .55]]), senk(x1, .45, -.002, .061, .068, .62, [[u, .85], [o, .15]]),
        senk(x1, .33, .012, .067, .076, .77, [[u, 1]]), senk(x1, .2, .006, .056, .062, .9, [[u, 1]]), senk(x1, .115, .002, .064, .07, 1, [[u, 1]]),
      ], "hose", 13);
      const schuh = (z, y, a, bb, t) => ({ c: [x1, y, z], a: [a, 0, 0], b: [0, bb, 0], t, j: [[u, 1]], dreh: Math.PI / 2 });
      roehre(n, [schuh(.105, .058, .006, .01, 0), schuh(.09, .066, .058, .064, .08), schuh(.03, .085, .068, .083, .3), schuh(-.05, .068, .071, .065, .55), schuh(-.14, .05, .074, .049, .8), schuh(-.215, .043, .062, .037, .95), schuh(-.24, .038, .014, .014, 1)], "schuh", 13);
    }

    // Netz aufbauen
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute(n.pos, 3));
    geo.setAttribute("normal", new T.Float32BufferAttribute(n.nor, 3));
    geo.setAttribute("uv", new T.Float32BufferAttribute(n.uv, 2));
    geo.setAttribute("skinIndex", new T.Uint16BufferAttribute(n.knochen, 4));
    geo.setAttribute("skinWeight", new T.Float32BufferAttribute(n.gewicht, 4));
    geo.setIndex(n.index);
    const bild = malen(P, wer === "anja" ? 7331 : 9127);
    const mat = new T.MeshStandardMaterial({ map: bild.farbe, normalMap: bild.normalen, normalScale: new T.Vector2(.65, .65), roughness: .68, metalness: 0, envMapIntensity: .55 });
    const netz = new T.SkinnedMesh(geo, mat);
    netz.frustumCulled = false; netz.castShadow = true; netz.receiveShadow = false;
    gruppe.add(netz, knochen[0]);
    gruppe.updateMatrixWorld(true);
    netz.bind(new T.Skeleton(knochen));

    // Arme hängen locker etwas vom Körper weg
    knochen[J.armLO].rotation.z = .07; knochen[J.armRO].rotation.z = -.07;
    return {
      gruppe, k: knochen[0], koerper: knochen[0], brust: knochen[br], hals: knochen[ha], kopf: knochen[ko], schwanz: knochen[J.zopf], zopf: knochen[J.zopf],
      beine: [{ oben: knochen[J.beinLO], unten: knochen[J.beinLU] }, { oben: knochen[J.beinRO], unten: knochen[J.beinRU] }],
      arme: [{ oben: knochen[J.armLO], unten: knochen[J.armLU] }, { oben: knochen[J.armRO], unten: knochen[J.armRU] }],
      mensch: true, huefteY: knochen[0].position.y, dreiecke: n.index.length / 3,
    };
  }
  return { bauen };
}
