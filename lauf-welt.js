// Aussehen für „Fröbelinchen rennt“: Oberflächen (im Browser gemalt), Figuren, Kita-Welt und Hindernisse.
// Alles wird hier aus Code erzeugt, es gibt keine fremden Bilder oder Modelle. Maße in Metern, Figuren schauen nach -z.
export function welt(T, handy) {
  const zufall = (a, b) => a + Math.random() * (b - a);
  const wahl = (liste) => liste[Math.floor(Math.random() * liste.length)];

  // ---------- Oberflächen ----------
  function leinwand(w, h, malen, wiederholen = true) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    malen(c.getContext("2d"), w, h);
    const t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8;
    if (wiederholen) t.wrapS = t.wrapT = T.RepeatWrapping;
    return t;
  }
  // Normalenkarte aus einer Zeichnung (hell = hoch): gibt Oberflächen Relief, ohne zusätzliche Dreiecke
  function normalAus(quelle, staerke = 2) {
    const c = quelle.image || quelle, w = c.width, h = c.height, d = c.getContext("2d").getImageData(0, 0, w, h).data;
    const aus = document.createElement("canvas"); aus.width = w; aus.height = h;
    const g = aus.getContext("2d"), bild = g.createImageData(w, h), o = bild.data;
    const H = (x, y) => { const k = ((((y + h) % h) * w + ((x + w) % w)) * 4); return (d[k] + d[k + 1] + d[k + 2]) / 765; };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const nx = (H(x - 1, y) - H(x + 1, y)) * staerke, ny = (H(x, y + 1) - H(x, y - 1)) * staerke, l = Math.hypot(nx, ny, 1), k = (y * w + x) * 4;
      o[k] = (nx / l * .5 + .5) * 255; o[k + 1] = (ny / l * .5 + .5) * 255; o[k + 2] = (1 / l * .5 + .5) * 255; o[k + 3] = 255;
    }
    g.putImageData(bild, 0, 0);
    const t = new T.CanvasTexture(aus); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 8;
    return t;
  }
  const rauschen = (g, w, h, n, farben, groesse = 1) => {
    for (let i = 0; i < n; i++) { g.fillStyle = wahl(farben); g.fillRect(Math.random() * w, Math.random() * h, groesse, groesse); }
  };
  const gras = leinwand(256, 256, (g, w, h) => {
    g.fillStyle = "#6fae45"; g.fillRect(0, 0, w, h);
    rauschen(g, w, h, 5000, ["#5f9e3a", "#7dbd52", "#86c65a", "#5a9437", "#73b34a"], 2);
    g.lineWidth = 1.2;
    for (let i = 0; i < 900; i++) {      // Halme
      const x = Math.random() * w, y = Math.random() * h;
      g.strokeStyle = wahl(["#4f8a30", "#8fce62", "#69a843"]);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + zufall(-2, 2), y - zufall(3, 7)); g.stroke();
    }
  });
  gras.repeat.set(90, 90);
  const hecke = leinwand(256, 256, (g, w, h) => {
    g.fillStyle = "#2c6526"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) {     // Blätter
      const x = Math.random() * w, y = Math.random() * h, r = zufall(3, 7);
      g.fillStyle = wahl(["#3a7d30", "#478f38", "#55a042", "#336f2b", "#64b04c", "#4b9439"]);
      g.save(); g.translate(x, y); g.rotate(Math.random() * Math.PI);
      g.beginPath(); g.ellipse(0, 0, r, r * .55, 0, 0, 7); g.fill();
      for (const dx of [-w, w]) { g.beginPath(); g.ellipse(dx, 0, r, r * .55, 0, 0, 7); g.fill(); }
      g.restore();
    }
  });
  const pflasterHoehe = document.createElement("canvas"); pflasterHoehe.width = pflasterHoehe.height = 256;
  const pflaster = leinwand(256, 256, (g, w, h) => {
    const hg = pflasterHoehe.getContext("2d"); hg.fillStyle = "#000"; hg.fillRect(0, 0, w, h);
    g.fillStyle = "#8d806d"; g.fillRect(0, 0, w, h);                       // Fugen
    const sh = 32, sb = 64;
    for (let r = 0; r < h / sh; r++) {
      for (let c = -1; c < w / sb + 1; c++) {
        const x = c * sb + (r % 2) * sb / 2, y = r * sh, l = zufall(-12, 12);
        g.fillStyle = `hsl(${zufall(28, 38)}, ${zufall(14, 22)}%, ${70 + l}%)`;
        g.beginPath(); g.roundRect(x + 2, y + 2, sb - 4, sh - 4, 5); g.fill();
        const v = g.createLinearGradient(x, y, x + sb * .4, y + sh);      // Licht von oben links
        v.addColorStop(0, "rgba(255,255,255,.12)"); v.addColorStop(1, "rgba(0,0,0,.12)"); g.fillStyle = v; g.fill();
        [[2, 90], [4, 170], [7, 215]].forEach(([e, hell], i) => {           // Höhe: Kanten abgerundet
          const t = hell + zufall(-10, 10) * i; hg.fillStyle = `rgb(${t},${t},${t})`;
          hg.beginPath(); hg.roundRect(x + e, y + e, sb - 2 * e, sh - 2 * e, 6 - i); hg.fill();
        });
      }
    }
    rauschen(g, w, h, 4000, ["rgba(0,0,0,.06)", "rgba(255,255,255,.08)"], 2);
    rauschen(hg, w, h, 2500, ["rgba(0,0,0,.25)", "rgba(255,255,255,.2)"], 2);
  });
  const holz = leinwand(256, 64, (g, w, h) => {
    g.fillStyle = "#b5824f"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      g.strokeStyle = wahl(["rgba(110,62,28,.35)", "rgba(80,44,20,.3)", "rgba(220,170,120,.3)"]); g.lineWidth = zufall(.6, 2);
      const y = Math.random() * h; g.beginPath(); g.moveTo(0, y);
      for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin(x / 30 + i) * 2);
      g.stroke();
    }
  });
  const rinde = leinwand(64, 256, (g, w, h) => {
    g.fillStyle = "#6b4a2f"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      g.strokeStyle = wahl(["#4e3420", "#82603f", "#5c3f27"]); g.lineWidth = zufall(1, 3);
      const x = Math.random() * w; g.beginPath(); g.moveTo(x, 0);
      for (let y = 0; y <= h; y += 20) g.lineTo(x + zufall(-3, 3), y);
      g.stroke();
    }
  });
  const laub = leinwand(256, 256, (g, w, h) => {
    g.fillStyle = "#3e7f2e"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1600; i++) {
      g.fillStyle = wahl(["#4b9236", "#5aa63f", "#346e27", "#6bb64a", "#2d6223"]);
      g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, zufall(2, 5), zufall(1.5, 3), Math.random() * 3, 0, 7); g.fill();
    }
  });
  // Giraffenmuster: unregelmäßige Flecken mit hellen Linien (Voronoi), waagerecht nahtlos
  const giraffe = leinwand(512, 256, (g, w, h) => {
    const punkte = Array.from({ length: 70 }, () => [Math.random() * w, Math.random() * h, zufall(-8, 8)]);
    const bild = g.createImageData(w, h), d = bild.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let a = 1e9, b = 1e9, ton = 0;
      for (const [px, py, t] of punkte) {
        let dx = Math.abs(x - px); dx = Math.min(dx, w - dx);
        const e = dx * dx + (y - py) * (y - py);
        if (e < a) { b = a; a = e; ton = t; } else if (e < b) b = e;
      }
      const linie = Math.sqrt(b) - Math.sqrt(a) < 5;
      const k = (y * w + x) * 4, n = Math.random() * 10 - 5;
      if (linie) { d[k] = 252 + n; d[k + 1] = 222 + n; d[k + 2] = 170 + n; }
      else { d[k] = 230 + ton + n; d[k + 1] = 128 + ton + n; d[k + 2] = 34 + n; }
      d[k + 3] = 255;
    }
    g.putImageData(bild, 0, 0);
  });
  const fell = leinwand(256, 256, (g, w, h) => {
    g.fillStyle = "#808080"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * w, y = Math.random() * h, l = zufall(3, 7), a = Math.PI / 2 + zufall(-.5, .5), t = Math.round(zufall(60, 200));
      g.strokeStyle = `rgb(${t},${t},${t})`; g.lineWidth = zufall(.6, 1.4);
      for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) { g.beginPath(); g.moveTo(x + dx, y + dy); g.lineTo(x + dx + Math.cos(a) * l, y + dy + Math.sin(a) * l); g.stroke(); }
    }
  });
  const fellNormal = normalAus(fell, 1.6); fellNormal.repeat.set(4, 3);
  const stoff = (farbe, linien) => leinwand(128, 128, (g, w, h) => {
    g.fillStyle = farbe; g.fillRect(0, 0, w, h);
    g.strokeStyle = linien; g.lineWidth = 1;
    for (let i = -h; i < w; i += 4) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); }
    rauschen(g, w, h, 1500, ["rgba(255,255,255,.08)", "rgba(0,0,0,.08)"]);
  });
  const haar = leinwand(128, 128, (g, w, h) => {
    g.fillStyle = "#e6c25a"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      g.strokeStyle = wahl(["#f6dc85", "#cfa63e", "#fbe7a1", "#d9b24b"]); g.lineWidth = zufall(.5, 1.5);
      const x = Math.random() * w; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 4, h / 3, x - 4, h * 2 / 3, x + zufall(-3, 3), h); g.stroke();
    }
  });
  const dach = leinwand(128, 128, (g, w, h) => {
    for (let r = 0; r < 8; r++) for (let c = -1; c < 9; c++) {
      g.fillStyle = `hsl(${zufall(4, 12)}, ${zufall(55, 65)}%, ${zufall(40, 50)}%)`;
      g.beginPath(); g.roundRect(c * 16 + (r % 2) * 8, r * 16, 15, 15, [0, 0, 6, 6]); g.fill();
    }
  });
  const hauswand = (farbe, tuer) => leinwand(256, 256, (g, w, h) => {
    g.fillStyle = farbe; g.fillRect(0, 0, w, h);
    rauschen(g, w, h, 3000, ["rgba(0,0,0,.04)", "rgba(255,255,255,.08)"], 2);
    const fenster = (x, y, b, hh) => {
      g.fillStyle = "#ffffff"; g.fillRect(x - 6, y - 6, b + 12, hh + 12);
      const v = g.createLinearGradient(x, y, x + b, y + hh); v.addColorStop(0, "#9fd3f2"); v.addColorStop(1, "#4f8fbf");
      g.fillStyle = v; g.fillRect(x, y, b, hh);
      g.fillStyle = "#ffffff"; g.fillRect(x + b / 2 - 3, y, 6, hh); g.fillRect(x, y + hh / 2 - 3, b, 6);
    };
    fenster(30, 60, 70, 70); fenster(156, 60, 70, 70);
    if (tuer) { g.fillStyle = tuer; g.fillRect(100, 150, 56, 106); g.fillStyle = "#ffd23f"; g.beginPath(); g.arc(145, 205, 4, 0, 7); g.fill(); }
    else fenster(93, 170, 70, 60);
  }, false);
  const klotz = (farbe, buchstabe) => leinwand(128, 128, (g, w, h) => {
    g.fillStyle = farbe; g.fillRect(0, 0, w, h);
    rauschen(g, w, h, 800, ["rgba(0,0,0,.07)", "rgba(255,255,255,.1)"], 2);
    g.strokeStyle = "rgba(255,255,255,.85)"; g.lineWidth = 8; g.strokeRect(10, 10, w - 20, h - 20);
    g.fillStyle = "#ffffff"; g.font = "bold 76px Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(buchstabe, w / 2, h / 2 + 4);
  }, false);
  const ballMuster = leinwand(256, 128, (g, w, h) => {
    const f = ["#e53935", "#ffffff", "#1e88e5", "#fdd835", "#ffffff", "#43a047"];
    f.forEach((c, i) => { g.fillStyle = c; g.fillRect(i * w / 6, 0, w / 6 + 1, h); });
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, 10); g.fillRect(0, h - 10, w, 10);
  }, false);
  const wolke = leinwand(256, 128, (g, w, h) => {
    for (let i = 0; i < 14; i++) {
      const x = zufall(50, 206), y = zufall(50, 90), r = zufall(22, 42);
      const v = g.createRadialGradient(x, y, 0, x, y, r);
      v.addColorStop(0, "rgba(255,255,255,.95)"); v.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = v; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    }
  }, false);

  // ---------- Materialien ----------
  const std = (o) => new T.MeshStandardMaterial(o);
  const plueschBasis = { roughness: 1, sheen: 1, sheenRoughness: .5, normalMap: fellNormal, normalScale: new T.Vector2(.8, .8) };
  const mat = {
    gras: std({ map: gras, roughness: 1 }),
    weg: std({ map: pflaster, roughness: .9, normalMap: handy ? null : normalAus(pflasterHoehe, 4), normalScale: new T.Vector2(1.2, 1.2) }),
    kante: std({ color: "#cfcac0", roughness: .9 }),
    hecke: std({ map: hecke, roughness: 1, normalMap: handy ? null : normalAus(hecke, 5) }),
    holz: std({ map: holz, roughness: .8 }),
    rinde: std({ map: rinde, roughness: 1, normalMap: normalAus(rinde, 4) }),
    laub: std({ map: laub, roughness: .95, normalMap: handy ? null : normalAus(laub, 4) }),
    dach: std({ map: dach, roughness: .8 }),
    sand: std({ color: "#e9d29a", roughness: 1 }),
    pfuetze: std({ color: "#6f9fc4", roughness: .04, metalness: .2, transparent: true, opacity: .82, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    metall: std({ color: "#2f7fd0", roughness: .3, metalness: .6 }),
    metallRot: std({ color: "#d84a3a", roughness: .35, metalness: .5 }),
    plastikGelb: std({ color: "#ffcd2e", roughness: .35 }),
    plastikRot: std({ color: "#e94b3c", roughness: .35 }),
    stern: std({ color: "#ffc928", roughness: .3, metalness: .55, emissive: "#ffb000", emissiveIntensity: 1.1 }),
    ball: new T.MeshPhysicalMaterial({ map: ballMuster, roughness: .3, clearcoat: 1, clearcoatRoughness: .15 }),
    giraffe: new T.MeshPhysicalMaterial({ map: giraffe, ...plueschBasis, sheenColor: new T.Color("#ffd29a") }),
    giraffeHell: new T.MeshPhysicalMaterial({ color: "#fbe2b8", ...plueschBasis, sheenColor: new T.Color("#fff1d8") }),
    giraffeDunkel: new T.MeshPhysicalMaterial({ color: "#7a3f12", ...plueschBasis, sheenColor: new T.Color("#c47a3a") }),
    auge: std({ color: "#15100b", roughness: .15 }),
    glanz: new T.MeshBasicMaterial({ color: "#ffffff" }),
    haut: new T.MeshPhysicalMaterial({ color: "#efc3a0", roughness: .6, sheen: .4, sheenColor: new T.Color("#ffd8c8") }),
    haar: std({ map: haar, roughness: .55 }),
    shirt: std({ map: stoff("#e2577b", "rgba(0,0,0,.08)"), roughness: .9 }),
    jeans: std({ map: stoff("#3b5a8c", "rgba(255,255,255,.12)"), roughness: .95 }),
    schuh: std({ color: "#f4f4f2", roughness: .7 }),
    sohle: std({ color: "#555", roughness: .9 }),
    lippe: std({ color: "#c76a6a", roughness: .5 }),
    wolke: new T.SpriteMaterial({ map: wolke, transparent: true, depthWrite: false, fog: false }),
    haus: [["#fff1c9", "#3d8fd6"], ["#dceefe", "#e2574c"], ["#ffe1e8", "#43a047"], ["#e9f7dc", "#fb8c00"]].map(([w, t], i) =>
      std({ map: hauswand(w, i % 2 ? null : t), roughness: .9 })),
    klotz: [["#e53935", "A"], ["#1e88e5", "B"], ["#fdd835", "C"], ["#43a047", "D"], ["#8e24aa", "E"], ["#fb8c00", "F"]]
      .map(([f, b]) => std({ map: klotz(f, b), roughness: .6 })),
  };

  // ---------- Formen ----------
  const uvSkala = (geo, su, sv) => {
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
    return geo;
  };
  const kugel = new T.SphereGeometry(1, 28, 20);
  // Gemeinsam genutzte Formen werden markiert und beim Aufräumen nicht freigegeben
  const geteilt = (g) => { g.userData.geteilt = true; return g; };
  const einzel = (m) => { m.userData.einzel = true; return m; };
  geteilt(kugel);
  const formCache = new Map();
  // Maße auf Stufen runden (große Maße auf 0,25 m, kleine auf 0,05 m), damit zufällige Größen sich Formen teilen
  const stufe = (a) => typeof a !== "number" || Number.isInteger(a) ? a : Math.abs(a) >= 1 ? Math.round(a * 4) / 4 : Math.max(.01, Math.round(a * 20) / 20);
  const zwischen = (art, Klasse, roh) => {
    const args = roh.map((a, i) => i < 3 ? stufe(a) : a);   // nur die Maße, nicht Winkel oder Unterteilungen
    const key = art + args.map(a => typeof a === "number" ? a.toFixed(2) : String(a)).join(",");
    if (!formCache.has(key)) formCache.set(key, geteilt(new Klasse(...args)));
    return formCache.get(key);
  };
  const zyl = (...a) => zwischen("z", T.CylinderGeometry, a), kegel = (...a) => zwischen("k", T.ConeGeometry, a), kiste = (...a) => zwischen("b", T.BoxGeometry, a);
  const geo = {
    ball: geteilt(new T.SphereGeometry(.45, 32, 20)),
    klotz: kiste(.82, .5, .82),
    stern: (() => {
      const f = new T.Shape();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? .13 : .3, w = i / 10 * Math.PI * 2; f[i ? "lineTo" : "moveTo"](Math.sin(w) * r, Math.cos(w) * r); }
      const g = new T.ExtrudeGeometry(f, { depth: .06, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 2 }); g.center(); return geteilt(g);
    })(),
    blatt: geteilt(new T.IcosahedronGeometry(1, 2)),
  };

  // Körper und Glieder als Mesh mit Schatten
  const teil = (geom, m, eltern, x = 0, y = 0, z = 0) => {
    const k = new T.Mesh(geom, m); k.position.set(x, y, z); k.castShadow = true; k.receiveShadow = true;
    eltern.add(k); return k;
  };
  const gelenk = (eltern, x, y, z) => { const g = new T.Group(); g.position.set(x, y, z); eltern.add(g); return g; };

  // ---------- Weiche Körper aus einem Stück ----------
  // Ein Formfeld gibt für jeden Punkt den Abstand zur Oberfläche an (negativ = innen). Mehrere Grundformen werden
  // weich ineinander geblendet, das Feld wird in einem Gitter abgetastet und daraus ein glattes Netz gebaut
  // (Surface Nets). So gibt es keine harten Kanten, wo Rumpf, Brust und Hals aufeinandertreffen.
  const F = {
    weich(a, b, k) { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * .25; },
    ei(x, y, z, cx, cy, cz, rx, ry, rz) {                // Ellipsoid (Näherung, für weiches Mischen genau genug)
      const l = Math.hypot((x - cx) / rx, (y - cy) / ry, (z - cz) / rz); return (l - 1) * Math.min(rx, ry, rz);
    },
    stab(x, y, z, a, b, ra, rb) {                        // Kapsel von a nach b mit Radius ra → rb
      const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2], px = x - a[0], py = y - a[1], pz = z - a[2];
      const h = Math.max(0, Math.min(1, (px * bx + py * by + pz * bz) / (bx * bx + by * by + bz * bz)));
      return Math.hypot(px - bx * h, py - by * h, pz - bz * h) - (ra + (rb - ra) * h);
    },
  };
  function formNetz(feld, [x0, y0, z0], [x1, y1, z1], s, extra) {
    const nx = Math.ceil((x1 - x0) / s) + 1, ny = Math.ceil((y1 - y0) / s) + 1, nz = Math.ceil((z1 - z0) / s) + 1;
    const w = new Float32Array(nx * ny * nz), id = (i, j, k) => i + nx * (j + ny * k);
    for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) w[id(i, j, k)] = feld(x0 + i * s, y0 + j * s, z0 + k * s);
    const zelle = new Int32Array(nx * ny * nz).fill(-1), pos = [], nor = [], ext = [];
    const KANTEN = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
    const c = new Float32Array(8), e = s * .5;
    for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      let innen = 0;
      for (let n = 0; n < 8; n++) { c[n] = w[id(i + (n & 1), j + ((n >> 1) & 1), k + ((n >> 2) & 1))]; if (c[n] < 0) innen++; }
      if (innen === 0 || innen === 8) continue;
      let sx = 0, sy = 0, sz = 0, anz = 0;
      for (const [a, b] of KANTEN) {
        if ((c[a] < 0) === (c[b] < 0)) continue;
        const t = c[a] / (c[a] - c[b]);
        sx += (a & 1) + ((b & 1) - (a & 1)) * t; sy += ((a >> 1) & 1) + (((b >> 1) & 1) - ((a >> 1) & 1)) * t; sz += ((a >> 2) & 1) + (((b >> 2) & 1) - ((a >> 2) & 1)) * t; anz++;
      }
      const x = x0 + (i + sx / anz) * s, y = y0 + (j + sy / anz) * s, z = z0 + (k + sz / anz) * s;
      const gx = feld(x + e, y, z) - feld(x - e, y, z), gy = feld(x, y + e, z) - feld(x, y - e, z), gz = feld(x, y, z + e) - feld(x, y, z - e), gl = Math.hypot(gx, gy, gz) || 1;
      zelle[id(i, j, k)] = pos.length / 3; pos.push(x, y, z); nor.push(gx / gl, gy / gl, gz / gl);
      if (extra) ext.push(...extra(x, y, z));
    }
    // je Gitterkante mit Vorzeichenwechsel ein Viereck aus den vier anliegenden Zellen; Richtung am Feld ausrichten
    const idx = [], A = [0, 0, 0], B = [0, 0, 0];
    const viereck = (q) => {
      if (q.some(v => v < 0)) return;
      const [a, b, cc, d] = q;
      for (let n = 0; n < 3; n++) { A[n] = pos[b * 3 + n] - pos[a * 3 + n]; B[n] = pos[cc * 3 + n] - pos[a * 3 + n]; }
      const fx = A[1] * B[2] - A[2] * B[1], fy = A[2] * B[0] - A[0] * B[2], fz = A[0] * B[1] - A[1] * B[0];
      const dot = fx * (nor[a * 3] + nor[cc * 3]) + fy * (nor[a * 3 + 1] + nor[cc * 3 + 1]) + fz * (nor[a * 3 + 2] + nor[cc * 3 + 2]);
      if (dot >= 0) idx.push(a, b, cc, a, cc, d); else idx.push(a, cc, b, a, d, cc);
    };
    for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const v0 = w[id(i, j, k)] < 0;
      if (j > 0 && k > 0 && v0 !== (w[id(i + 1, j, k)] < 0)) viereck([zelle[id(i, j - 1, k - 1)], zelle[id(i, j, k - 1)], zelle[id(i, j, k)], zelle[id(i, j - 1, k)]]);
      if (i > 0 && k > 0 && v0 !== (w[id(i, j + 1, k)] < 0)) viereck([zelle[id(i - 1, j, k - 1)], zelle[id(i, j, k - 1)], zelle[id(i, j, k)], zelle[id(i - 1, j, k)]]);
      if (i > 0 && j > 0 && v0 !== (w[id(i, j, k + 1)] < 0)) viereck([zelle[id(i - 1, j - 1, k)], zelle[id(i, j - 1, k)], zelle[id(i, j, k)], zelle[id(i - 1, j, k)]]);
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); geo.setAttribute("normal", new T.Float32BufferAttribute(nor, 3));
    if (extra) { const n = ext.length / (pos.length / 3); geo.setAttribute(n === 1 ? "hell" : "color", new T.Float32BufferAttribute(ext, n)); }
    geo.setIndex(idx); geo.computeBoundingSphere();
    return geteilt(geo);
  }
  // runder Stab für Beine und Arme: oben am Gelenk (y = 0), nach unten verjüngt, beide Enden abgerundet
  function rundStab(ro, ru, l) {
    const key = `rs${ro},${ru},${l}`;
    if (!formCache.has(key)) {
      const p = [[0, -l - ru * .55], [ru * .6, -l - ru * .45], [ru * .92, -l - ru * .12], [ru, -l + ru * .3]];
      for (let i = 1; i < 6; i++) { const t = i / 6; p.push([ru + (ro - ru) * t + Math.sin(t * Math.PI) * ro * .06, -l + ru * .3 + (l - ru * .3 - ro * .3) * t]); }
      p.push([ro, -ro * .3], [ro * .92, ro * .12], [ro * .6, ro * .45], [0, ro * .55]);
      formCache.set(key, geteilt(new T.LatheGeometry(p.map(([x, y]) => new T.Vector2(x, y)), 22)));
    }
    return formCache.get(key);
  }

  // Muster direkt im Shader: Zellen aus einem räumlichen Zellmuster mit Linien dazwischen (Giraffenflecken,
  // Panzerplatten), dazu eine helle Fläche über ein eigenes Attribut (Bauch, Schnauze). Passt auf das nahtlose Netz.
  const glsl = (c) => `vec3(${c.map(v => v.toFixed(3)).join(", ")})`;
  const linear = (hex) => { const c = new T.Color(hex); return [c.r, c.g, c.b]; };
  function musterMaterial(name, { skala, zelleA, zelleB, linie, breite, hell, sheen }) {
    const m = new T.MeshPhysicalMaterial({ color: "#ffffff", roughness: 1, sheen: 1, sheenRoughness: .5, sheenColor: new T.Color(sheen) });
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = "attribute float hell;\nvarying float vHell;\nvarying vec3 vOrt;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvOrt = position; vHell = hell;");
      sh.fragmentShader = "varying float vHell;\nvarying vec3 vOrt;\nvec3 zufall3(vec3 p) { return fract(sin(vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)))) * 43758.5453); }\n"
        + sh.fragmentShader.replace("#include <map_fragment>", `
        vec3 q = vOrt * ${skala.toFixed(2)}, zelle = floor(q), fq = fract(q);
        float f1 = 9., f2 = 9., ton = 0.;
        for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) {
          vec3 o = vec3(float(x), float(y), float(z)), h = zufall3(zelle + o), r = o + h * .85 - fq;
          float d = dot(r, r);
          if (d < f1) { f2 = f1; f1 = d; ton = h.y; } else if (d < f2) f2 = d;
        }
        float linie = 1. - smoothstep(${breite[0].toFixed(3)}, ${breite[1].toFixed(3)}, sqrt(f2) - sqrt(f1));
        vec3 fell = mix(mix(${glsl(linear(zelleA))}, ${glsl(linear(zelleB))}, ton), ${glsl(linear(linie))}, linie);
        diffuseColor.rgb *= mix(fell, ${glsl(linear(hell))}, clamp(vHell, 0., 1.));`);
    };
    m.customProgramCacheKey = () => "muster-" + name;
    return m;
  }
  const fleck = musterMaterial("giraffe", { skala: 7.2, zelleA: "#e07a12", zelleB: "#ee8b18", linie: "#fbe0aa", breite: [.07, .15], hell: "#fbe3b6", sheen: "#ffd29a" });
  const leoPanzer = musterMaterial("panzer", { skala: 3.4, zelleA: "#2f8a3a", zelleB: "#3d9e44", linie: "#b7d96a", breite: [.05, .11], hell: "#f3d27a", sheen: "#d6ffb0" });
  const leoHaut = new T.MeshPhysicalMaterial({ color: "#8fd06a", roughness: 1, sheen: 1, sheenRoughness: .5, sheenColor: new T.Color("#e4ffc8") });
  const leoSohle = std({ color: "#f3d27a", roughness: .9 }), leoBacke = std({ color: "#ff9fb6", roughness: .8 });
  // Haut, Shirt und Jeans über Farben je Punkt (Anjas Körper ist ein einziges Netz)
  const anjaKoerperMat = new T.MeshPhysicalMaterial({ vertexColors: true, roughness: .75, sheen: .3, sheenColor: new T.Color("#ffe0d0") });

  let giraffeFormen = null;
  function giraffeFormenBauen() {
    // Rumpf: Schulter etwas höher als die Hüfte, kräftige Brust, Ansätze der Beine weich angeformt
    const rumpf = (x, y, z) => {
      let d = F.stab(x, y, z, [0, 1.24, -.34], [0, 1.17, .36], .33, .31);
      d = F.weich(d, F.ei(x, y, z, 0, 1.28, -.4, .3, .33, .28), .12);
      for (const [bx, bz] of [[-.17, -.38], [.17, -.38], [-.17, .4], [.17, .4]]) d = F.weich(d, F.stab(x, y, z, [bx, 1.15, bz], [bx * 1.05, .98, bz], .12, .09), .1);
      d = F.weich(d, F.stab(x, y, z, [0, 1.36, .62], [0, 1.32, .76], .05, .03), .08);     // Schwanzansatz
      return d;
    };
    const rumpfHell = (x, y) => [Math.max(0, Math.min(1, (1.03 - y) / .12))];
    // Hals und Kopf (im Hals-Gelenk): unten breit, oben schmal, der Kopf mit Schnauze weich angesetzt
    const K = [0, 1.02, -.27];
    const maulA = [0, K[1] - .045, K[2] - .1], maulB = [0, K[1] - .085, K[2] - .2];
    const halsKopf = (x, y, z) => {
      let d = F.stab(x, y, z, [0, -.06, .03], [0, .97, -.24], .2, .095);
      d = F.weich(d, F.ei(x, y, z, K[0], K[1], K[2], .155, .16, .19), .08);
      d = F.weich(d, F.stab(x, y, z, maulA, maulB, .088, .082), .06);
      return d;
    };
    const kopfHell = (x, y, z) => {
      const m = F.stab(x, y, z, maulA, maulB, .088, .082);
      return [Math.max(0, Math.min(1, (.035 - m) / .05)) * (z < K[2] - .07 ? 1 : 0)];
    };
    giraffeFormen = {
      rumpf: formNetz(rumpf, [-.42, .78, -.82], [.42, 1.72, .86], handy ? .03 : .022, rumpfHell),
      hals: formNetz(halsKopf, [-.25, -.3, -.55], [.25, 1.26, .3], handy ? .024 : .017, kopfHell),
    };
  }

  // ---------- Fröbelinchen: Plüschgiraffe ----------
  function giraffeBauen() {
    if (!giraffeFormen) giraffeFormenBauen();
    const g = new T.Group(), koerper = gelenk(g, 0, 0, 0);
    teil(giraffeFormen.rumpf, fleck, koerper);
    // Hals mit Mähne, Kopf am Ende; der Hals kippt beim Ducken nach vorn
    const hals = gelenk(koerper, 0, 1.42, -.48);
    teil(giraffeFormen.hals, fleck, hals);
    const maehne = teil(new T.CapsuleGeometry(.035, .82, 6, 12), mat.giraffeDunkel, hals, 0, .46, .03); maehne.rotation.x = -.26; maehne.scale.x = .7;
    const kopf = gelenk(hals, 0, 1.02, -.27), augen = [], ohren = [];
    for (const s of [-1, 1]) {
      const horn = teil(rundStab(.026, .03, .15), mat.giraffeHell, kopf, s * .06, .26, .04); horn.rotation.z = -s * .15;
      teil(kugel, mat.giraffeDunkel, kopf, s * .073, .27, .04).scale.setScalar(.045);
      const ohr = teil(kegel(.05, .19, 16), mat.giraffeHell, kopf, s * .19, .1, .07);
      ohr.rotation.z = -s * 1.2; ohr.scale.z = .5; ohr.userData.s = s; ohren.push(ohr);
      const auge = teil(kugel, mat.auge, kopf, s * .1, .05, -.12); auge.scale.setScalar(.032);
      const glanzP = teil(kugel, mat.glanz, kopf, s * .109, .064, -.148); glanzP.scale.setScalar(.01);
      for (const a of [auge, glanzP]) { a.userData.y = a.scale.y; augen.push(a); }
      teil(kugel, mat.giraffeDunkel, kopf, s * .032, -.1, -.285).scale.set(.014, .01, .01);  // Nasenlöcher
    }
    // Beine mit Knie: oben schwingt, unten knickt; runde, sich verjüngende Glieder
    const beine = [];
    for (const [x, z] of [[-.17, -.38], [.17, -.38], [-.17, .4], [.17, .4]]) {
      const oben = gelenk(koerper, x, 1.12, z);
      teil(rundStab(.088, .066, .56), fleck, oben);
      const unten = gelenk(oben, 0, -.56, 0);
      teil(rundStab(.063, .05, .44), mat.giraffeHell, unten);
      teil(rundStab(.064, .072, .06), mat.giraffeDunkel, unten, 0, -.44, 0);   // Huf
      beine.push({ oben, unten });
    }
    const schwanz = gelenk(koerper, 0, 1.3, .75);
    const sm = teil(rundStab(.026, .016, .48), fleck, schwanz, 0, 0, .02); sm.rotation.x = .2;
    teil(kugel, mat.giraffeDunkel, schwanz, 0, -.5, .1).scale.set(.045, .085, .045);
    return { gruppe: g, koerper, hals, kopf, beine, schwanz, augen, ohren, ...FIGUR_INFO.giraffe };
  }

  // ---------- Schildkröte Leo: Plüschschildkröte mit grünem Panzer ----------
  const FIGUR_INFO = {
    giraffe: { name: "Fröbelinchen", blick: 1.35, rueckenY: 0, blaseY: 1.15, blaseS: 1, cockpit: [-.85, .3, 1], kopfSkala: 1, halsSkala: 1,
      fotoGanz: [[0, 1.35, -.15], [2.9, 2.2, -4.4]], fotoRuecken: [[0, 1.55, .1], [1.9, 2.6, 2.1]] },
    leo: { name: "Leo", kopfSkala: 1, halsSkala: 1, blick: .85, rueckenY: -.5, blaseY: .72, blaseS: 1, cockpit: [.12, .4, .55],
      fotoGanz: [[0, .75, -.1], [2.3, 1.6, -3.3]], fotoRuecken: [[0, 1.2, .1], [1.7, 2.3, 2.2]] },
    hase: { name: "Rambo Rabbit", blick: .95, rueckenY: -.61, blaseY: .75, blaseS: 1, cockpit: [.05, .4, .6], kopfSkala: 1.1, halsSkala: .9,
      fotoGanz: [[0, .85, -.1], [2.3, 1.6, -3.2]], fotoRuecken: [[0, 1.1, .1], [1.6, 2.1, 2.0]] },
    baer: { name: "Bäralf", blick: 1.05, rueckenY: -.43, blaseY: .85, blaseS: 1.15, cockpit: [-.05, .35, .48], kopfSkala: 1.5, halsSkala: 1.35,
      fotoGanz: [[0, .95, -.1], [2.7, 1.8, -3.7]], fotoRuecken: [[0, 1.25, .1], [1.9, 2.4, 2.3]] },
    elefant: { name: "Dumbo", blick: 1.3, rueckenY: -.07, blaseY: 1.05, blaseS: 1.4, cockpit: [-.15, .35, .38], kopfSkala: 2, halsSkala: 1.8,
      fotoGanz: [[0, 1.2, -.2], [3.4, 2.2, -4.6]], fotoRuecken: [[0, 1.55, .1], [2.4, 3, 2.8]] },
  };
  let leoFormen = null;
  function leoFormenBauen() {
    // Panzer: hohe Kuppel mit flacher Unterseite, umlaufender Rand und heller Bauchpanzer
    const panzer = (x, y, z) => {
      let d = Math.max(F.ei(x, y, z, 0, .62, .05, .6, .44, .72), .36 - y);
      d = F.weich(d, F.ei(x, y, z, 0, .39, .05, .65, .1, .77), .06);
      d = F.weich(d, F.ei(x, y, z, 0, .32, .05, .52, .14, .64), .08);
      return d;
    };
    const bauch = (x, y) => [Math.max(0, Math.min(1, (.38 - y) / .05))];
    // Hals und Kopf (im Hals-Gelenk): kurzer dicker Hals, runder Kopf mit kleiner Schnauze
    const K = [0, .34, -.3];
    const kopf = (x, y, z) => {
      let d = F.stab(x, y, z, [0, -.05, .14], [0, .26, -.2], .14, .12);
      d = F.weich(d, F.ei(x, y, z, K[0], K[1], K[2], .17, .16, .2), .07);
      d = F.weich(d, F.ei(x, y, z, K[0], K[1] - .04, K[2] - .12, .12, .1, .1), .04);
      return d;
    };
    leoFormen = {
      panzer: formNetz(panzer, [-.72, .12, -.8], [.72, 1.12, .9], handy ? .032 : .024, bauch),
      kopf: formNetz(kopf, [-.25, -.25, -.6], [.25, .56, .35], handy ? .022 : .016),
    };
  }
  function leoBauen() {
    if (!leoFormen) leoFormenBauen();
    const g = new T.Group(), koerper = gelenk(g, 0, 0, 0);
    koerper.scale.setScalar(1.2);                         // etwas größer, damit Leo im Spiel gut zu sehen ist
    teil(leoFormen.panzer, leoPanzer, koerper);
    const hals = gelenk(koerper, 0, .58, -.6);
    teil(leoFormen.kopf, leoHaut, hals);
    const kopf = gelenk(hals, 0, .34, -.3), augen = [], ohren = [];
    for (const s of [-1, 1]) {
      const auge = teil(kugel, mat.auge, kopf, s * .085, .06, -.15); auge.scale.set(.042, .046, .03);
      const glanzP = teil(kugel, mat.glanz, kopf, s * .094, .075, -.178); glanzP.scale.setScalar(.012);
      for (const a of [auge, glanzP]) { a.userData.y = a.scale.y; augen.push(a); }
      teil(kugel, leoBacke, kopf, s * .12, -.03, -.13).scale.set(.035, .022, .02);           // rosa Bäckchen
      teil(kugel, mat.auge, kopf, s * .025, -.01, -.245).scale.set(.01, .008, .008);          // Nasenlöcher
    }
    const mund = teil(new T.TorusGeometry(.045, .008, 6, 18, Math.PI), mat.auge, kopf, 0, -.045, -.215); mund.rotation.z = Math.PI;   // Lächeln
    // kurze dicke Beine mit hellen Fußsohlen; oben schwingt, unten knickt (wie bei Fröbelinchen)
    const beine = [];
    for (const [x, z] of [[-.4, -.42], [.4, -.42], [-.4, .44], [.4, .44]]) {
      const oben = gelenk(koerper, x, .42, z);
      teil(rundStab(.125, .115, .2), leoHaut, oben);
      const unten = gelenk(oben, 0, -.2, 0);
      teil(rundStab(.115, .12, .16), leoHaut, unten);
      teil(kugel, leoSohle, unten, 0, -.19, -.02).scale.set(.12, .045, .14);
      beine.push({ oben, unten });
    }
    const schwanz = gelenk(koerper, 0, .42, .78);
    const sm = teil(rundStab(.06, .015, .2), leoHaut, schwanz); sm.rotation.x = .9;
    return { gruppe: g, koerper, hals, kopf, beine, schwanz, augen, ohren, ...FIGUR_INFO.leo };
  }

  // ---------- Weitere Figuren zum Freischalten: Rambo Rabbit, Bäralf, Dumbo ----------
  // Zwei Farben über das Attribut „hell“ (Bauch, Schnauze), ohne Muster
  function zweiFarbenMat(name, haupt, hell, sheen) {
    const m = new T.MeshPhysicalMaterial({ color: "#ffffff", roughness: 1, sheen: 1, sheenRoughness: .5, sheenColor: new T.Color(sheen) });
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = "attribute float hell;\nvarying float vHell;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvHell = hell;");
      sh.fragmentShader = "varying float vHell;\n" + sh.fragmentShader.replace("#include <map_fragment>",
        `diffuseColor.rgb *= mix(${glsl(linear(haupt))}, ${glsl(linear(hell))}, clamp(vHell, 0., 1.));`);
    };
    m.customProgramCacheKey = () => "zwei-" + name;
    return m;
  }
  const pluesch = (farbe, sheen) => new T.MeshPhysicalMaterial({ color: farbe, roughness: 1, sheen: 1, sheenRoughness: .5, sheenColor: new T.Color(sheen) });
  const klemme = (v) => Math.max(0, Math.min(1, v));
  function augenSetzen(kopf, augen, x, y, z, gr) {
    for (const s of [-1, 1]) {
      const a = teil(kugel, mat.auge, kopf, s * x, y, z); a.scale.set(gr, gr * 1.1, gr * .75);
      const gl = teil(kugel, mat.glanz, kopf, s * (x + gr * .25), y + gr * .35, z - gr * .6); gl.scale.setScalar(gr * .3);
      for (const k of [a, gl]) { k.userData.y = k.scale.y; augen.push(k); }
    }
  }
  // vier Beine: [x, y, z] des Ansatzes, Maße oben/unten [Radius oben, Radius unten, Länge], Pfote [Breite, Höhe, Länge]
  function vierBeine(koerper, ansaetze, oben, unten, pfote, mBein, mPfote) {
    return ansaetze.map(([x, y, z], i) => {
      const o = oben[i] || oben[0], u = unten[i] || unten[0], p = pfote[i] || pfote[0];
      const og = gelenk(koerper, x, y, z); teil(rundStab(...o), mBein, og);
      const ug = gelenk(og, 0, -o[2], 0); teil(rundStab(...u), mBein, ug);
      teil(kugel, mPfote, ug, 0, -u[2] - p[1] * .2, -p[2] * .25).scale.set(...p);
      return { oben: og, unten: ug };
    });
  }

  // --- Rambo Rabbit: Hase mit langen Ohren und rotem Stirnband ---
  const haseFell = zweiFarbenMat("hase", "#c9b6a2", "#f8f2ea", "#fff4e6"), haseBein = pluesch("#c9b6a2", "#fff4e6"),
    haseWeiss = pluesch("#f8f2ea", "#ffffff"), haseRosa = std({ color: "#f4a7b9", roughness: .7 }), ramboRot = std({ color: "#d32f2f", roughness: .7 });
  let haseFormen = null;
  function haseBauen() {
    if (!haseFormen) {
      const K = [0, .3, -.12];
      haseFormen = {
        rumpf: formNetz((x, y, z) => {
          let d = F.ei(x, y, z, 0, .62, .06, .33, .32, .45);
          d = F.weich(d, F.ei(x, y, z, 0, .68, -.24, .27, .28, .24), .1);
          for (const s of [-1, 1]) d = F.weich(d, F.ei(x, y, z, s * .19, .5, .28, .16, .2, .24), .08);
          return d;
        }, [-.45, .2, -.62], [.45, 1.05, .62], handy ? .026 : .02, (x, y) => [klemme((.52 - y) / .1)]),
        kopf: formNetz((x, y, z) => {
          let d = F.stab(x, y, z, [0, -.05, .05], [0, .18, -.08], .14, .13);
          d = F.weich(d, F.ei(x, y, z, K[0], K[1], K[2], .2, .19, .21), .06);
          for (const s of [-1, 1]) d = F.weich(d, F.ei(x, y, z, s * .075, K[1] - .07, K[2] - .15, .09, .08, .07), .04);
          return d;
        }, [-.3, -.26, -.44], [.3, .55, .26], handy ? .02 : .015, (x, y, z) => [klemme(((K[2] - .1) - z) / .05) * (y < K[1] ? 1 : 0)]),
      };
    }
    const g = new T.Group(), koerper = gelenk(g, 0, 0, 0); koerper.scale.setScalar(1.15);
    teil(haseFormen.rumpf, haseFell, koerper);
    const hals = gelenk(koerper, 0, .82, -.36); teil(haseFormen.kopf, haseFell, hals);
    const kopf = gelenk(hals, 0, .3, -.12), augen = [], ohren = [];
    augenSetzen(kopf, augen, .1, .05, -.165, .036);
    teil(kugel, haseRosa, kopf, 0, -.035, -.225).scale.set(.03, .022, .02);
    for (const s of [-1, 1]) {
      const ohr = gelenk(kopf, s * .075, .15, .02); ohr.userData.s = s; ohr.userData.basis = -s * .15; ohren.push(ohr);
      teil(new T.CapsuleGeometry(.07, .36, 8, 16), haseBein, ohr, 0, .24, 0).scale.z = .45;
      teil(new T.CapsuleGeometry(.045, .3, 8, 12), haseRosa, ohr, 0, .24, -.026).scale.z = .3;
    }
    const band = teil(new T.TorusGeometry(.2, .028, 8, 36), ramboRot, kopf, 0, .1, .0); band.rotation.x = Math.PI / 2 + .32;   // vorn höher: über den Augen
    for (const s of [-1, 1]) { const e = teil(kiste(.05, .2, .02), ramboRot, kopf, s * .04, .0, .21); e.rotation.set(.5, 0, s * .35); }
    const beine = vierBeine(koerper, [[-.15, .5, -.3], [.15, .5, -.3], [-.2, .45, .3], [.2, .45, .3]],
      [[.075, .065, .22], [.075, .065, .22], [.1, .085, .2], [.1, .085, .2]], [[.065, .06, .24], [.065, .06, .24], [.08, .06, .2], [.08, .06, .2]],
      [[.075, .04, .11], [.075, .04, .11], [.08, .045, .16], [.08, .045, .16]], haseBein, haseWeiss);
    const schwanz = gelenk(koerper, 0, .66, .5); teil(kugel, haseWeiss, schwanz, 0, 0, .04).scale.setScalar(.11);
    return { gruppe: g, koerper, hals, kopf, beine, schwanz, augen, ohren, ...FIGUR_INFO.hase };
  }

  // --- Bäralf: brauner Teddybär mit heller Schnauze ---
  const baerFell = zweiFarbenMat("baer", "#8a5a33", "#dcb88e", "#e8c39a"), baerBein = pluesch("#8a5a33", "#e8c39a"),
    baerHell = pluesch("#dcb88e", "#fff0d8"), baerNase = std({ color: "#2b1d14", roughness: .3 });
  let baerFormen = null;
  function baerBauen() {
    if (!baerFormen) {
      const K = [0, .3, -.16];
      baerFormen = {
        rumpf: formNetz((x, y, z) => F.weich(F.ei(x, y, z, 0, .72, .05, .42, .4, .55), F.ei(x, y, z, 0, .78, -.3, .36, .36, .3), .12),
          [-.5, .25, -.72], [.5, 1.2, .68], handy ? .03 : .022, (x, y) => [klemme((.6 - y) / .12)]),
        kopf: formNetz((x, y, z) => {
          let d = F.stab(x, y, z, [0, -.1, .08], [0, .16, -.08], .21, .2);
          d = F.weich(d, F.ei(x, y, z, K[0], K[1], K[2], .26, .25, .25), .07);
          return F.weich(d, F.ei(x, y, z, 0, K[1] - .08, K[2] - .2, .14, .11, .12), .05);
        }, [-.34, -.36, -.56], [.34, .6, .34], handy ? .022 : .016, (x, y, z) => [klemme(((K[2] - .16) - z) / .05) * (y < K[1] + .02 ? 1 : 0)]),
      };
    }
    const g = new T.Group(), koerper = gelenk(g, 0, 0, 0); koerper.scale.setScalar(1.1);
    teil(baerFormen.rumpf, baerFell, koerper);
    const hals = gelenk(koerper, 0, .98, -.48); teil(baerFormen.kopf, baerFell, hals);
    const kopf = gelenk(hals, 0, .3, -.16), augen = [], ohren = [];
    augenSetzen(kopf, augen, .11, .07, -.215, .036);
    teil(kugel, baerNase, kopf, 0, -.04, -.35).scale.set(.055, .04, .035);
    for (const s of [-1, 1]) {
      const ohr = gelenk(kopf, s * .17, .19, 0); ohr.userData.s = s; ohr.userData.basis = 0; ohren.push(ohr);
      teil(kugel, baerBein, ohr).scale.set(.09, .09, .05);
      teil(kugel, baerHell, ohr, 0, 0, -.02).scale.set(.055, .055, .03);
    }
    const beine = vierBeine(koerper, [[-.22, .58, -.32], [.22, .58, -.32], [-.24, .58, .36], [.24, .58, .36]],
      [[.14, .13, .28]], [[.13, .13, .24]], [[.13, .05, .15]], baerBein, baerHell);
    const schwanz = gelenk(koerper, 0, .8, .6); teil(kugel, baerBein, schwanz).scale.setScalar(.08);
    return { gruppe: g, koerper, hals, kopf, beine, schwanz, augen, ohren, ...FIGUR_INFO.baer };
  }

  // --- Dumbo: Plüschelefant mit großen Schlappohren und Rüssel ---
  const elefantHaut = zweiFarbenMat("elefant", "#9aa8ba", "#cdd5e0", "#e6eef8"), elefantBein = pluesch("#9aa8ba", "#e6eef8"),
    elefantHell = pluesch("#ece6da", "#ffffff"), elefantRosa = std({ color: "#f2b3c4", roughness: .7 });
  let elefantFormen = null;
  function elefantBauen() {
    if (!elefantFormen) {
      const K = [0, .22, -.2];
      // Rüssel: Röhre entlang einer Kurve, zur Spitze hin dünner
      const kurve = new T.CatmullRomCurve3([[0, -.02, -.28], [0, -.22, -.4], [0, -.45, -.44], [0, -.62, -.37], [0, -.7, -.25]].map(p => new T.Vector3(...p)));
      const ruessel = new T.TubeGeometry(kurve, 24, .1, 14, false), pos = ruessel.attributes.position;
      for (let i = 0; i <= 24; i++) {
        const m = kurve.getPointAt(i / 24), f = 1 - .5 * i / 24;
        for (let j = 0; j <= 14; j++) { const k = i * 15 + j; pos.setXYZ(k, m.x + (pos.getX(k) - m.x) * f, m.y + (pos.getY(k) - m.y) * f, m.z + (pos.getZ(k) - m.z) * f); }
      }
      ruessel.computeVertexNormals();
      elefantFormen = {
        rumpf: formNetz((x, y, z) => F.weich(F.ei(x, y, z, 0, .98, .05, .55, .5, .7), F.ei(x, y, z, 0, 1.02, -.38, .46, .46, .36), .14),
          [-.62, .4, -.86], [.62, 1.56, .82], handy ? .034 : .026, (x, y) => [klemme((.72 - y) / .12)]),
        kopf: formNetz((x, y, z) => F.weich(F.stab(x, y, z, [0, -.12, .12], [0, .12, -.06], .3, .28), F.ei(x, y, z, K[0], K[1], K[2], .36, .34, .32), .08),
          [-.42, -.46, -.58], [.42, .6, .46], handy ? .026 : .02),
        ruessel: geteilt(ruessel),
      };
    }
    const g = new T.Group(), koerper = gelenk(g, 0, 0, 0);
    teil(elefantFormen.rumpf, elefantHaut, koerper);
    const hals = gelenk(koerper, 0, 1.18, -.62); teil(elefantFormen.kopf, elefantHaut, hals);
    const kopf = gelenk(hals, 0, .22, -.2), augen = [], ohren = [];
    augenSetzen(kopf, augen, .17, .1, -.27, .042);
    teil(elefantFormen.ruessel, elefantBein, kopf);
    for (const s of [-1, 1]) {
      const ohr = gelenk(kopf, s * .3, .08, .02); ohr.userData.s = s; ohr.userData.flattern = true; ohren.push(ohr);
      teil(kugel, elefantBein, ohr, s * .18, -.02, .04).scale.set(.26, .3, .045);
      teil(kugel, elefantRosa, ohr, s * .18, -.02, .0).scale.set(.19, .23, .03);
    }
    const beine = vierBeine(koerper, [[-.3, .78, -.42], [.3, .78, -.42], [-.3, .78, .45], [.3, .78, .45]],
      [[.18, .17, .4]], [[.17, .18, .33]], [[.18, .05, .19]], elefantBein, elefantHell);
    const schwanz = gelenk(koerper, 0, 1.05, .74);
    const sw = teil(rundStab(.03, .02, .35), elefantBein, schwanz); sw.rotation.x = .4;
    teil(kugel, baerNase, schwanz, 0, -.33, .14).scale.set(.04, .06, .04);
    return { gruppe: g, koerper, hals, kopf, beine, schwanz, augen, ohren, ...FIGUR_INFO.elefant };
  }
  const FIGUREN = {
    giraffe: { bauen: () => giraffeBauen(), name: "Fröbelinchen" }, leo: { bauen: () => leoBauen(), name: "Leo" },
    hase: { bauen: haseBauen, name: "Rambo Rabbit" }, baer: { bauen: baerBauen, name: "Bäralf" }, elefant: { bauen: elefantBauen, name: "Dumbo" },
  };
  const figurBauen = (id) => (FIGUREN[id] || FIGUREN.giraffe).bauen();

  // ---------- Anja: Läuferin mit blondem Pferdeschwanz ----------
  const koerperFormen = {};
  function koerperFormBauen(SHIRT) {
    const feld = (x, y, z) => {
      const zs = z / .74;                                  // Oberkörper flacher als breit
      let d = F.ei(x, y, z, 0, .97, 0, .16, .13, .12);    // Hüfte
      d = F.weich(d, F.stab(x, y, zs, [0, 1.02, 0], [0, 1.26, 0], .135, .15) * .8, .08);   // Taille
      d = F.weich(d, F.ei(x, y, z, 0, 1.36, -.01, .18, .14, .125), .08);                     // Brust
      d = F.weich(d, F.stab(x, y, z, [-.16, 1.46, 0], [.16, 1.46, 0], .062, .062), .07);      // Schultern
      d = F.weich(d, F.stab(x, y, z, [0, 1.46, 0], [0, 1.62, -.005], .05, .045), .04);      // Hals
      d = F.weich(d, F.ei(x, y, z, 0, 1.69, -.01, .098, .12, .108), .04);                   // Kopf
      d = F.weich(d, F.ei(x, y, z, 0, 1.655, -.112, .015, .022, .018), .015);               // Nase
      for (const s of [-1, 1]) d = F.weich(d, F.ei(x, y, z, s * .098, 1.68, 0, .016, .03, .02), .015);   // Ohren
      return d;
    };
    const HAUT = [.86, .55, .40], JEANS = [.045, .10, .27];
    // weiche Übergänge zwischen Jeans, Shirt und Haut, sonst würden die Farbgrenzen am Netz zackig
    const stufe = (a, b, t) => { const k = Math.max(0, Math.min(1, (t - a) / (b - a))); return k * k * (3 - 2 * k); };
    const farbe = (x, y, z) => {
      const halsR = Math.hypot(x, (z + .01) * 1.3);
      const haut = Math.max(stufe(1.545, 1.575, y), stufe(.075, .06, halsR) * stufe(1.4, 1.43, y));   // Hals und runder Ausschnitt
      const jeans = stufe(1.045, 1.025, y);
      return [0, 1, 2].map(i => (SHIRT[i] * (1 - haut) + HAUT[i] * haut) * (1 - jeans) + JEANS[i] * jeans);
    };
    return formNetz(feld, [-.3, .8, -.2], [.3, 1.86, .2], handy ? .016 : .012, farbe);
  }
  // Personen: Anja (blond, pinkes Shirt, Pferdeschwanz) und die Frau, die ihre Autoschlüssel sucht (lange schwarze Haare)
  const PERSONEN = {
    anja: { shirt: [.76, .10, .2], shirtMat: mat.shirt, haar: mat.haar, lang: false },
    frau: { shirt: [.02, .32, .30], shirtMat: std({ color: "#1f9a8a", roughness: .9 }), haar: std({ color: "#17120f", roughness: .45 }), lang: true },
  };
  const anjaBauen = () => personBauen("anja"), frauBauen = () => personBauen("frau");
  function personBauen(wer) {
    const P = PERSONEN[wer];
    if (!koerperFormen[wer]) koerperFormen[wer] = koerperFormBauen(P.shirt);
    const g = new T.Group(), k = gelenk(g, 0, 0, 0);
    teil(koerperFormen[wer], anjaKoerperMat, k);
    const kopf = gelenk(k, 0, 1.69, -.01);
    const haarKappe = teil(new T.SphereGeometry(1, 32, 22, 0, Math.PI * 2, 0, Math.PI * .62), P.haar, kopf, 0, .012, .012);
    haarKappe.scale.set(.108, .13, .118); haarKappe.rotation.x = P.lang ? .62 : .35;   // bei langen Haaren nur wenig Pony
    for (const s of [-1, 1]) teil(kugel, mat.auge, kopf, s * .036, .012, -.1).scale.set(.012, .014, .008);
    teil(kugel, mat.lippe, kopf, 0, -.062, -.1).scale.set(.022, .007, .006);
    const zopf = gelenk(kopf, 0, .04, .1);
    if (P.lang) {                                       // lange offene Haare bis über die Schultern, vorn zwei Strähnen
      teil(kugel, P.haar, zopf, 0, -.17, -.035).scale.set(.118, .25, .065);
      for (const sx of [-1, 1]) {
        const st = teil(new T.CapsuleGeometry(.032, .2, 6, 12), P.haar, zopf, sx * .088, -.17, -.13); st.rotation.z = sx * .08; st.scale.z = .7;
      }
    } else {
      teil(kugel, P.haar, zopf, 0, 0, .02).scale.setScalar(.036);
      teil(new T.CapsuleGeometry(.045, .16, 8, 16), P.haar, zopf, 0, -.09, .045).rotation.x = .3;
    }
    const glied = (x, y, dickO, dickU, langO, langU, mO, mU, ende) => {
      const oben = gelenk(k, x, y, 0);
      teil(rundStab(dickO, dickO * .85, langO), mO, oben);
      const unten = gelenk(oben, 0, -langO, 0);
      teil(rundStab(dickU, dickU * .8, langU), mU, unten);
      ende(unten, langU);
      return { oben, unten };
    };
    const beine = [-1, 1].map(s => glied(s * .085, .92, .075, .058, .44, .42, mat.jeans, mat.jeans, (u, l) => {
      teil(new T.CapsuleGeometry(.05, .12, 8, 16), mat.schuh, u, 0, -l - .02, -.05).rotation.x = Math.PI / 2;
      teil(new T.CapsuleGeometry(.045, .14, 4, 16), mat.sohle, u, 0, -l - .06, -.05).rotation.x = Math.PI / 2;
    }));
    const arme = [-1, 1].map(s => glied(s * .2, 1.45, .045, .037, .28, .26, mat.haut, mat.haut, (u, l) => {
      teil(kugel, mat.haut, u, 0, -l - .03, 0).scale.set(.04, .05, .03);
    }));
    // kurze Ärmel über dem Oberarm
    for (const a of arme) teil(rundStab(.056, .052, .12), P.shirtMat, a.oben);
    return { gruppe: g, k, beine, arme, zopf };
  }

  // ---------- Weg, Hecken, Deko ----------
  function boden(laenge, breite) {
    const k = new T.Mesh(uvSkala(new T.PlaneGeometry(breite, laenge), breite / 2.2, laenge / 2.2).rotateX(-Math.PI / 2), mat.weg);
    k.receiveShadow = true; return k;
  }
  function heckenStueck(laenge, hoehe = 1.45, dicke = .8) {
    const g = new T.Group();
    teil(uvSkala(new T.BoxGeometry(dicke, hoehe, laenge), laenge / 1.3, hoehe / 1.3), mat.hecke, g, 0, hoehe / 2, 0);
    // gerundete Oberseite, damit sie wie geschnittener Buchs aussieht und nicht wie eine Kiste
    const krone = teil(uvSkala(new T.CylinderGeometry(dicke / 2, dicke / 2, laenge, 14, 1, false, 0, Math.PI), laenge / 1.3, 1), mat.hecke, g, 0, hoehe, 0);
    krone.rotation.set(Math.PI / 2, Math.PI / 2, 0);
    return g;
  }
  // Blumenstreifen am Fuß der Hecke (eine Zeichnung für viele Blüten)
  const bluetenGeo = geteilt(new T.IcosahedronGeometry(.07, 1)), blattGeo = geteilt(new T.SphereGeometry(.09, 8, 6));
  const bluetenMat = std({ roughness: .6 }), blattMat = std({ color: "#3f8a32", roughness: .9 });
  const bluetenFarben = ["#ffffff", "#ffd23f", "#ff6b9a", "#b06cff", "#ff8a3d", "#6ec6ff"].map(c => new T.Color(c));
  function blumen(laenge) {
    const n = Math.max(4, Math.round(laenge * 1.6)), g = new T.Group();
    const bl = new T.InstancedMesh(bluetenGeo, bluetenMat, n), gr = new T.InstancedMesh(blattGeo, blattMat, n);
    const m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Vector3(1, 1, 1);
    for (let i = 0; i < n; i++) {
      const z = (Math.random() - .5) * laenge, x = zufall(-.06, .06), s = zufall(.7, 1.3);
      m.compose(new T.Vector3(x, .17 + zufall(0, .08), z), q, e.clone().multiplyScalar(s)); bl.setMatrixAt(i, m);
      bl.setColorAt(i, wahl(bluetenFarben));
      m.compose(new T.Vector3(x, .07, z), q, new T.Vector3(1.2, .8, 1.2)); gr.setMatrixAt(i, m);
    }
    bl.castShadow = false; g.add(gr, bl); return g;
  }
  function kante(laenge) {
    const k = new T.Mesh(kiste(.18, .1, laenge), mat.kante); k.receiveShadow = true; return k;
  }
  function baum() {
    const g = new T.Group(), h = zufall(2.2, 3.2);
    teil(zyl(.13, .24, h, 10), mat.rinde, g, 0, h / 2, 0);
    for (let i = 0; i < 7; i++) {
      const b = teil(geo.blatt, mat.laub, g, zufall(-.9, .9), h + zufall(-.2, 1.2), zufall(-.9, .9));
      b.scale.setScalar(zufall(.75, 1.25)); b.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    }
    return g;
  }
  function haus() {
    const g = new T.Group(), b = zufall(4, 5.5), t = zufall(3.5, 4.5), h = 2.8;
    const w = teil(kiste(b, h, t), wahl(mat.haus), g, 0, h / 2, 0);
    const dreieck = new T.Shape([new T.Vector2(-b / 2 - .3, 0), new T.Vector2(b / 2 + .3, 0), new T.Vector2(0, 1.7)]);
    const d = teil(new T.ExtrudeGeometry(dreieck, { depth: t + .5, bevelEnabled: false }), mat.dach, g, 0, h, -(t + .5) / 2);
    uvSkala(d.geometry, .25, .25);
    teil(kiste(.45, 1, .45), mat.dach, g, b / 4, h + 1.1, 0);  // Schornstein
    return g;
  }
  function rutsche() {
    const g = new T.Group();
    for (const [x, z] of [[-.5, -.5], [.5, -.5], [-.5, .5], [.5, .5]]) teil(zyl(.06, .06, 2, 10), mat.metallRot, g, x, 1, z);
    teil(kiste(1.2, .1, 1.2), mat.holz, g, 0, 1.6, 0);
    teil(kegel(.95, .9, 4), mat.plastikRot, g, 0, 2.5, 0).rotation.y = Math.PI / 4;
    const bahn = teil(kiste(.7, .06, 3), mat.plastikGelb, g, 0, .95, 1.75); bahn.rotation.x = .52;
    return g;
  }
  function sandkasten() {
    const g = new T.Group();
    for (const [x, z, sx, sz] of [[0, -1, 2.4, .2], [0, 1, 2.4, .2], [-1.1, 0, .2, 2], [1.1, 0, .2, 2]]) teil(kiste(sx, .3, sz), mat.holz, g, x, .15, z);
    const sand = teil(kiste(2, .2, 1.8), mat.sand, g, 0, .1, 0); sand.castShadow = false;
    teil(geo.ball, mat.ball, g, .5, .45, .2).scale.setScalar(.5);
    return g;
  }
  const dekoNeu = () => { const r = Math.random(); return r < .45 ? baum() : r < .72 ? haus() : r < .87 ? rutsche() : sandkasten(); };

  // ---------- Hindernisse ----------
  function hindernis(typ, breite) {
    const g = new T.Group();
    if (typ === "kloetze") {
      for (let i = 0; i < 3; i++) {
        const k = teil(geo.klotz, wahl(mat.klotz), g, zufall(-.05, .05), .25 + i * .5, zufall(-.05, .05));
        k.rotation.y = zufall(-.35, .35);
      }
    } else if (typ === "ball") {
      teil(geo.ball, mat.ball, g, 0, .45, 0).rotation.set(Math.random(), Math.random() * 6, .4);
    } else if (typ === "balken") {
      const s = teil(zyl(.22, .22, breite, 16), mat.rinde, g, 0, .24, 0); s.rotation.z = Math.PI / 2;
      for (const x of [-breite / 2 + .4, breite / 2 - .4]) teil(kiste(.3, .16, .5), mat.holz, g, x, .08, 0);
    } else if (typ === "pfuetze") {
      const p = new T.Mesh(new T.CircleGeometry(1, 28), mat.pfuetze); p.rotation.x = -Math.PI / 2; p.scale.set(breite / 2 - .1, .9, 1); p.position.y = .05;
      p.receiveShadow = true; g.add(p);
    } else if (typ === "stange") {
      const s = teil(zyl(.09, .09, breite + .2, 16), mat.metall, g, 0, 1.45, 0); s.rotation.z = Math.PI / 2;
      for (const x of [-breite / 2, breite / 2]) teil(zyl(.08, .1, 1.55, 12), mat.metallRot, g, x, .78, 0);
      for (let i = 0; i < 7; i++) {      // bunte Ringe zum Turnen
        const r = teil(new T.TorusGeometry(.13, .025, 8, 20), wahl(mat.klotz), g, -breite / 2 + .6 + i * (breite - 1.2) / 6, 1.2, 0);
        r.rotation.y = Math.PI / 2;
      }
    }
    return g;
  }
  // ---------- Hindernisse der einzelnen Welten ----------
  const H_MAT = {
    huhn: std({ color: "#fbfaf4", roughness: .8 }), kamm: std({ color: "#e0302c", roughness: .6 }), schnabel: std({ color: "#f4a21c", roughness: .5 }),
    ente: std({ color: "#ffd84a", roughness: .6 }), schnee: std({ color: "#f6f9fc", roughness: .7 }), schwarz: std({ color: "#1d1d1d", roughness: .4 }),
    laub: ["#d2691e", "#e8a33d", "#b33a1f", "#f2c14e", "#9c4a1a"].map(c => std({ color: c, roughness: .9 })),
    eis: std({ color: "#bfe4ff", roughness: .05, metalness: .3, transparent: true, opacity: .75, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }),
  };
  function weltHindernis(typ, breite) {
    const g = new T.Group();
    if (typ === "heuballen" || typ === "schneeball") {     // rollt auf Fröbelinchen zu (Drehung um die Querachse)
      const r = typ === "heuballen" ? .7 : .5;
      const rolle = gelenk(g, 0, r, 0); g.userData.rolle = rolle; g.userData.radius = r;
      if (typ === "heuballen") { const k = teil(zyl(r, r, 1.15, 22), M.heu, rolle); k.rotation.z = Math.PI / 2; }
      else teil(kugel, H_MAT.schnee, rolle).scale.setScalar(r);
    } else if (typ === "huhn") {
      const k = gelenk(g, 0, 0, 0); g.userData.huepf = k;
      teil(kugel, H_MAT.huhn, k, 0, .32, .02).scale.set(.2, .2, .26);
      teil(kugel, H_MAT.huhn, k, 0, .55, -.15).scale.setScalar(.12);
      teil(kiste(.03, .08, .12), H_MAT.kamm, k, 0, .69, -.14);
      teil(kegel(.04, .1, 8), H_MAT.schnabel, k, 0, .54, -.29).rotation.x = -Math.PI / 2;
      for (const sx of [-1, 1]) { teil(zyl(.015, .015, .2, 6), H_MAT.schnabel, k, sx * .07, .1, .02); teil(kugel, H_MAT.schwarz, k, sx * .06, .58, -.24).scale.setScalar(.018); }
    } else if (typ === "enten") {                              // Mama Ente mit zwei Küken hintereinander
      g.userData.huepf = [];
      [[0, 1], [.55, .65], [1.0, .6]].forEach(([z, f]) => {
        const e = gelenk(g, 0, 0, z); g.userData.huepf.push(e);
        teil(kugel, H_MAT.ente, e, 0, .2 * f, 0).scale.set(.18 * f, .15 * f, .26 * f);
        teil(kugel, H_MAT.ente, e, 0, .4 * f, -.17 * f).scale.setScalar(.11 * f);
        teil(kegel(.05 * f, .1 * f, 8), H_MAT.schnabel, e, 0, .38 * f, -.3 * f).rotation.x = -Math.PI / 2;
      });
    } else if (typ === "laub") {                               // Laubhaufen über die ganze Breite: drüberspringen
      for (let i = 0; i < 16; i++) {
        const k = teil(kugel, wahl(H_MAT.laub), g, zufall(-breite / 2 + .3, breite / 2 - .3), .1, zufall(-.35, .35));
        k.scale.set(zufall(.35, .6), zufall(.2, .4), zufall(.3, .5));
      }
    } else if (typ === "eis") {                                // glatte Eisfläche: man lenkt kurz langsamer
      const k = new T.Mesh(new T.PlaneGeometry(breite, 3).rotateX(-Math.PI / 2), H_MAT.eis); k.position.y = .06; k.receiveShadow = true; g.add(k);
    }
    return g;
  }

  function stern() { const k = new T.Mesh(geo.stern, mat.stern); k.castShadow = true; return k; }
  // Törtchen zum Einsammeln: Mürbeteig-Schälchen mit Wellenrand, rosa Sahnehaube, Sahnetupfer und Kirsche.
  // Alles ist eine einzige Form mit Farben je Punkt, damit viele Törtchen wenig Rechenzeit kosten.
  const toertchenGeo = (() => {
    const schale = new T.CylinderGeometry(.21, .15, .13, 36, 1), p = schale.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), f = 1 + .07 * Math.cos(Math.atan2(z, x) * 12); p.setXYZ(i, x * f, p.getY(i), z * f); }
    schale.computeVertexNormals();
    const teile = [
      [schale, "#e8ad66"],
      [new T.SphereGeometry(.19, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, .75, 1).translate(0, .06, 0), "#ffc4da"],
      [new T.ConeGeometry(.08, .12, 20).translate(0, .25, 0), "#ffe0ec"],
      [new T.SphereGeometry(.055, 18, 12).translate(0, .3, 0), "#e3263a"],
    ];
    const pos = [], nor = [], col = [], idx = [];
    for (const [g, farbe] of teile) {
      const c = new T.Color(farbe), start = pos.length / 3;
      pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array);
      for (let i = 0; i < g.attributes.position.count; i++) col.push(c.r, c.g, c.b);
      for (const n of g.index.array) idx.push(n + start);
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new T.Float32BufferAttribute(nor, 3));
    g.setAttribute("color", new T.Float32BufferAttribute(col, 3)); g.setIndex(idx);
    g.translate(0, -.14, 0); g.scale(1.4, 1.4, 1.4);
    return geteilt(g);
  })();
  const toertchenMat = std({ vertexColors: true, roughness: .45, emissive: "#ffffff", emissiveIntensity: .14 });
  // goldener Schein hinter jedem Törtchen: so sind sie auf einen Blick von den bunten Bällen zu unterscheiden
  const toertchenSchein = new T.SpriteMaterial({ map: leinwand(64, 64, (g) => {
    const v = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    v.addColorStop(0, "rgba(255,236,160,1)"); v.addColorStop(.45, "rgba(255,200,120,.55)"); v.addColorStop(1, "rgba(255,180,200,0)");
    g.fillStyle = v; g.fillRect(0, 0, 64, 64);
  }, false), transparent: true, opacity: .9, depthWrite: false, blending: T.AdditiveBlending });
  function toertchen() {
    const g = new T.Group(), k = new T.Mesh(toertchenGeo, toertchenMat); k.castShadow = true; g.add(k);
    const s = new T.Sprite(toertchenSchein); s.geometry.userData.geteilt = true; s.scale.setScalar(1.3); s.position.y = .05; g.add(s);
    return g;
  }

  // Schildkrötenpanzer zum Einsammeln: gewölbt, Sechseck-Platten, heller Rand
  const panzerMuster = leinwand(256, 128, (g, w, h) => {
    g.fillStyle = "#2f5a24"; g.fillRect(0, 0, w, h);
    const r = 18, dx = r * 1.5, dy = r * Math.sqrt(3);
    for (let c = -1; c * dx < w + r; c++) for (let z = -1; z * dy < h + r; z++) {
      const cx = c * dx, cy = z * dy + (c % 2 ? dy / 2 : 0);
      g.beginPath();
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g[i ? "lineTo" : "moveTo"](cx + Math.cos(a) * (r - 2.5), cy + Math.sin(a) * (r - 2.5)); }
      g.closePath();
      const v = g.createRadialGradient(cx, cy, 2, cx, cy, r);
      const ton = zufall(-8, 8);
      v.addColorStop(0, `hsl(${95 + ton}, 45%, 42%)`); v.addColorStop(1, `hsl(${85 + ton}, 50%, 28%)`);
      g.fillStyle = v; g.fill();
      g.strokeStyle = "rgba(230,210,140,.55)"; g.lineWidth = 1.5; g.stroke();
    }
  });
  const panzerMat = std({ map: panzerMuster, roughness: .45, metalness: .05, bumpMap: panzerMuster, bumpScale: 2 });
  const panzerRand = std({ color: "#e6d29a", roughness: .6 });
  const panzerGeo = geteilt(new T.SphereGeometry(.3, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2)), randGeo = geteilt(new T.TorusGeometry(.3, .045, 10, 32));
  function panzer() {
    const g = new T.Group(), innen = new T.Group(); g.add(innen);
    const d = teil(panzerGeo, panzerMat, innen); d.scale.y = .68;
    const r = teil(randGeo, panzerRand, innen); r.rotation.x = Math.PI / 2;
    innen.rotation.x = .45;           // etwas zur Kamera gekippt, damit man das Muster sieht
    return g;
  }

  // Booster: Münze mit Symbol und Leuchten
  const boosterArt = {
    turbo: ["#ffb300", (g) => { g.beginPath(); [[70, 14], [34, 70], [60, 70], [50, 114], [94, 52], [66, 52], [80, 14]].forEach(([x, y], i) => g[i ? "lineTo" : "moveTo"](x, y)); g.closePath(); g.fill(); }],
    schild: ["#2f8be0", (g) => { g.beginPath(); g.moveTo(64, 18); g.lineTo(100, 32); g.quadraticCurveTo(98, 88, 64, 112); g.quadraticCurveTo(30, 88, 28, 32); g.closePath(); g.fill(); }],
    magnet: ["#e53935", (g) => {
      g.lineWidth = 16; g.strokeStyle = "#fff"; g.beginPath(); g.arc(64, 58, 26, Math.PI, 0, true); g.stroke();
      g.fillStyle = "#fff"; g.fillRect(30, 58, 16, 30); g.fillRect(82, 58, 16, 30);
      g.fillStyle = "#bdbdbd"; g.fillRect(30, 80, 16, 10); g.fillRect(82, 80, 16, 10);
    }],
    doppelt: ["#8e24aa", (g) => { g.font = "bold 58px Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("×2", 64, 68); }],
    schubs: ["#e8577a", (g) => {
      g.beginPath();
      for (let i = 0; i < 16; i++) { const r = i % 2 ? 26 : 50, a = i / 16 * Math.PI * 2; g[i ? "lineTo" : "moveTo"](64 + Math.cos(a) * r, 64 + Math.sin(a) * r); }
      g.closePath(); g.fill();
      g.fillStyle = "#e8577a"; g.font = "bold 46px Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("!", 64, 66);
    }],
  };
  const boosterMat = {}, glimmMat = {};
  for (const [typ, [farbe, symbol]] of Object.entries(boosterArt)) {
    const bild = leinwand(128, 128, (g, w, h) => {
      g.fillStyle = farbe; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill();
      g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = 6; g.beginPath(); g.arc(64, 64, 55, 0, 7); g.stroke();
      g.fillStyle = "#ffffff"; symbol(g);
    }, false);
    bild.center.set(.5, .5); bild.rotation = Math.PI / 2;   // Deckel der liegenden Münze ist um 90° gedreht
    boosterMat[typ] = [std({ color: farbe, roughness: .3, metalness: .4 }), std({ map: bild, roughness: .35, emissive: farbe, emissiveIntensity: .25 }), std({ map: bild, roughness: .35, emissive: farbe, emissiveIntensity: .25 })];
    const glimm = leinwand(64, 64, (g) => {
      const v = g.createRadialGradient(32, 32, 0, 32, 32, 32); v.addColorStop(0, farbe); v.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = v; g.fillRect(0, 0, 64, 64);
    }, false);
    glimmMat[typ] = new T.SpriteMaterial({ map: glimm, transparent: true, opacity: .55, depthWrite: false, blending: T.AdditiveBlending });
  }
  const muenzGeo = zyl(.36, .36, .1, 36);
  function booster(typ) {
    const g = new T.Group(), innen = new T.Group(); g.add(innen);
    const m = teil(muenzGeo, boosterMat[typ], innen); m.rotation.x = Math.PI / 2;
    const s = new T.Sprite(glimmMat[typ]); s.scale.setScalar(1.4); g.add(s);
    g.userData.innen = innen;
    return g;
  }
  // Schutzblase um Fröbelinchen
  function blase() {
    const k = new T.Mesh(new T.SphereGeometry(1.35, 32, 20), new T.MeshStandardMaterial({ color: "#8fd8ff", emissive: "#3fa9ff", emissiveIntensity: .35, transparent: true, opacity: .22, roughness: .1, depthWrite: false }));
    k.position.y = 1.15; k.visible = false; return k;
  }

  // ---------- Horizont: Hügel und Baumreihe in der Ferne (wandern mit der Kamera mit) ----------
  let fernMat = null;
  function ferne() {
    const g = new T.Group();
    const huegelMat = new T.MeshLambertMaterial({ color: "#7fae7a", fog: false });
    const huegel2 = new T.MeshLambertMaterial({ color: "#93bf88", fog: false });
    for (let i = 0; i < 16; i++) {
      const w = i / 16 * Math.PI * 2 + zufall(-.1, .1), r = zufall(150, 165);
      const h = new T.Mesh(kugel, i % 2 ? huegelMat : huegel2);
      h.scale.set(zufall(28, 45), zufall(7, 14), zufall(28, 45)); h.position.set(Math.cos(w) * r, -2, Math.sin(w) * r); g.add(h);
    }
    const kronenMat = new T.MeshLambertMaterial({ color: "#5d8f55", fog: false });
    const kronen = new T.InstancedMesh(new T.IcosahedronGeometry(1, 1), kronenMat, 90), m = new T.Matrix4(), q = new T.Quaternion();
    for (let i = 0; i < 90; i++) {
      const w = Math.random() * Math.PI * 2, r = zufall(125, 140), s = zufall(2.5, 4.5);
      m.compose(new T.Vector3(Math.cos(w) * r, s * .8, Math.sin(w) * r), q, new T.Vector3(s, s * 1.2, s)); kronen.setMatrixAt(i, m);
    }
    g.add(kronen);
    // dahinter blaue Berge mit Schneekuppen (ohne Nebel, damit sie als Silhouette stehen)
    const bergMat = new T.MeshLambertMaterial({ color: "#a9c0dc", fog: false }), kuppeMat = new T.MeshLambertMaterial({ color: "#f4f8fc", fog: false });
    const bergGeo = new T.ConeGeometry(1, 1, 7);
    for (let i = 0; i < 14; i++) {
      const w = i / 14 * Math.PI * 2 + zufall(-.15, .15), r = zufall(180, 194), b = zufall(26, 40), hh = zufall(12, 24);
      const berg = new T.Mesh(bergGeo, bergMat); berg.scale.set(b, hh, b); berg.position.set(Math.cos(w) * r, hh / 2 - 4, Math.sin(w) * r); g.add(berg);
      const kuppe = new T.Mesh(bergGeo, kuppeMat); kuppe.scale.set(b * .3, hh * .3, b * .3); kuppe.position.set(berg.position.x, hh - 4 - hh * .15 + .3, berg.position.z); g.add(kuppe);
    }
    fernMat = [huegelMat, huegel2, kronenMat]; return g;
  }
  function sonnenScheibe() {
    const bild = leinwand(128, 128, (g) => {
      const v = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      v.addColorStop(0, "rgba(255,255,240,1)"); v.addColorStop(.18, "rgba(255,248,215,1)"); v.addColorStop(.3, "rgba(255,236,180,.5)"); v.addColorStop(1, "rgba(255,230,170,0)");
      g.fillStyle = v; g.fillRect(0, 0, 128, 128);
    }, false);
    const s = new T.Sprite(new T.SpriteMaterial({ map: bild, transparent: true, depthWrite: false, fog: false, blending: T.AdditiveBlending }));
    s.scale.setScalar(40); return s;
  }
  // Partikel: Funken beim Einsammeln, Staubwölkchen unter den Hufen
  const funkenBild = leinwand(64, 64, (g) => {
    const v = g.createRadialGradient(32, 32, 0, 32, 32, 32); v.addColorStop(0, "rgba(255,255,255,1)"); v.addColorStop(.3, "rgba(255,240,170,.9)"); v.addColorStop(1, "rgba(255,220,120,0)");
    g.fillStyle = v; g.fillRect(0, 0, 64, 64);
  }, false);
  const staubBild = leinwand(64, 64, (g) => {
    const v = g.createRadialGradient(32, 32, 0, 32, 32, 32); v.addColorStop(0, "rgba(225,205,170,.8)"); v.addColorStop(1, "rgba(225,205,170,0)");
    g.fillStyle = v; g.fillRect(0, 0, 64, 64);
  }, false);
  const funke = (farbe) => new T.Sprite(new T.SpriteMaterial({ map: funkenBild, color: farbe, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
  const staub = () => new T.Sprite(new T.SpriteMaterial({ map: staubBild, transparent: true, depthWrite: false }));
  const dampfBild = leinwand(64, 64, (g) => {
    const v = g.createRadialGradient(32, 32, 0, 32, 32, 32); v.addColorStop(0, "rgba(255,255,255,.9)"); v.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = v; g.fillRect(0, 0, 64, 64);
  }, false);
  const dampf = () => new T.Sprite(new T.SpriteMaterial({ map: dampfBild, transparent: true, depthWrite: false }));
  const schattenBild = leinwand(128, 128, (g) => {
    const v = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    v.addColorStop(0, "rgba(0,0,0,.6)"); v.addColorStop(.55, "rgba(0,0,0,.28)"); v.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = v; g.fillRect(0, 0, 128, 128);
  }, false);
  // weicher dunkler Fleck direkt unter einer Figur: sie steht sichtbar auf dem Boden
  function kontaktSchatten(b, l) {
    const k = new T.Mesh(new T.PlaneGeometry(b, l).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ map: schattenBild, transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 }));
    k.renderOrder = 1; return k;
  }

  // ---------- Himmel und Umgebungslicht ----------
  function himmel() {
    const geom = new T.SphereGeometry(170, 32, 16), farben = [], oben = new T.Color("#5aa7ea"), unten = new T.Color("#e3f3fb");
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const t = Math.max(0, pos.getY(i) / 170); const c = unten.clone().lerp(oben, Math.pow(t, .6)); farben.push(c.r, c.g, c.b);
    }
    geom.setAttribute("color", new T.Float32BufferAttribute(farben, 3));
    const k = new T.Mesh(geom, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, fog: false, depthWrite: false }));
    k.renderOrder = -1; return k;
  }
  function wolken() {
    const g = new T.Group();
    for (let i = 0; i < 14; i++) {
      const s = new T.Sprite(mat.wolke), w = i / 14 * Math.PI * 2 + zufall(-.2, .2), r = zufall(110, 150);
      s.position.set(Math.cos(w) * r, zufall(28, 55), Math.sin(w) * r); const b = zufall(30, 55); s.scale.set(b, b / 2, 1); g.add(s);
    }
    return g;
  }


  // ---------- Aufräumen entfernter Wegabschnitte (sonst wächst der Grafikspeicher mit jeder Ecke) ----------
  function entsorgen(obj) {
    obj.traverse(k => {
      if (k.isInstancedMesh) k.dispose();
      if (k.geometry && !k.geometry.userData.geteilt) k.geometry.dispose();
      const m = k.material; if (m && !Array.isArray(m) && m.userData.einzel) m.dispose();
    });
  }

  // Sprechblase über einer Figur (eine Zeichnung für alle, wird nicht weggeräumt)
  const blasenGeo = geteilt(new T.PlaneGeometry(1, 1));
  const blasenMat = {};
  function sprechblase(zeilen) {
    const key = zeilen.join("|");
    if (!blasenMat[key]) {
      const t = froebelFlaeche(512, 230, (g, w, h) => {
        g.fillStyle = "#ffffff"; g.strokeStyle = "#1d3a33"; g.lineWidth = 8;
        g.beginPath(); g.roundRect(8, 8, w - 16, h - 64, 40); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(w / 2 - 34, h - 60); g.lineTo(w / 2 - 6, h - 10); g.lineTo(w / 2 + 22, h - 60); g.closePath(); g.fill();
        g.beginPath(); g.moveTo(w / 2 - 34, h - 58); g.lineTo(w / 2 - 6, h - 10); g.lineTo(w / 2 + 22, h - 58); g.stroke();
        g.fillStyle = "#1d3a33"; g.textAlign = "center"; g.textBaseline = "middle";
        let px = 52; g.font = schrift(px);
        while (Math.max(...zeilen.map(z => g.measureText(z).width)) > w - 70 && px > 24) g.font = schrift(px -= 2);
        zeilen.forEach((z, i) => g.fillText(z, w / 2, 8 + (h - 72) / 2 + (i - (zeilen.length - 1) / 2) * px * 1.1));
      });
      blasenMat[key] = new T.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: false });
    }
    const s = new T.Sprite(blasenMat[key]); s.geometry.userData.geteilt = true; s.scale.set(3.3, 3.3 * 230 / 512, 1);
    return s;
  }

  // ---------- Fröbel: Banner, Werbetafeln und Schilder ----------
  // Das Logo kommt als Bild (spiel/froebel-logo.png), Texte in Figtree (wie auf der Seite) in den Fröbel-Farben.
  // Bis Logo und Schrift geladen sind, steht eine gezeichnete Fassung da; danach werden die Flächen neu gemalt.
  const FR = { dunkel: "#004d3a", gruen: "#3baa35", hell: "#a8c700" };
  const logoBild = new Image();
  const neuMalen = [];
  function froebelFlaeche(w, h, malen) {
    const t = leinwand(w, h, malen, false);
    neuMalen.push(() => { const g = t.image.getContext("2d"); g.clearRect(0, 0, w, h); malen(g, w, h); t.needsUpdate = true; });
    return t;
  }
  Promise.all([
    new Promise(r => { logoBild.onload = r; logoBild.onerror = r; logoBild.src = "spiel/froebel-logo.png"; }),
    document.fonts ? document.fonts.load("800 80px Figtree").catch(() => {}) : null,
  ]).then(() => neuMalen.forEach(f => f()));
  const schrift = (px) => `800 ${px}px Figtree, "Trebuchet MS", Arial, sans-serif`;
  // Bildzeichen: helles Quadrat, grüner Kreis, dunkles Dreieck (Größe s = Kantenlänge des Quadrats)
  function zeichen(g, x, y, s) {
    g.fillStyle = FR.hell; g.fillRect(x, y + s, s, s);
    g.fillStyle = FR.gruen; g.beginPath(); g.arc(x + s * 1.62, y + s * .5, s * .5, 0, 7); g.fill();
    g.fillStyle = FR.dunkel; g.beginPath(); g.moveTo(x + s * 1.12, y + s); g.lineTo(x + s * 2.12, y + s); g.lineTo(x + s * 2.12, y + s * 2); g.closePath(); g.fill();
  }
  let logoAusschnitt = null;
  function logoMalen(g, cx, cy, hoehe) {            // Logo mittig um (cx, cy), so hoch wie „hoehe“
    if (logoBild.naturalWidth) {
      if (!logoAusschnitt) {                          // weißen Rand des Bildes abschneiden
        const c = document.createElement("canvas"), w = logoBild.naturalWidth, h = logoBild.naturalHeight; c.width = w; c.height = h;
        const k = c.getContext("2d"); k.drawImage(logoBild, 0, 0); const d = k.getImageData(0, 0, w, h).data;
        let x0 = w, y0 = h, x1 = 0, y1 = 0;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4; if (d[i + 3] > 40 && d[i] + d[i + 1] + d[i + 2] < 690) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
        }
        logoAusschnitt = x1 > x0 ? [x0, y0, x1 - x0 + 1, y1 - y0 + 1] : [0, 0, w, h];
      }
      const [x0, y0, w, h] = logoAusschnitt, b = w * hoehe / h;
      g.drawImage(logoBild, x0, y0, w, h, cx - b / 2, cy - hoehe / 2, b, hoehe);
    } else {
      const s = hoehe / 2; g.font = schrift(hoehe * .62); g.textBaseline = "alphabetic";
      const tb = g.measureText("Fröbel").width, b = s * 2.12 + s * .7 + tb, x = cx - b / 2;
      zeichen(g, x, cy - hoehe / 2, s);
      g.fillStyle = FR.dunkel; g.fillText("Fröbel", x + s * 2.82, cy + hoehe * .38);
    }
  }
  const TEXTE = { ohren: ["Ohren auf", "für Kinder!"], kitas: ["Kitas", "für Kinder."] };
  // große Tafel: weiß, Logo oder Spruch in Dunkelgrün, unten ein Streifen in Hellgrün und Grün
  const tafelBild = {
    logo: froebelFlaeche(1024, 512, (g, w, h) => {
      g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h); logoMalen(g, w / 2, h * .44, h * .5);
      g.fillStyle = FR.hell; g.fillRect(0, h - 44, w * .5, 44); g.fillStyle = FR.gruen; g.fillRect(w * .5, h - 44, w * .5, 44);
    }),
  };
  for (const [art, [a, b]] of Object.entries(TEXTE)) {
    tafelBild[art] = froebelFlaeche(1024, 512, (g, w, h) => {
      g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h);
      zeichen(g, 70, 120, 105);
      g.fillStyle = FR.dunkel; g.textBaseline = "alphabetic";
      let px = 150; g.font = schrift(px);
      while (Math.max(g.measureText(a).width, g.measureText(b).width) > w - 400 && px > 60) g.font = schrift(px -= 6);
      g.fillText(a, 340, 220); g.fillStyle = FR.gruen; g.fillText(b, 340, 220 + px * 1.05);
      g.fillStyle = FR.hell; g.fillRect(0, h - 44, w * .5, 44); g.fillStyle = FR.gruen; g.fillRect(w * .5, h - 44, w * .5, 44);
    });
  }
  // kleines Schild: dunkelgrün mit weißer Schrift und hellgrünem Quadrat
  const schildBild = {};
  for (const [art, [a, b]] of Object.entries(TEXTE)) {
    schildBild[art] = froebelFlaeche(512, 256, (g, w, h) => {
      g.fillStyle = FR.dunkel; g.beginPath(); g.roundRect(0, 0, w, h, 26); g.fill();
      g.fillStyle = FR.hell; g.fillRect(34, 40, 46, 46); g.fillStyle = FR.gruen; g.beginPath(); g.arc(57, 140, 22, 0, 7); g.fill();
      g.fillStyle = "#ffffff"; g.textBaseline = "alphabetic";
      let px = 78; g.font = schrift(px);
      while (Math.max(g.measureText(a).width, g.measureText(b).width) > w - 140 && px > 30) g.font = schrift(px -= 4);
      g.fillText(a, 112, 112); g.fillStyle = FR.hell; g.fillText(b, 112, 112 + px * 1.05);
    });
  }
  const bannerBild = froebelFlaeche(1024, 192, (g, w, h) => {
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h); logoMalen(g, w / 2, h * .48, h * .7);
    g.fillStyle = FR.hell; g.fillRect(0, 0, w, 10); g.fillStyle = FR.gruen; g.fillRect(0, h - 10, w, 10);
  });
  const frMat = (map) => std({ map, roughness: .55, emissive: "#ffffff", emissiveMap: map, emissiveIntensity: .12 });
  const FM = {
    tafel: Object.fromEntries(Object.entries(tafelBild).map(([k, t]) => [k, frMat(t)])),
    schild: Object.fromEntries(Object.entries(schildBild).map(([k, t]) => [k, frMat(t)])),
    banner: frMat(bannerBild), dunkel: std({ color: FR.dunkel, roughness: .6 }), weiss: std({ color: "#f4f6f2", roughness: .6 }),
  };
  const tafelGeo = geteilt(new T.PlaneGeometry(4.2, 2.1)), schildGeo2 = geteilt(new T.PlaneGeometry(1.8, .9));
  // beidseitiges Banner (vorn und hinten lesbar), Mitte bei (0, 0)
  function froebelBanner(b, h) {
    const g = new T.Group(), geo = new T.PlaneGeometry(b, h);
    for (const dreh of [0, Math.PI]) { const m = teil(geo, FM.banner, g); m.rotation.y = dreh; m.position.z = dreh ? -.012 : .012; }
    return g;
  }
  // Tafel vorn an der Hecke am Ende eines Wegstücks, unter dem Pfeilschild
  function froebelHeckenTafel(art) {
    const g = new T.Group();
    teil(kiste(2.42, 1.22, .06), FM.dunkel, g, 0, 0, -.03);
    teil(tafelGeo, FM.tafel[art], g, 0, 0, .002).scale.set(.55, .55, 1);
    return g;
  }
  // Werbetafel auf der Wiese, auf zwei Beinen
  function froebelTafel(art) {
    const g = new T.Group();
    for (const s of [-1, 1]) teil(zyl(.07, .09, 2.2, 10), FM.dunkel, g, s * 1.5, 1.1, -.06);
    teil(kiste(4.4, 2.3, .1), FM.dunkel, g, 0, 2.6, -.06);
    teil(tafelGeo, FM.tafel[art], g, 0, 2.6, .002);
    return g;
  }
  // kleines Schild am Pfosten, gut sichtbar über der Hecke
  function froebelSchild(art) {
    const g = new T.Group();
    teil(zyl(.05, .06, 2.6, 10), mat.holz, g, 0, 1.3, -.05);
    teil(kiste(1.9, 1, .06), FM.dunkel, g, 0, 2.2, -.04);
    teil(schildGeo2, FM.schild[art], g, 0, 2.2, .0);
    return g;
  }

  // Rekord-Fahne am Wegrand: weiße Stange, goldenes Tuch mit „Dein Rekord“ und der Punktzahl (ein Tuch, wird neu beschriftet)
  let fahnenText = 0;
  const fahnenBild = froebelFlaeche(512, 256, (g, w, h) => {
    const v = g.createLinearGradient(0, 0, 0, h); v.addColorStop(0, "#ffd54a"); v.addColorStop(1, "#ffb300");
    g.fillStyle = v; g.fillRect(0, 0, w, h);
    g.fillStyle = "#034a3e"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = schrift(64); g.fillText("Dein Rekord", w / 2, h * .34);
    g.font = schrift(92); g.fillText(fahnenText ? fahnenText.toLocaleString("de-DE") : "", w / 2, h * .7);
  });
  const fahnenMalen = neuMalen[neuMalen.length - 1];        // genau die Malfunktion dieses Tuchs merken
  const fahnenMat = std({ map: fahnenBild, roughness: .6, side: T.DoubleSide, emissive: "#ffffff", emissiveMap: fahnenBild, emissiveIntensity: .2 });
  const fahnenKnauf = std({ color: "#ffb300", metalness: .5, roughness: .3 });
  const fahnenGeo = geteilt(new T.PlaneGeometry(1.6, .8, 12, 1));
  function rekordFahne(punkte) {
    fahnenText = punkte; fahnenMalen();                         // Tuch mit der aktuellen Zahl neu malen
    const g = new T.Group();
    teil(zyl(.05, .06, 3.6, 10), FM.weiss, g, 0, 1.8, 0);
    teil(kugel, fahnenKnauf, g, 0, 3.65, 0).scale.setScalar(.09);
    const tuch = teil(fahnenGeo, fahnenMat, g, .82, 3.1, 0); g.userData.tuch = tuch;
    return g;
  }
  // ---------- Abbiege-Hinweise: Schild auf der Hecke am Ende, leuchtende Pfeile auf dem Weg ----------
  const pfeilBild = leinwand(256, 128, (g, w, h) => {
    g.fillStyle = "#ffcc1f"; g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, 22); g.fill();
    g.strokeStyle = "#ffffff"; g.lineWidth = 8; g.beginPath(); g.roundRect(10, 10, w - 20, h - 20, 18); g.stroke();
    g.fillStyle = "#1f3b2a"; g.beginPath();
    [[40, 50], [150, 50], [150, 22], [222, 64], [150, 106], [150, 78], [40, 78]].forEach(([x, y], i) => g[i ? "lineTo" : "moveTo"](x, y));
    g.closePath(); g.fill();
  }, false);
  const bodenPfeilBild = leinwand(128, 128, (g) => {       // Pfeil geradeaus und dann nach rechts gebogen
    g.strokeStyle = "rgba(255,214,51,.95)"; g.lineWidth = 16; g.lineCap = "round";
    g.beginPath(); g.moveTo(40, 120); g.lineTo(40, 70); g.quadraticCurveTo(40, 40, 72, 40); g.lineTo(88, 40); g.stroke();
    g.fillStyle = "rgba(255,214,51,.95)"; g.beginPath(); g.moveTo(84, 14); g.lineTo(122, 40); g.lineTo(84, 66); g.closePath(); g.fill();
  }, false);
  const schildMat = std({ map: pfeilBild, roughness: .5, emissive: "#ffcc1f", emissiveIntensity: .35 });
  const schildGeo = geteilt(new T.PlaneGeometry(3, 1.5)), bodenPfeilGeo = geteilt(new T.PlaneGeometry(2.3, 2.3).rotateX(-Math.PI / 2));
  const bodenPfeilMat = new T.MeshBasicMaterial({ map: bodenPfeilBild, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  function pfeilSchild(dreh) {
    const g = new T.Group();
    for (const x of [-1.42, 1.42]) teil(zyl(.07, .07, 3.2, 8), mat.holz, g, x, 1.6, .05);   // außen, damit die Tafel darunter frei bleibt
    const b = teil(schildGeo, schildMat, g, 0, 2.85, .14); b.scale.x = dreh;   // gespiegelt = nach links
    return g;
  }
  function bodenPfeil(dreh) {
    const k = new T.Mesh(bodenPfeilGeo, bodenPfeilMat); k.position.y = .06; k.scale.x = dreh; return k;
  }

  // ---------- Ausstattung für Fröbelinchen (im Sterne-Shop freischaltbar) ----------
  const streifen = leinwand(64, 16, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#ffffff" : "#e53935"; g.fillRect(i * 8, 0, 8, h); } });
  streifen.repeat.set(4, 1);
  const bunt = leinwand(64, 64, (g, w, h) => { ["#ff6b9a", "#ffd23f", "#4fc3f7", "#7cd67c"].forEach((c, i) => { g.fillStyle = c; g.fillRect(0, i * 16, w, 16); }); });
  const herz = (() => {                                    // Herzform für die Herzbrille
    const f = new T.Shape(); f.moveTo(0, -.05);
    f.bezierCurveTo(-.09, .01, -.06, .07, 0, .035); f.bezierCurveTo(.06, .07, .09, .01, 0, -.05);
    return geteilt(new T.ExtrudeGeometry(f, { depth: .015, bevelEnabled: false }));
  })();
  const fluegelForm = (() => {
    const f = new T.Shape(); f.moveTo(0, 0);
    f.bezierCurveTo(.25, .35, .75, .45, .85, .2); f.bezierCurveTo(.7, .12, .6, 0, .7, -.12); f.bezierCurveTo(.5, -.05, .3, -.15, 0, 0);
    return geteilt(new T.ShapeGeometry(f));
  })();
  const A_MAT = {
    muetze: std({ color: "#e53935", roughness: .8 }), weiss: std({ color: "#ffffff", roughness: .9 }), gold: std({ color: "#ffcc33", metalness: .5, roughness: .3, emissive: "#8a6200", emissiveIntensity: .45 }),
    glas: std({ color: "#111820", metalness: .3, roughness: .1 }), schal: std({ map: streifen, roughness: .9 }), bluete: std({ color: "#ff6b9a", roughness: .6 }), mitte: std({ color: "#ffd23f", roughness: .6 }),
    rosa: std({ color: "#ff7eb3", roughness: .5 }), blau: std({ color: "#1e6fd9", roughness: .6 }), lila: std({ color: "#6a3fb5", roughness: .7 }),
    bunt: std({ map: bunt, roughness: .7 }), rot: std({ color: "#d32f2f", roughness: .6 }), schwarz: std({ color: "#26282c", roughness: .4 }),
    orange: std({ color: "#ff8f1f", roughness: .7 }), umhang: std({ color: "#c62828", roughness: .7, side: T.DoubleSide }),
    feder: std({ color: "#f6e3ff", roughness: .4, emissive: "#d9a8ff", emissiveIntensity: .35, transparent: true, opacity: .9, side: T.DoubleSide }),
  };
  // Preise in Sternen: nach einer guten Runde reicht es für ein günstiges Teil, die Krone ist ein langes Sparziel.
  // platz: pro Platz trägt Fröbelinchen nur ein Teil; kopf/gesicht/ohr sitzen am Kopf, hals am Hals, ruecken am Körper.
  const AUSSTATTUNG = {
    blume: { name: "Blume am Ohr", preis: 150, platz: "ohr", bauen: () => {
      const g = new T.Group();
      for (let i = 0; i < 5; i++) { const w = i / 5 * Math.PI * 2; teil(kugel, A_MAT.bluete, g, .2 + Math.cos(w) * .05, .17 + Math.sin(w) * .05, .02).scale.setScalar(.035); }
      teil(kugel, A_MAT.mitte, g, .2, .17, .03).scale.setScalar(.028); return g; } },
    schleife: { name: "Haarschleife", preis: 200, platz: "ohr", bauen: () => {
      const g = new T.Group();
      for (const s of [-1, 1]) { const k = teil(kegel(.06, .12, 12), A_MAT.rosa, g, -.12 + s * .06, .22, .05); k.rotation.z = s * Math.PI / 2; k.scale.z = .5; }
      teil(kugel, A_MAT.rosa, g, -.12, .22, .05).scale.setScalar(.03); return g; } },
    muetze: { name: "Bommelmütze", preis: 250, platz: "kopf", bauen: () => {
      const g = new T.Group(); teil(kegel(.17, .3, 20), A_MAT.muetze, g, 0, .27, .02); teil(new T.TorusGeometry(.15, .04, 10, 24), A_MAT.weiss, g, 0, .14, .02).rotation.x = Math.PI / 2;
      teil(kugel, A_MAT.weiss, g, 0, .44, .02).scale.setScalar(.06); return g; } },
    fliege: { name: "Fliege", preis: 300, platz: "hals", bauen: () => {
      const g = new T.Group();
      for (const s of [-1, 1]) { const k = teil(kegel(.06, .11, 10), A_MAT.rot, g, s * .055, .14, -.27); k.rotation.z = s * Math.PI / 2; k.scale.z = .45; }
      teil(kugel, A_MAT.rot, g, 0, .14, -.27).scale.setScalar(.03); return g; } },
    brille: { name: "Sonnenbrille", preis: 300, platz: "gesicht", bauen: () => {
      const g = new T.Group();
      for (const sx of [-1, 1]) { const l = teil(zyl(.055, .055, .02, 20), A_MAT.glas, g, sx * .1, .055, -.15); l.rotation.x = Math.PI / 2; l.rotation.z = sx * .35; }
      teil(kiste(.08, .015, .015), A_MAT.glas, g, 0, .07, -.17); return g; } },
    kappe: { name: "Basecap", preis: 350, platz: "kopf", bauen: () => {
      const g = new T.Group();
      teil(new T.SphereGeometry(.17, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), A_MAT.blau, g, 0, .1, .02);
      const s = teil(zyl(.13, .13, .015, 20), A_MAT.blau, g, 0, .11, -.15); s.scale.z = .8;
      teil(kugel, A_MAT.weiss, g, 0, .27, .02).scale.setScalar(.02); return g; } },
    schal: { name: "Ringelschal", preis: 400, platz: "hals", bauen: () => {
      const g = new T.Group(); const t = teil(new T.TorusGeometry(.19, .06, 12, 28), A_MAT.schal, g, 0, .12, -.1); t.rotation.x = Math.PI / 2 + .25;
      teil(kiste(.1, .3, .04), A_MAT.schal, g, .08, -.02, -.28).rotation.z = .2; return g; } },
    partyhut: { name: "Partyhut", preis: 500, platz: "kopf", bauen: () => {
      const g = new T.Group(); const k = teil(kegel(.12, .34, 20), A_MAT.bunt, g, .03, .3, .02); k.rotation.z = -.2;
      teil(kugel, A_MAT.mitte, g, .1, .47, .02).scale.setScalar(.045); return g; } },
    herzbrille: { name: "Herzbrille", preis: 600, platz: "gesicht", bauen: () => {
      const g = new T.Group();
      for (const sx of [-1, 1]) { const h = teil(herz, A_MAT.rosa, g, sx * .1, .055, -.17); h.rotation.y = sx * .35; }
      teil(kiste(.08, .015, .015), A_MAT.rosa, g, 0, .07, -.17); return g; } },
    kopfhoerer: { name: "Kopfhörer", preis: 650, platz: "ohr", bauen: () => {
      const g = new T.Group(); const b = teil(new T.TorusGeometry(.19, .022, 8, 24, Math.PI), A_MAT.schwarz, g, 0, .07, .02);
      for (const s of [-1, 1]) { const m = teil(zyl(.065, .065, .05, 18), A_MAT.rot, g, s * .19, .05, .02); m.rotation.z = Math.PI / 2; }
      return g; } },
    rucksack: { name: "Rucksack", preis: 700, platz: "ruecken", bauen: () => {
      const g = new T.Group();
      teil(new T.CapsuleGeometry(.2, .22, 8, 16), A_MAT.orange, g, 0, 1.62, .18).rotation.x = Math.PI / 2;
      teil(kiste(.26, .14, .06), A_MAT.blau, g, 0, 1.58, .45);
      for (const s of [-1, 1]) { const r = teil(new T.TorusGeometry(.24, .025, 6, 20, Math.PI), A_MAT.blau, g, s * .3, 1.35, .05); r.rotation.y = Math.PI / 2; r.rotation.z = -Math.PI / 2; }
      return g; } },
    medaille: { name: "Goldmedaille", preis: 800, platz: "hals", bauen: () => {
      const g = new T.Group(); const t = teil(new T.TorusGeometry(.2, .014, 8, 28), A_MAT.blau, g, 0, .12, -.1); t.rotation.x = Math.PI / 2 + .25;
      const m = teil(zyl(.085, .085, .025, 24), A_MAT.gold, g, 0, .02, -.37); m.rotation.x = Math.PI / 2 - .3; return g; } },
    zauberhut: { name: "Zauberhut", preis: 900, platz: "kopf", bauen: () => {
      const g = new T.Group(); teil(zyl(.27, .27, .02, 28), A_MAT.lila, g, 0, .15, .02);
      const k = teil(kegel(.15, .48, 20), A_MAT.lila, g, 0, .4, .04); k.rotation.x = .15;
      for (const [x, y, z] of [[.08, .3, -.12], [-.07, .42, -.07], [.03, .52, -.03]]) teil(kugel, A_MAT.gold, g, x, y, z).scale.setScalar(.025);
      return g; } },
    umhang: { name: "Heldenumhang", preis: 1200, platz: "ruecken", bauen: () => {
      const g = new T.Group();
      // halber, offener Zylinder über dem Rücken: vorn an den Schultern eng, hinten weit ausgestellt
      const u = teil(new T.CylinderGeometry(.55, .4, 1.1, 24, 1, true, Math.PI * .55, Math.PI * .9), A_MAT.umhang, g, 0, 1.25, .22);
      u.rotation.x = Math.PI / 2 - .15;
      teil(kugel, A_MAT.gold, g, 0, 1.55, -.33).scale.setScalar(.05); return g; } },
    fluegel: { name: "Feenflügel", preis: 1500, platz: "ruecken", bauen: () => {
      const g = new T.Group();
      for (const s of [-1, 1]) { const f = teil(fluegelForm, A_MAT.feder, g, s * .12, 1.6, -.05); f.scale.set(s * 1.5, 1.5, 1.5); f.rotation.y = s * -.5; f.rotation.x = -.2; }
      return g; } },
    krone: { name: "Goldkrone", preis: 2000, platz: "kopf", bauen: () => {
      const g = new T.Group(); teil(zyl(.14, .14, .08, 20, 1, true), A_MAT.gold, g, 0, .2, .02);
      for (let i = 0; i < 6; i++) { const w = i / 6 * Math.PI * 2; teil(kegel(.035, .1, 8), A_MAT.gold, g, Math.cos(w) * .14, .29, .02 + Math.sin(w) * .14); }
      return g; } },
  };
  function ausstattungSetzen(sp, ids) {
    for (const ort of [sp.kopf, sp.hals, sp.koerper]) for (const k of [...ort.children]) if (k.userData.ausstattung) ort.remove(k);
    for (const id of ids) {
      const a = AUSSTATTUNG[id]; if (!a) continue;
      const teilG = a.bauen(); teilG.userData.ausstattung = true;
      if (a.platz === "ruecken") teilG.position.y += sp.rueckenY || 0;
      else teilG.scale.setScalar((a.platz === "hals" ? sp.halsSkala : sp.kopfSkala) || 1);   // große Köpfe bekommen große Mützen
      (a.platz === "hals" ? sp.hals : a.platz === "ruecken" ? sp.koerper : sp.kopf).add(teilG);
    }
  }

  // ================= Welten =================
  // Alle drei Wegabschnitte wechselt die Landschaft. Jede Welt hat eigenen Boden, eigene Deko, eigenes Wetter.

  // --- Böden ---
  const bodenTex = (grund, flecken, extra) => {
    const t = leinwand(256, 256, (g, w, h) => {
      g.fillStyle = grund; g.fillRect(0, 0, w, h);
      rauschen(g, w, h, 5000, flecken, 2);
      if (extra) extra(g, w, h);
    });
    t.repeat.set(90, 90); return t;
  };
  const wiese = bodenTex("#79b84a", ["#6aa83e", "#88c75a", "#93d062", "#5f9e38"], (g, w, h) => {
    for (let i = 0; i < 160; i++) { g.fillStyle = wahl(["#fff", "#ffd23f", "#ff9ac0", "#c8a2ff"]); g.beginPath(); g.arc(Math.random() * w, Math.random() * h, zufall(1, 2.2), 0, 7); g.fill(); }
  });
  const ufer = bodenTex("#a9bf6a", ["#9cb35f", "#b8cc7a", "#d8c99a", "#c9b98a"], (g, w, h) => {
    for (let i = 0; i < 40; i++) { g.fillStyle = "rgba(226,206,160,.6)"; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, zufall(6, 18), zufall(4, 10), Math.random() * 3, 0, 7); g.fill(); }
  });
  const laubBoden = bodenTex("#8a6a33", ["#a0522d", "#c8731f", "#d99a2b", "#7a5a2a", "#b5651d"], (g, w, h) => {
    for (let i = 0; i < 700; i++) {
      g.fillStyle = wahl(["#d2691e", "#e8a33d", "#b33a1f", "#c88a2a", "#9c4a1a"]);
      g.save(); g.translate(Math.random() * w, Math.random() * h); g.rotate(Math.random() * 6); g.beginPath(); g.ellipse(0, 0, zufall(2, 4), zufall(1, 2), 0, 0, 7); g.fill(); g.restore();
    }
  });
  const schnee = bodenTex("#eef3f8", ["#e2eaf2", "#f8fbff", "#d8e2ec", "#ffffff"]);

  // --- zusätzliche Materialien ---
  const mStd = (farbe, rau = .8, extra = {}) => std({ color: farbe, roughness: rau, ...extra });
  const herbstLaub = [leinwand(256, 256, (g, w, h) => {
    g.fillStyle = "#c8611c"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1500; i++) { g.fillStyle = wahl(["#e07b1f", "#f2a531", "#b8401b", "#d9531e", "#f6c24a"]); g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, zufall(2, 5), zufall(1.5, 3), Math.random() * 3, 0, 7); g.fill(); }
  })].map(t => std({ map: t, roughness: .95, bumpMap: handy ? null : t, bumpScale: 3 }))[0];
  const holzRot = leinwand(256, 256, (g, w, h) => {
    g.fillStyle = "#b8352b"; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) { g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(x, 0, 2, h); }
    rauschen(g, w, h, 2500, ["rgba(0,0,0,.08)", "rgba(255,255,255,.06)"], 2);
    g.strokeStyle = "#fff"; g.lineWidth = 9; g.strokeRect(78, 120, 100, 136);
    g.beginPath(); g.moveTo(78, 120); g.lineTo(178, 256); g.moveTo(178, 120); g.lineTo(78, 256); g.stroke();
  }, false);
  const heu = leinwand(128, 64, (g, w, h) => {
    g.fillStyle = "#e3bf5a"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i++) { g.strokeStyle = wahl(["#c9a23f", "#f0d27a", "#b8902e"]); g.lineWidth = 1; const x = Math.random() * w, y = Math.random() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + zufall(-8, 8), y + zufall(-3, 3)); g.stroke(); }
  });
  const kuhFell = leinwand(128, 64, (g, w, h) => {
    g.fillStyle = "#f7f4ee"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#1f1b18";
    for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, zufall(6, 14), zufall(5, 10), Math.random() * 3, 0, 7); g.fill(); }
  });
  const wellenHoehe = leinwand(128, 128, (g, w, h) => {
    const bild = g.createImageData(w, h), d = bild.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const a = Math.PI * 2 / w;
      const v = Math.sin(x * a * 3 + Math.sin(y * a * 2) * 1.5) + Math.sin(y * a * 4 + x * a) * .7 + Math.sin((x + y) * a * 6) * .3;
      const t = 128 + v * 50, k = (y * w + x) * 4; d[k] = d[k + 1] = d[k + 2] = t; d[k + 3] = 255;
    }
    g.putImageData(bild, 0, 0);
  });
  const wellen = normalAus(wellenHoehe, 3); wellen.repeat.set(3, 3);
  const pilzKappe = leinwand(128, 64, (g, w, h) => {
    g.fillStyle = "#d7262b"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#fff"; for (let i = 0; i < 14; i++) { g.beginPath(); g.arc(Math.random() * w, Math.random() * h * .8, zufall(3, 6), 0, 7); g.fill(); }
  });
  const M = {
    scheune: std({ map: holzRot, roughness: .85 }), dachGrau: mStd("#5b5f66", .7), weiss: mStd("#f4f4f2", .7),
    heu: std({ map: heu, roughness: 1 }), kuh: std({ map: kuhFell, roughness: .8 }), rosa: mStd("#f2a7a8", .7), schwarz: mStd("#222", .6),
    sonnenblume: mStd("#ffcc1f", .7), blumenMitte: mStd("#5a3a1a", .9), stiel: mStd("#4a8a2e", .9),
    uferRand: mStd("#d9c89a", 1),
    wasser: std({ color: "#3b8cc2", roughness: .08, metalness: .3, transparent: true, opacity: .92, normalMap: wellen, normalScale: new T.Vector2(.6, .6), envMapIntensity: 1.4 }),
    boot: mStd("#e2574c", .5), segel: mStd("#ffffff", .6, { side: T.DoubleSide }), steg: std({ map: holz, roughness: .85 }), schilf: mStd("#7a8f3a", .9),
    pilzKappe: std({ map: pilzKappe, roughness: .6 }), pilzStiel: mStd("#f2ead8", .8), kuerbis: mStd("#f08a1c", .55), kuerbisStiel: mStd("#4f6b2a", .8),
    tanne: mStd("#2f6b3a", .9), schneeKappe: mStd("#ffffff", .9), karotte: mStd("#f07b1c", .6), hut: mStd("#222", .5),
    ballon: ["#e53935", "#1e88e5", "#fdd835", "#43a047", "#8e24aa"].map(c => new T.MeshPhysicalMaterial({ color: c, roughness: .25, clearcoat: 1 })),
    faden: new T.LineBasicMaterial({ color: "#666" }), windrad: mStd("#f7f7f7", .5),
  };

  // --- bewegte Dinge (Windrad, Boote, Ballons, Kühe) ---
  const bewegt = [];
  const bewege = (obj, fn) => { bewegt.push({ obj, fn, t0: Math.random() * 10 }); return obj; };
  function animieren(t) {
    windZeit.value = t; wellen.offset.set(t * .03, t * .018);
    for (let i = bewegt.length - 1; i >= 0; i--) {
      const b = bewegt[i];
      let o = b.obj; while (o.parent) o = o.parent;
      if (!o.isScene) { bewegt.splice(i, 1); continue; }   // Abschnitt ist schon entfernt
      b.fn(b.obj, t + b.t0);
    }
  }

  // --- Deko je Welt ---
  function scheune() {
    const g = new T.Group(), b = 5, t = 6, h = 3.4;
    g.userData.abstand = 5;
    teil(kiste(b, h, t), M.scheune, g, 0, h / 2, 0);
    const dreieck = new T.Shape([new T.Vector2(-b / 2 - .3, 0), new T.Vector2(b / 2 + .3, 0), new T.Vector2(0, 2.2)]);
    teil(new T.ExtrudeGeometry(dreieck, { depth: t + .4, bevelEnabled: false }), M.dachGrau, g, 0, h, -(t + .4) / 2);
    return g;
  }
  function heuballen() {
    const g = new T.Group();
    for (let i = 0; i < 1 + Math.floor(Math.random() * 3); i++) {
      const k = teil(zyl(.75, .75, 1.2, 20), M.heu, g, i * 1.6 - 1.6, .75, zufall(-.5, .5)); k.rotation.z = Math.PI / 2;
    }
    return g;
  }
  function kuh() {
    const g = new T.Group();
    const k = teil(kiste(.8, .75, 1.6), M.kuh, g, 0, 1.05, 0); k.geometry.translate(0, 0, 0);
    const kopf = gelenk(g, 0, 1.3, -.95);
    teil(kiste(.5, .5, .55), M.kuh, kopf);
    teil(kiste(.42, .25, .2), M.rosa, kopf, 0, -.13, -.32);
    for (const s of [-1, 1]) {
      teil(kegel(.05, .2, 8), M.weiss, kopf, s * .18, .32, .05);
      teil(kugel, M.schwarz, kopf, s * .16, .08, -.28).scale.setScalar(.04);
    }
    for (const [x, z] of [[-.28, -.6], [.28, -.6], [-.28, .6], [.28, .6]]) teil(zyl(.09, .08, .7, 8), M.kuh, g, x, .35, z);
    return bewege(g, (o, t) => { kopf.rotation.x = .25 + Math.sin(t * 1.3) * .25; });   // grast
  }
  function windrad() {
    const g = new T.Group();
    teil(zyl(.18, .35, 9, 12), M.windrad, g, 0, 4.5, 0);
    const nabe = gelenk(g, 0, 9, -.4);
    teil(kugel, M.windrad, nabe).scale.setScalar(.3);
    for (let i = 0; i < 3; i++) { const f = gelenk(nabe, 0, 0, 0); f.rotation.z = i * Math.PI * 2 / 3; teil(kiste(.3, 3.6, .08), M.windrad, f, 0, 1.9, 0); }
    return bewege(g, (o, t) => { nabe.rotation.z = t * 1.4; });
  }
  function sonnenblumen() {
    const g = new T.Group(), n = 26;
    g.userData.abstand = 4;
    const kopf = new T.InstancedMesh(zyl(.28, .28, .08, 14), M.sonnenblume, n);
    const mitte = new T.InstancedMesh(zyl(.15, .15, .1, 12), M.blumenMitte, n);
    const stiel = new T.InstancedMesh(zyl(.03, .04, 1.6, 6), M.stiel, n);
    const m = new T.Matrix4(), q = new T.Quaternion().setFromEuler(new T.Euler(Math.PI / 2 - .3, 0, 0)), q0 = new T.Quaternion(), e = new T.Vector3(1, 1, 1);
    for (let i = 0; i < n; i++) {
      const x = (i % 6) * .9 - 2.3 + zufall(-.2, .2), z = Math.floor(i / 6) * .9 - 2 + zufall(-.2, .2), h = zufall(1.4, 1.9);
      m.compose(new T.Vector3(x, h / 2, z), q0, new T.Vector3(1, h / 1.6, 1)); stiel.setMatrixAt(i, m);
      m.compose(new T.Vector3(x, h, z - .05), q, e); kopf.setMatrixAt(i, m);
      m.compose(new T.Vector3(x, h + .02, z - .1), q, e); mitte.setMatrixAt(i, m);
    }
    g.add(stiel, kopf, mitte); return g;
  }
  function zaun() {
    const g = new T.Group(), l = zufall(6, 10);
    g.userData.abstand = l / 2 + 1.5;
    for (let x = -l / 2; x <= l / 2; x += 1.2) teil(kiste(.12, 1.1, .12), M.weiss, g, x, .55, 0);
    for (const y of [.4, .85]) teil(kiste(l, .1, .06), M.weiss, g, 0, y, 0);
    return g;
  }
  function see() {
    const g = new T.Group(), r = zufall(5, 7);
    g.userData.abstand = r + 2;
    const w = new T.Mesh(new T.CircleGeometry(r, 40), M.wasser); w.rotation.x = -Math.PI / 2; w.position.y = .03; w.receiveShadow = true; g.add(w);
    const ufer = new T.Mesh(new T.RingGeometry(r, r + .6, 40), M.uferRand); ufer.rotation.x = -Math.PI / 2; ufer.position.y = .025; g.add(ufer);
    // Boot schaukelt auf dem Wasser
    const boot = gelenk(g, zufall(-2, 2), .1, zufall(-3, 3));
    const rumpf = teil(zyl(.6, .6, 2.4, 16, 1, false, 0, Math.PI), M.boot, boot, 0, .25, 0); rumpf.rotation.set(Math.PI / 2, 0, Math.PI);
    teil(zyl(.04, .04, 2.2, 6), M.weiss, boot, 0, 1.3, 0);
    const segel = new T.Mesh(new T.ShapeGeometry(new T.Shape([new T.Vector2(0, 0), new T.Vector2(0, 1.9), new T.Vector2(1.1, 0)])), M.segel);
    segel.position.set(.03, .4, 0); segel.rotation.y = Math.PI / 2; boot.add(segel);
    bewege(boot, (o, t) => { o.rotation.z = Math.sin(t * 1.5) * .12; o.rotation.x = Math.sin(t * 1.1) * .06; o.position.y = .1 + Math.sin(t * 2) * .05; });
    // Schilf am Rand
    const n = 40, schilf = new T.InstancedMesh(zyl(.02, .03, 1.4, 5), M.schilf, n), m = new T.Matrix4(), q = new T.Quaternion();
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, rr = r + zufall(-.4, .4);
      m.compose(new T.Vector3(Math.cos(a) * rr, .7, Math.sin(a) * rr), q.setFromEuler(new T.Euler(zufall(-.15, .15), 0, zufall(-.15, .15))), new T.Vector3(1, zufall(.7, 1.3), 1));
      schilf.setMatrixAt(i, m);
    }
    g.add(schilf);
    return g;
  }
  function steg() {
    const g = new T.Group();
    teil(kiste(1.4, .12, 6), M.steg, g, 0, .35, 0);
    for (const [x, z] of [[-.6, -2.8], [.6, -2.8], [-.6, 2.8], [.6, 2.8]]) teil(zyl(.08, .08, .8, 8), M.steg, g, x, .1, z);
    return g;
  }
  function herbstbaum() {
    const g = new T.Group(), h = zufall(2.4, 3.4);
    teil(zyl(.14, .26, h, 10), mat.rinde, g, 0, h / 2, 0);
    for (let i = 0; i < 7; i++) {
      const b = teil(geo.blatt, herbstLaub, g, zufall(-1, 1), h + zufall(-.2, 1.2), zufall(-1, 1));
      b.scale.setScalar(zufall(.75, 1.3)); b.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    }
    return g;
  }
  function pilze() {
    const g = new T.Group();
    for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) {
      const s = zufall(.5, 1.1), x = zufall(-1.2, 1.2), z = zufall(-1.2, 1.2);
      teil(zyl(.12 * s, .16 * s, .5 * s, 10), M.pilzStiel, g, x, .25 * s, z);
      teil(new T.SphereGeometry(.38 * s, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.pilzKappe, g, x, .45 * s, z);
    }
    return g;
  }
  function kuerbisse() {
    const g = new T.Group();
    for (let i = 0; i < 3; i++) {
      const s = zufall(.35, .6), x = zufall(-1.3, 1.3), z = zufall(-1.3, 1.3);
      for (let r = 0; r < 6; r++) {            // gerippt aus mehreren Kugeln
        const k = teil(kugel, M.kuerbis, g, x + Math.cos(r) * s * .3, s * .75, z + Math.sin(r) * s * .3); k.scale.set(s * .55, s * .75, s * .55);
      }
      teil(zyl(.04, .05, .2, 6), M.kuerbisStiel, g, x, s * 1.5, z);
    }
    return g;
  }
  function tanne() {
    const g = new T.Group(), h = zufall(3, 4.5);
    teil(zyl(.15, .2, 1, 8), mat.rinde, g, 0, .5, 0);
    for (let i = 0; i < 3; i++) {
      const r = (1.5 - i * .38) * h / 4, y = 1 + i * h * .22;
      teil(kegel(r, h * .4, 12), M.tanne, g, 0, y + h * .2, 0);
      teil(kegel(r * .55, h * .14, 12), M.schneeKappe, g, 0, y + h * .35, 0);
    }
    return g;
  }
  function schneemann() {
    const g = new T.Group();
    teil(kugel, M.schneeKappe, g, 0, .55, 0).scale.setScalar(.6);
    teil(kugel, M.schneeKappe, g, 0, 1.35, 0).scale.setScalar(.42);
    const kopf = gelenk(g, 0, 1.98, 0);
    teil(kugel, M.schneeKappe, kopf).scale.setScalar(.3);
    teil(kegel(.05, .3, 8), M.karotte, kopf, 0, 0, -.38).rotation.x = -Math.PI / 2;
    for (const s of [-1, 1]) teil(kugel, M.schwarz, kopf, s * .1, .08, -.26).scale.setScalar(.035);
    teil(zyl(.2, .2, .32, 16), M.hut, kopf, 0, .36, 0);
    teil(zyl(.32, .32, .04, 16), M.hut, kopf, 0, .2, 0);
    return bewege(g, (o, t) => { kopf.rotation.z = Math.sin(t * .8) * .08; });
  }
  function ballons() {
    const g = new T.Group();
    for (let i = 0; i < 3; i++) {
      const b = gelenk(g, zufall(-.5, .5), 3 + i * .4, zufall(-.5, .5));
      teil(kugel, wahl(M.ballon), b).scale.set(.32, .4, .32);
      const linie = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(0, -.4, 0), new T.Vector3(0, -3 - i * .4, 0)]), M.faden); b.add(linie);
      bewege(b, (o, t) => { o.position.x += Math.sin(t * 1.3 + i) * .002; o.rotation.z = Math.sin(t + i) * .1; o.position.y = 3 + i * .4 + Math.sin(t * 1.7 + i) * .15; });
    }
    teil(kiste(.3, .2, .3), mat.holz, g, 0, .1, 0);
    return g;
  }

  const ZONEN = [
    { name: "Kita-Garten", unter: "Hier wird gespielt!", huegel: "#7fae7a", kronen: "#5d8f55", boden: gras, nebel: "#dcedf6", himmel: "#ffffff", sonne: "#ffe7c4",
      deko: [baum, baum, haus, rutsche, sandkasten, ballons], wetter: "falter" },
    { name: "Bauernhof", unter: "Muh! Schau mal, die Kühe", huegel: "#a3c46a", kronen: "#6f9a4f", boden: wiese, nebel: "#e4f0f4", himmel: "#ffffff", sonne: "#fff0c8",
      deko: [scheune, heuballen, kuh, kuh, windrad, sonnenblumen, zaun, baum], wetter: "voegel" },
    { name: "Am See", unter: "Boote, Steg und Schilf", huegel: "#86b39a", kronen: "#4f8a68", boden: ufer, nebel: "#d8ecf6", himmel: "#e8f6ff", sonne: "#fff4dc",
      deko: [see, see, steg, baum, ballons], wetter: "voegel" },
    { name: "Herbstwald", unter: "Die Blätter fallen", huegel: "#b8945a", kronen: "#c86a28", boden: laubBoden, nebel: "#f1e3cf", himmel: "#ffe9cf", sonne: "#ffc98a",
      deko: [herbstbaum, herbstbaum, herbstbaum, pilze, kuerbisse], wetter: "blaetter", hecke: "herbst" },
    { name: "Winterland", unter: "Brrr, es schneit!", huegel: "#e6edf3", kronen: "#cfdbe3", boden: schnee, nebel: "#e9eef4", himmel: "#dfe8f2", sonne: "#f2f6ff",
      deko: [tanne, tanne, tanne, schneemann], wetter: "schnee", hecke: "schnee" },
  ];
  const STIMMUNG = [
    { farbe: "#fff2e0", saett: 1.12, kontrast: 1.04, glanz: .55, licht: 2.9, himmel: .85 },   // warmer Morgen
    { farbe: "#fffaf0", saett: 1.16, kontrast: 1.06, glanz: .5, licht: 3.2, himmel: .9 },     // Mittagssonne
    { farbe: "#eef6ff", saett: 1.1, kontrast: 1.04, glanz: .7, licht: 3.0, himmel: .9 },      // glitzernder See
    { farbe: "#ffdcb4", saett: 1.2, kontrast: 1.08, glanz: .6, licht: 2.6, himmel: .75 },     // goldener Abend
    { farbe: "#e4eeff", saett: .9, kontrast: 1.06, glanz: .55, licht: 2.4, himmel: 1.0 },     // kühles Blau
  ];
  ZONEN.forEach((z, i) => { z.stimmung = STIMMUNG[i]; });
  const zoneFuer = (nr) => Math.floor(nr / 3) % ZONEN.length;
  const dekoFuer = (z) => wahl(ZONEN[z].deko)();

  // Hecken je Welt: im Herbst bunt, im Winter mit Schnee auf der Krone
  const heckeHerbst = std({ map: hecke, color: "#ffc27a", roughness: 1, normalMap: mat.hecke.normalMap });
  function heckeFuer(laenge, z, hoehe, dicke) {
    const g = heckenStueck(laenge, hoehe, dicke), art = ZONEN[z].hecke;
    if (art === "herbst") g.children.forEach(k => { k.material = heckeHerbst; });
    if (art === "schnee") g.children[1].material = M.schneeKappe;
    return g;
  }
  const windZeit = { value: 0 };
  const grasBild = leinwand(128, 128, (g, w, h) => {
    for (let i = 0; i < 28; i++) {
      const x = zufall(12, w - 12), hh = zufall(h * .45, h * .97), b = zufall(-16, 16);
      g.fillStyle = wahl(["#ffffff", "#eef6e4", "#dcebc8"]);
      g.beginPath(); g.moveTo(x - 3.5, h); g.quadraticCurveTo(x + b * .3, h - hh * .6, x + b, h - hh); g.quadraticCurveTo(x + b * .3 + 1.5, h - hh * .6, x + 3.5, h); g.fill();
    }
    g.globalCompositeOperation = "source-atop";                     // unten dunkler, oben hell
    const v = g.createLinearGradient(0, h, 0, 0); v.addColorStop(0, "rgba(0,0,0,.45)"); v.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = v; g.fillRect(0, 0, w, h);
  }, false);
  // drei gekreuzte Flächen, jede doppelt (Vorder- und Rückseite); alle Normalen zeigen nach oben,
  // dann wirkt das Gras von beiden Seiten gleich hell und weich beleuchtet
  const grasGeo = (() => {
    const teile = [0, 1, 2].map(i => new T.PlaneGeometry(.9, .55).translate(0, .275, 0).rotateY(i * Math.PI / 3));
    const pos = [], uv = [], idx = [];
    teile.forEach((t, i) => {
      pos.push(...t.attributes.position.array); uv.push(...t.attributes.uv.array);
      const a = [...t.index.array].map(n => n + i * t.attributes.position.count);
      idx.push(...a);
      for (let k = 0; k < a.length; k += 3) idx.push(a[k], a[k + 2], a[k + 1]);   // Rückseite
    });
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    g.setAttribute("normal", new T.Float32BufferAttribute(new Array(pos.length).fill(0).map((_, k) => k % 3 === 1 ? 1 : 0), 3));
    g.setIndex(idx); return geteilt(g);
  })();
  const windEinbauen = (m) => {
    m.onBeforeCompile = (sh) => {
      sh.uniforms.zeit = windZeit;
      sh.vertexShader = "uniform float zeit;\n" + sh.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
        float spitze = max(position.y, 0.) / .55; spitze *= spitze;
        #ifdef USE_INSTANCING
          vec2 ort = instanceMatrix[3].xz;
        #else
          vec2 ort = vec2(0.);
        #endif
        float wind = sin(zeit * 2.1 + ort.x * .35 + ort.y * .27) * .55 + sin(zeit * 3.7 + ort.x * .9 + ort.y * .4) * .2;
        transformed.x += wind * .16 * spitze; transformed.z += wind * .08 * spitze;`);
    };
    return m;
  };
  const grasMat = ["#82c24f", "#97c757", "#74b86a", "#c9a24a", "#e3ecf2"].map(c =>
    windEinbauen(std({ map: grasBild, color: c, alphaTest: .45, roughness: 1 })));
  function grasBueschel(laenge, z, breite) {
    const dichte = (handy ? .45 : 1.5) * (z === 4 ? .35 : 1);
    const n = Math.max(1, Math.round(laenge * breite * dichte)), k = new T.InstancedMesh(grasGeo, grasMat[z], n);
    const m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler();
    for (let i = 0; i < n; i++) {
      const sk = zufall(.7, 1.45);
      q.setFromEuler(e.set(0, Math.random() * Math.PI, 0));
      m.compose(new T.Vector3(zufall(-breite / 2, breite / 2), 0, zufall(-laenge / 2, laenge / 2)), q, new T.Vector3(sk, sk * zufall(.8, 1.2), sk));
      k.setMatrixAt(i, m);
    }
    k.receiveShadow = true; return k;
  }
  const blumenFuer = (laenge, z) => ZONEN[z].hecke === "schnee" ? new T.Group() : blumen(laenge);

  // --- Bodenfläche mit Überblenden zwischen den Welten ---
  let bodenA, bodenB, blende = 1, verbunden = null, zielZone = 0;
  const zielFarben = { nebel: new T.Color(), himmel: new T.Color(), sonne: new T.Color(), huegel: new T.Color(), kronen: new T.Color() };
  function bodenFlaeche() {
    const geom = new T.PlaneGeometry(400, 400);
    bodenA = new T.Mesh(geom, std({ map: gras, roughness: 1 }));
    bodenB = new T.Mesh(geom, std({ map: gras, roughness: 1, transparent: true, opacity: 0, depthWrite: false }));
    for (const b of [bodenA, bodenB]) { b.rotation.x = -Math.PI / 2; b.receiveShadow = true; }
    bodenA.position.y = -.12; bodenB.position.y = -.1;
    const g = new T.Group(); g.add(bodenA, bodenB); return g;
  }
  function bodenFolgen(px, pz) {
    for (const b of [bodenA, bodenB]) { b.position.x = px; b.position.z = pz; b.material.map.offset.set(px / (400 / 90), -pz / (400 / 90)); }
  }
  function verbinden(o) { verbunden = o; }
  function zoneWechsel(z, sofort) {
    zielZone = z; const Z = ZONEN[z];
    zielFarben.nebel.set(Z.nebel); zielFarben.himmel.set(Z.himmel); zielFarben.sonne.set(Z.sonne); zielFarben.huegel.set(Z.huegel); zielFarben.kronen.set(Z.kronen);
    if (sofort) {
      bodenA.material.map = Z.boden; bodenA.material.needsUpdate = true; bodenB.material.opacity = 0; blende = 1;
      if (verbunden) { verbunden.szene.fog.color.copy(zielFarben.nebel); verbunden.himmelMat.color.copy(zielFarben.himmel); verbunden.sonne.color.copy(zielFarben.sonne); }
      if (fernMat) { fernMat[0].color.copy(zielFarben.huegel); fernMat[1].color.copy(zielFarben.huegel).offsetHSL(0, 0, .05); fernMat[2].color.copy(zielFarben.kronen); }
    } else { bodenB.material.map = Z.boden; bodenB.material.needsUpdate = true; bodenB.material.opacity = 0; blende = 0; }
    wetterArt(Z.wetter);
  }
  function zoneSchritt(dt) {
    if (blende < 1) {
      blende = Math.min(1, blende + dt / 1.8); bodenB.material.opacity = blende;
      if (blende >= 1) { bodenA.material.map = bodenB.material.map; bodenA.material.needsUpdate = true; bodenB.material.opacity = 0; }
    }
    if (verbunden) {
      const k = Math.min(1, dt * .8);
      verbunden.szene.fog.color.lerp(zielFarben.nebel, k); verbunden.himmelMat.color.lerp(zielFarben.himmel, k); verbunden.sonne.color.lerp(zielFarben.sonne, k);
    }
    if (fernMat) { fernMat[0].color.lerp(zielFarben.huegel, Math.min(1, dt * .8)); fernMat[1].color.lerp(zielFarben.huegel, Math.min(1, dt * .6)); fernMat[2].color.lerp(zielFarben.kronen, Math.min(1, dt * .8)); }
  }

  // --- Wetter und Tiere in der Luft ---
  const punktBild = (farbe, form) => leinwand(32, 32, (g) => {
    if (form === "blatt") { g.fillStyle = "#fff"; g.beginPath(); g.ellipse(16, 16, 13, 7, .6, 0, 7); g.fill(); return; }
    const v = g.createRadialGradient(16, 16, 0, 16, 16, 16); v.addColorStop(0, farbe); v.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = v; g.fillRect(0, 0, 32, 32);
  }, false);
  const ANZ = 420, wetterPos = new Float32Array(ANZ * 3), wetterFarbe = new Float32Array(ANZ * 3), tempo = new Float32Array(ANZ);
  const wetterGeo = new T.BufferGeometry();
  wetterGeo.setAttribute("position", new T.BufferAttribute(wetterPos, 3)); wetterGeo.setAttribute("color", new T.BufferAttribute(wetterFarbe, 3));
  const wetterMat = { schnee: new T.PointsMaterial({ map: punktBild("rgba(255,255,255,1)"), size: .22, transparent: true, depthWrite: false, vertexColors: true }),
    blaetter: new T.PointsMaterial({ map: punktBild(0, "blatt"), size: .32, transparent: true, depthWrite: false, vertexColors: true, alphaTest: .3 }),
    falter: new T.PointsMaterial({ map: punktBild(0, "blatt"), size: .28, transparent: true, depthWrite: false, vertexColors: true, alphaTest: .3 }) };
  const wetter = new T.Points(wetterGeo, wetterMat.schnee); wetter.frustumCulled = false; wetter.visible = false;
  let wetterTyp = null;
  function wetterArt(typ) {
    wetterTyp = typ === "voegel" ? null : typ; wetter.visible = !!wetterTyp; voegelAn = typ === "voegel" || typ === "falter";
    if (!wetterTyp) return;
    wetter.material = wetterMat[wetterTyp];
    const farben = { schnee: ["#ffffff"], blaetter: ["#e07b1f", "#f2a531", "#b8401b", "#d9531e", "#f6c24a"], falter: ["#ffd23f", "#ff7aa2", "#6ec6ff", "#ffffff", "#c8a2ff"] }[wetterTyp];
    const n = wetterTyp === "falter" ? 40 : ANZ;
    for (let i = 0; i < ANZ; i++) {
      const c = new T.Color(wahl(farben));
      wetterPos[i * 3] = zufall(-25, 25); wetterPos[i * 3 + 1] = i < n ? (wetterTyp === "falter" ? zufall(.4, 2.5) : zufall(0, 18)) : -100; wetterPos[i * 3 + 2] = zufall(-30, 15);
      wetterFarbe.set([c.r, c.g, c.b], i * 3); tempo[i] = zufall(.6, 1.4);
    }
    wetterGeo.attributes.color.needsUpdate = true;
  }
  function wetterSchritt(dt, kamPos, t) {
    if (!wetterTyp) return;
    wetter.position.set(kamPos.x, 0, kamPos.z);
    for (let i = 0; i < ANZ; i++) {
      const k = i * 3; if (wetterPos[k + 1] < -50) continue;
      if (wetterTyp === "schnee") { wetterPos[k + 1] -= dt * 1.6 * tempo[i]; wetterPos[k] += Math.sin(t + i) * dt * .4; }
      else if (wetterTyp === "blaetter") { wetterPos[k + 1] -= dt * 1.1 * tempo[i]; wetterPos[k] += Math.sin(t * 1.5 + i) * dt * 1.2; }
      else { wetterPos[k] += Math.sin(t * 2 + i) * dt * 1.5; wetterPos[k + 1] = 1.2 + Math.sin(t * 3 * tempo[i] + i) * .7; wetterPos[k + 2] += Math.cos(t * 1.3 + i) * dt; }
      if (wetterPos[k + 1] < 0) { wetterPos[k + 1] = 18; wetterPos[k] = zufall(-25, 25); wetterPos[k + 2] = zufall(-30, 15); }
    }
    wetterGeo.attributes.position.needsUpdate = true;
  }
  // Vogelschwarm, der über den Himmel zieht
  const voegel = new T.Group(); let voegelAn = false, vogelX = -60;
  const vogelMat = new T.MeshBasicMaterial({ color: "#2d3340", side: T.DoubleSide, fog: false });
  const fluegel = new T.BufferGeometry().setFromPoints([new T.Vector3(0, 0, 0), new T.Vector3(-.9, .15, .25), new T.Vector3(0, 0, .4)]);
  for (let i = 0; i < 7; i++) {
    const v = new T.Group(); v.position.set(-Math.abs(i - 3) * 1.6, Math.abs(i - 3) * .3, (i - 3) * 1.4);
    const l = new T.Mesh(fluegel, vogelMat), r = new T.Mesh(fluegel, vogelMat); r.scale.x = -1; v.add(l, r); v.userData = { l, r }; voegel.add(v);
  }
  voegel.visible = false;
  function voegelSchritt(dt, kamPos, yaw, t) {
    voegel.visible = voegelAn; if (!voegelAn) return;
    vogelX += dt * 7; if (vogelX > 70) vogelX = -70;
    const sin = Math.sin(yaw), cos = Math.cos(yaw);
    voegel.position.set(kamPos.x - sin * 45 + cos * vogelX, 22 + Math.sin(t * .5) * 2, kamPos.z - cos * 45 - sin * vogelX);
    voegel.rotation.y = yaw - Math.PI / 2;
    voegel.children.forEach((v, i) => { const f = Math.sin(t * 9 + i) * .7; v.userData.l.rotation.z = f; v.userData.r.rotation.z = -f; });
  }
  const luft = new T.Group(); luft.add(wetter, voegel);

  return { rekordFahne, figurBauen, FIGUREN, leoBauen, FIGUR_INFO, toertchen, frauBauen, sprechblase, froebelBanner, froebelHeckenTafel, froebelTafel, froebelSchild, kontaktSchatten, grasBueschel, dampf, weltHindernis, entsorgen, pfeilSchild, bodenPfeil, AUSSTATTUNG, ausstattungSetzen, zonen: ZONEN, zoneFuer, dekoFuer, heckeFuer, blumenFuer, bodenFlaeche, bodenFolgen, verbinden, zoneWechsel, zoneSchritt,
    animieren, wetterSchritt, voegelSchritt, luft, mat, geo, giraffeBauen, anjaBauen, boden, heckenStueck, blumen, ferne, sonnenScheibe, funke, staub, kante, dekoNeu, hindernis, stern, panzer, booster, blase, himmel, wolken, gras };
}
