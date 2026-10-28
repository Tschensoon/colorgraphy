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
  rahmen.classList.toggle("touch", handy);
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
    if (!bereit) bereit = Promise.all([import("./vendor/three/three.module.min.js"), import("./lauf-welt.js?v=1")])
      .then(([m, w]) => { THREE = m; aufbauen(w); });
    return bereit;
  }

  // ---------- Spielwerte ----------
  const SPUR = 1.6, H = 2.9, ECKE = 7;            // Spurbreite, halbe Wegbreite, Abbiegezone vor der Ecke
  const START_TEMPO = 9, MAX_TEMPO = 21, BESCHL = .1;
  const SPRUNG = 7.2, G = 22, DUCKEN = .75;
  let renderer, szene, kamera, uhr, boden, spieler, anja;
  let abschnitte = [], hindernisse = [], sterne = [];
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
  let W, sonne, himmelKugel, wolkenGruppe;
  function aufbauen(weltModul) {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, handy ? 1.5 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    huelle.prepend(renderer.domElement);
    W = weltModul.welt(THREE, handy);
    szene = new THREE.Scene();
    szene.fog = new THREE.Fog("#dcedf6", 45, 120);
    himmelKugel = W.himmel(); szene.add(himmelKugel);
    wolkenGruppe = W.wolken(); szene.add(wolkenGruppe);
    // Spiegelungen für Sterne, Ball und Pfützen kommen aus einem Abbild des Himmels
    const pmrem = new THREE.PMREMGenerator(renderer), himmelSzene = new THREE.Scene();
    himmelSzene.add(W.himmel());
    szene.environment = pmrem.fromScene(himmelSzene, .02).texture;
    kamera = new THREE.PerspectiveCamera(62, 1, .1, 400);
    szene.add(new THREE.HemisphereLight("#d6ecff", "#6c8f3c", .9));
    sonne = new THREE.DirectionalLight("#fff0d4", 2.6);
    sonne.castShadow = true;
    sonne.shadow.mapSize.set(handy ? 1024 : 2048, handy ? 1024 : 2048);
    Object.assign(sonne.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 70 });
    sonne.shadow.bias = -.0004; sonne.shadow.normalBias = .03;
    szene.add(sonne, sonne.target);
    uhr = new THREE.Clock();
    boden = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), W.mat.gras);
    boden.rotation.x = -Math.PI / 2; boden.position.y = -.02; boden.receiveShadow = true; szene.add(boden);
    spieler = W.giraffeBauen(); szene.add(spieler.gruppe);
    anja = W.anjaBauen(); szene.add(anja.gruppe);
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

  // ---------- Weg erzeugen ----------
  function abschnittNeu() {
    const vor = abschnitte[abschnitte.length - 1];
    let ax = 0, az = 0, h = 0, nr = 0;
    if (vor) { [ax, az] = punkt(vor, vor.L, 0); h = vor.h + vor.dreh; nr = vor.nr + 1; }
    const L = nr === 0 ? 55 : Math.round(zufall(32, 58));
    const dreh = h === 0 ? (Math.random() < .5 ? -1 : 1) : -h;   // nie nach Süden
    const ab = { nr, ax, az, h, L, dreh, gruppe: new THREE.Group() };
    abschnitte.push(ab); szene.add(ab.gruppe);
    const yaw = -h * Math.PI / 2;
    // Objekt an Wegposition s (entlang) / x (quer) setzen und in Laufrichtung drehen
    const setze = (obj, s, x, y = 0, extra = 0) => {
      const [px, pz] = punkt(ab, s, x); obj.position.set(px, y, pz); obj.rotation.y = yaw + extra; ab.gruppe.add(obj); return obj;
    };

    // Pflasterweg inkl. Eckfeld, Randsteine
    const von = nr === 0 ? -6 : 0;
    setze(W.boden(L + H - von, 2 * H), (von + L + H) / 2, 0);
    for (const seite of [-1, 1]) {       // Randsteine wie die Hecken: an der Abbiege-Seite offen
      const bis = seite === ab.dreh ? L - H : L + H, anf = nr === 0 ? -6 : H;
      setze(W.kante(bis - anf), (anf + bis) / 2, seite * (H - .09), .05);
    }
    // Hecken links und rechts; auf der Abbiege-Seite endet die Hecke vor der Ecke
    for (const seite of [-1, 1]) {
      const bis = seite === ab.dreh ? L - H : L + H, anf = nr === 0 ? -6 : H;
      setze(W.heckenStueck(bis - anf), (anf + bis) / 2, seite * (H + .4), .875);
    }
    // Hecke quer am Ende: hier muss man abbiegen
    setze(W.heckenStueck(2 * H + 1.6), L + H + .4, 0, .875, Math.PI / 2);
    if (nr === 0) setze(W.heckenStueck(2 * H + 1.6), -6.4, 0, .875, Math.PI / 2);

    // Hindernisse und Sterne
    let s = nr === 0 ? 24 : 12;
    while (s < L - 10) {
      hindernisNeu(ab, s, setze);
      s += zufall(10, 16) * Math.min(1.4, tempo / START_TEMPO * .9 + .2);
    }
    // Kita-Welt neben dem Weg
    for (let d = 10; d < L - 10; d += zufall(10, 16)) {
      const seite = Math.random() < .5 ? -1 : 1;
      setze(W.dekoNeu(), d, seite * (H + zufall(4.5, 11)), 0, Math.floor(Math.random() * 4) * Math.PI / 2);
    }
  }

  function hindernisNeu(ab, s, setze) {
    const r = Math.random();
    let typ, spuren = [-1, 0, 1];
    if (r < .3) {
      typ = "kloetze";
      spuren = [-1, 0, 1].sort(() => Math.random() - .5).slice(0, Math.random() < .5 ? 1 : 2);
      for (const sp of spuren) setze(W.hindernis("kloetze"), s, sp * SPUR);
    } else if (r < .55) {
      typ = "ball"; spuren = [[-1, 0, 1][Math.floor(Math.random() * 3)]];
      setze(W.hindernis("ball"), s, spuren[0] * SPUR);
    } else if (r < .7) {
      typ = "balken"; setze(W.hindernis("balken", 2 * H - .3), s, 0);
    } else if (r < .8) {
      typ = "pfuetze"; setze(W.hindernis("pfuetze", 2 * H), s, 0);
    } else {
      typ = "stange"; setze(W.hindernis("stange", 2 * H - .2), s, 0);   // Turnstange quer: ducken
    }
    hindernisse.push({ nr: ab.nr, s, typ, spuren, getroffen: false });
    // Sterne in einer freien Spur hinter dem Hindernis
    const frei = [-1, 0, 1].filter(sp => typ !== "kloetze" || !spuren.includes(sp));
    const sp = frei[Math.floor(Math.random() * frei.length)];
    for (let i = 0; i < 4; i++) {
      const ds = s + 3 + i * 1.3; if (ds > ab.L - 4) break;
      const m = setze(W.stern(), ds, sp * SPUR, .9);
      sterne.push({ nr: ab.nr, s: ds, spur: sp, mesh: m, weg: false });
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
  // Aufruf aus der Spielauswahl: am Handy Vollbild mit Anleitung, gestartet wird erst mit „Los geht’s“
  window.froebelRennen = { oeffnen() { if (handy) { vollbildAn(); if (kannWebGL) laden(); } else rahmen.scrollIntoView({ behavior: "smooth", block: "center" }); } };
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
    spieler.beine.forEach((b, i) => {      // diagonal gleiche Beine, Knie knicken nach hinten
      const ph = S.lauf + (i === 0 || i === 3 ? 0 : Math.PI), vorn = i < 2;
      if (S.y > 0) { b.oben.rotation.x = vorn ? .6 : -.5; b.unten.rotation.x = vorn ? -1.2 : -.5; return; }
      b.oben.rotation.x = Math.sin(ph) * .55;
      b.unten.rotation.x = -Math.max(0, Math.sin(ph + 1.5)) * .95;
    });
    spieler.koerper.position.y = S.y > 0 ? 0 : Math.abs(Math.sin(S.lauf)) * .04;
    spieler.hals.rotation.x = S.duck > 0 ? -1.15 : (S.stolper > 0 ? Math.sin(S.stolper * 30) * .3 : 0);
    // Ducken: Hals nach vorn und in die Hocke (von den Hufen aus gestaucht, damit sie auf dem Boden bleibt)
    g.scale.y += ((S.duck > 0 ? .8 : 1) - g.scale.y) * Math.min(1, dt * 20);
    spieler.schwanz.rotation.z = Math.sin(S.lauf * .5) * .3; spieler.schwanz.rotation.x = .25 + Math.sin(S.lauf) * .15;

    // Anja läuft hinter Fröbelinchen auf demselben Weg
    let aab = ab, as = S.s - A.abstand;
    if (as < 0) { const vor = abschnitte.find(a => a.nr === S.idx - 1); if (vor) { aab = vor; as += vor.L; } else as = Math.max(as, -5); }
    const [ax, az] = punkt(aab, as, S.x > .8 ? S.x - 1.1 : S.x + 1.1); // leicht versetzt, damit sie die Sicht nicht verdeckt
    anja.gruppe.visible = A.abstand < 15;
    anja.gruppe.position.set(ax, 0, az); anja.gruppe.rotation.y = -aab.h * Math.PI / 2;
    if (lauft) A.lauf += dt * 11;
    anja.beine.forEach((b, i) => {
      const ph = A.lauf + i * Math.PI;
      b.oben.rotation.x = Math.sin(ph) * .75; b.unten.rotation.x = -Math.max(0, Math.sin(ph + 1.6)) * 1.35;
    });
    anja.arme.forEach((a, i) => {
      const ph = A.lauf + i * Math.PI;
      a.oben.rotation.x = -Math.sin(ph) * .7; a.unten.rotation.x = 1.1 + Math.sin(ph) * .25;
    });
    anja.k.rotation.x = -.12; anja.k.position.y = Math.abs(Math.sin(A.lauf)) * .05;
    anja.zopf.rotation.x = .2 + Math.sin(A.lauf * 2) * .3;

    for (const st of sterne) st.mesh.rotation.y += dt * 3;
    boden.position.set(px, -.02, pz);
    W.gras.offset.set(px / (400 / 90), -pz / (400 / 90));   // Grasmuster bleibt am Ort, obwohl die Fläche mitwandert
    sonne.position.set(px - 10, 18, pz + 6); sonne.target.position.set(px, 0, pz);

    // Kamera schräg hinter Fröbelinchen, dreht beim Abbiegen weich mit
    kamYaw = kamPos ? winkel(kamYaw, yaw, Math.min(1, dt * 5)) : yaw;
    const sin = Math.sin(kamYaw), cos = Math.cos(kamYaw);
    const hoch = kamera.aspect < .8;   // Handy hochkant: höher und steiler, sonst ist oben nur Himmel
    const ziel2 = new THREE.Vector3(px + sin * (hoch ? 7.5 : 7), hoch ? 6.2 : 4.6, pz + cos * (hoch ? 7.5 : 7));
    if (!kamPos) kamPos = ziel2.clone(); else kamPos.lerp(ziel2, Math.min(1, dt * 8));
    kamera.position.copy(kamPos);
    kamera.lookAt(px - sin * (hoch ? 5 : 7), hoch ? -.6 : .6, pz - cos * (hoch ? 5 : 7));
    himmelKugel.position.copy(kamera.position); wolkenGruppe.position.set(kamera.position.x, 0, kamera.position.z);
    renderer.render(szene, kamera);
  }
}
