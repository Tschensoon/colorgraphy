// Wettrennen für „Fröbelinchen rennt“: zwei Spieler treffen sich über einen Code in einer Lobby und laufen gleichzeitig dieselbe Strecke.
// Läuft über den Realtime-Kanal von Supabase (Broadcast), ohne eigenen Server und ohne Tabelle: Es wird nichts gespeichert.
// Ablauf: Gastgeber erstellt ein Rennen (Code), Gast tritt bei ("hallo"), Gastgeber antwortet mit "drin": beide stehen im Lobby-Raum,
// können chatten und melden sich bereit ("status"). Sind beide bereit, schickt der Gastgeber "start" mit der Startzahl für die Strecke,
// beide zählen 3-2-1 und laufen los. Danach schickt jedes Gerät viermal pro Sekunde seinen Stand ("pos").
export function rennenStarten({ db, feld, knopf, nameFehler, verboten, vorbereiten, los, stand, gegner, emoji, streich }) {
  const ZEICHEN = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";      // ohne 0/O und 1/I, damit man den Code gut vorlesen kann
  const ich = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const $ = (s) => feld.querySelector(s);
  const teilStart = $(".lr-start"), teilWarten = $(".lr-warten"), teilZaehler = $(".lr-zaehler"), teilLobby = $(".lr-lobby");
  const chatListe = $(".lr-chat"), chatText = $(".lr-chat-text"), bereitKnopf = $(".lr-bereit");
  const nameFeld = $(".lr-name"), codeFeld = $(".lr-code"), status = $(".lr-status");
  let ws = null, ref = 0, joinRef = null, verbunden = false, herz = null, takt = null, wache = null, hallo = null, zaehler = null;
  let kanal = "", code = "", rolle = "", er = null, laeuft = false, zuletzt = 0, bereitFn = null, neuTimer = null, versuche = 0;
  let imRaum = false, ichBereit = false, erBereit = false, raumTakt = null, erZuletzt = 0, erWill = false;
  const siege = { ich: 0, er: 0, runden: 0 };
  const standZeile = document.createElement("p"); standZeile.className = "lr-info lr-raum-stand"; standZeile.hidden = true;
  $(".lr-spieler").before(standZeile);
  try { nameFeld.value = localStorage.getItem("froebelinchen-name") || ""; } catch (e) {}

  const zeigen = (teil) => { for (const t of [teilStart, teilWarten, teilZaehler, teilLobby]) t.hidden = t !== teil; };
  const melden = (text, fehler) => { status.textContent = text; status.classList.toggle("fehler", !!fehler); };
  const name = () => nameFeld.value.replace(/\s+/g, " ").trim().slice(0, 16);
  const rufen = (event, payload) => {
    if (ws && ws.readyState === 1 && verbunden) ws.send(JSON.stringify({ topic: kanal, event: "broadcast", payload: { type: "broadcast", event, payload }, ref: String(++ref), join_ref: joinRef }));
  };

  const merken = () => { try { sessionStorage.setItem("froebelinchen-rennen", JSON.stringify({ code, zeit: Date.now() })); } catch (e) {} };
  const vergessen = () => { try { sessionStorage.removeItem("froebelinchen-rennen"); } catch (e) {} };
  function leitungZu() {
    clearInterval(herz); clearTimeout(neuTimer); herz = neuTimer = null; verbunden = false;
    if (ws) { ws.onclose = ws.onmessage = ws.onerror = ws.onopen = null; try { ws.close(); } catch (e) {} ws = null; }
  }
  function trennen() {
    for (const t of [takt, wache, hallo, zaehler, raumTakt]) clearInterval(t);
    takt = wache = hallo = zaehler = raumTakt = null; imRaum = false; laeuft = false; erWill = false; siege.ich = siege.er = siege.runden = 0; er = null; rolle = ""; bereitFn = null; versuche = 0;
    leitungZu();
  }
  // Die Lobby bleibt bestehen, auch wenn die Leitung abreißt – am Handy passiert das, sobald man zum Verschicken des Codes
  // kurz in eine andere App wechselt. Dann wird mit demselben Code neu verbunden, statt die Lobby zu schließen.
  function neuVerbinden(gleich) {
    if (!rolle || neuTimer) return;
    if (++versuche > 60) return abbruch("Verbindung verloren. Bitte noch einmal versuchen.");
    if (!laeuft && rolle === "gastgeber" && !zaehler && !imRaum) $(".lr-info").textContent = "Verbinde neu …";
    neuTimer = setTimeout(() => { neuTimer = null; leitung(); }, gleich ? 50 : Math.min(4000, 600 * versuche));
  }
  function verbinden(bereit) {
    bereitFn = bereit; versuche = 0;
    kanal = "realtime:froebel-rennen-" + code;
    leitung();
  }
  function leitung() {
    leitungZu();
    try { ws = new WebSocket(`${db.url.replace(/^http/, "ws")}/realtime/v1/websocket?apikey=${encodeURIComponent(db.key)}&vsn=1.0.0`); }
    catch (e) { return neuVerbinden(); }
    const bereit = () => { versuche = 0; if (bereitFn) bereitFn(); };
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
        if (d.payload && d.payload.status === "ok") { verbunden = true; bereit(); } else neuVerbinden();
      } else if (d.event === "broadcast" && d.payload) empfangen(d.payload.event, d.payload.payload || {});
    };
    ws.onerror = ws.onclose = () => { verbunden = false; neuVerbinden(); };
  }
  function abbruch(text) { trennen(); vergessen(); zeigen(teilStart); melden(text, true); }
  // zurück aus einer anderen App: sofort prüfen, ob die Leitung noch steht
  document.addEventListener("visibilitychange", () => { if (!document.hidden && rolle && !(ws && ws.readyState === 1 && verbunden)) { versuche = 0; neuVerbinden(true); } });

  function empfangen(art, p) {
    if (art === "hallo" && rolle === "gastgeber") {
      if (er && er.id !== p.id) return rufen("voll", { an: p.id });
      if (zaehler || laeuft) return;
      if (!er) er = { id: p.id, name: String(p.name || "Gast").slice(0, 16) };
      rufen("drin", { an: er.id, name: name() || "Gast" });     // bei wiederholtem „hallo“ noch einmal, falls die Antwort verloren ging
      if (!imRaum) raumAuf();
    } else if (art === "drin" && rolle === "gast" && p.an === ich && !imRaum && !zaehler && !laeuft) {
      clearInterval(hallo); hallo = null;
      er = { id: "", name: String(p.name || "Gast").slice(0, 16) };
      raumAuf();
    } else if (art === "status" && imRaum && er && p.id !== ich && (rolle === "gast" || p.id === er.id)) {
      erZuletzt = Date.now(); erBereit = !!p.bereit; if (p.name) er.name = String(p.name).slice(0, 16);
      raumZeigen(); startPruefen();
    } else if (art === "chat" && imRaum && er) {
      const text = String(p.text || "").slice(0, 200);
      if (text && !verboten(text)) chatZeile(er.name, text, false);
    } else if (art === "tschuess" && imRaum && p.id !== ich) gegnerWeg();
    else if (art === "start" && rolle === "gast" && p.an === ich && imRaum && !zaehler && !laeuft) herunterzaehlen(p.seed | 0);
    else if (art === "voll" && p.an === ich && !imRaum && !zaehler && !laeuft) abbruch("Dieses Rennen ist schon voll.");
    else if (art === "nochmal" && laeuft && er && p.id !== ich) { erWill = true; revanchePruefen(); }
    else if (art === "emoji" && (laeuft || imRaum) && er) emoji(p.e | 0);
    else if (art === "streich" && laeuft && er) streich(String(p.art || ""));
    else if (art === "pos" && laeuft && er) {
      zuletzt = Date.now();
      gegner({ name: er.name, m: +p.m || 0, p: +p.p || 0, z: p.z === "aus" ? "aus" : "laeuft", f: String(p.f || "").slice(0, 16), idx: p.idx | 0, s: +p.s || 0, x: +p.x || 0, y: +p.y || 0 });
    }
  }

  // ----- Lobby-Raum: beide sehen sich, können chatten und drücken „Bereit“ -----
  const statusSenden = () => rufen("status", { id: ich, name: name() || "Gast", bereit: ichBereit });
  function raumAuf() {
    imRaum = true; ichBereit = erBereit = false; erZuletzt = Date.now();
    chatListe.replaceChildren(); chatText.value = ""; vergessen();
    $(".lr-raum-code").textContent = code;
    zeigen(teilLobby); melden(""); raumZeigen(); statusSenden();
    clearInterval(raumTakt);
    raumTakt = setInterval(() => {
      statusSenden();
      if (Date.now() - erZuletzt > 12000) gegnerWeg();       // meldet sich nicht mehr: hat die Lobby verlassen
    }, 1500);
  }
  // Revanche: nach dem Rennen zurück in denselben Raum. Wer zuerst drückt, lädt den anderen ein; der landet dort, sobald sein Lauf vorbei ist.
  function zurueckInRaum(vonMir) {
    for (const t of [takt, wache]) clearInterval(t);
    takt = wache = null; laeuft = false; erWill = false;
    raumAuf(); feld.hidden = false;
    if (vonMir) { rufen("nochmal", { id: ich }); setTimeout(() => rufen("nochmal", { id: ich }), 400); }
    else melden(`${er.name} möchte eine Revanche.`);
  }
  function revanchePruefen() { if (erWill && laeuft && stand().z === "aus") zurueckInRaum(false); }
  function raumZeigen() {
    standZeile.hidden = !siege.runden;
    if (er) standZeile.textContent = `Stand: ${name() || "Du"} ${siege.ich} : ${siege.er} ${er.name}`;
    const zeile = (sel, wer, bereit) => { const li = $(sel); li.querySelector(".lr-sn").textContent = wer; li.querySelector(".lr-sb").textContent = bereit ? "✓ bereit" : "noch nicht bereit"; li.classList.toggle("bereit", bereit); };
    zeile(".lr-ich", `${name() || "Du"} (du)`, ichBereit); zeile(".lr-er", er ? er.name : "", erBereit);
    bereitKnopf.textContent = ichBereit ? "Doch nicht bereit" : "Bereit!"; bereitKnopf.classList.toggle("ghost", ichBereit);
    $(".lr-raum-info").textContent = ichBereit && !erBereit ? `Warte auf ${er ? er.name : "den Gegner"} …` : !ichBereit && erBereit ? `${er.name} ist bereit. Drück „Bereit!“, dann geht es los.` : "Sobald beide bereit sind, startet das Rennen.";
  }
  function startPruefen() {                               // der Gastgeber gibt den Start, sobald beide bereit sind
    if (rolle !== "gastgeber" || !imRaum || !ichBereit || !erBereit || zaehler || laeuft) return;
    const seed = Math.floor(Math.random() * 2147483647), start = () => rufen("start", { an: er.id, seed });
    start(); setTimeout(start, 250); setTimeout(start, 600);  // dreimal, falls eine Nachricht verloren geht
    herunterzaehlen(seed);
  }
  function gegnerWeg() {
    if (!imRaum) return;
    const wer = er ? er.name : "Dein Gegner";
    clearInterval(raumTakt); raumTakt = null; imRaum = false; ichBereit = erBereit = false;
    if (rolle === "gastgeber") { er = null; merken(); zeigen(teilWarten); $(".lr-info").textContent = `${wer} hat die Lobby verlassen. Warte auf einen neuen Gegner …`; }
    else abbruch(`${wer} hat die Lobby verlassen.`);
  }
  function chatZeile(wer, text, eigen) {
    const li = document.createElement("li"), b = document.createElement("b");
    if (eigen) li.className = "eigen";
    b.textContent = wer + ": "; li.append(b, text); chatListe.append(li);
    while (chatListe.children.length > 50) chatListe.firstChild.remove();
    chatListe.scrollTop = chatListe.scrollHeight;
  }
  $(".lr-chat-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const text = chatText.value.replace(/\s+/g, " ").trim().slice(0, 200);
    if (!text || !imRaum) return;
    if (verboten(text)) { melden("Bitte bleib freundlich.", true); return; }
    melden(""); chatText.value = ""; chatZeile(name() || "Du", text, true); rufen("chat", { text });
  });
  bereitKnopf.addEventListener("click", () => { if (!imRaum) return; ichBereit = !ichBereit; raumZeigen(); statusSenden(); startPruefen(); });

  function herunterzaehlen(seed) {
    let n = 3;
    clearInterval(raumTakt); raumTakt = null; imRaum = false;
    zeigen(teilZaehler); melden("");
    $(".lr-gegen").textContent = `${name() || "Du"} gegen ${er.name}`;
    const zahl = $(".lr-zahl"); zahl.textContent = n;
    zaehler = setInterval(() => {
      n--;
      if (n > 0) { zahl.textContent = n; return; }
      clearInterval(zaehler); zaehler = null;
      feld.hidden = true; zeigen(teilStart); vergessen();
      laeuft = true; zuletzt = Date.now();
      chatListe.replaceChildren();
      los(seed, er.name);
      takt = setInterval(() => { rufen("pos", stand()); revanchePruefen(); }, 250);
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
    trennen();
    code = Array.from({ length: 4 }, () => ZEICHEN[Math.floor(Math.random() * ZEICHEN.length)]).join("");
    vorbereiten(); warten();
  });
  // Gastgeber wartet mit seinem Code auf den Gegner; der Code bleibt gemerkt, falls der Browser die Seite im Hintergrund neu lädt
  function warten() {
    rolle = "gastgeber"; merken();
    $(".lr-zeigen").textContent = code; $(".lr-info").textContent = "Verbinde …"; zeigen(teilWarten); melden("");
    verbinden(() => { if (!zaehler && !laeuft && !imRaum) $(".lr-info").textContent = "Warte auf deinen Gegner …"; });
  }
  $(".lr-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!nameOk()) return;
    code = codeFeld.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
    if (code.length !== 4) { melden("Der Code hat vier Zeichen.", true); return; }
    trennen();
    rolle = "gast"; vorbereiten(); melden("Suche das Rennen …");
    let n = 0;
    // anklopfen, bis der Gastgeber antwortet: er ist vielleicht gerade in einer anderen App, um den Code zu verschicken
    const klopfen = () => {
      if (zaehler || laeuft || imRaum) return;
      if (++n > 50) { abbruch("Kein Rennen mit diesem Code gefunden."); return; }
      if (n === 6) melden("Der Gastgeber antwortet noch nicht. Ich versuche es weiter …");
      rufen("hallo", { id: ich, name: name() });
    };
    verbinden(() => { clearInterval(hallo); hallo = null; if (zaehler || laeuft || imRaum) return; klopfen(); hallo = setInterval(klopfen, 1200); });
  });
  $(".lr-teilen").addEventListener("click", async () => {
    const link = `${location.origin}${location.pathname}?rennen=${code}`, text = `Wettrennen bei Fröbelinchen rennt! Code: ${code}`;
    try {
      if (navigator.share) await navigator.share({ title: "Fröbelinchen rennt", text, url: link });
      else { await navigator.clipboard.writeText(link); $(".lr-info").textContent = "Link kopiert. Warte auf deinen Gegner …"; }
    } catch (e) {}
  });
  const zu = () => { feld.hidden = true; if (!laeuft) { if (imRaum) rufen("tschuess", { id: ich }); trennen(); vergessen(); zeigen(teilStart); melden(""); } };
  $(".lr-x").addEventListener("click", zu);
  knopf.addEventListener("click", () => oeffnen());

  function oeffnen(mitCode) {
    if (laeuft && er && stand().z === "aus") return zurueckInRaum(true);       // Rennen vorbei: zurück in den Raum zur Revanche
    if (laeuft) ende();
    if (imRaum) zeigen(teilLobby);                                             // steht schon im Lobby-Raum
    else if (rolle === "gastgeber") zeigen(zaehler ? teilZaehler : teilWarten);     // wartet schon mit einem Code: dort weitermachen
    else { zeigen(teilStart); melden(""); if (mitCode) codeFeld.value = String(mitCode).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4); }
    feld.hidden = false;
  }
  function ende() { trennen(); }
  // Seite wurde neu geladen, während ein Rennen auf den Gegner wartete (höchstens 15 Minuten her): mit demselben Code weiter warten
  let wartet = false;
  try {
    const alt = JSON.parse(sessionStorage.getItem("froebelinchen-rennen") || "null");
    if (alt && /^[A-Z0-9]{4}$/.test(alt.code) && Date.now() - alt.zeit < 15 * 60000 && name() && !nameFehler(name())) { code = alt.code; warten(); feld.hidden = false; wartet = true; }
    else vergessen();
  } catch (e) {}
  const revanche = () => { if (laeuft && er) zurueckInRaum(true); else oeffnen(); };
  const ergebnis = (u) => { siege.runden++; if (u === "sieg") siege.ich++; else if (u === "niederlage") siege.er++; };
  return { oeffnen, ende, zu, revanche, ergebnis, emoji: (i) => rufen("emoji", { e: i }), streich: (art) => rufen("streich", { art }), aktiv: () => laeuft, wartet: () => wartet || rolle !== "" };
}
