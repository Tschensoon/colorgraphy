// Menschen für „Detektiv Fröbelinchen“: ein durchgehender Körper mit Gelenken und handgemalten Oberflächen.
// Alles entsteht hier aus Code. Eine Figur ist ein einziges Netz, das spart am Handy viele Zeichenaufrufe. Figuren schauen nach -z.
export function figurenWerkstatt(T, handy) {
  const FARBE = {
    anja: { kopfBreite: 1.07, haut: "#f0bf9e", hautDunkel: "#c88a6a", shirt: "#2a3247", shirtHell: "#4b5774", shirtDunkel: "#141926", hose: "#232a3c", hoseHell: "#46506a", hoseDunkel: "#10141f", haar: "#d2a55c", haarHell: "#f2d79a", haarDunkel: "#8f6a35", schuh: "#23252c", iris: "#6f8fa6", lippe: "#c9625f", lang: true, vorhang: true, blazer: true, laecheln: true, naegel: "#6d1524" },
    aylin: { haut: "#d9a27a", hautDunkel: "#a66b48", shirt: "#2d9b86", shirtHell: "#62c9b0", shirtDunkel: "#14594d", hose: "#39394a", hoseHell: "#66667c", hoseDunkel: "#1b1b26", haar: "#27191a", haarHell: "#6b4a3d", haarDunkel: "#0d0809", schuh: "#3a2a22", iris: "#5a3a1e", lippe: "#a84a4a", lang: true },
  };

  // Felder auf der gemalten Fläche (x, y, Breite, Höhe als Anteil)
  const FELD = {
    haut: [0, 0, .25, .25], gesicht: [.25, 0, .5, .5], haar: [.75, 0, .25, .5], aermel: [0, .25, .25, .25],
    shirt: [0, .5, .5, .25], hose: [.5, .5, .5, .25], schuh: [0, .75, .25, .25], guertel: [.25, .75, .25, .25],
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

    if (P.naegel) {
      g.fillStyle = P.naegel;
      for (let i = 0; i < 10; i++) { g.beginPath(); g.ellipse(x + b * (i + .5) / 10, y + h * .965, b * .03, h * .035, 0, 0, Math.PI * 2); g.fill(); }
    }

    // Gesicht: u läuft um den Kopf, die Mitte schaut nach vorn
    [x, y, b, h] = feld("gesicht");
    verlauf(x, y, b, h, P.haut, P.haut, P.hautDunkel);
    striche(x, y, b, h, [P.hautDunkel, "#fff0dc"], 70, 90 * s, 34 * s, true, .35);
    const mx = x + b / 2, gy = (t) => y + h * t, gx = (u) => mx + b * u;
    const weich = (cx, cy, r, farbe, a) => { const v = g.createRadialGradient(cx, cy, 0, cx, cy, r); v.addColorStop(0, farbe); v.addColorStop(1, "rgba(0,0,0,0)"); g.save(); g.globalAlpha = a; g.fillStyle = v; g.fillRect(cx - r, cy - r, r * 2, r * 2); g.restore(); };
    // Augenhöhlen, Wangen, Kinn und Nase als gemalte Schatten
    for (const si of [-1, 1]) {
      weich(gx(si * .082), gy(.46), 44 * s, P.hautDunkel, .28);
      weich(gx(si * .112), gy(.625), P.laecheln ? 54 * s : 40 * s, "#ee7464", P.laecheln ? .27 : .2);
      // Auge
      g.save(); g.translate(gx(si * .082), gy(.485));
      g.fillStyle = "#fbf7ef"; g.beginPath(); g.ellipse(0, 0, 25 * s, (P.laecheln ? 12.5 : 16.5) * s, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = P.iris; g.beginPath(); g.arc(-si * 2 * s, 0, 13 * s, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#120d0a"; g.beginPath(); g.arc(-si * 2 * s, 0, 5.5 * s, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#fff"; g.beginPath(); g.arc(-si * 2 * s - 3.5 * s, -3.5 * s, 2.8 * s, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "#2a1610"; g.lineCap = "round"; g.lineWidth = 6 * s; g.beginPath(); g.moveTo(-27 * s, 1 * s); g.quadraticCurveTo(0, -27 * s, 27 * s, 0); g.stroke();
      g.lineWidth = 2 * s; g.globalAlpha = .55; g.beginPath(); g.moveTo(-22 * s, 8 * s); g.quadraticCurveTo(0, (P.laecheln ? 9 : 16) * s, 22 * s, 7 * s); g.stroke(); g.globalAlpha = 1;
      if (P.laecheln) {                                  // Lachfältchen und nach oben gedrückte Wange
        g.strokeStyle = P.hautDunkel; g.globalAlpha = .55; g.lineWidth = 2.6 * s;
        for (const o of [0, 7]) { g.beginPath(); g.moveTo(si * -29 * s, (o - 2) * s); g.lineTo(si * -39 * s, (o - 6) * s); g.stroke(); }
        g.beginPath(); g.moveTo(-22 * s, 15 * s); g.quadraticCurveTo(0, 23 * s, 22 * s, 15 * s); g.stroke(); g.globalAlpha = 1;
      }
      g.restore();
      // Augenbraue
      g.strokeStyle = P.haarDunkel; g.lineWidth = 8 * s; g.lineCap = "round"; g.beginPath(); g.moveTo(gx(si * .04), gy(.425)); g.quadraticCurveTo(gx(si * .085), gy(.395), gx(si * .133), gy(.43)); g.stroke();
    }
    weich(mx, gy(.655), 22 * s, P.hautDunkel, .32);                         // unter der Nase
    g.strokeStyle = P.hautDunkel; g.globalAlpha = .7; g.lineWidth = 4 * s; g.lineCap = "round"; g.beginPath(); g.moveTo(gx(-.019), gy(.635)); g.quadraticCurveTo(mx, gy(.655), gx(.019), gy(.635)); g.stroke(); g.globalAlpha = 1;
    if (P.laecheln) {
      // Breites Lachen mit Zähnen
      const mb = .102;
      g.fillStyle = P.lippe; g.beginPath(); g.moveTo(gx(-mb - .006), gy(.722)); g.quadraticCurveTo(mx, gy(.706), gx(mb + .006), gy(.722)); g.quadraticCurveTo(gx(.05), gy(.822), mx, gy(.84)); g.quadraticCurveTo(gx(-.05), gy(.822), gx(-mb - .006), gy(.722)); g.fill();
      g.fillStyle = "#4a1b1c"; g.beginPath(); g.moveTo(gx(-mb), gy(.727)); g.quadraticCurveTo(mx, gy(.718), gx(mb), gy(.727)); g.quadraticCurveTo(gx(.044), gy(.8), mx, gy(.822)); g.quadraticCurveTo(gx(-.044), gy(.8), gx(-mb), gy(.727)); g.fill();
      g.fillStyle = "#fbf8f0"; g.beginPath(); g.moveTo(gx(-mb + .004), gy(.728)); g.quadraticCurveTo(mx, gy(.719), gx(mb - .004), gy(.728)); g.quadraticCurveTo(gx(.05), gy(.777), mx, gy(.79)); g.quadraticCurveTo(gx(-.05), gy(.777), gx(-mb + .004), gy(.728)); g.fill();
      g.strokeStyle = "#d9d3c6"; g.lineWidth = 1.4 * s;
      for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(gx(i * .017), gy(.724)); g.lineTo(gx(i * .015), gy(.772)); g.stroke(); }
      g.strokeStyle = P.hautDunkel; g.globalAlpha = .65; g.lineWidth = 3.4 * s;
      for (const si of [-1, 1]) { g.beginPath(); g.moveTo(gx(si * .083), gy(.655)); g.quadraticCurveTo(gx(si * .112), gy(.71), gx(si * .098), gy(.765)); g.stroke(); }
      g.globalAlpha = .3; g.fillStyle = P.hautDunkel;
      for (let i = 0; i < 26; i++) { g.beginPath(); g.arc(gx((z() - .5) * .3), gy(.54 + z() * .08), (1 + z() * 1.4) * s, 0, Math.PI * 2); g.fill(); }
      g.globalAlpha = 1;
    } else {
      g.fillStyle = P.lippe; g.beginPath(); g.moveTo(gx(-.052), gy(.742)); g.quadraticCurveTo(gx(-.018), gy(.72), mx, gy(.73)); g.quadraticCurveTo(gx(.018), gy(.72), gx(.052), gy(.742)); g.quadraticCurveTo(mx, gy(.785), gx(-.052), gy(.742)); g.fill();
      g.strokeStyle = "#5e2826"; g.lineWidth = 2.8 * s; g.beginPath(); g.moveTo(gx(-.05), gy(.743)); g.quadraticCurveTo(mx, gy(.752), gx(.05), gy(.743)); g.stroke();
    }
    weich(mx, gy(.82), 30 * s, P.hautDunkel, .14);

    // Haare: viele senkrechte Strähnen in drei Tönen
    [x, y, b, h] = feld("haar");
    verlauf(x, y, b, h, P.haarHell, P.haar, P.haarDunkel);
    g.save(); g.beginPath(); g.rect(x, y, b, h); g.clip(); g.lineCap = "round";
    for (let i = 0; i < 520; i++) {
      const sx = x + z() * b, sy = y + z() * h * .75, l = h * (.15 + z() * .45);
      g.strokeStyle = [P.haarDunkel, P.haarDunkel, P.haarHell, P.haarHell, P.haar][Math.floor(z() * 5)];
      g.globalAlpha = .16 + z() * .24; g.lineWidth = (1.4 + z() * 3.4) * s;
      g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo(sx + (z() - .5) * 8 * s, sy + l * .5, sx + (z() - .5) * 10 * s, sy + l); g.stroke();
    }
    g.restore();

    if (P.vorhang) {                                     // Mittelscheitel: Die Vorderseite des Haars liegt bei u = 0,75
      g.save(); g.beginPath(); g.rect(x, y, b, h); g.clip();
      const sx = x + b * .75, v = g.createLinearGradient(sx - 16 * s, 0, sx + 16 * s, 0);
      v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(.5, P.haarDunkel); v.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = v; g.fillRect(sx - 16 * s, y, 32 * s, h * .3); g.restore();
    }

    // Ärmel
    [x, y, b, h] = feld("aermel");
    verlauf(x, y, b, h, P.shirtHell, P.shirt, P.shirtDunkel);
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

    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = handy ? 2 : 4; t.generateMipmaps = true;
    return t;
  }

  // ---------- Formen: Röhren aus Ringen, jeder Ring ist an Gelenke gebunden ----------
  function neuesNetz() {
    return { pos: [], nor: [], uv: [], knochen: [], gewicht: [], index: [] };
  }
  // ring: { c: Mittelpunkt, a: erste Halbachse, b: zweite Halbachse, t: Stelle auf der gemalten Fläche, j: [[Gelenk, Gewicht], ...] }
  function roehre(n, ringe, feldName, seg = 10, u0 = 0, u1 = 1) {
    const [fx, fy, fb, fh] = FELD[feldName], start = n.pos.length / 3;
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

    // Hüfte und Rumpf
    const vorn = Math.PI / 2;
    roehre(n, [
      senk(0, 1.1, 0, .128, .094, 0, [[br, .5], [h, .5]], vorn), senk(0, 1.05, 0, .146, .104, .16, [[h, 1]], vorn), senk(0, 1.0, .004, .166, .116, .34, [[h, 1]], vorn), senk(0, .93, .006, .178, .124, .58, [[h, 1]], vorn),
      senk(0, .86, .004, .158, .112, .8, [[h, .7], [J.beinLO, .15], [J.beinRO, .15]], vorn), senk(0, .8, .002, .06, .07, 1, [[h, .4], [J.beinLO, .3], [J.beinRO, .3]], vorn),
    ], "guertel", 16);
    roehre(n, [
      senk(0, 1.5, -.003, .052, .052, 0, [[ha, 1]], vorn), senk(0, 1.485, -.003, .082, .066, .04, [[br, .35], [ha, .65]], vorn), senk(0, 1.465, -.002, .135, .083, .09, [[br, 1]], vorn),
      senk(0, 1.435, 0, .172, .098, .17, [[br, 1]], vorn), senk(0, 1.39, -.006, .183, .116, .3, [[br, 1]], vorn), senk(0, 1.33, -.012, .172, .126, .45, [[br, 1]], vorn), senk(0, 1.26, -.009, .152, .116, .62, [[br, .85], [h, .15]], vorn),
      senk(0, 1.18, -.002, .134, .098, .78, [[br, .55], [h, .45]], vorn), senk(0, 1.11, 0, .13, .096, .9, [[br, .3], [h, .7]], vorn), senk(0, 1.045, 0, .15, .106, 1, [[h, 1]], vorn),
    ], "shirt", 18);
    // Hals
    roehre(n, [
      senk(0, 1.58, -.014, .058, .06, .1, [[ko, .8], [ha, .2]]), senk(0, 1.52, -.006, .06, .06, .5, [[ha, 1]]), senk(0, 1.45, 0, .07, .066, .8, [[ha, .4], [br, .6]]),
    ], "haut", 10);

    // Kopf: Ringe vom Scheitel zum Kinn, die Mitte des gemalten Felds liegt vorn
    const kh = 1.525;
    const kopfRinge = [[.3, .004, .004, .0], [.292, .062, .068, .0], [.275, .096, .106, .0], [.245, .113, .124, .0], [.205, .119, .13, .0], [.16, .118, .128, -.002], [.115, .111, .12, -.004], [.075, .098, .106, -.008], [.04, .079, .09, -.013], [.015, .052, .066, -.018], [.002, .008, .014, -.021]];
    const kb = P.kopfBreite || 1;
    roehre(n, kopfRinge.map(([y, rx, rz, dz], i) => senk(0, kh + y, -.015 + dz, rx * kb, rz, i / (kopfRinge.length - 1), [[ko, 1]], Math.PI / 2)), "gesicht", 20);
    // Nase und Ohren
    const nz = -.14;
    roehre(n, [
      { c: [0, kh + .176, nz + .016], a: [.008, 0, 0], b: [0, .012, 0], t: .6, j: [[ko, 1]] },
      { c: [0, kh + .15, nz + .006], a: [.012, 0, 0], b: [0, .017, 0], t: .6, j: [[ko, 1]] },
      { c: [0, kh + .126, nz - .002], a: [.018, 0, 0], b: [0, .017, 0], t: .6, j: [[ko, 1]] },
      { c: [0, kh + .112, nz - .006], a: [.019, 0, 0], b: [0, .01, 0], t: .6, j: [[ko, 1]] },
      { c: [0, kh + .106, nz - .004], a: [.004, 0, 0], b: [0, .003, 0], t: .6, j: [[ko, 1]] },
    ], "haut", 9);
    const ob = P.kopfBreite || 1;
    for (const si of [-1, 1]) roehre(n, [
      { c: [si * .108 * ob, kh + .158, -.015], a: [.002, 0, 0], b: [0, .002, 0], t: .5, j: [[ko, 1]] },
      { c: [si * .12 * ob, kh + .158, -.014], a: [0, .032, 0], b: [0, 0, .02], t: .5, j: [[ko, 1]] },
      { c: [si * .127 * ob, kh + .16, -.008], a: [0, .024, 0], b: [0, 0, .015], t: .5, j: [[ko, 1]] },
      { c: [si * .13 * ob, kh + .16, -.006], a: [0, .002, 0], b: [0, 0, .002], t: .5, j: [[ko, 1]] },
    ], "haut", 7);

    // Haare: Die Vorderkante der Kappe bildet den Haaransatz über der Stirn
    const kappe = [[.322, .006, .006, .01], [.312, .068, .076, .012], [.292, .108, .122, .018], [.262, .124, .143, .028], [.228, .129, .146, .038]];
    const unten = P.vorhang
      ? [[.2, .12, .12, .04], [.17, .08, .08, .04]]
      : P.lang
      ? [[.19, .132, .126, .058], [.13, .131, .112, .08], [.06, .133, .105, .1], [-.02, .13, .09, .108], [-.1, .135, .066, .112, .75], [-.19, .142, .056, .112, .4], [-.27, .118, .044, .108, .1]]
      : [[.19, .128, .122, .052], [.145, .122, .106, .066], [.1, .108, .09, .075], [.06, .082, .068, .074], [.035, .036, .036, .062]];
    const haarRinge = [...kappe, ...unten];
    roehre(n, haarRinge.map(([y, rx, rz, dz, g], i) => {
      const j = g === undefined ? [[ko, 1]] : [[ko, g], [J.zopf, 1 - g]];
      return senk(0, kh + y, dz - .015, rx, rz, i / (haarRinge.length - 1), j);
    }), "haar", 18);
    if (P.vorhang) {
      // Ein durchgehender Haarmantel: vom Scheitel um das Gesicht, über die Schultern und vorn wie hinten bis auf die Brust.
      // Jede Lage ist vorn offen und hat eine Innenseite, damit man nirgends hindurchschaut.
      const lage = (y, rx, rz, rzHinten, cz, offen, dicke, t, j) => ({
        t, j, form: (u) => {
          const aussen = u <= .5, v = aussen ? u * 2 : (1 - u) * 2, w = offen + (Math.PI * 2 - offen * 2) * v, si = Math.sin(w), co = Math.cos(w);
          const rand = Math.min(1, Math.min(v, 1 - v) * 14), d = aussen ? 1 : 1 - dicke * rand, tiefe = co > 0 ? rz : rzHinten;
          const nx = si / rx, nz = -co / tiefe, l = Math.hypot(nx, nz), au = aussen ? 1 : -1;
          return { p: [rx * d * si, kh + y, cz - tiefe * d * co], n: [au * nx / l, 0, au * nz / l] };
        },
      });
      const a = .0174533;
      roehre(n, [
        lage(.275, .112, .135, .158, .012, 12 * a, .14, .3, [[ko, 1]]), lage(.255, .128, .148, .178, .004, 20 * a, .18, .34, [[ko, 1]]), lage(.22, .136, .153, .188, -.004, 34 * a, .22, .4, [[ko, 1]]), lage(.19, .142, .152, .19, .002, 46 * a, .24, .46, [[ko, 1]]),
        lage(.13, .147, .143, .188, .012, 55 * a, .28, .54, [[ko, 1]]), lage(.06, .152, .128, .184, .017, 59 * a, .3, .62, [[ko, 1]]), lage(-.02, .165, .126, .182, .012, 55 * a, .32, .7, [[ko, .85], [br, .15]]),
        lage(-.1, .205, .15, .188, .002, 42 * a, .28, .77, [[ko, .45], [br, .55]]), lage(-.17, .24, .178, .195, -.012, 37 * a, .24, .83, [[ko, .15], [br, .85]]), lage(-.27, .242, .184, .197, -.018, 35 * a, .2, .89, [[br, 1]]),
        lage(-.36, .225, .18, .19, -.018, 38 * a, .15, .95, [[br, 1]]), lage(-.44, .185, .165, .165, -.015, 48 * a, .06, 1, [[br, 1]]),
      ], "haar", 34, .05, .95);
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
      // Hand mit angedeutetem Daumen
      roehre(n, [
        senk(x2 + si * .002, .89, -.011, .032, .029, .1, [[u, 1]]), senk(x2 + si * .004, .845, -.013, .047, .024, .3, [[u, 1]]), senk(x2 + si * .004, .795, -.014, .051, .024, .55, [[u, 1]]),
        senk(x2 + si * .003, .745, -.013, .042, .018, .85, [[u, 1]]), senk(x2 + si * .002, .72, -.012, .012, .007, 1, [[u, 1]]),
      ], "haut", 8);
      roehre(n, [
        senk(x2 - si * .028, .85, -.03, .012, .011, .3, [[u, 1]]), senk(x2 - si * .036, .805, -.043, .015, .014, .4, [[u, 1]]), senk(x2 - si * .032, .77, -.05, .004, .004, .5, [[u, 1]]),
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
    const mat = new T.MeshLambertMaterial({ map: malen(P, wer === "anja" ? 7331 : 9127) });
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
