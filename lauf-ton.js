// Töne für „Fröbelinchen rennt“: alle Geräusche und die Musik werden im Browser erzeugt (Web Audio), keine Dateien.
// Der Ton startet erst nach einer Berührung oder einem Klick (Vorgabe der Browser, vor allem auf dem iPhone).
export function ton() {
  let ctx = null, haupt, musikBus, effektBus, rauschPuffer = null;
  let an = true;
  try { an = localStorage.getItem("froebelinchen-ton") !== "aus"; } catch (e) {}

  function start() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      ctx = new AC(); graphBauen(); weckLaden();
    }
    if (ctx.state === "suspended") ctx.resume();
  }
  function umschalten() {
    an = !an;
    try { localStorage.setItem("froebelinchen-ton", an ? "an" : "aus"); } catch (e) {}
    if (haupt) haupt.gain.setTargetAtTime(an ? .8 : 0, ctx.currentTime, .05);
    return an;
  }
  const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

  // Ein einzelner Ton mit kurzer Hüllkurve
  function note(f, start, dauer, { typ = "triangle", laut = .3, bus = effektBus, gleit = 0, attack = .005 } = {}) {
    if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = typ; o.frequency.setValueAtTime(f, start);
    if (gleit) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * gleit), start + dauer);
    g.gain.setValueAtTime(0, start); g.gain.linearRampToValueAtTime(laut, start + attack);
    g.gain.exponentialRampToValueAtTime(.0008, start + dauer);
    o.connect(g); g.connect(bus); o.start(start); o.stop(start + dauer + .02);
  }
  function rauschen(start, dauer, { laut = .2, filter = 3000, bus = effektBus, typ = "bandpass" } = {}) {
    if (!ctx) return;
    const q = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    q.buffer = rauschPuffer; f.type = typ; f.frequency.value = filter;
    g.gain.setValueAtTime(laut, start); g.gain.exponentialRampToValueAtTime(.0008, start + dauer);
    q.connect(f); f.connect(g); g.connect(bus); q.start(start); q.stop(start + dauer + .02);
  }
  const jetzt = () => (ctx ? ctx.currentTime : 0);

  // ---------- Geräusche ----------
  const sfx = {
    sprung() { const t = jetzt(); note(330, t, .22, { typ: "square", laut: .08, gleit: 2.2 }); },
    ducken() { const t = jetzt(); note(500, t, .15, { typ: "sine", laut: .12, gleit: .5 }); },
    spur() { const t = jetzt(); rauschen(t, .08, { laut: .07, filter: 2500 }); },
    stern(n = 0) { const t = jetzt(), b = 84 + (n % 4) * 2; note(hz(b), t, .12, { typ: "sine", laut: .14 }); note(hz(b + 7), t + .06, .18, { typ: "sine", laut: .12 }); },
    booster() { const t = jetzt(); [72, 76, 79, 84].forEach((m, i) => note(hz(m), t + i * .06, .2, { typ: "square", laut: .07 })); },
    stolpern() { const t = jetzt(); note(140, t, .25, { typ: "sine", laut: .35, gleit: .5 }); rauschen(t, .18, { laut: .15, filter: 800 }); },
    anja() { const t = jetzt(); for (let i = 0; i < 2; i++) { note(hz(81), t + i * .36, .16, { typ: "square", laut: .07 }); note(hz(76), t + i * .36 + .18, .16, { typ: "square", laut: .07 }); } },
    schritt(laut) { const t = jetzt(); rauschen(t, .05, { laut: .12 * laut, filter: 600, typ: "lowpass" }); note(90, t, .06, { typ: "sine", laut: .12 * laut }); },
    folie() { const t = jetzt(); rauschen(t, .1, { laut: .22, filter: 5200 }); rauschen(t + .05, .07, { laut: .14, filter: 7800 }); note(620 + Math.random() * 180, t, .07, { typ: "sine", laut: .05 }); },
    schubs() { const t = jetzt(); note(220, t, .45, { typ: "sine", laut: .3, gleit: 3 }); note(160, t + .25, .35, { typ: "triangle", laut: .2, gleit: .4 }); },
    ring() { const t = jetzt(); rauschen(t, .25, { laut: .08, filter: 1800, typ: "bandpass" }); [79, 84, 88].forEach((m, i) => note(hz(m), t + i * .05, .3, { typ: "sine", laut: .11 })); },
    abflug() { const t = jetzt(); note(140, t, 1.4, { typ: "sawtooth", laut: .05, gleit: 2.5 }); rauschen(t, 1.2, { laut: .07, filter: 900, typ: "lowpass" }); },
    welt() { const t = jetzt(); [79, 83, 86, 91].forEach((m, i) => note(hz(m), t + i * .09, .5, { typ: "sine", laut: .09 })); },
    ende() { const t = jetzt(); [72, 67, 64, 60].forEach((m, i) => note(hz(m), t + i * .14, .3, { typ: "triangle", laut: .14 })); },
    rekord() { const t = jetzt(); [72, 76, 79, 84, 79, 84, 88].forEach((m, i) => note(hz(m), t + i * .1, .25, { typ: "square", laut: .06 })); },
    knall() { const t = jetzt(); rauschen(t, .3, { laut: .3, filter: 400, typ: "lowpass" }); note(90, t, .3, { typ: "sine", laut: .4, gleit: .4 }); },
  };

  // ---------- Musik ----------
  // Jede Welt hat ein eigenes Stück aus zwei Teilen (A und B, je 4 Takte), gespielt als A A B A.
  // Melodien in Tonstufen der Tonart: 1–7, ' = eine Oktave höher, , = eine tiefer, - = Ton halten, . = Pause; jedes Zeichen ist eine Achtel.
  // Akkorde als Stufen (I, ii, IV …), die Begleitung ergibt sich daraus. Bass und Schlagzeug als 16tel-Muster je Takt.
  const DUR = [0, 2, 4, 5, 7, 9, 11], MOLL = [0, 2, 3, 5, 7, 8, 10];
  const ROEM = ["I", "II", "III", "IV", "V", "VI", "VII"];
  const TROMMEL = {
    pop: { k: "X.......X.x.....", s: "....X.......X...", h: "x.x.x.x.x.x.x.x." },
    land: { k: "X.......X.......", s: "....X.......X...", h: "x.x.x.x.x.x.x.x." },
    besen: { k: "X...........x...", r: "....x.......x...", sh: "x.xxx.xxx.xxx.xx" },
    leicht: { k: "X.......X.......", r: "....x.......x...", h: "..x...x...x...x." },
    flug: { k: "X...X...X...X...", s: "....X.......X...", h: "xxXxxxXxxxXxxxXx" },
    schlitten: { k: "X.......X.......", s: "....X.......X...", b: "x.x.X.x.x.x.X.x." },
    winter: { k: "X...........x...", b: "..x...x...x...x." },
    dschungel: { k: "X.....x...X.....", c: "..x.X..x..x.x..X", t: "...........x..x.", sh: "x.x.x.x.x.x.x.x." },
  };
  const STUECKE = [
    { name: "Kita-Garten", bpm: 112, ton: 60, swing: .1, melodie: "keys", begleit: "arp", arpKlang: "zupf", bass: "R.......F...R.F.", trommel: "pop",
      akk: { A: "I vi IV V", B: "IV V I vi" },
      mel: { A: "5 . 3 5 1' - 7 . | 6 - 1' - 3' - 2' 1' | 1' . 6 . 4 6 5 4 | 5 - - - 2 - . .",
        B: "6 . 6 1' 6 . 5 4 | 5 . 5 7 2' - 1' 7 | 1' - 5 - 3 5 6 7 | 1' - - - . . . ." } },
    { name: "Bauernhof", bpm: 124, ton: 55, swing: .18, melodie: "banjo", begleit: "boomchick", arpKlang: "banjo", bass: "R.......F.......", trommel: "land",
      akk: { A: "I IV I V", B: "IV I V I" },
      mel: { A: "1 2 3 5 3 . 1 . | 4 . 6 . 1' 6 4 . | 3 . 5 3 2 . 1 . | 2 - 5, - 7, . 2 .",
        B: "6 . 6 5 4 . 6 . | 5 . 3 . 1 . 3 5 | 2' . 7 . 5 6 7 . | 1' - - - . . . ." } },
    { name: "Am See", bpm: 92, ton: 65, swing: .12, melodie: "floete", begleit: "arp", arpKlang: "zupf", arpOkt: -1, pad: true, bass: "R...........F...", bassKlang: "bassWeich", trommel: "besen",
      akk: { A: "I vi ii V", B: "IV iii ii V" },
      mel: { A: "3 - - 2 1 - 5, - | 6, - 1 - 3 - - - | 4 - 3 2 6 - 4 - | 5 - - - - . . .",
        B: "4 - 6 - 1' - 6 5 | 3 - 5 - 7 - 5 - | 6 - 4 - 2 - 4 6 | 5 - - - 7, - 2 -" } },
    { name: "Herbstwald", bpm: 100, ton: 57, moll: true, swing: .08, melodie: "floete", begleit: "arp", arpKlang: "zupf", bass: "R.....O.F.....R.", bassKlang: "bassWeich", trommel: "leicht",
      akk: { A: "i VI III VII", B: "iv i v VI" },
      mel: { A: "5 - 3 - 1 - 3 5 | 6 - - 5 6 - 1' - | 7 - 5 - 3 - 5 7 | 2' - 1' 7 5 - - -",
        B: "4 - 6 - 1' - 6 4 | 3 - 5 - 1' - - - | 2 - 5 - 7 - 5 2 | 1 - 3 - 6 - - -" } },
    { name: "Laternenfest", bpm: 84, ton: 62, pegel: 1.5, melodie: "glocke", begleit: "arp", arpKlang: "glocke", arpOkt: 0, arpLeise: .4, pad: true, bass: "R...............", bassKlang: "bassWeich", trommel: null,
      akk: { A: "I IV I V", B: "vi IV I V" },
      mel: { A: "3 - 5 - 3 - 1 - | 4 - 6 - 4 - - - | 5 - 3 - 1 - 3 - | 2 - - - - - . .",
        B: "6 - 1' - 6 - 5 - | 4 - 6 - 1' - - - | 1' - 7 - 6 - 5 - | 5 - 7, - 2 - - -" } },
    { name: "Winterland", bpm: 100, ton: 55, melodie: "glocke", begleit: "arp", arpKlang: "zupf", pad: true, bass: "R.......F.......", bassKlang: "bassWeich", trommel: "winter",
      akk: { A: "I iii IV V", B: "vi IV ii V" },
      mel: { A: "5 - 3' - 2' 1' 7 1' | 7 - 5 - 3 - 5 - | 6 - 1' - 4' - 3' 2' | 2' - - - 5 - 7 -",
        B: "3' - 2' - 1' - 7 - | 6 - 5 - 4 - 6 - | 6 - 1' - 3' - 2' 1' | 7 - - - 2' - - -" } },
    { name: "Luftwelt", bpm: 128, ton: 62, melodie: "lead", begleit: "arp16", arpKlang: "zupf", pad: true, bass: "R.R.O.R.R.R.O.R.", trommel: "flug",
      akk: { A: "I V vi IV", B: "IV V iii vi" },
      mel: { A: "1' - 7 1' 3' - 1' - | 7 - 5 7 2' - 7 - | 1' - 6 1' 3' - 1' 6 | 6 - - 5 4 - - -",
        B: "4 - 6 - 1' - 6 1' | 2' - 7 - 5 - 7 2' | 3' - 7 - 5 - 7 3' | 1' - - - 6 - 5 -" } },
    { name: "Schlittenfahrt", bpm: 148, ton: 53, melodie: "glocke", begleit: "boomchick", arpKlang: "keys", bass: "R...F...R...F...", trommel: "schlitten",
      akk: { A: "I IV I V", B: "IV I ii V" },
      mel: { A: "5 3 5 1' 5 - 3 - | 6 4 6 1' 6 - 4 - | 5 6 5 3 1 - 3 5 | 2 - 7, - 5, - . .",
        B: "1' - 1' 6 4 - 6 - | 5 - 5 3 1 - 3 - | 2 4 6 4 2 - 5, - | 7, - 2 - 5 - . ." } },
    { name: "Dschungel", bpm: 112, ton: 57, moll: true, melodie: "zupf", melOkt: 1, begleit: "offbeat", arpKlang: "keys", bass: "R..R..R...F..R..", trommel: "dschungel",
      akk: { A: "i VII VI VII", B: "i iv VII III" },
      mel: { A: "1 . 3 5 . 3 1 . | 7, . 2 4 . 2 7, . | 6, . 1 3 . 1 6, . | 7, - 2 - 4 - 5 .",
        B: "5 . 5 3' . 1' 5 . | 4 . 6 1' . 6 4 . | 2 . 4 5 . 4 2 . | 3 - 5 - 7 - 5 -" } },
  ];
  function melodieLesen(text) {
    const z = text.replace(/\|/g, " ").trim().split(/\s+/), ev = {};
    let letzte = null;
    z.forEach((t, i) => {
      if (t === "-") { if (letzte && letzte.bis === i) letzte.bis = i + 1; return; }
      const m = /^([1-7])('*)(,*)$/.exec(t);
      if (!m) { letzte = null; return; }
      letzte = { an: i, bis: i + 1, stufe: +m[1] - 1 + 7 * (m[2].length - m[3].length) };
      ev[i * 2] = letzte;                               // im 16tel-Raster
    });
    return ev;
  }
  function vorbereiten(st) {
    if (st.teile) return st;
    st.skala = st.moll ? MOLL : DUR; st.teile = {};
    for (const k of Object.keys(st.mel)) st.teile[k] = { mel: melodieLesen(st.mel[k]), akk: st.akk[k].trim().split(/\s+/).map(r => ROEM.indexOf(r.toUpperCase())) };
    st.folge = (st.form || "AABA").split("");
    return st;
  }
  const tonVon = (st, stufe, okt) => st.ton + st.skala[((stufe % 7) + 7) % 7] + 12 * (Math.floor(stufe / 7) + okt);

  // --- Klangerzeuger ---
  const HALL = { keys: .22, zupf: .2, glocke: .38, floete: .3, lead: .24, pad: .4, banjo: .14, bass: 0, bassWeich: .05, trommel: .08 };
  let hallSend = {};
  function graphBauen() {
    haupt = ctx.createGain(); haupt.gain.value = an ? .8 : 0; haupt.connect(ctx.destination);
    const presse = ctx.createDynamicsCompressor();      // hält die Musik gleichmäßig laut, ohne zu übersteuern
    presse.threshold.value = -16; presse.knee.value = 10; presse.ratio.value = 3; presse.attack.value = .008; presse.release.value = .25;
    presse.connect(haupt);
    musikBus = ctx.createGain(); musikBus.gain.value = .55; musikBus.connect(presse);
    effektBus = ctx.createGain(); effektBus.gain.value = .7; effektBus.connect(haupt);
    rauschPuffer = ctx.createBuffer(1, ctx.sampleRate * .5, ctx.sampleRate);
    const d = rauschPuffer.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // Hall: ein kurz abklingendes Rauschen als Raumantwort, links und rechts verschieden (wirkt breit)
    const hall = ctx.createConvolver(), lang = 2.2, n = Math.floor(ctx.sampleRate * lang), ir = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const k = ir.getChannelData(c); for (let i = 0; i < n; i++) k[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2); }
    hall.buffer = ir;
    const hallTon = ctx.createBiquadFilter(); hallTon.type = "lowpass"; hallTon.frequency.value = 5200;
    hall.connect(hallTon); hallTon.connect(musikBus);
    hallSend = {};
    for (const [art, w] of Object.entries(HALL)) if (w) { const g = ctx.createGain(); g.gain.value = w; g.connect(hall); hallSend[art] = g; }
  }
  function ausgang(art, pan = 0) {
    const g = ctx.createGain(); let ziel = g;
    if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); ziel = p; }
    ziel.connect(musikBus); if (hallSend[art]) ziel.connect(hallSend[art]);
    return g;
  }
  // Hüllkurve: Anschlag, Abklingen auf den Haltepegel, Ausklingen ab „los“
  function huelle(g, t, a, spitze, halt, tau, los, aus) {
    const p = g.gain; p.setValueAtTime(0, t); p.linearRampToValueAtTime(spitze, t + a);
    p.setTargetAtTime(halt, t + a, tau); p.setTargetAtTime(0, Math.max(los, t + a + .001), aus);
    return Math.max(los, t + a) + aus * 7;
  }
  function osz(typ, f, t, ende, ziel) { const o = ctx.createOscillator(); o.type = typ; o.frequency.setValueAtTime(f, t); o.connect(ziel); o.start(t); o.stop(ende); return o; }
  function vibrato(o, f, t, ende, tiefe = .006) {
    const l = ctx.createOscillator(), g = ctx.createGain(); l.frequency.value = 5.3;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0, t + .14); g.gain.linearRampToValueAtTime(f * tiefe, t + .4);
    l.connect(g); g.connect(o.frequency); l.start(t); l.stop(ende);
  }
  const KLANG = {
    keys(f, t, dauer, l, pan) {                          // E-Piano: Frequenzmodulation, heller Anschlag, weiches Ausklingen
      const g = ausgang("keys", pan), ende = huelle(g, t, .004, .12 * l, .042 * l, .4, t + dauer, .14);
      const c = osz("sine", f, t, ende, g), m = ctx.createOscillator(), mg = ctx.createGain();
      m.frequency.value = f; mg.gain.setValueAtTime(f * 1.6, t); mg.gain.setTargetAtTime(f * .2, t, .25);
      m.connect(mg); mg.connect(c.frequency); m.start(t); m.stop(ende);
      const tg = ctx.createGain(); tg.connect(g); tg.gain.setValueAtTime(.18, t); tg.gain.setTargetAtTime(0, t, .03); osz("sine", f * 4, t, t + .3, tg);
    },
    zupf(f, t, dauer, l, pan) {                          // Marimba: Grundton mit kurzem hellem Oberton
      const g = ausgang("zupf", pan), ende = huelle(g, t, .002, .15 * l, 0, Math.min(.35, .12 + 40 / f), t + dauer, .08);
      osz("sine", f, t, ende, g);
      const og = ctx.createGain(); og.connect(g); og.gain.setValueAtTime(.4, t); og.gain.setTargetAtTime(0, t, .025); osz("sine", f * 4, t, t + .25, og);
    },
    glocke(f, t, dauer, l, pan) {                        // Glöckchen: Frequenzmodulation mit unharmonischem Verhältnis
      const g = ausgang("glocke", pan), ende = huelle(g, t, .002, .1 * l, 0, .7, t + Math.max(dauer, .8), .35);
      const c = osz("sine", f, t, ende, g), m = ctx.createOscillator(), mg = ctx.createGain();
      m.frequency.value = f * 3.5; mg.gain.setValueAtTime(f * 2.2, t); mg.gain.setTargetAtTime(0, t, .35);
      m.connect(mg); mg.connect(c.frequency); m.start(t); m.stop(ende);
    },
    floete(f, t, dauer, l, pan) {                        // Flöte: weicher Sinus mit Vibrato und ein bisschen Atem
      const g = ausgang("floete", pan), ende = huelle(g, t, .05, .12 * l, .095 * l, .25, t + dauer, .09);
      const o = osz("sine", f, t, ende, g); vibrato(o, f, t, ende);
      const o2g = ctx.createGain(); o2g.gain.value = .18; o2g.connect(g); const o2 = osz("triangle", f * 2, t, ende, o2g); vibrato(o2, f * 2, t, ende);
      const q = ctx.createBufferSource(), bf = ctx.createBiquadFilter(), ag = ctx.createGain();
      q.buffer = rauschPuffer; bf.type = "bandpass"; bf.frequency.value = f * 2; bf.Q.value = 2;
      ag.gain.setValueAtTime(.05 * l, t); ag.gain.setTargetAtTime(0, t + .03, .04);
      q.connect(bf); bf.connect(ag); ag.connect(ausgang("floete", pan)).gain.value = 1; q.start(t, Math.random() * .3); q.stop(t + .25);
    },
    lead(f, t, dauer, l, pan) {                          // weicher Synthesizer: zwei leicht verstimmte Sägezähne durch einen Filter
      const g = ausgang("lead", pan), ende = huelle(g, t, .012, .055 * l, .04 * l, .2, t + dauer, .08);
      const fl = ctx.createBiquadFilter(); fl.type = "lowpass"; fl.Q.value = 1.5; fl.frequency.setValueAtTime(f * 6, t); fl.frequency.setTargetAtTime(f * 3, t, .15); fl.connect(g);
      for (const v of [.996, 1.004]) { const o = osz("sawtooth", f * v, t, ende, fl); vibrato(o, f * v, t, ende, .004); }
    },
    banjo(f, t, dauer, l, pan) {                         // gezupfte Saite: heller Anschlag, Filter schließt schnell
      const g = ausgang("banjo", pan), ende = huelle(g, t, .002, .08 * l, 0, .18, t + Math.min(dauer, .5), .05);
      const fl = ctx.createBiquadFilter(); fl.type = "lowpass"; fl.Q.value = 3; fl.frequency.setValueAtTime(5200, t); fl.frequency.setTargetAtTime(f * 2, t, .06); fl.connect(g);
      osz("sawtooth", f, t, ende, fl); osz("square", f * 2.002, t, ende, fl);
    },
    pad(f, t, dauer, l, pan) {                           // Fläche: langsam ein- und ausblenden
      const g = ausgang("pad", pan), ende = huelle(g, t, .35, .016 * l, .016 * l, 1, t + dauer, .4);
      const fl = ctx.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = 1100; fl.Q.value = .4; fl.connect(g);
      for (const v of [.994, 1.006]) osz("sawtooth", f * v, t, ende, fl);
    },
    bass(f, t, dauer, l) {                               // gezupfter Bass mit kurzem Filterschlag
      const g = ausgang("bass"), ende = huelle(g, t, .004, .11 * l, .06 * l, .22, t + dauer, .05);
      const fl = ctx.createBiquadFilter(); fl.type = "lowpass"; fl.Q.value = 2; fl.frequency.setValueAtTime(1100, t); fl.frequency.setTargetAtTime(280, t, .08); fl.connect(g);
      osz("sawtooth", f, t, ende, fl); osz("sine", f, t, ende, g);
    },
    bassWeich(f, t, dauer, l) {                          // runder Bass für die ruhigen Stücke
      const g = ausgang("bassWeich"), ende = huelle(g, t, .015, .13 * l, .09 * l, .5, t + dauer, .12);
      osz("sine", f, t, ende, g); const og = ctx.createGain(); og.gain.value = .35; og.connect(g); osz("triangle", f * 2, t, ende, og);
    },
  };
  function spielen(klang, midi, t, dauer, l = 1, pan = 0) { const k = KLANG[klang]; if (k) k(hz(midi), t, dauer, l, pan); }
  function geraeusch(t, dauer, filterTyp, freq, q, laut, ziel, anschlag = .001) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = rauschPuffer; f.type = filterTyp; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(laut, t + anschlag); g.gain.setTargetAtTime(0, t + anschlag, dauer);
    s.connect(f); f.connect(g); g.connect(ziel); s.start(t, Math.random() * .4); s.stop(t + dauer * 8 + .02);
  }
  function schlag(art, t, v) {
    const aus = ausgang("trommel");
    if (art === "k") {                                   // Bassdrum: Ton fällt schnell nach unten, dazu ein kurzer Klick
      const g = ctx.createGain(); g.connect(aus); g.gain.setValueAtTime(.3 * v, t); g.gain.setTargetAtTime(0, t + .02, .08);
      const o = osz("sine", 150, t, t + .5, g); o.frequency.exponentialRampToValueAtTime(46, t + .12);
      geraeusch(t, .004, "highpass", 3000, .7, .08 * v, aus);
    } else if (art === "s") {                            // Snare: Rauschen und ein kurzer Ton
      geraeusch(t, .055, "bandpass", 2200, .7, .22 * v, aus);
      const g = ctx.createGain(); g.connect(aus); g.gain.setValueAtTime(.13 * v, t); g.gain.setTargetAtTime(0, t, .03); osz("triangle", 190, t, t + .25, g);
    } else if (art === "h") geraeusch(t, .014, "highpass", 7500, .7, .1 * v, ausgang("trommel", .25));
    else if (art === "sh") geraeusch(t, .022, "bandpass", 5800, 1.4, .085 * v, ausgang("trommel", -.2), .008);
    else if (art === "r") geraeusch(t, .03, "bandpass", 3400, 1.1, .07 * v, aus);
    else if (art === "b") {                              // Schlittenglöckchen
      const p = ausgang("trommel", .3); geraeusch(t, .035, "bandpass", 8500, 3, .11 * v, p); geraeusch(t + .018, .03, "bandpass", 10500, 3, .08 * v, p);
      const g = ctx.createGain(); g.connect(p); g.gain.setValueAtTime(.025 * v, t); g.gain.setTargetAtTime(0, t, .05); osz("sine", 4200, t, t + .3, g);
    } else if (art === "c" || art === "t") {             // Conga und tiefe Trommel
      const hoch = art === "c", g = ctx.createGain(); g.connect(ausgang("trommel", hoch ? -.3 : .2));
      g.gain.setValueAtTime(.24 * v, t); g.gain.setTargetAtTime(0, t + .005, hoch ? .07 : .11);
      const o = osz("sine", hoch ? 300 : 150, t, t + .6, g); o.frequency.exponentialRampToValueAtTime(hoch ? 225 : 105, t + .06);
      if (hoch) geraeusch(t, .008, "bandpass", 1500, 1, .05 * v, aus);
    }
  }
  function begleiten(st, akk, pos, t, d) {
    const toene = [akk, akk + 2, akk + 4].map(x => tonVon(st, x, 0)), art = st.begleit, klang = st.arpKlang || "zupf";
    if (st.pad && pos === 0) toene.forEach((m, i) => spielen("pad", m, t, 16 * d, 1, (i - 1) * .4));
    if (art === "arp" || art === "arp16") {
      const schritt = art === "arp16" ? 1 : 2;
      if (pos % schritt === 0) {
        const folge = [0, 1, 2, 3, 2, 1, 2, 3], k = folge[(pos / schritt) % folge.length];
        const m = (k === 3 ? toene[0] + 12 : toene[k]) + 12 * (st.arpOkt ?? 0);
        spielen(klang, m, t, schritt * d * 1.6, (st.arpLeise ?? .55) * (pos % 4 === 0 ? 1 : .8), (k - 1.5) * .35);
      }
    } else if (art === "offbeat") { if (pos % 4 === 2) toene.forEach((m, i) => spielen(klang, m, t, d * 1.3, .42, (i - 1) * .3)); }
    else if (art === "boomchick") { if (pos === 4 || pos === 12) toene.forEach((m, i) => spielen(klang, m, t, d * 1.6, .4, (i - 1) * .3)); }
  }
  let stueck = null, schrittNr = 0, naechste = 0, takt = null;
  function planen(bis) {
    if (!ctx || !stueck) return;
    const st = stueck, d = 60 / st.bpm / 4, gesamt = st.folge.length * 64, grenze = bis ?? ctx.currentTime + .2;
    while (naechste < grenze) {
      const s = schrittNr % gesamt, teilNr = Math.floor(s / 64), teil = st.teile[st.folge[teilNr]];
      const i = s % 64, bar = Math.floor(i / 16), pos = i % 16;
      const t = naechste + (pos % 4 === 2 ? (st.swing || 0) * d * 2 : 0);   // Swing: die zweite Achtel kommt etwas später
      const akk = teil.akk[bar];
      const e = teil.mel[i];
      if (e) spielen(st.melodie, tonVon(st, e.stufe, st.melOkt ?? 1), t, (e.bis - e.an) * 2 * d * .95, 1, .08);
      begleiten(st, akk, pos, t, d);
      const b = st.bass[pos];
      if (b && b !== ".") {
        let l = 1; while (pos + l < 16 && st.bass[pos + l] === ".") l++;
        spielen(st.bassKlang || "bass", tonVon(st, b === "F" ? akk + 4 : akk, b === "O" ? -1 : -2), t, l * d * .9, pos === 0 ? 1 : .85);
      }
      if (st.trommel) {
        const tr = TROMMEL[st.trommel];
        const wirbel = tr.s && teilNr === st.folge.length - 1 && bar === 3 && pos >= 12;   // kleiner Wirbel, bevor das Stück von vorn beginnt
        for (const art in tr) { const c = tr[art][pos]; if (c && c !== "." && !(wirbel && art === "s")) schlag(art, t, c === "X" ? 1 : .6); }
        if (wirbel) schlag("s", t, .4 + (pos - 12) * .15);
      }
      naechste += d; schrittNr++;
    }
  }
  function musik(welt) {
    if (!ctx) return;
    stueck = vorbereiten(STUECKE[welt % STUECKE.length]); schrittNr = 0; naechste = ctx.currentTime + .1;
    musikBus.gain.setTargetAtTime(.55 * (stueck.pegel || 1), ctx.currentTime, .05);
    if (!takt) takt = setInterval(planen, 50);
  }
  function musikStop() { stueck = null; if (takt) { clearInterval(takt); takt = null; } }
  // Zum Anhören und Prüfen: ein Stück ohne Lautsprecher in einen Puffer spielen
  async function aufnehmen(welt, sekunden = 30) {
    const alt = { ctx, haupt, musikBus, effektBus, rauschPuffer, hallSend, stueck, schrittNr, naechste };
    ctx = new OfflineAudioContext(2, Math.ceil(44100 * sekunden), 44100); graphBauen(); haupt.gain.value = .8;
    stueck = vorbereiten(STUECKE[welt % STUECKE.length]); schrittNr = 0; naechste = .05; musikBus.gain.value = .55 * (stueck.pegel || 1); planen(sekunden - .3);
    const puffer = await ctx.startRendering();
    ({ ctx, haupt, musikBus, effektBus, rauschPuffer, hallSend, stueck, schrittNr, naechste } = alt);
    return puffer;
  }

  // ---------- Weckton beim Verlieren (Audiodatei, wird beim ersten Start im Hintergrund geladen) ----------
  let weckPuffer = null, weckLaedt = null, weckQuelle = null;
  function weckLaden() {
    if (weckPuffer || weckLaedt || !ctx) return;
    weckLaedt = fetch("ton/verloren.m4a?v=1").then(r => r.arrayBuffer())
      .then(b => new Promise((ok, nein) => ctx.decodeAudioData(b, ok, nein)))   // Rückruf-Form: läuft auch auf älteren iPhones
      .then(p => { weckPuffer = p; }).catch(() => { weckLaedt = null; });
  }
  function verloren() {
    if (!ctx) return;
    verlorenStop();
    if (!weckPuffer) { weckLaden(); return; }
    const q = ctx.createBufferSource(), g = ctx.createGain();
    q.buffer = weckPuffer; g.gain.value = .7; q.connect(g); g.connect(effektBus); q.start();
    weckQuelle = { q, g };
    q.onended = () => { if (weckQuelle && weckQuelle.q === q) weckQuelle = null; };
  }
  function verlorenStop() {               // „Nochmal“, Spiel schließen oder Seite verlassen: Ton kurz ausblenden
    if (!weckQuelle) return;
    const { q, g } = weckQuelle; weckQuelle = null;
    g.gain.setTargetAtTime(0, ctx.currentTime, .03);
    try { q.stop(ctx.currentTime + .2); } catch (e) {}
  }

  return { start, umschalten, istAn: () => an, musik, musikStop, aufnehmen, verloren, verlorenStop, ...sfx };
}
