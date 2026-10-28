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
    if (!bereit) bereit = Promise.all([import("./vendor/three/three.module.min.js"), import("./lauf-welt.js?v=4")])
      .then(([m, w]) => { THREE = m; aufbauen(w); });
    return bereit;
  }

  // ---------- Spielwerte ----------
  const SPUR = 1.6, H = 2.9, ECKE = 7;            // Spurbreite, halbe Wegbreite, Abbiegezone vor der Ecke
  const START_TEMPO = 9, MAX_TEMPO = 21, BESCHL = .1;
  const SPRUNG = 7.2, G = 22, DUCKEN = .75;
  let renderer, szene, kamera, uhr, boden, spieler, anja;
  let abschnitte = [], hindernisse = [], sterne = [], booster = [];
  // Booster-Zeiten in Sekunden; schubs = laufende Szene, in der Fröbelinchen Anja wegschubst
  const B = { turbo: 0, schild: 0, ruhe: 0, schubs: null };
  let blase, sternchen = [];
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
  let W, sonne, himmelKugel, wolkenGruppe, ferneGruppe, sonnenBild, aktZone = 0;
  // kleine Partikel (Funken, Staub): Sprite, Geschwindigkeit, Lebenszeit
  let teilchen = [], staubTakt = 0;
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
    ferneGruppe = W.ferne(); szene.add(ferneGruppe);
    sonnenBild = W.sonnenScheibe(); szene.add(sonnenBild);
    // Spiegelungen für Sterne, Ball und Pfützen kommen aus einem Abbild des Himmels
    const pmrem = new THREE.PMREMGenerator(renderer), himmelSzene = new THREE.Scene();
    himmelSzene.add(W.himmel());
    szene.environment = pmrem.fromScene(himmelSzene, .02).texture;
    kamera = new THREE.PerspectiveCamera(62, 1, .1, 400);
    szene.add(new THREE.HemisphereLight("#cfe6ff", "#6c8f3c", .85));
    sonne = new THREE.DirectionalLight("#ffe7c4", 2.8);
    sonne.castShadow = true;
    sonne.shadow.mapSize.set(handy ? 1024 : 2048, handy ? 1024 : 2048);
    Object.assign(sonne.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 70 });
    sonne.shadow.bias = -.0004; sonne.shadow.normalBias = .03;
    szene.add(sonne, sonne.target);
    uhr = new THREE.Clock();
    boden = W.bodenFlaeche(); szene.add(boden, W.luft);
    W.verbinden({ szene, himmelMat: himmelKugel.material, sonne });
    spieler = W.giraffeBauen(); szene.add(spieler.gruppe);
    anja = W.anjaBauen(); szene.add(anja.gruppe);
    blase = W.blase(); spieler.gruppe.add(blase);
    sternchen = [0, 1, 2].map(() => { const st = W.stern(); st.scale.setScalar(.45); st.visible = false; szene.add(st); return st; });
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
    const ab = { nr, ax, az, h, L, dreh, zone: W.zoneFuer(nr), gruppe: new THREE.Group() };
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
      setze(W.heckeFuer(bis - anf, ab.zone), (anf + bis) / 2, seite * (H + .55), 0);
      setze(W.blumenFuer(bis - anf - .6, ab.zone), (anf + bis) / 2, seite * (H + .07), 0);
    }
    // Hecke quer am Ende: hier muss man abbiegen
    setze(W.heckeFuer(2 * H + 2, ab.zone), L + H + .55, 0, 0, Math.PI / 2);
    if (nr === 0) setze(W.heckeFuer(2 * H + 2, ab.zone), -6.55, 0, 0, Math.PI / 2);

    // Hindernisse und Sterne
    let s = nr === 0 ? 24 : 12;
    while (s < L - 10) {
      hindernisNeu(ab, s, setze);
      s += zufall(10, 16) * Math.min(1.4, tempo / START_TEMPO * .9 + .2);
    }
    // Ab und zu ein Booster an einer freien Stelle
    if (nr > 0 && Math.random() < .5) {
      const bs = zufall(14, L - 14);
      if (!hindernisse.some(h => h.nr === nr && Math.abs(h.s - bs) < 4)) {
        const r = Math.random(), typ = r < .4 ? "turbo" : r < .75 ? "schild" : "schubs";
        const sp = [-1, 0, 1][Math.floor(Math.random() * 3)];
        booster.push({ nr, s: bs, spur: sp, typ, mesh: setze(W.booster(typ), bs, sp * SPUR, 1.05), weg: false });
      }
    }
    // Kita-Welt neben dem Weg
    for (let d = 9; d < L - 9; d += zufall(6, 10)) {
      for (const seite of [-1, 1]) {
        if (Math.random() < .35) continue;
        const obj = W.dekoFuer(ab.zone), abst = Math.max(zufall(4.5, 12), obj.userData.abstand || 0);
        setze(obj, d + zufall(-2, 2), seite * (H + abst), 0, Math.floor(Math.random() * 4) * Math.PI / 2);
      }
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
    for (const p of teilchen) szene.remove(p.k);
    teilchen = [];
    abschnitte = []; hindernisse = []; sterne = []; booster = [];
    aktZone = 0; W.zoneWechsel(0, true);
    Object.assign(B, { turbo: 0, schild: 0, ruhe: 0, schubs: null });
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

  // Einblendung oben im Bild (Warnung vor Anja, Booster)
  function meldung(oben, unten) {
    warnung.querySelector("strong").textContent = oben; warnung.querySelector("span").textContent = unten;
    warnung.classList.remove("an"); void warnung.offsetWidth; warnung.classList.add("an");
  }
  function anjaKommt(dauer) {
    if (B.ruhe > 0 || B.schubs) return;           // nach dem Schubser hat man Ruhe
    A.nah = true; A.zeit = dauer; meldung("Achtung, Anja kommt!", "Lauf schneller!");
  }
  function stolpern() {
    if (A.nah && A.abstand < 7) { ende("Anja hat dich erwischt!"); return; }
    S.stolper = .5; tempo = Math.max(START_TEMPO, tempo * .85);
    anjaKommt(6);
  }
  function boosterNehmen(typ) {
    if (typ === "turbo") { B.turbo = 6; meldung("Turbo!", "Fröbelinchen rennt schneller"); }
    else if (typ === "schild") { B.schild = 5; meldung("Schutzschild!", "5 Sekunden unverwundbar"); }
    else if (!B.schubs) { B.schubs = { t: 0, umfallen: 0, getroffen: false }; A.nah = true; A.zeit = 99; meldung("Schubs-Booster!", "Hol sie dir, Fröbelinchen!"); }
  }

  function funkeln(wo, farbe, n) {
    for (let i = 0; i < n; i++) {
      const f = W.funke(farbe); f.position.copy(wo); f.scale.setScalar(zufall(.15, .3)); szene.add(f);
      const w = Math.random() * Math.PI * 2, h = zufall(1.5, 4);
      teilchen.push({ k: f, v: new THREE.Vector3(Math.cos(w) * zufall(1, 3), h, Math.sin(w) * zufall(1, 3)), t: 0, dauer: zufall(.4, .7), schwer: 8 });
    }
  }

  function hudZeigen() {
    let t = `${Math.floor(punkte)} Punkte · ★ ${sternZahl}`;
    if (B.turbo > 0) t += ` · ⚡ ${Math.ceil(B.turbo)}`;
    if (B.schild > 0) t += ` · 🛡 ${Math.ceil(B.schild)}`;
    if (B.ruhe > 0) t += ` · Ruhe ${Math.ceil(B.ruhe)}`;
    hud.textContent = t;
  }

  // Schubser: Anja holt auf, Fröbelinchen dreht sich um, schubst sie mit dem Kopf ins Gras und läuft weiter
  function schubsSchritt(dt, v) {
    const sc = B.schubs; sc.t += dt;
    if (sc.t < .8) { A.abstand += (2.2 - A.abstand) * Math.min(1, dt * 6); return; }
    if (!sc.getroffen) { sc.getroffen = true; meldung("Schubs!", "Anja plumpst hin · 10 s Ruhe"); }
    sc.umfallen = Math.min(1, sc.umfallen + dt * 3);
    A.abstand += v * dt;                               // sie bleibt liegen, Fröbelinchen läuft davon
    if (sc.t > 1.6 && A.abstand > 16) {
      B.schubs = null; B.ruhe = 10; A.nah = false; A.zeit = 0; A.bis = 10 + zufall(5, 10);
    }
  }

  // ---------- Spielschritt ----------
  function schritt(dt) {
    tempo = Math.min(MAX_TEMPO, tempo + BESCHL * dt);
    const v = tempo * (S.stolper > 0 ? .6 : 1) * (B.turbo > 0 ? 1.35 : 1);
    for (const k of ["turbo", "schild", "ruhe"]) B[k] = Math.max(0, B[k] - dt);
    const unverwundbar = B.schild > 0 || !!B.schubs;
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
      hindernisse = hindernisse.filter(h => h.nr !== alt.nr); sterne = sterne.filter(s => s.nr !== alt.nr); booster = booster.filter(b => b.nr !== alt.nr);
    }

    S.x += (S.spur * SPUR - S.x) * Math.min(1, dt * 12);
    S.vy -= G * dt; S.y = Math.max(0, S.y + S.vy * dt); if (S.y === 0) S.vy = 0;
    S.duck = Math.max(0, S.duck - dt);

    // Zusammenstöße
    for (const h of hindernisse) {
      if (h.getroffen || unverwundbar || h.nr !== S.idx || Math.abs(h.s - S.s) > .55) continue;
      const spur = Math.round(S.x / SPUR);
      if (!h.spuren.includes(spur)) continue;
      if (h.typ === "kloetze") { h.getroffen = true; ende("Bumm, Bauklötze! Wechsel die Spur."); return; }
      const trifft = h.typ === "stange" ? S.duck <= 0 : S.y < (h.typ === "ball" ? .75 : h.typ === "balken" ? .45 : .15);
      if (trifft) { h.getroffen = true; stolpern(); if (zustand !== "laeuft") return; }
    }
    for (const st of sterne) {
      if (st.weg || st.nr !== S.idx || Math.abs(st.s - S.s) > .8 || Math.round(S.x / SPUR) !== st.spur) continue;
      st.weg = true; st.mesh.visible = false; sternZahl++; punkte += 10; funkeln(st.mesh.position, "#ffe066", 8);
    }
    for (const bo of booster) {
      if (bo.weg || bo.nr !== S.idx || Math.abs(bo.s - S.s) > .9 || Math.round(S.x / SPUR) !== bo.spur) continue;
      bo.weg = true; bo.mesh.visible = false; boosterNehmen(bo.typ);
      funkeln(bo.mesh.position, { turbo: "#ffcc33", schild: "#6ec6ff", schubs: "#ff7aa2" }[bo.typ], 18);
    }

    // Anja: kommt am Anfang nach 5 s, danach alle 15–22 s, und wenn man stolpert
    if (B.schubs) { schubsSchritt(dt, v); hudZeigen(); return; }
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
    // beim Schubser dreht sie sich kurz um (zu Anja nach hinten) und wieder zurück
    const umdrehen = B.schubs ? Math.max(0, Math.sin(Math.min(1, Math.max(0, (B.schubs.t - .45) / 1.1)) * Math.PI)) : 0;
    g.rotation.y = winkel(g.rotation.y, yaw + umdrehen * Math.PI, Math.min(1, dt * 12));
    if (lauft) S.lauf += dt * tempo * (A.nah ? 1.5 : 1.1) * (B.turbo > 0 ? 1.35 : 1);
    spieler.beine.forEach((b, i) => {      // diagonal gleiche Beine, Knie knicken nach hinten
      const ph = S.lauf + (i === 0 || i === 3 ? 0 : Math.PI), vorn = i < 2;
      if (S.y > 0) { b.oben.rotation.x = vorn ? .6 : -.5; b.unten.rotation.x = vorn ? -1.2 : -.5; return; }
      b.oben.rotation.x = Math.sin(ph) * .55;
      b.unten.rotation.x = -Math.max(0, Math.sin(ph + 1.5)) * .95;
    });
    spieler.koerper.position.y = S.y > 0 ? 0 : Math.abs(Math.sin(S.lauf)) * .04;
    const kopfnuss = B.schubs && B.schubs.t > .7 && B.schubs.t < 1.1 ? -Math.sin((B.schubs.t - .7) / .4 * Math.PI) * .9 : 0;
    spieler.hals.rotation.x = S.duck > 0 ? -1.15 : (S.stolper > 0 ? Math.sin(S.stolper * 30) * .3 : kopfnuss);
    blase.visible = B.schild > 0 && (B.schild > 1 || Math.floor(B.schild * 8) % 2 === 0);
    if (blase.visible) blase.scale.setScalar(1 + Math.sin(performance.now() / 180) * .03);
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
    const fall = B.schubs ? B.schubs.umfallen : 0;   // nach dem Schubser plumpst sie nach hinten ins Gras
    anja.k.rotation.x = -.12 + fall * 1.45; anja.k.position.y = fall ? fall * .1 : Math.abs(Math.sin(A.lauf)) * .05;
    if (fall) { anja.beine.forEach(b => { b.oben.rotation.x = -1.3 * fall; b.unten.rotation.x = 0; }); anja.arme.forEach((a, i) => { a.oben.rotation.x = -2.2 * fall; a.oben.rotation.z = (i ? -1 : 1) * .6 * fall; }); }
    else anja.arme.forEach(a => { a.oben.rotation.z = 0; });
    sternchen.forEach((st, i) => {                  // Sternchen kreisen über ihrem Kopf
      st.visible = fall > .5;
      if (!st.visible) return;
      const w = performance.now() / 300 + i * Math.PI * 2 / 3, kopf = new THREE.Vector3(0, 1.75, .8).applyEuler(anja.gruppe.rotation).add(anja.gruppe.position);
      st.position.set(kopf.x + Math.cos(w) * .35, .5 + Math.sin(w * 2) * .05, kopf.z + Math.sin(w) * .35); st.rotation.y = w * 2;
    });
    anja.zopf.rotation.x = .2 + Math.sin(A.lauf * 2) * .3;

    for (const st of sterne) st.mesh.rotation.y += dt * 3;
    for (const bo of booster) { bo.mesh.userData.innen.rotation.y += dt * 3; bo.mesh.position.y = 1.05 + Math.sin(performance.now() / 300 + bo.s) * .1; }
    kamera.fov += (((kamera.aspect < .8 ? 72 : 62) + (B.turbo > 0 ? 8 : 0)) - kamera.fov) * Math.min(1, dt * 3); kamera.updateProjectionMatrix();
    W.bodenFolgen(px, pz);   // Bodenmuster bleibt am Ort, obwohl die Fläche mitwandert
    // neue Welt erreicht: Boden, Farben und Wetter überblenden, Namen einblenden
    if (ab.zone !== aktZone) { aktZone = ab.zone; W.zoneWechsel(aktZone); if (lauft && !B.schubs) meldung(W.zonen[aktZone].name, W.zonen[aktZone].unter); }
    const zeit = performance.now() / 1000;
    W.zoneSchritt(dt); W.animieren(zeit);
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
    ferneGruppe.position.set(kamera.position.x, 0, kamera.position.z);
    W.wetterSchritt(dt, kamera.position, zeit); W.voegelSchritt(dt, kamera.position, kamYaw, zeit);
    sonnenBild.position.set(kamera.position.x - 85, 95, kamera.position.z + 50);   // passend zur Lichtrichtung
    // Staubwölkchen unter den Hufen beim Laufen
    if (lauft && S.y === 0 && (staubTakt -= dt) <= 0) {
      staubTakt = B.turbo > 0 ? .05 : .11;
      const st = W.staub(); st.position.set(g.position.x + (Math.random() - .5) * .4, .12, g.position.z + (Math.random() - .5) * .4);
      st.scale.setScalar(.25); szene.add(st); teilchen.push({ k: st, v: new THREE.Vector3(0, .25, 0), t: 0, dauer: .7, wachsen: 1.1 });
    }
    teilchen = teilchen.filter(p => {
      p.t += dt; const f = p.t / p.dauer;
      if (f >= 1) { szene.remove(p.k); p.k.material.dispose(); return false; }
      p.k.position.addScaledVector(p.v, dt); p.v.y -= (p.schwer || 0) * dt;
      p.k.material.opacity = 1 - f; if (p.wachsen) p.k.scale.setScalar(.25 + f * p.wachsen);
      return true;
    });
    renderer.render(szene, kamera);
  }
}
