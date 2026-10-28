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
  const ergebnis = $(".lauf-ergebnis"), aufgabenFeld = $(".lauf-aufgaben"), shop = $(".lauf-shop:not(.lauf-top)"), pauseFeld = $(".lauf-pause");
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
    if (!bereit) {
      const text = losKnopf.textContent; losKnopf.disabled = true; losKnopf.textContent = "Lädt die 3D-Welt …";
      bereit = Promise.all([import("./vendor/three/three.module.min.js"), import("./lauf-welt.js?v=8"), import("./lauf-ton.js?v=2"), import("./lauf-flug.js?v=1")])
        .then(([m, w, t, f]) => { THREE = m; T = t.ton(); aufbauen(w, f); losKnopf.disabled = false; losKnopf.textContent = text; });
    }
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
  let startNr = 0;                                 // Nummer des ersten Abschnitts (nach der Landung geht es weiter)
  let abschnitte = [], hindernisse = [], sterne = [], booster = [];
  // Booster-Zeiten in Sekunden; schubs = laufende Szene, in der Fröbelinchen Anja wegschubst
  const B = { turbo: 0, schild: 0, ruhe: 0, magnet: 0, doppelt: 0, schubs: null };
  let blase, sternchen = [];
  let zustand = "start", tempo, punkte, sternZahl, strecke, wackeln = 0, schlussSzene = null;
  const S = { idx: 0, s: 0, spur: 0, x: 0, y: 0, vy: 0, duck: 0, abbiegen: 0, stolper: 0, lauf: 0, sprungPuffer: 0, eis: 0, lande: 0 };
  const A = { nah: false, zeit: 0, abstand: 16, bis: 5, lauf: 0, schritt: 0 };
  const R = { booster: 0, schubs: 0, welt: 0, zeit: 0, flug: 0, ringe: 0 };    // Werte dieser Runde für Aufgaben, Ergebnis und Bestenliste
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
  function aufbauen(weltModul, flugModul) {
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
    // nahe Grenze 0,5 m statt 0,1 m: der Tiefenpuffer wird dadurch viel genauer, flache Dinge flimmern am Handy nicht mehr
    kamera = new THREE.PerspectiveCamera(62, 1, .5, 260);
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
    flugAufbauen(flugModul);
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
    W.luft.visible = stufe < 3 && !FL.an;
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
    let ax = 0, az = 0, h = 0, nr = startNr;
    if (vor) { [ax, az] = punkt(vor, vor.L, 0); h = vor.h + vor.dreh; nr = vor.nr + 1; }
    const erster = !vor, L = erster ? 55 : Math.round(zufall(34, 58));
    const dreh = h === 0 ? (Math.random() < .5 ? -1 : 1) : -h;   // nie nach Süden
    const ab = { nr, erster, ax, az, h, L, dreh, zone: W.zoneFuer(nr), gruppe: new THREE.Group() };
    abschnitte.push(ab); szene.add(ab.gruppe);
    const yaw = -h * Math.PI / 2;
    // Objekt an Wegposition s (entlang) / x (quer) setzen und in Laufrichtung drehen
    const setze = (obj, s, x, y = 0, extra = 0) => {
      const [px, pz] = punkt(ab, s, x); obj.position.set(px, y, pz); obj.rotation.y = yaw + extra; ab.gruppe.add(obj); return obj;
    };

    // Pflasterweg inkl. Eckfeld, Randsteine
    const von = erster ? -6 : H;   // das Eckfeld gehört schon zum vorigen Abschnitt, sonst liegen zwei Böden übereinander und flimmern
    setze(W.boden(L + H - von, 2 * H), (von + L + H) / 2, 0);
    for (const seite of [-1, 1]) {       // Randsteine wie die Hecken: an der Abbiege-Seite offen
      const bis = seite === ab.dreh ? L - H : L + H, anf = erster ? -6 : H;
      setze(W.kante(bis - anf), (anf + bis) / 2, seite * (H - .09), .05);
    }
    // Hecken links und rechts; auf der Abbiege-Seite endet die Hecke vor der Ecke
    for (const seite of [-1, 1]) {
      const bis = seite === ab.dreh ? L - H : L + H, anf = erster ? -6 : H;
      setze(W.heckeFuer(bis - anf, ab.zone), (anf + bis) / 2, seite * (H + .55), 0);
      setze(W.blumenFuer(bis - anf - .6, ab.zone), (anf + bis) / 2, seite * (H + .07), 0);
    }
    // Hecke quer am Ende, davor ein Pfeilschild und leuchtende Pfeile auf dem Weg: hier geht es ab
    setze(W.heckeFuer(2 * H + 2, ab.zone, 1.5, .9), L + H + .55, 0, 0, Math.PI / 2);   // etwas dicker und höher als die Seitenhecken: keine deckungsgleichen Flächen
    setze(W.pfeilSchild(ab.dreh), L + H - .1, 0);
    for (const d of [11, 7.5, 4]) setze(W.bodenPfeil(ab.dreh), L - d, 0);
    if (erster) setze(W.heckeFuer(2 * H + 2, ab.zone, 1.5, .9), -6.55, 0, 0, Math.PI / 2);

    hindernisseVerteilen(ab, setze);

    // Ab und zu ein Booster an einer freien Stelle
    if (!erster && Math.random() < .5) {
      const bs = zufall(14, L - 14);
      if (!hindernisse.some(o => o.nr === nr && Math.abs(o.s - bs) < 4)) {
        const r = Math.random(), typ = r < .24 ? "turbo" : r < .48 ? "schild" : r < .66 ? "schubs" : r < .83 ? "magnet" : "doppelt";
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
    let s = ab.erster ? 24 : 14;
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
  // Art des Hindernisses: block = ausweichen (sonst Rundenende), niedrig = drüberspringen, hoch = ducken, eis = rutschig
  const ART = { kloetze: "block", heuballen: "block", ball: "niedrig", balken: "niedrig", pfuetze: "niedrig", laub: "niedrig",
    huhn: "niedrig", enten: "niedrig", schneeball: "niedrig", stange: "hoch", eis: "eis" };
  const HOEHE = { ball: .75, balken: .45, pfuetze: .15, laub: .5, huhn: .55, enten: .45, schneeball: .8 };
  const WELT_HINDERNISSE = [[], ["heuballen", "huhn"], ["enten"], ["laub"], ["schneeball", "eis"]];   // eigene je Welt
  function hindernisNeu(ab, s, setze, schwer, vorher) {
    const extra = WELT_HINDERNISSE[ab.zone] || [];
    let typ;
    if (extra.length && Math.random() < .4) typ = wahl(extra);
    else {
      const r = Math.random(), kw = .22 + .12 * schwer;
      typ = r < kw ? "kloetze" : r < kw + .25 ? "ball" : r < kw + .42 ? "balken" : r < kw + .55 ? "pfuetze" : "stange";
    }
    if (vorher && vorher.art === "block" && ART[typ] === "block") typ = "balken";   // nie zwei Sperren direkt hintereinander
    let spuren = [-1, 0, 1], mesh = null, bew = null;
    if (typ === "kloetze") {
      const zwei = Math.random() < .25 + .4 * schwer;
      spuren = [-1, 0, 1].sort(() => Math.random() - .5).slice(0, zwei ? 2 : 1);
      for (const sp of spuren) setze(W.hindernis("kloetze"), s, sp * SPUR);
    } else if (typ === "ball" || typ === "heuballen" || typ === "schneeball") {
      spuren = [wahl([-1, 0, 1])];
      mesh = setze(typ === "ball" ? W.hindernis("ball") : W.weltHindernis(typ), s, spuren[0] * SPUR);
      if (typ !== "ball") bew = { vs: typ === "heuballen" ? 3 : 4.5, weg: 0, max: 7 };   // rollt auf Fröbelinchen zu
    } else if (typ === "huhn" || typ === "enten") {
      const von = wahl([-1, 1]), x = von * (H - .4);
      mesh = setze(W.weltHindernis(typ), s, x);
      bew = { vx: -von * (typ === "huhn" ? 1.7 : 1.1), x };                              // läuft quer über den Weg
      spuren = [Math.round(x / SPUR)];
    } else if (typ === "laub" || typ === "eis") {
      setze(W.weltHindernis(typ, 2 * H), s, 0);
    } else if (typ === "balken") setze(W.hindernis("balken", 2 * H - .3), s, 0);
    else if (typ === "pfuetze") setze(W.hindernis("pfuetze", 2 * H), s, 0);
    else setze(W.hindernis("stange", 2 * H - .2), s, 0);   // Turnstange quer: ducken
    const h = { nr: ab.nr, ab, s, typ, art: ART[typ], hoehe: HOEHE[typ] || 0, tiefe: typ === "eis" ? 1.5 : .55, spuren, mesh, bew, getroffen: false };
    hindernisse.push(h);
    sterneLegen(ab, s, setze, h);
    return h;
  }

  // Sterne in Mustern: Bogen über Sprung-Hindernisse (nur im Sprung erreichbar), Zickzack oder gerade Reihe
  function sterneLegen(ab, s, setze, h) {
    const legen = (ds, sp, hoehe) => {
      if (ds > ab.L - 4 || ds < 2) return;
      const m = setze(W.stern(), ds, sp * SPUR, hoehe);
      sterne.push({ nr: ab.nr, s: ds, spur: sp, h: hoehe, mesh: m, weg: false });
    };
    const ganzBreit = h.spuren.length === 3 && !h.bew;
    if (h.art === "niedrig" && ganzBreit && Math.random() < .6) {
      const sp = wahl([-1, 0, 1]);
      for (let i = -2; i <= 2; i++) legen(s + i * 1.1, sp, .9 + 1.3 * (1 - (i * i) / 4));
    } else if (Math.random() < .3) {
      const folge = wahl([[-1, 0, 1, 0, -1, 0], [1, 0, -1, 0, 1, 0]]);
      folge.forEach((sp, i) => legen(s + 3.5 + i * 1.7, sp, .9));
    } else {
      const frei = [-1, 0, 1].filter(sp => h.art !== "block" || !h.spuren.includes(sp));
      const sp = wahl(frei);
      for (let i = 0; i < 4; i++) legen(s + 3 + i * 1.3, sp, .9);
    }
  }

  function abschnittWeg(ab) {
    szene.remove(ab.gruppe); W.entsorgen(ab.gruppe);
    hindernisse = hindernisse.filter(o => o.nr !== ab.nr); sterne = sterne.filter(o => o.nr !== ab.nr); booster = booster.filter(o => o.nr !== ab.nr);
  }

  function neu() {
    flugAus();
    for (const ab of abschnitte) { szene.remove(ab.gruppe); W.entsorgen(ab.gruppe); }
    for (const p of teilchen) { szene.remove(p.k); p.k.material.dispose(); }
    teilchen = [];
    abschnitte = []; hindernisse = []; sterne = []; booster = []; startNr = 0;
    FL.ab = FLUG_AB; FL.rueck = 0;
    aktZone = 0; W.zoneWechsel(0, true);
    Object.assign(B, { turbo: 0, schild: 0, ruhe: 0, magnet: 0, doppelt: 0, schubs: null });
    Object.assign(R, { booster: 0, schubs: 0, welt: 0, zeit: 0, flug: 0, ringe: 0 });
    tempo = START_TEMPO; punkte = 0; sternZahl = 0; strecke = 0; wackeln = 0; schlussSzene = null;
    Object.assign(S, { idx: 0, s: 0, spur: 0, x: 0, y: 0, vy: 0, duck: 0, abbiegen: 0, stolper: 0, sprungPuffer: 0, eis: 0, lande: 0 });
    Object.assign(A, { nah: false, zeit: 0, abstand: 16, bis: 5 });
    spieler.koerper.rotation.set(0, 0, 0);
    tipps.clear();
    while (abschnitte.length < 4) abschnittNeu();
    kamYaw = 0; kamPos = null;
    hudZeigen();
  }

  // ---------- Steuerung ----------
  function eingabe(art) {
    if (zustand !== "laeuft" || FL.an) return;
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
    e.preventDefault(); gedrueckt.add(art); flugTasten();
    if (!e.repeat) eingabe(art);
  });
  // im Flug zählt, welche Tasten gerade gehalten werden
  const gedrueckt = new Set();
  const flugTasten = () => {
    FL.tasten.x = (gedrueckt.has("rechts") ? 1 : 0) - (gedrueckt.has("links") ? 1 : 0);
    FL.tasten.y = (gedrueckt.has("hoch") ? 1 : 0) - (gedrueckt.has("runter") ? 1 : 0);
  };
  addEventListener("keyup", (e) => { const art = TASTEN[e.code]; if (art) { gedrueckt.delete(art); flugTasten(); } });
  addEventListener("blur", () => { gedrueckt.clear(); flugTasten(); });
  let wisch = null;
  huelle.addEventListener("touchstart", (e) => { const t = e.touches[0]; wisch = { x: t.clientX, y: t.clientY, lx: t.clientX, ly: t.clientY, fertig: false }; }, { passive: true });
  huelle.addEventListener("touchmove", (e) => {
    if (zustand === "laeuft") e.preventDefault();
    if (!wisch) return;
    if (FL.an) {                      // im Flug folgt das Flugzeug dem Finger (relativ, egal wo man hinfasst)
      const t = e.touches[0], k = 18 / Math.max(300, huelle.clientWidth);
      FL.zx = Math.max(-FX, Math.min(FX, FL.zx + (t.clientX - wisch.lx) * k));
      FL.zy = Math.max(FY0, Math.min(FY1, FL.zy - (t.clientY - wisch.ly) * k));
      wisch.lx = t.clientX; wisch.ly = t.clientY; return;
    }
    if (wisch.fertig) return;
    const t = e.touches[0], dx = t.clientX - wisch.x, dy = t.clientY - wisch.y;
    if (Math.hypot(dx, dy) < 28) return;
    wisch.fertig = true;   // schon während des Wischens auslösen, das fühlt sich schneller an
    eingabe(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "links" : "rechts") : (dy < 0 ? "hoch" : "runter"));
  }, { passive: false });
  huelle.addEventListener("touchend", () => { wisch = null; });

  // ---------- Pause und Ton ----------
  function pauseUm() {
    if (zustand === "laeuft") { zustand = "pause"; pauseFeld.hidden = false; T.musikStop(); }
    else if (zustand === "pause") { zustand = "laeuft"; pauseFeld.hidden = true; uhr.getDelta(); T.musik(FL.an ? 5 : aktZone); }
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
    ergebnis.querySelector(".le-welt").textContent = FL.an ? "Luftwelt" : W.zonen[Math.min(R.welt, W.zonen.length - 1)].name;
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
    { id: "luftwelt", text: "Schaff 3000 Punkte und flieg in die Luftwelt", lohn: 100, ok: () => R.flug >= 1 },
    { id: "ringe10", text: "Flieg durch 10 Ringe in einer Runde", lohn: 60, ok: () => R.ringe >= 10 },
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
  const ANJA_FLUG = ["Flieg schneller!", "„Ich flieg dir hinterher!“", "„Warte, Fröbelinchen!“"];
  function anjaKommt(dauer) {
    if (B.ruhe > 0 || B.schubs) return;           // nach dem Schubser hat man Ruhe
    if (!A.nah) { meldung("Achtung, Anja kommt!", FL.an ? wahl(ANJA_FLUG) : wahl(ANJA_RUFE)); T.anja(); }
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
    else if (typ === "magnet") { B.magnet = 8; meldung("Sterne-Magnet!", "Alle Sterne fliegen zu dir"); }
    else if (typ === "doppelt") { B.doppelt = 10; meldung("Doppelte Punkte!", "10 Sekunden lang alles ×2"); }
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
    if (FL.an) t += ` · ✈ ${Math.max(0, Math.ceil(FLUG_ZEIT - FL.zeit))} s`;
    if (B.turbo > 0) t += ` · ⚡ ${Math.ceil(B.turbo)}`;
    if (B.magnet > 0) t += ` · 🧲 ${Math.ceil(B.magnet)}`;
    if (B.doppelt > 0) t += ` · ×2 ${Math.ceil(B.doppelt)}`;
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
      const art = vor.art === "hoch" ? "runter" : vor.art === "block" ? "seite" : vor.art === "eis" ? null : "hoch";
      if (art)
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
    if (FL.an) { flugSchritt(dt); return; }
    tempo = Math.min(MAX_TEMPO, tempo + BESCHL * dt); R.zeit += dt;
    const v = tempo * (S.stolper > 0 ? .6 : 1) * (B.turbo > 0 ? 1.35 : 1);
    for (const k of ["turbo", "schild", "ruhe", "magnet", "doppelt"]) B[k] = Math.max(0, B[k] - dt);
    const faktor = B.doppelt > 0 ? 2 : 1;
    const unverwundbar = B.schild > 0 || !!B.schubs || FL.abflug > 0 || FL.rueck > 0;
    S.s += v * dt; strecke += v * dt; punkte += v * dt * faktor;
    S.stolper = Math.max(0, S.stolper - dt);
    // 3000 Punkte: weiß überblenden, dann geht es im Flugzeug weiter (Level 2)
    if (!FL.abflug && punkte >= FL.ab) { FL.abflug = .001; T.abflug(); meldung(`${FL.ab} Punkte!`, "Fröbelinchen steigt ins Flugzeug …"); }
    if (FL.abflug) {
      FL.abflug += dt; blende.style.opacity = Math.min(1, FL.abflug / .9);
      if (FL.abflug >= .9) { flugStart(); return; }
    }
    if (FL.rueck) { FL.rueck += dt; blende.style.opacity = Math.max(0, 1 - FL.rueck / .8); if (FL.rueck > .8) FL.rueck = 0; }

    let ab = abschnitte.find(a => a.nr === S.idx);
    if (FL.abflug && !S.abbiegen && ab.L - S.s < ECKE) S.abbiegen = ab.dreh;   // während der Blende biegt sie von selbst ab
    if (S.abbiegen && S.s >= ab.L - .2) {             // an der Ecke: in den nächsten Abschnitt wechseln
      const weiter = abschnitte.find(a => a.nr === S.idx + 1);
      S.s = Math.max(0, S.s - ab.L); S.idx++; S.abbiegen = 0; ab = weiter;
    } else if (S.s > ab.L + H - .9) {
      verlieren("Autsch, die Hecke! Achte auf die Pfeile.", "hecke"); return;
    }
    // Abschnitte nachladen und alte entfernen (inklusive Grafikspeicher)
    while (abschnitte[abschnitte.length - 1].nr < S.idx + 3) abschnittNeu();
    while (abschnitte[0].nr < S.idx - 1) abschnittWeg(abschnitte.shift());

    S.x += (S.spur * SPUR - S.x) * Math.min(1, dt * (S.eis > 0 ? 2.5 : 12));   // auf Eis lenkt es sich träger
    S.eis = Math.max(0, S.eis - dt);
    const warOben = S.y > 0;
    S.vy -= G * dt; S.y = Math.max(0, S.y + S.vy * dt);
    if (warOben && S.y === 0) S.lande = .22;                                     // kurz einfedern
    if (S.y === 0) { S.vy = 0; if (S.sprungPuffer > 0) springen(); }
    S.sprungPuffer = Math.max(0, S.sprungPuffer - dt);
    S.duck = Math.max(0, S.duck - dt);
    tutorialSchritt(ab);

    // Bewegte Hindernisse: rollen auf Fröbelinchen zu oder laufen quer über den Weg, sobald sie in Sicht kommen
    for (const h of hindernisse) {
      if (!h.bew || h.nr !== S.idx || h.s - S.s > 30 || h.s < S.s - 5) continue;
      if (h.bew.vs && h.bew.weg < h.bew.max) {
        const d = h.bew.vs * dt; h.s -= d; h.bew.weg += d;
        h.mesh.userData.rolle.rotation.x += d / h.mesh.userData.radius;
      }
      if (h.bew.vx) {
        h.bew.x += h.bew.vx * dt; if (Math.abs(h.bew.x) > H - .3) h.bew.vx *= -1;
        const breite = h.typ === "enten" ? .7 : .25;
        h.spuren = [...new Set([Math.round((h.bew.x - breite) / SPUR), Math.round((h.bew.x + breite) / SPUR)])].filter(x => x >= -1 && x <= 1);
        h.mesh.rotation.y = -h.ab.h * Math.PI / 2 + (h.bew.vx > 0 ? -Math.PI / 2 : Math.PI / 2);
      }
      const [hx, hz] = punkt(h.ab, h.s, h.bew.vx ? h.bew.x : h.spuren[0] * SPUR);
      h.mesh.position.x = hx; h.mesh.position.z = hz;
    }

    // Zusammenstöße
    for (const h of hindernisse) {
      if (h.getroffen || h.nr !== S.idx || Math.abs(h.s - S.s) > h.tiefe) continue;
      const spur = Math.round(S.x / SPUR);
      if (!h.spuren.includes(spur)) continue;
      if (h.art === "eis") {
        h.getroffen = true; S.eis = 1.5; T.spur();
        if (!tipps.has("eis")) { tipps.add("eis"); meldung("Glatteis!", "Lenken geht kurz langsamer"); }
        continue;
      }
      if (unverwundbar) continue;
      if (h.art === "block") { h.getroffen = true; verlieren(h.typ === "heuballen" ? "Uff, ein Heuballen! Weich ihm aus." : "Bumm, Bauklötze! Wechsel die Spur.", "kloetze"); return; }
      const trifft = h.art === "hoch" ? S.duck <= 0 : S.y < h.hoehe;
      if (trifft) { h.getroffen = true; stolpern(); if (zustand !== "laeuft") return; }
    }
    // Sterne: hohe Sterne gibt es nur im Sprung, mit Magnet fliegen alle Sterne vor einem heran
    const einsammeln = (st) => {
      st.weg = true; st.mesh.visible = false; sternZahl++; punkte += 10 * faktor; funkeln(st.mesh.position, "#ffe066", 8);
      T.stern(sternZahl); hud.classList.remove("hupf"); void hud.offsetWidth; hud.classList.add("hupf");
    };
    for (const st of sterne) {
      if (st.weg || st.nr !== S.idx) continue;
      const vor = st.s - S.s;
      if (B.magnet > 0 && vor > -.5 && vor < 9) { if (vor < 1.2) einsammeln(st); else st.zieht = true; continue; }
      if (Math.abs(vor) > .8 || Math.round(S.x / SPUR) !== st.spur) continue;
      if (Math.abs(S.y + .9 - (st.h || .9)) > 1) continue;
      einsammeln(st);
    }
    for (const bo of booster) {
      if (bo.weg || bo.nr !== S.idx || Math.abs(bo.s - S.s) > .9 || Math.round(S.x / SPUR) !== bo.spur) continue;
      bo.weg = true; bo.mesh.visible = false; boosterNehmen(bo.typ);
      funkeln(bo.mesh.position, { turbo: "#ffcc33", schild: "#6ec6ff", schubs: "#ff7aa2", magnet: "#ff6b6b", doppelt: "#c58cff" }[bo.typ], 18);
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

  // Sonne mit dem Spieler mitführen, aber nur in ganzen Schatten-Pixeln: so bleiben Schattenkanten ruhig
  const SONNE_RICHTUNG = [-10, 18, 6];
  let lichtRechts = null, lichtOben = null;
  function schattenNachfuehren(px, pz) {
    if (!lichtRechts) {
      const d = new THREE.Vector3(...SONNE_RICHTUNG).normalize();
      lichtRechts = new THREE.Vector3(0, 1, 0).cross(d).normalize(); lichtOben = d.clone().cross(lichtRechts).normalize();
    }
    const cam = sonne.shadow.camera, texel = (cam.right - cam.left) / sonne.shadow.mapSize.x;
    const p = new THREE.Vector3(px, 0, pz);
    const a = Math.round(p.dot(lichtRechts) / texel) * texel, b = Math.round(p.dot(lichtOben) / texel) * texel;
    const tiefe = p.dot(new THREE.Vector3(...SONNE_RICHTUNG).normalize());
    const z = lichtRechts.clone().multiplyScalar(a).add(lichtOben.clone().multiplyScalar(b))
      .add(new THREE.Vector3(...SONNE_RICHTUNG).normalize().multiplyScalar(tiefe));
    sonne.target.position.copy(z);
    sonne.position.set(z.x + SONNE_RICHTUNG[0], z.y + SONNE_RICHTUNG[1], z.z + SONNE_RICHTUNG[2]);
  }

  // ---------- Bild ----------
  let kamYaw = 0, kamPos = null;
  const winkel = (a, b, k) => a + (((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI) * k;
  function bild() {
    const echt = uhr.getDelta(), dt = Math.min(.05, echt);
    if (zustand === "pause") { renderer.render(szene, kamera); return; }
    if (zustand === "laeuft") { schritt(dt); leistungMessen(echt); }
    else if (zustand === "fang") schlussSchritt(dt);
    if (FL.an) { flugBild(dt); return; }
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
    // Landen: kurz einfedern; Sprung nach oben: etwas strecken
    S.lande = Math.max(0, S.lande - dt);
    const feder = S.lande > 0 ? Math.sin(S.lande / .22 * Math.PI) * .16 : 0, streck = S.y > 0 && S.vy > 0 ? .06 : 0;
    g.scale.y += ((S.duck > 0 ? .8 : 1) - feder + streck - g.scale.y) * Math.min(1, dt * 20);
    g.scale.x = g.scale.z = 1 + feder * .5;
    // Fang-Szene: Anja hebt Fröbelinchen hoch
    const hebe = fang && schlussSzene.t > .6 ? Math.min(1, (schlussSzene.t - .6) / .5) : 0;
    if (hebe) { g.position.y = hebe * .9; spieler.beine.forEach((b, i) => { b.oben.rotation.x = Math.sin(schlussSzene.t * 9 + i) * .35; b.unten.rotation.x = -.3; }); }
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
      if (fang) { const h2 = schlussSzene.t > .6 ? Math.min(1, (schlussSzene.t - .6) / .5) : 0; a.oben.rotation.x = 1.5 + h2 * 1.1; a.unten.rotation.x = .3 - h2 * .3; a.oben.rotation.z = (i ? -1 : 1) * -.25; return; }   // erst umarmen, dann hochheben
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

    for (const st of sterne) {
      st.mesh.rotation.y += dt * 3;
      if (st.zieht && !st.weg) st.mesh.position.lerp(new THREE.Vector3(g.position.x, g.position.y + 1, g.position.z), Math.min(1, dt * 9));
    }
    const tz = performance.now() / 1000;
    for (const h of hindernisse) {                    // Huhn und Enten watscheln
      const hp = h.mesh && h.mesh.userData.huepf; if (!hp) continue;
      (Array.isArray(hp) ? hp : [hp]).forEach((k, i) => { k.position.y = Math.abs(Math.sin(tz * 11 + i)) * .06; k.rotation.z = Math.sin(tz * 11 + i) * .12; });
    }
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
    schattenNachfuehren(px, pz);

    // Kamera schräg hinter Fröbelinchen, dreht beim Abbiegen weich mit; bei der Fang-Szene langsam herum
    if (fang) kamYaw += dt * .9;
    else kamYaw = kamPos ? winkel(kamYaw, yaw, Math.min(1, dt * 5)) : yaw;
    const sin = Math.sin(kamYaw), cos = Math.cos(kamYaw);
    const hoch = kamera.aspect < .8;   // Handy hochkant: höher und steiler, sonst ist oben nur Himmel
    const kurve = fang ? 0 : Math.min(1, Math.abs(Math.atan2(Math.sin(yaw - kamYaw), Math.cos(yaw - kamYaw))) / (Math.PI / 2));
    const abst = (hoch ? 7.5 : 7) - kurve * 3.2, kh = (hoch ? 6.2 : 4.6) + kurve * 1.6;   // in Kurven näher und höher: nicht durch die Hecke
    const ziel2 = new THREE.Vector3(px + sin * abst, kh, pz + cos * abst);
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
    teilchenSchritt(dt);
    renderer.render(szene, kamera);
  }
  function teilchenSchritt(dt) {
    teilchen = teilchen.filter(p => {
      p.t += dt; const f = p.t / p.dauer;
      if (f >= 1) { szene.remove(p.k); p.k.material.dispose(); return false; }
      p.k.position.addScaledVector(p.v, dt); p.v.y -= (p.schwer || 0) * dt;
      p.k.material.opacity = 1 - f; if (p.wachsen) p.k.scale.setScalar(.25 + f * p.wachsen);
      return true;
    });
  }

  // ---------- Level 2: Luftwelt ----------
  // Ab 3000 Punkten fliegt Fröbelinchen eine Minute lang in ihrem Spielzeug-Flugzeug nach Norden (-z). Finger ziehen bzw. Pfeiltasten lenken
  // frei nach links, rechts, oben und unten. Durch Ringe fliegen gibt Punkte; Ballons, Gewitterwolken und Vögel bringen sie
  // ins Trudeln, dann holt Anja in ihrem eigenen Flieger auf (wie das Stolpern am Boden).
  const FLUG_AB = 3000, FLUG_ZEIT = 60, FX = 7, FY0 = 3, FY1 = 13;
  const FL = { an: false, abflug: 0, x: 0, y: 7, z: 0, zx: 0, zy: 7, v: 18, neig: 0, nick: 0, naechst: 0, strecke: 0, trudeln: 0,
    regenbogen: 0, objekte: [], tasten: { x: 0, y: 0 }, ax: 0, ay: 7, ab: 3000, zeit: 0, landung: 0, rueck: 0, gewarnt: false };
  let FW, flieger, anjaFlieger, meer, flugGruppe, blende;
  function flugAufbauen(modul) {
    FW = modul.flugWelt(THREE, W);
    flieger = FW.flieger(false); anjaFlieger = FW.flieger(true); meer = FW.wolkenMeer(); flugGruppe = new THREE.Group();
    meer.position.y = -1.5;
    for (const o of [flieger.gruppe, anjaFlieger.gruppe, meer, flugGruppe]) { o.visible = false; szene.add(o); }
    blende = document.createElement("div");
    blende.style.cssText = "position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none";
    renderer.domElement.after(blende);                  // direkt über dem Bild, Anzeigen und Meldungen bleiben darüber sichtbar
  }
  function flugStart() {
    FL.an = true; R.flug = 1;
    for (const ab of abschnitte) ab.gruppe.visible = false;
    for (const o of [boden, ferneGruppe, W.luft]) o.visible = false;
    for (const o of [flieger.gruppe, anjaFlieger.gruppe, meer, flugGruppe]) o.visible = true;
    Object.assign(FL, { x: 0, y: 7, z: 0, zx: 0, zy: 7, v: Math.max(18, tempo), neig: 0, nick: 0, naechst: -45, strecke: 0, trudeln: 0, regenbogen: 250, ax: 0, ay: 7, zeit: 0, landung: 0, gewarnt: false });
    // Fröbelinchen sitzt im Cockpit (Beine im Rumpf versteckt), Anja genauso in ihrem rosa Flieger
    flieger.sitz.add(spieler.gruppe); spieler.gruppe.position.set(0, -.85, .3); spieler.gruppe.rotation.set(0, 0, 0); spieler.gruppe.scale.setScalar(1);
    spieler.koerper.position.y = 0; spieler.beine.forEach(b => { b.oben.visible = false; });
    blase.scale.setScalar(2.3); blase.position.y = .6;
    anjaFlieger.sitz.add(anja.gruppe); anja.gruppe.position.set(0, -.75, .25); anja.gruppe.rotation.set(0, 0, 0);
    anja.k.rotation.x = 0; anja.k.position.y = 0; anja.beine.forEach(b => { b.oben.visible = false; });
    sternchen.forEach(st => { st.visible = false; });
    B.schubs = null; Object.assign(A, { nah: false, zeit: 0, abstand: 18, bis: 8 });
    szene.fog.color.set("#e2f0fa"); szene.fog.near = 55; szene.fog.far = 165;
    himmelKugel.material.color.set("#ffffff"); sonne.color.set("#fff4dc");
    while (FL.naechst > -170) reiheNeu();
    kamPos = null; wackeln = 0;
    T.welt(); T.musik(5);
    meldung("Level 2: Luftwelt", handy ? "Zieh mit dem Finger, um zu fliegen" : "Lenk mit den Pfeiltasten");
  }
  function flugAus() {
    if (!FW) return;
    if (FL.an) {
      szene.add(spieler.gruppe, anja.gruppe);
      spieler.gruppe.position.set(0, 0, 0); spieler.gruppe.rotation.set(0, 0, 0); spieler.beine.forEach(b => { b.oben.visible = true; });
      anja.gruppe.position.set(0, 0, 0); anja.gruppe.rotation.set(0, 0, 0); anja.beine.forEach(b => { b.oben.visible = true; });
      blase.scale.setScalar(1); blase.position.y = 1.15;
      for (const o of [boden, ferneGruppe]) o.visible = true;
      W.luft.visible = qualitaet < 3;
      szene.fog.near = 45; szene.fog.far = 120;
    }
    for (const o of FL.objekte) { flugGruppe.remove(o.mesh); W.entsorgen(o.mesh); }
    for (const o of [flieger.gruppe, anjaFlieger.gruppe, meer, flugGruppe]) o.visible = false;
    FL.objekte = []; FL.an = false; FL.abflug = 0; FL.landung = 0; blende.style.opacity = 0;
  }
  // Nach einer Minute: weiß überblenden und in der Laufwelt auf einem neuen Wegstück weiterrennen
  function flugLanden() {
    flugAus();
    for (const ab of abschnitte) { szene.remove(ab.gruppe); W.entsorgen(ab.gruppe); }
    abschnitte = []; hindernisse = []; sterne = []; booster = [];
    startNr = S.idx + 1;
    Object.assign(S, { idx: startNr, s: 0, spur: 0, x: 0, y: 0, vy: 0, duck: 0, abbiegen: 0, stolper: 0, sprungPuffer: 0, eis: 0, lande: 0 });
    while (abschnitte.length < 4) abschnittNeu();
    aktZone = abschnitte[0].zone; W.zoneWechsel(aktZone, true);
    Object.assign(A, { nah: false, zeit: 0, abstand: 18, bis: 8 });
    kamYaw = 0; kamPos = null;
    FL.ab = Math.floor(punkte) + FLUG_AB;          // in weiteren 3000 Punkten geht es wieder in die Luft
    FL.rueck = .001; blende.style.opacity = 1;
    T.welt(); T.musik(aktZone);
    meldung("Gelandet!", `${W.zonen[aktZone].name} · nächster Flug bei ${FL.ab} Punkten`);
  }

  // Eine „Reihe“ im Himmel: Ring mit Sternenspur, Sternenbogen oder Hindernisse; dazu Inseln und Wolken am Rand
  function flugObjekt(typ, mesh, x, y, z, mehr = {}) {
    mesh.position.set(x, y, z); flugGruppe.add(mesh);
    const o = { typ, mesh, x, y, z, y0: y, ph: Math.random() * 6, weg: false, getroffen: false, ...mehr };
    FL.objekte.push(o); return o;
  }
  function flugStern(x, y, z) { const m = W.stern(); m.scale.setScalar(1.3); return flugObjekt("stern", m, x, y, z); }
  function reiheNeu() {
    const z = FL.naechst, schwer = Math.min(1, FL.strecke / 3000 + (FL.naechst < -1500 ? .2 : 0));
    const rx = () => zufall(-FX + 1, FX - 1), ry = () => zufall(FY0 + .8, FY1 - .8);
    const r = Math.random();
    if (r < .32) {                                       // Ring, davor eine Sternenspur, die hineinführt
      const x = rx(), y = ry();
      flugObjekt("ring", FW.ring(), x, y, z);
      for (let i = 1; i <= 4; i++) flugStern(x, y, z + i * 3.2);
    } else if (r < .5) {                                 // geschwungene Sternenspur
      const x0 = rx(), y0 = ry(), w = zufall(0, 6);
      for (let i = 0; i < 8; i++) flugStern(Math.max(-FX, Math.min(FX, x0 + Math.sin(w + i * .6) * 2.5)), Math.max(FY0, Math.min(FY1, y0 + Math.cos(w + i * .5) * 1.5)), z - i * 2.6);
    } else {                                             // Hindernisse, mit der Zeit mehr auf einmal
      const n = 1 + (Math.random() < schwer ? 1 : 0) + (Math.random() < schwer * .5 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const a = Math.random(), dz = z - i * 5;
        if (a < .45) flugObjekt("ballon", FW.heissluftballon(), rx(), ry(), dz, { r: 1.9, tiefe: 1.9 });
        else if (a < .75) flugObjekt("gewitter", FW.gewitter(), rx(), ry(), dz, { r: 2.4, tiefe: 1.8 });
        else {                                           // Vogelschwarm kreuzt von der Seite
          const von = wahl([-1, 1]);
          const o = flugObjekt("voegel", FW.voegel(), -von * (FX + 6), ry(), dz, { r: 1.6, tiefe: 1.2, vx: von * zufall(3.5, 5.5) });
          o.mesh.rotation.y = von > 0 ? -Math.PI / 2 : Math.PI / 2;
        }
      }
    }
    if (Math.random() < .14) {                           // Booster (kein Schubser in der Luft)
      const typ = wahl(["turbo", "schild", "magnet", "doppelt"]), m = W.booster(typ); m.scale.setScalar(1.5);
      flugObjekt("booster", m, rx(), ry(), z - 9, { art: typ });
    }
    // Deko: schwebende Inseln und Wolken am Rand, ab und zu ein Regenbogen
    for (const seite of [-1, 1]) {
      if (Math.random() < .45) flugObjekt("deko", FW.insel(), seite * zufall(13, 34), zufall(-5, 3), z + zufall(-8, 8));
      if (Math.random() < .55) {
        const w = new THREE.Sprite(W.mat.wolke); w.geometry.userData.geteilt = true;
        const b = zufall(10, 22); w.scale.set(b, b / 2, 1);
        flugObjekt("deko", w, seite * zufall(10 + b / 2, 40), zufall(b / 4, 18), z + zufall(-10, 10));   // ganz über dem Wolkenmeer, sonst schneidet es die Wolke ab
      }
    }
    if (-z > FL.regenbogen) { FL.regenbogen += 1600; flugObjekt("deko", FW.regenbogen(), 0, -8, z - 60); }
    FL.naechst -= Math.max(16, FL.v * 1.05) + zufall(2, 9) * (1.2 - schwer);
  }

  function flugTreffer(o) {
    if (A.nah && A.abstand < 7) { verlieren(o.typ === "gewitter" ? "Blitz und Donner, Anja hat dich!" : "Anja hat dich eingeholt!", "anja"); return; }
    FL.trudeln = .8; FL.v = Math.max(16, FL.v * .85);
    wackeln = .35; T.stolpern(); if (navigator.vibrate) navigator.vibrate(40);
    if (A.nah) meldung({ ballon: "Bumm, ein Ballon!", gewitter: "Blitz und Donner!", voegel: "Huch, Vögel!" }[o.typ], "Pass auf, Anja ist ganz nah!");
    anjaKommt(6);
  }
  function flugSchritt(dt) {
    R.zeit += dt; FL.zeit += dt;
    if (!FL.gewarnt && FL.zeit >= FLUG_ZEIT - 4) { FL.gewarnt = true; meldung("Gleich wird gelandet!", "Noch ein paar Ringe mitnehmen"); }
    if (FL.zeit >= FLUG_ZEIT && !FL.landung) { FL.landung = .001; T.abflug(); }
    if (FL.landung) {
      FL.landung += dt; blende.style.opacity = Math.min(1, FL.landung / .9);
      if (FL.landung >= .9) { flugLanden(); return; }
    }
    FL.v = Math.min(30, FL.v + .15 * dt);
    for (const k of ["turbo", "schild", "ruhe", "magnet", "doppelt"]) B[k] = Math.max(0, B[k] - dt);
    const faktor = B.doppelt > 0 ? 2 : 1, unverwundbar = B.schild > 0 || FL.abflug > 0 || FL.landung > 0;
    const v = FL.v * (B.turbo > 0 ? 1.3 : 1) * (FL.trudeln > 0 ? .75 : 1);
    const zAlt = FL.z;
    FL.z -= v * dt; strecke += v * dt; FL.strecke += v * dt; punkte += v * dt * faktor;
    if (FL.abflug) {                                     // Blende wieder ausblenden
      FL.abflug += dt; blende.style.opacity = Math.max(0, 1 - (FL.abflug - .9) / .8);
      if (FL.abflug > 1.7) FL.abflug = 0;
    }
    // Lenken: das Ziel wandert mit den Tasten (der Finger setzt es direkt), das Flugzeug gleitet hinterher und legt sich in die Kurve
    FL.zx = Math.max(-FX, Math.min(FX, FL.zx + FL.tasten.x * 10 * dt));
    FL.zy = Math.max(FY0, Math.min(FY1, FL.zy + FL.tasten.y * 8 * dt));
    const ax = FL.x, ay = FL.y, k = Math.min(1, dt * (FL.trudeln > 0 ? 2.5 : 5));
    FL.x += (FL.zx - FL.x) * k; FL.y += (FL.zy - FL.y) * k;
    FL.neig += (Math.max(-.5, Math.min(.5, -(FL.x - ax) / dt * .09)) - FL.neig) * Math.min(1, dt * 6);
    FL.nick += (Math.max(-.4, Math.min(.4, (FL.y - ay) / dt * .06)) - FL.nick) * Math.min(1, dt * 6);
    FL.trudeln = Math.max(0, FL.trudeln - dt);
    while (FL.naechst > FL.z - 170) reiheNeu();

    const einsammeln = (o) => {
      o.weg = true; o.mesh.visible = false; sternZahl++; punkte += 10 * faktor; funkeln(o.mesh.position, "#ffe066", 8);
      T.stern(sternZahl); hud.classList.remove("hupf"); void hud.offsetWidth; hud.classList.add("hupf");
    };
    for (const o of FL.objekte) {
      if (o.vx) { o.x += o.vx * dt; o.mesh.position.x = o.x; }
      if (o.typ === "ballon") { o.y = o.y0 + Math.sin(R.zeit * .8 + o.ph) * .6; o.mesh.position.y = o.y; }
      if (o.weg || o.typ === "deko") continue;
      const dz = o.z - FL.z, abst = Math.hypot(o.x - FL.x, o.y - FL.y);
      if (o.typ === "stern") {
        if (B.magnet > 0 && dz > -12 && dz < 1) { if (dz > -1.5) einsammeln(o); else o.zieht = true; continue; }
        if (Math.abs(dz) < 1.2 && abst < 1.5) einsammeln(o);
      } else if (o.typ === "ring") {
        if (o.z <= zAlt && o.z > FL.z) {                 // genau beim Durchfliegen prüfen
          o.weg = true;
          if (abst < 1.55) { R.ringe++; punkte += 25 * faktor; T.ring(); funkeln(o.mesh.position, "#ffcc33", 16); o.puls = .4; meldung("Durch den Ring!", `+${25 * faktor} Punkte`); }
        }
      } else if (o.typ === "booster") {
        if (Math.abs(dz) < 1.3 && abst < 1.7) {
          o.weg = true; o.mesh.visible = false; boosterNehmen(o.art);
          funkeln(o.mesh.position, { turbo: "#ffcc33", schild: "#6ec6ff", magnet: "#ff6b6b", doppelt: "#c58cff" }[o.art], 18);
        }
      } else if (!o.getroffen && !unverwundbar && Math.abs(dz) < o.tiefe && abst < o.r) {
        o.getroffen = true; flugTreffer(o); if (zustand !== "laeuft") return;
      }
    }
    // weit hinter der Kamera: wegräumen
    FL.objekte = FL.objekte.filter(o => {
      if (o.z - FL.z < 20) return true;
      flugGruppe.remove(o.mesh); W.entsorgen(o.mesh); return false;
    });
    // Anja kommt auch in der Luft immer wieder hinterhergeflogen
    A.bis -= dt;
    if (!A.nah && A.bis <= 0) anjaKommt(5);
    if (A.nah) { A.zeit -= dt; if (A.zeit <= 0) { A.nah = false; A.bis = zufall(15, 22); } }
    A.abstand += ((A.nah ? 6 : 22) - A.abstand) * Math.min(1, dt * (A.nah ? 1.4 : .5));
    hudZeigen();
  }

  function flugBild(dt) {
    const fang = zustand === "fang" && schlussSzene && schlussSzene.art === "anja", t = performance.now() / 1000;
    const fg = flieger.gruppe;
    fg.position.set(FL.x, FL.y + Math.sin(t * 2) * .08, FL.z);
    fg.rotation.set(FL.nick, 0, FL.neig + (FL.trudeln > 0 ? Math.sin(FL.trudeln * 22) * .45 : 0));
    flieger.propeller.rotation.z += dt * (B.turbo > 0 ? 55 : 38);
    spieler.hals.rotation.x = Math.sin(t * 1.6) * .07 + (B.turbo > 0 ? -.25 : 0);
    spieler.schwanz.rotation.z = Math.sin(t * 3) * .3;
    blase.visible = B.schild > 0 && (B.schild > 1 || Math.floor(B.schild * 8) % 2 === 0);
    // Anjas Flieger folgt mit etwas Verzögerung, beim Fangen fliegt sie direkt daneben
    FL.ax += ((fang ? FL.x + 3 : FL.x + (FL.x > 2 ? -3.6 : 3.6)) - FL.ax) * Math.min(1, dt * 1.5);
    FL.ay += ((fang ? FL.y : FL.y - .9) - FL.ay) * Math.min(1, dt * 1.5);
    const ag = anjaFlieger.gruppe;
    const hinten = 1.6 + A.abstand * .55;               // gestaucht, damit ihr Flieger nie direkt vor der Kamera hängt
    ag.visible = hinten < 10;
    ag.position.set(FL.ax, FL.ay + Math.sin(t * 2.3) * .1, FL.z + hinten);
    ag.rotation.set(0, 0, (FL.x - FL.ax) * -.08);
    anjaFlieger.propeller.rotation.z += dt * 40;
    anja.arme.forEach((a, i) => {                       // ein Arm winkt drohend, beim Fangen beide Arme hoch
      const winkt = fang || i === 0;
      a.oben.rotation.x = winkt ? 2.7 + Math.sin(t * 9 + i) * .25 : .2; a.unten.rotation.x = winkt ? .4 : .9; a.oben.rotation.z = 0;
    });
    anja.zopf.rotation.x = .9 + Math.sin(t * 12) * .15;  // Zopf flattert im Fahrtwind

    for (const o of FL.objekte) {
      if (o.typ === "stern") { o.mesh.rotation.y += dt * 3; if (o.zieht && !o.weg) o.mesh.position.lerp(fg.position, Math.min(1, dt * 9)); }
      else if (o.typ === "booster") o.mesh.userData.innen.rotation.y += dt * 3;
      else if (o.typ === "ring") {
        o.mesh.rotation.z += dt * .6;
        if (o.puls) { o.puls = Math.max(0, o.puls - dt); o.mesh.scale.setScalar(1 + Math.sin(o.puls / .4 * Math.PI) * .35); }
      } else if (o.typ === "voegel") o.mesh.userData.flattern.forEach(([l, r], i) => { const f = Math.sin(t * 10 + i) * .7; l.rotation.z = f; r.rotation.z = -f; });
      else if (o.typ === "gewitter") o.mesh.userData.blitz.visible = Math.sin(t * 7 + o.ph * 3) > .93;
    }
    // Wolkenmeer und Himmel wandern mit, das Muster bleibt am Ort
    meer.position.set(FL.x, -1.5, FL.z);
    FW.wolkenBild.offset.set(FL.x * 12 / 500, -FL.z * 12 / 500);
    schattenNachfuehren(FL.x, FL.z);

    // Kamera hinter dem Flugzeug, etwas erhöht; beim Fangen langsam herum
    if (fang) kamYaw += dt * .9; else kamYaw = 0;
    const sin = Math.sin(kamYaw), cos = Math.cos(kamYaw), hoch = kamera.aspect < .8;
    const rad = fang ? 13 : 10;
    const ziel = new THREE.Vector3(FL.x * .75 + sin * rad, FL.y + (hoch ? 3.8 : 2.9), FL.z + cos * (hoch ? rad + 2 : rad + .5));
    if (!kamPos) kamPos = ziel.clone(); else kamPos.lerp(ziel, Math.min(1, dt * 6));
    kamera.position.copy(kamPos);
    if (wackeln > 0) { wackeln = Math.max(0, wackeln - dt); kamera.position.x += (Math.random() - .5) * wackeln * .6; kamera.position.y += (Math.random() - .5) * wackeln * .4; }
    kamera.lookAt(FL.x * .85 - sin * 10, FL.y + .4, FL.z - cos * 10);
    kamera.fov += (((hoch ? 72 : 62) + (B.turbo > 0 ? 10 : 0)) - kamera.fov) * Math.min(1, dt * 3); kamera.updateProjectionMatrix();
    himmelKugel.position.copy(kamera.position); wolkenGruppe.position.set(kamera.position.x, 0, kamera.position.z);
    sonnenBild.position.set(kamera.position.x - 85, 95, kamera.position.z + 50);
    W.animieren(t);
    teilchenSchritt(dt);
    renderer.render(szene, kamera);
  }
}
