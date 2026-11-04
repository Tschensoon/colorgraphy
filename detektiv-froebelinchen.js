// Detektiv Fröbelinchen (Prototyp): offene Welt mit Laufen, Auto, Marker-Mission und Fahndungssternen.
// Figuren und Oberflächen kommen aus der Welt von „Fröbelinchen rennt“ (lauf-welt.js). Figuren schauen nach -z.
import * as THREE from "./vendor/three/three.module.min.js";
import { welt } from "./lauf-welt.js?v=36";
import { figurenWerkstatt } from "./detektiv-figuren.js?v=1";

const T = THREE;
let handy = matchMedia("(pointer: coarse)").matches;
const $ = (id) => document.getElementById(id);
const huelle = $("spiel");

// ---------- Grundgerüst ----------
const renderer = new T.WebGLRenderer({ antialias: !handy, powerPreference: "high-performance" });
renderer.domElement.className = "bild";
renderer.outputColorSpace = T.SRGBColorSpace;
renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = handy ? T.BasicShadowMap : T.PCFShadowMap;
huelle.prepend(renderer.domElement);
const W = welt(T, handy);
const szene = new T.Scene();
szene.fog = new T.Fog("#dcedf6", handy ? 45 : 60, handy ? 135 : 175);
const himmel = W.himmel(), wolkenGruppe = W.wolken(), fernsicht = W.ferne(); szene.add(himmel, wolkenGruppe, fernsicht);
// Die fernen Hügel sind nur Silhouetten: grobe Kugeln reichen und sparen viele Dreiecke
const grobeKugel = new T.SphereGeometry(1, 10, 7);
fernsicht.traverse(o => { if (o.isMesh && !o.isInstancedMesh && o.geometry.type === "SphereGeometry") o.geometry = grobeKugel; });
if (handy) wolkenGruppe.children.filter((_, i) => i % 2).forEach(w => wolkenGruppe.remove(w));
const pmrem = new T.PMREMGenerator(renderer), himmelSzene = new T.Scene();
himmelSzene.add(W.himmel()); szene.environment = pmrem.fromScene(himmelSzene, .02).texture;
const kamera = new T.PerspectiveCamera(62, 1, .4, 300);
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
let dachBuero, froebelBuehne;
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
  const buehne = froebelBuehne = new T.Group(); szene.add(buehne);
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
  const krone = new T.InstancedMesh(handy ? new T.IcosahedronGeometry(1, 1) : W.geo.blatt, W.mat.laub, orte.length * 5);
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
const menschen = figurenWerkstatt(T, handy);
const anja = menschen.bauen("anja"); szene.add(anja.gruppe);
const aylin = menschen.bauen("aylin"); szene.add(aylin.gruppe);
const AYLIN_PLATZ = { x: -31, z: -27 };
const aylinRolle = W.folienRolle(); aylinRolle.scale.setScalar(.45); aylin.arme[1].unten.add(aylinRolle); aylinRolle.position.set(0, -.3, -.1); aylinRolle.rotation.x = Math.PI / 2; aylinRolle.visible = false;

function autoBauen() {
  const g = new T.Group(), lack = new (handy ? T.MeshStandardMaterial : T.MeshPhysicalMaterial)({ color: "#d7263d", roughness: .32, metalness: .35, ...(handy ? {} : { clearcoat: 1, clearcoatRoughness: .25 }) });
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

// ---------- Weniger Zeichenaufrufe: unbewegte Teile werden je Material zu einem Netz ----------
function zusammenfassen(wurzel, auslassen) {
  wurzel.updateMatrixWorld(true);
  const invers = new T.Matrix4().copy(wurzel.matrixWorld).invert(), gruppen = new Map(), matrix = new T.Matrix4();
  const besuche = (o) => {
    if (auslassen.includes(o)) return;
    o.children.slice().forEach(besuche);
    if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material) || o.material.transparent || o.material.vertexColors || o.children.length) return;
    const pos = o.geometry.attributes.position; if (!pos) return;
    const schluessel = `${o.material.uuid}|${o.castShadow}|${o.receiveShadow}`;
    if (!gruppen.has(schluessel)) gruppen.set(schluessel, []);
    gruppen.get(schluessel).push(o);
  };
  besuche(wurzel);
  let gespart = 0;
  for (const liste of gruppen.values()) {
    if (liste.length < 2) continue;
    const p = [], n = [], u = [];
    for (const o of liste) {
      let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      g.applyMatrix4(matrix.multiplyMatrices(invers, o.matrixWorld));
      const ap = g.attributes.position, an = g.attributes.normal, au = g.attributes.uv;
      for (let i = 0; i < ap.count; i++) {
        p.push(ap.getX(i), ap.getY(i), ap.getZ(i));
        if (an) n.push(an.getX(i), an.getY(i), an.getZ(i)); else n.push(0, 1, 0);
        if (au) u.push(au.getX(i), au.getY(i)); else u.push(0, 0);
      }
      g.dispose(); o.parent.remove(o);
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute(p, 3));
    geo.setAttribute("normal", new T.Float32BufferAttribute(n, 3));
    geo.setAttribute("uv", new T.Float32BufferAttribute(u, 2));
    const m = new T.Mesh(geo, liste[0].material); m.castShadow = liste[0].castShadow; m.receiveShadow = liste[0].receiveShadow;
    wurzel.add(m); gespart += liste.length - 1;
  }
  return gespart;
}

const radTeile = auto.raeder.map(r => r.r);
zusammenfassen(auto.g, radTeile);
zusammenfassen(szene, [himmel, sonne, sonne.target, anja.gruppe, aylin.gruppe, auto.g, marker, dachBuero, froebelBuehne]);

// Schatten: am Computer laufend. Am Handy einmalig für die ganze Karte gerechnet, Bewegtes bekommt einen weichen Fleck am Boden.
const schattenFiguren = [anja.gruppe, aylin.gruppe, auto.g];
dachBuero.castShadow = false;
if (handy) {
  schattenFiguren.forEach(g => g.traverse(o => { o.castShadow = false; }));
  Object.assign(sonne.shadow.camera, { left: -125, right: 125, top: 125, bottom: -125, near: 1, far: 320 });
  sonne.shadow.camera.updateProjectionMatrix();
  sonne.shadow.mapSize.set(2048, 2048);
  sonne.position.set(62, 115, 44); sonne.target.position.set(0, 0, 0); sonne.target.updateMatrixWorld();
  sonne.shadow.autoUpdate = false; sonne.shadow.needsUpdate = true;
}
const flecken = handy ? [[anja.gruppe, W.kontaktSchatten(.9, .9)], [aylin.gruppe, W.kontaktSchatten(.9, .9)], [auto.g, W.kontaktSchatten(2.3, 4.9)]] : [];
flecken.forEach(([, f]) => szene.add(f));

// ---------- Zustand ----------
const SCHRITT_ZEIT = 1 / 60;
const START = { x: TUER_X, z: 3 };
const koerper = (x, z, dreh) => ({ x, z, dreh, ax: x, az: z, adreh: dreh, vx: 0, vz: 0 });
const AYLIN_START = { x: AYLIN_PLATZ.x, z: AYLIN_PLATZ.z, dreh: Math.PI };
const S = {
  an: false, ich: koerper(START.x, START.z, 0), lauf: 0, tempo: 0, imAuto: false, aussteigen: false,
  wagen: { ...koerper(-27, -4, Math.PI), vf: 0, lenk: 0, stossBereit: 0 },
  aylin: { ...koerper(AYLIN_START.x, AYLIN_START.z, AYLIN_START.dreh), lauf: 0 },
  camYaw: 0, camZiehen: 0, camDist: 6, schuettel: 0, kamSprung: true,
  schritt: 0, dialog: null, dialogNach: null, dialogSeit: 0, wahl: false, sterne: 0, jagd: 0, gefangen: 0, bon: false, fertig: false, banner: 0,
};
const ein = { x: 0, y: 0, gas: 0, stickX: 0, stickY: 0, pedal: 0, tasten: new Set() };

const SCHRITTE = [
  { ziel: "Geh in dein Büro.", marker: [-36.5, -24], r: 1.5, nurZuFuss: true, dialog: [
    ["Anja", "Eine Woche Urlaub. Und dann das. Fröbelinchen sitzt da und rührt sich nicht mehr."],
    ["Aylin", "Ich war's nicht! Ich hab sogar ein Beweisfoto. Ich hab nur die Folie gekauft, die wir gebraucht haben. Mehr nicht."],
    ["Anja", "Das prüfe ich. In der Drogerie kennen sie alle."],
  ] },
  { ziel: "Steig in das rote Auto auf dem Parkplatz.", auto: true, wenn: () => S.imAuto },
  { ziel: "Fahr zur Drogerie.", marker: [37.5, 58], r: 4.5, dialog: [
    ["Verkäuferin", "Aylin? Klar. Mittwoch, 14:10 Uhr. Drei Rollen Frischhaltefolie. Hier ist der Kassenbon."],
    ["Anja", "Drei Rollen. Am Schreibtisch liegen aber nur zwei."],
  ], danach: () => { S.bon = true; } },
  { ziel: "Fahr zurück ins Büro und stell Aylin zur Rede.", marker: [-31, -24.7], r: 1.5, nurZuFuss: true, wahl: true },
];

// ---------- Kollision ----------
function schieben(p, r) {
  for (const k of kasten) {
    if (p.x < k.x0 - r || p.x > k.x1 + r || p.z < k.z0 - r || p.z > k.z1 + r) continue;
    const nx = Math.max(k.x0, Math.min(p.x, k.x1)), nz = Math.max(k.z0, Math.min(p.z, k.z1));
    const dx = p.x - nx, dz = p.z - nz, d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    if (d2 > 1e-6) { const d = Math.sqrt(d2); p.x = nx + dx / d * r; p.z = nz + dz / d * r; }
    else {
      const wege = [[p.x - k.x0 + r, -1, 0], [k.x1 - p.x + r, 1, 0], [p.z - k.z0 + r, 0, -1], [k.z1 - p.z + r, 0, 1]].sort((a, b) => a[0] - b[0]);
      p.x += wege[0][1] * wege[0][0]; p.z += wege[0][2] * wege[0][0];
    }
  }
  for (const k of kreise) {
    const dx = p.x - k.x, dz = p.z - k.z, min = r + k.r;
    if (Math.abs(dx) > min || Math.abs(dz) > min) continue;
    const d = Math.hypot(dx, dz);
    if (d < min && d > 1e-4) { p.x = k.x + dx / d * min; p.z = k.z + dz / d * min; }
  }
  const g = GRENZE - r; p.x = Math.max(-g, Math.min(g, p.x)); p.z = Math.max(-g, Math.min(g, p.z));
}
const imRechteck = (x, z, l) => x > l[0] && x < l[1] && z > l[2] && z < l[3];
const aufStrasse = (x, z) => STRASSEN.some(s => imRechteck(x, z, s)) || FLAECHEN.some(s => imRechteck(x, z, s));
const imBuero = (x, z) => x > BUERO.x0 && x < BUERO.x1 && z > BUERO.z0 && z < BUERO.z1;
const winkelDiff = (a, b) => { let d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
const naehere = (a, b, k) => a + winkelDiff(b, a) * k;
const zu = (v, ziel, schritt) => v < ziel ? Math.min(ziel, v + schritt) : Math.max(ziel, v - schritt);

// ---------- Eingabe ----------
const gedrueckt = (...c) => c.some(k => ein.tasten.has(k));
function eingabeLesen() {
  const tx = (gedrueckt("KeyD", "ArrowRight") ? 1 : 0) - (gedrueckt("KeyA", "ArrowLeft") ? 1 : 0);
  const ty = (gedrueckt("KeyS", "ArrowDown") ? 1 : 0) - (gedrueckt("KeyW", "ArrowUp") ? 1 : 0);
  let x = ein.stickX + tx, y = ein.stickY + ty;
  const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
  ein.x = x; ein.y = y;
  ein.gas = Math.max(-1, Math.min(1, -ty + ein.pedal));
}
function eingabeLeeren() {
  ein.tasten.clear(); ein.pedal = 0; pedalZeigen(); stickLoslassen();
}
addEventListener("keydown", (e) => {
  if (!S.an) return;
  if (e.code === "KeyE" || e.code === "Enter") { e.preventDefault(); if (!e.repeat) aktion(); return; }
  if (e.code.startsWith("Arrow") || e.code === "Space") e.preventDefault();
  ein.tasten.add(e.code);
});
addEventListener("keyup", (e) => ein.tasten.delete(e.code));
addEventListener("blur", () => { if (S.an) eingabeLeeren(); });
addEventListener("contextmenu", (e) => e.preventDefault());
document.addEventListener("gesturestart", (e) => e.preventDefault());

// Der Joystick erscheint dort, wo der Daumen aufsetzt. Fährt Anja, lenkt er nur noch nach links und rechts.
const fangen = (el, id) => { try { el.setPointerCapture(id); } catch (e) {} };
const zone = $("stick-zone"), stick = $("stick"), knauf = stick.firstElementChild;
let stickId = null, stickMitteX = 0, stickMitteY = 0;
function stickSetzen(e) {
  const r = stick.getBoundingClientRect(), maxX = r.width * .36, maxY = S.imAuto ? 0 : r.height * .36;
  let dx = e.clientX - stickMitteX, dy = e.clientY - stickMitteY;
  if (S.imAuto) { dx = Math.max(-maxX, Math.min(maxX, dx)); dy = 0; ein.stickX = dx / maxX; ein.stickY = 0; }
  else {
    const l = Math.hypot(dx, dy); if (l > maxX) { dx *= maxX / l; dy *= maxX / l; }
    ein.stickX = dx / maxX; ein.stickY = dy / maxX;
  }
  knauf.style.transform = `translate(${dx}px,${dy}px)`;
  stick.classList.toggle("renn", !S.imAuto && Math.hypot(ein.stickX, ein.stickY) > RENN_AB);
}
function stickLoslassen() {
  stickId = null; ein.stickX = ein.stickY = 0; knauf.style.transform = "";
  stick.style.left = stick.style.top = ""; stick.classList.remove("aktiv", "renn");
}
zone.addEventListener("pointerdown", (e) => {
  if (stickId !== null) return;
  e.preventDefault(); stickId = e.pointerId; fangen(zone, e.pointerId);
  const z = zone.getBoundingClientRect(), r = stick.getBoundingClientRect();
  const x = Math.max(z.left + r.width / 2 + 6, Math.min(z.right - r.width / 2, e.clientX));
  const y = Math.max(z.top + r.height / 2, Math.min(z.bottom - r.height / 2 - 6, e.clientY));
  stick.style.left = `${x - z.left - r.width / 2}px`; stick.style.top = `${y - z.top - r.height / 2}px`;
  stickMitteX = x; stickMitteY = y; stick.classList.add("aktiv");
  stickSetzen(e);
});
zone.addEventListener("pointermove", (e) => { if (e.pointerId === stickId) stickSetzen(e); });
const zoneLos = (e) => { if (e.pointerId === stickId) stickLoslassen(); };
zone.addEventListener("pointerup", zoneLos); zone.addEventListener("pointercancel", zoneLos);

// Pedale: der Daumen darf zwischen Bremse und Gas hin- und herrutschen
const pedale = $("pedale"), bremse = $("bremse"), gasPedal = $("gas");
let pedalId = null;
function pedalZeigen() { gasPedal.classList.toggle("an", ein.pedal > 0); bremse.classList.toggle("an", ein.pedal < 0); }
function pedalLesen(e) { ein.pedal = e.clientX < gasPedal.getBoundingClientRect().left - 3 ? -1 : 1; pedalZeigen(); }
pedale.addEventListener("pointerdown", (e) => { e.preventDefault(); pedalId = e.pointerId; fangen(pedale, e.pointerId); pedalLesen(e); });
pedale.addEventListener("pointermove", (e) => { if (e.pointerId === pedalId) pedalLesen(e); });
const pedalLos = (e) => { if (e.pointerId === pedalId) { pedalId = null; ein.pedal = 0; pedalZeigen(); } };
pedale.addEventListener("pointerup", pedalLos); pedale.addEventListener("pointercancel", pedalLos);

for (const id of ["aktion", "aussteigen"]) $(id).addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); aktion(); });

// Kamera ziehen: Maus oder ein Finger außerhalb der Steuerung. Beim Dialog geht jeder Tipp weiter.
let zugId = null, zugX = 0;
huelle.addEventListener("pointerdown", (e) => {
  if (S.dialog && performance.now() - S.dialogSeit > 280) dialogWeiter();
});
const bildFlaeche = renderer.domElement;
bildFlaeche.addEventListener("pointerdown", (e) => { zugId = e.pointerId; zugX = e.clientX; fangen(bildFlaeche, e.pointerId); });
bildFlaeche.addEventListener("pointermove", (e) => {
  if (e.pointerId !== zugId) return;
  S.camYaw -= (e.clientX - zugX) * .0065; zugX = e.clientX; S.camZiehen = 1.4;
});
for (const n of ["pointerup", "pointercancel"]) bildFlaeche.addEventListener(n, (e) => { if (e.pointerId === zugId) zugId = null; });

// ---------- Mission ----------
function zeigeDialog(zeilen, nach) {
  S.dialog = zeilen.slice(); S.dialogNach = nach; S.dialogSeit = performance.now();
  eingabeLeeren(); dialogZeigen(); hudAlt = ""; hudUhr = 0;
}
function dialogZeigen() {
  const u = $("untertitel"), z = S.dialog[0];
  u.innerHTML = `<b>${z[0]}:</b> ${z[1]}<span>${handy ? "Tippen" : "E oder Klick"}: weiter</span>`;
  u.hidden = false;
}
function dialogWeiter() {
  if (!S.dialog) return;
  S.dialog.shift(); S.dialogSeit = performance.now();
  if (S.dialog.length) return dialogZeigen();
  S.dialog = null; $("untertitel").hidden = true; hudAlt = ""; hudUhr = 0;
  const n = S.dialogNach; S.dialogNach = null; n && n();
}
function schrittFertig() {
  const s = SCHRITTE[S.schritt];
  s.danach && s.danach();
  S.schritt++; hudAlt = ""; hudUhr = 0;
}
function wahlOeffnen() {
  S.wahl = true; eingabeLeeren();
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
// Schließen: erst nachfragen, weil der Fortschritt nicht gespeichert wird
function schliessenFragen() {
  if (!S.an || S.wahl || S.gefangen > 0) return;
  S.wahl = true; eingabeLeeren(); hudAlt = ""; hudUhr = 0;
  const feld = $("wahl"), box = feld.firstElementChild;
  box.innerHTML = `<h2 id="wahl-titel">Spiel schließen? Dein Fortschritt wird nicht gespeichert.</h2>
    <button type="button" id="weiterspielen">Weiterspielen</button>
    <button type="button" id="beenden">Spiel schließen</button>`;
  $("weiterspielen").onclick = () => { feld.hidden = true; S.wahl = false; letzt = performance.now(); hudAlt = ""; hudUhr = 0; };
  $("beenden").onclick = async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); } catch (e) {}
    location.href = "index.html";
  };
  feld.hidden = false; $("weiterspielen").focus();
}
$("schliessen").addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); schliessenFragen(); });
$("schliessen").addEventListener("click", (e) => { if (e.detail === 0) schliessenFragen(); });

function missionGeschafft() { S.schritt = SCHRITTE.length; S.fertig = true; bannerZeigen("Mission geschafft!", 4); }
function jagdStart() { S.sterne = 2; S.jagd = 25; aylinRolle.visible = true; hudAlt = ""; hudUhr = 0; }
function jagdEnde() {
  S.sterne = 0; S.jagd = 0; aylinRolle.visible = false; hudAlt = ""; hudUhr = 0;
  Object.assign(S.aylin, { x: AYLIN_START.x, z: AYLIN_START.z, ax: AYLIN_START.x, az: AYLIN_START.z, dreh: AYLIN_START.dreh, adreh: AYLIN_START.dreh });
}
function bannerZeigen(t, dauer) { const b = $("banner"); b.textContent = t; b.hidden = false; S.banner = dauer; }
function aussteigenJetzt() {
  const a = S.wagen, i = S.ich;
  S.imAuto = false; S.aussteigen = false; a.vf = 0; a.vx = a.vz = 0; a.lenk = 0;
  const seite = a.dreh + Math.PI / 2, p = { x: a.x - Math.sin(seite) * 2.2, z: a.z - Math.cos(seite) * 2.2 };
  schieben(p, .4);
  i.x = i.ax = p.x; i.z = i.az = p.z; i.dreh = i.adreh = a.dreh; i.vx = i.vz = 0;
  anja.gruppe.visible = true; eingabeLeeren(); hudAlt = ""; hudUhr = 0;
}
function aktion() {
  if (!S.an || S.gefangen > 0 || S.wahl) return;
  if (S.dialog) return dialogWeiter();
  if (S.imAuto) { S.aussteigen = true; return; }            // bremst selbst und steigt dann aus
  if (Math.hypot(S.ich.x - S.wagen.x, S.ich.z - S.wagen.z) < EINSTIEG) { S.imAuto = true; anja.gruppe.visible = false; eingabeLeeren(); hudAlt = ""; hudUhr = 0; }
}

// ---------- Spielschritt mit fester Taktung ----------
const RENN_AB = .82, EINSTIEG = 3.6, RADSTAND = 2.7;
const TEMPO_STRASSE = 29, TEMPO_GRAS = 15, TEMPO_RUECK = 9;
function schrittFuss(dt, frei) {
  const i = S.ich; i.ax = i.x; i.az = i.z; i.adreh = i.dreh;
  const l = frei ? Math.min(1, Math.hypot(ein.x, ein.y)) : 0;
  const renn = (handy && l > RENN_AB) || gedrueckt("ShiftLeft", "ShiftRight");
  const ziel = l < .1 ? 0 : (renn ? 6.9 : 1.6 + 2 * Math.min(1, l / RENN_AB));
  let zvx = 0, zvz = 0;
  if (l >= .1) {
    const s = Math.sin(S.camYaw), c = Math.cos(S.camYaw), rx = (c * ein.x + s * ein.y) / l, rz = (-s * ein.x + c * ein.y) / l;
    zvx = rx * ziel; zvz = rz * ziel;
    i.dreh = naehere(i.dreh, Math.atan2(-rx, -rz), Math.min(1, 12 * dt));
    if (S.camZiehen <= 0 && ein.y < .35) S.camYaw = naehere(S.camYaw, i.dreh, Math.min(1, .8 * dt));
  }
  const rate = (l >= .1 ? 26 : 34) * dt;
  i.vx = zu(i.vx, zvx, rate); i.vz = zu(i.vz, zvz, rate);
  const p = { x: i.x + i.vx * dt, z: i.z + i.vz * dt };
  schieben(p, .38);
  const dxW = p.x - S.wagen.x, dzW = p.z - S.wagen.z, dW = Math.hypot(dxW, dzW);     // das Auto ist auch ein Hindernis
  if (dW < 2.1 && dW > 1e-3) { p.x = S.wagen.x + dxW / dW * 2.1; p.z = S.wagen.z + dzW / dW * 2.1; }
  i.vx = (p.x - i.x) / dt; i.vz = (p.z - i.z) / dt;
  i.x = p.x; i.z = p.z;
  S.tempo = Math.hypot(i.vx, i.vz); S.lauf += S.tempo * dt * 1.9;
}
function schrittAuto(dt, frei) {
  const a = S.wagen; a.ax = a.x; a.az = a.z; a.adreh = a.dreh;
  const hand = gedrueckt("Space");
  let gas = frei && !S.aussteigen ? ein.gas : 0;
  let roh = frei && !S.aussteigen ? ein.x : 0;
  roh = Math.abs(roh) < .06 ? 0 : Math.sign(roh) * Math.pow((Math.abs(roh) - .06) / .94, 1.5);    // sanft um die Mitte, damit Geradeausfahren leicht ist
  a.lenk = zu(a.lenk, roh, (Math.abs(roh) < Math.abs(a.lenk) ? 7.5 : 4.5) * dt);
  const strasse = aufStrasse(a.x, a.z), max = strasse ? TEMPO_STRASSE : TEMPO_GRAS;

  // Längs: Gas, Bremse, Rückwärtsgang
  let v = a.vf;
  if (!frei || S.aussteigen) v = zu(v, 0, 32 * dt);
  else if (gas > 0) v += v < -.3 ? 34 * gas * dt : 17 * (1 - Math.pow(Math.max(0, v) / max, 2)) * gas * dt;
  else if (gas < 0) v += v > .3 ? 36 * gas * dt : 9 * gas * dt;
  else v = zu(v, 0, (2.6 + Math.abs(v) * .05) * dt);
  if (hand) v = zu(v, 0, 9 * dt);
  if (v > max) v = Math.max(max, v - 14 * dt);
  a.vf = Math.max(-TEMPO_RUECK, v);

  // Lenken wie beim Fahrrad: das Tempo bestimmt die Drehung. Bei hohem Tempo schlagen die Räder weniger ein.
  const einschlag = (.66 - .47 * Math.min(1, Math.abs(a.vf) / TEMPO_STRASSE)) * a.lenk;
  const drehrate = a.vf / RADSTAND * Math.tan(einschlag) * (hand ? 1.35 : 1);
  a.dreh -= drehrate * dt;                                       // Drehwinkel wächst nach links, Lenken nach rechts verringert ihn

  // Seitlich: Das Auto rutscht kurz in der Kurve, die Reifen fangen es wieder ein
  const fx = -Math.sin(a.dreh), fz = -Math.cos(a.dreh), rx = Math.cos(a.dreh), rz = -Math.sin(a.dreh);
  let vs = a.vx * rx + a.vz * rz;
  vs *= Math.exp(-(hand ? 1.5 : strasse ? 8.5 : 5) * dt);
  a.vx = fx * a.vf + rx * vs; a.vz = fz * a.vf + rz * vs;

  // Kollision: vorn und hinten je ein Kreis. Das Auto gleitet an Wänden entlang, nur der Anteil gegen die Wand geht verloren.
  let nx = a.x + a.vx * dt, nz = a.z + a.vz * dt, schubX = 0, schubZ = 0, dreh = 0;
  for (const seite of [1.28, -1.28]) {
    const px = nx + fx * seite, pz = nz + fz * seite, p = { x: px, z: pz };
    schieben(p, 1.06);
    const dx = p.x - px, dz = p.z - pz;
    if (dx || dz) {
      if (Math.abs(dx) > Math.abs(schubX)) schubX = dx;
      if (Math.abs(dz) > Math.abs(schubZ)) schubZ = dz;
      dreh -= seite * (dx * rx + dz * rz) * .12;
    }
  }
  if (schubX || schubZ) {
    nx += schubX; nz += schubZ;
    const l = Math.hypot(schubX, schubZ), ox = schubX / l, oz = schubZ / l, vn = a.vx * ox + a.vz * oz;
    if (vn < 0) {
      a.vx -= ox * vn * 1.12; a.vz -= oz * vn * 1.12;
      a.vf = (a.vx * fx + a.vz * fz) * .992;
      if (vn < -6 && a.stossBereit <= 0) { S.schuettel = Math.min(1, -vn / 22); a.stossBereit = .35; if (navigator.vibrate && navigator.userActivation?.hasBeenActive) navigator.vibrate(Math.min(55, -vn * 3)); }
    }
    a.dreh += Math.max(-.035, Math.min(.035, dreh));
  }
  if (a.stossBereit > 0) a.stossBereit -= dt;
  a.x = nx; a.z = nz;
  S.ich.x = S.ich.ax = a.x; S.ich.z = S.ich.az = a.z;
  if (S.camZiehen <= 0) {
    const schnell = Math.min(1, Math.abs(a.vf) / 14);
    S.camYaw = naehere(S.camYaw, a.dreh - Math.atan2(vs, Math.max(6, Math.abs(a.vf))) * .55, Math.min(1, (1.3 + 2.6 * schnell) * dt));
  }
  if (S.aussteigen && Math.abs(a.vf) < 1.2) aussteigenJetzt();
}
function schrittSpiel(dt) {
  eingabeLesen();
  const frei = S.an && !S.dialog && !S.wahl && S.gefangen <= 0;
  if (S.camZiehen > 0) S.camZiehen -= dt;
  if (S.imAuto) schrittAuto(dt, frei); else schrittFuss(dt, frei);

  const akt = SCHRITTE[S.schritt], i = S.ich;
  if (frei && akt && !S.sterne) {
    if (akt.wenn) { if (akt.wenn()) schrittFertig(); }
    else if (akt.marker && (!akt.nurZuFuss || !S.imAuto) && Math.hypot(i.x - akt.marker[0], i.z - akt.marker[1]) < akt.r) {
      if (akt.wahl) wahlOeffnen();
      else zeigeDialog(akt.dialog, schrittFertig);
    }
  }

  const y = S.aylin; y.ax = y.x; y.az = y.z; y.adreh = y.dreh;
  if (S.sterne && frei) {
    S.jagd -= dt;
    const dx = i.x - y.x, dz = i.z - y.z, d = Math.hypot(dx, dz) || 1;
    const p = { x: y.x + dx / d * 6.1 * dt, z: y.z + dz / d * 6.1 * dt };
    schieben(p, .38); y.x = p.x; y.z = p.z; y.dreh = Math.atan2(-dx, -dz); y.lauf += 6.1 * dt * 1.9;
    if (!S.imAuto && d < 1.05) { S.gefangen = 2.6; $("schleier").style.opacity = .92; bannerZeigen("Eingewickelt!", 2.4); eingabeLeeren(); }
    else if (S.jagd <= 0) jagdEnde();
  } else if (!S.sterne && Math.hypot(i.x - y.x, i.z - y.z) < 6) {
    y.dreh = naehere(y.dreh, Math.atan2(y.x - i.x, y.z - i.z), Math.min(1, 4 * dt));
  }

  if (S.gefangen > 0) {
    S.gefangen -= dt;
    if (S.gefangen <= 0) {
      jagdEnde();
      Object.assign(i, { x: START.x, z: START.z, ax: START.x, az: START.z, dreh: 0, adreh: 0, vx: 0, vz: 0 });
      Object.assign(S, { camYaw: 0, imAuto: false, kamSprung: true });
      anja.gruppe.visible = true; $("schleier").style.opacity = 0; hudAlt = ""; hudUhr = 0;
    }
  }
  if (S.banner > 0) { S.banner -= dt; if (S.banner <= 0) $("banner").hidden = true; }
}

// ---------- Darstellung: zwischen zwei Spielschritten wird weich überblendet ----------
const mix = (a, b, t) => a + (b - a) * t;
const figurenTakt = (f, k, lauf, tempo) => {
  const an = Math.min(1, tempo / 2.8), s = Math.min(1, tempo / 5);
  f.beine.forEach((b, i) => { const ph = lauf + i * Math.PI; b.oben.rotation.x = Math.sin(ph) * (.42 + .35 * s) * an; b.unten.rotation.x = -Math.max(0, Math.sin(ph + 1.6)) * (.75 + .6 * s) * an; });
  f.arme.forEach((a, i) => { const ph = lauf + i * Math.PI; a.oben.rotation.x = -Math.sin(ph) * (.35 + .35 * s) * an; a.unten.rotation.x = .15 + .95 * s * an; });
  k.rotation.x = -.07 * s; k.position.y = f.huefteY + Math.abs(Math.sin(lauf)) * .04 * an;
  // Beim Laufen drehen Hüfte und Brust gegeneinander, im Stehen atmet die Figur und schaut sich um
  k.rotation.y = Math.sin(lauf) * .09 * an;
  f.brust.rotation.y = -Math.sin(lauf) * .16 * an;
  f.brust.rotation.x = Math.sin(zeit * 1.7) * .012 * (1 - an);
  f.kopf.rotation.y = Math.sin(zeit * .47) * .14 * (1 - an);
  f.kopf.rotation.x = -.04 * an;
};
const kamZiel = new T.Vector3(), kamWunsch = new T.Vector3(), kamBlick = new T.Vector3();
let fovBasis = 62, fovAktuell = 62;
function darstellen(dt, alpha, t) {
  const i = S.ich, a = S.wagen, y = S.aylin;
  const ax = mix(a.ax, a.x, alpha), az = mix(a.az, a.z, alpha), ad = a.adreh + winkelDiff(a.dreh, a.adreh) * alpha;
  auto.g.position.set(ax, 0, az); auto.g.rotation.y = ad;
  const fahrZiel = Math.min(1, Math.abs(a.vf) / 20);
  auto.g.rotation.z = -a.lenk * fahrZiel * .055;
  auto.g.rotation.x = 0;
  auto.raeder.forEach(r => { r.dreher.rotation.x -= a.vf * dt / .4; if (r.vorn) r.r.rotation.y = -a.lenk * .5; });

  const zx = S.imAuto ? ax : mix(i.ax, i.x, alpha), zz = S.imAuto ? az : mix(i.az, i.z, alpha);
  if (!S.imAuto) {
    const innen = imBuero(zx, zz);
    figurenTakt(anja, anja.koerper, S.lauf, S.tempo);
    anja.gruppe.position.set(zx, innen ? .05 : 0, zz); anja.gruppe.rotation.y = i.adreh + winkelDiff(i.dreh, i.adreh) * alpha;
    anja.schwanz.rotation.x = .2 + Math.sin(S.lauf * 2) * .25 * Math.min(1, S.tempo / 3);
  }
  const yx = mix(y.ax, y.x, alpha), yz = mix(y.az, y.z, alpha);
  figurenTakt(aylin, aylin.k, y.lauf, S.sterne ? 6.1 : 0);
  aylin.gruppe.position.set(yx, imBuero(yx, yz) ? .05 : 0, yz); aylin.gruppe.rotation.y = y.adreh + winkelDiff(y.dreh, y.adreh) * alpha;
  for (const [g, f] of flecken) { f.visible = g.visible; f.position.set(g.position.x, g.position.y + .09, g.position.z); f.rotation.y = g.rotation.y; }

  // Die aufwendigen Figuren im Büro werden nur gezeichnet, wenn Anja in der Nähe ist
  const nahAmBuero = Math.hypot(zx - (BUERO.x0 + BUERO.x1) / 2, zz - (BUERO.z0 + BUERO.z1) / 2) < 27;
  froebelBuehne.visible = nahAmBuero; aylin.gruppe.visible = nahAmBuero || S.sterne > 0;
  const akt = SCHRITTE[S.schritt], sichtbar = !!akt && !S.sterne && !!akt.marker;
  marker.visible = sichtbar;
  if (sichtbar) { marker.scale.setScalar(akt.nurZuFuss ? .6 : 1); marker.position.set(akt.marker[0], .06, akt.marker[1]); marker.userData.pfeil.position.y = 3.3 + Math.sin(t * 3) * .2; marker.userData.pfeil.rotation.y = t * 1.5; }

  // Kamera: läuft leicht nach und zoomt beim schnellen Fahren etwas heraus
  const innen = !S.imAuto && imBuero(zx, zz);
  dachBuero.visible = !innen;
  const fahr = S.imAuto ? Math.abs(a.vf) : 0;
  const weiteSoll = S.imAuto ? 7.4 + fahr * .075 : innen ? 4.6 : 5.6, hoeheSoll = S.imAuto ? 2.9 + fahr * .022 : innen ? 2.9 : 2.5;
  let weite = weiteSoll;
  const sx = Math.sin(S.camYaw), sz = Math.cos(S.camYaw);
  for (let n = 2; n <= 9; n++) {
    const w = weiteSoll * n / 9, px = zx + sx * w, pz = zz + sz * w;
    if (Math.abs(px) > GRENZE - .4 || Math.abs(pz) > GRENZE - .4 || kasten.some(k => k.h > 2 && px > k.x0 - .25 && px < k.x1 + .25 && pz > k.z0 - .25 && pz < k.z1 + .25)) { weite = Math.max(1.4, w - .7); break; }
  }
  S.camDist += (weite - S.camDist) * (1 - Math.exp(-(weite < S.camDist ? 22 : 3.5) * dt));
  const anteil = S.camDist / weiteSoll, hoch = (S.imAuto ? 1.2 : 1.45) + hoeheSoll * (anteil * .75 + .25);
  kamWunsch.set(zx + sx * S.camDist, hoch, zz + sz * S.camDist);
  kamera.position.lerp(kamWunsch, S.kamSprung ? 1 : 1 - Math.exp(-(S.imAuto ? 15 : 18) * dt));
  S.kamSprung = false;
  if (S.schuettel > 0) {
    S.schuettel = Math.max(0, S.schuettel - dt * 2.8);
    kamera.position.x += Math.sin(t * 61) * S.schuettel * .13; kamera.position.y += Math.sin(t * 47) * S.schuettel * .09;
  }
  const vorne = S.imAuto ? 1.2 + a.vf * .09 : 0;
  kamZiel.set(zx - Math.sin(ad) * vorne * (S.imAuto ? 1 : 0), S.imAuto ? 1.55 : 1.75, zz - Math.cos(ad) * vorne * (S.imAuto ? 1 : 0));
  kamBlick.lerp(kamZiel, S.imAuto ? 1 - Math.exp(-11 * dt) : 1);
  kamera.lookAt(kamBlick);
  const fovSoll = fovBasis + Math.min(10, fahr * .34);
  if (Math.abs(fovSoll - fovAktuell) > .04) { fovAktuell += (fovSoll - fovAktuell) * (1 - Math.exp(-3.5 * dt)); kamera.fov = fovAktuell; kamera.updateProjectionMatrix(); }

  himmel.position.set(zx, 0, zz);
  if (!handy) { sonne.target.position.set(zx, 0, zz); sonne.position.set(zx + 26, 46, zz + 18); sonne.target.updateMatrixWorld(); }
  W.animieren(t);
}

// ---------- Anzeigen: Karte und Texte werden seltener neu gezeichnet als das Bild ----------
const kartenFeld = $("karte");
if (handy) kartenFeld.width = kartenFeld.height = 176;
const kartePinsel = kartenFeld.getContext("2d");
const grundkarte = document.createElement("canvas"); grundkarte.width = grundkarte.height = 384;
{
  const g = grundkarte.getContext("2d"), k = 384 / (GRENZE * 2), mx = (v) => (v + GRENZE) * k;
  g.fillStyle = "#6b9d55"; g.fillRect(0, 0, 384, 384);
  g.fillStyle = "#3c3f47"; STRASSEN.forEach(([a, b, c, d]) => g.fillRect(mx(a), mx(c), (b - a) * k, (d - c) * k));
  g.fillStyle = "#74767c"; FLAECHEN.forEach(([a, b, c, d]) => g.fillRect(mx(a), mx(c), (b - a) * k, (d - c) * k));
  g.fillStyle = "#c9bfa9"; kasten.forEach(b => g.fillRect(mx(b.x0), mx(b.z0), (b.x1 - b.x0) * k, (b.z1 - b.z0) * k));
  g.fillStyle = "#0b7d68"; g.fillRect(mx(BUERO.x0), mx(BUERO.z0), (BUERO.x1 - BUERO.x0) * k, (BUERO.z1 - BUERO.z0) * k);
  g.fillStyle = "#d3145a"; g.fillRect(mx(DROGERIE.x0), mx(DROGERIE.z0), (DROGERIE.x1 - DROGERIE.x0) * k, (DROGERIE.z1 - DROGERIE.z0) * k);
}
function karteZeichnen(ziel) {
  const g = kartePinsel, B = kartenFeld.width, s = B / 256, r = 128, k = 384 / (GRENZE * 2) * 1.67;
  g.save(); g.scale(s, s); g.clearRect(0, 0, 256, 256);
  g.save(); g.beginPath(); g.arc(r, r, r, 0, Math.PI * 2); g.clip();
  g.translate(r, r); g.scale(1.67, 1.67); g.translate(-(S.ich.x + GRENZE) * 384 / (GRENZE * 2), -(S.ich.z + GRENZE) * 384 / (GRENZE * 2));
  g.drawImage(grundkarte, 0, 0);
  g.restore();
  const punkt = (wx, wz, farbe, gr) => {
    let px = (wx - S.ich.x) * k, pz = (wz - S.ich.z) * k; const l = Math.hypot(px, pz), max = r - 16;
    if (l > max) { px *= max / l; pz *= max / l; }
    g.fillStyle = farbe; g.strokeStyle = "#000"; g.lineWidth = 3; g.beginPath(); g.arc(r + px, r + pz, gr, 0, Math.PI * 2); g.fill(); g.stroke();
  };
  if (!S.imAuto) punkt(S.wagen.x, S.wagen.z, "#ff4d4d", 9);
  if (S.sterne) punkt(S.aylin.x, S.aylin.z, "#ff2d7a", 11);
  if (ziel) punkt(ziel[0], ziel[1], "#ffc83d", 14);
  g.translate(r, r); g.rotate(-(S.imAuto ? S.wagen.dreh : S.ich.dreh)); g.fillStyle = "#fff"; g.strokeStyle = "#000"; g.lineWidth = 3;
  g.beginPath(); g.moveTo(0, -17); g.lineTo(11, 12); g.lineTo(0, 6); g.lineTo(-11, 12); g.closePath(); g.fill(); g.stroke();
  g.restore();
}
let hudAlt = "", hudUhr = 0, karteUhr = 0;
function hudSchritt(dt) {
  hudUhr -= dt; karteUhr -= dt;
  const i = S.ich, akt = SCHRITTE[S.schritt];
  const zielPunkt = S.sterne || !akt ? null : akt.auto ? [S.wagen.x, S.wagen.z] : akt.marker;
  if (karteUhr <= 0) { karteUhr = 1 / 12; karteZeichnen(zielPunkt); }
  if (hudUhr > 0) return;
  hudUhr = 1 / 8;
  let ziel = akt ? akt.ziel : "Geschafft! Du kannst noch durchs Viertel fahren.";
  let unter = "";
  if (S.sterne) { ziel = "Aylin kommt mit der Folie! Lauf oder spring ins Auto."; unter = `Noch ${Math.ceil(Math.max(0, S.jagd))} Sekunden`; }
  if (zielPunkt && !unter) unter = `${Math.round(Math.hypot(i.x - zielPunkt[0], i.z - zielPunkt[1]))} m`;
  const spielt = S.an && !S.dialog && !S.wahl && S.gefangen <= 0;
  const nahAmAuto = !S.imAuto && Math.hypot(i.x - S.wagen.x, i.z - S.wagen.z) < EINSTIEG;
  const kmh = S.imAuto ? Math.round(Math.abs(S.wagen.vf) * 3.6 / 5) * 5 : -1;
  const stand = [ziel, unter, S.sterne, spielt, S.imAuto, nahAmAuto, S.aussteigen, kmh].join("|");
  if (stand === hudAlt) return;
  hudAlt = stand;
  $("ziel").innerHTML = `${ziel}${unter ? `<small>${unter}</small>` : ""}`;
  $("sterne").textContent = S.sterne ? "★".repeat(S.sterne) : "";
  const k = huelle.classList;
  k.toggle("touch", handy); k.toggle("im-auto", S.imAuto); k.toggle("spielt", spielt); k.toggle("nah-am-auto", nahAmAuto);
  $("aussteigen").textContent = S.aussteigen ? "Hält an …" : "Aussteigen";
  const h = $("hinweis");
  h.hidden = handy || !spielt || !(S.imAuto || nahAmAuto);
  h.textContent = S.aussteigen ? "Hält an …" : S.imAuto ? "E: Aussteigen · Leertaste: Handbremse" : "E: Einsteigen";
  $("tempo").hidden = !S.imAuto; if (S.imAuto) $("tempo").textContent = `${kmh} km/h`;
}

// ---------- Bildgröße und Leistung ----------
// Fällt die Bildrate, sinkt zuerst die Auflösung, danach kommen Wolken und zuletzt die Schatten dran
const AUFLOESUNG = handy ? [1.3, 1.05, .85, .7] : [2, 1.5, 1.15, 1];
let stufe = 0, messZeit = 0, messBilder = 0;
function aufloesungSetzen() {
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, AUFLOESUNG[stufe]));
  groesse();
}
function groesse() {
  const w = huelle.clientWidth, h = huelle.clientHeight; if (!w || !h) return;
  renderer.setSize(w, h, false); kamera.aspect = w / h; fovBasis = w / h < .8 ? 72 : 60;
  fovAktuell = fovBasis; kamera.fov = fovBasis; kamera.updateProjectionMatrix();
}
new ResizeObserver(groesse).observe(huelle);
function leistung(echt) {
  messZeit += echt; messBilder++;
  if (messZeit < 2) return;
  const fps = messBilder / messZeit; messZeit = 0; messBilder = 0;
  if (fps < 48 && stufe < AUFLOESUNG.length - 1) {
    stufe++; aufloesungSetzen();
    if (stufe >= 1) wolkenGruppe.visible = false;
    if (stufe >= 3 && !handy) sonne.castShadow = false;
  }
  if (statistik) statistik.dataset.fps = Math.round(fps);
}
const statistik = /[?&]stats\b/.test(location.search) ? $("statistik") : null;
if (statistik) statistik.hidden = false;
function statistikZeigen(echt) {
  if (statistik.dataset.uhr && performance.now() - statistik.dataset.uhr < 400) return;
  statistik.dataset.uhr = performance.now();
  const i = renderer.info.render;
  statistik.textContent = `${statistik.dataset.fps || "?"} fps · ${Math.round(echt * 1000)} ms · ${i.calls} Aufrufe · ${Math.round(i.triangles / 1000)}k Dreiecke · Stufe ${stufe}`;
}

// ---------- Schleife ----------
let zeit = 0, letzt = performance.now(), speicher = 0;
function bild() {
  const jetzt = performance.now(), echt = Math.min(.1, (jetzt - letzt) / 1000); letzt = jetzt;
  speicher += echt;
  let n = 0;
  while (speicher >= SCHRITT_ZEIT && n++ < 6) { schrittSpiel(SCHRITT_ZEIT); speicher -= SCHRITT_ZEIT; }
  if (n >= 6) speicher = 0;
  zeit += echt;
  darstellen(echt, speicher / SCHRITT_ZEIT, zeit);
  hudSchritt(echt);
  renderer.render(szene, kamera);
  if (S.an) leistung(echt);
  if (statistik) statistikZeigen(echt);
}

// ---------- Start ----------
$("steuerung").innerHTML = handy
  ? "<li>Links: Daumen aufsetzen und laufen, ganz ausgelenkt rennst du</li><li>Im Auto: links lenken, rechts Gas und Bremse</li><li>Über das Bild wischen dreht die Kamera</li><li>Am besten hältst du das Handy quer</li>"
  : "<li>WASD oder Pfeiltasten: laufen und fahren</li><li>Shift: rennen, E: einsteigen und weiter</li><li>Leertaste: Handbremse, mit der Maus ziehen: Kamera drehen</li>";
huelle.classList.toggle("touch", handy);
aufloesungSetzen();
schrittSpiel(SCHRITT_ZEIT); darstellen(0, 1, 0); hudSchritt(1); renderer.render(szene, kamera);
const los = $("los"); los.disabled = false; los.textContent = "Mission starten";
los.addEventListener("click", () => {
  $("start").hidden = true; S.an = true; hudAlt = ""; hudUhr = 0; huelle.classList.add("laeuft"); hudUhr = 0;
  if (handy && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen({ navigationUI: "hide" }).catch(() => {});
  messZeit = 0; messBilder = 0; letzt = performance.now();
});
renderer.setAnimationLoop(bild);
