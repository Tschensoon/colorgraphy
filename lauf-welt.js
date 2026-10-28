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
    t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4;
    if (wiederholen) t.wrapS = t.wrapT = T.RepeatWrapping;
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
  const pflaster = leinwand(256, 256, (g, w, h) => {
    g.fillStyle = "#a89a86"; g.fillRect(0, 0, w, h);
    const sh = 32, sb = 64;
    for (let r = 0; r < h / sh; r++) {
      for (let c = -1; c < w / sb + 1; c++) {
        const x = c * sb + (r % 2) * sb / 2, y = r * sh;
        const l = zufall(-12, 12);
        g.fillStyle = `hsl(${zufall(28, 38)}, ${zufall(14, 22)}%, ${70 + l}%)`;
        g.fillRect(x + 2, y + 2, sb - 4, sh - 4);
        rauschen(g, 0, 0, 0, ["#000"]);
      }
    }
    rauschen(g, w, h, 4000, ["rgba(0,0,0,.06)", "rgba(255,255,255,.08)"], 2);
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
  const plueschBasis = { roughness: 1, sheen: 1, sheenRoughness: .55 };
  const mat = {
    gras: std({ map: gras, roughness: 1 }),
    weg: std({ map: pflaster, roughness: .95, bumpMap: pflaster, bumpScale: 1.5 }),
    kante: std({ color: "#cfcac0", roughness: .9 }),
    hecke: std({ map: hecke, roughness: 1, bumpMap: hecke, bumpScale: 4 }),
    holz: std({ map: holz, roughness: .8 }),
    rinde: std({ map: rinde, roughness: 1, bumpMap: rinde, bumpScale: 3 }),
    laub: std({ map: laub, roughness: .95, bumpMap: laub, bumpScale: 3 }),
    dach: std({ map: dach, roughness: .8 }),
    pfuetze: std({ color: "#6f9fc4", roughness: .04, metalness: .2, transparent: true, opacity: .82 }),
    metall: std({ color: "#2f7fd0", roughness: .3, metalness: .6 }),
    metallRot: std({ color: "#d84a3a", roughness: .35, metalness: .5 }),
    plastikGelb: std({ color: "#ffcd2e", roughness: .35 }),
    plastikRot: std({ color: "#e94b3c", roughness: .35 }),
    stern: std({ color: "#ffc928", roughness: .3, metalness: .55, emissive: "#a87400", emissiveIntensity: .6 }),
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
  const geo = {
    ball: new T.SphereGeometry(.45, 32, 20),
    klotz: new T.BoxGeometry(.82, .5, .82),
    stern: (() => {
      const f = new T.Shape();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? .13 : .3, w = i / 10 * Math.PI * 2; f[i ? "lineTo" : "moveTo"](Math.sin(w) * r, Math.cos(w) * r); }
      const g = new T.ExtrudeGeometry(f, { depth: .06, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 2 }); g.center(); return g;
    })(),
    blatt: new T.IcosahedronGeometry(1, 2),
  };

  // Körper und Glieder als Mesh mit Schatten
  const teil = (geom, m, eltern, x = 0, y = 0, z = 0) => {
    const k = new T.Mesh(geom, m); k.position.set(x, y, z); k.castShadow = true; k.receiveShadow = true;
    eltern.add(k); return k;
  };
  const gelenk = (eltern, x, y, z) => { const g = new T.Group(); g.position.set(x, y, z); eltern.add(g); return g; };

  // ---------- Fröbelinchen: Plüschgiraffe ----------
  function giraffeBauen() {
    const g = new T.Group(), koerper = gelenk(g, 0, 0, 0);
    const rumpf = teil(new T.CapsuleGeometry(.34, .72, 10, 24), mat.giraffe, koerper, 0, 1.2, .02);
    rumpf.rotation.x = Math.PI / 2 - .1; rumpf.scale.set(1, 1, .95);        // Schulter etwas höher als Hüfte
    teil(kugel, mat.giraffe, koerper, 0, 1.28, -.38).scale.set(.33, .36, .3);  // Brust
    teil(kugel, mat.giraffeHell, koerper, 0, .98, -.02).scale.set(.24, .12, .5); // heller Bauch

    // Hals mit Mähne, Kopf am Ende; der Hals kippt beim Ducken nach vorn
    const hals = gelenk(koerper, 0, 1.42, -.48);
    const halsM = teil(new T.CylinderGeometry(.1, .19, 1.05, 20, 4), mat.giraffe, hals, 0, .48, -.12); halsM.rotation.x = -.26;
    const maehne = teil(new T.BoxGeometry(.05, .95, .07), mat.giraffeDunkel, hals, 0, .5, .02); maehne.rotation.x = -.26;
    const kopf = gelenk(hals, 0, 1.02, -.27);
    teil(kugel, mat.giraffe, kopf).scale.set(.16, .165, .2);
    const maul = teil(new T.CapsuleGeometry(.085, .07, 8, 16), mat.giraffeHell, kopf, 0, -.07, -.17); maul.rotation.x = Math.PI / 2 + .55;
    for (const s of [-1, 1]) {
      const horn = teil(new T.CylinderGeometry(.022, .03, .17, 10), mat.giraffe, kopf, s * .06, .18, .04); horn.rotation.z = -s * .15;
      teil(kugel, mat.giraffeDunkel, kopf, s * .073, .27, .04).scale.setScalar(.042);
      const ohr = teil(new T.ConeGeometry(.05, .19, 12), mat.giraffeHell, kopf, s * .19, .1, .07);
      ohr.rotation.z = -s * 1.2; ohr.scale.z = .5;
      teil(kugel, mat.auge, kopf, s * .1, .05, -.12).scale.setScalar(.03);
      teil(kugel, mat.glanz, kopf, s * .108, .062, -.145).scale.setScalar(.009);
      teil(kugel, mat.giraffeDunkel, kopf, s * .03, -.1, -.26).scale.set(.013, .009, .01);  // Nasenlöcher
    }
    // Beine mit Knie: oben schwingt, unten knickt
    const beine = [];
    for (const [x, z] of [[-.17, -.38], [.17, -.38], [-.17, .4], [.17, .4]]) {
      const oben = gelenk(koerper, x, 1.12, z);
      teil(new T.CylinderGeometry(.085, .065, .56, 14), mat.giraffe, oben, 0, -.28, 0);
      const unten = gelenk(oben, 0, -.56, 0);
      teil(kugel, mat.giraffe, unten).scale.setScalar(.068);
      teil(new T.CylinderGeometry(.06, .05, .46, 14), mat.giraffeHell, unten, 0, -.23, 0);
      teil(new T.CylinderGeometry(.062, .07, .08, 14), mat.giraffeDunkel, unten, 0, -.5, 0);
      beine.push({ oben, unten });
    }
    const schwanz = gelenk(koerper, 0, 1.3, .75);
    const sm = teil(new T.CylinderGeometry(.018, .026, .5, 8), mat.giraffe, schwanz, 0, -.24, .05); sm.rotation.x = .2;
    teil(kugel, mat.giraffeDunkel, schwanz, 0, -.5, .1).scale.set(.04, .08, .04);
    return { gruppe: g, koerper, hals, beine, schwanz };
  }

  // ---------- Anja: Läuferin mit blondem Pferdeschwanz ----------
  function anjaBauen() {
    const g = new T.Group(), k = gelenk(g, 0, 0, 0);
    // Oberkörper als gedrehte Kontur: Taille, Brust, Schultern
    const kontur = [[0, 0], [.15, 0], [.14, .12], [.165, .3], [.18, .42], [.16, .5], [.07, .55], [0, .55]].map(([x, y]) => new T.Vector2(x, y));
    const rumpf = teil(new T.LatheGeometry(kontur, 24), mat.shirt, k, 0, .96, 0); rumpf.scale.z = .72;
    teil(new T.CylinderGeometry(.155, .16, .18, 20), mat.jeans, k, 0, .95, 0).scale.z = .75;   // Hüfte
    teil(new T.CylinderGeometry(.045, .05, .1, 12), mat.haut, k, 0, 1.55, 0);                  // Hals
    const kopf = gelenk(k, 0, 1.68, -.01);
    teil(kugel, mat.haut, kopf).scale.set(.1, .122, .11);
    const haarKappe = teil(new T.SphereGeometry(1, 28, 20, 0, Math.PI * 2, 0, Math.PI * .62), mat.haar, kopf, 0, .015, .01);
    haarKappe.scale.set(.108, .13, .118); haarKappe.rotation.x = .35;
    for (const s of [-1, 1]) {
      teil(kugel, mat.auge, kopf, s * .036, .015, -.098).scale.set(.012, .014, .008);
      teil(kugel, mat.haut, kopf, s * .1, 0, 0).scale.set(.018, .03, .02);                        // Ohren
    }
    teil(kugel, mat.haut, kopf, 0, -.015, -.11).scale.set(.014, .02, .016);                         // Nase
    teil(kugel, mat.lippe, kopf, 0, -.06, -.098).scale.set(.022, .007, .006);
    const zopf = gelenk(kopf, 0, .04, .1);
    teil(kugel, mat.haar, zopf, 0, 0, .02).scale.setScalar(.035);
    teil(new T.CapsuleGeometry(.045, .16, 6, 12), mat.haar, zopf, 0, -.1, .07).rotation.x = .5;
    const glied = (x, y, dickO, dickU, langO, langU, mO, mU, ende) => {
      const oben = gelenk(k, x, y, 0);
      teil(new T.CylinderGeometry(dickO, dickO * .85, langO, 12), mO, oben, 0, -langO / 2, 0);
      const unten = gelenk(oben, 0, -langO, 0);
      teil(kugel, mO, unten).scale.setScalar(dickO * .85);
      teil(new T.CylinderGeometry(dickU, dickU * .8, langU, 12), mU, unten, 0, -langU / 2, 0);
      ende(unten, langU);
      return { oben, unten };
    };
    const beine = [-1, 1].map(s => glied(s * .085, .9, .075, .058, .44, .42, mat.jeans, mat.jeans, (u, l) => {
      teil(new T.CapsuleGeometry(.05, .12, 6, 12), mat.schuh, u, 0, -l - .02, -.05).rotation.x = Math.PI / 2;
      teil(new T.BoxGeometry(.1, .025, .22), mat.sohle, u, 0, -l - .065, -.05);
    }));
    const arme = [-1, 1].map(s => glied(s * .2, 1.45, .045, .036, .28, .26, mat.shirt, mat.haut, (u, l) => {
      teil(kugel, mat.haut, u, 0, -l - .03, 0).scale.set(.04, .05, .03);
    }));
    // kurze Ärmel: oberes Stück Shirt, darunter Haut
    for (const a of arme) teil(new T.CylinderGeometry(.04, .036, .14, 12), mat.haut, a.oben, 0, -.21, 0);
    return { gruppe: g, k, beine, arme, zopf };
  }

  // ---------- Weg, Hecken, Deko ----------
  function boden(laenge, breite) {
    const k = new T.Mesh(uvSkala(new T.PlaneGeometry(breite, laenge), breite / 2.2, laenge / 2.2).rotateX(-Math.PI / 2), mat.weg);
    k.receiveShadow = true; return k;
  }
  function heckenStueck(laenge, hoehe = 1.45) {
    const g = new T.Group();
    teil(uvSkala(new T.BoxGeometry(.8, hoehe, laenge), laenge / 1.3, hoehe / 1.3), mat.hecke, g, 0, hoehe / 2, 0);
    // gerundete Oberseite, damit sie wie geschnittener Buchs aussieht und nicht wie eine Kiste
    const krone = teil(uvSkala(new T.CylinderGeometry(.4, .4, laenge, 14, 1, false, 0, Math.PI), laenge / 1.3, 1), mat.hecke, g, 0, hoehe, 0);
    krone.rotation.set(Math.PI / 2, Math.PI / 2, 0);
    return g;
  }
  // Blumenstreifen am Fuß der Hecke (eine Zeichnung für viele Blüten)
  const bluetenGeo = new T.IcosahedronGeometry(.07, 1), blattGeo = new T.SphereGeometry(.09, 8, 6);
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
    const k = new T.Mesh(new T.BoxGeometry(.18, .1, laenge), mat.kante); k.receiveShadow = true; return k;
  }
  function baum() {
    const g = new T.Group(), h = zufall(2.2, 3.2);
    teil(new T.CylinderGeometry(.13, .24, h, 10), mat.rinde, g, 0, h / 2, 0);
    for (let i = 0; i < 7; i++) {
      const b = teil(geo.blatt, mat.laub, g, zufall(-.9, .9), h + zufall(-.2, 1.2), zufall(-.9, .9));
      b.scale.setScalar(zufall(.75, 1.25)); b.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    }
    return g;
  }
  function haus() {
    const g = new T.Group(), b = zufall(4, 5.5), t = zufall(3.5, 4.5), h = 2.8;
    const w = teil(new T.BoxGeometry(b, h, t), wahl(mat.haus), g, 0, h / 2, 0);
    const dreieck = new T.Shape([new T.Vector2(-b / 2 - .3, 0), new T.Vector2(b / 2 + .3, 0), new T.Vector2(0, 1.7)]);
    const d = teil(new T.ExtrudeGeometry(dreieck, { depth: t + .5, bevelEnabled: false }), mat.dach, g, 0, h, -(t + .5) / 2);
    uvSkala(d.geometry, .25, .25);
    teil(new T.BoxGeometry(.45, 1, .45), mat.dach, g, b / 4, h + 1.1, 0);  // Schornstein
    return g;
  }
  function rutsche() {
    const g = new T.Group();
    for (const [x, z] of [[-.5, -.5], [.5, -.5], [-.5, .5], [.5, .5]]) teil(new T.CylinderGeometry(.06, .06, 2, 10), mat.metallRot, g, x, 1, z);
    teil(new T.BoxGeometry(1.2, .1, 1.2), mat.holz, g, 0, 1.6, 0);
    teil(new T.ConeGeometry(.95, .9, 4), mat.plastikRot, g, 0, 2.5, 0).rotation.y = Math.PI / 4;
    const bahn = teil(new T.BoxGeometry(.7, .06, 3), mat.plastikGelb, g, 0, .95, 1.75); bahn.rotation.x = .52;
    return g;
  }
  function sandkasten() {
    const g = new T.Group();
    for (const [x, z, sx, sz] of [[0, -1, 2.4, .2], [0, 1, 2.4, .2], [-1.1, 0, .2, 2], [1.1, 0, .2, 2]]) teil(new T.BoxGeometry(sx, .3, sz), mat.holz, g, x, .15, z);
    const sand = teil(new T.BoxGeometry(2, .2, 1.8), std({ color: "#e9d29a", roughness: 1 }), g, 0, .1, 0); sand.castShadow = false;
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
      const s = teil(new T.CylinderGeometry(.22, .22, breite, 16), mat.rinde, g, 0, .24, 0); s.rotation.z = Math.PI / 2;
      for (const x of [-breite / 2 + .4, breite / 2 - .4]) teil(new T.BoxGeometry(.3, .16, .5), mat.holz, g, x, .08, 0);
    } else if (typ === "pfuetze") {
      const p = new T.Mesh(new T.CircleGeometry(1, 28), mat.pfuetze); p.rotation.x = -Math.PI / 2; p.scale.set(breite / 2 - .1, .9, 1); p.position.y = .025;
      p.receiveShadow = true; g.add(p);
    } else if (typ === "stange") {
      const s = teil(new T.CylinderGeometry(.09, .09, breite + .2, 16), mat.metall, g, 0, 1.45, 0); s.rotation.z = Math.PI / 2;
      for (const x of [-breite / 2, breite / 2]) teil(new T.CylinderGeometry(.08, .1, 1.55, 12), mat.metallRot, g, x, .78, 0);
      for (let i = 0; i < 7; i++) {      // bunte Ringe zum Turnen
        const r = teil(new T.TorusGeometry(.13, .025, 8, 20), wahl(mat.klotz), g, -breite / 2 + .6 + i * (breite - 1.2) / 6, 1.2, 0);
        r.rotation.y = Math.PI / 2;
      }
    }
    return g;
  }
  function stern() { const k = new T.Mesh(geo.stern, mat.stern); k.castShadow = true; return k; }

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
  const panzerGeo = new T.SphereGeometry(.3, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), randGeo = new T.TorusGeometry(.3, .045, 10, 32);
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
  const muenzGeo = new T.CylinderGeometry(.36, .36, .1, 36);
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
    g.add(kronen); fernMat = [huegelMat, huegel2, kronenMat]; return g;
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
  })].map(t => std({ map: t, roughness: .95, bumpMap: t, bumpScale: 3 }))[0];
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
  const pilzKappe = leinwand(128, 64, (g, w, h) => {
    g.fillStyle = "#d7262b"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#fff"; for (let i = 0; i < 14; i++) { g.beginPath(); g.arc(Math.random() * w, Math.random() * h * .8, zufall(3, 6), 0, 7); g.fill(); }
  });
  const M = {
    scheune: std({ map: holzRot, roughness: .85 }), dachGrau: mStd("#5b5f66", .7), weiss: mStd("#f4f4f2", .7),
    heu: std({ map: heu, roughness: 1 }), kuh: std({ map: kuhFell, roughness: .8 }), rosa: mStd("#f2a7a8", .7), schwarz: mStd("#222", .6),
    sonnenblume: mStd("#ffcc1f", .7), blumenMitte: mStd("#5a3a1a", .9), stiel: mStd("#4a8a2e", .9),
    wasser: std({ color: "#3d8fc4", roughness: .05, metalness: .25, transparent: true, opacity: .9 }),
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
    teil(new T.BoxGeometry(b, h, t), M.scheune, g, 0, h / 2, 0);
    const dreieck = new T.Shape([new T.Vector2(-b / 2 - .3, 0), new T.Vector2(b / 2 + .3, 0), new T.Vector2(0, 2.2)]);
    teil(new T.ExtrudeGeometry(dreieck, { depth: t + .4, bevelEnabled: false }), M.dachGrau, g, 0, h, -(t + .4) / 2);
    return g;
  }
  function heuballen() {
    const g = new T.Group();
    for (let i = 0; i < 1 + Math.floor(Math.random() * 3); i++) {
      const k = teil(new T.CylinderGeometry(.75, .75, 1.2, 20), M.heu, g, i * 1.6 - 1.6, .75, zufall(-.5, .5)); k.rotation.z = Math.PI / 2;
    }
    return g;
  }
  function kuh() {
    const g = new T.Group();
    const k = teil(new T.BoxGeometry(.8, .75, 1.6), M.kuh, g, 0, 1.05, 0); k.geometry.translate(0, 0, 0);
    const kopf = gelenk(g, 0, 1.3, -.95);
    teil(new T.BoxGeometry(.5, .5, .55), M.kuh, kopf);
    teil(new T.BoxGeometry(.42, .25, .2), M.rosa, kopf, 0, -.13, -.32);
    for (const s of [-1, 1]) {
      teil(new T.ConeGeometry(.05, .2, 8), M.weiss, kopf, s * .18, .32, .05);
      teil(kugel, M.schwarz, kopf, s * .16, .08, -.28).scale.setScalar(.04);
    }
    for (const [x, z] of [[-.28, -.6], [.28, -.6], [-.28, .6], [.28, .6]]) teil(new T.CylinderGeometry(.09, .08, .7, 8), M.kuh, g, x, .35, z);
    return bewege(g, (o, t) => { kopf.rotation.x = .25 + Math.sin(t * 1.3) * .25; });   // grast
  }
  function windrad() {
    const g = new T.Group();
    teil(new T.CylinderGeometry(.18, .35, 9, 12), M.windrad, g, 0, 4.5, 0);
    const nabe = gelenk(g, 0, 9, -.4);
    teil(kugel, M.windrad, nabe).scale.setScalar(.3);
    for (let i = 0; i < 3; i++) { const f = gelenk(nabe, 0, 0, 0); f.rotation.z = i * Math.PI * 2 / 3; teil(new T.BoxGeometry(.3, 3.6, .08), M.windrad, f, 0, 1.9, 0); }
    return bewege(g, (o, t) => { nabe.rotation.z = t * 1.4; });
  }
  function sonnenblumen() {
    const g = new T.Group(), n = 26;
    g.userData.abstand = 4;
    const kopf = new T.InstancedMesh(new T.CylinderGeometry(.28, .28, .08, 14), M.sonnenblume, n);
    const mitte = new T.InstancedMesh(new T.CylinderGeometry(.15, .15, .1, 12), M.blumenMitte, n);
    const stiel = new T.InstancedMesh(new T.CylinderGeometry(.03, .04, 1.6, 6), M.stiel, n);
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
    for (let x = -l / 2; x <= l / 2; x += 1.2) teil(new T.BoxGeometry(.12, 1.1, .12), M.weiss, g, x, .55, 0);
    for (const y of [.4, .85]) teil(new T.BoxGeometry(l, .1, .06), M.weiss, g, 0, y, 0);
    return g;
  }
  function see() {
    const g = new T.Group(), r = zufall(5, 7);
    g.userData.abstand = r + 2;
    const w = new T.Mesh(new T.CircleGeometry(r, 40), M.wasser); w.rotation.x = -Math.PI / 2; w.position.y = .03; w.receiveShadow = true; g.add(w);
    const ufer = new T.Mesh(new T.RingGeometry(r, r + .6, 40), mStd("#d9c89a", 1)); ufer.rotation.x = -Math.PI / 2; ufer.position.y = .025; g.add(ufer);
    // Boot schaukelt auf dem Wasser
    const boot = gelenk(g, zufall(-2, 2), .1, zufall(-3, 3));
    const rumpf = teil(new T.CylinderGeometry(.6, .6, 2.4, 16, 1, false, 0, Math.PI), M.boot, boot, 0, .25, 0); rumpf.rotation.set(Math.PI / 2, 0, Math.PI);
    teil(new T.CylinderGeometry(.04, .04, 2.2, 6), M.weiss, boot, 0, 1.3, 0);
    const segel = new T.Mesh(new T.ShapeGeometry(new T.Shape([new T.Vector2(0, 0), new T.Vector2(0, 1.9), new T.Vector2(1.1, 0)])), M.segel);
    segel.position.set(.03, .4, 0); segel.rotation.y = Math.PI / 2; boot.add(segel);
    bewege(boot, (o, t) => { o.rotation.z = Math.sin(t * 1.5) * .12; o.rotation.x = Math.sin(t * 1.1) * .06; o.position.y = .1 + Math.sin(t * 2) * .05; });
    // Schilf am Rand
    const n = 40, schilf = new T.InstancedMesh(new T.CylinderGeometry(.02, .03, 1.4, 5), M.schilf, n), m = new T.Matrix4(), q = new T.Quaternion();
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
    teil(new T.BoxGeometry(1.4, .12, 6), M.steg, g, 0, .35, 0);
    for (const [x, z] of [[-.6, -2.8], [.6, -2.8], [-.6, 2.8], [.6, 2.8]]) teil(new T.CylinderGeometry(.08, .08, .8, 8), M.steg, g, x, .1, z);
    return g;
  }
  function herbstbaum() {
    const g = new T.Group(), h = zufall(2.4, 3.4);
    teil(new T.CylinderGeometry(.14, .26, h, 10), mat.rinde, g, 0, h / 2, 0);
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
      teil(new T.CylinderGeometry(.12 * s, .16 * s, .5 * s, 10), M.pilzStiel, g, x, .25 * s, z);
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
      teil(new T.CylinderGeometry(.04, .05, .2, 6), M.kuerbisStiel, g, x, s * 1.5, z);
    }
    return g;
  }
  function tanne() {
    const g = new T.Group(), h = zufall(3, 4.5);
    teil(new T.CylinderGeometry(.15, .2, 1, 8), mat.rinde, g, 0, .5, 0);
    for (let i = 0; i < 3; i++) {
      const r = (1.5 - i * .38) * h / 4, y = 1 + i * h * .22;
      teil(new T.ConeGeometry(r, h * .4, 12), M.tanne, g, 0, y + h * .2, 0);
      teil(new T.ConeGeometry(r * .55, h * .14, 12), M.schneeKappe, g, 0, y + h * .35, 0);
    }
    return g;
  }
  function schneemann() {
    const g = new T.Group();
    teil(kugel, M.schneeKappe, g, 0, .55, 0).scale.setScalar(.6);
    teil(kugel, M.schneeKappe, g, 0, 1.35, 0).scale.setScalar(.42);
    const kopf = gelenk(g, 0, 1.98, 0);
    teil(kugel, M.schneeKappe, kopf).scale.setScalar(.3);
    teil(new T.ConeGeometry(.05, .3, 8), M.karotte, kopf, 0, 0, -.38).rotation.x = -Math.PI / 2;
    for (const s of [-1, 1]) teil(kugel, M.schwarz, kopf, s * .1, .08, -.26).scale.setScalar(.035);
    teil(new T.CylinderGeometry(.2, .2, .32, 16), M.hut, kopf, 0, .36, 0);
    teil(new T.CylinderGeometry(.32, .32, .04, 16), M.hut, kopf, 0, .2, 0);
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
    teil(new T.BoxGeometry(.3, .2, .3), mat.holz, g, 0, .1, 0);
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
  const zoneFuer = (nr) => Math.floor(nr / 3) % ZONEN.length;
  const dekoFuer = (z) => wahl(ZONEN[z].deko)();

  // Hecken je Welt: im Herbst bunt, im Winter mit Schnee auf der Krone
  const heckeHerbst = std({ map: hecke, color: "#ffc27a", roughness: 1, bumpMap: hecke, bumpScale: 4 });
  function heckeFuer(laenge, z) {
    const g = heckenStueck(laenge), art = ZONEN[z].hecke;
    if (art === "herbst") g.children.forEach(k => { k.material = heckeHerbst; });
    if (art === "schnee") g.children[1].material = M.schneeKappe;
    return g;
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
    bodenA.position.y = -.03; bodenB.position.y = -.02;
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

  return { zonen: ZONEN, zoneFuer, dekoFuer, heckeFuer, blumenFuer, bodenFlaeche, bodenFolgen, verbinden, zoneWechsel, zoneSchritt,
    animieren, wetterSchritt, voegelSchritt, luft, mat, geo, giraffeBauen, anjaBauen, boden, heckenStueck, blumen, ferne, sonnenScheibe, funke, staub, kante, dekoNeu, hindernis, stern, panzer, booster, blase, himmel, wolken, gras };
}
