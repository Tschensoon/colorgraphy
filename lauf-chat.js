// Live-Chat für „Fröbelinchen rennt“: alle, die gerade die Spielseite offen haben, sehen neue Nachrichten sofort.
// Läuft über den Realtime-Kanal von Supabase (Broadcast für Nachrichten, Presence für „wer ist online“).
// Nachrichten liegen außerdem 30 Tage in der Tabelle chat_nachrichten bei Supabase; beim Öffnen werden die letzten 100 geladen.
export function chatStarten({ db, feld, knopf }) {
  const test = new URLSearchParams(location.search).get("chatkanal");
  const kanal = "realtime:froebel-chat" + (test ? "-" + test.replace(/[^a-z0-9]/gi, "").slice(0, 12) : "");
  const ich = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const $ = (s) => feld.querySelector(s);
  const liste = $(".chat-liste"), form = $(".chat-form"), eingabe = $(".chat-text"), nameFeld = $(".chat-name"), online = $(".chat-online"), status = $(".chat-status");
  const senden = form.querySelector("button");
  let ws = null, ref = 0, joinRef = null, verbunden = false, takt = null, warte = 1000, ungelesen = 0, zuletzt = 0, offen = false;
  const nachrichten = [], gesehen = new Set(), verlaufTimer = new Map();
  let leute = {};
  try { nameFeld.value = localStorage.getItem("froebelinchen-name") || ""; } catch (e) {}

  const rein = (event, payload) => {
    if (ws && ws.readyState === 1 && verbunden) ws.send(JSON.stringify({ topic: kanal, event, payload, ref: String(++ref), join_ref: joinRef }));
  };
  const rufen = (event, payload) => rein("broadcast", { type: "broadcast", event, payload });
  const name = () => nameFeld.value.replace(/\s+/g, " ").trim().slice(0, 16);
  const anmelden = () => rein("presence", { type: "presence", event: "track", payload: { name: name() || "Gast" } });

  function verbinden() {
    try { ws = new WebSocket(`${db.url.replace(/^http/, "ws")}/realtime/v1/websocket?apikey=${encodeURIComponent(db.key)}&vsn=1.0.0`); }
    catch (e) { return spaeter(); }
    ws.onopen = () => {
      joinRef = String(++ref);
      ws.send(JSON.stringify({ topic: kanal, event: "phx_join", ref: joinRef, join_ref: joinRef,
        payload: { config: { broadcast: { self: false, ack: false }, presence: { key: ich }, postgres_changes: [], private: false } } }));
      clearInterval(takt);
      takt = setInterval(() => { if (ws.readyState === 1) ws.send(JSON.stringify({ topic: "phoenix", event: "heartbeat", payload: {}, ref: String(++ref) })); }, 25000);
    };
    ws.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch (x) { return; } empfangen(m); };
    ws.onclose = () => { verbunden = false; clearInterval(takt); leute = {}; zeigen(); spaeter(); };
  }
  function spaeter() { setTimeout(verbinden, warte); warte = Math.min(30000, warte * 2); }

  function empfangen(m) {
    if (m.topic !== kanal) return;
    if (m.event === "phx_reply" && m.ref === joinRef) {
      if (m.payload && m.payload.status === "ok") { verbunden = true; warte = 1000; anmelden(); rufen("verlauf-bitte", { von: ich }); }
      zeigen(); return;
    }
    if (m.event === "presence_state") { leute = { ...m.payload }; zeigen(); return; }
    if (m.event === "presence_diff") {
      for (const k of Object.keys(m.payload.leaves || {})) delete leute[k];
      Object.assign(leute, m.payload.joins || {}); zeigen(); return;
    }
    if (m.event !== "broadcast" || !m.payload) return;
    const art = m.payload.event, p = m.payload.payload || {};
    if (art === "nachricht") dazu(p, true);
    else if (art === "verlauf-bitte" && p.von && p.von !== ich && nachrichten.length) {
      // Wer zuerst antwortet, schickt den Verlauf; die anderen lassen es dann
      clearTimeout(verlaufTimer.get(p.von));
      verlaufTimer.set(p.von, setTimeout(() => { verlaufTimer.delete(p.von); rufen("verlauf", { an: p.von, liste: nachrichten.slice(-40) }); }, 150 + Math.random() * 900));
    } else if (art === "verlauf") {
      if (p.an === ich && Array.isArray(p.liste)) p.liste.forEach(n => dazu(n, false));
      else { clearTimeout(verlaufTimer.get(p.an)); verlaufTimer.delete(p.an); }
    }
  }

  function dazu(n, neu) {
    if (!n || typeof n.text !== "string" || typeof n.id !== "string" || gesehen.has(n.id)) return;
    const eintrag = { id: n.id.slice(0, 40), von: String(n.von || "").slice(0, 20), name: String(n.name || "Gast").slice(0, 16), text: n.text.slice(0, 500), zeit: +n.zeit || Date.now() };
    gesehen.add(eintrag.id); nachrichten.push(eintrag); nachrichten.sort((a, b) => a.zeit - b.zeit);
    if (nachrichten.length > 200) nachrichten.splice(0, nachrichten.length - 200);
    if (neu && eintrag.von !== ich && !offen) ungelesen++;
    zeichnen(); zeigen();
  }

  function zeichnen() {
    const unten = liste.scrollHeight - liste.scrollTop - liste.clientHeight < 40;
    liste.textContent = "";
    if (!nachrichten.length) { const li = document.createElement("li"); li.className = "chat-leer"; li.textContent = "Noch keine Nachrichten. Schreib doch die erste!"; liste.append(li); }
    for (const n of nachrichten) {
      const li = document.createElement("li"), b = document.createElement("b"), t = document.createElement("span"), z = document.createElement("time");
      if (n.von === ich) li.className = "eigen";
      b.textContent = n.name; t.textContent = n.text;
      const d = new Date(n.zeit); z.textContent = d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }); z.dateTime = d.toISOString();
      li.append(b, z, t); liste.append(li);
    }
    if (unten || offen) liste.scrollTop = liste.scrollHeight;
  }

  function zeigen() {
    const namen = Object.values(leute).map(l => (l.metas && l.metas[0] && l.metas[0].name) || "Gast");
    online.textContent = verbunden ? `👥 ${namen.length} online${namen.length ? ": " + namen.slice(0, 8).join(", ") + (namen.length > 8 ? " …" : "") : ""}` : "Verbinde …";
    senden.disabled = !verbunden;
    knopf.textContent = "💬 Chat" + (ungelesen ? ` (${ungelesen})` : "");
    knopf.classList.toggle("neu", ungelesen > 0);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = eingabe.value.trim().slice(0, 500);
    status.textContent = "";
    if (!text) return;
    if (!name()) { status.textContent = "Bitte zuerst oben deinen Namen eintragen."; nameFeld.focus(); return; }
    if (!verbunden) { status.textContent = "Gerade keine Verbindung, gleich nochmal versuchen."; return; }
    if (Date.now() - zuletzt < 700) return;
    zuletzt = Date.now();
    const n = { id: ich + "-" + Date.now().toString(36), von: ich, name: name(), text, zeit: Date.now() };
    dazu(n, false); rufen("nachricht", n); speichern(n); eingabe.value = "";
  });
  nameFeld.addEventListener("change", () => {
    try { localStorage.setItem("froebelinchen-name", name()); } catch (e) {}
    anmelden();
  });
  for (const f of [eingabe, nameFeld]) f.addEventListener("keydown", (e) => e.stopPropagation());   // Tippen steuert nicht das Spiel

  // Gespeicherte Nachrichten der letzten 30 Tage holen (der Testkanal bleibt ungespeichert)
  async function laden() {
    if (test) return;
    try {
      const r = await fetch(`${db.url}/rest/v1/chat_nachrichten?select=id,von,name,text,zeit&order=zeit.desc&limit=100`, { headers: { apikey: db.key }, cache: "no-store" });
      if (!r.ok) return;
      for (const n of await r.json()) dazu({ ...n, zeit: Date.parse(n.zeit) }, false);
    } catch (e) {}
  }
  async function speichern(n) {
    if (test) return;
    try {
      const r = await fetch(`${db.url}/rest/v1/rpc/chat_senden`, { method: "POST", headers: { apikey: db.key, "Content-Type": "application/json" },
        body: JSON.stringify({ p_id: n.id, p_von: n.von, p_name: n.name, p_text: n.text }) });
      if (!r.ok) { let m = ""; try { m = (await r.json()).message; } catch (x) {} status.textContent = "Nicht gespeichert" + (m ? ": " + m : "") + ". Wer gerade online ist, hat sie trotzdem gesehen."; }
    } catch (e) { status.textContent = "Nicht gespeichert (keine Verbindung)."; }
  }

  zeichnen(); zeigen(); laden(); verbinden();
  return {
    oeffnen() { offen = true; ungelesen = 0; feld.hidden = false; zeichnen(); zeigen(); if (!matchMedia("(pointer: coarse)").matches) (name() ? eingabe : nameFeld).focus(); },
    schliessen() { offen = false; feld.hidden = true; zeigen(); },
  };
}
