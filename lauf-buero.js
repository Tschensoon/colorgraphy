// Sonderphase „Ankes Büro“: Anke hat Fröbelinchen in einem Schrank versteckt. Hier stehen nur die Bausteine
// (Büro, Schränke mit Fächern und Türen, Inhalt der Fächer); den Ablauf (suchen, Hinweise, Anke kommt zurück) steuert lauf.js.
export function bueroWelt(T, W) {
  const std = (o) => new T.MeshStandardMaterial(o);
  const kiste = (b, h, t) => new T.BoxGeometry(b, h, t);
  const zufall = (a, b) => a + Math.random() * (b - a), wahl = (l) => l[Math.floor(Math.random() * l.length)];
  const teil = (geom, m, eltern, x = 0, y = 0, z = 0) => { const k = new T.Mesh(geom, m); k.position.set(x, y, z); k.castShadow = true; k.receiveShadow = true; eltern.add(k); return k; };
  const uvSkala = (geo, su, sv) => { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); return geo; };
  const M = {
    wand: std({ color: "#eef0ec", roughness: .95 }), sockel: std({ color: "#3baa35", roughness: .8 }),
    metall: std({ color: "#c3c9cf", roughness: .42, metalness: .35 }), holz: std({ color: "#dcc39a", roughness: .65 }), weiss: std({ color: "#f3f2ee", roughness: .5 }),
    griff: std({ color: "#5a5f66", roughness: .3, metalness: .7 }), innen: std({ color: "#46423d", roughness: 1 }), schwarz: std({ color: "#25272b", roughness: .5 }),
    tuer: std({ color: "#b98a55", roughness: .65 }), rahmen: std({ color: "#ffffff", roughness: .45 }),
    himmel: new T.MeshBasicMaterial({ color: "#bfe3ff" }), wolke: new T.MeshBasicMaterial({ color: "#ffffff" }),
    bildschirm: std({ color: "#1d2a38", emissive: "#3d7bd6", emissiveIntensity: .55, roughness: .2 }), tisch: std({ color: "#ece6da", roughness: .55 }),
    pflanze: std({ color: "#3f8f3a", roughness: .8, side: T.DoubleSide }), topf: std({ color: "#c96a3a", roughness: .8 }),
    papier: std({ color: "#fbfbf7", roughness: .9 }), tasse: std({ color: "#ffffff", roughness: .3 }), kaffee: std({ color: "#4a2c1a", roughness: .3 }),
    schild: std({ color: "#ffffff", roughness: .8 }), uhr: std({ color: "#ffffff", roughness: .4 }),
    gruen: std({ color: "#2e5a3a", roughness: .9 }), decke: new T.MeshBasicMaterial({ color: "#dfe1de" }), anthrazit: std({ color: "#3a3d40", roughness: .6 }),
    korb: std({ color: "#c9b38a", roughness: .9 }), gruenKiste: std({ color: "#3f8a4a", roughness: .7 }), topfGrau: std({ color: "#6b6e70", roughness: .5 }),
    papiertuete: std({ color: "#b98d5c", roughness: .95 }), milch: std({ color: "#e7ebe8", roughness: .3 }),
  };
  const bunt = ["#e53935", "#1e88e5", "#fdd835", "#43a047", "#8e24aa", "#fb8c00"].map(c => std({ color: c, roughness: .6 }));

  // Bilder für Fliesen, Jahresplaner, Whiteboard und den Blick aus dem Fenster (einmal gemalt)
  const leinwand = (w, h, malen) => { const c = document.createElement("canvas"); c.width = w; c.height = h; malen(c.getContext("2d"), w, h); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t; };
  const fliesen = leinwand(512, 512, (g, w, h) => {
    g.fillStyle = "#5c5e5f"; g.fillRect(0, 0, w, h);
    for (let y = 0; y < 4; y++) for (let x = -1; x < 2; x++) {          // große Fliesen, halb versetzt
      const ox = (y % 2) * w / 4, f = 92 + Math.random() * 18;
      g.fillStyle = `rgb(${f},${f + 2},${f + 3})`; g.fillRect(x * w / 2 + ox + 2, y * h / 4 + 2, w / 2 - 4, h / 4 - 4);
    }
    for (let i = 0; i < 9000; i++) { const v = Math.random() * 40 - 20; g.fillStyle = `rgba(${128 + v},${128 + v},${130 + v},.08)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  });
  fliesen.wrapS = fliesen.wrapT = T.RepeatWrapping;
  const planer = leinwand(512, 360, (g, w, h) => {
    g.fillStyle = "#fbfbf6"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#3c8b4a"; g.fillRect(0, 0, w, 26);
    for (let m = 0; m < 12; m++) for (let d = 0; d < 31; d++) {
      const x = 8 + m * 41.5, y = 32 + d * 10.4, wochenende = (d + m * 3) % 7 >= 5;
      g.fillStyle = wochenende ? "#cfe6c4" : Math.random() < .12 ? "#f6e27a" : "#eef4ea"; g.fillRect(x, y, 38, 9);
    }
  });
  const tafel = leinwand(256, 180, (g, w, h) => {
    g.fillStyle = "#f7fafa"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 6; i++) { g.fillStyle = ["#e9e6dc", "#fff6b3", "#f3f3f3"][i % 3]; g.fillRect(90 + (i % 2) * 70, 20 + Math.floor(i / 2) * 50, 56, 40); }
    g.strokeStyle = "#7a8fa0"; g.lineWidth = 2; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(16, 30 + i * 26); g.lineTo(64, 30 + i * 26); g.stroke(); }
  });
  const draussen = leinwand(256, 200, (g, w, h) => {
    const v = g.createLinearGradient(0, 0, 0, h); v.addColorStop(0, "#dfe9f2"); v.addColorStop(.62, "#f4f1ea"); v.addColorStop(.66, "#8d9a6a"); v.addColorStop(1, "#a5ad8a");
    g.fillStyle = v; g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(90,90,90,.55)"; g.lineWidth = 2; g.beginPath(); g.moveTo(0, h * .8); g.lineTo(w, h * .78); g.stroke();   // Geländer
  });

  // --- Raum nach dem echten Büro: dunkle Fliesen, grüne Wand mit Jahresplaner und Whiteboard, weißer Schreibtisch
  //     mit zwei Bildschirmen, Fenster mit Pflanzen über einem Sideboard, weiße Tür rechts mit Papiertüten davor ---
  function raum() {
    const g = new T.Group();
    const bodenGeo = new T.PlaneGeometry(16, 12); uvSkala(bodenGeo, 16 / 2.4, 12 / 2.4);
    const boden = new T.Mesh(bodenGeo.rotateX(-Math.PI / 2), std({ map: fliesen, roughness: .55 })); boden.receiveShadow = true; g.add(boden);
    const weissW = new T.Mesh(new T.PlaneGeometry(13, 3.2), M.wand); weissW.position.set(4.2, 1.6, -1.25); weissW.receiveShadow = true; g.add(weissW);
    const gruen = new T.Mesh(new T.PlaneGeometry(6, 3.2), M.gruen); gruen.position.set(-5.3, 1.6, -1.25); gruen.receiveShadow = true; g.add(gruen);
    const decke = new T.Mesh(new T.PlaneGeometry(16, 12).rotateX(Math.PI / 2), M.decke); decke.position.set(0, 3.2, 4); g.add(decke);
    for (const s of [-1, 1]) { const w = new T.Mesh(new T.PlaneGeometry(10, 3.2), M.wand); w.position.set(s * 7, 1.6, 3.75); w.rotation.y = -s * Math.PI / 2; g.add(w); }
    // Grüne Wand: Jahresplaner und Whiteboard
    teil(new T.PlaneGeometry(1.5, 1.05), std({ map: planer, roughness: .8 }), g, -4.1, 1.75, -1.235).castShadow = false;
    teil(new T.BoxGeometry(.78, .56, .02), std({ map: tafel, roughness: .25 }), g, -2.95, 1.62, -1.23);
    // Schreibtisch vor der grünen Wand mit zwei Bildschirmen, Pflanze und weißem Rollcontainer
    const tisch = new T.Group(); tisch.position.set(-3.55, 0, -.62); g.add(tisch);
    teil(kiste(1.9, .04, .8), M.tisch, tisch, 0, .74, 0);
    for (const x of [-.9, .9]) for (const z of [-.35, .35]) teil(new T.CylinderGeometry(.025, .025, .72, 8), M.griff, tisch, x, .36, z);
    for (const x of [-.32, .3]) { teil(kiste(.56, .34, .03), M.bildschirm, tisch, x, 1.06, -.22).rotation.y = x < 0 ? .12 : -.12; teil(kiste(.05, .2, .05), M.schwarz, tisch, x, .86, -.24); }
    teil(kiste(.45, .02, .15), M.schwarz, tisch, 0, .77, .1);
    teil(new T.CylinderGeometry(.045, .04, .1, 14), M.tasse, tisch, .62, .81, .05);
    for (let i = 0; i < 4; i++) teil(kiste(.3, .012, .21), M.papier, tisch, -.65, .768 + i * .012, .12).rotation.y = zufall(-.2, .2);
    teil(kiste(.44, .58, .58), M.weiss, tisch, .55, .3, .08);                     // Rollcontainer
    for (const y of [.18, .4]) teil(kiste(.25, .02, .02), M.griff, tisch, .55, y, .38);
    pflanze(tisch, -.85, .76, -.25, .9);
    const stuhl = new T.Group(); stuhl.position.set(.1, 0, .7); stuhl.rotation.y = Math.PI - .3; tisch.add(stuhl);
    teil(new T.CylinderGeometry(.26, .26, .08, 20), M.schwarz, stuhl, 0, .5, 0); teil(kiste(.48, .62, .07), M.schwarz, stuhl, 0, .88, .24);
    teil(new T.CylinderGeometry(.03, .03, .45, 8), M.griff, stuhl, 0, .25, 0);
    // Fenster mit Fensterbank, zwei Pflanzen und dunklem Sideboard mit Kisten darunter
    const fenster = new T.Group(); fenster.position.set(2.75, 1.72, -1.22); g.add(fenster);
    teil(new T.PlaneGeometry(1.7, 1.15), new T.MeshBasicMaterial({ map: draussen }), fenster, 0, 0, .005).castShadow = false;
    for (const [b, h, x, y] of [[1.82, .08, 0, .6], [1.82, .08, 0, -.6], [.08, 1.28, .87, 0], [.08, 1.28, -.87, 0], [.06, 1.2, 0, 0]]) teil(kiste(b, h, .07), M.rahmen, fenster, x, y, .035);
    teil(kiste(2.0, .05, .26), M.rahmen, fenster, 0, -.66, .12);
    pflanze(fenster, .55, -.63, .12, 1); pflanze(fenster, -.45, -.63, .12, .45);
    const sb = new T.Group(); sb.position.set(2.75, 0, -1.0); g.add(sb);
    teil(kiste(1.9, .72, .45), M.anthrazit, sb, 0, .36, 0); teil(kiste(1.95, .03, .48), M.holz, sb, 0, .735, 0);
    for (let i = 0; i < 4; i++) for (let r = 0; r < 2; r++) {
      teil(kiste(.4, .27, .02), M.innen, sb, -.67 + i * .45, .2 + r * .32, .215).castShadow = false;
      if ((i + r) % 2 === 0) teil(kiste(.36, .22, .1), r ? M.korb : M.gruenKiste, sb, -.67 + i * .45, .17 + r * .32, .25);
    }
    // Weiße Tür ganz rechts, davor Papiertüten: Anke kommt hier zurück
    const tuerRahmen = new T.Group(); tuerRahmen.position.set(4.75, 0, -1.22); g.add(tuerRahmen);
    for (const [b, h, x, y] of [[.08, 2.22, -.52, 1.11], [.08, 2.22, .52, 1.11], [1.12, .08, 0, 2.18]]) teil(kiste(b, h, .12), M.rahmen, tuerRahmen, x, y, .02);
    teil(new T.PlaneGeometry(.96, 2.14), M.innen, tuerRahmen, 0, 1.07, -.02);
    const tuerAngel = new T.Group(); tuerAngel.position.set(-.48, 0, .02); tuerRahmen.add(tuerAngel);
    const blatt = teil(kiste(.96, 2.12, .045), M.weiss, tuerAngel, .48, 1.07, 0);
    teil(kiste(.14, .025, .03), M.griff, blatt, .36, -.02, .05); teil(new T.CylinderGeometry(.015, .015, .04, 8).rotateX(Math.PI / 2), M.griff, blatt, .4, -.12, .03);
    for (let i = 0; i < 5; i++) {
      const hoch = zufall(.38, .5);
      const tt = teil(kiste(.34, hoch, .2), M.papiertuete, g, 3.75 + (i % 3) * .2 + zufall(-.05, .05), hoch / 2, -.95 + Math.floor(i / 3) * .25);
      tt.rotation.set(zufall(-.1, .05), zufall(-.4, .4), zufall(-.06, .06));
    }
    return { gruppe: g, tuerAngel, zeiger: [] };
  }
  function pflanze(eltern, x, y, z, gr) {
    const pf = new T.Group(); pf.position.set(x, y, z); pf.scale.setScalar(gr); eltern.add(pf);
    teil(new T.CylinderGeometry(.14, .11, .26, 16), M.topfGrau, pf, 0, .13, 0);
    for (let i = 0; i < 11; i++) { const b = teil(new T.SphereGeometry(1, 10, 6), M.pflanze, pf, zufall(-.12, .12), zufall(.35, .7), zufall(-.12, .12)); b.scale.set(.055, .22, .02); b.rotation.set(zufall(-.8, .8), zufall(0, 3), zufall(-.8, .8)); }
  }

  // --- Schrank mit übereinanderliegenden Fächern; jedes Fach hat eine eigene Tür und kann das Versteck sein ---
  function schrank(art, faecher) {
    const g = new T.Group(), b = art === "akten" ? .95 : 1.05, h = 2.05, t = .55, w = .035;
    const korpus = M.holz, front = art === "akten" ? M.metall : art === "weiss" ? M.milch : M.holz;   // Schrankwand wie im Büro: heller Holzkorpus
    teil(kiste(b - w * 2 - .002, h - w - .08, w), M.innen, g, 0, .08 + (h - w - .08) / 2, -t / 2 + w / 2);
    // Teile stoßen nur aneinander, nie mit gleicher Fläche übereinander (sonst flimmert es)
    for (const s of [-1, 1]) teil(kiste(w, h - w - .002, t - .004), korpus, g, s * (b / 2 - w / 2), (h - w) / 2, 0);
    teil(kiste(b - .06, .078, t - .08), M.schwarz, g, 0, .039, -.02);
    teil(kiste(b - w * 2 - .002, w, t - .02), korpus, g, 0, .08 + w / 2, -.008);
    teil(kiste(b + .03, w, t + .03), korpus, g, 0, h - w / 2 + .001, 0);
    const fachH = (h - .08 - w * 2) / faecher, verstecke = [];
    for (let i = 0; i < faecher; i++) {
      const y0 = .08 + w + i * fachH;
      if (i > 0) teil(kiste(b - w * 2 - .002, w, t - w - .02), korpus, g, 0, y0, w / 2 - .012);
      const links = (i + (art === "weiss" ? 1 : 0)) % 2 === 0;           // Scharniere abwechselnd links und rechts
      const angel = new T.Group(); angel.position.set(links ? -b / 2 : b / 2, y0 + fachH / 2, t / 2); g.add(angel);
      const tm = front.clone(), breit = b - .012;
      const tuer = teil(kiste(breit, fachH - .014, .028), tm, angel, links ? breit / 2 : -breit / 2, 0, .014);
      teil(kiste(.028, Math.min(.18, fachH * .4), .03), M.griff, tuer, links ? breit / 2 - .08 : -breit / 2 + .08, 0, .03);
      if (art === "akten") { const s = teil(kiste(.2, .07, .005), M.schild, tuer, 0, fachH * .3, .016); s.castShadow = false; }
      const inhalt = new T.Group(); inhalt.position.set(0, y0 + w / 2, -.03); g.add(inhalt);
      const v = { angel, tuer, mat: tm, links, inhalt, breite: b, tiefe: t, hoehe: fachH - w, y0, offen: 0, ziel: 0, wackel: 0, schrank: g };
      tuer.userData.versteck = v;
      verstecke.push(v);
    }
    g.userData.breite = b;
    return { gruppe: g, verstecke };
  }

  // --- Was in einem leeren Fach liegt (mit Text für die Meldung) ---
  function fuellen(v) {
    const g = v.inhalt, b = v.breite - .12, h = v.hoehe, art = wahl(["ordner", "ordner", "papier", "tassen", "bastel", "schirm"]);
    if (art === "ordner") {
      const n = Math.floor(b / .085), oh = Math.min(.32, h * .85);
      for (let i = 0; i < n; i++) { const o = teil(kiste(.07, oh, .28), wahl(bunt), g, -b / 2 + .05 + i * .085, oh / 2, 0); o.rotation.z = i === n - 1 ? -.15 : 0; }
      return "Nur Ordner …";
    }
    if (art === "papier") { for (let s = 0; s < 3; s++) for (let i = 0; i < 6; i++) teil(kiste(.3, .025, .21), M.papier, g, -b / 3 + s * b / 3, .015 + i * .026, 0).rotation.y = zufall(-.15, .15); return "Nur Papierstapel …"; }
    if (art === "tassen") { for (let i = 0; i < 5; i++) { const x = -b / 2 + .12 + i * (b - .24) / 4; teil(new T.CylinderGeometry(.045, .04, .1, 14), wahl([M.tasse, ...bunt]), g, x, .05, zufall(-.05, .05)); } return "Nur Kaffeetassen …"; }
    if (art === "bastel") {
      teil(kiste(b * .7, .18, .32), M.holz, g, 0, .09, 0);
      for (let i = 0; i < 6; i++) teil(kiste(.21, .005, .3), wahl(bunt), g, zufall(-b * .25, b * .25), .185 + i * .006, 0).rotation.y = zufall(-.3, .3);
      return "Nur Bastelpapier …";
    }
    const s = teil(new T.CylinderGeometry(.025, .025, Math.min(.7, h * .9), 8), wahl(bunt), g, 0, Math.min(.35, h * .45), 0); s.rotation.z = .35;
    return "Nur ein Regenschirm …";
  }

  // --- Ohrenspitze, die aus einem Türspalt guckt (Hinweis) ---
  function ohr() {
    const g = new T.Group(), m = std({ color: "#ee8b18", roughness: .9 });
    teil(new T.SphereGeometry(1, 12, 8), m, g).scale.set(.035, .07, .02);
    teil(new T.ConeGeometry(.02, .05, 10), std({ color: "#7a3f12", roughness: .9 }), g, 0, .08, 0);
    return g;
  }
  return { raum, schrank, fuellen, ohr };
}
