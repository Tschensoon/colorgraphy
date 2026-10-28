// Töne für „Fröbelinchen rennt“: alle Geräusche und die Musik werden im Browser erzeugt (Web Audio), keine Dateien.
// Der Ton startet erst nach einer Berührung oder einem Klick (Vorgabe der Browser, vor allem auf dem iPhone).
export function ton() {
  let ctx = null, haupt, musikBus, effektBus, rauschPuffer = null;
  let an = true;
  try { an = localStorage.getItem("froebelinchen-ton") !== "aus"; } catch (e) {}

  function start() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      ctx = new AC();
      haupt = ctx.createGain(); haupt.gain.value = an ? .8 : 0; haupt.connect(ctx.destination);
      musikBus = ctx.createGain(); musikBus.gain.value = .32; musikBus.connect(haupt);
      effektBus = ctx.createGain(); effektBus.gain.value = .7; effektBus.connect(haupt);
      rauschPuffer = ctx.createBuffer(1, ctx.sampleRate * .5, ctx.sampleRate);
      const d = rauschPuffer.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
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
    schubs() { const t = jetzt(); note(220, t, .45, { typ: "sine", laut: .3, gleit: 3 }); note(160, t + .25, .35, { typ: "triangle", laut: .2, gleit: .4 }); },
    welt() { const t = jetzt(); [79, 83, 86, 91].forEach((m, i) => note(hz(m), t + i * .09, .5, { typ: "sine", laut: .09 })); },
    ende() { const t = jetzt(); [72, 67, 64, 60].forEach((m, i) => note(hz(m), t + i * .14, .3, { typ: "triangle", laut: .14 })); },
    rekord() { const t = jetzt(); [72, 76, 79, 84, 79, 84, 88].forEach((m, i) => note(hz(m), t + i * .1, .25, { typ: "square", laut: .06 })); },
    knall() { const t = jetzt(); rauschen(t, .3, { laut: .3, filter: 400, typ: "lowpass" }); note(90, t, .3, { typ: "sine", laut: .4, gleit: .4 }); },
  };

  // ---------- Musik: kleine Melodie je Welt (Achtel-Raster, 32 Schritte, Bass pro Takt) ----------
  const _ = null;
  const STUECKE = [
    { bpm: 118, mel: [72, _, 76, _, 79, _, 76, _, 74, _, 77, _, 81, _, 77, _, 76, _, 79, _, 84, _, 79, _, 77, 76, 74, _, 72, _, _, _], bass: [48, 53, 48, 43], klang: "triangle", trommel: true },
    { bpm: 124, mel: [67, 69, 71, _, 74, _, 71, _, 72, _, 69, _, 67, _, _, _, 71, 72, 74, _, 76, _, 74, _, 72, 71, 69, _, 67, _, _, _], bass: [43, 48, 43, 50], klang: "square", trommel: true },
    { bpm: 100, mel: [77, _, _, 76, 74, _, 72, _, 74, _, _, _, 69, _, _, _, 72, _, _, 74, 76, _, 77, _, 79, _, _, _, 77, _, _, _], bass: [41, 46, 48, 41], klang: "sine", trommel: false },
    { bpm: 108, mel: [69, _, 72, _, 76, _, 74, 72, 71, _, 72, _, 69, _, _, _, 67, _, 71, _, 74, _, 72, 71, 69, _, _, _, 69, _, _, _], bass: [45, 41, 43, 45], klang: "triangle", trommel: true },
    { bpm: 96, mel: [74, _, 77, _, 81, _, 79, 77, 76, _, 74, _, 73, _, _, _, 74, _, 77, _, 79, _, 81, _, 82, _, 81, _, 74, _, _, _], bass: [38, 46, 45, 38], klang: "glocke", trommel: false },
  ];
  let stueck = null, schrittNr = 0, naechste = 0, takt = null;
  function planen() {
    if (!ctx || !stueck) return;
    const dauer = 60 / stueck.bpm / 2;
    while (naechste < ctx.currentTime + .15) {
      const i = schrittNr % 32, m = stueck.mel[i];
      if (m !== null) {
        if (stueck.klang === "glocke") { note(hz(m + 12), naechste, .8, { typ: "sine", laut: .09, bus: musikBus }); note(hz(m + 24), naechste, .4, { typ: "sine", laut: .03, bus: musikBus }); }
        else note(hz(m), naechste, dauer * 1.6, { typ: stueck.klang, laut: stueck.klang === "square" ? .05 : .1, bus: musikBus });
      }
      if (i % 8 === 0) note(hz(stueck.bass[i / 8]), naechste, dauer * 7, { typ: "triangle", laut: .16, bus: musikBus, attack: .02 });
      if (stueck.trommel) {
        if (i % 4 === 0) note(110, naechste, .14, { typ: "sine", laut: .22, gleit: .4, bus: musikBus });
        if (i % 2 === 1) rauschen(naechste, .04, { laut: .04, filter: 7000, typ: "highpass", bus: musikBus });
      }
      naechste += dauer; schrittNr++;
    }
  }
  function musik(welt) {
    if (!ctx) return;
    stueck = STUECKE[welt % STUECKE.length]; schrittNr = 0; naechste = ctx.currentTime + .1;
    if (!takt) takt = setInterval(planen, 50);
  }
  function musikStop() { stueck = null; if (takt) { clearInterval(takt); takt = null; } }

  return { start, umschalten, istAn: () => an, musik, musikStop, ...sfx };
}
