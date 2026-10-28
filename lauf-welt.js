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
  function heckenStueck(laenge, hoehe = 1.75) {
    const geom = uvSkala(new T.BoxGeometry(.8, hoehe, laenge, 1, 1, 1), laenge / 1.3, hoehe / 1.3);
    const k = new T.Mesh(geom, mat.hecke); k.castShadow = true; k.receiveShadow = true; return k;
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

  return { mat, geo, giraffeBauen, anjaBauen, boden, heckenStueck, kante, dekoNeu, hindernis, stern, panzer, booster, blase, himmel, wolken, gras };
}
