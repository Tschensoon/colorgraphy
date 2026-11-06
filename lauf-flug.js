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

  // Spielzeug-Flugzeug; „sitz“ ist der Platz für Fröbelinchen bzw. Anja
  function flieger(anja) {
    const g = new T.Group();
    const r = teil(new T.CapsuleGeometry(.55, 2.4, 8, 20), anja ? M.rumpfAnja : M.rumpf, g, 0, 0, 0); r.rotation.x = Math.PI / 2;
    teil(new T.BoxGeometry(5.2, .12, 1.1), anja ? M.fluegelAnja : M.fluegel, g, 0, -.15, -.2);
    teil(new T.BoxGeometry(2, .1, .6), anja ? M.fluegelAnja : M.fluegel, g, 0, .1, 1.55);
    teil(new T.BoxGeometry(.1, .8, .6), anja ? M.rumpfAnja : M.rumpf, g, 0, .5, 1.55);
    const nase = teil(kugel, M.dunkel, g, 0, 0, -1.75); nase.scale.set(.25, .25, .2);
    const propeller = gelenk(g, 0, 0, -1.9);
    for (let i = 0; i < 2; i++) { const b = teil(new T.BoxGeometry(.14, 1.5, .04), M.dunkel, propeller); b.rotation.z = i * Math.PI / 2; }
    const scheibe = teil(new T.SphereGeometry(.45, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.glas, g, 0, .4, -1.15); scheibe.scale.z = .6;
    const sitz = gelenk(g, 0, .1, .1);
    return { gruppe: g, propeller, sitz };
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
  // Level 3: Boot (Fröbelinchen gelb mit rotem Rand, Anja rosa mit weißem Rand), „sitz“ wie beim Flugzeug
  function boot(anja) {
    const g = new T.Group();
    const r = teil(new T.CapsuleGeometry(.75, 2, 8, 20), anja ? M.rumpfAnja : M.bootGelb, g, 0, .05, 0); r.rotation.x = Math.PI / 2; r.scale.set(1, 1, .5);
    const deck = teil(new T.CapsuleGeometry(.8, 2.05, 6, 20), anja ? M.fluegelAnja : M.rumpf, g, 0, .26, 0); deck.rotation.x = Math.PI / 2; deck.scale.set(1, 1, .08);
    teil(new T.BoxGeometry(.8, .45, .45), M.dunkel, g, 0, .45, 1.5);                     // Außenbordmotor
    const propeller = gelenk(g, 0, .02, 1.78);
    for (let i = 0; i < 3; i++) { const b = teil(new T.BoxGeometry(.07, .42, .04), M.dunkel, propeller); b.rotation.z = i * Math.PI * 2 / 3; }
    const scheibe = teil(new T.SphereGeometry(.45, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.glas, g, 0, .3, -1.05); scheibe.scale.set(1.3, .7, .5);
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
  function schlitten(anja) {
    const g = new T.Group(), h = anja ? SM.holzAnja : SM.holz;
    for (const sx of [-.42, .42]) {
      teil(new T.BoxGeometry(.07, .07, 2), SM.kufe, g, sx, .04, .1);
      teil(new T.BoxGeometry(.07, .07, .5), SM.kufe, g, sx, .23, -1.05).rotation.x = .9;   // vorn hochgebogen
      for (const sz of [-.6, .6]) teil(new T.BoxGeometry(.06, .26, .06), h, g, sx, .19, sz);
    }
    for (let i = 0; i < 5; i++) teil(new T.BoxGeometry(1, .05, .22), h, g, 0, .33, -.6 + i * .3);   // Sitzlatten
    teil(new T.BoxGeometry(.95, .05, .06), h, g, 0, .4, -1.2);
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
  return { buckel, bergkette, schlitten, tor, boot, pylone, boje, wasserFlaeche, flieger, ring, heissluftballon, gewitter, voegel, insel, regenbogen, wolkenMeer, wolkenBild, wolkenBallen, strahlen };
}
