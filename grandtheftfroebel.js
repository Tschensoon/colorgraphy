// GrandTheftFröbel (Prototyp): offene Welt mit Laufen, Auto, Marker-Mission und Fahndungssternen.
// Figuren und Oberflächen kommen aus der Welt von „Fröbelinchen rennt“ (lauf-welt.js). Figuren schauen nach -z.
import * as THREE from "./vendor/three/three.module.min.js";
import { welt } from "./lauf-welt.js?v=36";

const T = THREE;
const handy = matchMedia("(pointer: coarse)").matches;
const $ = (id) => document.getElementById(id);
const huelle = $("spiel");

// ---------- Grundgerüst ----------
const renderer = new T.WebGLRenderer({ antialias: !handy, powerPreference: "high-performance" });
renderer.domElement.className = "bild";
renderer.outputColorSpace = T.SRGBColorSpace;
renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFShadowMap;
huelle.prepend(renderer.domElement);
const W = welt(T, handy);
const szene = new T.Scene();
szene.fog = new T.Fog("#dcedf6", 60, 175);
const himmel = W.himmel(); szene.add(himmel, W.wolken(), W.ferne());
const pmrem = new T.PMREMGenerator(renderer), himmelSzene = new T.Scene();
himmelSzene.add(W.himmel()); szene.environment = pmrem.fromScene(himmelSzene, .02).texture;
const kamera = new T.PerspectiveCamera(62, 1, .4, 420);
szene.add(new T.HemisphereLight("#cfe6ff", "#6c8f3c", .9));
const sonne = new T.DirectionalLight("#ffe7c4", 2.7);
sonne.castShadow = true; sonne.shadow.mapSize.set(handy ? 1024 : 2048, handy ? 1024 : 2048);
Object.assign(sonne.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 110 });
sonne.shadow.bias = -.0004; sonne.shadow.normalBias = .04;
szene.add(sonne, sonne.target);

const std = (o) => new T.MeshStandardMaterial(o);
const kiste = (b, h, t, m, x, y, z, eltern = szene) => {
  const k = new T.Mesh(new T.BoxGeometry(b, h, t), m); k.position.set(x, y, z);
  k.castShadow = true; k.receiveShadow = true; eltern.add(k); return k;
};
const flaeche = (x0, x1, z0, z1, y, m) => {
  const f = new T.Mesh(new T.PlaneGeometry(x1 - x0, z1 - z0), m);
  f.rotation.x = -Math.PI / 2; f.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); f.receiveShadow = true; szene.add(f); return f;
};
function schildBild(text, grund, farbe, b = 1024, h = 256) {
  const c = document.createElement("canvas"); c.width = b; c.height = h;
  const g = c.getContext("2d"); g.fillStyle = grund; g.fillRect(0, 0, b, h);
  g.fillStyle = farbe; g.font = `900 ${h * .55}px "Arial Black", system-ui, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(text, b / 2, h * .54);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4;
  return std({ map: t, roughness: .6, emissive: "#ffffff", emissiveMap: t, emissiveIntensity: .25 });
}

// ---------- Viertel ----------
const GRENZE = 96;
const STRASSEN = [
  [-75, -65, -96, 96], [-5, 5, -96, 96], [65, 75, -96, 96],
  [-96, 96, -55, -45], [-96, 96, 5, 15], [-96, 96, 65, 75],
];
const FLAECHEN = [[-50, -20, -14, 5], [25, 50, 50, 65]];                // Parkplätze vor Büro und Drogerie
const BUERO = { x0: -50, x1: -20, z0: -38, z1: -14 }, TUER_X = -35;
const DROGERIE = { x0: 25, x1: 50, z0: 28, z1: 50 };
const kasten = [], kreise = [];                                       // Hindernisse für alle Figuren und das Auto
const hindernis = (x0, x1, z0, z1, h = 4) => kasten.push({ x0, x1, z0, z1, h });

flaeche(-230, 230, -230, 230, -.01, (() => { const m = W.mat.gras; m.map.repeat.set(150, 150); return m; })());
const asphalt = std({ color: "#4b4e57", roughness: .95 });
STRASSEN.forEach(([x0, x1, z0, z1]) => flaeche(x0, x1, z0, z1, .04, asphalt));
const pflaster = std({ color: "#8d8f94", roughness: .95 });
FLAECHEN.forEach(([x0, x1, z0, z1]) => flaeche(x0, x1, z0, z1, .03, pflaster));
// Mittelstreifen
{
  const punkte = [];
  const inKreuzung = (w, liste) => liste.some(k => Math.abs(w - k) < 7);
  for (const z of [-50, 10, 70]) for (let x = -94; x < 94; x += 5) if (!inKreuzung(x, [-70, 0, 70])) punkte.push([x, z, 0]);
  for (const x of [-70, 0, 70]) for (let z = -94; z < 94; z += 5) if (!inKreuzung(z, [-50, 10, 70])) punkte.push([x, z, 1]);
  const m = new T.InstancedMesh(new T.PlaneGeometry(2.2, .22), new T.MeshBasicMaterial({ color: "#e8e6dc" }), punkte.length);
  const hilfe = new T.Object3D();
  punkte.forEach(([x, z, quer], i) => { hilfe.position.set(x, .06, z); hilfe.rotation.set(-Math.PI / 2, 0, quer ? Math.PI / 2 : 0); hilfe.updateMatrix(); m.setMatrixAt(i, hilfe.matrix); });
  szene.add(m);
}
// Grenze des Viertels: eine Hecke rundherum
for (const [x, z, dreh] of [[-GRENZE - 1, 0, 0], [GRENZE + 1, 0, 0], [0, -GRENZE - 1, 1], [0, GRENZE + 1, 1]]) {
  const h = W.heckenStueck(196, 2, 1.2); h.position.set(x, 0, z); if (dreh) h.rotation.y = Math.PI / 2; szene.add(h);
}

function haus(x, z, nr, dreh = 0) {
  const b = 9, t = 8, h = 5, g = new T.Group();
  kiste(b, h, t, W.mat.haus[nr % W.mat.haus.length], 0, h / 2, 0, g);
  const form = new T.Shape([new T.Vector2(-b / 2 - .4, 0), new T.Vector2(b / 2 + .4, 0), new T.Vector2(0, 2.8)]);
  const dach = new T.Mesh(new T.ExtrudeGeometry(form, { depth: t + .6, bevelEnabled: false }), W.mat.dach);
  dach.position.set(0, h, -(t + .6) / 2); dach.castShadow = true; g.add(dach);
  g.position.set(x, 0, z); g.rotation.y = dreh; szene.add(g);
  hindernis(x - b / 2, x + b / 2, z - t / 2, z + t / 2, 7);
}
[[-10, -36], [-10, -22], [15, -38], [32, -40], [52, -36], [15, -14], [34, -12], [54, -16],
 [-56, 26], [-38, 28], [-18, 25], [-56, 52], [-36, 54], [-16, 52], [12, 26], [60, 25], [12, 55], [60, 56],
 [-84, -30], [-84, 30], [84, -25], [84, 38], [-30, -75], [30, -78], [-30, 85], [30, 85]]
  .forEach(([x, z], i) => haus(x, z, i, i % 2 ? Math.PI : 0));

// Büro mit begehbarem Innenraum: vier Wände, Tür nach Süden, das Dach verschwindet, sobald Anja drinnen ist
const wandMat = std({ color: "#f1ece0", roughness: .9 }), fensterMat = std({ color: "#7fb3d1", roughness: .15, metalness: .4 });
let dachBuero;
{
  const { x0, x1, z0, z1 } = BUERO, h = 4, d = .5;
  const wand = (ax0, ax1, az0, az1) => { kiste(ax1 - ax0, h, az1 - az0, wandMat, (ax0 + ax1) / 2, h / 2, (az0 + az1) / 2); hindernis(ax0, ax1, az0, az1, h); };
  wand(x0, x1, z0, z0 + d); wand(x0, x0 + d, z0, z1); wand(x1 - d, x1, z0, z1);
  wand(x0, TUER_X - 1.9, z1 - d, z1); wand(TUER_X + 1.9, x1, z1 - d, z1);
  kiste(3.8, 1, d, wandMat, TUER_X, 3.5, z1 - d / 2);
  const dielen = W.mat.holz.map.clone(); dielen.repeat.set(10, 8); dielen.needsUpdate = true;
  flaeche(x0, x1, z0, z1, .05, std({ map: dielen, roughness: .8 }));
  dachBuero = kiste(x1 - x0 + 1, .4, z1 - z0 + 1, std({ color: "#5d616c", roughness: .9 }), (x0 + x1) / 2, h + .2, (z0 + z1) / 2);
  for (const x of [x0 + 5, x0 + 10, x1 - 10, x1 - 5]) kiste(3, 1.6, .1, fensterMat, x, 2.3, z1 + .03);
  const s = new T.Mesh(new T.PlaneGeometry(9, 2.1), schildBild("BÜRO", "#0b5d4d", "#ffffff"));
  s.position.set(TUER_X, 5.3, z1 + .3); szene.add(s);
  kiste(9.2, 2.3, .15, std({ color: "#123", roughness: .7 }), TUER_X, 5.3, z1 + .18);
}
function schreibtisch(x, z, verpackt) {
  const g = new T.Group(), holz = std({ color: "#a47c52", roughness: .8 }), dunkel = std({ color: "#1d1f28", roughness: .5 });
  kiste(3, .1, 1.4, holz, 0, .95, 0, g);
  for (const a of [-1.35, 1.35]) for (const b of [-.55, .55]) kiste(.1, .95, .1, holz, a, .47, b, g);
  kiste(1.1, .7, .06, dunkel, 0, 1.4, -.35, g);
  kiste(.7, .04, .25, std({ color: "#ddd", roughness: .6 }), 0, 1.02, .15, g);
  g.position.set(x, .05, z); szene.add(g); hindernis(x - 1.5, x + 1.5, z - .7, z + .7, 1.5);
  if (verpackt) {
    const f = new T.Mesh(new T.BoxGeometry(3.25, 1.95, 1.65), W.folieStoff); f.position.set(0, .97, 0); f.renderOrder = 5; g.add(f);
    f.add(new T.LineSegments(new T.EdgesGeometry(f.geometry), W.folieKante));
  }
}
schreibtisch(-40, -29, true); schreibtisch(-26, -31, false); schreibtisch(-44, -20, false);

// Fröbelinchen sitzt eingewickelt auf dem Stuhl (Haltung wie im Einpack-Level) und schaut zur Tür
{
  const buehne = new T.Group(); szene.add(buehne);
  buehne.add(W.stuhl());
  const f = W.figurBauen("giraffe"), g = f.gruppe; buehne.add(g);
  g.rotation.set(0, Math.PI + .28, 0);
  f.koerper.rotation.x = 1; f.hals.rotation.x = -1;
  f.beine.forEach(b => { const hinten = b.oben.position.z > .05; b.oben.rotation.set(hinten ? .55 : -.95, 0, 0); b.unten.rotation.set(hinten ? -1.3 : 0, 0, 0); });
  const ohneBeine = (fn) => f.koerper.traverse(o => { if (!o.isMesh) return; let p = o; while (p) { if (f.beine.some(b => b.oben === p)) return; p = p.parent; } fn(o); });
  buehne.updateMatrixWorld(true);
  const box = new T.Box3(), teilBox = new T.Box3();
  ohneBeine(o => box.union(teilBox.setFromObject(o)));
  const groesse = box.getSize(new T.Vector3()), mitte = box.getCenter(new T.Vector3());
  g.position.set(-mitte.x, W.STUHL_SITZ - box.min.y + .02, -mitte.z + .05);
  const hoehe = groesse.y + .2;
  const folie = new T.Mesh(new T.CylinderGeometry(.5, .62, hoehe, 18, 1, true), W.folieStoff);
  folie.scale.set(Math.max(groesse.x, .8) * .95, 1, Math.max(groesse.z, .8) * .95);
  folie.position.set(0, W.STUHL_SITZ + hoehe / 2, .05); folie.renderOrder = 5; buehne.add(folie);
  buehne.position.set(-40, .05, -26);
  hindernis(-40.8, -39.2, -26.8, -25.2, 1.5);
}

// Drogerie
{
  const { x0, x1, z0, z1 } = DROGERIE, h = 6;
  kiste(x1 - x0, h, z1 - z0, std({ color: "#f7e6c4", roughness: .9 }), (x0 + x1) / 2, h / 2, (z0 + z1) / 2);
  hindernis(x0, x1, z0, z1, h);
  kiste(x1 - x0 - 4, 3, .15, fensterMat, (x0 + x1) / 2, 1.9, z1 + .05);
  const s = new T.Mesh(new T.PlaneGeometry(19, 2.3), schildBild("DROGERIE", "#d3145a", "#ffffff"));
  s.position.set((x0 + x1) / 2, 4.8, z1 + .18); szene.add(s);
}

// Bäume als eine Sammelform, das spart am Handy viele Zeichenaufrufe
{
  let saat = 42; const zuf = () => (saat = (saat * 16807) % 2147483647) / 2147483647;
  const liegtFrei = (x, z) => {
    const auf = (l, r = 2.5) => x > l[0] - r && x < l[1] + r && z > l[2] - r && z < l[3] + r;
    return !STRASSEN.some(s => auf(s)) && !FLAECHEN.some(s => auf(s)) && !kasten.some(k => x > k.x0 - 3 && x < k.x1 + 3 && z > k.z0 - 3 && z < k.z1 + 3);
  };
  const orte = [];
  for (let n = 0; n < 900 && orte.length < (handy ? 55 : 95); n++) {
    const x = (zuf() - .5) * 186, z = (zuf() - .5) * 186;
    if (liegtFrei(x, z) && !(x > BUERO.x0 && x < BUERO.x1 && z > BUERO.z0 && z < BUERO.z1)) orte.push([x, z, 1 + zuf() * .6]);
  }
  const stamm = new T.InstancedMesh(new T.CylinderGeometry(.16, .3, 1, 8), W.mat.rinde, orte.length);
  const krone = new T.InstancedMesh(W.geo.blatt, W.mat.laub, orte.length * 5);
  stamm.castShadow = krone.castShadow = true;
  const hilfe = new T.Object3D();
  orte.forEach(([x, z, s], i) => {
    hilfe.position.set(x, 1.6 * s, z); hilfe.scale.set(s, 3.2 * s, s); hilfe.rotation.set(0, 0, 0); hilfe.updateMatrix(); stamm.setMatrixAt(i, hilfe.matrix);
    for (let k = 0; k < 5; k++) {
      hilfe.position.set(x + (zuf() - .5) * 2 * s, (3.1 + zuf() * 1.5) * s, z + (zuf() - .5) * 2 * s);
      const g = (.9 + zuf() * .55) * s; hilfe.scale.set(g, g, g); hilfe.rotation.set(zuf() * 3, zuf() * 3, 0); hilfe.updateMatrix(); krone.setMatrixAt(i * 5 + k, hilfe.matrix);
    }
    kreise.push({ x, z, r: .45 * s });
  });
  szene.add(stamm, krone);
}

// ---------- Figuren und Auto ----------
const anja = W.figurBauen("anja"); szene.add(anja.gruppe);
const aylin = W.frauBauen(); szene.add(aylin.gruppe);
const AYLIN_PLATZ = { x: -31, z: -27 };
const aylinRolle = W.folienRolle(); aylinRolle.scale.setScalar(.45); aylin.arme[1].unten.add(aylinRolle); aylinRolle.position.set(0, -.3, -.1); aylinRolle.rotation.x = Math.PI / 2; aylinRolle.visible = false;

function autoBauen() {
  const g = new T.Group(), lack = new T.MeshPhysicalMaterial({ color: "#d7263d", roughness: .32, metalness: .35, clearcoat: 1, clearcoatRoughness: .25 });
  const glas = std({ color: "#1b2733", roughness: .1, metalness: .6 }), schwarz = std({ color: "#17181c", roughness: .85 }), felge = std({ color: "#c9ccd2", roughness: .35, metalness: .8 });
  kiste(2, .6, 4.5, lack, 0, .68, 0, g);
  kiste(1.75, .62, 2.3, lack, 0, 1.28, .25, g);
  kiste(1.8, .48, .08, glas, 0, 1.28, -.92, g);
  kiste(1.8, .44, .08, glas, 0, 1.28, 1.42, g);
  for (const s of [-1, 1]) {
    kiste(.05, .44, 1.95, glas, s * .88, 1.28, .25, g);
    kiste(.34, .14, .06, std({ color: "#fff6c9", emissive: "#fff2b0", emissiveIntensity: 1 }), s * .68, .78, -2.26, g);
    kiste(.34, .14, .06, std({ color: "#ff3030", emissive: "#ff1a1a", emissiveIntensity: .8 }), s * .68, .8, 2.26, g);
  }
  kiste(2.04, .2, 4.54, schwarz, 0, .42, 0, g);
  const raeder = [];
  for (const [x, z] of [[-1, -1.42], [1, -1.42], [-1, 1.42], [1, 1.42]]) {
    const r = new T.Group(); r.position.set(x, .4, z); g.add(r);
    const dreher = new T.Group(); r.add(dreher);
    const reifen = new T.Mesh(new T.CylinderGeometry(.4, .4, .28, 16), schwarz); reifen.rotation.z = Math.PI / 2; reifen.castShadow = true; dreher.add(reifen);
    const nabe = new T.Mesh(new T.CylinderGeometry(.22, .22, .3, 8), felge); nabe.rotation.z = Math.PI / 2; dreher.add(nabe);
    raeder.push({ r, dreher, vorn: z < 0 });
  }
  szene.add(g); return { g, raeder };
}
const auto = autoBauen();

// Marker: leuchtender Ring mit schwebendem Pfeil
const marker = new T.Group();
{
  const gelb = new T.MeshBasicMaterial({ color: "#ffc83d", transparent: true, opacity: .32, side: T.DoubleSide, depthWrite: false, fog: false });
  const saeule = new T.Mesh(new T.CylinderGeometry(1.5, 1.5, 2.6, 28, 1, true), gelb); saeule.position.y = 1.3; marker.add(saeule);
  const ring = new T.Mesh(new T.RingGeometry(1.2, 1.55, 36), new T.MeshBasicMaterial({ color: "#ffc83d", side: T.DoubleSide, fog: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = .1; marker.add(ring);
  const pfeil = new T.Mesh(new T.ConeGeometry(.55, 1.1, 4), new T.MeshBasicMaterial({ color: "#ffc83d", fog: false })); pfeil.rotation.x = Math.PI; pfeil.position.y = 3.3; marker.add(pfeil); marker.userData.pfeil = pfeil;
  szene.add(marker);
}

// ---------- Zustand ----------
const START = { x: TUER_X, z: 3 };
const S = {
  an: false, x: START.x, z: START.z, dreh: 0, lauf: 0, tempo: 0, imAuto: false, camYaw: 0, camZiehen: 0, camDist: 6,
  auto: { x: -27, z: -4, dreh: Math.PI, v: 0, lenk: 0 },
  schritt: 0, dialog: null, dialogNach: null, wahl: false, sterne: 0, jagd: 0, aylin: { x: AYLIN_PLATZ.x, z: AYLIN_PLATZ.z, dreh: Math.PI, lauf: 0 }, gefangen: 0, bon: false, fertig: false, banner: 0,
};
const ein = { x: 0, y: 0, tasten: new Set(), renn: false, stick: { x: 0, y: 0 } };

const SCHRITTE = [
  { ziel: "Geh in dein Büro.", marker: [-36.5, -24], r: 1.9, nurZuFuss: true, dialog: [
    ["Anja", "Eine Woche Urlaub. Und dann das. Fröbelinchen sitzt da und rührt sich nicht mehr."],
    ["Aylin", "Ich war's nicht! Ich hab sogar ein Beweisfoto. Ich hab nur die Folie gekauft, die wir gebraucht haben. Mehr nicht."],
    ["Anja", "Das prüfe ich. In der Drogerie kennen sie alle."],
  ] },
  { ziel: "Steig in das rote Auto auf dem Parkplatz.", auto: true, wenn: () => S.imAuto },
  { ziel: "Fahr zur Drogerie.", marker: [37.5, 58], r: 4.5, dialog: [
    ["Verkäuferin", "Aylin? Klar. Mittwoch, 14:10 Uhr. Drei Rollen Frischhaltefolie. Hier ist der Kassenbon."],
    ["Anja", "Drei Rollen. Am Schreibtisch liegen aber nur zwei."],
  ], danach: () => { S.bon = true; } },
  { ziel: "Fahr zurück ins Büro und stell Aylin zur Rede.", marker: [-31, -24.7], r: 2, nurZuFuss: true, wahl: true },
];

// ---------- Kollision ----------
function schieben(p, r) {
  for (const k of kasten) {
    const nx = Math.max(k.x0, Math.min(p.x, k.x1)), nz = Math.max(k.z0, Math.min(p.z, k.z1));
    const dx = p.x - nx, dz = p.z - nz, d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    p.stoss = true;
    if (d2 > 1e-6) { const d = Math.sqrt(d2); p.x = nx + dx / d * r; p.z = nz + dz / d * r; }
    else {
      const wege = [[p.x - k.x0 + r, -1, 0], [k.x1 - p.x + r, 1, 0], [p.z - k.z0 + r, 0, -1], [k.z1 - p.z + r, 0, 1]].sort((a, b) => a[0] - b[0]);
      p.x += wege[0][1] * wege[0][0]; p.z += wege[0][2] * wege[0][0];
    }
  }
  for (const k of kreise) {
    const dx = p.x - k.x, dz = p.z - k.z, d = Math.hypot(dx, dz), min = r + k.r;
    if (d < min && d > 1e-4) { p.x = k.x + dx / d * min; p.z = k.z + dz / d * min; p.stoss = true; }
  }
  const g = GRENZE - r; if (Math.abs(p.x) > g || Math.abs(p.z) > g) { p.stoss = true; p.x = Math.max(-g, Math.min(g, p.x)); p.z = Math.max(-g, Math.min(g, p.z)); }
}
const aufStrasse = (x, z) => STRASSEN.some(s => x > s[0] && x < s[1] && z > s[2] && z < s[3]) || FLAECHEN.some(s => x > s[0] && x < s[1] && z > s[2] && z < s[3]);
const drinnen = () => !S.imAuto && S.x > BUERO.x0 && S.x < BUERO.x1 && S.z > BUERO.z0 && S.z < BUERO.z1;
const winkelDiff = (a, b) => { let d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
const naehere = (a, b, k) => a + winkelDiff(b, a) * k;

// ---------- Eingabe ----------
const gedrueckt = (...c) => c.some(k => ein.tasten.has(k));
function eingabeLesen() {
  let x = ein.stick.x + (gedrueckt("KeyD", "ArrowRight") ? 1 : 0) - (gedrueckt("KeyA", "ArrowLeft") ? 1 : 0);
  let y = ein.stick.y + (gedrueckt("KeyS", "ArrowDown") ? 1 : 0) - (gedrueckt("KeyW", "ArrowUp") ? 1 : 0);
  const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
  ein.x = x; ein.y = y;
}
addEventListener("keydown", (e) => {
  if (!S.an) return;
  if (e.code === "KeyE" || e.code === "Enter") { e.preventDefault(); if (!e.repeat) aktion(); return; }
  if (e.code.startsWith("Arrow") || e.code === "Space") e.preventDefault();
  ein.tasten.add(e.code);
});
addEventListener("keyup", (e) => ein.tasten.delete(e.code));
addEventListener("blur", () => ein.tasten.clear());

const stick = $("stick"), knauf = stick.firstElementChild;
let stickId = null;
const stickSetzen = (e) => {
  const r = stick.getBoundingClientRect(), max = r.width * .38;
  let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
  const l = Math.hypot(dx, dy); if (l > max) { dx *= max / l; dy *= max / l; }
  knauf.style.transform = `translate(${dx}px,${dy}px)`;
  ein.stick.x = dx / max; ein.stick.y = dy / max;
};
stick.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); stickId = e.pointerId; stick.setPointerCapture(e.pointerId); stickSetzen(e); });
stick.addEventListener("pointermove", (e) => { if (e.pointerId === stickId) stickSetzen(e); });
const stickLos = (e) => { if (e.pointerId !== stickId) return; stickId = null; ein.stick.x = ein.stick.y = 0; knauf.style.transform = ""; };
stick.addEventListener("pointerup", stickLos); stick.addEventListener("pointercancel", stickLos);
const rennen = $("rennen");
rennen.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); ein.renn = true; });
for (const n of ["pointerup", "pointercancel", "pointerleave"]) rennen.addEventListener(n, () => { ein.renn = false; });
$("aktion").addEventListener("click", () => aktion());
$("untertitel").addEventListener("click", () => dialogWeiter());

// Kamera ziehen: Maus oder ein Finger außerhalb der Knöpfe
let zugId = null, zugX = 0;
renderer.domElement.addEventListener("pointerdown", (e) => { zugId = e.pointerId; zugX = e.clientX; renderer.domElement.setPointerCapture(e.pointerId); });
renderer.domElement.addEventListener("pointermove", (e) => {
  if (e.pointerId !== zugId) return;
  S.camYaw -= (e.clientX - zugX) * .006; zugX = e.clientX; S.camZiehen = 1.6;
});
for (const n of ["pointerup", "pointercancel"]) renderer.domElement.addEventListener(n, (e) => { if (e.pointerId === zugId) zugId = null; });

// ---------- Mission ----------
function zeigeDialog(zeilen, nach) { S.dialog = zeilen.slice(); S.dialogNach = nach; S.auto.v = 0; dialogZeigen(); }
function dialogZeigen() {
  const u = $("untertitel"), z = S.dialog[0];
  u.innerHTML = `<b>${z[0]}:</b> ${z[1]}<span>${handy ? "Tippen" : "E oder Klick"}: weiter</span>`;
  u.hidden = false;
}
function dialogWeiter() {
  if (!S.dialog) return;
  S.dialog.shift();
  if (S.dialog.length) return dialogZeigen();
  S.dialog = null; $("untertitel").hidden = true;
  const n = S.dialogNach; S.dialogNach = null; n && n();
}
function schrittFertig() {
  const s = SCHRITTE[S.schritt];
  s.danach && s.danach();
  S.schritt++;
}
function wahlOeffnen() {
  S.wahl = true;
  const feld = $("wahl"), box = feld.firstElementChild;
  box.innerHTML = `<h2 id="wahl-titel">„Ich hab nur gekauft, was wir gebraucht haben.“ Was legst du Aylin vor?</h2>
    <button type="button" data-w="0">Dein Urlaubsfoto vom Strand</button>
    <button type="button" data-w="1">Den Kassenbon aus der Drogerie</button>
    <button type="button" data-w="2">Ein Parkticket</button>`;
  box.querySelectorAll("button").forEach(b => b.onclick = () => {
    feld.hidden = true; S.wahl = false;
    if (b.dataset.w === "1") zeigeDialog([
      ["Aylin", "Ja gut, drei Rollen. Die dritte lag auf Ankes Schreibtisch, und am Nachmittag war sie weg."],
      ["Anja", "Anke also. Das sehe ich mir an."],
    ], missionGeschafft);
    else zeigeDialog([["Aylin", "Das ist ein Scherz, oder? Warte, ich zeig dir mal, wie Frischhaltefolie funktioniert!"]], jagdStart);
  });
  feld.hidden = false; box.querySelector("button").focus();
}
function missionGeschafft() {
  S.schritt = SCHRITTE.length; S.fertig = true;
  bannerZeigen("Mission geschafft!", 4);
}
function jagdStart() { S.sterne = 2; S.jagd = 25; aylinRolle.visible = true; }
function jagdEnde() {
  S.sterne = 0; S.jagd = 0; aylinRolle.visible = false;
  Object.assign(S.aylin, { x: AYLIN_PLATZ.x, z: AYLIN_PLATZ.z, dreh: Math.PI });
}
function bannerZeigen(t, dauer) { const b = $("banner"); b.textContent = t; b.hidden = false; S.banner = dauer; }
function aktion() {
  if (!S.an || S.gefangen > 0 || S.wahl) return;
  if (S.dialog) return dialogWeiter();
  if (S.imAuto) {
    if (Math.abs(S.auto.v) > 5) return;
    S.imAuto = false; S.auto.v = 0;
    const seite = S.auto.dreh + Math.PI / 2;      // links neben dem Auto aussteigen
    const p = { x: S.auto.x - Math.sin(seite) * 2.2, z: S.auto.z - Math.cos(seite) * 2.2 }; schieben(p, .4);
    S.x = p.x; S.z = p.z; S.dreh = S.auto.dreh; anja.gruppe.visible = true;
    return;
  }
  if (Math.hypot(S.x - S.auto.x, S.z - S.auto.z) < 3.6) { S.imAuto = true; anja.gruppe.visible = false; }
}

// ---------- Spielschritt ----------
const figurenTakt = (f, k, lauf, tempo) => {
  const an = Math.min(1, tempo / 2.5);
  f.beine.forEach((b, i) => { const ph = lauf + i * Math.PI; b.oben.rotation.x = Math.sin(ph) * .75 * an; b.unten.rotation.x = -Math.max(0, Math.sin(ph + 1.6)) * 1.35 * an; });
  f.arme.forEach((a, i) => { const ph = lauf + i * Math.PI; a.oben.rotation.x = -Math.sin(ph) * .7 * an; a.unten.rotation.x = .15 + .95 * an; });
  k.rotation.x = -.06 * an; k.position.y = Math.abs(Math.sin(lauf)) * .04 * an;
};
function schritt(dt, t) {
  eingabeLesen();
  const frei = S.an && !S.dialog && !S.wahl && S.gefangen <= 0;
  if (S.camZiehen > 0) S.camZiehen -= dt;

  if (S.imAuto) {
    const a = S.auto, gas = frei ? -ein.y : 0, lenk = frei ? ein.x : 0;
    const max = aufStrasse(a.x, a.z) ? 27 : 14;
    if (gas > 0) a.v += (a.v < 0 ? 22 : 11) * gas * dt;
    else if (gas < 0) a.v += (a.v > 0 ? 24 : 9) * gas * dt;
    else a.v -= Math.sign(a.v) * Math.min(Math.abs(a.v), 4.5 * dt);
    if (a.v > max) a.v = Math.max(max, a.v - 16 * dt);
    a.v = Math.max(-9, a.v);
    a.lenk += (lenk - a.lenk) * Math.min(1, 7 * dt);
    const griff = Math.min(1, Math.abs(a.v) / 6) * (1.75 - Math.min(.8, Math.abs(a.v) / 34));
    a.dreh -= a.lenk * griff * Math.sign(a.v || 1) * dt;
    const p = { x: a.x - Math.sin(a.dreh) * a.v * dt, z: a.z - Math.cos(a.dreh) * a.v * dt };
    schieben(p, 1.7);
    if (p.stoss && Math.abs(a.v) > 2) a.v *= -.28;
    a.x = p.x; a.z = p.z;
    S.x = a.x; S.z = a.z;
    if (S.camZiehen <= 0) S.camYaw = naehere(S.camYaw, a.dreh, Math.min(1, 3.2 * dt));
  } else {
    const l = frei ? Math.hypot(ein.x, ein.y) : 0;
    const renn = ein.renn || gedrueckt("ShiftLeft", "ShiftRight");
    const v = l * (renn ? 6.8 : 3.4);
    if (l > .05) {
      const s = Math.sin(S.camYaw), c = Math.cos(S.camYaw);
      const mx = c * ein.x + s * ein.y, mz = -s * ein.x + c * ein.y;
      const p = { x: S.x + mx / l * v * dt, z: S.z + mz / l * v * dt };
      schieben(p, .38);
      S.x = p.x; S.z = p.z;
      S.dreh = naehere(S.dreh, Math.atan2(-mx, -mz), Math.min(1, 11 * dt));
      if (S.camZiehen <= 0 && ein.y < .3) S.camYaw = naehere(S.camYaw, S.dreh, Math.min(1, .9 * dt));
      S.lauf += v * dt * 1.9;
    }
    S.tempo = v;
    const pa = { x: S.x, z: S.z };
    const dx = pa.x - S.auto.x, dz = pa.z - S.auto.z, d = Math.hypot(dx, dz);        // das Auto ist auch ein Hindernis
    if (d < 2.1 && d > 1e-3) { S.x = S.auto.x + dx / d * 2.1; S.z = S.auto.z + dz / d * 2.1; }
    figurenTakt(anja, anja.koerper, S.lauf, v);
    anja.gruppe.position.set(S.x, drinnen() ? .05 : 0, S.z); anja.gruppe.rotation.y = S.dreh;
    anja.schwanz.rotation.x = .2 + Math.sin(S.lauf * 2) * .25 * Math.min(1, v / 3);
  }

  // Auto zeichnen
  const a = S.auto;
  auto.g.position.set(a.x, 0, a.z); auto.g.rotation.y = a.dreh;
  auto.g.rotation.z = -a.lenk * Math.min(1, Math.abs(a.v) / 20) * .05;
  auto.raeder.forEach(r => { r.dreher.rotation.x -= a.v * dt / .4; if (r.vorn) r.r.rotation.y = -a.lenk * .45; });

  // Mission
  const akt = SCHRITTE[S.schritt];
  if (frei && akt && !S.sterne) {
    if (akt.wenn) { if (akt.wenn()) schrittFertig(); }
    else if (akt.marker && (!akt.nurZuFuss || !S.imAuto) && Math.hypot(S.x - akt.marker[0], S.z - akt.marker[1]) < akt.r) {
      if (akt.wahl) wahlOeffnen();
      else zeigeDialog(akt.dialog, schrittFertig);
    }
  }
  const zielPunkt = S.sterne || !akt ? null : akt.auto && !S.imAuto ? [S.auto.x, S.auto.z] : akt.marker || null;
  marker.visible = !!zielPunkt && !akt.auto;
  if (marker.visible) { marker.position.set(zielPunkt[0], .06, zielPunkt[1]); marker.userData.pfeil.position.y = 3.3 + Math.sin(t * 3) * .2; marker.userData.pfeil.rotation.y = t * 1.5; }

  // Aylin
  const y = S.aylin;
  if (S.sterne && frei) {
    S.jagd -= dt;
    const dx = S.x - y.x, dz = S.z - y.z, d = Math.hypot(dx, dz);
    const p = { x: y.x + dx / (d || 1) * 6.1 * dt, z: y.z + dz / (d || 1) * 6.1 * dt };
    schieben(p, .38); y.x = p.x; y.z = p.z; y.dreh = Math.atan2(-dx, -dz); y.lauf += 6.1 * dt * 1.9;
    figurenTakt(aylin, aylin.k, y.lauf, 6.1);
    if (!S.imAuto && d < 1.05) { S.gefangen = 2.6; $("schleier").style.opacity = .92; bannerZeigen("Eingewickelt!", 2.4); }
    else if (S.jagd <= 0) { jagdEnde(); }
  } else if (!S.sterne) {
    const zuAnja = Math.hypot(S.x - y.x, S.z - y.z) < 6;
    if (zuAnja) y.dreh = naehere(y.dreh, Math.atan2(y.x - S.x, y.z - S.z) + 0, Math.min(1, 4 * dt));
    figurenTakt(aylin, aylin.k, 0, 0);
  }
  aylin.gruppe.position.set(y.x, y.x > BUERO.x0 && y.x < BUERO.x1 && y.z > BUERO.z0 && y.z < BUERO.z1 ? .05 : 0, y.z); aylin.gruppe.rotation.y = y.dreh;

  if (S.gefangen > 0) {
    S.gefangen -= dt;
    if (S.gefangen <= 0) {
      jagdEnde();
      Object.assign(S, { x: START.x, z: START.z, dreh: 0, camYaw: 0, imAuto: false });
      anja.gruppe.visible = true; $("schleier").style.opacity = 0;
    }
  }
  if (S.banner > 0) { S.banner -= dt; if (S.banner <= 0) $("banner").hidden = true; }

  // Kamera: ein Strahl von der Figur nach hinten, Wände holen die Kamera heran
  const innen = drinnen();
  dachBuero.visible = !innen;
  const hoehe = S.imAuto ? 3.6 : innen ? 3.2 : 2.7;
  let weite = S.imAuto ? 8.6 : innen ? 4.8 : 6;
  const zx = S.x, zz = S.z, zy = S.imAuto ? 1.2 : 1.45;
  const sx = Math.sin(S.camYaw), sz = Math.cos(S.camYaw);
  for (let i = 1; i <= 14; i++) {
    const w = weite * i / 14, px = zx + sx * w, pz = zz + sz * w;
    if (kasten.some(k => k.h > 2 && !(k === undefined) && px > k.x0 - .25 && px < k.x1 + .25 && pz > k.z0 - .25 && pz < k.z1 + .25)) { weite = Math.max(1.3, w - .5); break; }
  }
  S.camDist += (weite - S.camDist) * Math.min(1, (weite < S.camDist ? 18 : 4) * dt);
  kamera.position.set(zx + sx * S.camDist, zy + hoehe * (S.camDist / (S.imAuto ? 8.6 : innen ? 4.8 : 6) * .75 + .25), zz + sz * S.camDist);
  kamera.lookAt(zx, zy + .35, zz);

  himmel.position.set(zx, 0, zz);
  sonne.target.position.set(zx, 0, zz); sonne.position.set(zx + 26, 46, zz + 18); sonne.target.updateMatrixWorld();
  W.animieren(t);
}

// ---------- Anzeigen ----------
const kartePinsel = $("karte").getContext("2d");
const grundkarte = document.createElement("canvas"); grundkarte.width = grundkarte.height = 512;
{
  const g = grundkarte.getContext("2d"), k = 512 / (GRENZE * 2), mx = (v) => (v + GRENZE) * k;
  g.fillStyle = "#6b9d55"; g.fillRect(0, 0, 512, 512);
  g.fillStyle = "#3c3f47"; STRASSEN.forEach(([a, b, c, d]) => g.fillRect(mx(a), mx(c), (b - a) * k, (d - c) * k));
  g.fillStyle = "#74767c"; FLAECHEN.forEach(([a, b, c, d]) => g.fillRect(mx(a), mx(c), (b - a) * k, (d - c) * k));
  g.fillStyle = "#c9bfa9"; kasten.forEach(b => g.fillRect(mx(b.x0), mx(b.z0), (b.x1 - b.x0) * k, (b.z1 - b.z0) * k));
  g.fillStyle = "#0b7d68"; g.fillRect(mx(BUERO.x0), mx(BUERO.z0), (BUERO.x1 - BUERO.x0) * k, (BUERO.z1 - BUERO.z0) * k);
  g.fillStyle = "#d3145a"; g.fillRect(mx(DROGERIE.x0), mx(DROGERIE.z0), (DROGERIE.x1 - DROGERIE.x0) * k, (DROGERIE.z1 - DROGERIE.z0) * k);
}
function karteZeichnen(ziel) {
  const g = kartePinsel, B = 256, r = B / 2, k = 512 / (GRENZE * 2), zoom = 1.25;
  g.save(); g.clearRect(0, 0, B, B); g.beginPath(); g.arc(r, r, r, 0, Math.PI * 2); g.clip();
  g.translate(r, r); g.scale(zoom, zoom); g.translate(-(S.x + GRENZE) * k, -(S.z + GRENZE) * k);
  g.drawImage(grundkarte, 0, 0);
  g.restore();
  const punkt = (wx, wz, farbe, gr) => {
    let px = (wx - S.x) * k * zoom, pz = (wz - S.z) * k * zoom; const l = Math.hypot(px, pz), max = r - 16;
    if (l > max) { px *= max / l; pz *= max / l; }
    g.fillStyle = farbe; g.strokeStyle = "#000"; g.lineWidth = 3; g.beginPath(); g.arc(r + px, r + pz, gr, 0, Math.PI * 2); g.fill(); g.stroke();
  };
  if (!S.imAuto) punkt(S.auto.x, S.auto.z, "#ff4d4d", 9);
  if (S.sterne) punkt(S.aylin.x, S.aylin.z, "#ff2d7a", 11);
  if (ziel) punkt(ziel[0], ziel[1], "#ffc83d", 14);
  const dreh = S.imAuto ? S.auto.dreh : S.dreh;
  g.save(); g.translate(r, r); g.rotate(-dreh); g.fillStyle = "#fff"; g.strokeStyle = "#000"; g.lineWidth = 3;
  g.beginPath(); g.moveTo(0, -17); g.lineTo(11, 12); g.lineTo(0, 6); g.lineTo(-11, 12); g.closePath(); g.fill(); g.stroke(); g.restore();
}
let hudAlt = "";
function hud() {
  const akt = SCHRITTE[S.schritt];
  let ziel = akt ? akt.ziel : "Prototyp geschafft. Du kannst noch durchs Viertel fahren.";
  let unter = "";
  if (S.sterne) { ziel = "Aylin kommt mit der Folie! Lauf oder spring ins Auto."; unter = `Noch ${Math.ceil(Math.max(0, S.jagd))} Sekunden`; }
  const zielPunkt = S.sterne || !akt ? null : akt.auto ? [S.auto.x, S.auto.z] : akt.marker;
  if (zielPunkt && !unter) unter = `${Math.round(Math.hypot(S.x - zielPunkt[0], S.z - zielPunkt[1]))} m`;
  const nahAmAuto = !S.imAuto && Math.hypot(S.x - S.auto.x, S.z - S.auto.z) < 3.6;
  const knopf = S.imAuto ? (Math.abs(S.auto.v) <= 5 ? "Aus-steigen" : "") : nahAmAuto ? "Ein-steigen" : "";
  const zeigen = S.an && !S.dialog && !S.wahl && S.gefangen <= 0 ? knopf : "";
  const stand = [ziel, unter, S.sterne, zeigen, S.imAuto ? Math.round(Math.abs(S.auto.v) * 3.6) : -1].join("|");
  if (stand !== hudAlt) {
    hudAlt = stand;
    $("ziel").innerHTML = `${ziel}${unter ? `<small>${unter}</small>` : ""}`;
    $("sterne").textContent = S.sterne ? "★".repeat(S.sterne) : "";
    const a = $("aktion"), h = $("hinweis");
    if (handy) { a.hidden = !zeigen; a.textContent = zeigen; h.hidden = true; }
    else { a.hidden = true; h.hidden = !zeigen; h.textContent = zeigen ? `E: ${zeigen.replace("-", "")}` : ""; }
    $("tempo").hidden = !S.imAuto; if (S.imAuto) $("tempo").textContent = `${Math.round(Math.abs(S.auto.v) * 3.6)} km/h`;
  }
  karteZeichnen(zielPunkt);
}

// ---------- Bildgröße und Leistung ----------
let qualitaet = 0, messZeit = 0, messBilder = 0;
function qualitaetSetzen(q) {
  qualitaet = q;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, q >= 2 ? 1 : handy ? (q ? 1.1 : 1.35) : 2));
  sonne.castShadow = q < 1;
  groesse();
}
function groesse() {
  const w = huelle.clientWidth, h = huelle.clientHeight; if (!w || !h) return;
  renderer.setSize(w, h, false); kamera.aspect = w / h; kamera.fov = w / h < .8 ? 74 : 62; kamera.updateProjectionMatrix();
}
new ResizeObserver(groesse).observe(huelle);

// ---------- Schleife ----------
let zeit = 0, letzt = performance.now();
function bild() {
  const jetzt = performance.now(), echt = (jetzt - letzt) / 1000; letzt = jetzt;
  const dt = Math.min(.05, echt); zeit += dt;
  schritt(dt, zeit); hud();
  renderer.render(szene, kamera);
  messZeit += echt; messBilder++;
  if (messZeit > 3 && S.an) {
    const fps = messBilder / messZeit; messZeit = 0; messBilder = 0;
    if (fps < 28 && qualitaet < 2) qualitaetSetzen(qualitaet + 1);
  }
}
// ---------- Start ----------
$("steuerung").innerHTML = handy
  ? "<li>Links: Joystick zum Laufen und Lenken</li><li>Rechts: Rennen, Einsteigen und Aussteigen</li><li>Wischen über das Bild dreht die Kamera</li><li>Am besten hältst du das Handy quer</li>"
  : "<li>WASD oder Pfeiltasten: laufen und fahren</li><li>Shift: rennen, E: einsteigen und weiter</li><li>Mit der Maus ziehen: Kamera drehen</li>";
qualitaetSetzen(0);
schritt(0, 0); hud(); renderer.render(szene, kamera);
const los = $("los"); los.disabled = false; los.textContent = "Mission starten";
los.addEventListener("click", () => {
  $("start").hidden = true; S.an = true;
  if (handy) { $("stick").hidden = false; $("rennen").hidden = false; }
  messZeit = 0; messBilder = 0; letzt = performance.now();
  hudAlt = "";
});
renderer.setAnimationLoop(bild);
