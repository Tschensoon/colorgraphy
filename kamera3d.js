// Sony α7 II in Einzelteilen: vereinfachtes 3D-Modell (Three.js), das beim Scrollen auseinanderfliegt.
// Maße in Zentimetern, Objektivachse zeigt nach +z. Texte der Bauteile kommen aus der Liste im HTML.
const sektion = document.getElementById("innenleben");
const kannWebGL = (() => {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch (e) {
    return false;
  }
})();

if (sektion && kannWebGL) {
  sektion.classList.add("is-3d");
  const beobachter = new IntersectionObserver((eintraege) => {
    if (!eintraege.some((e) => e.isIntersecting)) return;
    beobachter.disconnect();
    Promise.all([import("./vendor/three/three.module.min.js"), import("./vendor/three/RoomEnvironment.js")])
      .then(([THREE, { RoomEnvironment }]) => aufbauen(THREE, RoomEnvironment))
      .catch(() => sektion.classList.remove("is-3d"));
  }, { rootMargin: "1200px 0px" });
  beobachter.observe(sektion);
}

function aufbauen(T, RoomEnvironment) {
  const buehne = sektion.querySelector(".xray-stage");
  const spur = sektion.querySelector(".xray-track");
  const canvas = sektion.querySelector(".xray-canvas");
  const ebene = sektion.querySelector(".xray-labels");
  const unterzeile = sektion.querySelector(".xray-caption");
  const liste = [...sektion.querySelectorAll(".xray-list li")].map((li) => ({
    key: li.dataset.teil,
    name: li.querySelector("strong").textContent,
    text: li.querySelector("span").textContent,
  }));

  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = T.ACESFilmicToneMapping;
  const szene = new T.Scene();
  const pmrem = new T.PMREMGenerator(renderer);
  szene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  const kamera = new T.PerspectiveCamera(30, 1, 0.5, 400);
  const licht = new T.DirectionalLight(0xffffff, 1.8);
  licht.position.set(10, 16, 14);
  szene.add(licht);
  const randlicht = new T.DirectionalLight(0x8b5cf6, 2.2);
  randlicht.position.set(-14, 6, -12);
  szene.add(randlicht);
  const modell = new T.Group();
  szene.add(modell);

  // Bild auf Display und Sucher: kleiner Sonnenuntergang mit Autofokus-Rahmen
  const bild = (() => {
    const c = document.createElement("canvas");
    c.width = 300; c.height = 200;
    const g = c.getContext("2d");
    const himmel = g.createLinearGradient(0, 0, 0, 200);
    himmel.addColorStop(0, "#4f6bff"); himmel.addColorStop(0.45, "#8b5cf6"); himmel.addColorStop(0.75, "#ff4d6d"); himmel.addColorStop(1, "#ffb020");
    g.fillStyle = himmel; g.fillRect(0, 0, 300, 200);
    g.fillStyle = "#ffe08a"; g.beginPath(); g.arc(190, 128, 26, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#1a1030"; g.beginPath(); g.moveTo(0, 200); g.lineTo(0, 140); g.lineTo(70, 105); g.lineTo(130, 150); g.lineTo(210, 120); g.lineTo(300, 160); g.lineTo(300, 200); g.fill();
    g.strokeStyle = "#45d562"; g.lineWidth = 4; g.strokeRect(166, 104, 48, 48);
    const t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace;
    return t;
  })();

  const mat = {
    gehaeuse: () => new T.MeshStandardMaterial({ color: 0x1e1e24, roughness: 0.48, metalness: 0.3 }),
    gummi: () => new T.MeshStandardMaterial({ color: 0x131316, roughness: 0.92 }),
    metall: () => new T.MeshStandardMaterial({ color: 0xc9ccd4, roughness: 0.26, metalness: 1 }),
    dunkelmetall: () => new T.MeshStandardMaterial({ color: 0x45464e, roughness: 0.35, metalness: 0.9 }),
    gold: () => new T.MeshStandardMaterial({ color: 0xe2b65c, roughness: 0.25, metalness: 1 }),
    kupfer: () => new T.MeshStandardMaterial({ color: 0xc47a42, roughness: 0.3, metalness: 1 }),
    glas: () => new T.MeshPhysicalMaterial({ color: 0xc4e6ff, roughness: 0.03, transparent: true, opacity: 0.38, clearcoat: 1, side: T.DoubleSide, depthWrite: false }),
    platine: () => new T.MeshStandardMaterial({ color: 0x115e3c, roughness: 0.55, metalness: 0.15 }),
    chip: () => new T.MeshStandardMaterial({ color: 0x0d0d10, roughness: 0.35, metalness: 0.4 }),
    keramik: () => new T.MeshStandardMaterial({ color: 0x9a8457, roughness: 0.45, metalness: 0.5 }),
    sensor: () => new T.MeshPhysicalMaterial({ color: 0x3a2a78, roughness: 0.1, metalness: 0.9, iridescence: 1, iridescenceIOR: 1.8, iridescenceThicknessRange: [250, 900] }),
    akzent: () => new T.MeshStandardMaterial({ color: 0x8b5cf6, roughness: 0.4, metalness: 0.2 }),
    weiss: () => new T.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.5 }),
    bildschirm: () => new T.MeshStandardMaterial({ color: 0x000000, roughness: 0.18, emissive: 0xffffff, emissiveMap: bild, emissiveIntensity: 0.95 }),
  };

  // Geometrie-Helfer
  const rundRechteck = (w, h, r) => {
    const s = new T.Shape(), x = -w / 2, y = -h / 2;
    r = Math.max(0.01, Math.min(r, w / 2, h / 2));
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  };
  const kreis = (r, x = 0, y = 0) => new T.Path().absarc(x, y, r, 0, Math.PI * 2, true);
  const kasten = (w, h, d, r = 0.3, loecher = []) => {
    const b = Math.min(r * 0.6, d * 0.3, 0.25);
    const s = rundRechteck(w - 2 * b, h - 2 * b, r - b);
    s.holes.push(...loecher);
    const g = new T.ExtrudeGeometry(s, { depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 10 });
    return g.translate(0, 0, -(d - 2 * b) / 2);
  };
  const ring = (ra, ri, d) => {
    const s = new T.Shape().absarc(0, 0, ra, 0, Math.PI * 2, false);
    s.holes.push(kreis(ri));
    return new T.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 64 }).translate(0, 0, -d / 2);
  };
  const zylinder = (r, h, seg = 48) => new T.CylinderGeometry(r, r, h, seg); // stehend (y)
  const scheibe = (r, d, seg = 48) => new T.CylinderGeometry(r, r, d, seg).rotateX(Math.PI / 2); // liegend (z)
  const linse = (r, t, vorne, hinten) => {
    const p = [];
    for (let i = 0; i <= 12; i++) { const a = i / 12; p.push(new T.Vector2(r * a, -t / 2 - t * hinten * 0.7 * (1 - a * a))); }
    for (let i = 12; i >= 0; i--) { const a = i / 12; p.push(new T.Vector2(r * a, t / 2 + t * vorne * 0.7 * (1 - a * a))); }
    return new T.LatheGeometry(p, 56).rotateX(Math.PI / 2);
  };
  const box = (w, h, d) => new T.BoxGeometry(w, h, d);

  // Bauteile: Gruppe je Teil, Versatz/Drehung im zerlegten Zustand, Reihenfolge der Explosion
  const teile = {};
  const teil = (key, versatz, { drehpunkt = [0, 0, 0], drehung = [0, 0, 0] } = {}) => {
    const g = new T.Group();
    g.userData = { basis: new T.Vector3(...drehpunkt), versatz: new T.Vector3(...versatz), drehung: new T.Vector3(...drehung), e: 0, licht: 0 };
    g.position.copy(g.userData.basis);
    modell.add(g);
    teile[key] = g;
    return g;
  };
  const stueck = (g, geo, m, pos = [0, 0, 0], { streuung, rot } = {}) => {
    const x = new T.Mesh(geo, m);
    x.position.set(pos[0], pos[1], pos[2]).sub(g.userData.basis);
    if (rot) x.rotation.set(...rot);
    x.userData.basis = x.position.clone();
    if (streuung) x.userData.streuung = new T.Vector3(...streuung);
    g.add(x);
    return x;
  };

  const LX = 0.9, LY = -0.3; // Mitte des Bajonetts

  // Objektiv
  {
    const g = teil("tubus", [0, 9.5, 14]);
    const m = mat.gehaeuse(), gm = mat.gummi(), me = mat.metall();
    stueck(g, ring(3.55, 3.3, 9), m, [LX, LY, 7]);
    stueck(g, ring(2.9, 2.2, 0.5), me, [LX, LY, 2.25]);
    stueck(g, ring(3.72, 3.5, 3), gm, [LX, LY, 5.1]);
    stueck(g, ring(3.66, 3.5, 1.6), gm, [LX, LY, 9.1]);
    stueck(g, ring(3.62, 3.05, 0.6), m, [LX, LY, 11.55]);
    stueck(g, ring(3.3, 3.05, 0.14), me, [LX, LY, 11.9]);
    stueck(g, box(0.07, 0.3, 0.6), mat.weiss(), [LX, LY + 3.6, 7.2]);
    // Rippen von Zoom- und Fokusring
    const rippe = box(0.13, 0.12, 1);
    [[5.1, 2.8, 3.72, 48], [9.1, 1.4, 3.66, 56]].forEach(([z, l, r, n]) => {
      const im = new T.InstancedMesh(rippe, gm, n);
      const h = new T.Object3D();
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        h.position.set(LX + Math.cos(a) * r, LY + Math.sin(a) * r, z).sub(g.userData.basis);
        h.rotation.set(0, 0, a);
        h.scale.set(1, 1, l);
        h.updateMatrix();
        im.setMatrixAt(i, h.matrix);
      }
      g.add(im);
    });
  }
  {
    const g = teil("linsen", [0, 0, 11.5]);
    const m = mat.glas();
    [[3.15, 11.2, 0.55, 0.8, 0.5], [2.9, 10.3, 0.35, -0.5, 0.9], [2.4, 8.5, 0.5, 0.9, 0.9], [2.0, 7.5, 0.3, -0.4, -0.4],
      [2.2, 5.6, 0.5, 0.8, 0.8], [2.5, 4.2, 0.45, 0.6, 0.9], [2.7, 3.1, 0.4, 0.9, 0.4]]
      .forEach(([r, z, t, v, h], i) => stueck(g, linse(r, t, v, h), m, [LX, LY, z], { streuung: [0, 0, (6 - i) * 1.25] }));
  }
  {
    const g = teil("blende", [0, 0, 14.3]);
    const dm = mat.dunkelmetall();
    stueck(g, ring(2.9, 2.1, 0.2), dm, [LX, LY, 6.5]);
    const lamelle = box(1.9, 0.9, 0.03);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      stueck(g, lamelle, dm, [LX + Math.cos(a) * 1.55, LY + Math.sin(a) * 1.55, 6.5 + (i % 2) * 0.03], { rot: [0, 0, a + Math.PI / 2 + 0.35] });
    }
  }

  // Bajonett mit Kontakten
  {
    const g = teil("bajonett", [0, 1.2, 8]);
    const me = mat.metall(), go = mat.gold(), dm = mat.dunkelmetall();
    stueck(g, ring(2.95, 2.3, 0.25), me, [LX, LY, 1.85]);
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i * Math.PI) / 2;
      stueck(g, scheibe(0.13, 0.08, 12), dm, [LX + Math.cos(a) * 2.62, LY + Math.sin(a) * 2.62, 2.0]);
    }
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i - 4.5) * 0.085;
      stueck(g, box(0.1, 0.22, 0.06), go, [LX + Math.cos(a) * 2.12, LY + Math.sin(a) * 2.12, 1.92], { rot: [0, 0, a + Math.PI / 2] });
    }
  }

  // Verschluss
  {
    const g = teil("verschluss", [0, 0.8, 5.6]);
    stueck(g, kasten(5.6, 4.4, 0.35, 0.3, [rundRechteck(3.9, 2.7, 0.1)]), mat.dunkelmetall(), [LX, LY, 1.25]);
    const v = mat.metall();
    [1.02, 0.36, -1.02].forEach((dy) => stueck(g, box(3.95, 0.64, 0.04), v, [LX, LY + dy, 1.45]));
  }

  // Bildsensor mit Filter
  {
    const g = teil("sensor", [0, 0.4, 3.3]);
    stueck(g, kasten(4.8, 3.9, 0.3, 0.2), mat.keramik(), [LX, LY, 0.6]);
    stueck(g, box(3.58, 2.39, 0.05), mat.sensor(), [LX, LY, 0.77]);
    stueck(g, box(3.9, 2.7, 0.1), mat.glas(), [LX, LY, 0.95]);
  }

  // Bildstabilisator: Rahmen, Spulen, Magnete
  {
    const g = teil("ibis", [0, 0, 0]);
    stueck(g, kasten(7.2, 5.8, 0.45, 0.4, [rundRechteck(5.0, 4.1, 0.2)]), mat.dunkelmetall(), [LX, LY, 0.2]);
    const ku = mat.kupfer(), sp = new T.TorusGeometry(0.42, 0.16, 12, 28);
    [[-3.05, 2.4], [3.05, 2.4], [-3.05, -2.4], [3.05, -2.4]].forEach(([x, y]) => stueck(g, sp, ku, [LX + x, LY + y, 0.5]));
    const ma = mat.metall();
    [[0, 2.5], [0, -2.5], [-3.1, 0]].forEach(([x, y]) => stueck(g, box(x ? 0.5 : 1.0, x ? 1.0 : 0.5, 0.25), ma, [LX + x, LY + y, 0.5]));
  }

  // Hauptplatine mit Prozessor
  {
    const g = teil("platine", [0, 0, -3.4]);
    stueck(g, kasten(9.4, 6.4, 0.14, 0.3), mat.platine(), [1.0, -0.1, -0.9]);
    const ch = mat.chip(), me = mat.metall(), go = mat.gold();
    stueck(g, kasten(1.7, 1.7, 0.2, 0.08), ch, [3.6, 1.2, -0.74]);
    stueck(g, box(1.3, 1.3, 0.02), me, [3.6, 1.2, -0.63]);
    [[-1.9, 1.9, 1.3, 0.9], [-1.9, -2.0, 1.3, 0.9], [4.4, -1.8, 1.0, 1.4], [0.4, -2.6, 2.2, 0.5]]
      .forEach(([x, y, w, h]) => stueck(g, box(w, h, 0.14), ch, [x, y, -0.78]));
    for (let i = 0; i < 9; i++) stueck(g, zylinder(0.12, 0.3, 10).rotateX(Math.PI / 2), me, [-2.9 + (i % 3) * 0.4, 0.2 + Math.floor(i / 3) * 0.4, -0.7]);
    stueck(g, box(2.6, 0.25, 0.12), go, [1.5, 2.9, -0.78]);
  }

  // Akku und Speicherkarte
  {
    const g = teil("akku", [-2.5, -9, 6]);
    stueck(g, kasten(1.15, 4.6, 3.2, 0.18), new T.MeshStandardMaterial({ color: 0x2a2b31, roughness: 0.6, metalness: 0.2 }), [-4.6, -0.9, 1.2]);
    const go = mat.gold();
    [-0.6, 0, 0.6].forEach((dz) => stueck(g, box(0.5, 0.06, 0.22), go, [-4.6, 1.42, 1.2 + dz]));
    const k = { streuung: [-2.4, 2.2, 0.6] };
    stueck(g, kasten(0.22, 2.4, 3.2, 0.12), mat.chip(), [-5.6, -0.6, 1.4], k);
    stueck(g, box(0.02, 1.6, 2.2), mat.akzent(), [-5.72, -0.75, 1.55], k);
    stueck(g, box(0.02, 0.3, 2.6), go, [-5.72, 0.62, 1.4], k);
  }

  // Elektronischer Sucher mit Zubehörschuh
  {
    const g = teil("sucher", [0, 6.5, -2.5]);
    stueck(g, kasten(5.2, 2.4, 3.4, 0.55), mat.gehaeuse(), [LX, 4.55, 0]);
    stueck(g, kasten(3.8, 2.6, 0.8, 0.5), mat.gummi(), [LX, 4.6, -2.05]);
    stueck(g, box(2.0, 1.4, 0.04), mat.bildschirm(), [LX, 4.6, -2.47], { rot: [0, Math.PI, 0] });
    stueck(g, kasten(2.1, 0.14, 1.9, 0.06), mat.metall(), [LX, 5.78, 0.2]);
  }

  // Klappdisplay (dreht sich am oberen Scharnier auf)
  {
    const g = teil("display", [0, -0.6, -12], { drehpunkt: [1.0, 1.9, -2.45], drehung: [0.55, 0, 0] });
    stueck(g, kasten(7.6, 4.9, 0.4, 0.3), mat.gehaeuse(), [1.0, -0.55, -2.45]);
    stueck(g, new T.PlaneGeometry(7.0, 4.4), mat.bildschirm(), [1.0, -0.55, -2.66], { rot: [0, Math.PI, 0] });
  }

  // Bedienelemente oben
  {
    const g = teil("tasten", [0, 9, 1]);
    const dm = mat.dunkelmetall(), me = mat.metall(), gh = mat.gehaeuse();
    stueck(g, zylinder(1.05, 0.6), dm, [-2.6, 3.9, -0.5]);
    stueck(g, zylinder(0.95, 0.04), me, [-2.6, 4.22, -0.5]);
    stueck(g, box(0.1, 0.03, 0.5), mat.akzent(), [-2.6, 4.25, -0.05]);
    stueck(g, zylinder(0.9, 0.55), dm, [-5.1, 3.88, -1.1]);
    stueck(g, zylinder(0.72, 0.24), gh, [-4.7, 3.52, 2.5]);
    stueck(g, zylinder(0.42, 0.3), me, [-4.7, 3.76, 2.5]);
    stueck(g, zylinder(0.6, 0.26), dm, [-4.7, 3.3, 3.55]);
    [-0.6, 0.4].forEach((x) => stueck(g, zylinder(0.3, 0.2, 24), gh, [x, 3.68, -0.9]));
  }

  // Rückwand mit Tasten
  {
    const g = teil("rueckwand", [0, 0, -7.2]);
    stueck(g, kasten(12.6, 7.2, 0.5, 0.6), mat.gehaeuse(), [0, 0, -1.95]);
    const me = mat.dunkelmetall();
    stueck(g, new T.TorusGeometry(0.78, 0.15, 14, 40), me, [-4.4, -1.4, -2.25]);
    stueck(g, scheibe(0.4, 0.14), me, [-4.4, -1.4, -2.25]);
    [[-4.4, 0.6], [-5.4, 0.6], [-4.4, 2.3], [-3.3, 2.6], [-5.4, -2.9], [-3.4, -2.9]].forEach(([x, y]) => stueck(g, scheibe(0.28, 0.16, 24), me, [x, y, -2.25]));
  }

  // Gehäuse mit Griff (vorne offen fürs Bajonett)
  {
    const g = teil("gehaeuse", [4, -10.5, -5]);
    stueck(g, kasten(12.6, 7.2, 3.4, 0.7, [kreis(2.35, LX, LY)]), mat.gehaeuse(), [0, 0, 0]);
    stueck(g, kasten(3.2, 7.0, 2.2, 1.0), mat.gummi(), [-4.7, -0.1, 2.5]);
    stueck(g, scheibe(0.25, 0.12, 24), mat.akzent(), [-2.4, 2.6, 1.72]);
  }

  // Ablauf
  const explosion = ["tubus", "linsen", "blende", "tasten", "sucher", "rueckwand", "display", "gehaeuse", "akku", "bajonett", "verschluss", "sensor", "platine", "ibis"];
  const AUF_A = 0.05, AUF_B = 0.34, SCHRITTE = 0.37;
  const klemmen = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const weich = (x) => x * x * (3 - 2 * x);
  const akzent = new T.Color(0x8b5cf6).multiplyScalar(0.55);

  // Materialien je Teil für das Hervorheben merken
  Object.values(teile).forEach((g) => {
    const set = new Set();
    g.traverse((o) => o.material && set.add(o.material));
    g.userData.materialien = [...set].map((m) => ({ m, farbe: m.emissive.clone(), staerke: m.emissiveIntensity }));
  });

  // Beschriftungen: Punkt am Teil, Name mit Linie in eine feste Richtung (o/u/l/r), weicht anderen Namen aus
  const RICHTUNG = { linsen: "u", blende: "o", tubus: "o", bajonett: "u", verschluss: "o", sensor: "u", ibis: "o", platine: "u", akku: "u", sucher: "r", display: "r", tasten: "l", rueckwand: "o", gehaeuse: "r" };
  const SVG = "http://www.w3.org/2000/svg";
  const linien = document.createElementNS(SVG, "svg");
  linien.setAttribute("class", "xl-linien");
  ebene.append(linien);
  const marken = liste.map((t, i) => {
    const punkt = document.createElement("span");
    punkt.className = "xl-dot";
    punkt.textContent = i + 1;
    const etikett = document.createElement("span");
    etikett.className = "xl-name";
    etikett.textContent = t.name;
    const linie = document.createElementNS(SVG, "line");
    linien.append(linie);
    ebene.append(etikett, punkt);
    return { ...t, punkt, etikett, linie, richtung: RICHTUNG[t.key], teil: teile[t.key], w: 0, h: 0 };
  });

  const box3 = new T.Box3(), hilf = new T.Box3(), v = new T.Vector3(), mitte = new T.Vector3();
  const blick = new T.Vector3(), ziel3 = new T.Vector3(), zielGlatt = new T.Vector3(), rechts = new T.Vector3(), oben = new T.Vector3();
  let abstandGlatt = 0, breite = 1, hoehe = 1, zuletztAktiv = -3, erstesBild = true;

  const unterzeileSetzen = (i, auf) => {
    const zustand = i >= 0 ? i : auf ? -1 : -2;
    if (zustand === zuletztAktiv) return;
    zuletztAktiv = zustand;
    if (i >= 0) {
      const t = marken[i];
      unterzeile.innerHTML = `<span class="nr">${String(i + 1).padStart(2, "0")} / ${marken.length}</span><strong></strong><p></p>`;
      unterzeile.querySelector("strong").textContent = t.name;
      unterzeile.querySelector("p").textContent = t.text;
    } else {
      unterzeile.innerHTML = auf
        ? `<span class="nr">${marken.length} Bauteile</span><strong>So sieht die Kamera von innen aus.</strong><p>Scroll weiter, dann stelle ich dir jedes Teil einzeln vor.</p>`
        : `<span class="nr">Scroll weiter</span><strong>Gleich fliegt die Kamera auseinander.</strong><p>Ein vereinfachtes Modell meiner Sony α7 II mit dem 24–105 mm.</p>`;
    }
  };

  const zeichnen = (p) => {
    const auf = weich(klemmen((p - AUF_A) / (AUF_B - AUF_A)));
    const schritt = klemmen((p - SCHRITTE) / (1 - SCHRITTE));
    const aktiv = p < SCHRITTE ? -1 : Math.min(marken.length - 1, Math.floor(schritt * marken.length));
    unterzeileSetzen(aktiv, auf > 0.5);
    let bewegt = false;

    explosion.forEach((key, k) => {
      const g = teile[key], d = g.userData;
      const e = weich(klemmen((auf - k * 0.04) / 0.48));
      g.position.copy(d.basis).addScaledVector(d.versatz, e);
      g.rotation.set(d.drehung.x * e, d.drehung.y * e, d.drehung.z * e);
      g.children.forEach((x) => x.userData.streuung && x.position.copy(x.userData.basis).addScaledVector(x.userData.streuung, e));
      // Hervorheben
      const soll = aktiv >= 0 && marken[aktiv].key === key ? 1 : 0;
      d.licht += (soll - d.licht) * 0.2;
      if (Math.abs(soll - d.licht) < 0.01) d.licht = soll; else bewegt = true;
      d.materialien.forEach(({ m, farbe, staerke }) => {
        m.emissive.copy(farbe).lerp(akzent, d.licht);
        m.emissiveIntensity = staerke + (1 - staerke) * d.licht;
      });
    });
    modell.updateMatrixWorld(true);

    // Kamera: schaut schräg von vorne rechts, dreht beim Zerlegen zur Seite
    const schmal = breite < 640;
    const theta = T.MathUtils.degToRad(36 + 22 * auf - 18 * schritt);
    const phi = T.MathUtils.degToRad(15 + 9 * auf);
    blick.set(Math.sin(theta) * Math.cos(phi), Math.sin(phi), Math.cos(theta) * Math.cos(phi));
    box3.makeEmpty();
    modell.children.forEach((g) => box3.union(hilf.setFromObject(g)));
    box3.getCenter(mitte);
    ziel3.copy(mitte);
    if (aktiv >= 0) {
      hilf.setFromObject(marken[aktiv].teil).getCenter(v);
      ziel3.lerp(v, schmal ? 0.7 : 0.15);
    }
    kamera.position.copy(ziel3).add(blick);
    kamera.lookAt(ziel3);
    kamera.updateMatrixWorld();
    rechts.setFromMatrixColumn(kamera.matrixWorld, 0);
    oben.setFromMatrixColumn(kamera.matrixWorld, 1);

    // Abstand so wählen, dass alles in den freien Bereich über der Unterzeile passt
    const unten = unterzeile.offsetHeight + 24;
    const randX = schmal ? 18 : 150, randY = 36;
    const tanV = Math.tan(T.MathUtils.degToRad(kamera.fov / 2));
    const tanY = (tanV * (hoehe - unten - 2 * randY)) / hoehe;
    const tanX = (tanV * kamera.aspect * (breite - 2 * randX)) / breite;
    let abstand = 0;
    modell.children.forEach((g) => {
      hilf.setFromObject(g);
      for (let i = 0; i < 8; i++) {
        v.set(i & 1 ? hilf.max.x : hilf.min.x, i & 2 ? hilf.max.y : hilf.min.y, i & 4 ? hilf.max.z : hilf.min.z).sub(ziel3);
        const tiefe = v.dot(blick);
        abstand = Math.max(abstand, tiefe + Math.abs(v.dot(rechts)) / tanX, tiefe + Math.abs(v.dot(oben)) / tanY);
      }
    });
    if (aktiv >= 0 && schmal) abstand *= 0.58;
    if (erstesBild) { zielGlatt.copy(ziel3); abstandGlatt = abstand; erstesBild = false; }
    zielGlatt.lerp(ziel3, 0.18);
    abstandGlatt += (abstand - abstandGlatt) * 0.18;
    if (zielGlatt.distanceTo(ziel3) > 0.01 || Math.abs(abstand - abstandGlatt) > 0.01) bewegt = true;
    kamera.position.copy(zielGlatt).addScaledVector(blick, abstandGlatt);
    kamera.lookAt(zielGlatt);
    kamera.setViewOffset(breite, hoehe, 0, unten / 2, breite, hoehe);
    kamera.updateMatrixWorld();
    renderer.render(szene, kamera);

    // Beschriftungen an die Teile heften (aktives Teil zuerst, damit es den besten Platz bekommt)
    const sichtbar = auf > 0.92, belegt = [];
    marken.map((_, i) => i).sort((a, b) => (b === aktiv) - (a === aktiv)).forEach((i) => {
      const t = marken[i], ist = i === aktiv;
      hilf.setFromObject(t.teil).getCenter(v);
      if (t.richtung === "o") v.y = hilf.max.y;
      if (t.richtung === "u") v.y = hilf.min.y;
      v.project(kamera);
      const x = (v.x * 0.5 + 0.5) * breite, y = (-v.y * 0.5 + 0.5) * hoehe;
      const deckkraft = sichtbar ? (aktiv < 0 || ist ? 1 : 0.6) : 0;
      const zeigen = sichtbar && (!schmal || ist);
      t.punkt.classList.toggle("aktiv", ist);
      t.etikett.classList.toggle("aktiv", ist);
      t.punkt.style.opacity = deckkraft;
      t.punkt.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%)`;
      t.etikett.style.opacity = t.linie.style.opacity = zeigen ? deckkraft : 0;
      if (!zeigen) return;
      if (!t.w) { t.w = t.etikett.offsetWidth; t.h = t.etikett.offsetHeight; }
      const { w, h, richtung: r } = t, abst = 24;
      let nx = r === "r" ? x + abst : r === "l" ? x - abst - w : x - w / 2;
      let ny = r === "o" ? y - abst - h : r === "u" ? y + abst : y - h / 2;
      nx = klemmen(nx, 8, breite - w - 8);
      for (let n = 0; n < 30; n++) {
        const k = belegt.find((b) => nx < b.x + b.w + 6 && nx + w + 6 > b.x && ny < b.y + b.h + 4 && ny + h + 4 > b.y);
        if (!k) break;
        ny = r === "o" ? k.y - h - 4 : k.y + k.h + 4;
      }
      belegt.push({ x: nx, y: ny, w, h });
      t.etikett.style.transform = `translate(${nx.toFixed(1)}px,${ny.toFixed(1)}px)`;
      t.linie.setAttribute("x1", x.toFixed(1));
      t.linie.setAttribute("y1", y.toFixed(1));
      t.linie.setAttribute("x2", klemmen(x, nx + 12, nx + w - 12).toFixed(1));
      t.linie.setAttribute("y2", klemmen(y, ny, ny + h).toFixed(1));
    });
    return bewegt;
  };

  // Scrollen steuert den Fortschritt, mit etwas Nachlauf
  let soll = 0, ist = 0, laeuft = false;
  const fortschritt = () => {
    const r = spur.getBoundingClientRect();
    return klemmen(-r.top / Math.max(1, r.height - buehne.offsetHeight));
  };
  const bildSchritt = () => {
    ist += (soll - ist) * 0.16;
    if (Math.abs(soll - ist) < 0.0005) ist = soll;
    const bewegt = zeichnen(ist);
    if (ist !== soll || bewegt) requestAnimationFrame(bildSchritt);
    else laeuft = false;
  };
  const anstossen = () => {
    soll = fortschritt();
    if (!laeuft) { laeuft = true; requestAnimationFrame(bildSchritt); }
  };
  const groesse = () => {
    breite = buehne.clientWidth; hoehe = buehne.clientHeight;
    renderer.setSize(breite, hoehe, false);
    kamera.aspect = breite / hoehe;
    kamera.updateProjectionMatrix();
    marken.forEach((t) => (t.w = 0));
    erstesBild = true;
    anstossen();
  };
  new ResizeObserver(groesse).observe(buehne);
  document.fonts?.ready.then(groesse);
  addEventListener("scroll", anstossen, { passive: true });
  groesse();
  ist = soll = fortschritt();
  anstossen();
  sektion.classList.add("bereit");
}
