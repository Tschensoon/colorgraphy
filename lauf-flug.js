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
  const ballonBild = (farben) => leinwand(256, 128, (g, w, h) => { farben.forEach((c, i) => { g.fillStyle = c; g.fillRect(i * w / farben.length, 0, w / farben.length + 1, h); }); });
  const BALLON = [["#e53935", "#fdd835", "#e53935", "#fdd835", "#e53935", "#fdd835"], ["#1e88e5", "#ffffff", "#1e88e5", "#ffffff", "#1e88e5", "#ffffff"],
    ["#8e24aa", "#ff8a3d", "#43a047", "#8e24aa", "#ff8a3d", "#43a047"]].map(f => std({ map: ballonBild(f), roughness: .5 }));
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
  function flieger(anja) {
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

  function ring() {
    const g = new T.Group(); teil(ringGeo, M.ring, g); return g;
  }
  function heissluftballon() {
    const g = new T.Group();
    const h = teil(kugel, wahl(BALLON), g, 0, 1.2, 0); h.scale.set(1.9, 2.2, 1.9);
    teil(new T.BoxGeometry(.8, .6, .8), M.korb, g, 0, -1.6, 0);
    for (const [x, z] of [[-.35, -.35], [.35, -.35], [-.35, .35], [.35, .35]]) {
      g.add(new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(x, -1.3, z), new T.Vector3(x * 3, -.4, z * 3)]), M.seil));
    }
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
  function insel() {
    const g = new T.Group(), r = zufall(3, 6);
    const fels = teil(new T.ConeGeometry(r, r * 1.6, 9), M.fels, g, 0, -r * .8, 0); fels.rotation.x = Math.PI;
    teil(new T.CylinderGeometry(r, r * .95, .5, 9), M.gras, g, 0, .15, 0);
    for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) {
      const t = W.dekoFuer(0); t.position.set(zufall(-r * .5, r * .5), .4, zufall(-r * .5, r * .5)); t.scale.setScalar(.6); g.add(t);
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
  // Pylone auf einem schwimmenden Sockel
  const pylonGeo = { sockel: new T.CylinderGeometry(.55, .6, .18, 16), kegel: new T.ConeGeometry(.36, 1.15, 20), band: new T.CylinderGeometry(.215, .27, .2, 20) };
  for (const k of Object.values(pylonGeo)) k.userData.geteilt = true;
  function pylone() {
    const g = new T.Group();
    teil(pylonGeo.sockel, M.dunkel, g, 0, .05, 0); teil(pylonGeo.kegel, M.pylone, g, 0, .7, 0); teil(pylonGeo.band, M.weiss, g, 0, .62, 0);
    return g;
  }
  function boje() {
    const g = new T.Group();
    teil(kugel, M.bojeRot, g, 0, .25, 0).scale.set(.45, .4, .45);
    teil(new T.CylinderGeometry(.04, .04, 1, 6), M.weiss, g, 0, .9, 0);
    teil(kugel, M.weiss, g, 0, 1.42, 0).scale.setScalar(.09);
    return g;
  }
  // Wasserfläche mit wandernden Wellen (Normalenkarte aus der Welt, hier fein wiederholt)
  function wasserFlaeche(wellen) {
    const t = wellen.clone(); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(80, 80); t.needsUpdate = true;
    const k = new T.Mesh(new T.PlaneGeometry(600, 600).rotateX(-Math.PI / 2),
      std({ color: "#2b8bcc", roughness: .12, metalness: .25, normalMap: t, normalScale: new T.Vector2(.7, .7), envMapIntensity: 1.3 }));
    k.receiveShadow = true; k.userData.wellen = t;
    return k;
  }
  // Schlittenfahrt im Winterland: Holzschlitten mit Metallkufen und Slalomtore mit Fahnen
  const SM = {
    holz: std({ color: "#b5733a", roughness: .7 }), holzAnja: std({ color: "#f48fb1", roughness: .6 }),
    kufe: std({ color: "#9aa0a8", roughness: .3, metalness: .7 }),
    rot: std({ color: "#e53935", roughness: .6, side: T.DoubleSide }), blau: std({ color: "#1e63d6", roughness: .6, side: T.DoubleSide }),
    schnee: std({ color: "#ffffff", roughness: .9 }), buckel: std({ color: "#eef3fa", roughness: 1 }),
  };
  const torGeo = { stange: new T.CylinderGeometry(.045, .045, 1.8, 8), fahne: new T.PlaneGeometry(.75, .55).translate(.375, 0, 0), huegel: new T.SphereGeometry(.3, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2) };
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
    const g = new T.Group(), m = blau ? SM.blau : SM.rot, fahnen = [];
    for (const sx of [-1, 1]) {
      const x = sx * breite / 2;
      teil(torGeo.stange, m, g, x, .9, 0);
      teil(torGeo.huegel, SM.schnee, g, x, -.08, 0).castShadow = false;
      const f = gelenk(g, x, 1.45, 0); f.rotation.y = sx > 0 ? Math.PI : 0;   // Fahne zeigt ins Tor hinein
      teil(torGeo.fahne, m, f); fahnen.push(f);
    }
    g.userData.fahnen = fahnen;
    return g;
  }
  // Bergkette im Tal vor dem Hang: liegt tiefer als die Piste, so sieht man, dass es bergab geht
  function buckel() {                         // kleine Schneehügel: ziehen vorbei und zeigen, wie schnell es geht
    const k = new T.Mesh(torGeo.huegel, SM.buckel); k.scale.set(zufall(2, 4.5), zufall(.6, 1.1), zufall(2, 4)); k.receiveShadow = true; return k;
  }
  function bergkette() {
    const g = new T.Group(), fels = new T.MeshBasicMaterial({ color: "#a9bccf", fog: false }), fern = new T.MeshBasicMaterial({ color: "#c7d5e3", fog: false }),
      kappe = new T.MeshBasicMaterial({ color: "#f7fafd", fog: false });
    for (let i = 0; i < 14; i++) {
      const hinten = i % 2 === 1, r = zufall(28, 55) * (hinten ? 1.3 : 1), h = zufall(45, 85) * (hinten ? 1.25 : 1), x = -260 + i * 40 + zufall(-12, 12), z = hinten ? -25 : 0;
      teil(new T.ConeGeometry(r, h, 7), hinten ? fern : fels, g, x, h / 2, z).castShadow = false;
      teil(new T.ConeGeometry(r * .36, h * .36, 7), kappe, g, x, h * .82 + .5, z).castShadow = false;
    }
    return g;
  }
  return { insCockpit, ausCockpit, buckel, bergkette, schlitten, tor, boot, pylone, boje, wasserFlaeche, flieger, ring, heissluftballon, gewitter, voegel, insel, regenbogen, wolkenMeer, wolkenBild, wolkenBallen, strahlen };
}
