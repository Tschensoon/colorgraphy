// Wettrennen für „Fröbelinchen rennt“: zwei Spieler treffen sich über einen Code in einer Lobby und laufen gleichzeitig dieselbe Strecke.
// Läuft über den Realtime-Kanal von Supabase (Broadcast), ohne eigenen Server und ohne Tabelle: Es wird nichts gespeichert.
// Ablauf: Gastgeber erstellt ein Rennen (Code), Gast tritt bei ("hallo"), Gastgeber antwortet mit "start" und der Startzahl für die Strecke,
// beide zählen 3-2-1 und laufen los. Danach schickt jedes Gerät viermal pro Sekunde seinen Stand ("pos").
export function rennenStarten({ db, feld, knopf, nameFehler, vorbereiten, los, stand, gegner }) {
  const ZEICHEN = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";      // ohne 0/O und 1/I, damit man den Code gut vorlesen kann
  const ich = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const $ = (s) => feld.querySelector(s);
  const teilStart = $(".lr-start"), teilWarten = $(".lr-warten"), teilZaehler = $(".lr-zaehler");
  const nameFeld = $(".lr-name"), codeFeld = $(".lr-code"), status = $(".lr-status");
  let ws = null, ref = 0, joinRef = null, verbunden = false, herz = null, takt = null, wache = null, hallo = null, zaehler = null;
  let kanal = "", code = "", rolle = "", er = null, laeuft = false, zuletzt = 0;
  try { nameFeld.value = localStorage.getItem("froebelinchen-name") || ""; } catch (e) {}

  const zeigen = (teil) => { for (const t of [teilStart, teilWarten, teilZaehler]) t.hidden = t !== teil; };
  const melden = (text, fehler) => { status.textContent = text; status.classList.toggle("fehler", !!fehler); };
  const name = () => nameFeld.value.replace(/\s+/g, " ").trim().slice(0, 16);
  const rufen = (event, payload) => {
    if (ws && ws.readyState === 1 && verbunden) ws.send(JSON.stringify({ topic: kanal, event: "broadcast", payload: { type: "broadcast", event, payload }, ref: String(++ref), join_ref: joinRef }));
  };

  function trennen() {
    for (const t of [herz, takt, wache, hallo, zaehler]) clearInterval(t);
    herz = takt = wache = hallo = zaehler = null; verbunden = false; laeuft = false; er = null;
    if (ws) { ws.onclose = ws.onmessage = ws.onerror = null; try { ws.close(); } catch (e) {} ws = null; }
  }
  function verbinden(bereit) {
    trennen();
    kanal = "realtime:froebel-rennen-" + code;
    try { ws = new WebSocket(`${db.url.replace(/^http/, "ws")}/realtime/v1/websocket?apikey=${encodeURIComponent(db.key)}&vsn=1.0.0`); }
    catch (e) { return abbruch("Keine Verbindung. Bitte später noch einmal versuchen."); }
    ws.onopen = () => {
      joinRef = String(++ref);
      ws.send(JSON.stringify({ topic: kanal, event: "phx_join", ref: joinRef, join_ref: joinRef,
        payload: { config: { broadcast: { self: false, ack: false }, presence: { key: ich }, postgres_changes: [], private: false } } }));
      herz = setInterval(() => { if (ws && ws.readyState === 1) ws.send(JSON.stringify({ topic: "phoenix", event: "heartbeat", payload: {}, ref: String(++ref) })); }, 25000);
    };
    ws.onmessage = (m) => {
      let d; try { d = JSON.parse(m.data); } catch (e) { return; }
      if (d.topic !== kanal) return;
      if (d.event === "phx_reply" && d.ref === joinRef) {
        if (d.payload && d.payload.status === "ok") { verbunden = true; bereit(); } else abbruch("Die Lobby ist gerade nicht erreichbar.");
      } else if (d.event === "broadcast" && d.payload) empfangen(d.payload.event, d.payload.payload || {});
    };
    ws.onerror = ws.onclose = () => { if (!laeuft) abbruch("Verbindung verloren. Bitte noch einmal versuchen."); };
  }
  function abbruch(text) { trennen(); zeigen(teilStart); melden(text, true); }

  function empfangen(art, p) {
    if (art === "hallo" && rolle === "gastgeber") {
      if (er && er.id !== p.id) return rufen("voll", { an: p.id });
      if (!er) { er = { id: p.id, name: String(p.name || "Gast").slice(0, 16), seed: Math.floor(Math.random() * 2147483647) }; }
      rufen("start", { an: er.id, seed: er.seed, name: name() || "Gast" });     // bei wiederholtem „hallo“ noch einmal, falls die Antwort verloren ging
      if (!zaehler) herunterzaehlen(er.seed);
    } else if (art === "start" && rolle === "gast" && p.an === ich && !zaehler && !laeuft) {
      clearInterval(hallo); hallo = null;
      er = { id: "", name: String(p.name || "Gast").slice(0, 16), seed: p.seed | 0 };
      herunterzaehlen(er.seed);
    } else if (art === "voll" && p.an === ich && !zaehler && !laeuft) abbruch("Dieses Rennen ist schon voll.");
    else if (art === "pos" && laeuft && er) {
      zuletzt = Date.now();
      gegner({ name: er.name, m: +p.m || 0, p: +p.p || 0, z: p.z === "aus" ? "aus" : "laeuft", idx: p.idx | 0, s: +p.s || 0, x: +p.x || 0, y: +p.y || 0 });
    }
  }

  function herunterzaehlen(seed) {
    let n = 3;
    zeigen(teilZaehler); melden("");
    $(".lr-gegen").textContent = `${name() || "Du"} gegen ${er.name}`;
    const zahl = $(".lr-zahl"); zahl.textContent = n;
    zaehler = setInterval(() => {
      n--;
      if (n > 0) { zahl.textContent = n; return; }
      clearInterval(zaehler); zaehler = null;
      feld.hidden = true; zeigen(teilStart);
      laeuft = true; zuletzt = Date.now();
      los(seed, er.name);
      takt = setInterval(() => rufen("pos", stand()), 250);
      // meldet sich der Gegner 8 Sekunden lang nicht (Handy gesperrt, Netz weg), gilt er als ausgeschieden
      wache = setInterval(() => { if (er && Date.now() - zuletzt > 8000) gegner({ name: er.name, z: "weg" }); }, 1000);
    }, 1000);
  }

  function nameOk() {
    const n = name(), f = n ? nameFehler(n) : "Bitte gib einen Namen ein.";
    if (f) { melden(f, true); nameFeld.focus(); return false; }
    try { localStorage.setItem("froebelinchen-name", n); } catch (e) {}
    return true;
  }
  $(".lr-neu").addEventListener("click", () => {
    if (!nameOk()) return;
    code = Array.from({ length: 4 }, () => ZEICHEN[Math.floor(Math.random() * ZEICHEN.length)]).join("");
    rolle = "gastgeber"; vorbereiten();
    $(".lr-zeigen").textContent = code; $(".lr-info").textContent = "Verbinde …"; zeigen(teilWarten); melden("");
    verbinden(() => { $(".lr-info").textContent = "Warte auf deinen Gegner …"; });
  });
  $(".lr-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!nameOk()) return;
    code = codeFeld.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
    if (code.length !== 4) { melden("Der Code hat vier Zeichen.", true); return; }
    rolle = "gast"; vorbereiten(); melden("Suche das Rennen …");
    verbinden(() => {
      let n = 0;
      const klopfen = () => {
        if (++n > 5) { abbruch("Kein Rennen mit diesem Code gefunden."); return; }
        rufen("hallo", { id: ich, name: name() });
      };
      klopfen(); hallo = setInterval(klopfen, 1200);
    });
  });
  $(".lr-teilen").addEventListener("click", async () => {
    const link = `${location.origin}${location.pathname}?rennen=${code}`, text = `Wettrennen bei Fröbelinchen rennt! Code: ${code}`;
    try {
      if (navigator.share) await navigator.share({ title: "Fröbelinchen rennt", text, url: link });
      else { await navigator.clipboard.writeText(link); $(".lr-info").textContent = "Link kopiert. Warte auf deinen Gegner …"; }
    } catch (e) {}
  });
  const zu = () => { feld.hidden = true; if (!laeuft) { trennen(); zeigen(teilStart); melden(""); } };
  $(".lr-x").addEventListener("click", zu);
  knopf.addEventListener("click", () => oeffnen());

  function oeffnen(mitCode) {
    if (laeuft) ende();
    zeigen(teilStart); melden("");
    if (mitCode) codeFeld.value = String(mitCode).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
    feld.hidden = false;
  }
  function ende() { trennen(); }
  return { oeffnen, ende, zu, aktiv: () => laeuft };
}
