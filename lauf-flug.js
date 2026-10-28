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
  return { flieger, ring, heissluftballon, gewitter, voegel, insel, regenbogen, wolkenMeer, wolkenBild, wolkenBallen, strahlen };
}
