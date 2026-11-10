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
  const ergebnis = $(".lauf-ergebnis"), aufgabenFeld = $(".lauf-aufgaben"), shop = $(".lauf-laden"), pauseFeld = $(".lauf-pause"), weiterFeld = $(".lauf-rettung");
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
      bereit = Promise.all([import("./vendor/three/three.module.min.js"), import("./lauf-welt.js?v=49"), import("./lauf-ton.js?v=10"), import("./lauf-flug.js?v=11"), import("./lauf-effekte.js?v=4"), import("./lauf-buero.js?v=1"), import("./detektiv-figuren.js?v=4")])
        .then(([m, w, t, f, e, bm, fm]) => { THREE = m; T = t.ton(); aufbauen(w, f, e, bm, fm); losKnopf.disabled = false; losKnopf.textContent = text; });
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
  // Figuren: Fröbelinchen und Leo gibt es sofort, die anderen ab einer Fröbel-Stufe (eine Stufe je 5000 gesammelte Punkte)
  // Figuren: Fröbelinchen, Leo und Schnäuzchen gibt es sofort. Die anderen gibt es ab einer Fröbel-Stufe zu kaufen (Sterne).
  const FIGUR_LISTE = [
    { id: "giraffe", emoji: "🦒", name: "Fröbelinchen", stufe: 1, preis: 0 }, { id: "leo", emoji: "🐢", name: "Leo", stufe: 1, preis: 0 }, { id: "igel", emoji: "🦔", name: "Schnäuzchen", stufe: 1, preis: 0 },
    { id: "hase", emoji: "🐰", name: "Rambo Rabbit", stufe: 5, preis: 250 }, { id: "baer", emoji: "🐻", name: "Baylin", stufe: 10, preis: 250 },
    { id: "elefant", emoji: "🐘", name: "Jensfant", stufe: 20, preis: 250 }, { id: "affe", emoji: "🐒", name: "Momo", stufe: 30, preis: 1000 },
    { id: "pinguin", emoji: "🐧", name: "Pingo", stufe: 50, preis: 1000 }, { id: "koala", emoji: "🐨", name: "Kalle", stufe: 70, preis: 1000 },
    { id: "katze", emoji: "🐱", name: "Mimi", stufe: 100, preis: 1000 }, { id: "anja", emoji: "👱‍♀️", name: "Anja", stufe: 150, preis: 1000 }, { id: "pip", emoji: "🌱", name: "Fröbelix", stufe: 300, preis: 1200 },
    { id: "fuchs", emoji: "🦊", name: "Ferdi", stufe: 400, preis: 1500 }, { id: "panda", emoji: "🐼", name: "Paula", stufe: 600, preis: 2000 },
    { id: "mops", emoji: "🐶", name: "Fips", stufe: 1000, preis: 3000 },
  ];
  const EP_JE_STUFE = 5000;
  let erfahrung = +lies("froebelinchen-rennt-erfahrung", 0) || 0;
  const stufeVon = (ep) => Math.floor(ep / EP_JE_STUFE) + 1;
  // Geheimer Link: ?figuren=alle-sprosse schaltet auf diesem Gerät alle Figuren frei, ?figuren=normal nimmt es wieder zurück
  { const p = new URLSearchParams(location.search).get("figuren"); if (p === "alle-sprosse") schreib("froebelinchen-rennt-alle", true); else if (p === "normal") schreib("froebelinchen-rennt-alle", false); }
  const alleFrei = lies("froebelinchen-rennt-alle", false) === true;
  const frei = (id) => alleFrei || stufeVon(erfahrung) >= (FIGUR_LISTE.find(f => f.id === id) || { stufe: 99 }).stufe;
  const figurDaten = (id) => FIGUR_LISTE.find(f => f.id === id) || FIGUR_LISTE[0];
  if (!Array.isArray(konto.figuren)) konto.figuren = [];
  const gekauft = (id) => alleFrei || figurDaten(id).preis === 0 || konto.figuren.includes(id);
  let figur = lies("froebelinchen-rennt-figur", "giraffe");
  // wer vor den Preisen schon mit einer freigeschalteten Figur gespielt hat, behält sie
  if (frei(figur) && !gekauft(figur) && !konto.figurenGeprueft) { konto.figuren.push(figur); }
  konto.figurenGeprueft = true; schreib("froebelinchen-rennt-konto", konto);
  if (!frei(figur) || !gekauft(figur)) figur = "giraffe";
  const NAME = () => (FIGUR_LISTE.find(f => f.id === figur) || FIGUR_LISTE[0]).name;
  // Wer verfolgt: sonst Anja, spielt man selbst Anja, ist Marlena hinter ihr her (auch beim Schubsen und in der Kissenschlacht)
  const JAGD = () => figur === "anja" ? "Marlena" : "Anja";
  const verfolgerBauen = () => { const v = figur === "anja" ? W.marlenaBauen() : W.anjaBauen(); v.wer = JAGD(); return v; };

  // ---------- Spielwerte ----------
  const SPUR = 1.6, H = 2.9, ECKE = 12;           // Spurbreite, halbe Wegbreite, Abbiegezone vor der Ecke
  // Ab vielen Punkten in einer Runde wird alles schneller (Laufen und Fliegen)
  const TEMPO_STUFEN = [[40000, 1.2], [30000, 1.15], [20000, 1.1], [10000, 1.05]];   // alle 10.000 Punkte etwas schneller (nie über ~22 m/s)
  // Schwierigkeit 0–4: dieselben Stufen machen das Spiel auch dichter (mehr Hindernisse, weniger Schutz, Anja öfter)
  const schwerStufe = () => TEMPO_STUFEN.filter(([p]) => punkte >= p).length;
  const ANJA_PHASE = 40000;                         // ab hier bleibt Anja dicht dran: jeder Stolperer beendet die Runde
  const tempoFaktor = () => { for (const [p, f] of TEMPO_STUFEN) if (punkte >= p) return f; return 1; };
  const START_TEMPO = 9, MAX_TEMPO = 18;          // Grundtempo steigt als weiche Kurve: ~15 m/s nach 2 min, ~18 nach 6 min
  const SPRUNG = 7.2, G = 22, DUCKEN = .75, PUFFER = .15;
  let renderer, szene, kamera, uhr, boden, spieler, anja;
  let startNr = 0;                                 // Nummer des ersten Abschnitts (nach der Landung geht es weiter)
  let abschnitte = [], hindernisse = [], sterne = [], booster = [];
  // Booster-Zeiten in Sekunden; schubs = laufende Szene, in der Fröbelinchen Anja wegschubst
  const B = { schild: 0, ruhe: 0, magnet: 0, doppelt: 0, schubs: null };
  let blase, sternchen = [];
  let zustand = "start", tempo, punkte, sternZahl, strecke, wackeln = 0, schlussSzene = null;
  const S = { idx: 0, s: 0, spur: 0, x: 0, y: 0, vy: 0, duck: 0, abbiegen: 0, stolper: 0, lauf: 0, sprungPuffer: 0, eis: 0, lande: 0 };
  const A = { nah: false, zeit: 0, abstand: 16, bis: 5, lauf: 0, schritt: 0 };
  const R = { boote: 0, fluege: 0, anjaPhase: false, tempoF: 1, booster: 0, schubs: 0, welt: 0, zeit: 0, laufZeit: 0, flug: 0, ringe: 0, tore: 0, schlitten: 0, frauBei: 20, kombo: 0, fahne: false, jubel: false };    // Werte dieser Runde für Aufgaben, Ergebnis und Bestenliste
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
  let W, sonne, himmelKugel, wolkenGruppe, ferneGruppe, sonnenBild, laterneLicht, aktZone = 0;
  let teilchen = [], staubTakt = 0;               // kleine Partikel (Funken, Staub)
  let NB = null, himmelLicht, schattenF, schattenA;
  function aufbauen(weltModul, flugModul, fxModul, bueroModul, figurModul) {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = handy ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
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
    himmelLicht = new THREE.HemisphereLight("#cfe6ff", "#6c8f3c", .85); szene.add(himmelLicht);
    sonne = new THREE.DirectionalLight("#ffe7c4", 2.8);
    sonne.castShadow = true;
    sonne.shadow.mapSize.set(handy ? 1024 : 2048, handy ? 1024 : 2048);
    Object.assign(sonne.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 70 });
    sonne.shadow.bias = -.0004; sonne.shadow.normalBias = .03;
    szene.add(sonne, sonne.target);
    // Laternenlicht über Fröbelinchen: bleibt immer in der Szene (sonst müssten alle Materialien neu übersetzt werden), leuchtet nur nachts
    laterneLicht = new THREE.PointLight("#ffb45e", 0, 13, 1.3); szene.add(laterneLicht);
    uhr = new THREE.Clock();
    boden = W.bodenFlaeche(); szene.add(boden, W.luft);
    W.verbinden({ szene, himmelMat: himmelKugel.material, sonne });
    spieler = W.figurBauen(figur); szene.add(spieler.gruppe);
    W.ausstattungSetzen(spieler, konto.an);
    anja = verfolgerBauen(); szene.add(anja.gruppe);
    blase = W.blase(); spieler.gruppe.add(blase); blasePassen(1);
    sternchen = [0, 1, 2].map(() => { const st = W.stern(); st.scale.setScalar(.45); st.visible = false; szene.add(st); return st; });
    flugAufbauen(flugModul);
    // Leuchten und Farbstimmung nur, wenn das Gerät Bilder mit hohem Helligkeitsumfang zeichnen kann
    const ext = renderer.extensions;
    if (renderer.capabilities.isWebGL2 && (ext.has("EXT_color_buffer_float") || ext.has("EXT_color_buffer_half_float"))) NB = fxModul.effekte(THREE, renderer, handy);
    tempoL = fxModul.tempoLinien(THREE, handy); szene.add(tempoL.gruppe);
    schattenF = W.kontaktSchatten(1.1, 2.1); schattenA = W.kontaktSchatten(.9, .9); szene.add(schattenF, schattenA);
    duellAufbauen();
    folieAufbauen();
    bueroAufbauen(bueroModul, figurModul);
    qualitaetSetzen(qualitaet);
    neu();
    groesse(); new ResizeObserver(groesse).observe(huelle);
    vorwaermen();
    renderer.setAnimationLoop(bild);
  }

  function groesse() {
    const w = huelle.clientWidth, h = huelle.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); kamera.aspect = w / h;
    if (NB) NB.groesse();
    kamera.fov = w / h < .8 ? 72 : 62; kamera.updateProjectionMatrix();
  }

  // Automatische Qualität: ruckelt es, werden nacheinander Schatten, Auflösung und Wetter reduziert
  function qualitaetSetzen(stufe, zurLaufzeit) {
    qualitaet = stufe;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, stufe >= 2 ? 1 : (handy ? (stufe ? 1.15 : 1.3) : 2)));
    if (!zurLaufzeit) sonne.castShadow = stufe < 1;
    else if (stufe >= 1 && sonne.castShadow && renderer.shadowMap.autoUpdate) {   // castShadow umzuschalten würde alle Shader neu übersetzen und das Spiel anhalten: stattdessen wird die Schattenkarte einmal leer gezeichnet
      const sk = sonne.shadow.camera; sk.far = sk.near + .001; sk.updateProjectionMatrix();
      renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
    }
    W.luft.visible = stufe < 3 && !FL.an;
    if (kamera) groesse();
  }
  let messZeit = 0, messBilder = 0, messLangsam = 0, messSperre = 2;
  function leistungMessen(echt) {
    if (zustand !== "laeuft" || qualitaet >= 3) return;
    if (echt > .25) { messZeit = 0; messBilder = 0; return; }   // ein einzelner Hänger (Phasenwechsel, Hintergrund) sagt nichts über die Bildrate
    if ((messSperre -= echt) > 0) return;
    messZeit += echt; messBilder++;
    if (messZeit < 3) return;
    const fps = messBilder / messZeit; messZeit = 0; messBilder = 0;
    if (fps >= (handy ? 50 : 40)) { messLangsam = 0; return; }
    if (++messLangsam < 2) return;                       // erst wenn es zweimal hintereinander zu langsam war
    messLangsam = 0; messSperre = 4;
    qualitaetSetzen(qualitaet + 1, true); schreib("froebelinchen-rennt-qualitaet", qualitaet);
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
    const Z = W.zonen[ab.zone];        // im Dschungel: Feldweg ohne Randsteine, Pflanzenwand statt Hecke
    setze(W.wegFuer(L + H - von, 2 * H, ab.zone), (von + L + H) / 2, 0);
    if (Z.weg !== "erde") for (const seite of [-1, 1]) {       // Randsteine wie die Hecken: an der Abbiege-Seite offen
      const bis = seite === ab.dreh ? L - H : L + H, anf = erster ? -6 : H;
      setze(W.kante(bis - anf), (anf + bis) / 2, seite * (H - .09), .05);
    }
    // Hecken links und rechts; auf der Abbiege-Seite endet die Hecke vor der Ecke
    for (const seite of [-1, 1]) {
      const bis = seite === ab.dreh ? L - H : L + H, anf = erster ? -6 : H;
      setze(W.randFuer(bis - anf, ab.zone, undefined, undefined, -seite), (anf + bis) / 2, seite * (H + .55), 0);
      setze(W.blumenFuer(bis - anf - .6, ab.zone), (anf + bis) / 2, seite * (H + .07), 0);
    }
    // Grasbüschel im Wind hinter den Hecken; am See nur ein schmaler Streifen, sonst stünden sie im Wasser
    const grasBreite = ab.zone === 2 ? 1 : 6;
    for (const seite of [-1, 1]) {
      const anf = erster ? -5 : H + 1, bis = seite === ab.dreh ? L - H - 1.5 : L + H;
      if (bis - anf > 2) { setze(W.grasBueschel(bis - anf, ab.zone, grasBreite), (anf + bis) / 2, seite * (H + 1.05 + grasBreite / 2), 0); setze(W.wiesenBlumen(bis - anf, ab.zone, grasBreite), (anf + bis) / 2, seite * (H + 1.05 + grasBreite / 2), 0); }
    }
    // Hecke quer am Ende, davor ein Pfeilschild und leuchtende Pfeile auf dem Weg: hier geht es ab
    setze(W.randFuer(2 * H + 2, ab.zone, 1.5, .9), L + H + .55, 0, 0, Math.PI / 2);   // etwas dicker und höher als die Seitenhecken: keine deckungsgleichen Flächen
    setze(W.pfeilSchild(ab.dreh), L + H - .1, 0);
    for (const d of [11, 7.5, 4]) setze(W.bodenPfeil(ab.dreh), L - d, 0);
    if (erster) setze(W.randFuer(2 * H + 2, ab.zone, 1.5, .9), -6.55, 0, 0, Math.PI / 2);

    hindernisseVerteilen(ab, setze);
    // Fröbel: in jeder Kurve eine Tafel an der Hecke (dort schaut man ohnehin hin), dazu Tafeln und Schilder am Wegrand
    setze(W.froebelHeckenTafel(["ohren", "kitas", "logo"][nr % 3]), L + H + .06, 0, .72);   // mittig unter dem Pfeilschild
    if (!erster && Math.random() < .5) {
      const seite = wahl([-1, 1]);
      setze(W.froebelTafel(wahl(["logo", "logo", "ohren", "kitas"])), zufall(14, L - 16), seite * (H + zufall(4, 6.5)), 0, -seite * .45);
    }
    if (!erster && Math.random() < .55) {
      const seite = wahl([-1, 1]);
      setze(W.froebelSchild(wahl(["ohren", "kitas"])), zufall(10, L - 14), seite * (H + 1.3), 0, -seite * .6);
    }

    // Ab und zu ein Booster an einer freien Stelle
    if (!erster && Math.random() < .5) {
      const bs = zufall(14, L - 14);
      if (!hindernisse.some(o => o.nr === nr && Math.abs(o.s - bs) < 4)) {
        const r = Math.random();
        let typ = r < .31 ? "schild" : r < .54 ? "schubs" : r < .77 ? "magnet" : "doppelt";
        if ((typ === "schild" || typ === "schubs") && (R.anjaPhase || Math.random() < schwerStufe() * .18)) typ = wahl(["magnet", "doppelt"]);   // später seltener Schutz
        const sp = wahl([-1, 0, 1]);
        booster.push({ nr, s: bs, spur: sp, typ, mesh: setze(W.booster(typ), bs, sp * SPUR, 1.05), weg: false });
      }
    }
    // Landschaft neben dem Weg
    for (let d = 9; d < L - 9; d += Z.dicht ? zufall(3, 5.5) : zufall(6, 10)) {   // im Dschungel stehen die Pflanzen viel dichter
      for (const seite of [-1, 1]) {
        if (Math.random() < (Z.dicht ? .08 : .35)) continue;
        const obj = W.dekoFuer(ab.zone), abst = Math.max(Z.dicht ? zufall(2.6, 11) : zufall(4.5, 12), obj.userData.abstand || 0);
        setze(obj, d + zufall(-2, 2), seite * (H + abst), 0, Math.floor(Math.random() * 4) * Math.PI / 2);
      }
    }
  }

  // Hindernisse mit fairen Abständen: der Abstand richtet sich nach dem Tempo, das man dort ungefähr haben wird,
  // und es bleibt immer mindestens eine Spur frei. Mit der Zeit kommen schwerere Muster dazu.
  function hindernisseVerteilen(ab, setze) {
    const schwer = Math.min(1, ab.nr / 30);
    const tempoDort = Math.min(MAX_TEMPO, START_TEMPO + ab.nr * .45) * tempoFaktor();   // schneller: Hindernisse weiter auseinander
    const mindest = tempoDort * .95 + 3;              // gut eine Sekunde Reaktionszeit
    let s = ab.erster ? 24 : 14;
    while (s < ab.L - 11) {
      const typ = hindernisNeu(ab, s, setze, schwer, null);
      // Kombination: kurz danach ein zweites Hindernis, das man mit einer Bewegung schafft
      if (schwer > .25 && Math.random() < .2 + .35 * schwer + schwerStufe() * .08 && s + tempoDort * .7 + 2 < ab.L - 11) {
        s += tempoDort * .7 + 2;
        hindernisNeu(ab, s, setze, schwer, typ);
      }
      s += mindest * Math.max(.85, 1.35 - .35 * schwer - schwerStufe() * .06) + zufall(0, 7 * (1 - schwer) + 2);
    }
  }
  // Art des Hindernisses: block = ausweichen (sonst Rundenende), niedrig = drüberspringen, hoch = ducken, eis = rutschig
  const ART = { kloetze: "block", heuballen: "block", ball: "niedrig", balken: "niedrig", pfuetze: "niedrig", laub: "niedrig",
    huhn: "niedrig", enten: "niedrig", schneeball: "niedrig", stange: "hoch", eis: "eis", laternen: "hoch", gans: "niedrig", liane: "hoch", affe: "niedrig" };
  const HOEHE = { ball: .75, balken: .45, pfuetze: .15, laub: .5, huhn: .55, enten: .45, schneeball: .8, gans: .75, affe: .35 };
  const WELT_HINDERNISSE = [[], ["heuballen", "huhn"], ["enten"], ["laub"], ["laternen", "gans"], ["schneeball", "eis"], ["liane"]];   // eigene je Welt
  function hindernisNeu(ab, s, setze, schwer, vorher) {
    const extra = WELT_HINDERNISSE[ab.zone] || [];
    let typ;
    if (extra.length && Math.random() < .4 + schwerStufe() * .08) typ = wahl(extra);   // später mehr bewegte Hindernisse
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
    } else if (typ === "huhn" || typ === "enten" || typ === "gans") {
      const von = wahl([-1, 1]), x = von * (H - .4);
      mesh = setze(W.weltHindernis(typ), s, x);
      bew = { vx: -von * (typ === "huhn" ? 1.7 : typ === "gans" ? 1.3 : 1.1), x };                              // läuft quer über den Weg
      spuren = [Math.round(x / SPUR)];
    } else if (typ === "laub" || typ === "eis") {
      setze(W.weltHindernis(typ, 2 * H), s, 0);
    } else if (typ === "balken") setze(W.hindernis("balken", 2 * H - .3), s, 0);
    else if (typ === "pfuetze") setze(W.hindernis("pfuetze", 2 * H), s, 0);
    else if (typ === "laternen") setze(W.weltHindernis("laternen", 2 * H - .2), s, 0);   // Laternenkette quer: ducken
    else if (typ === "liane") setze(W.weltHindernis("liane", 2 * H - .2), s, 0);         // Liane quer: ducken
    else if (typ === "affe") { spuren = [wahl([-1, 0, 1])]; mesh = setze(W.weltHindernis("affe", 2 * H, spuren[0] * SPUR), s, spuren[0] * SPUR); }   // Banane auf einer Spur
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
      const m = setze(W.toertchen(), ds, sp * SPUR, hoehe);
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
    duellAus(); folieAus(); bueroAus(); flugAus();
    for (const ab of abschnitte) { szene.remove(ab.gruppe); W.entsorgen(ab.gruppe); }
    for (const p of teilchen) { szene.remove(p.k); teilchenLager[p.k.userData.art].push(p.k); }
    teilchen = [];
    abschnitte = []; hindernisse = []; sterne = []; booster = []; startNr = 0;
    FL.ab = PHASEN_ABSTAND[0]; FL.rueck = 0; FL.phaseNr = 0;
    aktZone = 0; W.zoneWechsel(0, true); stimmungSetzen(true);
    Object.assign(B, { schild: 0, ruhe: 0, magnet: 0, doppelt: 0, schubs: null });
    FL.naechsteArt = "folie"; FL.schlittenBei = 0; FL.sonder = null;
    Object.assign(R, { boote: 0, fluege: 0, anjaPhase: false, tempoF: 1, booster: 0, schubs: 0, welt: 0, zeit: 0, laufZeit: 0, flug: 0, ringe: 0, tore: 0, schlitten: 0, frauBei: 20, kombo: 0, fahne: false, jubel: false });
    RE.genutzt = false; RE.schutz = 0; RE.szene = null; weiterFeld.hidden = true;
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
    if (BU.an) { bueroTaste(art); return; }
    if (FO.an) {                      // Einpacken: Pfeiltasten im Wechsel zählen wie ein Wisch
      if (zustand === "laeuft" && (art === "links" || art === "rechts")) folieWisch((art === "links" ? -1 : 1) * Math.max(40, huelle.clientWidth * .08));
      return;
    }
    if (zustand !== "laeuft" || FL.an || DU.an) return;
    const ab = abschnitte.find(a => a.nr === S.idx);
    if (art === "links" || art === "rechts") {
      const d = art === "links" ? -1 : 1;
      // in der Abbiegezone wird ein Wisch in Abbiege-Richtung vorgemerkt, auch wenn er etwas früh kommt
      if (ab.L - S.s < ECKE * tempoFaktor() && S.s < ab.L + .6 && d === ab.dreh) { if (!S.abbiegen) T.spur(); S.abbiegen = d; return; }
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
    if (DU.an && (e.code === "KeyA" || e.code === "KeyB")) { e.preventDefault(); if (!e.repeat) duellTaste(e.code === "KeyA" ? "A" : "B"); return; }
    if (BU.an && zustand === "laeuft" && (e.code === "Enter" || e.code === "NumpadEnter")) { e.preventDefault(); bueroTaste("hoch"); return; }
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
    if (FO.an) { const t = e.touches[0]; folieWisch(t.clientX - wisch.lx); wisch.lx = t.clientX; return; }
    if (FL.an) {                      // im Flug folgt das Flugzeug dem Finger (relativ, egal wo man hinfasst)
      const t = e.touches[0], k = 18 / Math.max(300, huelle.clientWidth);
      FL.zx = Math.max(-FX, Math.min(FX, FL.zx + (t.clientX - wisch.lx) * k));
      if (FL.art !== "wasser" && FL.art !== "schlitten") FL.zy = Math.max(FY0, Math.min(FY1, FL.zy - (t.clientY - wisch.ly) * k));
      wisch.lx = t.clientX; wisch.ly = t.clientY; return;
    }
    if (wisch.fertig) return;
    const t = e.touches[0], dx = t.clientX - wisch.x, dy = t.clientY - wisch.y;
    if (Math.hypot(dx, dy) < 28) return;
    wisch.fertig = true;   // schon während des Wischens auslösen, das fühlt sich schneller an
    eingabe(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "links" : "rechts") : (dy < 0 ? "hoch" : "runter"));
  }, { passive: false });
  huelle.addEventListener("touchend", () => { wisch = null; });
  // Einpacken geht auch mit gedrückter Maustaste
  let mausX = null;
  huelle.addEventListener("pointerdown", (e) => { if (e.pointerType === "mouse") mausX = e.clientX; if (BU.an && renderer && e.target === renderer.domElement) bueroTippen(e); });
  addEventListener("pointermove", (e) => { if (mausX !== null && e.pointerType === "mouse" && FO.an) { folieWisch(e.clientX - mausX); mausX = e.clientX; } });
  addEventListener("pointerup", () => { mausX = null; });

  // ---------- Pause und Ton ----------
  function pauseUm() {
    if (zustand === "laeuft") { zustand = "pause"; pauseFeld.hidden = false; T.musikStop(); }
    else if (zustand === "pause") { zustand = "laeuft"; pauseFeld.hidden = true; uhr.getDelta(); T.musik(FL.an ? flugMusik() : zoneMusik()); }
  }
  pauseKnopf.addEventListener("click", () => { if (zustand === "laeuft" || zustand === "pause") pauseUm(); });
  $(".lauf-weiter").addEventListener("click", pauseUm);
  document.addEventListener("visibilitychange", () => { if (document.hidden && T) { T.verlorenStop(); T.fahrt(null); } if (document.hidden && zustand === "laeuft") pauseUm(); });
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
    vollbild = false; rahmen.classList.remove("vollbild"); document.body.classList.remove("spiel-offen"); if (T) T.verlorenStop();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    if (zustand === "laeuft" || zustand === "pause" || zustand === "fang" || zustand === "rettung") { pauseFeld.hidden = true; weiterFeld.hidden = true; ende("Pause gemacht"); }
  }
  zu.addEventListener("click", vollbildAus);
  // Aufruf aus der Spielauswahl: am Handy Vollbild mit Anleitung, gestartet wird erst mit „Los geht’s“
  window.froebelRennen = { oeffnen() { if (handy) { vollbildAn(); if (kannWebGL) laden(); } else rahmen.scrollIntoView({ behavior: "smooth", block: "center" }); } };
  document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && vollbild) vollbildAus(); });

  losKnopf.addEventListener("click", async () => {
    if (handy && !vollbild) vollbildAn();
    await laden();
    T.start(); T.verlorenStop();
    if (zustand === "aus") neu();
    zustand = "laeuft"; window.froebelAktiv = "lauf";
    ueber.hidden = true; ladenZu(); topFeld.hidden = true; eintragForm.hidden = true; uhr.getDelta();
    T.musik(zoneMusik());
  });

  // Rundenende: zuerst eine kurze Szene (Anja fängt Fröbelinchen bzw. Fröbelinchen prallt ab), dann das Ergebnis
  function verlieren(grund, art) {
    if (zustand !== "laeuft") return;
    zustand = "fang"; schlussSzene = { grund, art, t: 0 };
    T.musikStop(); if (art === "anja") T.anja(); else T.knall();
    T.verloren();                                       // Weckton, bis man „Nochmal“ drückt oder das Spiel schließt
    if (navigator.vibrate) navigator.vibrate(art === "anja" ? [60, 40, 60] : 80);
    wackeln = .5;
  }
  function ende(grund) {
    zustand = "aus"; window.froebelAktiv = null; T.musikStop(); T.fahrt(null); warnung.classList.remove("an");
    const p = Math.floor(punkte), neuerRekord = p > rekord && p > 0;
    if (neuerRekord) { rekord = p; schreib("froebelinchen-rennt-rekord", rekord); }
    konto.sterne += sternZahl; schreib("froebelinchen-rennt-konto", konto);
    const geschafft = aufgabenPruefen();
    ueberTitel.textContent = grund;
    if (geschafft.length) {                              // kurz: eine Zeile mit Anzahl und Sternen, darunter die Aufgaben klein
      const lohn = geschafft.reduce((n, a) => n + a.lohn, 0), klein = document.createElement("small");
      ueberText.textContent = `✓ ${geschafft.length === 1 ? "Aufgabe" : geschafft.length + " Aufgaben"} geschafft · +${lohn} ★`;
      klein.textContent = geschafft.map(a => a.text).join(" · "); ueberText.append(klein);
    } else ueberText.textContent = `Rekord ${rekord} · Sterne gesamt ${konto.sterne}`;
    ergebnis.hidden = false; ueber.classList.add("ergebnis");
    ergebnis.querySelector(".le-punkte b").textContent = p;
    ergebnis.querySelector(".le-sterne").textContent = sternZahl;
    ergebnis.querySelector(".le-meter").textContent = Math.round(strecke);
    ergebnis.querySelector(".le-welt").textContent = BU.an ? "Ankes Büro" : FO.an ? "Einpacken" : DU.an ? "Kissenschlacht" : FL.an ? ({ wasser: "Wasserwelt", schlitten: "Schlittenfahrt" }[FL.art] || "Luftwelt") : W.zonen[Math.min(R.welt, W.zonen.length - 1)].name;
    ergebnis.querySelector(".le-rekord").hidden = !neuerRekord;
    if (neuerRekord) T.rekord(); else T.ende();
    if (!tutorialFertig) { tutorialFertig = true; schreib("froebelinchen-rennt-tutorial", true); }
    aufgabenZeigen();
    stufeNachRunde(p);
    // passt das Namensfeld nicht ganz ins Bild (kleine Handys), zu den Punkten scrollen: Punkte und Namensfeld stehen dann oben
    requestAnimationFrame(() => {
      const info = $(".lauf-info"); info.scrollTop = 0;
      const feld = eintragForm.getBoundingClientRect(), ib = info.getBoundingClientRect();
      if (!eintragForm.hidden && feld.bottom > ib.bottom) info.scrollTop += ergebnis.querySelector(".le-punkte").getBoundingClientRect().top - ib.top - 6;
    });
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
    { id: "schubs", get text() { return `Schubs ${JAGD()} einmal um`; }, lohn: 25, ok: () => R.schubs >= 1 },
    { id: "see", text: "Lauf bis an den See", lohn: 30, ok: () => R.welt >= 2 },
    { id: "sterne60", text: "Sammle 60 Sterne in einer Runde", lohn: 40, ok: () => sternZahl >= 60 },
    { id: "herbst", text: "Lauf bis in den Herbstwald", lohn: 40, ok: () => R.welt >= 3 },
    { id: "laterne", text: "Lauf bis zum Laternenfest", lohn: 50, ok: () => R.welt >= 4 },
    { id: "winter", text: "Lauf bis ins Winterland", lohn: 60, ok: () => R.welt >= 5 },
    { id: "dschungel", text: "Lauf bis in den Dschungel", lohn: 70, ok: () => R.welt >= 6 },
    { id: "meter2500", text: "Lauf 2500 Meter", lohn: 80, ok: () => strecke >= 2500 },
    { id: "luftwelt", text: "Flieg in die Luftwelt", lohn: 100, ok: () => R.flug >= 1 },
    { id: "ringe10", text: "Flieg durch 10 Ringe in einer Runde", lohn: 60, ok: () => R.ringe >= 10 },
    { id: "tore15", text: "Fahr mit dem Schlitten durch 15 Tore", lohn: 60, ok: () => R.tore >= 15 },
  ];
  const aktiveAufgaben = () => {
    if (AUFGABEN.every(a => erledigt.includes(a.id))) { erledigt = []; schreib("froebelinchen-rennt-aufgaben", erledigt); }   // alle geschafft: von vorn
    return AUFGABEN.filter(a => !erledigt.includes(a.id)).slice(0, 3);
  };
  // pro Runde zählen nur die drei angezeigten Aufgaben (nachrückende kommen erst in der nächsten Runde dran)
  function aufgabenPruefen() {
    const neu = aktiveAufgaben().filter(a => a.ok());
    for (const a of neu) { erledigt.push(a.id); konto.sterne += a.lohn; }
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

  // ---------- Figurenwahl: Fröbelinchen oder Schildkröte Leo ----------
  const figurFeld = rahmen.querySelector(".lauf-figur");
  const figurKnoepfe = FIGUR_LISTE.map(f => {
    const k = document.createElement("button"); k.type = "button"; k.dataset.figur = f.id;
    k.innerHTML = `<span class="lf-bild" aria-hidden="true">${f.emoji}</span><span class="lf-name"></span>`;
    figurFeld.append(k); return k;
  });
  let bestaetigen = null;                             // Figur, die gerade auf „Kaufen?“ steht
  const figurHinweis = rahmen.querySelector(".fig-hinweis"), figurSterne = rahmen.querySelector(".fig-sterne");
  function figurKnoepfeZeigen() {
    figurSterne.textContent = `★ ${konto.sterne.toLocaleString("de-DE")}`;
    figurKnoepfe.forEach((k, i) => {
      const f = FIGUR_LISTE[i], offen = frei(f.id), hat = gekauft(f.id), kaufbar = offen && !hat;
      k.disabled = !offen; k.setAttribute("aria-pressed", String(f.id === figur));
      k.classList.toggle("kaufbar", kaufbar); k.classList.toggle("bestaetigen", kaufbar && bestaetigen === f.id);
      k.classList.toggle("zu-teuer", kaufbar && konto.sterne < f.preis);
      k.querySelector(".lf-name").textContent = !offen ? `🔒 Stufe ${f.stufe}` : !hat ? (bestaetigen === f.id ? "Kaufen?" : `${f.preis} ★`) : f.name;
      k.title = !offen ? `${f.name}: ab Fröbel-Stufe ${f.stufe}` : !hat ? `${f.name} für ${f.preis} Sterne freischalten` : f.name;
    });
  }
  // Tippen: gekaufte Figur wählen; freigeschaltete erst „Kaufen?“, beim zweiten Tippen kaufen
  function figurAntippen(id) {
    const f = figurDaten(id);
    if (gekauft(id)) { bestaetigen = null; figurHinweis.textContent = ""; figurWechseln(id); figurKnoepfeZeigen(); return; }
    if (konto.sterne < f.preis) {
      bestaetigen = null; figurHinweis.textContent = `${f.name} kostet ${f.preis} ★, dir fehlen noch ${f.preis - konto.sterne} ★.`; figurKnoepfeZeigen(); return;
    }
    if (bestaetigen !== id) { bestaetigen = id; figurHinweis.textContent = `${f.name} für ${f.preis} ★ freischalten? Nochmal tippen zum Kaufen.`; figurKnoepfeZeigen(); return; }
    konto.sterne -= f.preis; konto.figuren.push(id); schreib("froebelinchen-rennt-konto", konto);
    bestaetigen = null; T.rekord(); figurHinweis.textContent = `${f.emoji} ${f.name} gehört jetzt dir!`;
    figurWechseln(id); figurKnoepfeZeigen();
  }
  figurKnoepfeZeigen();
  // Fröbel-Stufe mit Balken; nach einer Runde füllt er sich von alt nach neu
  const stufeFeld = rahmen.querySelector(".lauf-stufe"), stufeBalken = stufeFeld.querySelector(".fs-balken i"), stufeNeu = stufeFeld.querySelector(".fs-neu");
  const tausend = (n) => Math.floor(n).toLocaleString("de-DE");
  function stufeZeigen(ep) {
    const st = stufeVon(ep), rest = ep - (st - 1) * EP_JE_STUFE;
    stufeFeld.querySelector(".fs-nr").textContent = st;
    stufeFeld.querySelector(".fs-ep").textContent = `${tausend(rest)} / ${tausend(EP_JE_STUFE)} Punkte`;
    stufeBalken.style.width = (rest / EP_JE_STUFE * 100).toFixed(1) + "%";
  }
  stufeZeigen(erfahrung);
  function stufeNachRunde(p) {
    const alt = erfahrung, altStufe = stufeVon(alt);
    erfahrung += p; schreib("froebelinchen-rennt-erfahrung", erfahrung);
    const neuStufe = stufeVon(erfahrung), texte = [];
    if (neuStufe > altStufe) {
      konto.sterne += 50 * (neuStufe - altStufe); schreib("froebelinchen-rennt-konto", konto);
      texte.push(`Fröbel-Stufe ${neuStufe} erreicht! +${50 * (neuStufe - altStufe)} ★`);
      for (const f of FIGUR_LISTE) if (f.stufe > altStufe && f.stufe <= neuStufe) texte.push(`${f.emoji} ${f.name} gibt es jetzt für ${f.preis} ★!`);
      // Balken erst voll laufen lassen, dann in der neuen Stufe von vorn
      stufeBalken.style.width = "100%";
      setTimeout(() => { stufeBalken.style.transition = "none"; stufeBalken.style.width = "0%"; void stufeBalken.offsetWidth; stufeBalken.style.transition = ""; stufeZeigen(erfahrung); }, 1250);
      T.rekord();
    } else { stufeZeigen(alt); requestAnimationFrame(() => stufeZeigen(erfahrung)); }
    stufeNeu.textContent = texte.join(" "); stufeNeu.hidden = !texte.length;
    figurKnoepfeZeigen();
  }
  function blasePassen(f) { blase.scale.setScalar(spieler.blaseS * f); blase.position.y = spieler.blaseY; }
  function figurWechseln(neu) {
    if (neu === figur || (zustand !== "start" && zustand !== "aus")) return;
    figur = neu; schreib("froebelinchen-rennt-figur", figur); figurKnoepfeZeigen();
    if (!spieler) return;                                   // 3D noch nicht geladen: wird beim Aufbau gebaut
    const alt = spieler.gruppe;
    spieler = W.figurBauen(figur);
    const eltern = alt.parent || szene;                     // im Ergebnis nach einem Flug sitzt die Figur im Flugzeug
    eltern.remove(alt); alt.remove(blase); eltern.add(spieler.gruppe);
    spieler.gruppe.add(blase); blasePassen(1);
    if (FL.an) {
      const [cy, cz, cs] = spieler.cockpit;
      spieler.gruppe.position.set(0, cy, cz); spieler.gruppe.scale.setScalar(cs); spieler.beine.forEach(b => { b.oben.visible = false; });
    } else { spieler.gruppe.position.copy(alt.position); spieler.gruppe.rotation.copy(alt.rotation); }
    W.ausstattungSetzen(spieler, konto.an);
    if (FL.an) FW.insCockpit(spieler, FL.art);
    if (anja.wer !== JAGD()) {                              // Anja gewählt (oder wieder abgewählt): Verfolgerin austauschen
      const altA = anja, el = altA.gruppe.parent || szene;
      anja = verfolgerBauen(); el.remove(altA.gruppe); el.add(anja.gruppe);
      anja.gruppe.position.copy(altA.gruppe.position); anja.gruppe.rotation.copy(altA.gruppe.rotation); anja.gruppe.visible = altA.gruppe.visible;
      anja.beine.forEach(b => { b.oben.visible = altA.beine[0].oben.visible; });
      if (FL.an) FW.insCockpit(anja, FL.art);
    }
    T.booster();
  }
  figurKnoepfe.forEach(k => k.addEventListener("click", async () => { if (k.disabled) return; await laden(); T.start(); figurAntippen(k.dataset.figur); }));

  // ---------- Sterne-Shop ----------
  // Vorschaubilder: eine eigene kleine Giraffe wird mit den Teilen fotografiert (eigener Renderer, nur solange der Laden offen ist)
  let foto = null;
  const miniBilder = {};
  function fotografieren(ids, art) {
    if (!foto) {
      const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      r.setSize(256, 256, false); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping;
      const sz = new THREE.Scene(), licht = new THREE.DirectionalLight("#fff3e0", 2.6);
      licht.position.set(2, 4, -3); sz.add(new THREE.HemisphereLight("#ffffff", "#c9a87a", 1.4), licht);
      foto = { r, sz, figuren: {}, kam: new THREE.PerspectiveCamera(30, 1, .05, 50) };
    }
    const { r, sz, kam } = foto;
    if (!foto.figuren[figur]) { const f = W.figurBauen(figur); sz.add(f.gruppe); foto.figuren[figur] = f; }
    for (const [k, f] of Object.entries(foto.figuren)) f.gruppe.visible = k === figur;
    const gir = foto.figuren[figur];
    W.ausstattungSetzen(gir, ids);
    sz.updateMatrixWorld(true);
    const z = new THREE.Vector3();
    const ks = gir.kopfSkala || 1, hs = gir.halsSkala || 1;   // große Köpfe: Kamera weiter weg
    if (art === "kopf") { gir.kopf.getWorldPosition(z); z.y += .08 * ks; kam.position.set(z.x + .62 * ks, z.y + .12 * ks, z.z - .92 * ks); }
    else if (art === "hals") { gir.hals.getWorldPosition(z); z.y += .2 * hs; z.z -= .2 * hs; kam.position.set(z.x + .75 * hs, z.y + .25 * hs, z.z - 1.05 * hs); }
    else if (art === "ruecken") { z.set(...gir.fotoRuecken[0]); kam.position.set(...gir.fotoRuecken[1]); }
    else { z.set(...gir.fotoGanz[0]); kam.position.set(...gir.fotoGanz[1]); }
    kam.lookAt(z);
    r.render(sz, kam);
    return r.domElement.toDataURL("image/png");
  }
  const fotoArt = (platz) => platz === "hals" ? "hals" : platz === "ruecken" ? "ruecken" : "kopf";
  let anprobe = null;
  function mitAnprobe() {               // getragene Teile plus das anprobierte (ersetzt das Teil am selben Platz)
    if (!anprobe) return konto.an;
    const p = W.AUSSTATTUNG[anprobe].platz;
    return [...konto.an.filter(x => W.AUSSTATTUNG[x].platz !== p), anprobe];
  }
  function shopZeigen() {
    shop.querySelector(".ls-bank b").textContent = konto.sterne;
    const ul = shop.querySelector(".ls-liste"); ul.replaceChildren();
    const teile = Object.entries(W.AUSSTATTUNG).sort((a, b) => a[1].preis - b[1].preis);
    shop.querySelector(".ls-bild").src = fotografieren(mitAnprobe(), "ganz");
    const a0 = anprobe && W.AUSSTATTUNG[anprobe];
    shop.querySelector(".ls-anprobe").textContent = a0
      ? (konto.besitz.includes(anprobe) ? `${a0.name}: gehört dir schon.` : `Anprobe: ${a0.name} für ${a0.preis} ★` + (konto.sterne < a0.preis ? ` (dir fehlen noch ${a0.preis - konto.sterne} ★)` : ""))
      : "Tipp ein Teil an, um es anzuprobieren.";
    for (const [id, a] of teile) {
      const li = document.createElement("li"), bild = document.createElement("img"), name = document.createElement("span"), k = document.createElement("button");
      const key = figur + ":" + id;
      if (!miniBilder[key]) miniBilder[key] = fotografieren([id], fotoArt(a.platz));
      bild.src = miniBilder[key]; bild.alt = ""; name.textContent = a.name;
      const hat = konto.besitz.includes(id), an = konto.an.includes(id);
      li.classList.toggle("traegt", an); li.classList.toggle("gewaehlt", anprobe === id);
      k.type = "button";
      k.textContent = hat ? (an ? "Ausziehen" : "Anziehen") : `${a.preis} ★`;
      k.classList.toggle("an", an);
      k.disabled = !hat && konto.sterne < a.preis;
      li.addEventListener("click", () => { anprobe = anprobe === id ? null : id; shopZeigen(); });
      k.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!konto.besitz.includes(id)) { if (konto.sterne < a.preis) return; konto.sterne -= a.preis; konto.besitz.push(id); T.booster(); }
        if (konto.an.includes(id)) konto.an = konto.an.filter(x => x !== id);
        else { konto.an = konto.an.filter(x => W.AUSSTATTUNG[x].platz !== a.platz); konto.an.push(id); }   // pro Platz nur ein Teil
        anprobe = null;
        schreib("froebelinchen-rennt-konto", konto);
        W.ausstattungSetzen(spieler, konto.an); if (FL.an) FW.insCockpit(spieler, FL.art); shopZeigen();
      });
      li.append(bild, name, k); ul.append(li);
    }
  }
  function ladenZu() {
    shop.hidden = true; anprobe = null; figurKnoepfeZeigen();
    if (foto) { foto.r.dispose(); foto.r.forceContextLoss(); foto = null; }   // die zweite 3D-Fläche wieder freigeben
  }
  $(".lauf-shop-knopf").addEventListener("click", async () => { await laden(); T.start(); shopZeigen(); shop.hidden = false; });
  $(".ls-zu").addEventListener("click", ladenZu);
  $(".ls-x").addEventListener("click", ladenZu);

  // ---------- Bestenliste ----------
  const ERLAUBT = /^[A-Za-zÄÖÜäöüßÀ-ÿ0-9 ._-]+$/;
  const SPERRE = ["arsch", "fick", "fotze", "hure", "nazi", "hitler", "wichs", "schlampe", "spast", "missgeburt", "fuck", "shit", "bitch", "cunt", "nigg", "porn"];
  let offeneRunde = null, meinEintrag = null, topDaten = { alle: [], woche: [] }, topReiter = "alle";
  const zeile = (rang, name, punkte, eigen) => {
    const li = document.createElement("li"); if (eigen) li.className = "eigen";
    for (const [k, t] of [["bl-rang", rang], ["bl-name", name], ["bl-punkte", punkte]]) {
      const sp = document.createElement("span"); sp.className = k; sp.textContent = t; li.append(sp);
    }
    return li;
  };
  function topZeigen() {
    let markiert = false;
    const liste = topDaten[topReiter];
    const bauen = () => liste.length
      ? liste.map((e, i) => {
          const eigen = !markiert && meinEintrag && e.name === meinEintrag.name && e.punkte === meinEintrag.punkte;
          if (eigen) markiert = true;
          return zeile(i + 1 + ".", e.name, e.punkte, eigen);
        })
      : [zeile("", topReiter === "woche" ? "Diese Woche noch keine Einträge. Lauf los!" : "Noch keine Einträge. Lauf los und trag dich als Erstes ein!", "", false)];
    topListe.replaceChildren(...bauen());
    markiert = false;
    if (seitenOl) { seitenOl.replaceChildren(...bauen()); seitenListe.hidden = false; }
    for (const k of document.querySelectorAll(".bl-reiter button")) k.setAttribute("aria-selected", k.dataset.reiter === topReiter);
    for (const p of document.querySelectorAll(".bl-woche-info")) p.hidden = topReiter !== "woche";
  }
  // Die Woche läuft von Montag 0 Uhr deutscher Zeit bis Sonntagnacht, egal wo das Gerät gerade steht
  const berlin = (d) => Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Berlin", weekday: "short", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", hourCycle: "h23" }).formatToParts(d).map(x => [x.type, x.value]));
  function wochenStart() {
    const p = berlin(new Date()), tag = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(p.weekday);
    const montag = Date.UTC(+p.year, +p.month - 1, +p.day - tag);
    return new Date(montag - berlin(new Date(montag)).hour * 3600000).toISOString();
  }
  const topHolen = async (filter) => {
    const r = await fetch(`${DB.url}/rest/v1/bestenliste?select=name,punkte&spiel=eq.rennt${filter}&order=punkte.desc,erstellt.asc&limit=10`,
                          { headers: { apikey: DB.key }, cache: "no-store" });
    if (!r.ok) throw new Error(r.status);
    return r.json();
  };
  async function bestenlisteLaden() {
    try {
      const [alle, woche] = await Promise.all([topHolen(""), topHolen(`&erstellt=gte.${wochenStart()}`)]);
      topDaten = { alle, woche }; topZeigen();
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
      const platzIn = (l) => l.findIndex(x => x.name === name && x.punkte === runde.punkte) + 1;
      const platz = platzIn(topDaten.alle), platzWoche = platzIn(topDaten.woche);
      eintragMeldung.textContent = platz ? `Eingetragen! All Time Platz ${platz}, diese Woche Platz ${platzWoche}.`
        : platzWoche ? `Eingetragen! Diese Woche bist du auf Platz ${platzWoche}.` : "Eingetragen! Für die Top 10 hat es diesmal nicht gereicht.";
      eintragForm.querySelector(".le-zeile").hidden = true; eintragForm.querySelector("label").hidden = true;
      if (platz || platzWoche) T.rekord();
    } catch (err) {
      offeneRunde = runde; fehler("Hat nicht geklappt: " + err.message);
    } finally { knopf.disabled = false; }
  });
  for (const k of document.querySelectorAll(".bl-reiter button")) k.addEventListener("click", () => { topReiter = k.dataset.reiter; topZeigen(); });
  $(".lauf-top-knopf").addEventListener("click", () => { bestenlisteLaden(); topFeld.hidden = false; });
  $(".lt-zu").addEventListener("click", () => { topFeld.hidden = true; });
  $(".lt-x").addEventListener("click", () => { topFeld.hidden = true; });
  // solange Laden oder Bestenliste offen sind: X, Pause und Ton des Spiels ausblenden (das X würde sonst das ganze Spiel schließen)
  // Chat: verbindet sich gleich beim Öffnen der Seite, damit man sieht, wer online ist und ob es Neues gibt
  const chatFeld = $(".lauf-chat"), chatKnopf = $(".lauf-chat-knopf");
  let chat = null;
  import("./lauf-chat.js?v=2").then(m => { chat = m.chatStarten({ db: DB, feld: chatFeld, knopf: chatKnopf }); }).catch(() => { chatKnopf.hidden = true; });
  chatKnopf.addEventListener("click", () => { if (chat) chat.oeffnen(); });
  $(".lc-x").addEventListener("click", () => { if (chat) chat.schliessen(); else chatFeld.hidden = true; });
  const panelBeobachter = new MutationObserver(() => rahmen.classList.toggle("panel-offen", !shop.hidden || !topFeld.hidden || !chatFeld.hidden));
  for (const el of [shop, topFeld, chatFeld]) panelBeobachter.observe(el, { attributes: true, attributeFilter: ["hidden"] });
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
    if (!A.nah) { meldung(`Achtung, ${JAGD()} kommt!`, (FL.an ? wahl(ANJA_FLUG) : wahl(ANJA_RUFE)).replace("Fröbelinchen", NAME())); T.anja(); }
    A.nah = true; A.zeit = dauer;
  }
  // Kombo: jedes eingesammelte Törtchen (bzw. jeder Stern) ohne Stolpern zählt mit; alle 10 steigt der Faktor, bis ×5
  const komboFaktor = () => Math.min(5, 1 + Math.floor(R.kombo / 10));
  function kombo() {
    const vorher = komboFaktor(); R.kombo++;
    const jetzt = komboFaktor();
    if (jetzt > vorher) { T.booster(); hud.classList.remove("kombo"); void hud.offsetWidth; hud.classList.add("kombo"); }
    return jetzt;
  }
  function komboWeg() { R.kombo = 0; }
  function stolpern() {
    komboWeg();
    if (R.anjaPhase || (A.nah && A.abstand < 7)) { verlieren(`${JAGD()} hat dich erwischt!`, "anja"); return; }
    S.stolper = .5; tempo = Math.max(START_TEMPO, tempo * .85);
    wackeln = .35; T.stolpern(); if (navigator.vibrate) navigator.vibrate(40);
    anjaKommt(6);
  }
  const BOOSTER_FUNKEN = { schild: "#6ec6ff", schubs: "#ff7aa2", magnet: "#ff6b6b", doppelt: "#c58cff" };
  // Booster in Luft und Wasser: Schild am häufigsten (Schubsen geht nur zu Fuß)
  const flugBooster = () => Math.random() < .325 ? "schild" : wahl(["magnet", "doppelt"]);
  function boosterNehmen(typ) {
    R.booster++; T.booster();
    if (typ === "schild") { B.schild = 7; meldung("Schutzschild!", "7 Sekunden unverwundbar"); }
    else if (typ === "magnet") { B.magnet = 8; meldung("Sterne-Magnet!", "Alle Sterne fliegen zu dir"); }
    else if (typ === "doppelt") { B.doppelt = 10; meldung("Doppelte Punkte!", "10 Sekunden lang alles ×2"); }
    else if (!B.schubs) { B.schubs = { t: 0, umfallen: 0, getroffen: false }; A.nah = true; A.zeit = 99; meldung("Schubs-Booster!", `Hol sie dir, ${NAME()}!`); }
  }

  // Eine Frau mit schwarzen Haaren rennt Fröbelinchen auf ihrer Spur entgegen und sucht ihre Autoschlüssel: ausweichen!
  function frauKommt(ab) {
    let zab = ab, s = S.s + 42;
    if (s > ab.L - 10) { zab = abschnitte.find(a => a.nr === S.idx + 1); s = 18; }
    if (!zab || s > zab.L - 8) return false;
    const sp = Math.max(-1, Math.min(1, Math.round(S.x / SPUR)));
    const f = W.frauBauen(), blase = W.sprechblase(["Ich suche meine", "Autoschlüssel!"]);
    blase.position.set(0, 2.95, 0); f.gruppe.add(blase); f.blase = blase;
    const [x, z] = punkt(zab, s, sp * SPUR);
    f.gruppe.position.set(x, 0, z); f.gruppe.rotation.y = -zab.h * Math.PI / 2 + Math.PI;   // schaut Fröbelinchen an
    zab.gruppe.add(f.gruppe);
    hindernisse.push({ nr: zab.nr, ab: zab, s, typ: "frau", art: "frau", hoehe: 9, tiefe: .5, spuren: [sp], mesh: f.gruppe, frau: f,
      bew: { vs: 4.5, weg: 0, max: 70 }, getroffen: false });
    return true;
  }
  // Rekord-Fahne: steht ungefähr dort, wo man den alten Rekord einholt; beim Überholen gibt es Jubel und Konfetti
  function fahneAufstellen(ab, meter) {
    let zab = ab, s = S.s + meter;
    if (s > ab.L - 1) { zab = abschnitte.find(a => a.nr === S.idx + 1); s = Math.max(3, s - ab.L); }
    if (!zab || s > zab.L - 1) return;
    const f = W.rekordFahne(rekord), [x, z] = punkt(zab, s, H - .15);
    f.position.set(x, 0, z); f.rotation.y = -zab.h * Math.PI / 2;   // Tuch weht nach außen über die Hecke, lesbar für die Läuferin
    zab.gruppe.add(f); fahne = f; fahneOrt = { nr: zab.nr, s };
  }
  let fahne = null, fahneOrt = null;
  // ab 40.000 Punkten: Anja bleibt dicht dran, ab jetzt zählt jeder Schritt
  function anjaPhasePruefen() {
    if (R.anjaPhase || punkte < ANJA_PHASE) return;
    R.anjaPhase = true; B.ruhe = 0; B.schubs = null; T.anja();
    meldung(`${JAGD()} ist dir auf den Fersen!`, "Ab jetzt beendet jeder Stolperer die Runde");
  }
  // neue Tempo-Stufe erreicht: kurz ankündigen
  function tempoPruefen() {
    const f = tempoFaktor();
    if (f <= R.tempoF) return;
    R.tempoF = f; T.booster(); wackeln = Math.max(wackeln, .25);
    if (R.anjaPhase && f === TEMPO_STUFEN[0][1]) return;   // bei 40.000 zeigt die Anja-Meldung, was jetzt gilt
    meldung("Noch schneller!", `${TEMPO_STUFEN.find(t => t[1] === f)[0].toLocaleString("de-DE")} Punkte · Tempo ×${String(f).replace(".", ",")}`);
  }
  function rekordPruefen() {
    if (R.jubel || rekord <= 0 || punkte <= rekord) return;
    // steht eine Fahne am Weg, wird erst beim Vorbeilaufen gejubelt (Törtchen bringen einen manchmal etwas früher über den Rekord)
    if (fahneOrt && !FL.an && fahne && fahne.parent && !(S.idx > fahneOrt.nr || (S.idx === fahneOrt.nr && S.s >= fahneOrt.s))) return;
    R.jubel = true; T.rekord(); meldung("Neuer Rekord!", "Du bist weiter als je zuvor!");
    const wo = spieler.gruppe.getWorldPosition(new THREE.Vector3()); wo.y += 1.5;
    for (const farbe of ["#ffd54a", "#3baa35", "#ff7aa2", "#6ec6ff", "#a8c700"]) funkeln(wo, farbe, 10);
  }
  function funkeln(wo, farbe, n) {
    if (n >= 8 && qualitaet < 3) {                       // Lichtring bei allem, was man einsammelt
      const b = teilchenHolen("blitz", farbe); b.position.copy(wo); b.scale.setScalar(.25); szene.add(b);
      teilchen.push({ k: b, v: new THREE.Vector3(), t: 0, dauer: .36, wachsen: 3.4, alpha: .95 });
    }
    if (qualitaet < 2) n = Math.round(n * 1.5);
    for (let i = 0; i < n; i++) {
      const f = teilchenHolen("funke", farbe); f.position.copy(wo); f.scale.setScalar(zufall(.15, .3)); szene.add(f);
      const w = Math.random() * Math.PI * 2, h = zufall(1.5, 4);
      teilchen.push({ k: f, v: new THREE.Vector3(Math.cos(w) * zufall(1, 3), h, Math.sin(w) * zufall(1, 3)), t: 0, dauer: zufall(.4, .7), schwer: 8 });
    }
  }

  function hudZeigen() {
    let t = `${Math.floor(punkte)} Punkte · ★ ${sternZahl}`;
    if (komboFaktor() > 1) t += ` · 🔥×${komboFaktor()}`;
    if (FL.an) t += FL.art === "schlitten" ? ` · 🛷 ${tempoKmh()} km/h` + (handy ? "" : ` · ${Math.max(0, Math.ceil(FL.dauer - FL.zeit))} s`) : ` · ✈ ${Math.max(0, Math.ceil(FL.dauer - FL.zeit))} s`;
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
      const art = vor.art === "hoch" ? "runter" : vor.art === "block" || vor.art === "frau" ? "seite" : vor.art === "eis" ? null : "hoch";
      if (art)
      if (!tipps.has(art)) { tipps.add(art); meldung("Tipp", T_TEXT[art]); }
    }
    if (ab.L - S.s < 15 && !tipps.has("ecke" + ab.nr) && tipps.size < 6) { tipps.add("ecke" + ab.nr); meldung("Tipp", T_TEXT.ecke(ab.dreh)); }
  }

  // Schubser: Anja holt auf, Fröbelinchen dreht sich um, stupst sie mit dem Kopf um und läuft weiter
  function schubsSchritt(dt, v) {
    const sc = B.schubs; sc.t += dt;
    if (sc.t < .8) { A.abstand += (2.2 - A.abstand) * Math.min(1, dt * 6); return; }
    if (!sc.getroffen) { sc.getroffen = true; R.schubs++; T.schubs(); meldung("Schubs!", `${JAGD()} plumpst hin · 10 s Ruhe`); }
    sc.umfallen = Math.min(1, sc.umfallen + dt * 3);
    A.abstand += v * dt;                               // sie bleibt liegen, Fröbelinchen läuft davon
    if (sc.t > 1.6 && A.abstand > 16) {
      B.schubs = null; B.ruhe = 10; A.nah = false; A.zeit = 0; A.bis = 10 + zufall(5, 10);
    }
  }

  // ---------- Spielschritt ----------
  function schritt(dt) {
    if (DU.an) { duellSchritt(dt); return; }
    if (FO.an) { folieSchritt(dt); return; }
    if (BU.an) { bueroSchritt(dt); return; }
    if (FL.an) { flugSchritt(dt); return; }
    // die Tempokurve zählt nur die Zeit zu Fuß: nach Flug, Boot oder Kissenschlacht geht es im alten Tempo weiter
    const tempoZiel = START_TEMPO + (MAX_TEMPO - START_TEMPO) * (1 - Math.exp(-R.laufZeit / 130));
    tempo = tempo < tempoZiel ? Math.min(tempoZiel, tempo + dt * 1.5) : tempoZiel;   // nach dem Stolpern wieder hochlaufen
    R.zeit += dt; R.laufZeit += dt;
    anjaPhasePruefen();
    tempoPruefen();
    const v = tempo * tempoFaktor() * (S.stolper > 0 ? .6 : 1);
    for (const k of ["schild", "ruhe", "magnet", "doppelt"]) B[k] = Math.max(0, B[k] - dt);
    const faktor = B.doppelt > 0 ? 2 : 1;
    const unverwundbar = B.schild > 0 || !!B.schubs || FL.abflug > 0 || FL.rueck > 0;
    S.s += v * dt; strecke += v * dt; punkte += v * dt * faktor;
    S.stolper = Math.max(0, S.stolper - dt);
    // im Winterland geht es nach ein paar Sekunden auf den Schlitten (einmal pro Besuch, nicht kurz vor einer anderen Sonderphase)
    if (!FL.abflug && FL.schlittenBei && punkte >= FL.schlittenBei) {
      FL.schlittenBei = 0;
      if (FL.ab - punkte > 500) { FL.abflug = .001; FL.sonder = "schlitten"; T.abflug(); meldung("Schlittenfahrt!", `${NAME()} springt auf den Schlitten …`); }
    }
    // 3000 Punkte: weiß überblenden, dann geht es im Flugzeug weiter (Level 2)
    if (!FL.abflug && punkte >= FL.ab) { FL.abflug = .001; T.abflug(); meldung(`${FL.ab} Punkte!`, FL.naechsteArt === "folie" ? "Rolle bereit: Fröbelinchen wird eingepackt!" : FL.naechsteArt === "buero" ? "Wo ist Fröbelinchen? Anke weiß es …" : FL.naechsteArt === "duell" ? `${JAGD()} fordert ${NAME()} zur Kissenschlacht heraus!` : FL.naechsteArt === "wasser" ? `${NAME()} springt ins Boot …` : `${NAME()} steigt ins Flugzeug …`); }
    if (FL.abflug) {
      FL.abflug += dt; blende.style.opacity = Math.min(1, FL.abflug / .9);
      if (FL.abflug >= .9) { if (FL.sonder) { FL.sonder = null; flugStart("schlitten"); } else if (FL.naechsteArt === "folie") folieStart(); else if (FL.naechsteArt === "buero") bueroStart(); else if (FL.naechsteArt === "duell") duellStart(); else flugStart(); return; }
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
    if (!R.fahne) fahneOrt = null;
    if (!R.fahne && rekord > 0 && punkte < rekord && rekord - punkte < 60 * (B.doppelt > 0 ? 2 : 1)) { R.fahne = true; fahneAufstellen(ab, (rekord - punkte) / (B.doppelt > 0 ? 2 : 1)); }
    rekordPruefen();
    if (R.zeit >= R.frauBei && !B.schubs) R.frauBei = frauKommt(ab) ? Infinity : R.zeit + 2;   // nur einmal pro Runde (kein Platz: gleich nochmal versuchen)

    // Bewegte Hindernisse: rollen auf Fröbelinchen zu oder laufen quer über den Weg, sobald sie in Sicht kommen
    for (const h of hindernisse) {
      if (!h.bew || h.nr !== S.idx || h.s - S.s > 30 || h.s < S.s - 5) continue;
      if (h.bew.vs && h.bew.weg < h.bew.max) {
        const d = h.bew.vs * dt; h.s -= d; h.bew.weg += d;
        if (h.mesh.userData.rolle) h.mesh.userData.rolle.rotation.x += d / h.mesh.userData.radius;
        if (h.frau) h.frau.laeuft = true;
      }
      if (h.bew.vx) {
        h.bew.x += h.bew.vx * dt; if (Math.abs(h.bew.x) > H - .3) h.bew.vx *= -1;
        // echte Ausdehnung quer zum Weg: Mama Ente vorn, die Küken laufen bis gut 1 m hinterher
        const vor = h.typ === "enten" ? .4 : .3, hinter = h.typ === "enten" ? 1.15 : .3, r = Math.sign(h.bew.vx);
        h.bew.von = Math.min(h.bew.x + r * vor, h.bew.x - r * hinter); h.bew.bis = Math.max(h.bew.x + r * vor, h.bew.x - r * hinter);
        h.spuren = [...new Set([Math.round(h.bew.von / SPUR), Math.round(h.bew.bis / SPUR)])].filter(x => x >= -1 && x <= 1);
        h.mesh.rotation.y = -h.ab.h * Math.PI / 2 + (h.bew.vx > 0 ? -Math.PI / 2 : Math.PI / 2);
      }
      const [hx, hz] = punkt(h.ab, h.s, h.bew.vx ? h.bew.x : h.spuren[0] * SPUR);
      h.mesh.position.x = hx; h.mesh.position.z = hz;
    }

    // Zusammenstöße
    for (const h of hindernisse) {
      if (h.getroffen || h.nr !== S.idx || Math.abs(h.s - S.s) > h.tiefe) continue;
      const spur = Math.round(S.x / SPUR);
      if (h.bew && h.bew.von !== undefined) { if (S.x < h.bew.von - .3 || S.x > h.bew.bis + .3) continue; }   // Tiere quer: nach echter Lage, nicht nach Spur
      else if (!h.spuren.includes(spur)) continue;
      if (h.art === "eis") {
        h.getroffen = true; S.eis = 1.5; T.spur();
        if (!tipps.has("eis")) { tipps.add("eis"); meldung("Glatteis!", "Lenken geht kurz langsamer"); }
        continue;
      }
      if (RE.schutz > 0 || (unverwundbar && !(R.anjaPhase && h.art !== "block"))) continue;   // in der Anja-Phase schützt das Schild nur vor Bauklötzen
      if (h.art === "frau") {                          // umgerannt: Fröbelinchen stolpert, die Frau ruft hinterher
        h.getroffen = true; stolpern(); if (zustand !== "laeuft") return;
        meldung("Huch, Zusammenstoß!", "„Hast du meine Schlüssel gesehen?“"); continue;
      }
      if (h.art === "block") { h.getroffen = true; verlieren(h.typ === "heuballen" ? "Uff, ein Heuballen! Weich ihm aus." : "Bumm, Bauklötze! Wechsel die Spur.", "kloetze"); return; }
      const trifft = h.art === "hoch" ? S.duck <= 0 : S.y < h.hoehe;
      if (trifft) { h.getroffen = true; stolpern(); if (zustand !== "laeuft") return; }
    }
    // Sterne: hohe Sterne gibt es nur im Sprung, mit Magnet fliegen alle Sterne vor einem heran
    const einsammeln = (st) => {
      st.weg = true; st.mesh.visible = false; sternZahl++; punkte += 10 * faktor * kombo(); funkeln(st.mesh.position, "#ffb3d1", 8);
      T.stern(sternZahl); GE.freude = .35; hud.classList.remove("hupf"); void hud.offsetWidth; hud.classList.add("hupf");
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
      funkeln(bo.mesh.position, BOOSTER_FUNKEN[bo.typ], 18);
    }

    // Anja: kommt am Anfang nach 5 s, danach alle 15–22 s, und wenn man stolpert; ihre Schritte werden lauter, je näher sie ist
    if (B.schubs) { schubsSchritt(dt, v); hudZeigen(); return; }
    A.bis -= dt;
    if (!A.nah && A.bis <= 0) anjaKommt(5);
    if (R.anjaPhase) { A.nah = true; A.zeit = 99; }
    if (A.nah) { A.zeit -= dt; if (A.zeit <= 0) { A.nah = false; A.bis = zufall(15, 22) - schwerStufe() * 2.5; } }
    A.abstand += ((A.nah ? 3.4 : 18) - A.abstand) * Math.min(1, dt * (A.nah ? 1.6 + schwerStufe() * .25 : .5));
    if (A.abstand < 12 && (A.schritt -= dt) <= 0) { A.schritt = .28; T.schritt(Math.max(0, 1 - A.abstand / 12)); }
    hudZeigen();
  }

  // Schlussszene (ca. 1,6 s): Anja holt Fröbelinchen ein und umarmt sie, oder Fröbelinchen prallt ab
  function schlussSchritt(dt) {
    const sz = schlussSzene; sz.t += dt;
    if (sz.art === "anja") A.abstand += (1 - A.abstand) * Math.min(1, dt * 5);
    else spieler.koerper.rotation.z = Math.min(.5, sz.t * 1.5) * (S.spur >= 0 ? 1 : -1);
    if (sz.t > 1.6 && !weiterAnbieten(sz)) ende(sz.grund);
  }
  // Weiterspielen für Sterne: einmal pro Runde, kurze Bedenkzeit, die Knöpfe sind zuerst gesperrt (gegen versehentliches Tippen)
  const WEITER_PREIS = 5000, WEITER_ZEIT = 8, WEITER_SPERRE = .7, WEITER_SCHUTZ = 4;
  const RE = { genutzt: false, zeit: 0, sperre: 0, schutz: 0, szene: null };
  const weiterKnoepfe = [$(".lw-ja"), $(".lw-nein")];
  function weiterAnbieten(sz) {
    if (RE.genutzt || konto.sterne + sternZahl < WEITER_PREIS) return false;
    zustand = "rettung"; RE.zeit = WEITER_ZEIT; RE.sperre = WEITER_SPERRE; RE.szene = sz;
    T.verlorenStop();
    weiterFeld.querySelector(".lw-grund").textContent = sz.grund;
    weiterFeld.querySelector(".lw-konto").textContent = `Du hast ${(konto.sterne + sternZahl).toLocaleString("de-DE")} ★`;
    weiterKnoepfe.forEach(k => { k.disabled = true; });
    weiterFeld.hidden = false;
    return true;
  }
  function weiterSchritt(echt) {
    const d = Math.min(.1, echt);
    if (RE.sperre > 0 && (RE.sperre -= d) <= 0) weiterKnoepfe.forEach(k => { k.disabled = false; });
    RE.zeit -= d;
    weiterFeld.querySelector(".lw-zeit i").style.transform = `scaleX(${Math.max(0, RE.zeit / WEITER_ZEIT)})`;
    if (RE.zeit <= 0) weiterAblehnen();
  }
  function weiterAblehnen() {
    if (zustand !== "rettung") return;
    const sz = RE.szene; weiterFeld.hidden = true; RE.szene = null;
    T.verloren(); ende(sz.grund);
  }
  function weiterSpielen() {
    if (zustand !== "rettung" || RE.sperre > 0 || konto.sterne + sternZahl < WEITER_PREIS) return;
    const sz = RE.szene;                                // bezahlt wird zuerst vom Konto, der Rest aus den Sternen dieser Runde
    const vomKonto = Math.min(konto.sterne, WEITER_PREIS); konto.sterne -= vomKonto; sternZahl -= WEITER_PREIS - vomKonto; schreib("froebelinchen-rennt-konto", konto);
    RE.genutzt = true; RE.szene = null; RE.schutz = WEITER_SCHUTZ; weiterFeld.hidden = true;
    zustand = "laeuft"; schlussSzene = null; uhr.getDelta();
    B.schild = Math.max(B.schild, WEITER_SCHUTZ); A.nah = false; A.zeit = 0; A.abstand = FL.an ? 22 : 18; A.bis = 12;
    spieler.koerper.rotation.set(0, 0, 0); FL.trudeln = 0; wackeln = 0;
    if (sz.art === "hecke") S.abbiegen = abschnitte.find(a => a.nr === S.idx).dreh;   // sonst stünde sie gleich wieder vor der Hecke
    if (sz.art === "duell") { DU.ende = .6; DU.sieg = false; }                       // die Kissenschlacht ist damit vorbei, es geht zurück in die Laufwelt
    T.musik(FL.an ? flugMusik() : zoneMusik()); hudZeigen();
    meldung("Weiter geht's!", `${WEITER_SCHUTZ} Sekunden geschützt · noch ${(konto.sterne + sternZahl).toLocaleString("de-DE")} ★`);
  }
  weiterKnoepfe[0].addEventListener("click", weiterSpielen);
  weiterKnoepfe[1].addEventListener("click", () => { if (RE.sperre <= 0) weiterAblehnen(); });

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
  const bildVersatz = { x: 0, y: 0 };
  const winkel = (a, b, k) => a + (((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI) * k;
  function bild() {
    const echt = uhr.getDelta(), dt = Math.min(.05, echt);
    if (T) T.fahrt(zustand === "laeuft" && FL.an && !FL.landung ? FL.art : null, FL.v / 30);   // Pause, Verlieren und Landen blenden es von selbst aus
    if (zustand === "pause") { zeichnen(); return; }
    if (zustand === "rettung") { weiterSchritt(echt); zeichnen(); return; }
    if (RE.schutz > 0) RE.schutz = Math.max(0, RE.schutz - dt);
    if (zustand === "laeuft") { schritt(dt); leistungMessen(echt); }
    else if (zustand === "fang") schlussSchritt(dt);
    if (DU.an) { duellBild(dt); return; }
    if (FO.an) { folieBild(dt); return; }
    if (BU.an) { bueroBild(dt); return; }
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
    if (lauft) S.lauf += dt * tempo * tempoFaktor() * (A.nah ? 1.5 : 1.1);
    if (spieler.mensch) {                  // Anja als Figur: läuft wie eine Läuferin, die Arme schwingen gegengleich
      spieler.beine.forEach((b, i) => {
        if (S.y > 0) { b.oben.rotation.x = i ? -.4 : .9; b.unten.rotation.x = i ? -.3 : -1.3; return; }
        if (S.duck > 0) { b.oben.rotation.x = .9; b.unten.rotation.x = -1.5; return; }
        const ph = S.lauf + i * Math.PI;
        b.oben.rotation.x = Math.sin(ph) * .75; b.unten.rotation.x = -Math.max(0, Math.sin(ph + 1.6)) * 1.35;
      });
      const stoss = B.schubs && B.schubs.t > .55 && B.schubs.t < 1.15 ? Math.sin((B.schubs.t - .55) / .6 * Math.PI) : 0;   // beim Schubsen beide Arme nach vorn
      spieler.arme.forEach((a, i) => {
        const ph = S.lauf + i * Math.PI;
        a.oben.rotation.z = 0; a.unten.rotation.z = 0;
        a.oben.rotation.x = -Math.sin(ph) * .7 * (1 - stoss) + stoss * 1.5; a.unten.rotation.x = 1.1 * (1 - stoss) + Math.sin(ph) * .25;
      });
      spieler.koerper.rotation.x = S.duck > 0 ? .35 : -.06;
    } else spieler.beine.forEach((b, i) => {      // diagonal gleiche Beine, Knie knicken nach hinten
      const ph = S.lauf + (i === 0 || i === 3 ? 0 : Math.PI), vorn = i < 2;
      if (S.y > 0) { b.oben.rotation.x = vorn ? .6 : -.5; b.unten.rotation.x = vorn ? -1.2 : -.5; return; }
      b.oben.rotation.x = Math.sin(ph) * .55;
      b.unten.rotation.x = -Math.max(0, Math.sin(ph + 1.5)) * .95;
    });
    spieler.koerper.position.y = S.y > 0 ? 0 : Math.abs(Math.sin(S.lauf)) * .04;
    const kopfnuss = B.schubs && B.schubs.t > .7 && B.schubs.t < 1.1 ? -Math.sin((B.schubs.t - .7) / .4 * Math.PI) * .9 : 0;
    spieler.hals.rotation.x = S.duck > 0 ? (spieler.mensch ? -.3 : -1.15) : (S.stolper > 0 ? Math.sin(S.stolper * 30) * .3 : kopfnuss);
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
    spieler.hals.rotation.x += GE.freude * .4;           // Kopf kurz hoch vor Freude
    gesicht(dt, lauft ? 1 : .3);
    // Startbild und Ergebnis: sie steht, winkt mit dem Vorderbein und die Kamera schwenkt um sie herum
    const leerlauf = zustand === "start" || zustand === "aus";
    if (leerlauf) {
      const t = performance.now() / 1000;
      spieler.beine.forEach((b, i) => { b.oben.rotation.x = 0; b.unten.rotation.x = 0; });
      if (spieler.mensch) {                             // Anja winkt mit dem linken Arm (arme[0] sitzt links von ihr aus gesehen)
        spieler.koerper.rotation.x = 0;
        spieler.arme.forEach(a => { a.oben.rotation.set(0, 0, 0); a.unten.rotation.set(.15, 0, 0); });
        spieler.arme[0].oben.rotation.z = -2.6 - Math.sin(t * 7) * .3; spieler.arme[0].unten.rotation.z = -.4;
      } else { spieler.beine[1].oben.rotation.x = 1.05 + Math.sin(t * 7) * .3; spieler.beine[1].unten.rotation.x = -1.1; }   // Vorderbein nach vorn heben, damit man das Winken sieht
      spieler.hals.rotation.x = Math.sin(t * 1.3) * .08; spieler.koerper.position.y = 0; spieler.koerper.rotation.z = 0;
      spieler.schwanz.rotation.z = Math.sin(t * 6) * .45;
      g.scale.set(1, 1, 1);
    }

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
    if (leerlauf) anja.gruppe.visible = false;
    // weiche Schatten direkt unter den Füßen; beim Springen kleiner und heller
    schattenF.visible = true; schattenF.position.set(g.position.x, .035, g.position.z); schattenF.rotation.y = g.rotation.y;
    schattenF.scale.setScalar(1 / (1 + S.y * .5)); schattenF.material.opacity = 1 / (1 + S.y * .8);
    schattenA.visible = anja.gruppe.visible && !fall; schattenA.position.set(ax, .035, az);

    const tz0 = performance.now() / 1000;
    for (const st of sterne) {
      st.mesh.rotation.y += dt * 3;
      if (!st.zieht) st.mesh.position.y = st.h + Math.sin(tz0 * 4 + st.s) * .09;   // Törtchen schweben auf und ab, Bälle liegen am Boden
      if (st.zieht && !st.weg) st.mesh.position.lerp(new THREE.Vector3(g.position.x, g.position.y + 1, g.position.z), Math.min(1, dt * 9));
    }
    const tz = performance.now() / 1000;
    if (fahne && fahne.parent) { const tu = fahne.userData.tuch; tu.rotation.y = Math.sin(tz * 3) * .25; tu.position.y = 3.1 + Math.sin(tz * 5) * .03; }
    for (const h of hindernisse) {                    // die Frau rennt mit schwingenden Armen und Beinen
      const f = h.frau; if (!f) continue;
      const ph = f.laeuft ? tz * 10 : 0;
      f.beine.forEach((b, i) => { b.oben.rotation.x = Math.sin(ph + i * Math.PI) * .7; b.unten.rotation.x = -Math.max(0, Math.sin(ph + i * Math.PI + 1.6)) * 1.2; });
      f.arme.forEach((a, i) => { a.oben.rotation.x = -Math.sin(ph + i * Math.PI) * .6; a.unten.rotation.x = 1.1; });
      f.k.rotation.x = -.1; f.k.position.y = Math.abs(Math.sin(ph)) * .05;
      f.blase.position.y = 2.95 + Math.sin(tz * 3) * .06;
      f.zopf.rotation.x = .12 + Math.sin(ph * 2) * .1;    // die Haare schwingen beim Rennen
    }
    for (const h of hindernisse) {                    // Huhn und Enten watscheln
      const hp = h.mesh && h.mesh.userData.huepf; if (!hp) continue;
      (Array.isArray(hp) ? hp : [hp]).forEach((k, i) => { k.position.y = Math.abs(Math.sin(tz * 11 + i)) * .06; k.rotation.z = Math.sin(tz * 11 + i) * .12; });
    }
    for (const h of hindernisse) {                    // Affen werfen ihre Banane, sobald Fröbelinchen näher kommt
      if (h.typ !== "affe" || !h.mesh) continue;
      const u = h.mesh.userData;
      u.affe.position.y = u.affeY + Math.abs(Math.sin(tz * 6 + h.s)) * .05;
      if (u.wurf < 0) { if (h.nr === S.idx && h.s - S.s < 20) { u.wurf = 0; T.spur(); } else continue; }
      if (u.wurf < 1) {
        u.wurf = Math.min(1, u.wurf + dt / .6); const w = u.wurf;
        u.banane.visible = true;
        u.banane.position.set(u.start.x * (1 - w), u.start.y * (1 - w) + Math.sin(w * Math.PI) * 1.4, 0);
        u.banane.rotation.set(0, 0, w < 1 ? w * 14 : 0);
        u.arm.rotation.x = -2.6 + Math.min(1, w * 2.5) * 2.4;
      }
    }
    for (const bo of booster) { bo.mesh.userData.innen.rotation.y += dt * 3; bo.mesh.position.y = 1.05 + Math.sin(performance.now() / 300 + bo.s) * .1; }
    const tempoRun = zustand === "laeuft" ? .12 + (tempoFaktor() - 1) / .2 * .68 : 0; tempoZiel = tempoRun;
    kamera.fov += (((kamera.aspect < .8 ? 72 : 62) + tempoRun * 5) - kamera.fov) * Math.min(1, dt * 3); kamera.updateProjectionMatrix();
    W.bodenFolgen(px, pz);   // Bodenmuster bleibt am Ort, obwohl die Fläche mitwandert
    // neue Welt erreicht: Boden, Farben, Wetter und Musik wechseln, Namen einblenden
    if (ab.zone !== aktZone) {
      aktZone = ab.zone; W.zoneWechsel(aktZone); stimmungSetzen(); R.welt = Math.max(R.welt, Math.floor(S.idx / 3));
      if (lauft) { T.welt(); T.musik(zoneMusik()); if (!B.schubs) meldung(W.zonen[aktZone].name, W.zonen[aktZone].unter); }
      if (lauft && aktZone === WINTER()) FL.schlittenBei = punkte + 120;
    }
    const zeit = performance.now() / 1000;
    W.zoneSchritt(dt); W.animieren(zeit); lichtSchritt(dt);
    schattenNachfuehren(px, pz);

    // Kamera schräg hinter Fröbelinchen, dreht beim Abbiegen weich mit; bei der Fang-Szene langsam herum
    if (fang) kamYaw += dt * .9;
    else kamYaw = kamPos ? winkel(kamYaw, yaw, Math.min(1, dt * 5)) : yaw;
    const sin = Math.sin(kamYaw), cos = Math.cos(kamYaw);
    const hoch = kamera.aspect < .8;   // Handy hochkant: höher und steiler, sonst ist oben nur Himmel
    const kurve = fang ? 0 : Math.min(1, Math.abs(Math.atan2(Math.sin(yaw - kamYaw), Math.cos(yaw - kamYaw))) / (Math.PI / 2));
    const abst = (hoch ? 7.5 : 7) - kurve * 3.2, kh = (hoch ? 6.2 : 4.6) + kurve * 1.6;   // in Kurven näher und höher: nicht durch die Hecke
    let ziel2 = new THREE.Vector3(px + sin * abst, kh, pz + cos * abst);
    if (leerlauf) {                                     // langsamer Schwenk vor ihr hin und her
      const w = yaw + Math.sin(performance.now() / 4000) * .45, r = hoch ? 5.6 : 4.6;   // vor ihr, innerhalb der Hecken
      const kl = spieler.blick < 1;                       // Leo ist kleiner: Kamera näher und tiefer
      ziel2 = new THREE.Vector3(px - Math.sin(w) * r * (kl ? .8 : 1), (hoch ? 2.4 : 2) * (kl ? .7 : 1), pz - Math.cos(w) * r * (kl ? .8 : 1));
    }
    if (!kamPos) kamPos = ziel2.clone(); else kamPos.lerp(ziel2, Math.min(1, dt * (leerlauf ? 2.5 : 8)));
    kamera.position.copy(kamPos);
    if (wackeln > 0) { wackeln = Math.max(0, wackeln - dt); kamera.position.x += (Math.random() - .5) * wackeln * .6; kamera.position.y += (Math.random() - .5) * wackeln * .4; }
    if (leerlauf) kamera.lookAt(px, spieler.blick, pz);
    // Karte rechts (breit) bzw. unten (hochkant): Bildausschnitt so verschieben, dass die Figur daneben bzw. darüber steht
    const karteDa = leerlauf && !ueber.hidden, breit = kamera.aspect > 1.25;
    bildVersatz.x += ((karteDa && breit ? 23 : 0) - bildVersatz.x) * Math.min(1, dt * 5);
    bildVersatz.y += ((karteDa && hoch ? 30 : 0) - bildVersatz.y) * Math.min(1, dt * 5);
    const bw = huelle.clientWidth || 1, bh = huelle.clientHeight || 1;   // volle Bildgröße angeben, sonst verstellt three.js das Seitenverhältnis
    if (Math.abs(bildVersatz.x) + Math.abs(bildVersatz.y) > .05) kamera.setViewOffset(bw, bh, bildVersatz.x * bw / 100, bildVersatz.y * bh / 100, bw, bh);
    else if (kamera.view && kamera.view.enabled) kamera.clearViewOffset();
    else kamera.lookAt(px - sin * (hoch ? 5 : 7), hoch ? -.6 : .6, pz - cos * (hoch ? 5 : 7));
    himmelKugel.position.copy(kamera.position); wolkenGruppe.position.set(kamera.position.x, 0, kamera.position.z);
    ferneGruppe.position.set(kamera.position.x, 0, kamera.position.z);
    W.wetterSchritt(dt, kamera.position, zeit); W.voegelSchritt(dt, kamera.position, kamYaw, zeit);
    sonnenBild.position.set(kamera.position.x - 85, 95, kamera.position.z + 50);   // passend zur Lichtrichtung
    // Staubwölkchen unter den Hufen beim Laufen (nicht bei niedrigster Qualität)
    if (lauft && S.y === 0 && qualitaet < 3 && (staubTakt -= dt) <= 0) {
      staubTakt = .11;
      const st = teilchenHolen("staub"); st.position.set(g.position.x + (Math.random() - .5) * .4, .12, g.position.z + (Math.random() - .5) * .4);
      st.scale.setScalar(.25); szene.add(st); teilchen.push({ k: st, v: new THREE.Vector3(0, .25, 0), t: 0, dauer: .7, wachsen: 1.1 });
    }
    teilchenSchritt(dt);
    zeichnen();
  }
  // Einmal alles zeigen, was später vorkommt (Deko aller Welten, Hindernisse, Booster, Tafeln, Luftwelt):
  // so werden Shader und Texturen beim Laden vorbereitet und nicht mitten im Lauf, wo es kurz hängen würde
  function vorwaermen() {
    const g = new THREE.Group(), dazu = (o) => { o.position.set((g.children.length % 8 - 4) * 2, 0, -6 - Math.floor(g.children.length / 8) * 2); g.add(o); };
    W.zonen.forEach((z, i) => {
      z.deko.forEach(f => dazu(f()));
      dazu(W.randFuer(3, i)); dazu(W.wegFuer(3, 2, i)); dazu(W.blumenFuer(3, i)); dazu(W.grasBueschel(3, i, 2)); dazu(W.wiesenBlumen(3, i, 2));
      renderer.initTexture(z.boden);
    });
    ["kloetze", "ball", "balken", "pfuetze", "stange"].forEach(t => dazu(W.hindernis(t, 4)));
    ["heuballen", "huhn", "enten", "laub", "schneeball", "eis", "laternen", "gans", "liane"].forEach(t => dazu(W.weltHindernis(t, 4)));
    ["schild", "schubs", "magnet", "doppelt"].forEach(t => dazu(W.booster(t)));
    ["logo", "ohren", "kitas"].forEach(t => { dazu(W.froebelHeckenTafel(t)); dazu(W.froebelTafel(t)); });
    ["ohren", "kitas"].forEach(t => dazu(W.froebelSchild(t)));
    dazu(W.toertchen()); dazu(FW.pylone()); dazu(FW.boje()); for (const f of FIGUR_LISTE) if (f.id !== figur) dazu(W.figurBauen(f.id).gruppe);
    dazu(W.rekordFahne(1));
    { const f = W.frauBauen(); f.gruppe.add(W.sprechblase(["Ich suche meine", "Autoschlüssel!"])); dazu(f.gruppe); }
    [FW.ring(), FW.heissluftballon(), FW.gewitter(), FW.voegel(), FW.insel(), FW.insel(true), FW.regenbogen(), FW.wolkenBallen(), W.froebelBanner(2, .5)].forEach(dazu);
    for (const art of ["staub", "funke", "dampf", "blitz"]) { const k = teilchenHolen(art); dazu(k); }
    [FW.tor(true, 4), FW.tor(false, 4), W.tanne(), W.schneemann()].forEach(dazu);
    const versteckt = [...(tempoL ? [tempoL.gruppe] : []), ...alleSpuren.map(sp => sp.mesh), buehne, meer, flieger.gruppe, anjaFlieger.gruppe, strahlen, boot.gruppe, anjaBoot.gruppe, wasser, schlitten.gruppe, anjaSchlitten.gruppe, bBuehne, anja.gruppe, blase, schattenA, ...sternchen];   // auch was gerade unsichtbar ist
    const sichtbar = versteckt.map(o => o.visible);
    for (const o of versteckt) o.visible = true;
    szene.add(g);
    try {                                               // für beide Wege übersetzen: mit Nachbearbeitung (Zwischenbild) und direkt
      if (NB) { renderer.setRenderTarget(NB.bild); renderer.compile(szene, kamera); }
      renderer.setRenderTarget(null); renderer.compile(szene, kamera);
      zeichnen();
    } catch (e) {}
    szene.remove(g);
    versteckt.forEach((o, i) => { o.visible = sichtbar[i]; });
    for (const k of [...g.children]) if (k.isSprite && k.userData.art) { g.remove(k); teilchenLager[k.userData.art].push(k); }
    W.entsorgen(g);
  }
  // Leuchten und Farbstimmung kosten Leistung: ab Qualitätsstufe 2 wird direkt gezeichnet
  let tempoL = null, tempoZiel = 0, tempoZeit = 0;      // Fahrtwindlinien: werden mit dem Tempo stärker
  function zeichnen() {
    if (tempoL) { const jetzt = performance.now() / 1000, d = Math.min(.1, jetzt - tempoZeit); tempoZeit = jetzt; tempoL.schritt(d, kamera, qualitaet < 3 ? tempoZiel : 0); tempoZiel = 0; }
    if (NB && qualitaet < 2) NB.zeichnen(szene, kamera);
    else { renderer.setRenderTarget(null); renderer.render(szene, kamera); }
  }
  // Licht und Bildstimmung der aktuellen Welt (bzw. Sonnenuntergang in der Luftwelt), weich überblendet
  const LUFT_STIMMUNG = { farbe: "#fff1e4", saett: 1.2, kontrast: 1.05, glanz: .8, licht: 2.7, himmel: .9 };
  const lichtZiel = { sonne: 2.8, himmel: .85, laterne: 0, scheibe: null };
  function stimmungSetzen(sofort) {
    const st = BU.an ? BUERO_STIMMUNG : FL.an ? (FL.art === "wasser" ? W.zonen[2].stimmung : FL.art === "schlitten" ? W.zonen[WINTER()].stimmung : LUFT_STIMMUNG) : W.zonen[aktZone].stimmung;
    lichtZiel.sonne = st.licht; lichtZiel.himmel = st.himmel; lichtZiel.laterne = st.laterne || 0; (lichtZiel.scheibe = lichtZiel.scheibe || new THREE.Color()).set(st.scheibe || "#ffffff");
    if (NB) { NB.stimmung(st); if (sofort) NB.schritt(0, true); }
    if (sofort) { sonne.intensity = st.licht; himmelLicht.intensity = st.himmel; laterneLicht.intensity = lichtZiel.laterne; sonnenBild.material.color.copy(lichtZiel.scheibe); }
  }
  function lichtSchritt(dt) {
    const k = Math.min(1, dt * .8);
    sonne.intensity += (lichtZiel.sonne - sonne.intensity) * k; himmelLicht.intensity += (lichtZiel.himmel - himmelLicht.intensity) * k;
    laterneLicht.intensity += (lichtZiel.laterne - laterneLicht.intensity) * k; if (lichtZiel.scheibe) sonnenBild.material.color.lerp(lichtZiel.scheibe, k);
    if (spieler) { laterneLicht.position.copy(spieler.gruppe.position); laterneLicht.position.y += 3.4; }
    if (NB) NB.schritt(dt);
    wolkenGruppe.rotation.y += dt * .004;                 // die Wolken ziehen langsam
  }
  // Gesicht: blinzeln, Ohren wippen; sie freut sich über Sterne und legt die Ohren an, wenn Anja nah ist
  const GE = { blinzel: 2, freude: 0 };
  function gesicht(dt, wippen) {
    GE.blinzel -= dt; if (GE.blinzel < -.13) GE.blinzel = zufall(1.8, 4.5);
    const angst = A.nah && zustand === "laeuft" ? 1 : 0;
    const auf = GE.blinzel < 0 ? .12 : 1 + angst * .25;
    for (const a of spieler.augen) a.scale.y = a.userData.y * auf;
    GE.freude = Math.max(0, GE.freude - dt);
    const t = performance.now() / 1000;
    for (const o of spieler.ohren) {
      const sd = o.userData.s;
      if (o.userData.flattern) { o.rotation.y = sd * (.15 + Math.sin(t * 5 + sd) * .22 * (wippen + .3) + GE.freude); continue; }
      const basis = o.userData.basis ?? -sd * 1.2;
      o.rotation.z = basis + sd * (GE.freude * 1.4 - angst * .35) + Math.sin(t * 9 + sd) * .08 * wippen;
      o.rotation.x = angst * .5;
    }
  }
  const teilchenLager = { staub: [], funke: [], dampf: [], blitz: [] };
  function teilchenHolen(art, farbe) {
    const k = teilchenLager[art].pop() || (art === "staub" ? W.staub() : art === "dampf" ? W.dampf() : art === "blitz" ? W.blitz() : W.funke("#ffffff"));
    k.userData.art = art; k.material.opacity = 1;
    if (farbe) k.material.color.set(farbe);
    return k;
  }
  function teilchenSchritt(dt) {
    teilchen = teilchen.filter(p => {
      p.t += dt; const f = p.t / p.dauer;
      if (f >= 1) { szene.remove(p.k); teilchenLager[p.k.userData.art].push(p.k); return false; }
      p.k.position.addScaledVector(p.v, dt); p.v.y -= (p.schwer || 0) * dt;
      p.k.material.opacity = (1 - f) * (p.alpha || 1); if (p.wachsen) p.k.scale.setScalar(.25 + f * p.wachsen);
      return true;
    });
  }


  // ---------- Duell: Kissenschlacht gegen Anja (2D-Seitenansicht) ----------
  // Buchstaben A oder B fliegen von rechts auf einen Zielkreis zu. Ist einer im Kreis, drückt man den passenden Knopf
  // (Tasten A/B oder die großen Knöpfe). Richtig: Kissen-Treffer. Falsch, zu früh oder verpasst: ein Herz weg.
  // Nach 30 Sekunden (oder wenn Anjas Balken leer ist) hat man gewonnen, bei 3 Fehlern gewinnt Anja und die Runde ist vorbei.
  const DUELL_ZEIT = 30, ZIEL = .22, TOLERANZ = .075;
  const DU = { an: false, zeit: 0, intro: 0, fehler: 0, leben: 1, buchstaben: [], naechster: 0, ende: 0, sieg: false, ausblenden: 0, schlag: 0, gegen: 0, rueckF: 0, rueckM: 0 };
  let buehne, gegner, kissenF, kissenM, duellUI;
  function duellAufbauen() {
    buehne = W.duellBuehne(); buehne.visible = false; szene.add(buehne);
    gegner = W.anjaBauen(); gegner.wer = "Anja"; buehne.add(gegner.gruppe);
    kissenF = W.kissen("#bfe3ff"); kissenM = W.kissen("#ffc1d9");
    gegner.arme[1].unten.add(kissenM); kissenM.position.set(0, -.3, -.14); kissenM.rotation.x = Math.PI / 2;
    duellUI = document.createElement("div"); duellUI.className = "duell"; duellUI.hidden = true;
    duellUI.innerHTML = `<div class="du-kopf"><div class="du-balken links"><i></i><span class="du-name"></span></div><div class="du-zeit">30</div>
      <div class="du-balken rechts"><i></i><span class="du-gegner"></span></div></div><div class="du-herzen"></div>
      <div class="du-bahn"><div class="du-ziel"></div></div>
      <div class="du-knoepfe"><button type="button" data-b="A">A<small>Taste A</small></button><button type="button" data-b="B">B<small>Taste B</small></button></div>`;
    blende.after(duellUI);
    duellUI.querySelectorAll(".du-knoepfe button").forEach(k => k.addEventListener("pointerdown", (e) => { e.preventDefault(); duellTaste(k.dataset.b); }));
    // Direkt auf den Kreis oder den Buchstaben tippen zählt auch
    duellBahn().addEventListener("pointerdown", (e) => {
      e.preventDefault();
      const z = duellUI.querySelector(".du-ziel").getBoundingClientRect();
      const amKreis = Math.abs(e.clientX - (z.left + z.width / 2)) <= z.width / 2 + 24;
      const best = duellImKreis();
      if (best && (amKreis || e.target === best.el)) duellTaste(best.b);
      else if (amKreis || e.target.classList.contains("du-buchstabe")) duellTaste(null);

    });
  }
  const duellBahn = () => duellUI.querySelector(".du-bahn");
  // Treffer zählt, solange der Buchstabe sichtbar im Kreis liegt. Nie enger als vorher, auf breiten Bildschirmen bleibt es also gleich.
  function duellToleranz() {
    const breite = duellBahn().clientWidth, kreis = duellUI.querySelector(".du-ziel").offsetWidth;
    DU.tol = breite ? Math.max(TOLERANZ, (kreis / 2 + kreis * .2) / breite) : TOLERANZ;
  }
  function duellImKreis() {
    let best = null;
    for (const l of DU.buchstaben) if (!l.weg && Math.abs(l.x - ZIEL) <= DU.tol && (!best || Math.abs(l.x - ZIEL) < Math.abs(best.x - ZIEL))) best = l;
    return best;
  }
  function duellAnzeige() {
    duellUI.querySelector(".du-zeit").textContent = Math.max(0, Math.ceil(DUELL_ZEIT - DU.zeit));
    duellUI.querySelector(".du-herzen").textContent = "❤️".repeat(3 - DU.fehler) + "🤍".repeat(DU.fehler);
    duellUI.querySelector(".rechts i").style.transform = `scaleX(${Math.max(0, DU.leben)})`;
    duellUI.querySelector(".links i").style.transform = `scaleX(${(3 - DU.fehler) / 3})`;
  }
  function duellStart() {
    DU.an = true; FL.art = "duell";
    for (const ab of abschnitte) ab.gruppe.visible = false;
    for (const o of [boden, ferneGruppe, W.luft]) o.visible = false;
    schattenF.visible = schattenA.visible = false; anja.gruppe.visible = false; sternchen.forEach(st => { st.visible = false; });
    buehne.visible = true;
    // Figuren gegenüber auf der Matte; die Figur hält ihr Kissen im Maul
    buehne.add(spieler.gruppe); spieler.gruppe.position.set(-1.8, .12, 0); spieler.gruppe.rotation.set(0, -Math.PI / 2, 0); spieler.gruppe.scale.setScalar(1);
    spieler.koerper.rotation.set(0, 0, 0); blase.visible = false;
    const ks = spieler.kopfSkala || 1;
    if (spieler.mensch) { spieler.arme[1].unten.add(kissenF); kissenF.position.set(0, -.3, -.14); kissenF.rotation.set(Math.PI / 2, 0, 0); kissenF.scale.setScalar(1); }   // Anja hält es in der Hand
    else { spieler.kopf.add(kissenF); kissenF.position.set(0, -.1 * ks, -.3 * ks); kissenF.rotation.set(Math.PI / 2, 0, 0); kissenF.scale.setScalar(.8 * ks); }
    if (gegner.wer !== JAGD()) {                         // Gegnerin ist die Verfolgerin: Anja, bzw. Marlena, wenn man selbst Anja spielt
      buehne.remove(gegner.gruppe); gegner = JAGD() === "Marlena" ? W.marlenaBauen() : W.anjaBauen(); gegner.wer = JAGD(); buehne.add(gegner.gruppe);
      gegner.arme[1].unten.add(kissenM);
    }
    duellUI.querySelector(".du-gegner").textContent = JAGD();
    gegner.gruppe.position.set(1.8, .12, 0); gegner.gruppe.rotation.set(0, Math.PI / 2, 0);
    DU.buchstaben.forEach(l => l.el.remove());
    Object.assign(DU, { zeit: 0, intro: 1.6, fehler: 0, leben: 1, buchstaben: [], naechster: 0, ende: 0, sieg: false, ausblenden: 0, schlag: 0, gegen: 0, rueckF: 0, rueckM: 0 });
    duellUI.querySelector(".du-name").textContent = NAME(); duellUI.hidden = false; duellToleranz(); duellAnzeige();
    szene.fog.near = 40; szene.fog.far = 140; szene.fog.color.set("#f3e6cf"); himmelKugel.material.color.set("#ffffff");
    stimmungSetzen(); kamPos = null; wackeln = 0;
    T.welt(); T.musik(1);
    meldung("Kissenschlacht!", handy ? "Tipp auf den Buchstaben, wenn er im Kreis ist" : "Drück A oder B, wenn der Buchstabe im Kreis ist");
  }
  function duellAus() {
    if (!buehne) return;
    if (DU.an || buehne.visible) {
      szene.add(spieler.gruppe); spieler.gruppe.position.set(0, 0, 0); spieler.gruppe.rotation.set(0, 0, 0); spieler.koerper.rotation.set(0, 0, 0);
      spieler.beine.forEach(b => { b.oben.rotation.set(0, 0, 0); b.unten.rotation.set(0, 0, 0); });
      for (const o of [boden, ferneGruppe]) o.visible = true;
      W.luft.visible = qualitaet < 3; for (const ab of abschnitte) ab.gruppe.visible = true;
      szene.fog.near = 45; szene.fog.far = 120;
    }
    if (kissenF.parent) kissenF.parent.remove(kissenF);
    DU.buchstaben.forEach(l => l.el.remove()); DU.buchstaben = [];
    DU.an = false; buehne.visible = false; duellUI.hidden = true;
  }
  function duellBlitz(klasse) { duellUI.classList.remove("fehler", "richtig"); void duellUI.offsetWidth; duellUI.classList.add(klasse); setTimeout(() => duellUI.classList.remove(klasse), 250); }
  function buchstabeWeg(l, klasse) { l.weg = true; l.el.classList.add(klasse); setTimeout(() => l.el.remove(), 320); }
  function duellFehler(text) {
    DU.fehler++; DU.gegen = .4; DU.rueckF = .35; wackeln = .3; T.stolpern(); komboWeg(); duellBlitz("fehler");
    if (navigator.vibrate) navigator.vibrate(60);
    duellAnzeige();
    if (DU.fehler >= 3) {
      DU.buchstaben.forEach(l => buchstabeWeg(l, "daneben")); DU.buchstaben = [];
      setTimeout(() => { duellUI.hidden = true; }, 400);
      verlieren(`${JAGD()} hat die Kissenschlacht gewonnen!`, "duell");
    } else meldung(text, `Noch ${3 - DU.fehler} ${3 - DU.fehler === 1 ? "Herz" : "Herzen"}`);
  }
  function duellSieg(titel) {
    DU.ende = 1.6; DU.sieg = true; punkte += 1000; sternZahl += 25; T.rekord();
    DU.buchstaben.forEach(l => buchstabeWeg(l, "weg")); DU.buchstaben = [];
    meldung(titel, "+1.000 Punkte · +25 ★");
    const wo = gegner.gruppe.getWorldPosition(new THREE.Vector3()); wo.y += 1.6;
    for (const farbe of ["#ffd54a", "#3baa35", "#ff7aa2", "#6ec6ff"]) funkeln(wo, farbe, 10);
  }
  function duellTaste(b) {
    if (!DU.an || zustand !== "laeuft" || DU.ende || DU.intro > 0) return;
    const best = duellImKreis();
    if (!best) { meldung("Noch nicht!", "Warte, bis der Buchstabe im Kreis ist"); return; }   // kostet kein Herz
    if (best.b !== b) { buchstabeWeg(best, "daneben"); duellFehler("Falscher Buchstabe!"); return; }
    buchstabeWeg(best, "weg"); duellBlitz("richtig");
    DU.schlag = .35; DU.rueckM = .35; DU.leben -= .06; punkte += 50; T.schubs(); GE.freude = .35;
    const wo = gegner.zopf.parent.getWorldPosition(new THREE.Vector3());   // Kopf (Zopf hängt am Kopf)
    funkeln(wo, "#ffffff", 10);
    duellAnzeige();
    if (DU.leben <= 0) duellSieg("K.O.! Gewonnen!");
  }
  function duellSchritt(dt) {
    R.zeit += dt;
    if (FL.abflug) { FL.abflug += dt; blende.style.opacity = Math.max(0, 1 - (FL.abflug - .9) / .8); if (FL.abflug > 1.7) FL.abflug = 0; }
    for (const k of ["schlag", "gegen", "rueckF", "rueckM"]) DU[k] = Math.max(0, DU[k] - dt);
    if (DU.ausblenden) {                                // nach dem Sieg: weiß überblenden und zurück in die Laufwelt
      DU.ausblenden += dt; blende.style.opacity = Math.min(1, DU.ausblenden / .9);
      if (DU.ausblenden >= .9) { DU.ausblenden = 0; flugLanden(); }
      return;
    }
    if (DU.ende) { DU.ende -= dt; if (DU.ende <= 0) { DU.ende = 0; DU.ausblenden = .001; T.abflug(); } return; }
    if (DU.intro > 0) { DU.intro -= dt; return; }
    DU.zeit += dt;
    if (DU.zeit >= DUELL_ZEIT) { duellSieg("Gewonnen!"); return; }
    // neue Buchstaben, mit der Zeit öfter und schneller
    DU.naechster -= dt;
    if (DU.naechster <= 0) {
      DU.naechster = Math.max(.62, 1.2 - DU.zeit * .018);
      duellToleranz();
      const b = Math.random() < .5 ? "A" : "B", el = document.createElement("div");
      el.className = "du-buchstabe " + b.toLowerCase(); el.textContent = b; duellBahn().append(el);
      DU.buchstaben.push({ b, x: 1.08, el, weg: false });
    }
    const v = .55 + DU.zeit * .012;
    for (const l of DU.buchstaben) {
      if (l.weg) continue;
      l.x -= v * dt; l.el.style.left = (l.x * 100).toFixed(2) + "%";
      if (l.x < ZIEL - DU.tol) { buchstabeWeg(l, "daneben"); duellFehler("Verpasst!"); if (zustand !== "laeuft") return; }
    }
    duellUI.classList.toggle("bereit", !!duellImKreis());
    DU.buchstaben = DU.buchstaben.filter(l => !l.weg);
    duellAnzeige();
    hudZeigen();
  }
  function duellBild(dt) {
    const t = performance.now() / 1000, g = spieler.gruppe;
    // Fröbelinchen (bzw. die gewählte Figur): steht, wippt, haut beim Treffer mit dem Kissen im Vorderbein zu
    const pS = DU.schlag > 0 ? Math.sin((1 - DU.schlag / .35) * Math.PI) : 0;
    if (spieler.mensch) {                               // Anja: federt wie ihre Gegnerin und haut mit dem Kissen in der Hand zu
      spieler.beine.forEach((b, i) => { b.oben.rotation.x = (i ? -.25 : .25) + Math.sin(t * 5.5) * .05; b.unten.rotation.x = -.35; });
      spieler.arme[1].oben.rotation.set(.7 + pS * 1.5, 0, 0); spieler.arme[1].unten.rotation.set(.5 - pS * .3, 0, 0);
      spieler.arme[0].oben.rotation.set(.3 + Math.sin(t * 3) * .1, 0, 0); spieler.arme[0].unten.rotation.set(.9, 0, 0);
    } else {
      spieler.beine.forEach((b, i) => { b.oben.rotation.x = Math.sin(t * 6 + i) * .06; b.unten.rotation.x = 0; });
      spieler.beine[1].oben.rotation.x = pS * .7;        // beim Zuhauen ein kleiner Satz nach vorn, das Kissen schwingt mit dem Kopf
    }
    spieler.koerper.position.y = Math.abs(Math.sin(t * 5)) * .04 + pS * .12;
    spieler.hals.rotation.x = Math.sin(t * 2) * .06 - pS * .6;
    const hoch = kamera.aspect < .8, abst = hoch ? 1.45 : 1.8;   // im Hochformat stehen beide etwas näher beisammen
    g.position.x = -abst - (DU.rueckF > 0 ? Math.sin(DU.rueckF / .35 * Math.PI) * .35 : 0);
    // Anja: federt auf den Füßen, holt bei Fehlern mit dem Kissen aus, weicht bei Treffern zurück
    const pM = DU.gegen > 0 ? Math.sin((1 - DU.gegen / .4) * Math.PI) : 0;
    gegner.k.position.y = Math.abs(Math.sin(t * 5.5)) * .05; gegner.k.rotation.x = -.05 - (DU.rueckM > 0 ? Math.sin(DU.rueckM / .35 * Math.PI) * .25 : 0);
    gegner.beine.forEach((b, i) => { b.oben.rotation.x = (i ? -.25 : .25) + Math.sin(t * 5.5) * .05; b.unten.rotation.x = -.35; });
    gegner.arme[1].oben.rotation.x = .7 + pM * 1.5; gegner.arme[1].unten.rotation.x = .5 - pM * .3;
    gegner.arme[0].oben.rotation.x = .3 + Math.sin(t * 3) * .1; gegner.arme[0].unten.rotation.x = .9;
    gegner.zopf.rotation.x = .12 + Math.sin(t * 5.5) * .08;
    gegner.gruppe.position.x = abst + (DU.rueckM > 0 ? Math.sin(DU.rueckM / .35 * Math.PI) * .35 : 0);
    // Kamera seitlich: alles wie in einem 2D-Kampfspiel nebeneinander
    // im Hochformat so weit weg, dass rund 6 m Breite ins Bild passen (beide Figuren samt Ausholen)
    kamera.position.set(0, hoch ? 2 : 1.6, hoch ? Math.min(16, 3.1 / (Math.tan(25 * Math.PI / 180) * kamera.aspect)) : 8.6);
    if (wackeln > 0) { wackeln = Math.max(0, wackeln - dt); kamera.position.x += (Math.random() - .5) * wackeln * .5; kamera.position.y += (Math.random() - .5) * wackeln * .3; }
    kamera.lookAt(0, hoch ? 1.5 : 1.25, 0);
    kamera.fov += ((hoch ? 50 : 40) - kamera.fov) * Math.min(1, dt * 6); kamera.updateProjectionMatrix();
    himmelKugel.position.copy(kamera.position); sonnenBild.position.set(kamera.position.x - 85, 95, kamera.position.z + 50);
    schattenNachfuehren(0, 0);
    gesicht(dt, .3);
    W.animieren(t); lichtSchritt(dt);
    teilchenSchritt(dt);
    zeichnen();
  }

  // ---------- Einpacken: die Figur sitzt auf dem Stuhl und wird in Frischhaltefolie gewickelt ----------
  // Eingepackt wird immer Fröbelinchen, auch wenn man mit einer anderen Figur läuft: Die Figur wartet so lange unsichtbar.
  // Hin und her wischen (Pfeiltasten ← →, mit der Maus ziehen): jeder Strich in die andere Richtung legt eine Lage um die Figur.
  // Wer zu lange wartet, dem rutscht eine Lage wieder ab. Geschafft gibt es den vollen Bonus, sonst Punkte pro Lage; die Runde läuft in beiden Fällen weiter.
  const FOLIE_ZEIT = 20, FOLIE_LAGEN = 16, FOLIE_ABRUTSCH = 1.5;
  const FO = { an: false, zeit: 0, intro: 0, lagen: [], profil: [], letzte: 0, summe: 0, ruhe: 0, ende: 0, ausblenden: 0, winkel: 0, winkelZiel: 0, zappeln: 0, sieg: false, oben: 2, unten: 1, hals: 0 };
  let fBuehne, fStuhl, fRolle, fStreifen, folieUI, fGiraffe;
  function folieAufbauen() {
    fBuehne = W.duellBuehne(); fBuehne.visible = false; szene.add(fBuehne);
    fStuhl = W.stuhl(); fBuehne.add(fStuhl);
    fGiraffe = W.figurBauen("giraffe"); fGiraffe.gruppe.visible = false; fBuehne.add(fGiraffe.gruppe);
    fRolle = W.folienRolle(); fBuehne.add(fRolle);
    fStreifen = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), W.folieStoff); fBuehne.add(fStreifen);
    folieUI = document.createElement("div"); folieUI.className = "folie"; folieUI.hidden = true;
    folieUI.innerHTML = `<div class="fo-kopf"><div class="fo-balken"><i></i><span></span></div><div class="fo-zeit">20</div></div><p class="fo-tipp" aria-hidden="true"><b>⇠</b><span>${handy ? "Wisch hin und her" : "Pfeiltasten im Wechsel oder Maus ziehen"}</span><b>⇢</b></p>`;
    blende.after(folieUI);
  }
  function folieAnzeige() {
    const n = FO.lagen.length;
    folieUI.querySelector(".fo-zeit").textContent = Math.max(0, Math.ceil(FOLIE_ZEIT - FO.zeit));
    folieUI.querySelector(".fo-balken i").style.transform = `scaleX(${n / FOLIE_LAGEN})`;
    folieUI.querySelector(".fo-balken span").textContent = `${n} / ${FOLIE_LAGEN} Lagen`;
  }
  // Sitzhaltung: lange Tiere richten sich auf, alle lassen die Beine nach vorn hängen
  function folieHinsetzen() {
    const g = FO.f.gruppe, ohneBeine = (fn) => FO.f.koerper.traverse(o => { if (!o.isMesh) return; let p = o; while (p) { if (FO.f.beine.some(b => b.oben === p)) return; p = p.parent; } fn(o); });
    fBuehne.add(g); g.position.set(0, 0, 0); g.rotation.set(0, Math.PI + .28, 0); g.scale.setScalar(1);
    FO.f.koerper.position.set(0, 0, 0); FO.f.koerper.rotation.set(0, 0, 0); FO.f.hals.rotation.set(0, 0, 0);
    g.updateMatrixWorld(true);
    const box = new THREE.Box3(), h = new THREE.Box3();
    ohneBeine(o => box.union(h.setFromObject(o)));
    const groesse = box.getSize(new THREE.Vector3());
    const lang = Math.max(groesse.x, groesse.z) > groesse.y * .7 && !FO.f.mensch && FO.f.rueckenY >= -.1;
    FO.f.koerper.rotation.x = lang ? 1 : 0;
    FO.hals = lang ? -1 : 0; FO.f.hals.rotation.x = FO.hals;
    FO.f.beine.forEach(b => { const hinten = b.oben.position.z > 0.05; b.oben.rotation.set(lang ? (hinten ? .55 : -.95) : 1.35, 0, 0); b.unten.rotation.set(lang && !hinten ? 0 : -1.3, 0, 0); });
    g.updateMatrixWorld(true);
    box.makeEmpty(); ohneBeine(o => box.union(h.setFromObject(o)));
    g.position.y = W.STUHL_SITZ - box.min.y + .02;
    const mitte = box.getCenter(new THREE.Vector3());
    g.position.x -= mitte.x; g.position.z -= mitte.z - .05;
    g.updateMatrixWorld(true);
    // Umriss von unten nach oben aus den echten Punkten der Figur: jede Lage liegt eng um das, was auf ihrer Höhe ist
    const v = new THREE.Vector3(), punkteListe = [];
    let unten = Infinity, oben = -Infinity;
    const huelleTeile = (fn) => lang ? FO.f.koerper.traverse(o => { if (!o.isMesh) return; let p = o; while (p) { if (FO.f.beine.some(b => b.oben === p && b.oben.position.z > .05)) return; p = p.parent; } fn(o); }) : ohneBeine(fn);
    huelleTeile(o => {
      const pos = o.geometry && o.geometry.attributes.position;
      if (!pos) return;
      const weite = Math.max(1, Math.floor(pos.count / 400));
      for (let i = 0; i < pos.count; i += weite) {
        v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
        punkteListe.push(v.x, v.y, v.z); unten = Math.min(unten, v.y); oben = Math.max(oben, v.y);
      }
    });
    FO.unten = unten; FO.oben = oben + .04;
    const schritt = (FO.oben - FO.unten) / FOLIE_LAGEN;
    const scheiben = Array.from({ length: FOLIE_LAGEN }, () => ({ x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity }));
    for (let i = 0; i < punkteListe.length; i += 3) {
      const k = scheiben[Math.min(FOLIE_LAGEN - 1, Math.floor((punkteListe[i + 1] - FO.unten) / schritt))];
      k.x0 = Math.min(k.x0, punkteListe[i]); k.x1 = Math.max(k.x1, punkteListe[i]);
      k.z0 = Math.min(k.z0, punkteListe[i + 2]); k.z1 = Math.max(k.z1, punkteListe[i + 2]);
    }
    FO.profil = [];
    let vorher = null;
    scheiben.forEach((k, i) => {
      if (k.x0 === Infinity && vorher) Object.assign(k, vorher);
      else if (k.x0 === Infinity) Object.assign(k, { x0: -.3, x1: .3, z0: -.3, z1: .3 });
      vorher = k;
      FO.profil.push({ y: FO.unten + (i + .5) * schritt, h: schritt * 1.35, x: (k.x0 + k.x1) / 2, z: (k.z0 + k.z1) / 2, rx: (k.x1 - k.x0) / 2 + .05, rz: (k.z1 - k.z0) / 2 + .05 });
    });
  }
  function folieStart() {
    FO.an = true; FL.art = "folie";
    for (const ab of abschnitte) ab.gruppe.visible = false;
    for (const o of [boden, ferneGruppe, W.luft]) o.visible = false;
    schattenF.visible = schattenA.visible = false; anja.gruppe.visible = false; sternchen.forEach(st => { st.visible = false; });
    fBuehne.visible = true; blase.visible = false;
    FO.f = figur === "giraffe" ? spieler : fGiraffe;      // wer selbst Fröbelinchen spielt, behält die eigene Ausstattung
    spieler.gruppe.visible = FO.f === spieler; fGiraffe.gruppe.visible = FO.f === fGiraffe;
    fStuhl.position.set(0, .12, 0);
    Object.assign(FO, { zeit: 0, intro: 1.4, letzte: 0, summe: 0, ruhe: 0, ende: 0, ausblenden: 0, winkel: .6, winkelZiel: .6, zappeln: 0, sieg: false });
    folieLagenWeg();
    folieHinsetzen();
    folieUI.hidden = false; folieUI.classList.remove("fertig"); folieAnzeige();
    szene.fog.near = 40; szene.fog.far = 140; szene.fog.color.set("#f3e6cf"); himmelKugel.material.color.set("#ffffff");
    stimmungSetzen(); kamPos = null; wackeln = 0;
    T.welt(); T.musik(1);
    meldung("Fröbelinchen muss eingepackt werden!", handy ? "Wisch hin und her, so schnell du kannst" : "Pfeiltasten im Wechsel oder mit der Maus hin und her ziehen");
  }
  function folieLageWeg(l) { fBuehne.remove(l.mesh); l.mesh.children.forEach(k => k.geometry.dispose()); l.mesh.geometry.dispose(); }
  function folieLagenWeg() { FO.lagen.forEach(folieLageWeg); FO.lagen = []; }
  function folieAus() {
    if (!fBuehne) return;
    if (FO.an || fBuehne.visible) {
      fGiraffe.gruppe.visible = false; spieler.gruppe.visible = true;
      szene.add(spieler.gruppe); spieler.gruppe.position.set(0, 0, 0); spieler.gruppe.rotation.set(0, 0, 0);
      spieler.koerper.position.set(0, 0, 0); spieler.koerper.rotation.set(0, 0, 0); spieler.hals.rotation.set(0, 0, 0);
      spieler.beine.forEach(b => { b.oben.rotation.set(0, 0, 0); b.unten.rotation.set(0, 0, 0); });
      for (const o of [boden, ferneGruppe]) o.visible = true;
      W.luft.visible = qualitaet < 3; for (const ab of abschnitte) ab.gruppe.visible = true;
      szene.fog.near = 45; szene.fog.far = 120;
    }
    folieLagenWeg();
    FO.an = false; fBuehne.visible = false; folieUI.hidden = true;
  }
  function folieLage() {
    const i = FO.lagen.length;
    if (i >= FOLIE_LAGEN) return;
    const p = FO.profil[i], geo = new THREE.CylinderGeometry(1, 1, p.h, 40, 1, true), m = new THREE.Mesh(geo, W.folieStoff);
    m.position.set(p.x, p.y, p.z); m.rotation.set((Math.random() - .5) * .1, Math.random() * 6, (Math.random() - .5) * .1); m.renderOrder = 5;
    const rand = []; for (let k = 0; k < 40; k++) { const w = k / 40 * Math.PI * 2; rand.push(new THREE.Vector3(Math.cos(w), p.h / 2, Math.sin(w))); }
    const kante = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(rand), W.folieKante); kante.renderOrder = 6; m.add(kante);
    fBuehne.add(m);
    FO.lagen.push({ mesh: m, p, neu: 1 });
    punkte += 50; FO.ruhe = 0; FO.zappeln = .22; T.folie(); folieAnzeige();
    if (FO.lagen.length >= FOLIE_LAGEN) folieFertig(true);
  }
  function folieFertig(sieg) {
    if (FO.ende) return;
    FO.sieg = sieg; FO.ende = 2.2; folieUI.classList.add("fertig");
    if (sieg) {
      punkte += 1000; sternZahl += 25; T.rekord();
      meldung("Frisch verpackt!", "Fröbelinchen hält sich jetzt ewig · +1.000 Punkte · +25 ★");
      const wo = new THREE.Vector3(0, FO.oben, 0); for (const farbe of ["#ffd54a", "#3baa35", "#ff7aa2", "#6ec6ff"]) funkeln(wo, farbe, 10);
    } else {
      T.stolpern(); meldung("Fröbelinchen ist entwischt!", `${FO.lagen.length} von ${FOLIE_LAGEN} Lagen · weiter geht's`);
    }
  }
  // Ein Strich zählt, wenn er lang genug ist und die Richtung gewechselt hat
  function folieWisch(dx) {
    if (!FO.an || zustand !== "laeuft" || FO.ende || FO.intro > 0 || !dx) return;
    const r = Math.sign(dx);
    if (Math.sign(FO.summe) !== r) FO.summe = 0;
    FO.summe += dx;
    if (r !== FO.letzte && Math.abs(FO.summe) > Math.max(36, huelle.clientWidth * .07)) { FO.letzte = r; FO.summe = 0; FO.winkelZiel += Math.PI; folieLage(); }
  }
  function folieSchritt(dt) {
    R.zeit += dt;
    if (FL.abflug) { FL.abflug += dt; blende.style.opacity = Math.max(0, 1 - (FL.abflug - .9) / .8); if (FL.abflug > 1.7) FL.abflug = 0; }
    if (FO.ausblenden) {
      FO.ausblenden += dt; blende.style.opacity = Math.min(1, FO.ausblenden / .9);
      if (FO.ausblenden >= .9) { FO.ausblenden = 0; flugLanden(); }
      return;
    }
    if (FO.ende) { FO.ende -= dt; if (FO.ende <= 0) { FO.ende = 0; FO.ausblenden = .001; T.abflug(); } return; }
    if (FO.intro > 0) { FO.intro -= dt; return; }
    FO.zeit += dt; FO.ruhe += dt;
    if (FO.zeit >= FOLIE_ZEIT) { folieFertig(false); return; }
    if (FO.ruhe >= FOLIE_ABRUTSCH && FO.lagen.length) {   // zu lange gewartet: die oberste Lage rutscht ab
      FO.ruhe = 0; FO.zappeln = .35; punkte = Math.max(0, punkte - 50);
      folieLageWeg(FO.lagen.pop());
      T.ducken();
    }
    folieAnzeige();
    hudZeigen();
  }
  function folieBild(dt) {
    const t = performance.now() / 1000, g = FO.f.gruppe;
    FO.zappeln = Math.max(0, FO.zappeln - dt);
    // Sie zappelt, wenn eine neue Lage kommt, und freut sich oder staunt am Ende
    const z = FO.zappeln > 0 ? Math.sin(t * 34) * FO.zappeln * .22 : Math.sin(t * 1.6) * .012;
    g.rotation.z = z;
    FO.f.hals.rotation.x = FO.hals + Math.sin(t * 1.7) * .05 + (FO.sieg && FO.ende ? Math.sin(t * 16) * .06 : 0);
    if (FO.f.schwanz) FO.f.schwanz.rotation.x = Math.sin(t * 4) * .15;
    // Neue Lagen legen sich von außen eng an die Figur
    for (const l of FO.lagen) {
      l.neu = Math.max(0, l.neu - dt * 5.5);
      const k = 1 + l.neu * l.neu * .75;
      l.mesh.scale.set(l.p.rx * k, 1, l.p.rz * k);
    }
    // Die Rolle läuft auf Höhe der obersten Lage um die Figur, ein Folienstreifen führt zur Figur
    FO.winkel += (FO.winkelZiel - FO.winkel) * Math.min(1, dt * 14);
    const p = FO.profil[Math.min(FO.lagen.length, FOLIE_LAGEN - 1)] || { x: 0, y: 1.5, z: 0, rx: .5, rz: .5, h: .2 };
    const rx = p.rx + .42, rz = p.rz + .42, c = Math.cos(FO.winkel), s = Math.sin(FO.winkel);
    fRolle.visible = fStreifen.visible = !(FO.ende && FO.sieg);
    fRolle.position.set(p.x + c * rx, p.y, p.z + s * rz);
    const kx = p.x + Math.cos(FO.winkel - .7) * p.rx, kz = p.z + Math.sin(FO.winkel - .7) * p.rz;
    const dx = fRolle.position.x - kx, dz = fRolle.position.z - kz, lang = Math.hypot(dx, dz);
    fStreifen.position.set((fRolle.position.x + kx) / 2, p.y, (fRolle.position.z + kz) / 2);
    fStreifen.rotation.set(0, -Math.atan2(dz, dx), 0); fStreifen.scale.set(lang, Math.max(.3, p.h * 1.6), 1);
    // Kamera von vorn, so weit weg, dass Stuhl und Figur ganz ins Bild passen
    const hoch = kamera.aspect < .8, hoehe = FO.oben + .5, mitteY = hoehe * .52;
    const fov = hoch ? 46 : 38, halb = Math.tan(fov * Math.PI / 360);
    const abstand = Math.max((hoehe * .58) / halb, 1.9 / (halb * kamera.aspect));
    kamera.position.set(Math.sin(t * .25) * .5, mitteY + .5, abstand);
    if (wackeln > 0) { wackeln = Math.max(0, wackeln - dt); kamera.position.x += (Math.random() - .5) * wackeln * .5; }
    kamera.lookAt(0, mitteY, 0);
    kamera.fov += (fov - kamera.fov) * Math.min(1, dt * 6); kamera.updateProjectionMatrix();
    himmelKugel.position.copy(kamera.position); sonnenBild.position.set(kamera.position.x - 85, 95, kamera.position.z + 50);
    schattenNachfuehren(0, 0);
    gesicht(dt, .3);
    W.animieren(t); lichtSchritt(dt);
    teilchenSchritt(dt);
    zeichnen();
  }

  // ---------- Sonderphase: Ankes Büro ----------
  // Anke hat Fröbelinchen in einem Schrankfach versteckt und holt sich kurz einen Kaffee. Man öffnet Türen per Tippen
  // (oder mit ← → wählen und ↑ bzw. Enter öffnen). Hinweise: Kichern von links oder rechts, ein wackelndes Fach und später
  // eine Ohrenspitze im Türspalt. Kommt Anke zurück, bevor man sie gefunden hat, ist die Phase vorbei (die Runde läuft weiter).
  const BUERO_RUNDEN = [
    { schraenke: [["akten", 2], ["holz", 2]], zeit: 22 },
    { schraenke: [["weiss", 2], ["akten", 2], ["holz", 2]], zeit: 20 },
    { schraenke: [["holz", 3], ["akten", 3], ["weiss", 2]], zeit: 18 },
  ];
  const BUERO_STIMMUNG = { farbe: "#fff6ea", saett: 1.1, kontrast: 1.04, glanz: .45, licht: 2.6, himmel: 1.0 };
  const BU = { an: false, runde: 0, zeit: 0, dauer: 20, intro: 0, ende: 0, ausblenden: 0, zwischen: 0, falsch: 0, wahl: 0, kichern: 0, wackeln: 0, schritt: 0,
    erwischt: false, tasten: false, tuer: 0, pop: 0, versteck: null, gefunden: null, breite: 2, kamX: 0, blitz: 0, sieg: false };
  let BW = null, werkstatt = null, bBuehne = null, bRaum, bMoebel, bGiraffe, bOhr, bueroUI, anke = null, verstecke = [], bStrahl = null;
  function bueroAufbauen(bm, fm) {
    BW = bm.bueroWelt(THREE, W); werkstatt = fm.figurenWerkstatt(THREE, handy);
    bBuehne = new THREE.Group(); bBuehne.visible = false; szene.add(bBuehne);
    bRaum = BW.raum(); bBuehne.add(bRaum.gruppe);
    bMoebel = new THREE.Group(); bBuehne.add(bMoebel);
    bGiraffe = W.figurBauen("giraffe"); bGiraffe.gruppe.visible = false;
    bOhr = BW.ohr(); bOhr.visible = false;
    bueroUI = document.createElement("div"); bueroUI.className = "folie buero"; bueroUI.hidden = true;
    bueroUI.innerHTML = `<div class="fo-kopf"><div class="fo-balken"><i></i><span></span></div><div class="fo-zeit">20</div></div><p class="fo-tipp" aria-hidden="true"><span>${handy ? "Tipp auf die Türen" : "Tür anklicken oder mit ← → wählen und ↑ öffnen"}</span></p>`;
    blende.after(bueroUI);
  }
  const versteckX = (v) => v.schrank.position.x, versteckY = (v) => v.y0 + v.hoehe / 2;
  function bueroRunde(nr) {
    for (const k of [...bMoebel.children]) { bMoebel.remove(k); W.entsorgen(k); }
    if (bGiraffe.gruppe.parent) bGiraffe.gruppe.parent.remove(bGiraffe.gruppe);
    if (bOhr.parent) bOhr.parent.remove(bOhr);
    const plan = BUERO_RUNDEN[nr], abst = .12;
    const teile = plan.schraenke.map(([art, f]) => BW.schrank(art, f));
    const breite = teile.reduce((n, t) => n + t.gruppe.userData.breite, 0) + abst * (teile.length - 1);
    let x = -breite / 2;
    verstecke = [];
    for (const t of teile) { const b = t.gruppe.userData.breite; t.gruppe.position.set(x + b / 2, 0, -.96); bMoebel.add(t.gruppe); verstecke.push(...t.verstecke); x += b + abst; }
    verstecke.sort((a, b) => versteckX(a) - versteckX(b) || versteckY(b) - versteckY(a));   // links nach rechts, oben nach unten (für die Tasten)
    const ziel = wahl(verstecke);
    for (const v of verstecke) { v.auf = 0; v.offen = 0; v.wackel = 0; if (v !== ziel) v.text = BW.fuellen(v); }
    // Fröbelinchen sitzt klein im Fach und schaut zur Tür
    const g = bGiraffe.gruppe, sk = Math.min(.21, ziel.hoehe * .82 / 2.75);
    g.visible = true; g.scale.setScalar(sk); g.position.set(0, 0, .04); g.rotation.set(0, Math.PI, 0); ziel.inhalt.add(g);
    BU.sk = sk;
    // Ohrenspitze im Türspalt an der freien Kante (erst später sichtbar)
    bOhr.position.set((ziel.links ? 1 : -1) * (ziel.breite / 2 - .03), ziel.y0 + ziel.hoehe * .82, ziel.tiefe / 2 + .035); bOhr.rotation.z = (ziel.links ? -1 : 1) * .5;
    bOhr.visible = false; ziel.schrank.add(bOhr);
    Object.assign(BU, { versteck: ziel, gefunden: null, falsch: 0, zeit: 0, dauer: plan.zeit, kichern: 1.6, wackeln: 3.2, schritt: 0, pop: 0, breite, wahl: 0, tuer: 0 });
    bueroMarkieren(); bueroAnzeige();
  }
  function bueroStart() {
    BU.an = true; FL.art = "buero";
    for (const ab of abschnitte) ab.gruppe.visible = false;
    for (const o of [boden, ferneGruppe, W.luft]) o.visible = false;
    schattenF.visible = schattenA.visible = false; anja.gruppe.visible = false; sternchen.forEach(st => { st.visible = false; });
    spieler.gruppe.visible = false; blase.visible = false;
    bBuehne.visible = true;
    if (!anke) {
      try { anke = werkstatt.bauen("anke"); } catch (e) { anke = W.frauBauen(); }
      anke.gruppe.scale.set(1.14, .91, 1.14);           // Anke ist kleiner und kräftiger als Anja
      anke.gruppe.traverse(o => { if (o.isMesh) o.castShadow = true; }); bBuehne.add(anke.gruppe);
    }
    anke.gruppe.position.set(5.0, 0, -.35); anke.gruppe.rotation.set(0, Math.PI + .45, 0);   // steht im Raum vor der Tür und schaut zur Schrankwand anke.gruppe.visible = true;
    Object.assign(BU, { runde: 0, intro: 3, ende: 0, ausblenden: 0, zwischen: 0, erwischt: false, tasten: false, kamX: 0, blitz: 0, sieg: false });
    bueroRunde(0); BU.tuer = 1;
    bueroUI.hidden = false; bueroUI.classList.remove("fertig", "eilig"); bueroAnzeige();
    szene.fog.near = 30; szene.fog.far = 90; szene.fog.color.set("#f2efe8"); himmelKugel.material.color.set("#ffffff"); sonne.color.set("#fff4e4");
    stimmungSetzen(); kamPos = null; wackeln = 0;
    T.welt(); T.musik(9);
    meldung("Anke hat Fröbelinchen versteckt!", "„Ich hol mir nur schnell einen Kaffee …“ Finde sie, bevor Anke zurück ist!");
  }
  function bueroAus() {
    if (!bBuehne) return;
    if (BU.an || bBuehne.visible) {
      spieler.gruppe.visible = true;
      for (const o of [boden, ferneGruppe]) o.visible = true;
      W.luft.visible = qualitaet < 3; for (const ab of abschnitte) ab.gruppe.visible = true;
      szene.fog.near = 45; szene.fog.far = 120;
    }
    BU.an = false; bBuehne.visible = false; bueroUI.hidden = true;
  }
  function bueroAnzeige() {
    const rest = Math.max(0, BU.dauer - BU.zeit);
    bueroUI.querySelector(".fo-zeit").textContent = Math.ceil(rest);
    bueroUI.querySelector(".fo-balken i").style.transform = `scaleX(${rest / BU.dauer})`;
    bueroUI.querySelector(".fo-balken span").textContent = `Versteck ${BU.runde + 1} von 3` + (BU.falsch ? ` · ${BU.falsch}× daneben` : "");
    bueroUI.classList.toggle("eilig", rest < 6 && !BU.gefunden && !BU.erwischt);
  }
  function bueroMarkieren() {
    verstecke.forEach((v, i) => { v.mat.emissive.set(BU.tasten && i === BU.wahl && !v.auf ? "#ffc93d" : "#000000"); v.mat.emissiveIntensity = .4; });
  }
  function bueroTaste(art) {
    if (zustand !== "laeuft" || !verstecke.length || BU.intro > 0 || BU.ende || BU.zwischen) return;
    if (!BU.tasten) { BU.tasten = true; bueroMarkieren(); if (art === "links" || art === "rechts") return; }
    if (art === "links" || art === "rechts") {
      const d = art === "links" ? -1 : 1, n = verstecke.length;
      let i = BU.wahl;
      for (let k = 0; k < n; k++) { i = (i + d + n) % n; if (!verstecke[i].auf) break; }
      BU.wahl = i; bueroMarkieren(); T.spur();
    } else bueroOeffnen(verstecke[BU.wahl]);
  }
  function bueroTippen(e) {
    if (zustand !== "laeuft") return;
    if (!bStrahl) bStrahl = { r: new THREE.Raycaster(), v: new THREE.Vector2() };
    const rect = renderer.domElement.getBoundingClientRect();
    bStrahl.v.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    bStrahl.r.setFromCamera(bStrahl.v, kamera);
    const t = bStrahl.r.intersectObjects(verstecke.map(v => v.tuer), true)[0];
    if (!t) return;
    let o = t.object; while (o && !o.userData.versteck) o = o.parent;
    if (o) bueroOeffnen(o.userData.versteck);
  }
  function bueroOeffnen(v) {
    if (!v || v.auf || BU.gefunden || BU.erwischt || BU.intro > 0 || BU.ende || BU.zwischen) return;
    v.auf = 1; T.tuer();
    if (v === BU.versteck) { bueroGefunden(); return; }
    BU.falsch++;
    const d = Math.hypot(versteckX(v) - versteckX(BU.versteck), versteckY(v) - versteckY(BU.versteck));
    meldung(v.text, d < 1 ? "Ganz heiß! 🔥" : d < 1.9 ? "Schon warm …" : "Kalt! ❄️");
    BU.wahl = verstecke.indexOf(v); bueroMarkieren(); bueroAnzeige();
  }
  function bueroGefunden() {
    const rest = Math.max(0, BU.dauer - BU.zeit), p = Math.max(100, 300 + 30 * Math.ceil(rest) - 60 * BU.falsch);
    BU.gefunden = BU.versteck; BU.pop = .001; BU.zwischen = 2.4; bOhr.visible = false; bueroMarkieren();
    punkte += p; sternZahl += 5; T.booster(); GE.freude = .5;
    meldung(BU.falsch ? "Gefunden!" : "Gefunden, gleich beim ersten Mal!", `+${p} Punkte · +5 ★`);
    const wo = new THREE.Vector3(versteckX(BU.versteck), versteckY(BU.versteck), -.6);
    for (const farbe of ["#ffd54a", "#3baa35", "#ff7aa2"]) funkeln(wo, farbe, 8);
    bueroAnzeige(); hudZeigen();
  }
  function bueroErwischt() {
    BU.erwischt = true; BU.ende = 3.2; BU.tuer = 1;
    BU.versteck.auf = 1;                                // zeigen, wo sie war
    anke.gruppe.visible = true; T.stolpern(); wackeln = .3;
    bueroUI.classList.add("fertig");
    meldung("Erwischt! Anke ist zurück", `Fröbelinchen war ${BU.versteck.y0 > 1 ? "oben" : "unten"} im Schrank · weiter geht's`);
  }
  function bueroSchritt(dt) {
    R.zeit += dt;
    if (FL.abflug) { FL.abflug += dt; blende.style.opacity = Math.max(0, 1 - (FL.abflug - .9) / .8); if (FL.abflug > 1.7) FL.abflug = 0; }
    if (BU.blitz) { BU.blitz = Math.max(0, BU.blitz - dt); blende.style.opacity = Math.min(1, BU.blitz / .35); }
    if (BU.ausblenden) {
      BU.ausblenden += dt; blende.style.opacity = Math.min(1, BU.ausblenden / .9);
      if (BU.ausblenden >= .9) { BU.ausblenden = 0; flugLanden(); }
      return;
    }
    if (BU.ende) { BU.ende -= dt; if (BU.ende <= 0) { BU.ende = 0; BU.ausblenden = .001; T.abflug(); } return; }
    if (BU.intro > 0) {
      BU.intro -= dt;
      if (BU.intro <= 0) { BU.tuer = 0; T.tuer(); }
      return;
    }
    if (BU.zwischen) {
      BU.zwischen -= dt;
      if (BU.zwischen <= 0) {
        BU.zwischen = 0;
        if (BU.runde < BUERO_RUNDEN.length - 1) {
          BU.runde++; bueroRunde(BU.runde); BU.blitz = .35;
          meldung(`Versteck ${BU.runde + 1} von 3`, "Anke hat sie schon wieder versteckt!");
        } else {
          BU.sieg = true; BU.ende = 2.6; punkte += 1000; sternZahl += 25; T.rekord(); bueroUI.classList.add("fertig");
          meldung("Alle drei Verstecke gefunden!", "Anke staunt · +1.000 Punkte · +25 ★");
        }
      }
      return;
    }
    if (BU.gefunden) return;
    BU.zeit += dt;
    const rest = BU.dauer - BU.zeit, zx = versteckX(BU.versteck);
    // Hinweise: Kichern aus der Richtung des Verstecks, ab und zu wackelt die Tür, in der zweiten Hälfte guckt ein Ohr heraus
    BU.kichern -= dt;
    if (BU.kichern <= 0) { BU.kichern = zufall(3.2, 4.8); T.kichern(zx / Math.max(1, BU.breite / 2)); }
    BU.wackeln -= dt;
    if (BU.wackeln <= 0) { BU.wackeln = zufall(3.5, 5.5) - BU.zeit / BU.dauer * 1.5; BU.versteck.wackel = .7; }
    bOhr.visible = BU.zeit > BU.dauer * .5;
    // Ankes Schritte auf dem Flur werden lauter, kurz vorher geht die Tür einen Spalt auf
    if (rest < 6.5) { BU.schritt -= dt; if (BU.schritt <= 0) { BU.schritt = .3 + rest * .07; T.schritt(.35 + (1 - rest / 6.5) * 1.3); } }
    BU.tuer = rest < 1.4 ? .25 : 0;
    if (rest <= 0) { bueroErwischt(); return; }
    bueroAnzeige();
    hudZeigen();
  }
  function bueroBild(dt) {
    const t = performance.now() / 1000;
    for (const v of verstecke) {
      v.offen += (v.auf - v.offen) * Math.min(1, dt * 7);
      v.wackel = Math.max(0, v.wackel - dt);
      const w = v.offen * 1.95 + (v.wackel > 0 ? Math.abs(Math.sin(t * 38)) * .05 * v.wackel : 0);
      v.angel.rotation.y = v.links ? -w : w;
    }
    // Fröbelinchen hüpft aus dem Fach und freut sich
    const g = bGiraffe.gruppe;
    if (BU.pop) {
      BU.pop = Math.min(1, BU.pop + dt * 1.6); const k = BU.pop, e = 1 - Math.pow(1 - k, 3);
      g.scale.setScalar(BU.sk + (.36 - BU.sk) * e); g.position.set(0, Math.sin(k * Math.PI) * .35, .04 + e * .75);
      bGiraffe.hals.rotation.x = Math.sin(t * 12) * .12;
    } else bGiraffe.hals.rotation.x = Math.sin(t * 1.8) * .06;
    // Raumtür und Anke
    const tz = BU.tuer;
    bRaum.tuerAngel.rotation.y += ((-tz * 1.45) - bRaum.tuerAngel.rotation.y) * Math.min(1, dt * 5);
    anke.gruppe.visible = BU.intro > 0 || BU.erwischt;
    if (anke.gruppe.visible && anke.arme) {
      const [l, r] = anke.arme, winkt = BU.intro > 0;
      l.oben.rotation.set(0, 0, winkt ? 2.5 + Math.sin(t * 8) * .25 : .45); l.unten.rotation.set(0, 0, winkt ? .3 : -1.7);   // winkt bzw. Hand in die Hüfte
      r.oben.rotation.set(0, 0, winkt ? -.07 : -.45); r.unten.rotation.set(0, 0, winkt ? 0 : 1.7);
      if (anke.kopf) anke.kopf.rotation.y = winkt ? Math.sin(t * 2) * .15 : -.25;
    }
    // Kamera: alle Schränke passen ins Bild; erwischt man sich, schwenkt sie zur Tür, durch die Anke kommt
    const hoch = kamera.aspect < .8, fov = hoch ? 58 : 42, halb = Math.tan(fov * Math.PI / 360);
    const zielX = BU.erwischt || BU.intro > 0 ? 2.3 : 0, breite = (BU.erwischt || BU.intro > 0 ? 5.8 : BU.breite) + .5;
    BU.kamX += (zielX - BU.kamX) * Math.min(1, dt * 2.5);
    const abstand = Math.max(1.55 / halb, (breite / 2) / (halb * kamera.aspect));
    kamera.position.set(BU.kamX + Math.sin(t * .3) * .08, 1.25, -.96 + abstand);
    if (wackeln > 0) { wackeln = Math.max(0, wackeln - dt); kamera.position.x += (Math.random() - .5) * wackeln * .4; }
    kamera.lookAt(BU.kamX, 1.12, -.96);
    kamera.fov += (fov - kamera.fov) * Math.min(1, dt * 6); kamera.updateProjectionMatrix();
    himmelKugel.position.copy(kamera.position); sonnenBild.position.set(kamera.position.x - 85, 95, kamera.position.z + 50);
    schattenNachfuehren(0, 0);
    W.animieren(t); lichtSchritt(dt);
    teilchenSchritt(dt);
    zeichnen();
  }

  // ---------- Level 2: Luftwelt ----------
  // Ab 3000 Punkten fliegt Fröbelinchen eine Minute lang in ihrem Spielzeug-Flugzeug nach Norden (-z). Finger ziehen bzw. Pfeiltasten lenken
  // frei nach links, rechts, oben und unten. Durch Ringe fliegen gibt Punkte; Ballons, Gewitterwolken und Vögel bringen sie
  // ins Trudeln, dann holt Anja in ihrem eigenen Flieger auf (wie das Stolpern am Boden).
  // Abstand bis zur nächsten Sonderphase: die erste kommt schon nach gut einer Minute, damit jede Runde etwas erlebt. Danach alle 3000 Punkte.
  const PHASEN_ABSTAND = [1000, 1200, 2500, 2500];
  const FLUG_AB = 3000, FLUG_ERSTER = 60, FLUG_WEITERE = 30, FX = 7, FY0 = 3, FY1 = 13;   // erster Flug eine Minute, jeder weitere 30 Sekunden
  const WASSER_Y = .2;
  const SCHLITTEN_Y = 0, SCHLITTEN_ERSTE = 40, SCHLITTEN_WEITERE = 30, SCHLITTEN_GRUND = 19, SCHLITTEN_MIN = 14, SCHLITTEN_MAX = 32;   // Tempo in m/s                              // Höhe des Boots über dem Wasser (Wasser bei y = 0)
  const FL = { art: "folie", naechsteArt: "folie", phaseNr: 0, an: false, abflug: 0, x: 0, y: 7, z: 0, zx: 0, zy: 7, v: 18, neig: 0, nick: 0, naechst: 0, strecke: 0, trudeln: 0,
    regenbogen: 0, objekte: [], tasten: { x: 0, y: 0 }, ax: 0, ay: 7, ab: 3000, zeit: 0, landung: 0, rueck: 0, gewarnt: false };
  let bootSpur, schlittenSpuren = [], alleSpuren = [], spurPunkt = null;
  let FW, flieger, anjaFlieger, meer, flugGruppe, blende, strahlen, boot, anjaBoot, wasser, schlitten, anjaSchlitten, berge;
  const fahrzeug = () => FL.art === "wasser" ? boot : FL.art === "schlitten" ? schlitten : flieger;
  const anjaFahrzeug = () => FL.art === "wasser" ? anjaBoot : FL.art === "schlitten" ? anjaSchlitten : anjaFlieger;
  const WINTER = () => W.zonen.findIndex(z => z.hecke === "schnee");
  const zoneMusik = () => W.zonen[aktZone].musik ?? aktZone;
  const flugMusik = () => FL.art === "schlitten" ? 7 : FL.art === "wasser" ? 2 : 6;
  const tempoKmh = () => Math.round(FL.v * 2.6);
  function flugAufbauen(modul) {
    FW = modul.flugWelt(THREE, W);
    flieger = FW.flieger(false); anjaFlieger = FW.flieger(true); meer = FW.wolkenMeer(); flugGruppe = new THREE.Group();
    anjaFlieger.gruppe.scale.setScalar(.8);
    meer.position.y = -1.5;
    strahlen = FW.strahlen(); strahlen.visible = false; szene.add(strahlen);
    bootSpur = FW.kielwasser(); schlittenSpuren = FW.kufenspuren(); alleSpuren = [bootSpur, ...schlittenSpuren]; spurPunkt = new THREE.Vector3();
    for (const sp of alleSpuren) szene.add(sp.mesh);
    boot = FW.boot(false); anjaBoot = FW.boot(true); anjaBoot.gruppe.scale.setScalar(.85); wasser = FW.wasserFlaeche(W.wasserNormal);
    schlitten = FW.schlitten(false); anjaSchlitten = FW.schlitten(true); anjaSchlitten.gruppe.scale.setScalar(.9); berge = FW.bergkette();
    for (const o of [flieger.gruppe, anjaFlieger.gruppe, meer, flugGruppe, boot.gruppe, anjaBoot.gruppe, wasser, schlitten.gruppe, anjaSchlitten.gruppe, berge]) { o.visible = false; szene.add(o); }
    blende = document.createElement("div");
    blende.style.cssText = "position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none";
    renderer.domElement.after(blende);                  // direkt über dem Bild, Anzeigen und Meldungen bleiben darüber sichtbar
  }
  function flugStart(art) {
    FL.art = art || FL.naechsteArt; FL.an = true; R.flug = 1;
    const ski = FL.art === "schlitten", nass = FL.art === "wasser", unten = nass || ski;
    if (ski) { R.schlitten++; FL.rest = FL.ab - punkte; } else if (nass) R.boote++; else R.fluege++;
    FL.dauer = ski ? (R.schlitten === 1 ? SCHLITTEN_ERSTE : SCHLITTEN_WEITERE)
      : (nass ? R.boote : R.fluege) === 1 ? FLUG_ERSTER : FLUG_WEITERE;   // die erste Phase jeder Art eine Minute, danach 30 s
    for (const ab of abschnitte) ab.gruppe.visible = false;
    for (const o of ski ? [ferneGruppe] : [boden, ferneGruppe, W.luft]) o.visible = false;   // auf dem Schlitten bleiben Schneeboden und Schneefall
    for (const o of [fahrzeug().gruppe, anjaFahrzeug().gruppe, flugGruppe, ...(ski ? [berge] : [nass ? wasser : meer])]) o.visible = true;
    for (const sp of alleSpuren) { sp.reset(); sp.mesh.visible = sp === bootSpur ? nass : ski; }
    const y0 = ski ? SCHLITTEN_Y : nass ? WASSER_Y : 7;
    Object.assign(FL, { torX: 0, torZ: null, torSeite: 1, torNr: 0, serie: 0 });
    Object.assign(FL, { x: 0, y: y0, z: 0, zx: 0, zy: y0, v: ski ? Math.max(SCHLITTEN_GRUND, tempo) : nass ? Math.max(16, tempo) : Math.max(18, tempo), neig: 0, nick: 0, naechst: -45, strecke: 0, trudeln: 0, regenbogen: 250, ax: 0, ay: y0, zeit: 0, landung: 0, gewarnt: false });
    // Fröbelinchen sitzt im Cockpit (Beine im Rumpf versteckt), Anja genauso in ihrem rosa Flieger
    const [cy, cz, cs] = spieler.cockpit;
    fahrzeug().sitz.add(spieler.gruppe); spieler.gruppe.position.set(0, cy, cz); spieler.gruppe.rotation.set(0, 0, 0); spieler.gruppe.scale.setScalar(cs);
    spieler.koerper.position.y = 0; spieler.beine.forEach(b => { b.oben.visible = false; });
    blase.scale.setScalar(2.3 / spieler.cockpit[2]); blase.position.y = .6;
    FW.insCockpit(spieler, FL.art); const sk = spieler.gruppe.scale.x; blase.scale.setScalar(2.3 / sk); blase.position.y = (-.1 - spieler.gruppe.position.y) / sk;
    anjaFahrzeug().sitz.add(anja.gruppe); anja.gruppe.visible = true; anja.gruppe.position.set(0, -.75, .25);   // sichtbar: in der Laufwelt war sie evtl. gerade ausgeblendet anja.gruppe.rotation.set(0, 0, 0);
    anja.k.rotation.x = 0; anja.k.position.y = 0; anja.beine.forEach(b => { b.oben.visible = false; });
    FW.insCockpit(anja, FL.art);
    sternchen.forEach(st => { st.visible = false; });
    B.schubs = null; Object.assign(A, { nah: false, zeit: 0, abstand: 18, bis: 8 });
    if (ski) { const Z = W.zonen[WINTER()]; szene.fog.color.set(Z.nebel); himmelKugel.material.color.set(Z.himmel); sonne.color.set(Z.sonne); }
    else if (nass) { szene.fog.color.set("#d8ecf6"); himmelKugel.material.color.set("#ffffff"); sonne.color.set("#fff4dc"); }
    else { szene.fog.color.set("#fbe6d6"); himmelKugel.material.color.set("#fff0e4"); sonne.color.set("#ffc79a"); meer.material.color.set("#fff6ee"); }
    szene.fog.near = 55; szene.fog.far = 165;
    stimmungSetzen(); schattenF.visible = schattenA.visible = false; strahlen.visible = !unten;
    while (FL.naechst > -170) reiheNeu();
    kamPos = null; wackeln = 0;
    T.welt(); T.musik(flugMusik());
    if (ski) meldung("Schlittenfahrt!", handy ? "Zieh nach links und rechts und fahr durch die Tore" : "Lenk mit ← und → und fahr durch die Tore");
    else if (nass) meldung("Level 3: Wasserwelt", handy ? "Zieh mit dem Finger nach links und rechts" : "Lenk mit ← und →");
    else meldung("Level 2: Luftwelt", handy ? "Zieh mit dem Finger, um zu fliegen" : "Lenk mit den Pfeiltasten");
  }
  function flugAus() {
    if (!FW) return;
    if (FL.an) {
      szene.add(spieler.gruppe, anja.gruppe); FW.ausCockpit(spieler); FW.ausCockpit(anja);
      spieler.gruppe.position.set(0, 0, 0); spieler.gruppe.rotation.set(0, 0, 0); spieler.beine.forEach(b => { b.oben.visible = true; });
      anja.gruppe.position.set(0, 0, 0); anja.gruppe.rotation.set(0, 0, 0); anja.beine.forEach(b => { b.oben.visible = true; });
      spieler.gruppe.scale.setScalar(1); blasePassen(1);
      for (const o of [boden, ferneGruppe]) o.visible = true;
      W.luft.visible = qualitaet < 3;
      szene.fog.near = 45; szene.fog.far = 120;
    }
    for (const o of FL.objekte) { flugGruppe.remove(o.mesh); W.entsorgen(o.mesh); }
    for (const o of [flieger.gruppe, anjaFlieger.gruppe, meer, flugGruppe, strahlen, boot.gruppe, anjaBoot.gruppe, wasser, schlitten.gruppe, anjaSchlitten.gruppe, berge]) o.visible = false;
    for (const sp of alleSpuren) sp.mesh.visible = false;
    FL.objekte = []; FL.an = false; FL.abflug = 0; FL.landung = 0; blende.style.opacity = 0;
  }
  // Nach einer Minute: weiß überblenden und in der Laufwelt auf einem neuen Wegstück weiterrennen
  function flugLanden() {
    duellAus(); folieAus(); bueroAus(); flugAus();
    for (const ab of abschnitte) { szene.remove(ab.gruppe); W.entsorgen(ab.gruppe); }
    abschnitte = []; hindernisse = []; sterne = []; booster = [];
    startNr = S.idx + 1;
    Object.assign(S, { idx: startNr, s: 0, spur: 0, x: 0, y: 0, vy: 0, duck: 0, abbiegen: 0, stolper: 0, sprungPuffer: 0, eis: 0, lande: 0 });
    while (abschnitte.length < 4) abschnittNeu();
    aktZone = abschnitte[0].zone; W.zoneWechsel(aktZone, true); stimmungSetzen();
    Object.assign(A, { nah: false, zeit: 0, abstand: 18, bis: 8 });
    kamYaw = 0; kamPos = null;
    const warSki = FL.art === "schlitten";
    if (!warSki) FL.phaseNr++;
    const bisNaechste = warSki ? Math.max(500, Math.round(FL.rest)) : PHASEN_ABSTAND[FL.phaseNr] ?? FLUG_AB;
    FL.ab = Math.floor(punkte) + bisNaechste;      // gezählt werden die zu Fuß gesammelten Punkte
    const FOLGE = ["folie", "luft", "wasser", "duell", "buero"], warNass = FL.art === "wasser", warDuell = FL.art === "duell" || FL.art === "folie" || FL.art === "buero";
    if (!warSki) FL.naechsteArt = FOLGE[(FOLGE.indexOf(FL.art) + 1) % FOLGE.length];
    FL.schlittenBei = 0;
    FL.rueck = .001; blende.style.opacity = 1;
    T.welt(); T.musik(zoneMusik());
    meldung(warSki ? "Unten angekommen!" : warDuell ? "Weiter geht's!" : warNass ? "Wieder an Land!" : "Gelandet!",
      `${W.zonen[aktZone].name} · ${{ luft: "nächster Flug", wasser: "Bootsfahrt", duell: "Kissenschlacht", folie: "Einpacken", buero: "Ankes Büro" }[FL.naechsteArt]} in ${bisNaechste.toLocaleString("de-DE")} Punkten`);
  }

  // Eine „Reihe“ im Himmel: Ring mit Sternenspur, Sternenbogen oder Hindernisse; dazu Inseln und Wolken am Rand
  function flugObjekt(typ, mesh, x, y, z, mehr = {}) {
    mesh.position.set(x, y, z); flugGruppe.add(mesh);
    const o = { typ, mesh, x, y, z, y0: y, ph: Math.random() * 6, weg: false, getroffen: false, ...mehr };
    FL.objekte.push(o); return o;
  }
  function flugStern(x, y, z) { const m = W.stern(); m.scale.setScalar(1.3);   // in der Luftwelt Sterne: vor dem hellen Himmel besser zu sehen als Törtchen
    return flugObjekt("stern", m, x, y, z); }
  // Eine Reihe auf dem Wasser: Sternenspur oder Pylonen (als Reihe mit Lücke oder als kleine Gruppe), Booster, Inseln und Bojen am Rand
  function reiheWasser() {
    const z = FL.naechst, schwer = Math.min(1, FL.strecke / 3000 + schwerStufe() * .1), Y = WASSER_Y + .9;
    const rx = () => zufall(-FX + 1, FX - 1), klemmX = (x) => Math.max(-FX, Math.min(FX, x));
    if (Math.random() < .35) {
      const x0 = rx(), w = zufall(0, 6), welle = Math.random() < .55;
      for (let i = 0; i < 7; i++) flugStern(welle ? klemmX(x0 + Math.sin(w + i * .7) * 2.6) : x0, Y, z - i * 2.6);
    } else if (Math.random() < .5 + schwer * .2) {
      // locker verteilte Pylonen statt einer Wand: 2–3 Stück mit mindestens 4 m Abstand und leicht versetzt, es gibt immer mehrere Durchfahrten
      const reihen = 1 + (Math.random() < schwer * .5 ? 1 : 0);
      for (let j = 0; j < reihen; j++) {
        const zr = z - j * 15, n = 2 + (Math.random() < .3 + schwer * .4 ? 1 : 0), xs = [];
        for (let v = 0; v < 40 && xs.length < n; v++) { const x = zufall(-FX + .5, FX - .5); if (xs.every(a => Math.abs(a - x) >= 4)) xs.push(x); }
        xs.sort((a, b) => a - b).forEach(x => flugObjekt("pylon", FW.pylone(), x, 0, zr - zufall(0, 2.5), { r: 1.15, tiefe: .8 }));
        const rand = [-FX, ...xs, FX]; let lx = 0, lb = 0;          // Belohnung in der breitesten Lücke
        for (let i = 0; i < rand.length - 1; i++) if (rand[i + 1] - rand[i] > lb) { lb = rand[i + 1] - rand[i]; lx = (rand[i] + rand[i + 1]) / 2; }
        flugStern(lx, Y, zr + 3);
      }
    } else {
      const n = 2 + Math.floor(Math.random() * (2 + schwer * 2));
      for (let i = 0; i < n; i++) flugObjekt("pylon", FW.pylone(), rx(), 0, z - i * zufall(3, 6), { r: 1.15, tiefe: .8 });
    }
    if (Math.random() < .14) {
      const typ = flugBooster(), m = W.booster(typ); m.scale.setScalar(1.5);
      flugObjekt("booster", m, rx(), Y + .2, z - 9, { art: typ });
    }
    for (const seite of [-1, 1]) {
      if (Math.random() < .4) flugObjekt("deko", FW.insel(true), seite * zufall(14, 34), -.12, z + zufall(-8, 8));
      if (Math.random() < .5) flugObjekt("deko", FW.boje(), seite * zufall(FX + 2.5, FX + 8), 0, z + zufall(-8, 8), { boje: true });
    }
    if (-z > FL.regenbogen) { FL.regenbogen += 1600; flugObjekt("deko", FW.regenbogen(), 0, -2, z - 60); }
    FL.naechst -= Math.max(14, FL.v) + zufall(2, 8) * (1.2 - schwer);
  }
  // Eine Reihe am Hang: Slalomtor abwechselnd links und rechts, Sterne auf der Linie dorthin, Schneemänner neben der Linie
  function reiheSchlitten() {
    const z = FL.naechst, schwer = Math.min(1, FL.strecke / 2500 + schwerStufe() * .1), Y = .9;
    const b = 4.2 - schwer, grenze = FX - b / 2 - .3;
    FL.torSeite = -FL.torSeite; FL.torNr++;
    const x = FL.torSeite * zufall(1.2, grenze), blau = FL.torNr % 2 === 0;
    const vorX = FL.torX, vorZ = FL.torZ ?? z + 20;
    flugObjekt("tor", FW.tor(blau, b), x, 0, z, { b, blau });
    if (Math.random() < .65) for (let i = 1; i <= 3; i++) { const f = i / 4; flugStern(vorX + (x - vorX) * f, Y, vorZ + (z - vorZ) * f); }
    if (Math.random() < .2 + schwer * .35) {           // wer zu weit ausholt, fährt in den Schneemann
      const mx = (vorX + x) / 2 + wahl([-1, 1]) * zufall(2.6, 3.6);
      if (Math.abs(mx) < FX - .5) flugObjekt("schneemann", W.schneemann(), mx, 0, (vorZ + z) / 2, { r: 1, tiefe: .8 });
    }
    if (Math.random() < .1) {
      const typ = flugBooster(), m = W.booster(typ); m.scale.setScalar(1.5);
      flugObjekt("booster", m, (vorX + x) / 2, Y + .2, (vorZ + z) / 2 - 3, { art: typ });
    }
    for (const seite of [-1, 1]) {                     // Tannenwald am Pistenrand
      for (let i = 0; i < 2; i++) if (Math.random() < .75) flugObjekt("deko", W.tanne(), seite * zufall(FX + 2.5, FX + 18), 0, z + zufall(-10, 10));
      if (Math.random() < .08) flugObjekt("deko", W.schneemann(), seite * zufall(FX + 2, FX + 6), 0, z + zufall(-8, 8));
    }
    for (let i = 0; i < 4; i++) {
      const bx = zufall(-FX - 12, FX + 12);
      if (Math.abs(bx) > 2.5 || Math.random() < .3) flugObjekt("deko", FW.buckel(), bx, -.1, z + zufall(-10, 10));
    }
    FL.torX = x; FL.torZ = z;
    FL.naechst -= Math.max(18, FL.v * 1.2) + zufall(0, 4) * (1.2 - schwer);
  }
  function torPruefen(o, faktor, unverwundbar) {
    const dx = Math.abs(FL.x - o.x);
    if (dx < o.b / 2 - .3) {                            // sauber durchs Tor: Punkte und mehr Tempo
      R.tore++; FL.serie++; FL.v = Math.min(SCHLITTEN_MAX, FL.v + 1.6);
      const p = (15 + 5 * Math.min(FL.serie, 5)) * faktor; punkte += p;
      T.ring(); funkeln(new THREE.Vector3(o.x, 1.2, o.z), o.blau ? "#7ab8ff" : "#ff8a80", 12); o.puls = .4;
      if (FL.serie % 5 === 0) meldung(`${FL.serie} Tore am Stück!`, `+${p} Punkte · Tempo ${tempoKmh()} km/h`);
    } else if (dx < o.b / 2 + .45 && !unverwundbar) {   // Fahne gestreift
      FL.serie = 0; FL.v = Math.max(SCHLITTEN_MIN, FL.v - 3); flugTreffer({ typ: "fahne" });
    } else {                                            // am Tor vorbei: kostet Tempo
      FL.serie = 0; FL.v = Math.max(SCHLITTEN_MIN, FL.v - 3.5); meldung("Tor verpasst!", "Das kostet Tempo");
    }
  }
  function reiheNeu() {
    if (FL.art === "schlitten") { reiheSchlitten(); return; }
    if (FL.art === "wasser") { reiheWasser(); return; }
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
      const typ = flugBooster(), m = W.booster(typ); m.scale.setScalar(1.5);
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
    if (Math.random() < .09) {                         // Fröbel-Banner zwischen zwei Heißluftballons, am Rand
      const g = new THREE.Group(), seite = wahl([-1, 1]);
      for (const s of [-1, 1]) { const b = FW.heissluftballon(); b.position.x = s * 4.6; g.add(b); }
      const ban = W.froebelBanner(7.6, 1.45); ban.position.y = -2.6; g.add(ban);
      const seile = new THREE.BufferGeometry().setFromPoints([-1, 1].flatMap(s => [new THREE.Vector3(s * 4.6, -1.9, 0), new THREE.Vector3(s * 3.75, -1.88, 0)]));
      g.add(new THREE.LineSegments(seile, new THREE.LineBasicMaterial({ color: "#5a4632" })));
      flugObjekt("deko", g, seite * zufall(13, 19), zufall(5, 12), z - 12);
    }
    if (Math.random() < .12) flugObjekt("durch", FW.wolkenBallen(), rx(), ry(), z - 22);   // Wolke zum Durchfliegen
    if (-z > FL.regenbogen) { FL.regenbogen += 1600; flugObjekt("deko", FW.regenbogen(), 0, -8, z - 60); }
    FL.naechst -= Math.max(16, FL.v * 1.05) + zufall(2, 9) * (1.2 - schwer);
  }

  function flugTreffer(o) {
    if (RE.schutz > 0) return;
    komboWeg();
    if (R.anjaPhase || (A.nah && A.abstand < 7)) { verlieren(o.typ === "gewitter" ? `Blitz und Donner, ${JAGD()} hat dich!` : `${JAGD()} hat dich eingeholt!`, "anja"); return; }
    FL.trudeln = .8; FL.v = Math.max(16, FL.v * .85);
    wackeln = .35; T.stolpern(); if (navigator.vibrate) navigator.vibrate(40);
    if (A.nah) meldung({ ballon: "Bumm, ein Ballon!", gewitter: "Blitz und Donner!", voegel: "Huch, Vögel!", pylon: "Bumm, eine Pylone!", fahne: "Autsch, die Fahne!", schneemann: "Bumm, ein Schneemann!" }[o.typ], `Pass auf, ${JAGD()} ist ganz nah!`);
    anjaKommt(6);
  }
  function flugSchritt(dt) {
    R.zeit += dt; FL.zeit += dt; rekordPruefen(); anjaPhasePruefen();
    if (!FL.gewarnt && FL.zeit >= FL.dauer - 4) { FL.gewarnt = true; FL.art === "wasser" ? meldung("Gleich geht's an Land!", "Noch ein paar Sterne mitnehmen") : FL.art === "schlitten" ? meldung("Gleich ist der Hang zu Ende!", "Noch ein paar Tore mitnehmen") : meldung("Gleich wird gelandet!", "Noch ein paar Ringe mitnehmen"); }
    if (FL.zeit >= FL.dauer && !FL.landung) { FL.landung = .001; T.abflug(); }
    if (FL.landung) {
      FL.landung += dt; blende.style.opacity = Math.min(1, FL.landung / .9);
      if (FL.landung >= .9) { flugLanden(); return; }
    }
    if (FL.art === "schlitten") FL.v += (SCHLITTEN_GRUND - FL.v) * .05 * dt;   // ohne Tore wird der Schlitten langsam wieder gemütlicher
    else FL.v = Math.min(FL.art === "wasser" ? 25 : 30, FL.v + .15 * dt);
    for (const k of ["schild", "ruhe", "magnet", "doppelt"]) B[k] = Math.max(0, B[k] - dt);
    const faktor = B.doppelt > 0 ? 2 : 1, unverwundbar = B.schild > 0 || FL.abflug > 0 || FL.landung > 0;
    tempoPruefen();
    const v = FL.v * tempoFaktor() * (FL.trudeln > 0 ? .75 : 1);
    const zAlt = FL.z;
    FL.z -= v * dt; strecke += v * dt; FL.strecke += v * dt; punkte += v * dt * faktor;
    if (FL.abflug) {                                     // Blende wieder ausblenden
      FL.abflug += dt; blende.style.opacity = Math.max(0, 1 - (FL.abflug - .9) / .8);
      if (FL.abflug > 1.7) FL.abflug = 0;
    } else if (!FL.landung) { FL.nebel = Math.max(0, (FL.nebel || 0) - dt * 1.1); blende.style.opacity = FL.nebel; }   // in der Wolke kurz alles weiß
    // Lenken: das Ziel wandert mit den Tasten (der Finger setzt es direkt), das Flugzeug gleitet hinterher und legt sich in die Kurve
    FL.zx = Math.max(-FX, Math.min(FX, FL.zx + FL.tasten.x * 10 * dt));
    if (FL.art === "wasser") FL.zy = WASSER_Y;           // auf dem Wasser nur links und rechts
    else if (FL.art === "schlitten") FL.zy = SCHLITTEN_Y;
    else FL.zy = Math.max(FY0, Math.min(FY1, FL.zy + FL.tasten.y * 8 * dt));
    const ax = FL.x, ay = FL.y, k = Math.min(1, dt * (FL.trudeln > 0 ? 2.5 : 5));
    FL.x += (FL.zx - FL.x) * k; FL.y += (FL.zy - FL.y) * k;
    FL.neig += (Math.max(-.5, Math.min(.5, -(FL.x - ax) / dt * .09)) - FL.neig) * Math.min(1, dt * 6);
    FL.nick += (Math.max(-.4, Math.min(.4, (FL.y - ay) / dt * .06)) - FL.nick) * Math.min(1, dt * 6);
    FL.trudeln = Math.max(0, FL.trudeln - dt);
    while (FL.naechst > FL.z - 170) reiheNeu();

    const einsammeln = (o) => {
      o.weg = true; o.mesh.visible = false; sternZahl++; punkte += 10 * faktor * kombo(); funkeln(o.mesh.position, "#ffe066", 8);
      T.stern(sternZahl); GE.freude = .35; hud.classList.remove("hupf"); void hud.offsetWidth; hud.classList.add("hupf");
    };
    for (const o of FL.objekte) {
      if (o.vx) { o.x += o.vx * dt; o.mesh.position.x = o.x; }
      if (o.typ === "ballon") { o.y = o.y0 + Math.sin(R.zeit * .8 + o.ph) * .6; o.mesh.position.y = o.y; }
      if (o.boje && !o.gelaeutet && o.z > FL.z - 16) { o.gelaeutet = true; T.glocke(Math.sign(o.x - FL.x)); }
      if (o.typ === "pylon" || o.boje) o.mesh.position.y = Math.sin(R.zeit * 2.2 + o.ph) * .06;   // schaukeln auf den Wellen
      if (o.weg || o.typ === "deko") continue;
      if (o.typ === "durch") {
        if (Math.abs(o.z - FL.z) < 3 && Math.hypot(o.x - FL.x, o.y - FL.y) < 5) { o.weg = true; FL.nebel = .6; }
        continue;
      }
      const dz = o.z - FL.z, abst = Math.hypot(o.x - FL.x, o.y - FL.y);
      if (o.typ === "stern") {
        if (B.magnet > 0 && dz > -12 && dz < 1) { if (dz > -1.5) einsammeln(o); else o.zieht = true; continue; }
        // Trefferzone wie das Flugzeug: Rumpf, die ganze Spannweite der Flügel und Kopf/Hals über dem Cockpit.
        // Geprüft wird die ganze Strecke seit dem letzten Bild, damit bei hohem Tempo kein Stern durchrutscht.
        const dx = Math.abs(o.x - FL.x), dy = o.y - FL.y, durch = dz > -1.2 && o.z < zAlt + 1.2;
        const trifft = abst < 1.5 || (FL.art === "luft" && ((dx < 2.8 && dy > -.8 && dy < .7) || (dx < .9 && dy > -.2 && dy < 2.4)));
        if (durch && trifft) einsammeln(o);
      } else if (o.typ === "ring") {
        if (o.z <= zAlt && o.z > FL.z) {                 // genau beim Durchfliegen prüfen
          o.weg = true;
          if (abst < 1.55) { R.ringe++; punkte += 25 * faktor; T.ring(); funkeln(o.mesh.position, "#ffcc33", 16); o.puls = .4; meldung("Durch den Ring!", `+${25 * faktor} Punkte`); }
        }
      } else if (o.typ === "tor") {
        if (o.z <= zAlt && o.z > FL.z) { o.weg = true; torPruefen(o, faktor, unverwundbar); if (zustand !== "laeuft") return; }
      } else if (o.typ === "booster") {
        if (Math.abs(dz) < 1.3 && abst < 1.7) {
          o.weg = true; o.mesh.visible = false; boosterNehmen(o.art);
          funkeln(o.mesh.position, BOOSTER_FUNKEN[o.art], 18);
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
    if (R.anjaPhase) { A.nah = true; A.zeit = 99; }
    if (A.nah) { A.zeit -= dt; if (A.zeit <= 0) { A.nah = false; A.bis = zufall(15, 22) - schwerStufe() * 2.5; } }
    A.abstand += ((A.nah ? 6 : 22) - A.abstand) * Math.min(1, dt * (A.nah ? 1.4 : .5));
    hudZeigen();
  }

  function flugBild(dt) {
    const fang = zustand === "fang" && schlussSzene && schlussSzene.art === "anja", t = performance.now() / 1000;
    const ski = FL.art === "schlitten", nass = FL.art === "wasser" || ski, fzg = fahrzeug(), afz = anjaFahrzeug(), fg = fzg.gruppe;
    const wackel = FL.trudeln > 0 ? Math.sin(FL.trudeln * 22) * (nass ? .25 : .45) : 0;
    if (ski) {                                          // Schlitten: rumpelt leicht über den Schnee und legt sich in die Kurve
      fg.position.set(FL.x, FL.y + Math.abs(Math.sin(t * 9)) * .025, FL.z);
      fg.rotation.set(-.04, FL.neig * .5, FL.neig * .35 + wackel);
    } else if (nass) {                                  // Boot: schaukelt auf den Wellen und legt sich leicht in die Kurve
      fg.position.set(FL.x, FL.y + Math.sin(t * 3) * .05, FL.z);
      fg.rotation.set(Math.sin(t * 2.1) * .04 - .03, 0, FL.neig * .45 + Math.sin(t * 1.7) * .03 + wackel);
    } else {
      fg.position.set(FL.x, FL.y + Math.sin(t * 2) * .08, FL.z);
      fg.rotation.set(FL.nick, 0, FL.neig + wackel);
    }
    fzg.propeller.rotation.z += dt * 38;
    spieler.hals.rotation.x = Math.sin(t * 1.6) * .07;
    spieler.schwanz.rotation.z = Math.sin(t * 3) * .3;
    blase.visible = B.schild > 0 && (B.schild > 1 || Math.floor(B.schild * 8) % 2 === 0);
    // Anjas Flieger folgt mit etwas Verzögerung, beim Fangen fliegt sie direkt daneben
    FL.ax += ((fang ? FL.x + 3 : FL.x + (FL.x > 2 ? -4.2 : 4.2)) - FL.ax) * Math.min(1, dt * 1.5);
    FL.ay += ((fang || nass ? FL.y : FL.y - 1.3) - FL.ay) * Math.min(1, dt * 1.5);
    const ag = afz.gruppe;
    const hinten = (nass ? 3 : 1.8) + A.abstand * .45;   // gestaucht, damit ihr Fahrzeug nie direkt vor der Kamera hängt
    ag.visible = hinten < 8.5;
    ag.position.set(FL.ax, FL.ay + Math.sin(t * 2.3) * .1, FL.z + hinten);
    ag.rotation.set(0, 0, (FL.x - FL.ax) * -.08);
    afz.propeller.rotation.z += dt * 40;
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
      else if (o.typ === "tor") {
        o.mesh.userData.fahnen.forEach((f, i) => { f.rotation.x = Math.sin(t * 6 + o.ph + i) * .12; });
        if (o.puls) { o.puls = Math.max(0, o.puls - dt); o.mesh.scale.setScalar(1 + Math.sin(o.puls / .4 * Math.PI) * .15); }
      }
    }
    // Wolkenmeer bzw. Wasser und Himmel wandern mit, das Muster bleibt am Ort
    if (ski) { W.bodenFolgen(FL.x, FL.z); berge.position.set(FL.x * .6, -34, FL.z - 215); }
    else if (FL.art === "wasser") { wasser.position.set(FL.x, 0, FL.z); wasser.userData.wellen.offset.set(FL.x * 80 / 600 + t * .02, -FL.z * 80 / 600 + t * .013); wasser.userData.farben.offset.set(FL.x * 5 / 600, -FL.z * 5 / 600); wasser.userData.funkel.offset.set(FL.x * 16 / 600 - t * .012, -FL.z * 16 / 600 + t * .017); }
    else { FW.luftSchritt(t); meer.position.set(FL.x, -1.5, FL.z); FW.wolkenBild.offset.set(FL.x * 12 / 500, -FL.z * 12 / 500); }
    schattenNachfuehren(FL.x, FL.z);

    // Kamera hinter dem Flugzeug, etwas erhöht; beim Fangen langsam herum
    if (fang) kamYaw += dt * .9; else kamYaw = 0;
    const sin = Math.sin(kamYaw), cos = Math.cos(kamYaw), hoch = kamera.aspect < .8;
    const rad = fang ? 13 : 10;
    const ziel = new THREE.Vector3(FL.x * .75 + sin * rad, FL.y + (hoch ? 3.8 : 2.9) + (ski ? 1.1 : nass ? .6 : 0), FL.z + cos * (hoch ? rad + 2 : rad + .5));
    if (!kamPos) kamPos = ziel.clone(); else kamPos.lerp(ziel, Math.min(1, dt * 6));
    kamera.position.copy(kamPos);
    if (wackeln > 0) { wackeln = Math.max(0, wackeln - dt); kamera.position.x += (Math.random() - .5) * wackeln * .6; kamera.position.y += (Math.random() - .5) * wackeln * .4; }
    kamera.lookAt(FL.x * .85 - sin * 10, FL.y + (ski ? -.6 : nass ? .9 : .4), FL.z - cos * 10);   // am Hang geht der Blick bergab
    const tempoFahrt = zustand !== "laeuft" ? 0 : Math.max(0, Math.min(1, ski ? (FL.v - 14) / 18 : nass ? (FL.v - 13) / 20 : (FL.v - 16) / 22)); tempoZiel = tempoFahrt;
    kamera.fov += (((hoch ? 72 : 62) + tempoFahrt * 6) - kamera.fov) * Math.min(1, dt * 3); kamera.updateProjectionMatrix();
    himmelKugel.position.copy(kamera.position); wolkenGruppe.position.set(kamera.position.x, 0, kamera.position.z);
    if (nass) sonnenBild.position.set(kamera.position.x - 85, 95, kamera.position.z + 50);   // Mittagssonne wie in der Laufwelt
    else { sonnenBild.position.set(kamera.position.x - 55, 26, kamera.position.z - 150); strahlen.position.copy(sonnenBild.position); }   // tief stehende Abendsonne vorn
    // Kondensstreifen an den Flügelspitzen
    if ((FL.dampfTakt = (FL.dampfTakt || 0) - dt) <= 0 && zustand === "laeuft" && qualitaet < 3) {
      FL.dampfTakt = nass ? .07 : .035;
      for (const sx of nass ? [-.55, .55] : [-2.5, 2.5]) {       // in der Luft Kondensstreifen, auf dem Wasser Gischt hinter dem Boot
        const d = teilchenHolen("dampf"); d.position.copy(fg.localToWorld(new THREE.Vector3(sx, nass ? 0 : -.15, nass ? 1.6 : .4)));
        if (nass) d.position.y = .12;
        d.scale.setScalar(.3); szene.add(d);
        teilchen.push({ k: d, v: new THREE.Vector3(nass ? sx * 1.2 : 0, 0, 0), t: 0, dauer: nass ? .32 : .7, wachsen: nass ? .9 : .9, alpha: nass ? .4 : .55 });
      }
    }
    if (FL.art === "wasser") FW.bojenBlinken(t);
    if (FL.art === "wasser") bootSpur.schritt(fg.localToWorld(spurPunkt.set(0, 0, 1.75)));
    else if (ski) schlittenSpuren.forEach((sp, i) => sp.schritt(fg.localToWorld(spurPunkt.set(i ? .46 : -.46, 0, 1.3))));
    if (ski) W.wetterSchritt(dt, kamera.position, t);
    gesicht(dt, .4);
    W.animieren(t); lichtSchritt(dt);
    teilchenSchritt(dt);
    zeichnen();
  }
}
