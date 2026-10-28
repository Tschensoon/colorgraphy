// „Fröbelinchen rennt“: 3D-Lauf-Spiel durch wechselnde Welten (Three.js).
// Fröbelinchen läuft automatisch; links/rechts = Spur wechseln oder an der Ecke abbiegen, hoch = springen, runter = ducken.
// Stolpern holt Anja heran, stolpert man, während sie dicht dran ist, hat sie Fröbelinchen erwischt.
// Maße in Metern. Der Weg besteht aus geraden Abschnitten nach Norden, Osten oder Westen (nie zurück),
// dadurch kreuzt er sich nie selbst.
const rahmen = document.getElementById("lauf-rahmen");
if (rahmen) {
  const $ = (sel) => rahmen.querySelector(sel);
  const huelle = $(".lauf-buehne"), hud = $(".lauf-hud"), ueber = $(".lauf-overlay"), warnung = $(".lauf-warnung");
  const losKnopf = $(".lauf-los"), ueberTitel = ueber.querySelector(".lauf-titel"), ueberText = $(".lauf-text"), zu = $(".lauf-zu");
  const ergebnis = $(".lauf-ergebnis"), aufgabenFeld = $(".lauf-aufgaben"), shop = $(".lauf-shop"), pauseFeld = $(".lauf-pause");
  const pauseKnopf = $(".lauf-pause-knopf"), tonKnopf = $(".lauf-ton-knopf");
  const eintragForm = $(".lauf-eintragen"), eintragName = $("#lauf-name"), eintragMeldung = $(".le-meldung");
  const topFeld = $(".lauf-top"), topListe = $(".lauf-top-liste");
  const seitenListe = document.getElementById("lauf-bestenliste"), seitenOl = seitenListe && seitenListe.querySelector("ol");
  // Gemeinsame Bestenliste (Supabase, Region Frankfurt). Der Schlüssel ist öffentlich und erlaubt nur Lesen
  // und das geprüfte Eintragen über die Funktion „eintragen“ (Prüfung von Name und Punkten in der Datenbank).
  const DB = { url: "https://gnzasrjjmyrbufdiuatw.supabase.co", key: "sb_publishable_c3NCrNIU-JtHB-9LJEBGFw_vjYDPQ_c" };
  const handy = matchMedia("(pointer: coarse)").matches;
  rahmen.classList.toggle("touch", handy);
  let THREE = null, bereit = null, T = null;

  const kannWebGL = (() => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; } })();
  if (!kannWebGL) {
    ueberText.textContent = "Dein Browser kann leider kein 3D (WebGL). Probier es auf einem anderen Gerät.";
    losKnopf.hidden = true;
  } else {
    // Three.js erst laden, wenn das Spiel in die Nähe kommt
    new IntersectionObserver((e, b) => { if (e.some(x => x.isIntersecting)) { b.disconnect(); laden(); } }, { rootMargin: "300px" }).observe(rahmen);
  }
  function laden() {
    if (!bereit) bereit = Promise.all([import("./vendor/three/three.module.min.js"), import("./lauf-welt.js?v=5"), import("./lauf-ton.js?v=1")])
      .then(([m, w, t]) => { THREE = m; T = t.ton(); aufbauen(w); });
    return bereit;
  }

  // ---------- Gespeichertes (Rekord, Sterne-Konto, Ausstattung, Aufgaben, Qualität) ----------
  const lies = (k, v) => { try { const x = localStorage.getItem(k); return x === null ? v : JSON.parse(x); } catch (e) { return v; } };
  const schreib = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  let rekord = +lies("froebelinchen-rennt-rekord", 0) || 0;
  const konto = lies("froebelinchen-rennt-konto", { sterne: 0, besitz: [], an: [] });
  let erledigt = lies("froebelinchen-rennt-aufgaben", []);
  let qualitaet = lies("froebelinchen-rennt-qualitaet", 0);
  let tutorialFertig = lies("froebelinchen-rennt-tutorial", false);

  // ---------- Spielwerte ----------
  const SPUR = 1.6, H = 2.9, ECKE = 12;           // Spurbreite, halbe Wegbreite, Abbiegezone vor der Ecke
  const START_TEMPO = 9, MAX_TEMPO = 21, BESCHL = .1;
  const SPRUNG = 7.2, G = 22, DUCKEN = .75, PUFFER = .15;
  let renderer, szene, kamera, uhr, boden, spieler, anja;
  let abschnitte = [], hindernisse = [], sterne = [], booster = [];
  // Booster-Zeiten in Sekunden; schubs = laufende Szene, in der Fröbelinchen Anja wegschubst
  const B = { turbo: 0, schild: 0, ruhe: 0, schubs: null };
  let blase, sternchen = [];
  let zustand = "start", tempo, punkte, sternZahl, strecke, wackeln = 0, schlussSzene = null;
  const S = { idx: 0, s: 0, spur: 0, x: 0, y: 0, vy: 0, duck: 0, abbiegen: 0, stolper: 0, lauf: 0, sprungPuffer: 0 };
  const A = { nah: false, zeit: 0, abstand: 16, bis: 5, lauf: 0, schritt: 0 };
  const R = { booster: 0, schubs: 0, welt: 0, zeit: 0 };    // Werte dieser Runde für Aufgaben, Ergebnis und Bestenliste
  const tipps = new Set();

  const richtung = (h) => h === 0 ? [0, -1] : [h, 0];           // Norden = -z, Osten = +x, Westen = -x
  const rechts = (h) => { const [dx, dz] = richtung(h); return [-dz, dx]; };
  const punkt = (ab, s, x) => {
    const [dx, dz] = richtung(ab.h), [rx, rz] = rechts(ab.h);
    return [ab.ax + dx * s + rx * x, ab.az + dz * s + rz * x];
  };
  const zufall = (a, b) => a + Math.random() * (b - a);
  const wahl = (l) => l[Math.floor(Math.random() * l.length)];

  // ---------- Aufbau ----------
  let W, sonne, himmelKugel, wolkenGruppe, ferneGruppe, sonnenBild, aktZone = 0;
  let teilchen = [], staubTakt = 0;               // kleine Partikel (Funken, Staub)
  function aufbauen(weltModul) {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
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
    W.ausstattungSetzen(spieler, konto.an);
    anja = W.anjaBauen(); szene.add(anja.gruppe);
    blase = W.blase(); spieler.gruppe.add(blase);
    sternchen = [0, 1, 2].map(() => { const st = W.stern(); st.scale.setScalar(.45); st.visible = false; szene.add(st); return st; });
    qualitaetSetzen(qualitaet);
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

  // Automatische Qualität: ruckelt es, werden nacheinander Schatten, Auflösung und Wetter reduziert
  function qualitaetSetzen(stufe) {
    qualitaet = stufe;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, stufe >= 2 ? 1 : (handy ? 1.5 : 2)));
    sonne.castShadow = stufe < 1;
    W.luft.visible = stufe < 3;
    if (kamera) groesse();
  }
  let messZeit = 0, messBilder = 0;
  function leistungMessen(echt) {
    if (zustand !== "laeuft" || qualitaet >= 3) return;
    messZeit += echt; messBilder++;
    if (messZeit < 3) return;
    const fps = messBilder / messZeit; messZeit = 0; messBilder = 0;
    if (fps < 40) { qualitaetSetzen(qualitaet + 1); schreib("froebelinchen-rennt-qualitaet", qualitaet); }
  }

  // ---------- Weg erzeugen ----------
  function abschnittNeu() {
    const vor = abschnitte[abschnitte.length - 1];
    let ax = 0, az = 0, h = 0, nr = 0;
    if (vor) { [ax, az] = punkt(vor, vor.L, 0); h = vor.h + vor.dreh; nr = vor.nr + 1; }
    const L = nr === 0 ? 55 : Math.round(zufall(34, 58));
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
    // Hecke quer am Ende, davor ein Pfeilschild und leuchtende Pfeile auf dem Weg: hier geht es ab
    setze(W.heckeFuer(2 * H + 2, ab.zone), L + H + .55, 0, 0, Math.PI / 2);
    setze(W.pfeilSchild(ab.dreh), L + H - .1, 0);
    for (const d of [11, 7.5, 4]) setze(W.bodenPfeil(ab.dreh), L - d, 0);
    if (nr === 0) setze(W.heckeFuer(2 * H + 2, ab.zone), -6.55, 0, 0, Math.PI / 2);

    hindernisseVerteilen(ab, setze);

    // Ab und zu ein Booster an einer freien Stelle
    if (nr > 0 && Math.random() < .5) {
      const bs = zufall(14, L - 14);
      if (!hindernisse.some(o => o.nr === nr && Math.abs(o.s - bs) < 4)) {
        const r = Math.random(), typ = r < .4 ? "turbo" : r < .75 ? "schild" : "schubs";
        const sp = wahl([-1, 0, 1]);
        booster.push({ nr, s: bs, spur: sp, typ, mesh: setze(W.booster(typ), bs, sp * SPUR, 1.05), weg: false });
      }
    }
    // Landschaft neben dem Weg
    for (let d = 9; d < L - 9; d += zufall(6, 10)) {
      for (const seite of [-1, 1]) {
        if (Math.random() < .35) continue;
        const obj = W.dekoFuer(ab.zone), abst = Math.max(zufall(4.5, 12), obj.userData.abstand || 0);
        setze(obj, d + zufall(-2, 2), seite * (H + abst), 0, Math.floor(Math.random() * 4) * Math.PI / 2);
      }
    }
  }

  // Hindernisse mit fairen Abständen: der Abstand richtet sich nach dem Tempo, das man dort ungefähr haben wird,
  // und es bleibt immer mindestens eine Spur frei. Mit der Zeit kommen schwerere Muster dazu.
  function hindernisseVerteilen(ab, setze) {
    const schwer = Math.min(1, ab.nr / 30);
    const tempoDort = Math.min(MAX_TEMPO, START_TEMPO + ab.nr * .45);
    const mindest = tempoDort * .95 + 3;              // gut eine Sekunde Reaktionszeit
    let s = ab.nr === 0 ? 24 : 14;
    while (s < ab.L - 11) {
      const typ = hindernisNeu(ab, s, setze, schwer, null);
      // Kombination: kurz danach ein zweites Hindernis, das man mit einer Bewegung schafft
      if (schwer > .25 && Math.random() < .2 + .35 * schwer && s + tempoDort * .7 + 2 < ab.L - 11) {
        s += tempoDort * .7 + 2;
        hindernisNeu(ab, s, setze, schwer, typ);
      }
      s += mindest * (1.35 - .35 * schwer) + zufall(0, 7 * (1 - schwer) + 2);
    }
  }
  function hindernisNeu(ab, s, setze, schwer, vorher) {
    const r = Math.random();
    let typ, spuren = [-1, 0, 1];
    const kloetzeWahr = .22 + .12 * schwer;
    if (r < kloetzeWahr) {
      typ = "kloetze";
      const zwei = Math.random() < .25 + .4 * schwer;
      spuren = [-1, 0, 1].sort(() => Math.random() - .5).slice(0, zwei ? 2 : 1);
      // nach Bauklötzen muss die freie Spur erreichbar bleiben: dieselbe freie Spur wie vorher
      if (vorher && vorher.typ === "kloetze") {
        const frei = [-1, 0, 1].filter(x => !vorher.spuren.includes(x));
        spuren = spuren.filter(x => x !== frei[0]);
        if (!spuren.length) spuren = [-1, 0, 1].filter(x => x !== frei[0]).slice(0, 1);
      }
      for (const sp of spuren) setze(W.hindernis("kloetze"), s, sp * SPUR);
    } else if (r < kloetzeWahr + .25) {
      typ = "ball"; spuren = [wahl([-1, 0, 1])];
      setze(W.hindernis("ball"), s, spuren[0] * SPUR);
    } else if (r < kloetzeWahr + .42) {
      typ = "balken"; setze(W.hindernis("balken", 2 * H - .3), s, 0);
    } else if (r < kloetzeWahr + .55) {
      typ = "pfuetze"; setze(W.hindernis("pfuetze", 2 * H), s, 0);
    } else {
      typ = "stange"; setze(W.hindernis("stange", 2 * H - .2), s, 0);   // Turnstange quer: ducken
    }
    const h = { nr: ab.nr, s, typ, spuren, getroffen: false };
    hindernisse.push(h);
    // Sterne in einer freien Spur hinter dem Hindernis
    const frei = [-1, 0, 1].filter(sp => typ !== "kloetze" || !spuren.includes(sp));
    const sp = wahl(frei);
    for (let i = 0; i < 4; i++) {
      const ds = s + 3 + i * 1.3; if (ds > ab.L - 4) break;
      const m = setze(W.stern(), ds, sp * SPUR, .9);
      sterne.push({ nr: ab.nr, s: ds, spur: sp, mesh: m, weg: false });
    }
    return h;
  }

  function abschnittWeg(ab) {
    szene.remove(ab.gruppe); W.entsorgen(ab.gruppe);
    hindernisse = hindernisse.filter(o => o.nr !== ab.nr); sterne = sterne.filter(o => o.nr !== ab.nr); booster = booster.filter(o => o.nr !== ab.nr);
  }

  function neu() {
    for (const ab of abschnitte) { szene.remove(ab.gruppe); W.entsorgen(ab.gruppe); }
    for (const p of teilchen) { szene.remove(p.k); p.k.material.dispose(); }
    teilchen = [];
    abschnitte = []; hindernisse = []; sterne = []; booster = [];
    aktZone = 0; W.zoneWechsel(0, true);
    Object.assign(B, { turbo: 0, schild: 0, ruhe: 0, schubs: null });
    Object.assign(R, { booster: 0, schubs: 0, welt: 0, zeit: 0 });
    tempo = START_TEMPO; punkte = 0; sternZahl = 0; strecke = 0; wackeln = 0; schlussSzene = null;
    Object.assign(S, { idx: 0, s: 0, spur: 0, x: 0, y: 0, vy: 0, duck: 0, abbiegen: 0, stolper: 0, sprungPuffer: 0 });
    Object.assign(A, { nah: false, zeit: 0, abstand: 16, bis: 5 });
    spieler.koerper.rotation.set(0, 0, 0);
    tipps.clear();
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
      // in der Abbiegezone wird ein Wisch in Abbiege-Richtung vorgemerkt, auch wenn er etwas früh kommt
      if (ab.L - S.s < ECKE && S.s < ab.L + .6 && d === ab.dreh) { if (!S.abbiegen) T.spur(); S.abbiegen = d; return; }
      const neu = Math.max(-1, Math.min(1, S.spur + d));
      if (neu !== S.spur) { S.spur = neu; T.spur(); }
    } else if (art === "hoch") {
      if (S.y <= 0) springen(); else S.sprungPuffer = PUFFER;   // kurz vor der Landung gedrückt: gleich nach der Landung springen
    } else if (art === "runter") {
      S.duck = DUCKEN; T.ducken(); if (S.y > 0) S.vy = Math.min(S.vy, -9);
    }
  }
  function springen() { S.vy = SPRUNG; S.duck = 0; S.sprungPuffer = 0; T.sprung(); }
  const TASTEN = { ArrowLeft: "links", KeyA: "links", ArrowRight: "rechts", KeyD: "rechts", ArrowUp: "hoch", KeyW: "hoch", Space: "hoch", ArrowDown: "runter", KeyS: "runter" };
  addEventListener("keydown", (e) => {
    if ((e.code === "KeyP" || e.code === "Escape") && (zustand === "laeuft" || zustand === "pause")) { e.preventDefault(); pauseUm(); return; }
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

  // ---------- Pause und Ton ----------
  function pauseUm() {
    if (zustand === "laeuft") { zustand = "pause"; pauseFeld.hidden = false; T.musikStop(); }
    else if (zustand === "pause") { zustand = "laeuft"; pauseFeld.hidden = true; uhr.getDelta(); T.musik(aktZone); }
  }
  pauseKnopf.addEventListener("click", () => { if (zustand === "laeuft" || zustand === "pause") pauseUm(); });
  $(".lauf-weiter").addEventListener("click", pauseUm);
  document.addEventListener("visibilitychange", () => { if (document.hidden && zustand === "laeuft") pauseUm(); });
  const tonAnzeigen = (an) => { tonKnopf.textContent = an ? "🔊" : "🔇"; tonKnopf.setAttribute("aria-label", an ? "Ton aus" : "Ton an"); };
  tonKnopf.addEventListener("click", async () => { await laden(); T.start(); tonAnzeigen(T.umschalten()); });
  try { tonAnzeigen(localStorage.getItem("froebelinchen-ton") !== "aus"); } catch (e) {}

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
    if (zustand === "laeuft" || zustand === "pause" || zustand === "fang") { pauseFeld.hidden = true; ende("Pause gemacht"); }
  }
  zu.addEventListener("click", vollbildAus);
  // Aufruf aus der Spielauswahl: am Handy Vollbild mit Anleitung, gestartet wird erst mit „Los geht’s“
  window.froebelRennen = { oeffnen() { if (handy) { vollbildAn(); if (kannWebGL) laden(); } else rahmen.scrollIntoView({ behavior: "smooth", block: "center" }); } };
  document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && vollbild) vollbildAus(); });

  losKnopf.addEventListener("click", async () => {
    if (handy && !vollbild) vollbildAn();
    await laden();
    T.start();
    if (zustand === "aus") neu();
    zustand = "laeuft"; window.froebelAktiv = "lauf";
    ueber.hidden = true; shop.hidden = true; topFeld.hidden = true; eintragForm.hidden = true; uhr.getDelta();
    T.musik(aktZone);
  });

  // Rundenende: zuerst eine kurze Szene (Anja fängt Fröbelinchen bzw. Fröbelinchen prallt ab), dann das Ergebnis
  function verlieren(grund, art) {
    if (zustand !== "laeuft") return;
    zustand = "fang"; schlussSzene = { grund, art, t: 0 };
    T.musikStop(); if (art === "anja") T.anja(); else T.knall();
    if (navigator.vibrate) navigator.vibrate(art === "anja" ? [60, 40, 60] : 80);
    wackeln = .5;
  }
  function ende(grund) {
    zustand = "aus"; window.froebelAktiv = null; T.musikStop(); warnung.classList.remove("an");
    const p = Math.floor(punkte), neuerRekord = p > rekord && p > 0;
    if (neuerRekord) { rekord = p; schreib("froebelinchen-rennt-rekord", rekord); }
    konto.sterne += sternZahl; schreib("froebelinchen-rennt-konto", konto);
    const geschafft = aufgabenPruefen();
    ueberTitel.textContent = grund;
    ueberText.textContent = geschafft.length ? `Aufgabe geschafft: ${geschafft.join(", ")}` : `Rekord ${rekord} · Sterne gesamt ${konto.sterne}`;
    ergebnis.hidden = false; ueber.classList.add("ergebnis");
    ergebnis.querySelector(".le-punkte b").textContent = p;
    ergebnis.querySelector(".le-sterne").textContent = sternZahl;
    ergebnis.querySelector(".le-meter").textContent = Math.round(strecke);
    ergebnis.querySelector(".le-welt").textContent = W.zonen[Math.min(R.welt, W.zonen.length - 1)].name;
    ergebnis.querySelector(".le-rekord").hidden = !neuerRekord;
    if (neuerRekord) T.rekord(); else T.ende();
    if (!tutorialFertig) { tutorialFertig = true; schreib("froebelinchen-rennt-tutorial", true); }
    aufgabenZeigen();
    eintragenAnbieten(p, Math.ceil(R.zeit));
    losKnopf.textContent = "Nochmal";
    ueber.hidden = false;
  }

  // ---------- Aufgaben ----------
  const AUFGABEN = [
    { id: "sterne25", text: "Sammle 25 Sterne in einer Runde", lohn: 20, ok: () => sternZahl >= 25 },
    { id: "bauernhof", text: "Lauf bis zum Bauernhof", lohn: 20, ok: () => R.welt >= 1 },
    { id: "booster2", text: "Nimm 2 Booster in einer Runde", lohn: 20, ok: () => R.booster >= 2 },
    { id: "meter800", text: "Lauf 800 Meter", lohn: 30, ok: () => strecke >= 800 },
    { id: "schubs", text: "Schubs Anja einmal um", lohn: 25, ok: () => R.schubs >= 1 },
    { id: "see", text: "Lauf bis an den See", lohn: 30, ok: () => R.welt >= 2 },
    { id: "sterne60", text: "Sammle 60 Sterne in einer Runde", lohn: 40, ok: () => sternZahl >= 60 },
    { id: "herbst", text: "Lauf bis in den Herbstwald", lohn: 40, ok: () => R.welt >= 3 },
    { id: "winter", text: "Lauf bis ins Winterland", lohn: 60, ok: () => R.welt >= 4 },
    { id: "meter2500", text: "Lauf 2500 Meter", lohn: 80, ok: () => strecke >= 2500 },
  ];
  const aktiveAufgaben = () => {
    if (erledigt.length >= AUFGABEN.length) { erledigt = []; schreib("froebelinchen-rennt-aufgaben", erledigt); }   // alle geschafft: von vorn
    return AUFGABEN.filter(a => !erledigt.includes(a.id)).slice(0, 3);
  };
  function aufgabenPruefen() {
    const neu = [];
    let weiter = true;
    while (weiter && neu.length < AUFGABEN.length) {           // nachrückende Aufgaben gleich mitprüfen
      weiter = false;
      for (const a of aktiveAufgaben()) if (!erledigt.includes(a.id) && a.ok()) { erledigt.push(a.id); konto.sterne += a.lohn; neu.push(`${a.text} (+${a.lohn} ★)`); weiter = true; }
    }
    schreib("froebelinchen-rennt-aufgaben", erledigt); schreib("froebelinchen-rennt-konto", konto);
    return neu;
  }
  function aufgabenZeigen() {
    const liste = aktiveAufgaben();
    aufgabenFeld.innerHTML = "<p>Aufgaben</p><ul></ul>";
    const ul = aufgabenFeld.querySelector("ul");
    for (const a of liste) {
      const li = document.createElement("li"); li.textContent = a.text;
      const em = document.createElement("em"); em.textContent = `+${a.lohn} ★`; li.append(em); ul.append(li);
    }
  }
  aufgabenZeigen();

  // ---------- Sterne-Shop ----------
  function shopZeigen() {
    shop.querySelector(".ls-bank b").textContent = konto.sterne;
    const ul = shop.querySelector(".ls-liste"); ul.replaceChildren();
    const teile = W ? W.AUSSTATTUNG : {};
    for (const [id, a] of Object.entries(teile)) {
      const li = document.createElement("li"), name = document.createElement("span"), k = document.createElement("button");
      name.textContent = a.name;
      const hat = konto.besitz.includes(id), an = konto.an.includes(id);
      k.type = "button";
      k.textContent = hat ? (an ? "Trägt sie" : "Anziehen") : `${a.preis} ★`;
      k.classList.toggle("an", an);
      k.disabled = !hat && konto.sterne < a.preis;
      k.addEventListener("click", () => {
        if (!konto.besitz.includes(id)) { if (konto.sterne < a.preis) return; konto.sterne -= a.preis; konto.besitz.push(id); T.booster(); }
        if (konto.an.includes(id)) konto.an = konto.an.filter(x => x !== id);
        else { konto.an = konto.an.filter(x => W.AUSSTATTUNG[x].platz !== a.platz); konto.an.push(id); }   // pro Platz nur ein Teil
        schreib("froebelinchen-rennt-konto", konto);
        W.ausstattungSetzen(spieler, konto.an); shopZeigen();
      });
      li.append(name, k); ul.append(li);
    }
  }
  $(".lauf-shop-knopf").addEventListener("click", async () => { await laden(); T.start(); shopZeigen(); shop.hidden = false; });
  $(".ls-zu").addEventListener("click", () => { shop.hidden = true; });

  // ---------- Bestenliste ----------
  const ERLAUBT = /^[A-Za-zÄÖÜäöüßÀ-ÿ0-9 ._-]+$/;
  const SPERRE = ["arsch", "fick", "fotze", "hure", "nazi", "hitler", "wichs", "schlampe", "spast", "missgeburt", "fuck", "shit", "bitch", "cunt", "nigg", "porn"];
  let offeneRunde = null, meinEintrag = null, topDaten = [];
  const zeile = (rang, name, punkte, eigen) => {
    const li = document.createElement("li"); if (eigen) li.className = "eigen";
    for (const [k, t] of [["bl-rang", rang], ["bl-name", name], ["bl-punkte", punkte]]) {
      const sp = document.createElement("span"); sp.className = k; sp.textContent = t; li.append(sp);
    }
    return li;
  };
  function topZeigen() {
    let markiert = false;
    const bauen = () => topDaten.length
      ? topDaten.map((e, i) => {
          const eigen = !markiert && meinEintrag && e.name === meinEintrag.name && e.punkte === meinEintrag.punkte;
          if (eigen) markiert = true;
          return zeile(i + 1 + ".", e.name, e.punkte, eigen);
        })
      : [zeile("", "Noch keine Einträge. Lauf los und trag dich als Erstes ein!", "", false)];
    topListe.replaceChildren(...bauen());
    markiert = false;
    if (seitenOl) { seitenOl.replaceChildren(...bauen()); seitenListe.hidden = false; }
  }
  async function bestenlisteLaden() {
    try {
      const r = await fetch(`${DB.url}/rest/v1/bestenliste?select=name,punkte&spiel=eq.rennt&order=punkte.desc,erstellt.asc&limit=10`,
                            { headers: { apikey: DB.key }, cache: "no-store" });
      if (!r.ok) throw new Error(r.status);
      topDaten = await r.json(); topZeigen();
    } catch (e) {
      topListe.replaceChildren(zeile("", "Die Bestenliste ist gerade nicht erreichbar.", "", false));
    }
  }
  function eintragenAnbieten(punkteRunde, sekunden) {
    eintragMeldung.textContent = ""; eintragMeldung.classList.remove("fehler");
    if (punkteRunde < 30 || sekunden < 1) { eintragForm.hidden = true; offeneRunde = null; return; }
    offeneRunde = { punkte: punkteRunde, sekunden };
    try { eintragName.value = localStorage.getItem("froebelinchen-name") || ""; } catch (e) {}
    eintragForm.querySelector(".le-zeile").hidden = false; eintragForm.querySelector("label").hidden = false;
    eintragForm.hidden = false;
  }
  eintragForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!offeneRunde) return;
    const name = eintragName.value.replace(/\s+/g, " ").trim(), fehler = (t) => { eintragMeldung.textContent = t; eintragMeldung.classList.add("fehler"); };
    eintragMeldung.classList.remove("fehler");
    if (!name || name.length > 16) return fehler("Bitte einen Namen mit 1 bis 16 Zeichen eingeben.");
    if (!ERLAUBT.test(name)) return fehler("Bitte nur Buchstaben, Zahlen, Leerzeichen, Punkt und Bindestrich.");
    if (SPERRE.some(w => name.toLowerCase().replace(/[\s._-]/g, "").includes(w))) return fehler("Bitte einen anderen Namen wählen.");
    const runde = offeneRunde; offeneRunde = null;          // jede Runde nur einmal eintragen
    const knopf = eintragForm.querySelector("button"); knopf.disabled = true; eintragMeldung.textContent = "Wird eingetragen …";
    try {
      const r = await fetch(`${DB.url}/rest/v1/rpc/eintragen`, {
        method: "POST", headers: { apikey: DB.key, "Content-Type": "application/json" },
        body: JSON.stringify({ p_name: name, p_punkte: runde.punkte, p_sekunden: runde.sekunden, p_spiel: "rennt" }) });
      if (!r.ok) { let m = ""; try { m = (await r.json()).message; } catch (x) {} throw new Error(m || "Fehler " + r.status); }
      try { localStorage.setItem("froebelinchen-name", name); } catch (x) {}
      meinEintrag = { name, punkte: runde.punkte };
      await bestenlisteLaden();
      const platz = topDaten.findIndex(x => x.name === name && x.punkte === runde.punkte);
      eintragMeldung.textContent = platz >= 0 ? `Eingetragen! Du bist auf Platz ${platz + 1}.` : "Eingetragen! Für die Top 10 hat es diesmal nicht gereicht.";
      eintragForm.querySelector(".le-zeile").hidden = true; eintragForm.querySelector("label").hidden = true;
      if (platz >= 0) T.rekord();
    } catch (err) {
      offeneRunde = runde; fehler("Hat nicht geklappt: " + err.message);
    } finally { knopf.disabled = false; }
  });
  $(".lauf-top-knopf").addEventListener("click", () => { bestenlisteLaden(); topFeld.hidden = false; });
  $(".lt-zu").addEventListener("click", () => { topFeld.hidden = true; });
  bestenlisteLaden();

  // ---------- Einblendungen, Anja, Booster ----------
  function meldung(oben, unten) {
    warnung.querySelector("strong").textContent = oben; warnung.querySelector("span").textContent = unten;
    warnung.classList.remove("an"); void warnung.offsetWidth; warnung.classList.add("an");
  }
  const ANJA_RUFE = ["Lauf schneller!", "„Fröbelinchen, bleib stehen!“", "„Ich krieg dich!“", "„Warte doch mal!“"];
  function anjaKommt(dauer) {
    if (B.ruhe > 0 || B.schubs) return;           // nach dem Schubser hat man Ruhe
    if (!A.nah) { meldung("Achtung, Anja kommt!", wahl(ANJA_RUFE)); T.anja(); }
    A.nah = true; A.zeit = dauer;
  }
  function stolpern() {
    if (A.nah && A.abstand < 7) { verlieren("Anja hat dich erwischt!", "anja"); return; }
    S.stolper = .5; tempo = Math.max(START_TEMPO, tempo * .85);
    wackeln = .35; T.stolpern(); if (navigator.vibrate) navigator.vibrate(40);
    anjaKommt(6);
  }
  function boosterNehmen(typ) {
    R.booster++; T.booster();
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
    if (hud.textContent !== t) hud.textContent = t;
  }

  // Erste Runde: Tipps genau dann, wenn das jeweilige Hindernis oder die erste Ecke kommt
  const T_TEXT = handy
    ? { hoch: "Wisch nach oben zum Springen!", runter: "Wisch nach unten zum Ducken!", seite: "Wisch zur Seite und weich aus!", ecke: (d) => `Gleich abbiegen: wisch nach ${d < 0 ? "links" : "rechts"}!` }
    : { hoch: "Pfeil nach oben zum Springen!", runter: "Pfeil nach unten zum Ducken!", seite: "Pfeil zur Seite und weich aus!", ecke: (d) => `Gleich abbiegen: Pfeil nach ${d < 0 ? "links" : "rechts"}!` };
  function tutorialSchritt(ab) {
    if (tutorialFertig) return;
    const vor = hindernisse.find(o => o.nr === S.idx && o.s > S.s && o.s - S.s < 11);
    if (vor) {
      const art = vor.typ === "stange" ? "runter" : vor.typ === "kloetze" ? "seite" : "hoch";
      if (!tipps.has(art)) { tipps.add(art); meldung("Tipp", T_TEXT[art]); }
    }
    if (ab.L - S.s < 15 && !tipps.has("ecke" + ab.nr) && tipps.size < 6) { tipps.add("ecke" + ab.nr); meldung("Tipp", T_TEXT.ecke(ab.dreh)); }
  }

  // Schubser: Anja holt auf, Fröbelinchen dreht sich um, stupst sie mit dem Kopf um und läuft weiter
  function schubsSchritt(dt, v) {
    const sc = B.schubs; sc.t += dt;
    if (sc.t < .8) { A.abstand += (2.2 - A.abstand) * Math.min(1, dt * 6); return; }
    if (!sc.getroffen) { sc.getroffen = true; R.schubs++; T.schubs(); meldung("Schubs!", "Anja plumpst hin · 10 s Ruhe"); }
    sc.umfallen = Math.min(1, sc.umfallen + dt * 3);
    A.abstand += v * dt;                               // sie bleibt liegen, Fröbelinchen läuft davon
    if (sc.t > 1.6 && A.abstand > 16) {
      B.schubs = null; B.ruhe = 10; A.nah = false; A.zeit = 0; A.bis = 10 + zufall(5, 10);
    }
  }

  // ---------- Spielschritt ----------
  function schritt(dt) {
    tempo = Math.min(MAX_TEMPO, tempo + BESCHL * dt); R.zeit += dt;
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
      verlieren("Autsch, die Hecke! Achte auf die Pfeile.", "hecke"); return;
    }
    // Abschnitte nachladen und alte entfernen (inklusive Grafikspeicher)
    while (abschnitte[abschnitte.length - 1].nr < S.idx + 3) abschnittNeu();
    while (abschnitte[0].nr < S.idx - 1) abschnittWeg(abschnitte.shift());

    S.x += (S.spur * SPUR - S.x) * Math.min(1, dt * 12);
    S.vy -= G * dt; S.y = Math.max(0, S.y + S.vy * dt);
    if (S.y === 0) { S.vy = 0; if (S.sprungPuffer > 0) springen(); }
    S.sprungPuffer = Math.max(0, S.sprungPuffer - dt);
    S.duck = Math.max(0, S.duck - dt);
    tutorialSchritt(ab);

    // Zusammenstöße
    for (const h of hindernisse) {
      if (h.getroffen || unverwundbar || h.nr !== S.idx || Math.abs(h.s - S.s) > .55) continue;
      const spur = Math.round(S.x / SPUR);
      if (!h.spuren.includes(spur)) continue;
      if (h.typ === "kloetze") { h.getroffen = true; verlieren("Bumm, Bauklötze! Wechsel die Spur.", "kloetze"); return; }
      const trifft = h.typ === "stange" ? S.duck <= 0 : S.y < (h.typ === "ball" ? .75 : h.typ === "balken" ? .45 : .15);
      if (trifft) { h.getroffen = true; stolpern(); if (zustand !== "laeuft") return; }
    }
    for (const st of sterne) {
      if (st.weg || st.nr !== S.idx || Math.abs(st.s - S.s) > .8 || Math.round(S.x / SPUR) !== st.spur) continue;
      st.weg = true; st.mesh.visible = false; sternZahl++; punkte += 10; funkeln(st.mesh.position, "#ffe066", 8);
      T.stern(sternZahl); hud.classList.remove("hupf"); void hud.offsetWidth; hud.classList.add("hupf");
    }
    for (const bo of booster) {
      if (bo.weg || bo.nr !== S.idx || Math.abs(bo.s - S.s) > .9 || Math.round(S.x / SPUR) !== bo.spur) continue;
      bo.weg = true; bo.mesh.visible = false; boosterNehmen(bo.typ);
      funkeln(bo.mesh.position, { turbo: "#ffcc33", schild: "#6ec6ff", schubs: "#ff7aa2" }[bo.typ], 18);
    }

    // Anja: kommt am Anfang nach 5 s, danach alle 15–22 s, und wenn man stolpert; ihre Schritte werden lauter, je näher sie ist
    if (B.schubs) { schubsSchritt(dt, v); hudZeigen(); return; }
    A.bis -= dt;
    if (!A.nah && A.bis <= 0) anjaKommt(5);
    if (A.nah) { A.zeit -= dt; if (A.zeit <= 0) { A.nah = false; A.bis = zufall(15, 22); } }
    A.abstand += ((A.nah ? 3.4 : 18) - A.abstand) * Math.min(1, dt * (A.nah ? 1.6 : .5));
    if (A.abstand < 12 && (A.schritt -= dt) <= 0) { A.schritt = .28; T.schritt(Math.max(0, 1 - A.abstand / 12)); }
    hudZeigen();
  }

  // Schlussszene (ca. 1,6 s): Anja holt Fröbelinchen ein und umarmt sie, oder Fröbelinchen prallt ab
  function schlussSchritt(dt) {
    const sz = schlussSzene; sz.t += dt;
    if (sz.art === "anja") A.abstand += (1 - A.abstand) * Math.min(1, dt * 5);
    else spieler.koerper.rotation.z = Math.min(.5, sz.t * 1.5) * (S.spur >= 0 ? 1 : -1);
    if (sz.t > 1.6) ende(sz.grund);
  }

  // ---------- Bild ----------
  let kamYaw = 0, kamPos = null;
  const winkel = (a, b, k) => a + (((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI) * k;
  function bild() {
    const echt = uhr.getDelta(), dt = Math.min(.05, echt);
    if (zustand === "pause") { renderer.render(szene, kamera); return; }
    if (zustand === "laeuft") { schritt(dt); leistungMessen(echt); }
    else if (zustand === "fang") schlussSchritt(dt);
    const ab = abschnitte.find(a => a.nr === S.idx);
    const [px, pz] = punkt(ab, S.s, S.x), yaw = -ab.h * Math.PI / 2;
    const lauft = zustand === "laeuft", fang = zustand === "fang" && schlussSzene && schlussSzene.art === "anja";

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
    const versatz = fang ? S.x : (S.x > .8 ? S.x - 1.1 : S.x + 1.1);   // sonst leicht versetzt, damit sie die Sicht nicht verdeckt
    const [ax, az] = punkt(aab, as, versatz);
    anja.gruppe.visible = A.abstand < 15;
    anja.gruppe.position.set(ax, 0, az); anja.gruppe.rotation.y = -aab.h * Math.PI / 2;
    if (lauft || fang) A.lauf += dt * (fang ? 6 : 11);
    anja.beine.forEach((b, i) => {
      const ph = A.lauf + i * Math.PI;
      b.oben.rotation.x = Math.sin(ph) * .75; b.unten.rotation.x = -Math.max(0, Math.sin(ph + 1.6)) * 1.35;
    });
    anja.arme.forEach((a, i) => {
      if (fang) { a.oben.rotation.x = 1.5; a.unten.rotation.x = .3; a.oben.rotation.z = (i ? -1 : 1) * -.25; return; }   // Arme nach vorn: Umarmung
      const ph = A.lauf + i * Math.PI;
      a.oben.rotation.x = -Math.sin(ph) * .7; a.unten.rotation.x = 1.1 + Math.sin(ph) * .25;
    });
    const fall = B.schubs ? B.schubs.umfallen : 0;   // nach dem Schubser plumpst sie nach hinten
    anja.k.rotation.x = -.12 + fall * 1.45; anja.k.position.y = fall ? fall * .1 : Math.abs(Math.sin(A.lauf)) * .05;
    if (fall) { anja.beine.forEach(b => { b.oben.rotation.x = -1.3 * fall; b.unten.rotation.x = 0; }); anja.arme.forEach((a, i) => { a.oben.rotation.x = -2.2 * fall; a.oben.rotation.z = (i ? -1 : 1) * .6 * fall; }); }
    else if (!fang) anja.arme.forEach(a => { a.oben.rotation.z = 0; });
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
    // neue Welt erreicht: Boden, Farben, Wetter und Musik wechseln, Namen einblenden
    if (ab.zone !== aktZone) {
      aktZone = ab.zone; W.zoneWechsel(aktZone); R.welt = Math.max(R.welt, Math.floor(S.idx / 3));
      if (lauft) { T.welt(); T.musik(aktZone); if (!B.schubs) meldung(W.zonen[aktZone].name, W.zonen[aktZone].unter); }
    }
    const zeit = performance.now() / 1000;
    W.zoneSchritt(dt); W.animieren(zeit);
    sonne.position.set(px - 10, 18, pz + 6); sonne.target.position.set(px, 0, pz);

    // Kamera schräg hinter Fröbelinchen, dreht beim Abbiegen weich mit; bei der Fang-Szene langsam herum
    if (fang) kamYaw += dt * .9;
    else kamYaw = kamPos ? winkel(kamYaw, yaw, Math.min(1, dt * 5)) : yaw;
    const sin = Math.sin(kamYaw), cos = Math.cos(kamYaw);
    const hoch = kamera.aspect < .8;   // Handy hochkant: höher und steiler, sonst ist oben nur Himmel
    const ziel2 = new THREE.Vector3(px + sin * (hoch ? 7.5 : 7), hoch ? 6.2 : 4.6, pz + cos * (hoch ? 7.5 : 7));
    if (!kamPos) kamPos = ziel2.clone(); else kamPos.lerp(ziel2, Math.min(1, dt * 8));
    kamera.position.copy(kamPos);
    if (wackeln > 0) { wackeln = Math.max(0, wackeln - dt); kamera.position.x += (Math.random() - .5) * wackeln * .6; kamera.position.y += (Math.random() - .5) * wackeln * .4; }
    kamera.lookAt(px - sin * (hoch ? 5 : 7), hoch ? -.6 : .6, pz - cos * (hoch ? 5 : 7));
    himmelKugel.position.copy(kamera.position); wolkenGruppe.position.set(kamera.position.x, 0, kamera.position.z);
    ferneGruppe.position.set(kamera.position.x, 0, kamera.position.z);
    W.wetterSchritt(dt, kamera.position, zeit); W.voegelSchritt(dt, kamera.position, kamYaw, zeit);
    sonnenBild.position.set(kamera.position.x - 85, 95, kamera.position.z + 50);   // passend zur Lichtrichtung
    // Staubwölkchen unter den Hufen beim Laufen (nicht bei niedrigster Qualität)
    if (lauft && S.y === 0 && qualitaet < 3 && (staubTakt -= dt) <= 0) {
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
