// Level 2 von „Fröbelinchen rennt“: die Luftwelt. Hier stehen die Bausteine (Flugzeuge, Wolkenmeer, Inseln,
// Ringe, Heißluftballons, Gewitterwolken, Vogelschwärme). Geflogen wird entlang -z, die Spiellogik steht in lauf.js.
export function flugWelt(T, W) {
  const zufall = (a, b) => a + Math.random() * (b - a);
  const wahl = (l) => l[Math.floor(Math.random() * l.length)];
  const std = (o) => new T.MeshStandardMaterial(o);
  const leinwand = (w, h, malen, wdh = false) => {
    const c = document.createElement("canvas"); c.width = w; c.height = h; malen(c.getContext("2d"), w, h);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8;
    if (wdh) t.wrapS = t.wrapT = T.RepeatWrapping;
    return t;
  };
  const kugel = new T.SphereGeometry(1, 24, 16), ringGeo = new T.TorusGeometry(1.7, .16, 12, 40);
  kugel.userData.geteilt = ringGeo.userData.geteilt = true;   // mehrfach benutzt: beim Aufräumen nicht wegwerfen
  const teil = (geom, m, eltern, x = 0, y = 0, z = 0) => { const k = new T.Mesh(geom, m); k.position.set(x, y, z); k.castShadow = true; eltern.add(k); return k; };
  const gelenk = (eltern, x, y, z) => { const g = new T.Group(); g.position.set(x, y, z); eltern.add(g); return g; };

  const M = {
    rumpf: std({ color: "#e53935", roughness: .35, metalness: .2 }), rumpfAnja: std({ color: "#f48fb1", roughness: .35, metalness: .2 }),
    fluegel: std({ color: "#fdd835", roughness: .4 }), fluegelAnja: std({ color: "#ffffff", roughness: .4 }),
    dunkel: std({ color: "#2b2b2b", roughness: .5 }), glas: std({ color: "#9fd3f2", roughness: .05, metalness: .3, transparent: true, opacity: .6 }),
    bootGelb: std({ color: "#ffc61a", roughness: .35, metalness: .1 }), pylone: std({ color: "#ff6a13", roughness: .45, emissive: "#ff4a00", emissiveIntensity: .15 }),
    weiss: std({ color: "#f6f6f2", roughness: .5 }), bojeRot: std({ color: "#e53935", roughness: .4 }),
    ring: std({ color: "#ffcc33", roughness: .25, metalness: .6, emissive: "#ffb000", emissiveIntensity: 1.1 }),
    korb: std({ color: "#9c6b3a", roughness: .9 }), seil: new T.LineBasicMaterial({ color: "#5a4632" }),
    gewitter: std({ color: "#8a93a3", roughness: 1 }), blitz: new T.MeshBasicMaterial({ color: "#fff6a8" }),
    fels: std({ color: "#8a7a66", roughness: 1 }), gras: std({ color: "#7cc04f", roughness: 1 }), vogel: new T.MeshBasicMaterial({ color: "#2d3340", side: T.DoubleSide }),
  };
  // Ballonhülle: farbige Bahnen, ein Zierband mit Sternen und feine Nähte
  const ballonBild = (farben, band) => leinwand(512, 256, (g, w, h) => {
    const n = farben.length * (farben.length === 3 ? 4 : 6), b = w / n;
    for (let i = 0; i < n; i++) { g.fillStyle = farben[i % farben.length]; g.fillRect(i * b, 0, b + 1, h); }
    g.fillStyle = band; g.fillRect(0, h * .42, w, h * .16);
    g.fillStyle = "rgba(255,255,255,.9)"; g.fillRect(0, h * .4, w, 4); g.fillRect(0, h * .58, w, 4);
    for (let i = 0; i < n; i += 3) {
      const x = (i + 1) * b, y = h * .5, r = h * .065; g.beginPath();
      for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, q = k % 2 ? r * .42 : r; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
      g.closePath(); g.fill();
    }
    g.fillStyle = "rgba(0,0,0,.16)"; for (let i = 0; i < n; i++) g.fillRect(i * b - 1, 0, 2, h);
    g.fillStyle = "rgba(0,0,0,.22)"; g.fillRect(0, 0, w, h * .05);
  });
  const BALLON = [[["#e53935", "#fdd835"], "#1e63d6"], [["#1e88e5", "#ffffff"], "#e53935"], [["#8e24aa", "#ff8a3d", "#43a047"], "#fdd835"], [["#00acc1", "#ffeb3b"], "#e91e63"], [["#f06292", "#ffffff", "#ba68c8"], "#3949ab"], [["#fb8c00", "#d84315"], "#fff3c4"]]
    .map(([f, b]) => std({ map: ballonBild(f, b), roughness: .55 }));
  const wolkenBild = leinwand(512, 512, (g, w, h) => {
    g.fillStyle = "#c7d9ec"; g.fillRect(0, 0, w, h);
    // jede Quellwolke mit einem bläulichen Schatten darunter, so wirkt das Wolkenmeer bauschig
    const puff = (x, y, r, innen) => {
      for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) {   // an allen Rändern wiederholt, damit die Kacheln nahtlos sind
        const v = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r); v.addColorStop(0, innen); v.addColorStop(1, innen.replace(/[\d.]+\)$/, "0)"));
        g.fillStyle = v; g.beginPath(); g.arc(x + dx, y + dy, r, 0, 7); g.fill();
      }
    };
    for (let i = 0; i < 240; i++) {
      const x = Math.random() * w, y = Math.random() * h, r = zufall(18, 60);
      puff(x + r * .25, y + r * .3, r * 1.05, "rgba(140,165,200,.35)");
      puff(x, y, r, "rgba(255,255,255,.97)");
    }
  }, true);
  wolkenBild.repeat.set(12, 12);

  // Spielzeug-Flugzeug; „sitz“ ist der Platz für Fröbelinchen bzw. Anja. Die Lackierungen werden nur einmal gemalt.
  const FARBEN = [
    { rumpf: "#e53935", bauch: "#f7f1e3", streifen: "#fdd835", fluegel: "#fdd835", akzent: "#e53935", linie: "rgba(70,10,10,.42)", fLinie: "rgba(120,80,0,.42)", stern: "#fdd835", sternF: "#e53935" },
    { rumpf: "#f48fb1", bauch: "#ffffff", streifen: "#ffffff", fluegel: "#ffffff", akzent: "#f48fb1", linie: "rgba(120,30,70,.38)", fLinie: "rgba(150,90,120,.4)", stern: "#ec5f94", sternF: "#ec5f94" },
  ];
  const sternMalen = (g, x, y, r, farbe) => {
    g.fillStyle = "#fff"; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    g.fillStyle = farbe; g.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * .4 : r * .86; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
    g.closePath(); g.fill();
  };
  const fliegerLack = [null, null];
  const lackFuer = (nr) => fliegerLack[nr] || (fliegerLack[nr] = (() => {
    const f = FARBEN[nr];
    // Rumpf: oben im Bild die Nase, unten das Heck; die Bildränder sind die Oberseite, die Bildmitte die Unterseite
    const rumpf = leinwand(1024, 512, (g, w, h) => {
      g.fillStyle = f.rumpf; g.fillRect(0, 0, w, h);
      g.fillStyle = f.bauch; g.fillRect(w * .36, 0, w * .28, h);
      g.fillStyle = f.streifen; for (const x of [.3, .66]) g.fillRect(w * x, 0, w * .04, h);
      for (let i = 0; i < 4; i++) for (let k = 0; k < 16; k++) if ((i + k) % 2 === 0) {    // Schachbrett-Band am Heck
        g.fillStyle = f.streifen; g.fillRect(k * w / 16, h * .8 + i * h * .03, w / 16, h * .03);
      }
      g.strokeStyle = f.linie; g.lineWidth = 2;
      for (const y of [.12, .25, .38, .52, .66, .77]) { g.beginPath(); g.moveTo(0, h * y); g.lineTo(w, h * y); g.stroke(); }
      for (const x of [.125, .375, .625, .875]) { g.beginPath(); g.moveTo(w * x, h * .12); g.lineTo(w * x, h * .77); g.stroke(); }
      g.fillStyle = f.linie;
      for (const y of [.12, .25, .38, .52, .66, .77]) for (let x = 0; x < w; x += 16) { g.beginPath(); g.arc(x + 4, h * y + 7, 1.6, 0, 7); g.fill(); }
      for (const x of [.25, .75]) sternMalen(g, w * x, h * .62, 44, f.stern);
    });
    // Flügel: Rippen, Querruder, Landeklappen, farbige Spitzen und Sterne
    const fluegel = leinwand(1024, 320, (g, w, h) => {
      g.fillStyle = f.fluegel; g.fillRect(0, 0, w, h);
      g.strokeStyle = f.fLinie; g.lineWidth = 2;
      for (let x = 32; x < w; x += 44) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
      for (const y of [.22, .62]) { g.beginPath(); g.moveTo(0, h * y); g.lineTo(w, h * y); g.stroke(); }
      g.fillStyle = f.fLinie;
      for (const y of [.22, .62]) for (let x = 6; x < w; x += 12) { g.beginPath(); g.arc(x, h * y + 6, 1.4, 0, 7); g.fill(); }
      g.lineWidth = 5;
      for (const [a, b] of [[.08, .3], [.7, .92]]) g.strokeRect(w * a, h * .14, w * (b - a), h * .24);    // Querruder an der Hinterkante
      for (const [a, b] of [[.31, .44], [.56, .69]]) g.strokeRect(w * a, h * .14, w * (b - a), h * .24);  // Landeklappen
      g.fillStyle = f.akzent; g.fillRect(0, 0, w * .075, h); g.fillRect(w * .925, 0, w * .075, h);
      g.fillStyle = "#fff"; g.fillRect(w * .075, 0, w * .012, h); g.fillRect(w * .913, 0, w * .012, h);
      g.fillStyle = "rgba(40,40,45,.72)"; g.fillRect(w * .44, h * .3, w * .12, h * .5);                   // Trittfläche am Rumpf
      for (const x of [.205, .795]) sternMalen(g, w * x, h * .62, 44, f.sternF);
    });
    fluegel.repeat.set(1 / 5.2, 1 / 1.6); fluegel.offset.set(.5, .625); fluegel.wrapS = fluegel.wrapT = T.ClampToEdgeWrapping;
    // Seitenleitwerk mit Ruder und Streifen, Höhenleitwerk mit Ruderkante
    const seite = leinwand(256, 256, (g, w, h) => {
      g.fillStyle = f.rumpf; g.fillRect(0, 0, w, h);
      g.fillStyle = f.streifen; for (let y = 0; y < h; y += 44) g.fillRect(w * .62, y, w * .38, 22);
      g.strokeStyle = f.linie; g.lineWidth = 4; g.beginPath(); g.moveTo(w * .62, 0); g.lineTo(w * .62, h); g.stroke();
      sternMalen(g, w * .36, h * .62, 28, f.stern);
    });
    seite.repeat.set(1 / 1.1, 1 / 1.1); seite.offset.set(-1.05 / 1.1, -.1 / 1.1); seite.wrapS = seite.wrapT = T.ClampToEdgeWrapping;
    const hoehe = leinwand(512, 128, (g, w, h) => {
      g.fillStyle = f.fluegel; g.fillRect(0, 0, w, h);
      g.fillStyle = f.akzent; g.fillRect(0, 0, w * .1, h); g.fillRect(w * .9, 0, w * .1, h);
      g.strokeStyle = f.fLinie; g.lineWidth = 3; g.beginPath(); g.moveTo(0, h * .42); g.lineTo(w, h * .42); g.stroke();
      g.lineWidth = 2; for (let x = 40; x < w; x += 44) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h * .42); g.stroke(); }
    });
    hoehe.repeat.set(1 / 2.1, 1 / .8); hoehe.offset.set(.5, -1.15 / .8); hoehe.wrapS = hoehe.wrapT = T.ClampToEdgeWrapping;
    const lack = (map) => std({ map, roughness: .38, metalness: .15 });
    return { rumpf: lack(rumpf), fluegel: lack(fluegel), seite: lack(seite), hoehe: lack(hoehe), haube: std({ color: f.fluegel, roughness: .3, metalness: .3 }), spitze: std({ color: f.akzent, roughness: .3, metalness: .3 }) };
  })());
  const F_M = {
    metall: std({ color: "#7d848c", roughness: .35, metalness: .8 }), gummi: std({ color: "#1d1d20", roughness: .85 }), innen: std({ color: "#33302c", roughness: .9 }),
    blatt: std({ color: "#26272b", roughness: .45, metalness: .3 }), gelb: std({ color: "#ffd21f", roughness: .4 }),
    rot: std({ color: "#ff3b30", emissive: "#ff1a10", emissiveIntensity: 1.4 }), gruen: std({ color: "#3dff7a", emissive: "#14e05a", emissiveIntensity: 1.4 }),
  };
  function fliegerFormen() {
    // Rumpf als Drehkörper: von der Heckspitze bis zur Nase
    const profil = [[.03, 2.02], [.13, 1.85], [.22, 1.4], [.38, .85], [.52, .25], [.585, -.4], [.57, -1], [.5, -1.5], [.44, -1.72]]
      .map(([r, z]) => new T.Vector2(r, -z));
    const rumpf = new T.LatheGeometry(new T.SplineCurve(profil).getPoints(36), 32).rotateX(-Math.PI / 2);
    const flach = (s, tiefe, schraege) => new T.ExtrudeGeometry(s, { depth: tiefe, bevelEnabled: true, bevelThickness: schraege, bevelSize: schraege, bevelSegments: 2, curveSegments: 10 });
    const w = new T.Shape();     // Flügel, von oben; Vorderkante bei -z
    w.moveTo(-2.25, -.5); w.quadraticCurveTo(-2.58, -.42, -2.56, -.2); w.lineTo(-2.5, .08); w.quadraticCurveTo(-2.47, .22, -2.3, .22);
    w.lineTo(-.6, .46); w.lineTo(.6, .46); w.lineTo(2.3, .22); w.quadraticCurveTo(2.47, .22, 2.5, .08); w.lineTo(2.56, -.2); w.quadraticCurveTo(2.58, -.42, 2.25, -.5);
    w.lineTo(.6, -.82); w.lineTo(-.6, -.82); w.closePath();
    const fluegel = flach(w, .05, .035).rotateX(Math.PI / 2).translate(0, .03, 0);
    const h = new T.Shape();     // Höhenleitwerk
    h.moveTo(-.9, 1.34); h.quadraticCurveTo(-1.02, 1.36, -1.02, 1.5); h.quadraticCurveTo(-1.02, 1.76, -.8, 1.8); h.lineTo(0, 1.92); h.lineTo(.8, 1.8); h.quadraticCurveTo(1.02, 1.76, 1.02, 1.5); h.quadraticCurveTo(1.02, 1.36, .9, 1.34); h.lineTo(.2, 1.18); h.lineTo(-.2, 1.18); h.closePath();
    const hoehe = flach(h, .03, .02).rotateX(Math.PI / 2).translate(0, .02, 0);
    const s = new T.Shape();     // Seitenleitwerk (x = Länge nach hinten, y = Höhe)
    s.moveTo(1.08, .1); s.lineTo(1.5, .55); s.quadraticCurveTo(1.68, .98, 1.86, 1.02); s.quadraticCurveTo(2.08, 1.02, 2.1, .84); s.lineTo(2.08, .1); s.closePath();
    const seite = flach(s, .04, .025).translate(0, 0, -.02).rotateY(-Math.PI / 2);
    const blatt = new T.Shape(); blatt.moveTo(-.05, .08); blatt.quadraticCurveTo(-.13, .35, -.1, .62); blatt.lineTo(.1, .62); blatt.quadraticCurveTo(.13, .35, .05, .08); blatt.closePath();
    const spinner = new T.LatheGeometry(new T.SplineCurve([[.27, 0], [.25, .13], [.15, .3], [.015, .42]].map(([r, y]) => new T.Vector2(r, y))).getPoints(10), 18).rotateX(-Math.PI / 2);
    return {
      rumpf, fluegel, hoehe, seite, spinner,
      blatt: new T.ExtrudeGeometry(blatt, { depth: .025, bevelEnabled: false, curveSegments: 6 }),
      spitze: new T.BoxGeometry(.2, .09, .03),
      haube: new T.CylinderGeometry(.54, .6, .34, 32, 1, true).rotateX(-Math.PI / 2),
      deckel: new T.CircleGeometry(.54, 32).rotateY(Math.PI),
      lamellen: new T.TorusGeometry(.56, .03, 8, 32),
      auspuff: new T.CylinderGeometry(.04, .05, .24, 8).rotateZ(Math.PI / 2),
      scheibe: new T.SphereGeometry(.44, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      bogen: new T.TorusGeometry(.44, .022, 6, 22, Math.PI),
      wanne: new T.CylinderGeometry(.31, .31, .4, 28, 1, true),
      rand: new T.TorusGeometry(.31, .05, 8, 28).rotateX(Math.PI / 2),
      boden: new T.CircleGeometry(.31, 24).rotateX(-Math.PI / 2),
      buckel: new T.SphereGeometry(.26, 16, 10),
      mast: new T.CylinderGeometry(.012, .022, .4, 6),
      bein: new T.CylinderGeometry(.04, .055, .5, 8),
      schuh: new T.SphereGeometry(.2, 16, 12),
      rad: new T.CylinderGeometry(.17, .17, .09, 18).rotateZ(Math.PI / 2),
      lampe: new T.SphereGeometry(.05, 10, 8),
    };
  }
  let fliegerGeo = null;
  // Weihnachtszeit: statt Flugzeug ein fliegender Prunkschlitten mit vier Rentieren und einem Leitrentier mit leuchtend roter Nase
  let RF = null;
  function rentierFliegt(roteNase) {
    if (!RF) {
      RF = { fell: std({ color: "#8a5a34", roughness: .85 }), hell: std({ color: "#ecd8b8", roughness: .9 }), horn: std({ color: "#d8bf8c", roughness: .7 }),
        dunkel: std({ color: "#2a1c12", roughness: .6 }), geschirr: std({ color: "#c81e28", roughness: .5 }), gold: std({ color: "#e8b830", roughness: .25, metalness: .7 }),
        nase: std({ color: "#ff2a2a", emissive: "#ff1a1a", emissiveIntensity: 2.2 }), kugel: new T.SphereGeometry(1, 16, 12), bein: new T.CylinderGeometry(.045, .035, .5, 7).translate(0, -.25, 0),
        horn1: new T.CylinderGeometry(.018, .024, .34, 5).translate(0, .17, 0), horn2: new T.CylinderGeometry(.013, .016, .15, 5).translate(0, .075, 0), gurt: new T.TorusGeometry(.27, .035, 6, 20) };
      for (const k of ["kugel", "bein", "horn1", "horn2", "gurt"]) RF[k].userData.geteilt = true;
    }
    const g = new T.Group(), beine = [];
    const k = (geo, m, eltern, x, y, z) => { const t = teil(geo, m, eltern, x, y, z); t.castShadow = false; return t; };
    teil(RF.kugel, RF.fell, g, 0, 0, 0).scale.set(.24, .23, .5);
    k(RF.kugel, RF.hell, g, 0, -.04, -.36).scale.set(.17, .18, .16);
    k(RF.gurt, RF.geschirr, g, 0, 0, -.18).scale.set(1, .92, 1);
    k(RF.kugel, RF.gold, g, 0, -.24, -.18).scale.setScalar(.05);
    const hals = new T.Group(); hals.position.set(0, .12, -.42); hals.rotation.x = -.6; g.add(hals);
    k(new T.CylinderGeometry(.09, .12, .36, 8), RF.fell, hals, 0, .16, 0);
    const kopf = k(RF.kugel, RF.fell, hals, 0, .36, -.08); kopf.scale.set(.12, .12, .2);
    k(RF.kugel, roteNase ? RF.nase : RF.dunkel, hals, 0, .33, -.27).scale.setScalar(roteNase ? .085 : .035);
    for (const s of [-1, 1]) {
      k(RF.kugel, RF.dunkel, hals, s * .07, .41, -.16).scale.setScalar(.02);
      const h = new T.Group(); h.position.set(s * .06, .45, -.02); h.rotation.set(.35, 0, s * -.45); hals.add(h);
      k(RF.horn1, RF.horn, h, 0, 0, 0);
      for (const [y, w] of [[.12, 1], [.22, .8]]) { const z = k(RF.horn2, RF.horn, h, 0, y, 0); z.rotation.set(-.4, 0, s * -w); }
    }
    for (const [x, z, vorn] of [[-.13, -.3, 1], [.13, -.3, 1], [-.13, .32, 0], [.13, .32, 0]]) {
      const b = new T.Group(); b.position.set(x, -.12, z); g.add(b); k(RF.bein, RF.fell, b, 0, 0, 0); k(RF.kugel, RF.dunkel, b, 0, -.5, 0).scale.setScalar(.045);
      beine.push({ b, vorn, ph: Math.random() * .5 });
    }
    k(RF.kugel, RF.hell, g, 0, .1, .5).scale.set(.06, .07, .05);
    return { g, beine, hals };
  }
  function schlittenFliegt(anja) {
    // Der Schlitten hängt in einem eigenen Gelenk (pendelt und wippt), das Gespann zieht in Kurven voraus und die Zügel hängen locker durch
    const s = schlitten(anja), koerper = new T.Group(), team = new T.Group();
    for (const k of [...s.gruppe.children]) koerper.add(k);
    s.gruppe.add(koerper, team);
    const tiere = [];
    for (const [x, y, z, nase, reihe] of [[-.45, .95, -2.8, false, 1], [.45, .95, -2.8, false, 1], [-.45, 1.35, -4.1, false, 2], [.45, 1.35, -4.1, false, 2], [0, 1.8, -5.4, true, 3]]) {
      const r = rentierFliegt(nase); r.g.position.set(x, y, z); r.g.rotation.x = .12; r.g.scale.setScalar(1.15); team.add(r.g);
      Object.assign(r, { bx: x, by: y, bz: z, reihe, x, y }); tiere.push(r);
    }
    // goldene Zügel: je Rentier zwei Stücke über einen durchhängenden Mittelpunkt
    const zuegel = new Float32Array(tiere.length * 4 * 3), zGeo = new T.BufferGeometry();
    zGeo.setAttribute("position", new T.BufferAttribute(zuegel, 3).setUsage(T.DynamicDrawUsage));
    const leinen = new T.LineSegments(zGeo, new T.LineBasicMaterial({ color: "#e8b830" })); leinen.frustumCulled = false; team.add(leinen);
    let quer = 0, hoch = 0;
    const animiere = (t, dt = .016, neig = 0, nick = 0) => {
      const k = Math.min(1, dt * 3); quer += (neig - quer) * k; hoch += (nick - hoch) * k;
      koerper.rotation.z = Math.sin(t * 2.1) * .05 - quer * .3;             // pendelt im Fahrtwind und schwingt in der Kurve nach
      koerper.rotation.x = Math.sin(t * 1.6 + 1) * .035 + hoch * .25;
      koerper.rotation.y = quer * .18;
      koerper.position.y = Math.sin(t * 3.2) * .06;
      const kufeY = .78 + koerper.position.y;
      tiere.forEach((r, i) => {
        const f = Math.min(1, dt * (2 + r.reihe * 1.2));                  // das Leitrentier reagiert zuerst und am weitesten
        r.x += (r.bx - quer * r.reihe * 1.1 - r.x) * f;
        r.y += (r.by + hoch * r.reihe * .9 - r.y) * f;
        r.g.position.set(r.x, r.y + Math.sin(t * 7 + i) * .08, r.bz);
        r.g.rotation.set(.12 - hoch * .45, quer * .6, quer * .55);
        r.hals.rotation.x = -.6 + Math.sin(t * 9 + i * .7) * .16;           // nickt im Galopp
        for (const l of r.beine) l.b.rotation.x = (l.vorn ? -.7 : .7) + Math.sin(t * 9 + i + l.ph + (l.vorn ? 0 : Math.PI)) * .55;
        const ax = r.bx * .4, ay = kufeY, az = -1.45, ex = r.x, ey = r.g.position.y + .05, ez = r.bz + .4;
        const mx = (ax + ex) / 2, my = (ay + ey) / 2 - .28 + Math.sin(t * 5 + i) * .05, mz = (az + ez) / 2, o = i * 12;
        zuegel.set([ax, ay, az, mx, my, mz, mx, my, mz, ex, ey, ez], o);
      });
      zGeo.attributes.position.needsUpdate = true;
    };
    return { gruppe: s.gruppe, propeller: s.propeller, sitz: s.sitz, animiere, schlitten: true };
  }
  function flieger(anja) {
    if (W.weihnachten) return schlittenFliegt(anja);
    const g = new T.Group(), L = lackFuer(anja ? 1 : 0), G = fliegerGeo || (fliegerGeo = fliegerFormen());
    for (const k in G) G[k].userData.geteilt = true;
    const klein = (geom, m, eltern, x, y, z) => { const k = teil(geom, m, eltern, x, y, z); k.castShadow = false; return k; };
    teil(G.rumpf, L.rumpf, g);
    // Motor: Haube, Kühlrippen, Auspuffrohre
    klein(G.haube, L.haube, g, 0, 0, -1.52);
    klein(G.deckel, F_M.innen, g, 0, 0, -1.68);
    klein(G.lamellen, F_M.metall, g, 0, 0, -1.34).scale.setScalar(1.06); klein(G.lamellen, F_M.metall, g, 0, 0, -1.7).scale.setScalar(.97);
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const a = klein(G.auspuff, F_M.metall, g, s * .55, -.1, -1.2 + i * .17); a.rotation.y = s * .25; }
    // Flügel und Leitwerk
    teil(G.fluegel, L.fluegel, g, 0, -.15, 0);
    teil(G.hoehe, L.hoehe, g, 0, .1, 0);
    teil(G.seite, L.seite, g, 0, .1, 0);
    // Positionslichter an den Flügelspitzen und am Ruder
    klein(G.lampe, F_M.rot, g, -2.6, -.14, -.2); klein(G.lampe, F_M.gruen, g, 2.6, -.14, -.2); klein(G.lampe, F_M.rot, g, 0, .6, 2.2);
    // Nase und Propeller: Spinner und Blätter drehen gemeinsam
    const propeller = gelenk(g, 0, 0, -1.72);
    klein(G.spinner, L.spitze, propeller, 0, 0, 0);
    for (let i = 0; i < 4; i++) {
      const arm = gelenk(propeller, 0, 0, -.1); arm.rotation.z = i * Math.PI / 2;
      klein(G.blatt, F_M.blatt, arm, 0, 0, 0); klein(G.spitze, F_M.gelb, arm, 0, .6, .012);
    }
    // Cockpit: Wanne mit Rand, dunkler Boden, Windschutzscheibe mit Rahmen, Kopfstütze, Antenne
    klein(G.wanne, L.haube, g, 0, .3, .36).scale.z = 1.4;
    klein(G.boden, F_M.innen, g, 0, .505, .36).scale.z = 1.4;
    klein(G.rand, L.haube, g, 0, .5, .36).scale.z = 1.4;
    const scheibe = klein(G.scheibe, M.glas, g, 0, .42, -.5); scheibe.scale.set(.88, 1, .62);
    klein(G.bogen, F_M.gummi, g, 0, .42, -.5).scale.set(.88, 1, 1);
    const steg = klein(G.bogen, F_M.gummi, g, 0, .42, -.5); steg.rotation.y = Math.PI / 2; steg.scale.set(.62, 1, 1);
    const buckel = klein(G.buckel, L.haube, g, 0, .42, 1.12); buckel.scale.set(.75, .7, 1.5);
    klein(G.mast, F_M.metall, g, 0, .78, 1.12);
    // Festes Fahrwerk mit verkleideten Rädern, Spornrad hinten
    for (const s of [-1, 1]) {
      const bein = klein(G.bein, F_M.metall, g, s * .95, -.42, -.4); bein.rotation.z = s * .12;
      const schuh = klein(G.schuh, L.haube, g, s * .98, -.68, -.4); schuh.scale.set(.5, .7, 1.4);
      klein(G.rad, F_M.gummi, g, s * .98, -.76, -.4);
    }
    klein(G.rad, F_M.gummi, g, 0, -.24, 1.7).scale.setScalar(.45);
    const sitz = gelenk(g, 0, .1, .1);
    return { gruppe: g, propeller, sitz };
  }

  // Im Flugzeug schauen nur Hals und Kopf aus dem Cockpit, der Rest der Figur wird solange ausgeblendet.
  // Die Größe richtet sich nach dem Kopf; nur lange Hälse wie bei der Giraffe zeigen den ganzen Hals, sonst schaut nur der Kopf über den Rand.
  const halsBox = new T.Box3(), halsMass = new T.Vector3(), halsPunkt = new T.Vector3(), kopfPunkt = new T.Vector3();
  const COCKPIT = { luft: [.4, .26], wasser: [.31, .05], schlitten: [.5, .05] }, KOPF_BREITE = .46, KOPF_MAX = 1.2, KOPF_UEBER_RAND = .27;
  function insCockpit(f, ort = "luft") {
    const [COCKPIT_Y, COCKPIT_Z] = COCKPIT[ort] || COCKPIT.luft;
    const koerper = f.koerper || f.k, hals = f.hals || f.zopf.parent, g = f.gruppe, person = f.mensch || !f.hals, eltern = g.parent;
    // Bei Personen gehört das Gesicht zum Körpermodell: Es bleibt sichtbar, der Rumpf steckt im Flugzeug.
    koerper.position.set(0, 0, 0); koerper.rotation.set(0, 0, 0);
    f.cockpitAus = (f.cockpitAus || []).concat(koerper.children.filter(c => c !== hals && c.visible && !(person && c.isMesh)));
    for (const c of f.cockpitAus) c.visible = false;
    if (eltern) eltern.remove(g);                // ausmessen ohne das Flugzeug, sonst zählen dessen Neigung und Größe mit
    g.position.set(0, 0, 0); g.rotation.set(0, 0, 0); g.scale.setScalar(1); g.updateMatrixWorld(true);
    halsBox.setFromObject(hals).getSize(halsMass);
    hals.getWorldPosition(halsPunkt); (f.kopf || hals).getWorldPosition(kopfPunkt);
    const langerHals = kopfPunkt.distanceTo(halsPunkt) > .6, skala = Math.min(langerHals ? 1 : KOPF_MAX, KOPF_BREITE / Math.max(halsMass.x, .01));
    g.scale.setScalar(skala);
    if (langerHals) g.position.set(0, COCKPIT_Y - .06 - halsBox.min.y * skala, COCKPIT_Z - (halsPunkt.z + kopfPunkt.z) / 2 * skala);
    else g.position.set(0, COCKPIT_Y + KOPF_UEBER_RAND - kopfPunkt.y * skala, COCKPIT_Z - kopfPunkt.z * skala);
    if (eltern) eltern.add(g);
  }
  function ausCockpit(f) {
    for (const c of f.cockpitAus || []) c.visible = true;
    f.cockpitAus = null;
  }

  let KR = null;
  function ring() {
    const g = new T.Group();
    if (!W.weihnachten) { teil(ringGeo, M.ring, g); return g; }
    if (!KR) {                                           // Weihnachten: grüner Kranz mit Lichterkette und roter Schleife
      KR = { tanne: std({ color: "#2c6b35", roughness: .85, emissive: "#0d3a14", emissiveIntensity: .25 }), licht: new T.MeshBasicMaterial({ color: "#ffe28a" }), rot: std({ color: "#d1202a", roughness: .5 }),
        geo: new T.TorusGeometry(1.7, .26, 10, 44), kugel: new T.SphereGeometry(1, 10, 8), schlaufe: new T.TorusGeometry(.28, .08, 8, 18), band: new T.BoxGeometry(.14, .7, .05) };
      for (const k of ["geo", "kugel", "schlaufe", "band"]) KR[k].userData.geteilt = true;
    }
    teil(KR.geo, KR.tanne, g);
    const n = 22, l = new T.InstancedMesh(KR.kugel, KR.licht, n), m = new T.Matrix4(), q = new T.Quaternion(), s = new T.Vector3(.08, .08, .08);
    for (let i = 0; i < n; i++) { const w = i / n * Math.PI * 2; m.compose(new T.Vector3(Math.cos(w) * 1.7, Math.sin(w) * 1.7, .24), q, s); l.setMatrixAt(i, m); }
    g.add(l);
    const beeren = new T.InstancedMesh(KR.kugel, KR.rot, 16);   // rote Beeren zwischen den Lichtern
    for (let i = 0; i < 16; i++) { const w = (i + .5) / 16 * Math.PI * 2, r = 1.7 + (i % 2 ? .14 : -.14); m.compose(new T.Vector3(Math.cos(w) * r, Math.sin(w) * r, .2), q, new T.Vector3(.1, .1, .1)); beeren.setMatrixAt(i, m); }
    g.add(beeren);
    for (const sx of [-1, 1]) { const sl = teil(KR.schlaufe, KR.rot, g, sx * .26, -1.75, .3); sl.scale.set(1, .7, 1); const b = teil(KR.band, KR.rot, g, sx * .12, -2.1, .28); b.rotation.z = sx * .25; }
    return g;
  }
  // Zerklüftete Formen: Punkte werden je nach Lage verschoben, die Flächen einzeln eingefärbt
  const zackig = (geom, staerke, phase, nurAussen = false) => {
    const p = geom.attributes.position, v = new T.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const n = Math.sin(v.x * 7.3 + v.y * 3.1 + phase) + Math.sin(v.z * 8.7 - v.y * 5.3 + phase * 2) + Math.sin((v.x + v.z) * 13 + v.y * 7 + phase * 3) * .6;
      const f = 1 + n * staerke; p.setXYZ(i, v.x * f, nurAussen ? v.y : v.y + n * staerke * .35, v.z * f);
    }
    return geom;
  };
  const facetten = (geom, farbe) => {
    const g = geom.toNonIndexed(), p = g.attributes.position, c = new Float32Array(p.count * 3), a = new T.Vector3(), b = new T.Vector3(), d = new T.Vector3(), mitte = new T.Vector3(), n = new T.Vector3(), col = new T.Color();
    for (let i = 0; i < p.count; i += 3) {
      a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); d.fromBufferAttribute(p, i + 2);
      mitte.copy(a).add(b).add(d).divideScalar(3); n.copy(b).sub(a).cross(d.clone().sub(a)).normalize();
      farbe(mitte, n, col);
      for (let k = 0; k < 3; k++) { c[(i + k) * 3] = col.r; c[(i + k) * 3 + 1] = col.g; c[(i + k) * 3 + 2] = col.b; }
    }
    g.setAttribute("color", new T.BufferAttribute(c, 3)); g.computeVertexNormals(); g.userData.geteilt = true;
    return g;
  };
  let ballonGeo = null;
  const ballonM = {
    flamme: std({ color: "#ffd27a", emissive: "#ff8a1f", emissiveIntensity: 2.4, transparent: true, opacity: .92 }), metall: std({ color: "#8b929a", roughness: .35, metalness: .75 }),
    leder: std({ color: "#6b3f1d", roughness: .75 }), sand: std({ color: "#c8a877", roughness: 1 }), rand: std({ color: "#2b2d33", roughness: .7, side: T.DoubleSide }),
    korb: std({ roughness: .95, map: leinwand(128, 128, (g, w, h) => {
      g.fillStyle = "#8a5a2c"; g.fillRect(0, 0, w, h);
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? "#b78347" : "#a06f39"; g.fillRect(x * 16 + 1, y * 16 + 1, 14, 14); g.fillStyle = "rgba(40,20,0,.35)"; g.fillRect(x * 16, y * 16 + 13, 16, 2); }
    }) }),
  };
  function ballonFormen() {
    const huelle = new T.LatheGeometry(new T.SplineCurve([[.32, -1.05], [.72, -.6], [1.36, .2], [1.82, 1.1], [1.92, 1.9], [1.7, 2.7], [1.1, 3.25], [.42, 3.45], [.03, 3.48]].map(([r, y]) => new T.Vector2(r, y))).getPoints(30), 26);
    const seile = new T.BufferGeometry().setFromPoints([[-1, -1], [1, -1], [-1, 1], [1, 1]].flatMap(([x, z]) => [new T.Vector3(x * .38, -1.3, z * .38), new T.Vector3(x * .52, -.62, z * .52)]));
    const G = { huelle, seile, rock: new T.CylinderGeometry(.33, .4, .36, 16, 1, true), korb: new T.BoxGeometry(.8, .6, .8), kante: new T.BoxGeometry(.92, .09, .92), brenner: new T.CylinderGeometry(.14, .17, .18, 12), flamme: new T.ConeGeometry(.11, .44, 10), sack: new T.SphereGeometry(.13, 10, 8) };
    for (const k in G) G[k].userData.geteilt = true;
    return G;
  }
  function heissluftballon() {
    const g = new T.Group(), G = ballonGeo || (ballonGeo = ballonFormen());
    const klein = (geom, m, x, y, z) => { const k = teil(geom, m, g, x, y, z); k.castShadow = false; return k; };
    teil(G.huelle, wahl(BALLON), g);
    klein(G.rock, ballonM.rand, 0, -1.2, 0);
    teil(G.korb, ballonM.korb, g, 0, -1.72, 0); klein(G.kante, ballonM.leder, 0, -1.4, 0);
    klein(G.brenner, ballonM.metall, 0, -1.2, 0); klein(G.flamme, ballonM.flamme, 0, -.96, 0);
    for (const [x, z] of [[-.5, .15], [.5, -.15], [.15, .5]]) klein(G.sack, ballonM.sand, x, -1.72, z).scale.y = 1.3;
    g.add(new T.LineSegments(G.seile, M.seil));
    return g;
  }
  function gewitter() {
    const g = new T.Group();
    for (let i = 0; i < 7; i++) teil(kugel, M.gewitter, g, zufall(-1.6, 1.6), zufall(-.4, .6), zufall(-1, 1)).scale.setScalar(zufall(1, 1.6));
    const b = new T.Mesh(new T.CylinderGeometry(.06, .06, 3, 5), M.blitz); b.position.y = -2; b.rotation.z = .3; b.visible = false; g.add(b);
    g.userData.blitz = b; return g;
  }
  function voegel() {
    const g = new T.Group(), fluegel = new T.BufferGeometry().setFromPoints([new T.Vector3(0, 0, 0), new T.Vector3(-.7, .12, .2), new T.Vector3(0, 0, .35)]);
    g.userData.flattern = [];
    for (let i = 0; i < 5; i++) {
      const v = gelenk(g, (i - 2) * .9, Math.abs(i - 2) * -.25, Math.abs(i - 2) * .6);
      const l = new T.Mesh(fluegel, M.vogel), r = new T.Mesh(fluegel, M.vogel); r.scale.x = -1; v.add(l, r); g.userData.flattern.push([l, r]);
    }
    return g;
  }
  // Inseln: zerklüfteter Fels, Rasen mit Strand; schwebend mit Wasserfall, im Meer mit Steg und manchmal einem Leuchtturm
  const felsFarbe = (m, n, c) => {
    const licht = 1.25 + .5 * Math.max(0, n.y * .6 + n.x * -.4 + n.z * .55), schicht = Math.sin(m.y * 15) * .12;
    c.set(m.y > -.12 ? "#8fae5e" : (m.y > -.55 ? "#c4a988" : "#a58e74")).multiplyScalar(licht + schicht);
  };
  const inselDeckelBild = (strand) => leinwand(256, 256, (g, w, h) => {
    g.fillStyle = "#6fb544"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { g.fillStyle = wahl(["rgba(150,205,90,.5)", "rgba(70,140,50,.5)", "rgba(190,225,120,.35)"]); g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 5 + Math.random() * 16, 0, 7); g.fill(); }
    if (!strand) return;
    const v = g.createRadialGradient(w / 2, h / 2, w * .34, w / 2, h / 2, w * .5); v.addColorStop(0, "rgba(240,220,160,0)"); v.addColorStop(.28, "#ecd9a0"); v.addColorStop(1, "#f5e6b8");
    g.fillStyle = v; g.fillRect(0, 0, w, h);
  });
  const wasserfallBild = leinwand(64, 256, (g, w, h) => {
    const v = g.createLinearGradient(0, 0, w, 0); v.addColorStop(0, "rgba(255,255,255,0)"); v.addColorStop(.2, "rgba(190,230,255,.9)"); v.addColorStop(.8, "rgba(190,230,255,.9)"); v.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = v; g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(255,255,255,.75)"; for (let i = 0; i < 60; i++) g.fillRect(6 + Math.random() * (w - 12), Math.random() * h, 2, 18 + Math.random() * 40);
  }, true);
  const leuchtBild = leinwand(64, 256, (g, w, h) => { for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? "#ffffff" : "#d8262b"; g.fillRect(0, i * h / 6, w, h / 6 + 1); } });
  const stegBild = leinwand(128, 256, (g, w, h) => { g.fillStyle = "#a8743f"; g.fillRect(0, 0, w, h); g.fillStyle = "rgba(60,30,10,.55)"; for (let y = 0; y < h; y += 21) g.fillRect(0, y, w, 3); });
  const inselM = {
    fels: std({ vertexColors: true, roughness: 1, flatShading: true }), seite: std({ color: "#7b5a36", roughness: 1 }), unten: std({ color: "#5f4a35", roughness: 1 }),
    gras: std({ map: inselDeckelBild(false), roughness: 1 }), strand: std({ map: inselDeckelBild(true), roughness: 1 }),
    wasserfall: new T.MeshBasicMaterial({ map: wasserfallBild, transparent: true, depthWrite: false, side: T.DoubleSide }), bach: std({ color: "#6fc7ee", roughness: .15, metalness: .2 }),
    stein: std({ color: "#9b9488", roughness: 1, flatShading: true }), turm: std({ map: leuchtBild, roughness: .45 }), steg: std({ map: stegBild, roughness: .85 }), pfahl: std({ color: "#5a3a1e", roughness: .9 }),
    lampe: std({ color: "#fff2bf", emissive: "#ffd36b", emissiveIntensity: 2.4 }), dunkel: std({ color: "#2b2d33", roughness: .5, metalness: .4 }),
  };
  let inselGeo = null;
  function inselFormen() {
    const fels = [0, 1, 2].map(i => facetten(zackig(new T.ConeGeometry(1, 1.7, 13, 7, true).rotateX(Math.PI).translate(0, -.85, 0), .07, i * 2.1), felsFarbe));
    const G = {
      deckel: zackig(new T.CylinderGeometry(1, .97, .3, 28, 1), .035, 1.3, true),
      wasserfall: new T.PlaneGeometry(1, 1).translate(0, -.5, 0), bach: new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, .5),
      stein: new T.IcosahedronGeometry(1, 0), turm: new T.CylinderGeometry(.26, .42, 2.6, 16), galerie: new T.CylinderGeometry(.42, .42, .06, 16), lampe: new T.SphereGeometry(.2, 14, 10), dach: new T.ConeGeometry(.34, .34, 16),
      steg: new T.BoxGeometry(.95, .07, 2.6), pfahl: new T.CylinderGeometry(.055, .06, .7, 8),
    };
    G.deckel.computeVertexNormals();
    for (const k in G) G[k].userData.geteilt = true;
    return { ...G, fels };
  }
  function insel(imMeer = false) {
    const g = new T.Group(), r = zufall(3, 6), G = inselGeo || (inselGeo = inselFormen());
    const klein = (geom, m, x, y, z) => { const k = teil(geom, m, g, x, y, z); k.castShadow = false; return k; };
    const fels = teil(wahl(G.fels), inselM.fels, g, 0, .14, 0); fels.scale.setScalar(r * .95); fels.rotation.y = zufall(0, 6);
    const platte = teil(G.deckel, [inselM.seite, imMeer ? inselM.strand : inselM.gras, inselM.unten], g, 0, .15, 0); platte.scale.set(r, 1, r); platte.rotation.y = zufall(0, 6);
    for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) {
      const t = W.dekoFuer(0); t.position.set(zufall(-r * .5, r * .5), .3, zufall(-r * .5, r * .5)); t.scale.setScalar(.6); g.add(t);
    }
    for (let i = 0; i < 3; i++) { const a = zufall(0, 6), q = r * zufall(.62, .86); const st = klein(G.stein, inselM.stein, Math.cos(a) * q, .36, Math.sin(a) * q); st.scale.set(zufall(.16, .34), zufall(.12, .24), zufall(.16, .34)); st.rotation.set(zufall(0, 3), zufall(0, 3), 0); }
    if (imMeer) {
      klein(G.steg, inselM.steg, 0, .2, r + 1).castShadow = true;
      for (const sx of [-.42, .42]) for (const z of [r + .2, r + 2.1]) klein(G.pfahl, inselM.pfahl, sx, -.05, z);
      if (Math.random() < .3) {
        const x = r * .35, z = -r * .25;
        teil(G.turm, inselM.turm, g, x, 1.6, z); klein(G.galerie, inselM.dunkel, x, 2.93, z); klein(G.lampe, inselM.lampe, x, 3.14, z); klein(G.dach, inselM.dunkel, x, 3.46, z);
      }
    } else if (Math.random() < .7) {
      const b = r * .16;
      const lauf = klein(G.bach, inselM.bach, 0, .31, r * .1); lauf.scale.set(b, 1, r * .88);
      const fall = klein(G.wasserfall, inselM.wasserfall, 0, .31, r * .985); fall.scale.set(b * 1.2, r * 1.5, 1); fall.rotation.x = -.42;
    }
    return g;
  }
  function regenbogen() {
    const g = new T.Group();
    ["#e53935", "#fb8c00", "#fdd835", "#43a047", "#1e88e5", "#8e24aa"].forEach((c, i) => {
      const t = new T.Mesh(new T.TorusGeometry(30 - i * 1.2, .6, 8, 48, Math.PI), new T.MeshBasicMaterial({ color: c, transparent: true, opacity: .55, fog: false }));
      t.material.userData.einzel = true;
      g.add(t);
    });
    return g;
  }
  // Wolkenballen mitten im Flugweg: man fliegt durch und sieht kurz nur Weiß
  function wolkenBallen() {
    const g = new T.Group();
    for (let i = 0; i < 7; i++) {
      const s = new T.Sprite(W.mat.wolke); s.geometry.userData.geteilt = true;
      const b = zufall(7, 12); s.scale.set(b, b * .6, 1); s.position.set(zufall(-3, 3), zufall(-1.5, 1.5), zufall(-3, 3)); g.add(s);
    }
    return g;
  }
  // Lichtstrahlen, die von der tief stehenden Sonne durch den Dunst fallen
  const strahlBild = leinwand(32, 256, (g, w, h) => {
    const v = g.createLinearGradient(0, 0, 0, h); v.addColorStop(0, "rgba(255,236,200,.9)"); v.addColorStop(1, "rgba(255,236,200,0)");
    g.fillStyle = v; g.fillRect(0, 0, w, h);
    const q = g.createLinearGradient(0, 0, w, 0); q.addColorStop(0, "rgba(0,0,0,1)"); q.addColorStop(.5, "rgba(0,0,0,0)"); q.addColorStop(1, "rgba(0,0,0,1)");
    g.globalCompositeOperation = "destination-out"; g.fillStyle = q; g.fillRect(0, 0, w, h);
  });
  function strahlen() {
    const g = new T.Group();
    for (let i = 0; i < 6; i++) {
      const m = new T.SpriteMaterial({ map: strahlBild, transparent: true, opacity: zufall(.1, .2), depthWrite: false, fog: false, blending: T.AdditiveBlending });
      m.rotation = -.32 + i * .13 + zufall(-.04, .04);     // fächerförmig, oben an der Sonne
      const s = new T.Sprite(m); s.scale.set(zufall(5, 11), 150, 1); s.position.set(Math.sin(m.rotation) * 75, -Math.cos(m.rotation) * 75, 0); g.add(s);
    }
    return g;
  }
  function wolkenMeer() {
    const k = new T.Mesh(new T.PlaneGeometry(500, 500).rotateX(-Math.PI / 2), std({ map: wolkenBild, roughness: 1, color: "#ffffff" }));
    k.receiveShadow = true; return k;
  }
  // Level 3: Rennboot (Fröbelinchen gelb mit roten Streifen, Anja rosa mit weißen), „sitz“ wie beim Flugzeug
  const BOOT_FARBEN = [
    { rumpf: "#ffc61a", unten: "#123a5e", streifen: "#e53935", linie: "#ffffff", holz: "#8a4a24", holzHell: "#a9642f", fuge: "rgba(250,240,220,.85)", polster: "#e53935", motor: "#e53935", stern: "#e53935" },
    { rumpf: "#f48fb1", unten: "#7a2e55", streifen: "#ffffff", linie: "#ffffff", holz: "#efe4d6", holzHell: "#f8f1e7", fuge: "rgba(180,120,140,.7)", polster: "#ffffff", motor: "#f48fb1", stern: "#ec5f94" },
  ];
  const bootLackSpeicher = [null, null];
  const bootLack = (nr) => bootLackSpeicher[nr] || (bootLackSpeicher[nr] = (() => {
    const f = BOOT_FARBEN[nr];
    // Rumpf: Bildmitte ist der Kiel, die Ränder sind die Bordwand oben; oben im Bild der Bug, unten das Heck
    const rumpf = leinwand(1024, 512, (g, w, h) => {
      g.fillStyle = f.rumpf; g.fillRect(0, 0, w, h);
      g.fillStyle = f.unten; g.fillRect(w * .33, 0, w * .34, h);
      g.fillStyle = f.linie; g.fillRect(w * .31, 0, w * .02, h); g.fillRect(w * .67, 0, w * .02, h);
      for (const seite of [0, 1]) {                       // Rennstreifen: am Heck breit, zum Bug hin spitz
        const x = (a) => seite ? w * (1 - a) : w * a;
        g.fillStyle = f.streifen; g.beginPath(); g.moveTo(x(.05), h); g.lineTo(x(.24), h); g.lineTo(x(.12), h * .08); g.lineTo(x(.09), h * .08); g.closePath(); g.fill();
        g.fillStyle = f.linie; g.beginPath(); g.moveTo(x(.24), h); g.lineTo(x(.27), h); g.lineTo(x(.135), h * .08); g.lineTo(x(.12), h * .08); g.closePath(); g.fill();
      }
      for (const x of [.17, .83]) { g.save(); g.translate(w * x, h * .3); g.scale(.62, 1); sternMalen(g, 0, 0, 46, f.stern); g.restore(); }
    });
    const deck = leinwand(512, 512, (g, w, h) => {
      g.fillStyle = f.holz; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? f.holzHell : f.holz; g.fillRect(i * w / 16, 0, w / 16, h); }
      g.fillStyle = f.fuge; for (let i = 0; i <= 16; i++) g.fillRect(i * w / 16 - 1, 0, 2, h);
      g.fillStyle = "rgba(60,30,10,.1)"; for (let i = 0; i < 90; i++) g.fillRect(Math.random() * w, Math.random() * h, 1.5, 30 + Math.random() * 70);
    });
    const glatt = (color, r = .32, m = .2) => std({ color, roughness: r, metalness: m });
    return { rumpf: std({ map: rumpf, roughness: .28, metalness: .15 }), deck: std({ map: deck, roughness: .45 }), heck: glatt(f.rumpf), polster: glatt(f.polster, .7, 0), motor: glatt(f.motor, .25, .3), rand: glatt(f.streifen, .35, .2) };
  })());
  const B_M = {
    chrom: std({ color: "#dfe5ea", roughness: .16, metalness: .95 }), motor: std({ color: "#1b1e23", roughness: .3, metalness: .4 }),
    glas: std({ color: "#a9dcf5", roughness: .05, metalness: .3, transparent: true, opacity: .5, side: T.DoubleSide }),
    fahne: std({ color: "#ffffff", side: T.DoubleSide, roughness: .8 }),
  };
  // Gischt rund um den Bug, einmal gemalt
  const bootSchaum = () => leinwand(256, 512, (g, w, h) => {
    for (let i = 0; i < 420; i++) {
      const v = Math.random(), seite = Math.random() < .5 ? -1 : 1, x = w / 2 + seite * (w * .16 + v * w * .28 + Math.random() * 12), y = h * .12 + v * h * .85, r = 3 + Math.random() * 9;
      g.fillStyle = `rgba(255,255,255,${(.5 * (1 - v)).toFixed(2)})`; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    }
  });
  let bootGeo = null, schaumBild = null;
  function bootFormen() {
    // Spanten vom Heck zum Bug: [z, halbe Breite, Kiel, Deckshöhe]
    const SP = [[1.72, .72, -.24, .35], [1.1, .8, -.3, .36], [.3, .84, -.34, .37], [-.5, .8, -.33, .41], [-1.15, .62, -.24, .48], [-1.7, .36, -.08, .55], [-2.12, .12, .14, .6], [-2.3, .01, .33, .63]];
    const kurveA = new T.CatmullRomCurve3(SP.map(([z, b, k]) => new T.Vector3(z, b, k))), kurveB = new T.CatmullRomCurve3(SP.map(([z, , , d]) => new T.Vector3(z, d, 0)));
    const RINGE = 32, spant = (u) => { const a = kurveA.getPoint(u), z = a.x, b = Math.max(a.y, .004), k = a.z, d = kurveB.getPoint(u).y; return { z, b, k, d }; };
    const form = [[0, 0], [.42, .1], [.78, .3], [.95, .62], [1, 1]];    // Schnitt vom Kiel zur Bordwand
    const pos = [], uv = [], idx = [], rand = [];
    for (let r = 0; r <= RINGE; r++) {
      const { z, b, k, d } = spant(r / RINGE), H = d - k;
      for (let c = -4; c <= 4; c++) {
        const [fx, fy] = form[Math.abs(c)];
        pos.push(Math.sign(c) * b * fx, k + H * fy, z); uv.push((c + 4) / 8, r / RINGE);
      }
    }
    for (let r = 0; r < RINGE; r++) for (let c = 0; c < 8; c++) { const a = r * 9 + c, n = a + 9; idx.push(a, n, a + 1, a + 1, n, n + 1); }
    const rumpf = new T.BufferGeometry();
    rumpf.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); rumpf.setAttribute("uv", new T.Float32BufferAttribute(uv, 2)); rumpf.setIndex(idx); rumpf.computeVertexNormals();
    // Deck mit leichter Wölbung
    const dPos = [], dUv = [], dIdx = [];
    for (let r = 0; r <= RINGE; r++) {
      const { z, b, d } = spant(r / RINGE);
      for (let c = -3; c <= 3; c++) { const q = c / 3; dPos.push(q * b, d + (1 - q * q) * .06, z); dUv.push((q * b + .9) / 1.8, r / RINGE * 2.2); }
    }
    for (let r = 0; r < RINGE; r++) for (let c = 0; c < 6; c++) { const a = r * 7 + c, n = a + 7; dIdx.push(a, a + 1, n, a + 1, n + 1, n); }
    const deck = new T.BufferGeometry();
    deck.setAttribute("position", new T.Float32BufferAttribute(dPos, 3)); deck.setAttribute("uv", new T.Float32BufferAttribute(dUv, 2)); deck.setIndex(dIdx); deck.computeVertexNormals();
    // Scheuerleiste entlang der Bordwand
    for (let r = 0; r <= RINGE; r++) { const { z, b, d } = spant(r / RINGE); rand.push(new T.Vector3(-b - .012, d, z)); }
    for (let r = RINGE - 1; r >= 0; r--) { const { z, b, d } = spant(r / RINGE); rand.push(new T.Vector3(b + .012, d, z)); }
    const leiste = new T.TubeGeometry(new T.CatmullRomCurve3(rand, false, "catmullrom", .1), 90, .04, 7, false);
    // Heckspiegel
    const s0 = spant(0), hs = new T.Shape(); hs.moveTo(-s0.b, s0.d);
    for (let c = -3; c <= 3; c++) { const [fx, fy] = form[Math.abs(c)]; hs.lineTo(Math.sign(c) * s0.b * fx, s0.k + (s0.d - s0.k) * fy); }
    hs.lineTo(s0.b, s0.d); hs.closePath();
    // Reling am Vorschiff
    const relingP = (s) => { const { z, b, d } = spant(s); return new T.Vector3(b * .78, d + .25, z); };
    const relingPunkte = []; for (let i = 0; i <= 8; i++) relingPunkte.push(relingP(.55 + i * .051));
    const spiegel = relingPunkte.slice().reverse().map(v => new T.Vector3(-v.x, v.y, v.z));
    const reling = new T.TubeGeometry(new T.CatmullRomCurve3([...spiegel, ...relingPunkte.slice(1)], false, "catmullrom", .1), 60, .018, 6, false);
    const pfosten = [.58, .7, .82].map(relingP);
    // Windschutzscheibe: nach hinten geneigter Bogen
    const scheibe = new T.CylinderGeometry(.66, .74, .36, 28, 1, true, Math.PI - 1.15, 2.3);
    const schaum = new T.PlaneGeometry(2.8, 5.4).rotateX(-Math.PI / 2);
    return {
      rumpf, deck, leiste, heck: new T.ShapeGeometry(hs), reling, pfosten, scheibe, schaum,
      pfosten1: new T.CylinderGeometry(.014, .014, .25, 6),
      scheibeRand: new T.TorusGeometry(.67, .02, 6, 26, 2.3).rotateX(Math.PI / 2).rotateY(Math.PI / 2 + 1.15),
      rand: new T.TorusGeometry(.5, .055, 8, 30).rotateX(Math.PI / 2),
      boden: new T.CircleGeometry(.5, 26).rotateX(-Math.PI / 2),
      polster: new T.CapsuleGeometry(.09, .62, 6, 12).rotateZ(Math.PI / 2),
      luke: new T.BoxGeometry(.55, .05, .45), hutze: new T.SphereGeometry(.09, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      haube: new T.SphereGeometry(.3, 22, 16), schaft: new T.BoxGeometry(.12, .55, .16), finne: new T.BoxGeometry(.03, .05, .34), blatt: new T.BoxGeometry(.11, .36, .025),
      stange: new T.CylinderGeometry(.012, .018, .7, 6), fahne: new T.PlaneGeometry(.42, .24).translate(.21, 0, 0), lampe: new T.SphereGeometry(.045, 10, 8),
    };
  }
  function boot(anja) {
    const g = new T.Group(), L = bootLack(anja ? 1 : 0), G = bootGeo || (bootGeo = bootFormen());
    for (const k in G) if (G[k].isBufferGeometry) G[k].userData.geteilt = true;
    const klein = (geom, m, x, y, z) => { const k = teil(geom, m, g, x, y, z); k.castShadow = false; return k; };
    teil(G.rumpf, L.rumpf, g); teil(G.deck, L.deck, g);
    klein(G.leiste, L.rand, 0, 0, 0); klein(G.heck, L.heck, 0, 0, 1.72);
    // Cockpit mit Sitzbank, Windschutzscheibe mit Chromrahmen
    klein(G.boden, F_M.innen, 0, .445, .2).scale.z = 1.3;
    klein(G.rand, L.rand, 0, .44, .2).scale.z = 1.3;
    klein(G.polster, L.polster, 0, .52, .84);
    const sch = klein(G.scheibe, B_M.glas, 0, .62, .12); sch.rotation.x = .2;
    const oben = klein(G.scheibeRand, B_M.chrom, 0, .795, .156); oben.rotation.x = .2;
    // Vorschiff: Luke, Lüftungshutzen, Reling, Positionslichter
    const luke = klein(G.luke, B_M.motor, 0, .55, -1); luke.rotation.x = .1;
    for (const s of [-1, 1]) {
      klein(G.hutze, B_M.chrom, s * .42, .44, -.72).scale.set(1, .8, 1.5);
      for (const p of G.pfosten) klein(G.pfosten1, B_M.chrom, s * p.x, p.y - .125, p.z);
    }
    klein(G.reling, B_M.chrom, 0, 0, 0);
    klein(G.lampe, F_M.rot, -.16, .64, -1.95); klein(G.lampe, F_M.gruen, .16, .64, -1.95);
    // Motor am Heck, Propeller dreht unter der Haube
    const haube = teil(G.haube, L.motor, g, 0, .5, 1.9); haube.scale.set(.72, .85, .85);
    const deckel = klein(G.haube, B_M.motor, 0, .66, 1.9); deckel.scale.set(.56, .24, .66);
    klein(G.schaft, B_M.motor, 0, .08, 1.93);
    const finne = klein(G.finne, B_M.motor, 0, -.2, 1.96); finne.scale.y = 2;
    const propeller = gelenk(g, 0, -.14, 2.1);
    for (let i = 0; i < 3; i++) { const b = teil(G.blatt, B_M.chrom, propeller); b.rotation.z = i * Math.PI * 2 / 3; b.castShadow = false; }
    // Fähnchen am Heck
    klein(G.stange, B_M.chrom, .62, .68, 1.58);
    const fahne = klein(G.fahne, anja ? L.polster : L.rand, .62, .92, 1.58); fahne.rotation.y = .35;
    // Gischt am Bug, liegt knapp über dem Wasser
    if (!schaumBild) schaumBild = new T.MeshBasicMaterial({ map: bootSchaum(), transparent: true, depthWrite: false });
    klein(G.schaum, schaumBild, 0, -.17, -.6);
    const sitz = gelenk(g, 0, .2, .15);
    return { gruppe: g, propeller, sitz };
  }
  // Pylone auf einem schwimmenden Sockel mit Warnstreifen, Kegel mit reflektierenden Bändern
  const warnBild = leinwand(256, 32, (g, w, h) => {
    g.fillStyle = "#ffcf1a"; g.fillRect(0, 0, w, h); g.fillStyle = "#1c1c20";
    for (let x = -32; x < w + 32; x += 32) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 16, h); g.lineTo(x + 32, 0); g.lineTo(x + 16, 0); g.closePath(); g.fill(); }
  });
  const kegelBild = leinwand(64, 256, (g, w, h) => {
    g.fillStyle = "#ff6a13"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#ffffff"; g.fillRect(0, h * .3, w, h * .13); g.fillRect(0, h * .6, w, h * .13);
    g.fillStyle = "rgba(120,30,0,.3)"; g.fillRect(0, h * .9, w, h * .1);
  });
  const pylonGeo = {
    sockel: new T.CylinderGeometry(.6, .68, .22, 20),
    rand: new T.TorusGeometry(.61, .035, 8, 28).rotateX(Math.PI / 2),
    kegel: new T.LatheGeometry([[.42, 0], [.37, .05], [.27, .5], [.15, 1], [.07, 1.22], [.0, 1.25]].map(([r, y]) => new T.Vector2(r, y)), 22),
  };
  for (const k of Object.values(pylonGeo)) k.userData.geteilt = true;
  const pylonMat = {
    seite: std({ map: warnBild, roughness: .5 }), oben: std({ color: "#2a2c31", roughness: .7 }),
    kegel: std({ map: kegelBild, roughness: .4, emissive: "#ff4a00", emissiveIntensity: .1 }),
  };
  // Boje mit rot-weißem Körper, Gitterturm, Glocke und Blinklicht (alle blinken gemeinsam)
  const bojeBild = leinwand(64, 256, (g, w, h) => {
    for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? "#ffffff" : "#d8262b"; g.fillRect(0, i * h / 5, w, h / 5 + 1); }
  });
  const bojeGeo = {
    koerper: new T.LatheGeometry([[.56, -.05], [.58, .1], [.52, .34], [.32, .5], [.02, .52]].map(([r, y]) => new T.Vector2(r, y)), 22),
    kragen: new T.TorusGeometry(.58, .05, 8, 26).rotateX(Math.PI / 2), strebe: new T.CylinderGeometry(.018, .025, .82, 6),
    deckel: new T.CylinderGeometry(.2, .2, .05, 16), glocke: new T.LatheGeometry([[.1, 0], [.08, .06], [.06, .16], [.02, .21]].map(([r, y]) => new T.Vector2(r, y)), 14),
    lampe: new T.SphereGeometry(.12, 14, 10), dach: new T.ConeGeometry(.17, .14, 14),
  };
  for (const k of Object.values(bojeGeo)) k.userData.geteilt = true;
  const bojeMat = {
    koerper: std({ map: bojeBild, roughness: .35, metalness: .1 }), gestell: std({ color: "#b8bec6", roughness: .4, metalness: .6 }), gold: std({ color: "#e6b53a", roughness: .25, metalness: .85 }),
    licht: std({ color: "#ffe9a8", emissive: "#ffc23a", emissiveIntensity: 2 }), rot: std({ color: "#d8262b", roughness: .4 }),
  };
  const bojenBlinken = (t) => { bojeMat.licht.emissiveIntensity = (t % 1.4) < .35 ? 3.4 : .25; };
  // weißer Schaumkranz, wo Pylonen und Bojen im Wasser stehen
  const ringBild = leinwand(128, 128, (g, w, h) => {
    for (let i = 0; i < 170; i++) { const a = Math.random() * 7, q = 34 + Math.random() * 22, r = 1.5 + Math.random() * 4; g.fillStyle = `rgba(255,255,255,${(.2 + Math.random() * .5).toFixed(2)})`; g.beginPath(); g.arc(64 + Math.cos(a) * q, 64 + Math.sin(a) * q, r, 0, 7); g.fill(); }
  });
  const ringGeoSchaum = new T.PlaneGeometry(2.2, 2.2).rotateX(-Math.PI / 2); ringGeoSchaum.userData.geteilt = true;
  const ringMat = new T.MeshBasicMaterial({ map: ringBild, transparent: true, depthWrite: false });
  const schaumRing = (g, s) => { const k = new T.Mesh(ringGeoSchaum, ringMat); k.position.y = .04; k.scale.setScalar(s); g.add(k); };
  function pylone() {
    const g = new T.Group();
    schaumRing(g, 1.25);
    teil(pylonGeo.sockel, [pylonMat.seite, pylonMat.oben, pylonMat.oben], g, 0, .08, 0);
    teil(pylonGeo.rand, M.dunkel, g, 0, .19, 0).castShadow = false;
    teil(pylonGeo.kegel, pylonMat.kegel, g, 0, .2, 0);
    return g;
  }
  function boje() {
    const g = new T.Group();
    schaumRing(g, 1.15);
    teil(bojeGeo.koerper, bojeMat.koerper, g);
    const klein = (geom, m, x, y, z) => { const k = teil(geom, m, g, x, y, z); k.castShadow = false; return k; };
    klein(bojeGeo.kragen, M.dunkel, 0, .08, 0);
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2, k = klein(bojeGeo.strebe, bojeMat.gestell, Math.cos(a) * .2, .9, Math.sin(a) * .2); k.rotation.set(Math.sin(a) * -.26, 0, Math.cos(a) * .26); }
    klein(bojeGeo.glocke, bojeMat.gold, 0, .72, 0); klein(bojeGeo.deckel, bojeMat.gestell, 0, 1.3, 0);
    klein(bojeGeo.lampe, bojeMat.licht, 0, 1.43, 0); klein(bojeGeo.dach, bojeMat.rot, 0, 1.6, 0);
    return g;
  }
  // Durchgehende Spur hinter Boot und Schlitten: ein Band aus Wegpunkten, das hinten ausläuft
  function spurBauen({ punkte = 64, abstand = .8, y, breite, alpha, material }) {
    const P = new Float32Array(punkte * 6), F = new Float32Array(punkte * 8).fill(1), U = new Float32Array(punkte * 4), idx = [];
    for (let i = 0; i < punkte - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const geo = new T.BufferGeometry();
    const pa = new T.BufferAttribute(P, 3).setUsage(T.DynamicDrawUsage), fa = new T.BufferAttribute(F, 4).setUsage(T.DynamicDrawUsage), ua = new T.BufferAttribute(U, 2).setUsage(T.DynamicDrawUsage);
    geo.setAttribute("position", pa); geo.setAttribute("color", fa); geo.setAttribute("uv", ua); geo.setIndex(idx);
    const mesh = new T.Mesh(geo, material); mesh.frustumCulled = false; mesh.visible = false;
    const ring = []; let s = 0, lx = null, lz = 0, nx = 1, nz = 0;
    const kopf = { x: 0, z: 0, nx: 1, nz: 0, s: 0 };
    function leeren() { for (let i = 3; i < F.length; i += 4) F[i] = 0; fa.needsUpdate = true; }
    function reset() { ring.length = 0; s = 0; lx = null; leeren(); }
    function schritt(q) {
      const x = q.x, z = q.z;
      if (lx === null) { lx = x; lz = z; }
      let d = Math.hypot(x - lx, z - lz);
      if (d >= abstand) {
        nx = (z - lz) / d; nz = -(x - lx) / d; s += d;
        const p = ring.length >= punkte - 1 ? ring.pop() : {};
        p.x = x; p.z = z; p.nx = nx; p.nz = nz; p.s = s; ring.unshift(p);
        lx = x; lz = z; d = 0;
      }
      kopf.x = x; kopf.z = z; kopf.nx = nx; kopf.nz = nz; kopf.s = s + d;
      for (let i = 0; i < punkte; i++) {
        const p = i === 0 ? kopf : ring[i - 1], v = i * 2;
        if (!p) { F[v * 4 + 3] = F[v * 4 + 7] = 0; continue; }
        const a = kopf.s - p.s, b = breite(a), al = i === ring.length ? 0 : alpha(a) * Math.min(1, a / 1.2 + .15);
        P[v * 3] = p.x - p.nx * b; P[v * 3 + 1] = y; P[v * 3 + 2] = p.z - p.nz * b;
        P[v * 3 + 3] = p.x + p.nx * b; P[v * 3 + 4] = y; P[v * 3 + 5] = p.z + p.nz * b;
        U[v * 2] = 0; U[v * 2 + 1] = p.s * .09; U[v * 2 + 2] = 1; U[v * 2 + 3] = p.s * .09;
        F[v * 4 + 3] = F[v * 4 + 7] = al;
      }
      pa.needsUpdate = fa.needsUpdate = ua.needsUpdate = true;
    }
    return { mesh, schritt, reset };
  }
  function kielwasser() {
    const bild = leinwand(256, 512, (g, w, h) => {
      for (let i = 0; i < 900; i++) {
        const z = Math.random(), x = z < .62 ? (Math.random() < .5 ? .05 + Math.random() * .13 : .82 + Math.random() * .13) : .34 + Math.random() * .32, r = 2 + Math.random() * 8, y = Math.random() * h;
        for (const dy of [-h, 0, h]) { g.fillStyle = `rgba(255,255,255,${(.25 + Math.random() * .4).toFixed(2)})`; g.beginPath(); g.arc(x * w, y + dy, r, 0, 7); g.fill(); }
      }
    }, true);
    bild.wrapS = T.ClampToEdgeWrapping;
    return spurBauen({ punkte: 64, abstand: .9, y: .05, breite: (a) => .5 + Math.min(a * .15, 6.5), alpha: (a) => Math.pow(Math.max(0, 1 - a / 54), 1.3) * .9,
      material: new T.MeshBasicMaterial({ map: bild, transparent: true, depthWrite: false, vertexColors: true, side: T.DoubleSide }) });
  }
  function kufenspuren() {
    const material = new T.MeshBasicMaterial({ color: "#8aa2bb", transparent: true, depthWrite: false, vertexColors: true, side: T.DoubleSide });
    return [0, 1].map(() => spurBauen({ punkte: 60, abstand: .9, y: .02, breite: () => .06, alpha: (a) => Math.max(0, 1 - a / 50) * .62, material }));
  }
  // Wasserfläche mit wandernden Wellen (Normalenkarte aus der Welt, hier fein wiederholt)
  function wasserFlaeche(wellen) {
    const t = wellen.clone(); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(80, 80); t.needsUpdate = true;
    // große helle und dunkle Flächen, damit das Muster der Wellen nicht auffällt
    const farben = leinwand(512, 512, (g, w, h) => {
      g.fillStyle = "#e8f4ff"; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 46; i++) {
        const x = Math.random() * w, y = Math.random() * h, r = 40 + Math.random() * 110, c = wahl(["95,215,225", "70,120,205", "255,255,255", "45,95,180"]);
        for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) { const v = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r); v.addColorStop(0, `rgba(${c},.42)`); v.addColorStop(1, `rgba(${c},0)`); g.fillStyle = v; g.fillRect(x + dx - r, y + dy - r, r * 2, r * 2); }
      }
    }, true);
    farben.repeat.set(5, 5);
    // Sonnenglitzer und kleine Schaumkronen
    const funkel = leinwand(512, 512, (g, w, h) => {
      g.fillStyle = "#000"; g.fillRect(0, 0, w, h);
      g.fillStyle = "#fff"; for (let i = 0; i < 420; i++) { g.globalAlpha = .35 + Math.random() * .65; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1); }
      g.globalAlpha = .3; g.strokeStyle = "#fff"; g.lineCap = "round";
      for (let i = 0; i < 34; i++) { g.lineWidth = 1 + Math.random() * 2; const x = Math.random() * w, y = Math.random() * h, r = 6 + Math.random() * 13; g.beginPath(); g.arc(x, y + r, r, -2.2, -.9); g.stroke(); }
    }, true);
    funkel.colorSpace = T.NoColorSpace; funkel.repeat.set(16, 16);
    const k = new T.Mesh(new T.PlaneGeometry(600, 600).rotateX(-Math.PI / 2),
      std({ map: farben, emissive: "#ffffff", emissiveMap: funkel, emissiveIntensity: .8, color: "#2b8bcc", roughness: .12, metalness: .25, normalMap: t, normalScale: new T.Vector2(.95, .95), envMapIntensity: 1.3 }));
    k.receiveShadow = true; k.userData.wellen = t; k.userData.farben = farben; k.userData.funkel = funkel;
    return k;
  }
  // Schlittenfahrt im Winterland: Holzschlitten mit Metallkufen und Slalomtore mit Fahnen
  const SM = {
    holz: std({ color: "#b5733a", roughness: .7 }), holzAnja: std({ color: "#f48fb1", roughness: .6 }),
    kufe: std({ color: "#9aa0a8", roughness: .3, metalness: .7 }),
    rot: std({ color: "#e53935", roughness: .6, side: T.DoubleSide }), blau: std({ color: "#1e63d6", roughness: .6, side: T.DoubleSide }),
    schnee: std({ color: "#ffffff", roughness: .9 }), buckel: std({ color: "#eef3fa", roughness: 1 }),
  };
  const torBilder = (farbe, dunkel) => ({
    stange: leinwand(32, 256, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#ffffff" : farbe; g.fillRect(0, i * h / 8, w, h / 8 + 1); } }),
    fahne: leinwand(256, 180, (g, w, h) => {
      g.fillStyle = farbe; g.fillRect(0, 0, w, h);
      g.fillStyle = dunkel; g.fillRect(0, 0, 22, h);
      g.fillStyle = "#fff"; g.fillRect(22, 0, 6, h); g.fillRect(0, 0, w, 6); g.fillRect(0, h - 6, w, 6);
      sternMalen(g, w * .58, h / 2, 62, farbe);
    }),
    banner: leinwand(512, 96, (g, w, h) => {
      g.fillStyle = farbe; g.fillRect(0, 0, w, h);
      for (const x0 of [0, w - 64]) for (let i = 0; i < 8; i++) for (let k = 0; k < 3; k++) { g.fillStyle = (i + k) % 2 ? "#fff" : "#16181c"; g.fillRect(x0 + i * 8, k * 32, 8, 32); }
      g.fillStyle = "#fff"; g.fillRect(0, 0, w, 5); g.fillRect(0, h - 5, w, 5);
      g.font = "900 58px system-ui, Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("FRÖBEL CUP", w / 2, h / 2 + 3);
    }),
  });
  let torMatSpeicher = null;
  const torMat = (blau) => {
    if (!torMatSpeicher) {
      const bau = (b) => { const m = (map) => std({ map, roughness: .55, side: T.DoubleSide }); return { stange: std({ map: b.stange, roughness: .4 }), fahne: m(b.fahne), banner: m(b.banner) }; };
      torMatSpeicher = { blau: bau(torBilder("#1e63d6", "#123f8f")), rot: bau(torBilder("#e53935", "#9a1d1a")) };
    }
    return blau ? torMatSpeicher.blau : torMatSpeicher.rot;
  };
  const torGeo = {
    stange: new T.CylinderGeometry(.055, .065, 3, 10), knauf: new T.SphereGeometry(.13, 14, 10),
    fahne: new T.PlaneGeometry(.8, .58).translate(.4, 0, 0), banner: new T.PlaneGeometry(1, .62),
    huegel: new T.SphereGeometry(.3, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
  };
  for (const k of Object.values(torGeo)) k.userData.geteilt = true;
  // Prunkschlitten mit Schwanenhals (Fröbelinchen rot und gold, Anja rosa und silbern); die Figur sitzt unter einer Karodecke
  const SCHLITTEN_FARBEN = [
    { lack: "#b3161c", dunkel: "#7c0d12", gold: "#e6b53a", decke: "#c62828", decke2: "#1f5a3a", decke3: "#f4d35e" },
    { lack: "#f06a9f", dunkel: "#c24478", gold: "#eef1f5", decke: "#ffffff", decke2: "#f48fb1", decke3: "#b9a7e8" },
  ];
  const schlittenLackSpeicher = [null, null];
  const schlittenLack = (nr) => schlittenLackSpeicher[nr] || (schlittenLackSpeicher[nr] = (() => {
    const f = SCHLITTEN_FARBEN[nr];
    const ranke = (g, x, y, r, dreh) => {                 // goldene Schnörkel-Spirale
      g.beginPath();
      for (let i = 0; i <= 44; i++) { const a = i * .34, q = r * (1 - i / 50); g.lineTo(x + Math.cos(a) * q * dreh, y + Math.sin(a) * q); }
      g.stroke();
    };
    // Seitenwand: Bild passt auf die Länge z -1.6 bis 1.3 und die Höhe .2 bis 1.1
    const seite = leinwand(1024, 320, (g, w, h) => {
      g.fillStyle = f.lack; g.fillRect(0, 0, w, h);
      g.fillStyle = f.dunkel; g.fillRect(0, h * .78, w, h * .22);
      g.fillStyle = f.gold; g.fillRect(0, h * .75, w, h * .03); g.fillRect(0, h * .93, w, h * .02);
      g.strokeStyle = f.gold; g.lineWidth = 5; g.lineCap = "round";
      for (const [x, y, r, d] of [[.3, .55, 34, 1], [.4, .55, 34, -1], [.62, .55, 34, 1], [.72, .55, 34, -1], [.86, .44, 28, 1]]) ranke(g, w * x, h * y, r, d);
      g.fillStyle = f.gold; for (let x = 16; x < w; x += 30) { g.beginPath(); g.arc(x, h * .86, 4, 0, 7); g.fill(); }
      g.save(); g.translate(w * .51, h * .53); g.scale(.82, 1); sternMalen(g, 0, 0, 44, f.dunkel); g.restore();
    });
    seite.repeat.set(1 / 2.9, 1 / .9); seite.offset.set(1.6 / 2.9, -.2 / .9); seite.wrapS = seite.wrapT = T.ClampToEdgeWrapping;
    // Rückwand mit goldenem Stern im Kranz
    const hinten = leinwand(384, 256, (g, w, h) => {
      g.fillStyle = f.lack; g.fillRect(0, 0, w, h);
      g.strokeStyle = f.gold; g.lineWidth = 7; g.strokeRect(12, 12, w - 24, h - 24);
      g.lineWidth = 4; g.lineCap = "round";
      ranke(g, 72, h / 2, 42, 1); ranke(g, w - 72, h / 2, 42, -1);
      sternMalen(g, w / 2, h / 2, 76, f.dunkel);
    });
    // Karierte Decke
    const decke = leinwand(256, 256, (g, w, h) => {
      g.fillStyle = f.decke; g.fillRect(0, 0, w, h);
      g.globalAlpha = .72; g.fillStyle = f.decke2;
      for (let i = 0; i < 4; i++) { g.fillRect(i * 64 + 8, 0, 30, h); g.fillRect(0, i * 64 + 8, w, 30); }
      g.globalAlpha = 1; g.fillStyle = f.decke3;
      for (let i = 0; i < 4; i++) { g.fillRect(i * 64 + 50, 0, 5, h); g.fillRect(0, i * 64 + 50, w, 5); }
    }, true);
    decke.repeat.set(2, 2);
    const glatt = (color, r = .3, m = .25) => std({ color, roughness: r, metalness: m });
    return { seite: std({ map: seite, roughness: .3, metalness: .15 }), wand: glatt(f.lack), hinten: std({ map: hinten, roughness: .3, metalness: .15 }), decke: std({ map: decke, roughness: .95 }), gold: glatt(f.gold, .25, .85), sitz: glatt(f.dunkel, .6, 0) };
  })());
  const S_M = {
    fell: std({ color: "#fff8ec", roughness: 1 }), licht: std({ color: "#ffd98a", emissive: "#ffb545", emissiveIntensity: 1.8 }),
    kranz: std({ color: "#1f5a3a", roughness: .9 }), beere: std({ color: "#d32f2f", roughness: .4 }), riemen: std({ color: "#5a3216", roughness: .8 }),
  };
  let schlittenGeo = null;
  function schlittenFormen() {
    // Seitenansicht (x = z in der Welt, nach vorn negativ): Rückenlehne, Sitz, Fußraum, Schwanenhals
    const s = new T.Shape();
    s.moveTo(1.1, .24); s.lineTo(1.2, .5); s.quadraticCurveTo(1.27, .82, 1.02, .78); s.quadraticCurveTo(.82, .7, .78, .52); s.lineTo(-.5, .5);
    s.quadraticCurveTo(-.82, .54, -.98, .76); s.quadraticCurveTo(-1.14, 1.05, -1.42, 1.06); s.quadraticCurveTo(-1.62, 1.03, -1.56, .86); s.quadraticCurveTo(-1.48, .78, -1.36, .84);
    s.quadraticCurveTo(-1.3, .6, -1.16, .42); s.quadraticCurveTo(-1.05, .26, -.86, .24); s.closePath();
    const koerper = new T.ExtrudeGeometry(s, { depth: .94, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 2, curveSegments: 14 }).translate(0, 0, -.47).rotateY(-Math.PI / 2);
    const entlang = (x, p, r, n = 80) => new T.TubeGeometry(new T.CatmullRomCurve3(p.map(([z, y]) => new T.Vector3(x, y, z))), n, r, 7, false);
    const OBEN = [[1.08, .78], [.9, .72], [.78, .54], [.2, .52], [-.5, .52], [-.82, .57], [-.98, .78], [-1.14, 1.05], [-1.42, 1.08], [-1.59, 1.02], [-1.56, .87], [-1.4, .84]];
    const KUFE = [[1.42, .08], [1.3, .03], [.3, .03], [-.8, .03], [-1.35, .12], [-1.72, .42], [-1.86, .76], [-1.74, .98], [-1.56, .96]];
    return {
      koerper, kufeL: entlang(-.46, KUFE, .04), kufeR: entlang(.46, KUFE, .04), goldL: entlang(-.515, OBEN, .022), goldR: entlang(.515, OBEN, .022),
      rueck: new T.PlaneGeometry(.86, .46), decke: new T.SphereGeometry(1, 26, 14, 0, Math.PI * 2, 0, Math.PI / 2), fell: new T.TorusGeometry(.3, .075, 10, 26).rotateX(Math.PI / 2),
      polster: new T.CapsuleGeometry(.1, .66, 6, 12).rotateZ(Math.PI / 2), strebe: new T.CylinderGeometry(.03, .04, .26, 8),
      stab: new T.CylinderGeometry(.016, .016, .34, 6), laterne: new T.CylinderGeometry(.08, .08, .17, 10), dach: new T.ConeGeometry(.105, .09, 10), knauf: new T.SphereGeometry(.07, 14, 10),
      kranz: new T.TorusGeometry(.42, .05, 8, 28, Math.PI), beere: new T.SphereGeometry(.03, 8, 6), riemen: new T.BoxGeometry(.02, .05, 1.1), glocke: new T.SphereGeometry(.05, 12, 8),
    };
  }
  function schlitten(anja) {
    const g = new T.Group(), L = schlittenLack(anja ? 1 : 0), G = schlittenGeo || (schlittenGeo = schlittenFormen());
    for (const k in G) G[k].userData.geteilt = true;
    const klein = (geom, m, x, y, z) => { const k = teil(geom, m, g, x, y, z); k.castShadow = false; return k; };
    teil(G.koerper, [L.seite, L.wand], g);
    teil(G.kufeL, F_M.metall, g); teil(G.kufeR, F_M.metall, g);
    klein(G.goldL, L.gold, 0, 0, 0); klein(G.goldR, L.gold, 0, 0, 0);
    klein(G.rueck, L.hinten, 0, .49, 1.215);
    klein(G.knauf, L.gold, 0, 1.1, -1.42); for (const s of [-1, 1]) klein(G.knauf, L.gold, s * .46, .98, -1.56).scale.setScalar(.8);
    for (const s of [-1, 1]) for (const z of [-.75, 0, .75]) klein(G.strebe, L.gold, s * .46, .15, z);
    // Sitzpolster, Decke, Fellkragen um den Hals
    klein(G.polster, L.sitz, 0, .84, .92);
    const decke = teil(G.decke, L.decke, g, 0, .5, .14); decke.scale.set(.47, .27, .66);
    klein(G.fell, S_M.fell, 0, .73, .2);
    // Laternen vorn, Tannenkranz mit Beeren hinten, Schellen an Lederriemen
    for (const s of [-1, 1]) {
      klein(G.stab, L.gold, s * .57, .72, -.72);
      klein(G.laterne, S_M.licht, s * .57, .96, -.72); klein(G.dach, L.gold, s * .57, 1.09, -.72);
      klein(G.riemen, S_M.riemen, s * .525, .42, -.1);
      for (let i = 0; i < 4; i++) klein(G.glocke, L.gold, s * .55, .38, -.5 + i * .27);
    }
    klein(G.kranz, S_M.kranz, 0, .3, 1.225);
    for (let i = 0; i < 7; i++) { const a = (i + .5) / 7 * Math.PI; klein(G.beere, S_M.beere, Math.cos(a) * .42, .3 + Math.sin(a) * .42, 1.27); }
    const propeller = gelenk(g, 0, 0, 0), sitz = gelenk(g, 0, .2, .15);
    return { gruppe: g, propeller, sitz };
  }
  function tor(blau, breite) {
    const g = new T.Group(), m = torMat(blau), fahnen = [];
    for (const sx of [-1, 1]) {
      const x = sx * breite / 2;
      teil(torGeo.stange, m.stange, g, x, 1.5, 0);
      teil(torGeo.knauf, blau ? SM.blau : SM.rot, g, x, 3.05, 0).castShadow = false;
      const huegel = teil(torGeo.huegel, SM.schnee, g, x, -.06, 0); huegel.castShadow = false; huegel.scale.set(2.1, 1.5, 2.1);
      const f = gelenk(g, x, 1.9, 0); f.rotation.y = sx > 0 ? Math.PI : 0;   // Fahne zeigt ins Tor hinein
      teil(torGeo.fahne, m.fahne, f).castShadow = false; fahnen.push(f);
    }
    // Banner über dem Tor, schwingt mit den Fahnen im Fahrtwind
    const b = gelenk(g, 0, 2.95, 0); const stoff = teil(torGeo.banner, m.banner, b, 0, -.31, 0); stoff.scale.x = breite; stoff.castShadow = false; fahnen.push(b);
    g.userData.fahnen = fahnen;
    return g;
  }
  // Bergkette im Tal vor dem Hang: liegt tiefer als die Piste, so sieht man, dass es bergab geht
  function buckel() {                         // kleine Schneehügel: ziehen vorbei und zeigen, wie schnell es geht
    const k = new T.Mesh(torGeo.huegel, SM.buckel); k.scale.set(zufall(2, 4.5), zufall(.6, 1.1), zufall(2, 4)); k.receiveShadow = true; return k;
  }
  function bergkette() {
    const g = new T.Group(), hell = new T.Color("#d3deea");
    const bau = (phase, nah) => facetten(zackig(new T.ConeGeometry(1, 1, 16, 9, true).translate(0, .5, 0), .055, phase), (m, n, c) => {
      const licht = .66 + .4 * Math.max(0, n.x * -.55 + n.y * .35 + n.z * .75);
      const schnee = m.y > .52 + Math.sin(m.x * 19 + phase) * .07 + Math.sin(m.z * 17) * .05;
      c.set(schnee ? "#f7fafd" : (m.y > .3 ? "#94a8bf" : "#7f96b0")).multiplyScalar(licht);
      if (!nah) c.lerp(hell, .55);
    });
    const vorn = [0, 1, 2].map(i => bau(i * 1.7 + .4, true)), hinten = [0, 1, 2].map(i => bau(i * 2.3 + 3, false));
    const mat = new T.MeshBasicMaterial({ vertexColors: true, fog: false });
    for (let i = 0; i < 14; i++) {
      const istHinten = i % 2 === 1, r = zufall(28, 55) * (istHinten ? 1.3 : 1), h = zufall(45, 85) * (istHinten ? 1.25 : 1), x = -260 + i * 40 + zufall(-12, 12), z = istHinten ? -25 : 0;
      const k = teil(wahl(istHinten ? hinten : vorn), mat, g, x, 0, z); k.castShadow = false; k.scale.set(r, h, r); k.rotation.y = zufall(0, 6);
    }
    return g;
  }
  // läuft in der Luftwelt: Wasserfälle fließen, Brennerflammen flackern
  const luftSchritt = (t) => { wasserfallBild.offset.y = t * .9; ballonM.flamme.emissiveIntensity = 2 + Math.sin(t * 17) * .5 + Math.sin(t * 41) * .4; };
  return { luftSchritt, bojenBlinken, kielwasser, kufenspuren, insCockpit, ausCockpit, buckel, bergkette, schlitten, tor, boot, pylone, boje, wasserFlaeche, flieger, ring, heissluftballon, gewitter, voegel, insel, regenbogen, wolkenMeer, wolkenBild, wolkenBallen, strahlen };
}
