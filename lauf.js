// „Fröbelinchen rennt“: 3D-Lauf-Spiel durch eine Kita-Welt (Three.js).
// Fröbelinchen läuft automatisch; links/rechts = Spur wechseln oder an der Ecke abbiegen, hoch = springen, runter = ducken.
// Stolpern holt Anja heran, stolpert man, während sie dicht dran ist, hat sie Fröbelinchen erwischt.
// Maße in Metern. Der Weg besteht aus geraden Abschnitten nach Norden, Osten oder Westen (nie zurück),
// dadurch kreuzt er sich nie selbst.
const rahmen = document.getElementById("lauf-rahmen");
if (rahmen) {
  const huelle = rahmen.querySelector(".lauf-buehne"), hud = rahmen.querySelector(".lauf-hud");
  const ueber = rahmen.querySelector(".lauf-overlay"), warnung = rahmen.querySelector(".lauf-warnung");
  const losKnopf = rahmen.querySelector(".lauf-los"), ueberTitel = rahmen.querySelector(".lauf-titel");
  const ueberText = rahmen.querySelector(".lauf-text"), zu = rahmen.querySelector(".lauf-zu");
  const handy = matchMedia("(pointer: coarse)").matches;
  let THREE = null, bereit = null;

  const kannWebGL = (() => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; } })();
  if (!kannWebGL) {
    ueberText.textContent = "Dein Browser kann leider kein 3D (WebGL). Probier es auf einem anderen Gerät.";
    losKnopf.hidden = true;
  } else {
    // Three.js erst laden, wenn das Spiel in die Nähe kommt
    new IntersectionObserver((e, b) => { if (e.some(x => x.isIntersecting)) { b.disconnect(); laden(); } }, { rootMargin: "300px" }).observe(rahmen);
  }
  function laden() {
    if (!bereit) bereit = import("./vendor/three/three.module.min.js").then(m => { THREE = m; aufbauen(); });
    return bereit;
  }

  // ---------- Spielwerte ----------
  const SPUR = 1.6, H = 2.9, ECKE = 7;            // Spurbreite, halbe Wegbreite, Abbiegezone vor der Ecke
  const START_TEMPO = 9, MAX_TEMPO = 21, BESCHL = .1;
  const SPRUNG = 7.2, G = 22, DUCKEN = .75;
  let renderer, szene, kamera, uhr, boden, spieler, anja, sternGeo, mat = {}, geo = {};
  let abschnitte = [], hindernisse = [], sterne = [], deko = [];
  let zustand = "start", tempo, punkte, sternZahl, strecke, rekord = 0;
  const S = { idx: 0, s: 0, spur: 0, x: 0, y: 0, vy: 0, duck: 0, abbiegen: 0, stolper: 0, lauf: 0 };
  const A = { nah: false, zeit: 0, abstand: 16, bis: 5, lauf: 0 };
  try { rekord = +localStorage.getItem("froebelinchen-rennt-rekord") || 0; } catch (e) {}

  const richtung = (h) => h === 0 ? [0, -1] : [h, 0];           // Norden = -z, Osten = +x, Westen = -x
  const rechts = (h) => { const [dx, dz] = richtung(h); return [-dz, dx]; };
  const punkt = (ab, s, x) => {
    const [dx, dz] = richtung(ab.h), [rx, rz] = rechts(ab.h);
    return [ab.ax + dx * s + rx * x, ab.az + dz * s + rz * x];
  };
  const zufall = (a, b) => a + Math.random() * (b - a);

  // ---------- Aufbau ----------
  function aufbauen() {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    huelle.prepend(renderer.domElement);
    szene = new THREE.Scene();
    const himmel = new THREE.Color("#bfe6fb");
    szene.background = himmel; szene.fog = new THREE.Fog(himmel, 35, 95);
    kamera = new THREE.PerspectiveCamera(62, 1, .1, 200);
    szene.add(new THREE.HemisphereLight("#ffffff", "#7fb069", 1.6));
    const sonne = new THREE.DirectionalLight("#fff4dc", 1.6); sonne.position.set(-6, 12, 4); szene.add(sonne);
    uhr = new THREE.Clock();

    const m = (c) => new THREE.MeshLambertMaterial({ color: c });
    Object.assign(mat, {
      weg: m("#f1dcb0"), wegRand: m("#e4c88f"), hecke: m("#3f8f3f"), hecke2: m("#4aa04a"), gras: m("#8fcf5f"),
      holz: m("#b97a45"), pfuetze: new THREE.MeshLambertMaterial({ color: "#5fb4e8", transparent: true, opacity: .85 }),
      stern: new THREE.MeshLambertMaterial({ color: "#ffd23f", emissive: "#a07800" }),
      stamm: m("#8b5a2b"), krone: m("#4c9a3a"), dach: m("#e2574c"),
      bunt: ["#e53935", "#1e88e5", "#fdd835", "#43a047", "#8e24aa", "#fb8c00"].map(m),
      haus: ["#fff3c4", "#d6ecff", "#ffe0e6"].map(m),
    });
    Object.assign(geo, { ball: new THREE.SphereGeometry(.45, 18, 14), ring: new THREE.TorusGeometry(.45, .05, 6, 24),
      pfuetze: new THREE.CylinderGeometry(1, 1, .03, 24), krone: new THREE.SphereGeometry(1.4, 12, 10) });
    boden = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), mat.gras);
    boden.rotation.x = -Math.PI / 2; boden.position.y = -.02; szene.add(boden);

    // Stern zum Einsammeln
    const form = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? .14 : .32, w = i / 10 * Math.PI * 2; form[i ? "lineTo" : "moveTo"](Math.sin(w) * r, Math.cos(w) * r); }
    sternGeo = new THREE.ExtrudeGeometry(form, { depth: .08, bevelEnabled: false }); sternGeo.center();

    spieler = giraffeBauen(); szene.add(spieler.gruppe);
    anja = anjaBauen(); szene.add(anja.gruppe);
    neu();
    groesse(); new ResizeObserver(groesse).observe(huelle);
    renderer.setAnimationLoop(bild);
  }

  function groesse() {
    const w = huelle.clientWidth, h = huelle.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); kamera.aspect = w / h;
    kamera.fov = w / h < .8 ? 72 : 62; kamera.updateProjectionMatrix();
  }

  // Fröbelinchen: kleine Plüschgiraffe aus einfachen Formen, schaut nach -z
  function giraffeBauen() {
    const g = new THREE.Group(), o = new THREE.MeshLambertMaterial({ color: "#f28c1a" });
    const od = new THREE.MeshLambertMaterial({ color: "#c9650a" }), hell = new THREE.MeshLambertMaterial({ color: "#ffd9a8" });
    const braun = new THREE.MeshLambertMaterial({ color: "#8d4b12" }), schwarz = new THREE.MeshLambertMaterial({ color: "#2b1a0e" });
    const kugel = new THREE.SphereGeometry(1, 18, 14);
    const koerper = new THREE.Mesh(kugel, o); koerper.scale.set(.42, .38, .62); koerper.position.y = 1.0; g.add(koerper);
    const bauch = new THREE.Mesh(kugel, hell); bauch.scale.set(.32, .2, .45); bauch.position.set(0, .82, 0); g.add(bauch);
    for (const [x, y, z, r] of [[.3, 1.1, .1, .1], [-.32, 1.05, -.15, .09], [.25, 1.2, -.3, .08], [-.2, 1.25, .3, .09], [.05, 1.36, .05, .08], [-.36, .95, .25, .07]]) {
      const f = new THREE.Mesh(kugel, od); f.scale.set(r, r * .7, r); f.position.set(x, y, z); g.add(f);
    }
    // Hals mit Kopf, dreht beim Ducken nach vorn
    const hals = new THREE.Group(); hals.position.set(0, 1.18, -.42); g.add(hals);
    const halsM = new THREE.Mesh(new THREE.CylinderGeometry(.12, .17, .95, 12), o); halsM.position.y = .45; halsM.rotation.x = -.2; hals.add(halsM);
    for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(kugel, braun); m.scale.set(.05, .07, .05); m.position.set(0, .15 + i * .17, .14 - i * .035); hals.add(m); }
    const kopf = new THREE.Group(); kopf.position.set(0, .95, -.12); hals.add(kopf);
    const kopfM = new THREE.Mesh(kugel, o); kopfM.scale.set(.2, .19, .28); kopf.add(kopfM);
    const maul = new THREE.Mesh(kugel, hell); maul.scale.set(.15, .12, .14); maul.position.set(0, -.04, -.22); kopf.add(maul);
    for (const s of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.CylinderGeometry(.03, .035, .2, 8), od); horn.position.set(s * .08, .25, .05); kopf.add(horn);
      const knopf = new THREE.Mesh(kugel, braun); knopf.scale.setScalar(.05); knopf.position.set(s * .08, .36, .05); kopf.add(knopf);
      const ohr = new THREE.Mesh(kugel, od); ohr.scale.set(.1, .04, .05); ohr.position.set(s * .21, .12, .08); ohr.rotation.z = s * .4; kopf.add(ohr);
      const auge = new THREE.Mesh(kugel, schwarz); auge.scale.setScalar(.035); auge.position.set(s * .12, .07, -.17); kopf.add(auge);
    }
    const beine = [];
    for (const [x, z] of [[-.22, -.32], [.22, -.32], [-.22, .32], [.22, .32]]) {
      const p = new THREE.Group(); p.position.set(x, .85, z); g.add(p);
      const b = new THREE.Mesh(new THREE.CylinderGeometry(.08, .07, .78, 10), o); b.position.y = -.4; p.add(b);
      const huf = new THREE.Mesh(new THREE.CylinderGeometry(.085, .09, .1, 10), braun); huf.position.y = -.8; p.add(huf);
      beine.push(p);
    }
    const schwanz = new THREE.Mesh(new THREE.CylinderGeometry(.025, .03, .5, 6), od);
    schwanz.position.set(0, 1.0, .68); schwanz.rotation.x = .6; g.add(schwanz);
    return { gruppe: g, hals, beine, schwanz };
  }

  // Anja: Läuferin mit blondem Pferdeschwanz
  function anjaBauen() {
    const g = new THREE.Group(), kugel = new THREE.SphereGeometry(1, 16, 12);
    const haut = new THREE.MeshLambertMaterial({ color: "#f3c6a0" }), haar = new THREE.MeshLambertMaterial({ color: "#f1cf5e" });
    const shirt = new THREE.MeshLambertMaterial({ color: "#e8577a" }), hose = new THREE.MeshLambertMaterial({ color: "#2f4b7c" });
    const schuh = new THREE.MeshLambertMaterial({ color: "#fafafa" });
    const rumpf = new THREE.Mesh(new THREE.CylinderGeometry(.2, .17, .62, 12), shirt); rumpf.position.y = 1.18; rumpf.rotation.x = -.15; g.add(rumpf);
    const kopf = new THREE.Mesh(kugel, haut); kopf.scale.setScalar(.17); kopf.position.set(0, 1.66, -.05); g.add(kopf);
    const haarM = new THREE.Mesh(kugel, haar); haarM.scale.set(.185, .17, .18); haarM.position.set(0, 1.71, .0); g.add(haarM);
    const zopf = new THREE.Mesh(kugel, haar); zopf.scale.set(.07, .07, .2); zopf.position.set(0, 1.7, .22); g.add(zopf);
    const glied = (x, y, mat1, mat2, laenge) => {
      const p = new THREE.Group(); p.position.set(x, y, 0); g.add(p);
      const o = new THREE.Mesh(new THREE.CylinderGeometry(.065, .06, laenge, 8), mat1); o.position.y = -laenge / 2; p.add(o);
      const e = new THREE.Mesh(kugel, mat2); e.scale.set(.07, .05, .12); e.position.set(0, -laenge, -.04); p.add(e);
      return p;
    };
    const beine = [glied(-.1, .88, hose, schuh, .86), glied(.1, .88, hose, schuh, .86)];
    const arme = [glied(-.26, 1.42, shirt, haut, .55), glied(.26, 1.42, shirt, haut, .55)];
    return { gruppe: g, beine, arme, zopf };
  }

  // ---------- Weg erzeugen ----------
  const einheit = () => new THREE.BoxGeometry(1, 1, 1);
  let kiste = null;
  function kasten(gruppe, material, cx, cy, cz, sx, sy, sz, rotY = 0) {
    kiste = kiste || einheit();
    const k = new THREE.Mesh(kiste, material); k.position.set(cx, cy, cz); k.scale.set(sx, sy, sz); k.rotation.y = rotY;
    gruppe.add(k); return k;
  }

  function abschnittNeu() {
    const vor = abschnitte[abschnitte.length - 1];
    let ax = 0, az = 0, h = 0, nr = 0;
    if (vor) { [ax, az] = punkt(vor, vor.L, 0); h = vor.h + vor.dreh; nr = vor.nr + 1; }
    const L = nr === 0 ? 55 : Math.round(zufall(32, 58));
    const dreh = h === 0 ? (Math.random() < .5 ? -1 : 1) : -h;   // nie nach Süden
    const ab = { nr, ax, az, h, L, dreh, gruppe: new THREE.Group() };
    abschnitte.push(ab); szene.add(ab.gruppe);
    const yaw = -h * Math.PI / 2;
    const welt = (s, x, y = 0) => { const [px, pz] = punkt(ab, s, x); return [px, y, pz]; };

    // Boden des Wegs inkl. Eckfeld
    const [mx, , mz] = welt((L + H) / 2, 0);
    kasten(ab.gruppe, mat.weg, mx, -.01, mz, 2 * H, .02, L + H, yaw);
    for (const x of [-SPUR / 2, SPUR / 2]) {   // feine Spurlinien
      const [lx, , lz] = welt(L / 2, x); kasten(ab.gruppe, mat.wegRand, lx, 0, lz, .06, .02, L, yaw);
    }
    // Hecken links und rechts; auf der Abbiege-Seite endet die Hecke vor der Ecke
    for (const seite of [-1, 1]) {
      const bis = seite === ab.dreh ? L - H : L + H, von = nr === 0 ? -6 : H;
      const [hx, , hz] = welt((von + bis) / 2, seite * (H + .35));
      kasten(ab.gruppe, seite < 0 ? mat.hecke : mat.hecke2, hx, .85, hz, .7, 1.7, bis - von, yaw);
    }
    // Hecke quer am Ende: hier muss man abbiegen
    const [ex, , ez] = welt(L + H + .35, 0); kasten(ab.gruppe, mat.hecke, ex, .85, ez, 2 * H + 1.4, 1.7, .7, yaw);
    if (nr === 0) { const [bx, , bz] = welt(-6.35, 0); kasten(ab.gruppe, mat.hecke, bx, .85, bz, 2 * H + 1.4, 1.7, .7, yaw); }

    // Hindernisse und Sterne
    let s = nr === 0 ? 24 : 12;
    while (s < L - 10) {
      hindernisNeu(ab, s, welt, yaw);
      s += zufall(10, 16) * Math.min(1.4, tempo / START_TEMPO * .9 + .2);
    }
    // Kita-Welt neben dem Weg
    for (let d = 10; d < L - 10; d += zufall(9, 15)) {
      const seite = Math.random() < .5 ? -1 : 1, abst = H + zufall(3, 9);
      const [px, , pz] = welt(d, seite * abst);
      dekoNeu(ab.gruppe, px, pz, yaw);
    }
  }

  function hindernisNeu(ab, s, welt, yaw) {
    const r = Math.random(), g = ab.gruppe;
    let typ, spuren = [-1, 0, 1];
    if (r < .3) {
      typ = "kloetze";
      spuren = [-1, 0, 1].sort(() => Math.random() - .5).slice(0, Math.random() < .5 ? 1 : 2);
      for (const sp of spuren) {
        for (let i = 0; i < 3; i++) {
          const [x, y, z] = welt(s, sp * SPUR, .25 + i * .5);
          kasten(g, mat.bunt[(i + sp + 3) % 6], x, y, z, .9 - i * .08, .5, .9 - i * .08, yaw + i * .25);
        }
      }
    } else if (r < .55) {
      typ = "ball"; spuren = [[-1, 0, 1][Math.floor(Math.random() * 3)]];
      const [x, y, z] = welt(s, spuren[0] * SPUR, .45);
      const b = new THREE.Mesh(geo.ball, mat.bunt[Math.floor(Math.random() * 6)]); b.position.set(x, y, z); g.add(b);
      const ring = new THREE.Mesh(geo.ring, mat.haus[0]); ring.position.set(x, y, z); ring.rotation.y = yaw; g.add(ring);
    } else if (r < .7) {
      typ = "balken";
      const [x, y, z] = welt(s, 0, .22); kasten(g, mat.holz, x, y, z, 2 * H - .2, .44, .35, yaw);
      for (const sp of [-1, 0, 1]) { const [bx, by, bz] = welt(s, sp * SPUR, .46); kasten(g, mat.bunt[sp + 1], bx, by, bz, .5, .04, .37, yaw); }
    } else if (r < .8) {
      typ = "pfuetze";
      const [x, , z] = welt(s, 0); const p = new THREE.Mesh(geo.pfuetze, mat.pfuetze);
      p.scale.set(H - .2, 1, .9); p.position.set(x, .02, z); p.rotation.y = yaw; g.add(p);
    } else {
      typ = "stange";     // Kletterstange quer: ducken
      const [x, , z] = welt(s, 0); kasten(g, mat.bunt[1], x, 1.42, z, 2 * H, .22, .22, yaw);
      for (const sd of [-1, 1]) { const [px, , pz] = welt(s, sd * (H - .1)); kasten(g, mat.bunt[0], px, .75, pz, .2, 1.5, .2, yaw); }
      const [fx, , fz] = welt(s, 0); kasten(g, mat.bunt[2], fx, 1.62, fz, .9, .3, .06, yaw);
    }
    hindernisse.push({ nr: ab.nr, s, typ, spuren, getroffen: false });
    // Sterne in einer freien Spur hinter dem Hindernis
    const frei = [-1, 0, 1].filter(sp => typ !== "kloetze" || !spuren.includes(sp));
    const sp = frei[Math.floor(Math.random() * frei.length)];
    for (let i = 0; i < 4; i++) {
      const ds = s + 3 + i * 1.3; if (ds > ab.L - 4) break;
      const [x, , z] = welt(ds, sp * SPUR);
      const m = new THREE.Mesh(sternGeo, mat.stern); m.position.set(x, .9, z); g.add(m);
      sterne.push({ nr: ab.nr, s: ds, spur: sp, mesh: m, weg: false });
    }
  }

  function dekoNeu(g, x, z, yaw) {
    const r = Math.random();
    if (r < .5) {           // Baum
      kasten(g, mat.stamm, x, 1, z, .35, 2, .35);
      const k = new THREE.Mesh(geo.krone, mat.krone); k.position.set(x, 2.8, z); g.add(k);
    } else if (r < .8) {    // Kita-Häuschen mit Spitzdach
      const b = zufall(3, 4.5), t = zufall(3, 4);
      kasten(g, mat.haus[Math.floor(Math.random() * 3)], x, 1.3, z, b, 2.6, t, yaw);
      const d = new THREE.Mesh(new THREE.ConeGeometry(Math.max(b, t) * .78, 1.6, 4), mat.dach);
      d.position.set(x, 3.4, z); d.rotation.y = yaw + Math.PI / 4; g.add(d);
      kasten(g, mat.bunt[Math.floor(Math.random() * 6)], x, .8, z, .9, 1.6, t + .04, yaw);
    } else {                // Rutsche
      kasten(g, mat.bunt[3], x, 1.1, z, .9, 2.2, .9, yaw);
      const r2 = kasten(g, mat.bunt[2], x, .9, z, .7, .1, 3, yaw); r2.rotation.x = .55; r2.position.y = .95;
    }
  }

  function neu() {
    for (const ab of abschnitte) szene.remove(ab.gruppe);
    abschnitte = []; hindernisse = []; sterne = [];
    tempo = START_TEMPO; punkte = 0; sternZahl = 0; strecke = 0;
    Object.assign(S, { idx: 0, s: 0, spur: 0, x: 0, y: 0, vy: 0, duck: 0, abbiegen: 0, stolper: 0 });
    Object.assign(A, { nah: false, zeit: 0, abstand: 16, bis: 5 });
    while (abschnitte.length < 4) abschnittNeu();
    kamYaw = 0; kamPos = null;
    hudZeigen();
  }

  // ---------- Steuerung ----------
  function eingabe(art) {
    if (zustand !== "laeuft") return;
    const ab = abschnitte.find(a => a.nr === S.idx);
    if (art === "links" || art === "rechts") {
      const d = art === "links" ? -1 : 1;
      if (ab.L - S.s < ECKE && S.s < ab.L + .6 && d === ab.dreh) { S.abbiegen = d; return; }
      S.spur = Math.max(-1, Math.min(1, S.spur + d));
    } else if (art === "hoch") {
      if (S.y <= 0) { S.vy = SPRUNG; S.duck = 0; }
    } else if (art === "runter") {
      S.duck = DUCKEN; if (S.y > 0) S.vy = Math.min(S.vy, -9);
    }
  }
  const TASTEN = { ArrowLeft: "links", KeyA: "links", ArrowRight: "rechts", KeyD: "rechts", ArrowUp: "hoch", KeyW: "hoch", Space: "hoch", ArrowDown: "runter", KeyS: "runter" };
  addEventListener("keydown", (e) => {
    const art = TASTEN[e.code];
    if (!art || zustand !== "laeuft") return;
    e.preventDefault(); if (!e.repeat) eingabe(art);
  });
  let wisch = null;
  huelle.addEventListener("touchstart", (e) => { const t = e.touches[0]; wisch = { x: t.clientX, y: t.clientY, fertig: false }; }, { passive: true });
  huelle.addEventListener("touchmove", (e) => {
    if (zustand === "laeuft") e.preventDefault();
    if (!wisch || wisch.fertig) return;
    const t = e.touches[0], dx = t.clientX - wisch.x, dy = t.clientY - wisch.y;
    if (Math.hypot(dx, dy) < 28) return;
    wisch.fertig = true;   // schon während des Wischens auslösen, das fühlt sich schneller an
    eingabe(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "links" : "rechts") : (dy < 0 ? "hoch" : "runter"));
  }, { passive: false });
  huelle.addEventListener("touchend", () => { wisch = null; });

  // ---------- Start, Ende, Vollbild ----------
  let vollbild = false;
  async function vollbildAn() {
    vollbild = true; rahmen.classList.add("vollbild"); document.body.classList.add("spiel-offen");
    try { await (rahmen.requestFullscreen || rahmen.webkitRequestFullscreen).call(rahmen); } catch (e) {}
  }
  function vollbildAus() {
    if (!vollbild) return;
    vollbild = false; rahmen.classList.remove("vollbild"); document.body.classList.remove("spiel-offen");
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    if (zustand === "laeuft") ende("Pause gemacht");
  }
  zu.addEventListener("click", vollbildAus);
  document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && vollbild) vollbildAus(); });

  losKnopf.addEventListener("click", async () => {
    if (handy && !vollbild) vollbildAn();
    await laden();
    if (zustand === "aus") neu();
    zustand = "laeuft"; window.froebelAktiv = "lauf";
    ueber.hidden = true; uhr.getDelta();
  });

  function ende(grund) {
    zustand = "aus"; window.froebelAktiv = null;
    const p = Math.floor(punkte);
    if (p > rekord) { rekord = p; try { localStorage.setItem("froebelinchen-rennt-rekord", rekord); } catch (e) {} }
    ueberTitel.textContent = grund;
    ueberText.textContent = `${p} Punkte · ${sternZahl} Sterne · Rekord ${rekord}`;
    losKnopf.textContent = "Nochmal";
    ueber.hidden = false;
  }

  function warnen() {
    warnung.classList.remove("an"); void warnung.offsetWidth; warnung.classList.add("an");
  }
  function anjaKommt(dauer) {
    A.nah = true; A.zeit = dauer; warnen();
  }
  function stolpern() {
    if (A.nah && A.abstand < 7) { ende("Anja hat dich erwischt!"); return; }
    S.stolper = .5; tempo = Math.max(START_TEMPO, tempo * .85);
    anjaKommt(6);
  }

  function hudZeigen() {
    hud.textContent = `${Math.floor(punkte)} Punkte · ★ ${sternZahl}`;
  }

  // ---------- Spielschritt ----------
  function schritt(dt) {
    tempo = Math.min(MAX_TEMPO, tempo + BESCHL * dt);
    const v = tempo * (S.stolper > 0 ? .6 : 1);
    S.s += v * dt; strecke += v * dt; punkte += v * dt;
    S.stolper = Math.max(0, S.stolper - dt);

    let ab = abschnitte.find(a => a.nr === S.idx);
    if (S.abbiegen && S.s >= ab.L - .2) {             // an der Ecke: in den nächsten Abschnitt wechseln
      const weiter = abschnitte.find(a => a.nr === S.idx + 1);
      S.s = Math.max(0, S.s - ab.L); S.idx++; S.abbiegen = 0; ab = weiter;
    } else if (S.s > ab.L + H - .9) {
      ende("Autsch, die Hecke! Du musst abbiegen."); return;
    }
    // Abschnitte nachladen und alte entfernen
    while (abschnitte[abschnitte.length - 1].nr < S.idx + 3) abschnittNeu();
    while (abschnitte[0].nr < S.idx - 1) {
      const alt = abschnitte.shift(); szene.remove(alt.gruppe);
      hindernisse = hindernisse.filter(h => h.nr !== alt.nr); sterne = sterne.filter(s => s.nr !== alt.nr);
    }

    S.x += (S.spur * SPUR - S.x) * Math.min(1, dt * 12);
    S.vy -= G * dt; S.y = Math.max(0, S.y + S.vy * dt); if (S.y === 0) S.vy = 0;
    S.duck = Math.max(0, S.duck - dt);

    // Zusammenstöße
    for (const h of hindernisse) {
      if (h.getroffen || h.nr !== S.idx || Math.abs(h.s - S.s) > .55) continue;
      const spur = Math.round(S.x / SPUR);
      if (!h.spuren.includes(spur)) continue;
      if (h.typ === "kloetze") { h.getroffen = true; ende("Bumm, Bauklötze! Wechsel die Spur."); return; }
      const trifft = h.typ === "stange" ? S.duck <= 0 : S.y < (h.typ === "ball" ? .75 : h.typ === "balken" ? .45 : .15);
      if (trifft) { h.getroffen = true; stolpern(); if (zustand !== "laeuft") return; }
    }
    for (const st of sterne) {
      if (st.weg || st.nr !== S.idx || Math.abs(st.s - S.s) > .8 || Math.round(S.x / SPUR) !== st.spur) continue;
      st.weg = true; st.mesh.visible = false; sternZahl++; punkte += 10;
    }

    // Anja: kommt am Anfang nach 5 s, danach alle 15–22 s, und wenn man stolpert
    A.bis -= dt;
    if (!A.nah && A.bis <= 0) anjaKommt(5);
    if (A.nah) { A.zeit -= dt; if (A.zeit <= 0) { A.nah = false; A.bis = zufall(15, 22); } }
    A.abstand += ((A.nah ? 3.4 : 18) - A.abstand) * Math.min(1, dt * (A.nah ? 1.6 : .5));
    hudZeigen();
  }

  // ---------- Bild ----------
  let kamYaw = 0, kamPos = null;
  const winkel = (a, b, k) => a + (((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI) * k;
  function bild() {
    const dt = Math.min(.05, uhr.getDelta());
    if (zustand === "laeuft") schritt(dt);
    const ab = abschnitte.find(a => a.nr === S.idx);
    const [px, pz] = punkt(ab, S.s, S.x), yaw = -ab.h * Math.PI / 2;
    const lauft = zustand === "laeuft";

    // Fröbelinchen
    const g = spieler.gruppe;
    const ziel = new THREE.Vector3(px, S.y, pz);
    if (!kamPos) g.position.copy(ziel); else g.position.lerp(ziel, Math.min(1, dt * 18));
    g.rotation.y = winkel(g.rotation.y, yaw, Math.min(1, dt * 12));
    if (lauft) S.lauf += dt * tempo * (A.nah ? 1.5 : 1.1);
    spieler.beine.forEach((b, i) => { b.rotation.x = S.y > 0 ? (i < 2 ? -.6 : .6) : Math.sin(S.lauf + (i === 0 || i === 3 ? 0 : Math.PI)) * .7; });
    spieler.hals.rotation.x = S.duck > 0 ? -1.15 : (S.stolper > 0 ? Math.sin(S.stolper * 30) * .3 : 0);
    g.position.y -= S.duck > 0 ? .25 : 0;
    spieler.schwanz.rotation.z = Math.sin(S.lauf * .5) * .3;

    // Anja läuft hinter Fröbelinchen auf demselben Weg
    let aab = ab, as = S.s - A.abstand;
    if (as < 0) { const vor = abschnitte.find(a => a.nr === S.idx - 1); if (vor) { aab = vor; as += vor.L; } else as = Math.max(as, -5); }
    const [ax, az] = punkt(aab, as, S.x > .8 ? S.x - 1.1 : S.x + 1.1); // leicht versetzt, damit sie die Sicht nicht verdeckt
    anja.gruppe.visible = A.abstand < 15;
    anja.gruppe.position.set(ax, 0, az); anja.gruppe.rotation.y = -aab.h * Math.PI / 2;
    if (lauft) A.lauf += dt * 11;
    anja.beine.forEach((b, i) => { b.rotation.x = Math.sin(A.lauf + i * Math.PI) * .8; });
    anja.arme.forEach((a, i) => { a.rotation.x = -Math.sin(A.lauf + i * Math.PI) * .9; });
    anja.zopf.position.y = 1.7 + Math.sin(A.lauf * 2) * .03;

    for (const st of sterne) st.mesh.rotation.y += dt * 3;
    boden.position.set(px, -.02, pz);

    // Kamera schräg hinter Fröbelinchen, dreht beim Abbiegen weich mit
    kamYaw = kamPos ? winkel(kamYaw, yaw, Math.min(1, dt * 5)) : yaw;
    const sin = Math.sin(kamYaw), cos = Math.cos(kamYaw);
    const hoch = kamera.aspect < .8;   // Handy hochkant: höher und steiler, sonst ist oben nur Himmel
    const ziel2 = new THREE.Vector3(px + sin * (hoch ? 7.5 : 7), hoch ? 6.2 : 4.6, pz + cos * (hoch ? 7.5 : 7));
    if (!kamPos) kamPos = ziel2.clone(); else kamPos.lerp(ziel2, Math.min(1, dt * 8));
    kamera.position.copy(kamPos);
    kamera.lookAt(px - sin * (hoch ? 5 : 7), hoch ? -.6 : .6, pz - cos * (hoch ? 5 : 7));
    renderer.render(szene, kamera);
  }
}
