// Spielerkonten für „Fröbelinchen rennt“ (Supabase Auth ohne Bibliothek).
// Benutzername + Passwort; der Name wird intern zu <kennung>@spieler.colorgraphy.de (es gehen nie E-Mails raus).
// Der Spielstand liegt in der Tabelle „spieler“ und wird mit dem localStorage des Geräts abgeglichen.

const DOMAIN = "@spieler.colorgraphy.de";
const SITZUNG = "froebelinchen-sitzung", GEHOERT = "froebelinchen-konto-id", KNAME = "froebelinchen-konto-name", ZEIT = "froebelinchen-rennt-stand-zeit";
// Was zum Spielstand gehört (Kurzname → localStorage-Schlüssel). Qualität und Ton bleiben je Gerät.
const TEILE = { erfahrung: "froebelinchen-rennt-erfahrung", rekord: "froebelinchen-rennt-rekord", konto: "froebelinchen-rennt-konto",
  aufgaben: "froebelinchen-rennt-aufgaben", figur: "froebelinchen-rennt-figur", tutorial: "froebelinchen-rennt-tutorial" };
const NAME_OK = /^[A-Za-zÄÖÜäöüß0-9 ._-]{3,16}$/;
const SPERRE = ["arsch", "fick", "fotze", "hure", "nazi", "hitler", "wichs", "schlampe", "spast", "missgeburt", "fuck", "shit", "bitch", "cunt", "nigg", "porn", "admin"];

// muss genau zu spieler_kennung() in konten-supabase.sql passen
export const kennung = (name) => "s-" + name.replace(/\s+/g, " ").trim().replace(/[ÄÖÜ]/g, (c) => c.toLowerCase()).toLowerCase()
  .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[ ._-]+/g, "-");
const normName = (n) => n.replace(/\s+/g, " ").trim();
function nameFehler(n) {
  if (n.length < 3 || n.length > 16) return "Der Name muss 3 bis 16 Zeichen lang sein.";
  if (!NAME_OK.test(n) || !/[A-Za-zÄÖÜäöüß0-9]/.test(n)) return "Bitte nur Buchstaben, Zahlen, Leerzeichen, Punkt, _ und -.";
  if (SPERRE.some((w) => n.toLowerCase().replace(/[\s._-]/g, "").includes(w))) return "Bitte einen anderen Namen wählen.";
  return "";
}

const lesen = (k) => { try { const x = localStorage.getItem(k); return x === null ? undefined : JSON.parse(x); } catch (e) { return undefined; } };
const setzen = (k, v) => { try { if (v === undefined) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

export function kontoStarten({ db, rahmen }) {
  let sitzung = lesen(SITZUNG) || null, offen = false, timer = null, laeuft = null;

  async function auth(pfad, body) {
    const r = await fetch(`${db.url}/auth/v1/${pfad}`, { method: "POST", headers: { apikey: db.key, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    let j = {}; try { j = await r.json(); } catch (e) {}
    if (!r.ok) { const e = new Error(j.msg || j.error_description || j.message || j.error || "Fehler " + r.status); e.status = r.status; e.code = j.error_code || j.code || j.error; throw e; }
    return j;
  }
  function sitzungMerken(j, name) {
    if (!j.access_token) throw new Error("Keine Sitzung erhalten (ist „Confirm email“ in Supabase noch an?)");
    sitzung = { at: j.access_token, rt: j.refresh_token, bis: Date.now() + (j.expires_in || 3600) * 1000 - 60000, id: j.user && j.user.id, name };
    setzen(SITZUNG, sitzung);
  }
  async function erneuern() {
    const j = await auth("token?grant_type=refresh_token", { refresh_token: sitzung.rt });
    sitzungMerken(j, sitzung.name);
  }
  // Anfrage an die Datenbank mit Anmeldung; bei abgelaufener Sitzung einmal erneuern
  async function rest(pfad, opt = {}, nochmal = true) {
    if (!sitzung) throw Object.assign(new Error("Nicht angemeldet"), { status: 401 });
    if (Date.now() > sitzung.bis) await erneuern();
    const r = await fetch(`${db.url}/rest/v1/${pfad}`, { ...opt, headers: { apikey: db.key, Authorization: `Bearer ${sitzung.at}`, "Content-Type": "application/json", ...(opt.headers || {}) }, cache: "no-store" });
    if (r.status === 401 && nochmal) { await erneuern(); return rest(pfad, opt, false); }
    let j = null; try { j = await r.json(); } catch (e) {}
    if (!r.ok) throw Object.assign(new Error((j && j.message) || "Fehler " + r.status), { status: r.status });
    return j;
  }

  const lokalerStand = () => { const s = {}; for (const [k, key] of Object.entries(TEILE)) { const v = lesen(key); if (v !== undefined) s[k] = v; } s.zeit = +lesen(ZEIT) || 0; return s; };
  const standSchreiben = (s) => { for (const [k, key] of Object.entries(TEILE)) setzen(key, s[k]); setzen(ZEIT, +s.zeit || 0); };
  // alter Gerätestand ohne Konto + Kontostand: von allem das Bessere behalten
  function vereinen(a, b) {
    const ka = a.konto || {}, kb = b.konto || {};
    return { ...b, ...a,
      erfahrung: Math.max(+a.erfahrung || 0, +b.erfahrung || 0), rekord: Math.max(+a.rekord || 0, +b.rekord || 0),
      konto: { ...kb, ...ka, sterne: Math.max(+ka.sterne || 0, +kb.sterne || 0), figuren: [...new Set([...(ka.figuren || []), ...(kb.figuren || [])])] },
      tutorial: !!(a.tutorial || b.tutorial), zeit: Date.now() };
  }

  async function hochladen(keepalive) {
    if (!sitzung) return;
    const s = lokalerStand();
    if (keepalive) {   // beim Verlassen der Seite: ohne Warten, ohne Erneuern
      try { fetch(`${db.url}/rest/v1/rpc/stand_speichern`, { method: "POST", keepalive: true, headers: { apikey: db.key, Authorization: `Bearer ${sitzung.at}`, "Content-Type": "application/json" }, body: JSON.stringify({ p_stand: s }) }); } catch (e) {}
      return;
    }
    await rest("rpc/stand_speichern", { method: "POST", body: JSON.stringify({ p_stand: s }) });
    offen = false;
  }
  function geaendert() {
    setzen(ZEIT, Date.now()); offen = true;
    clearTimeout(timer); timer = setTimeout(() => hochladen().catch(() => {}), 2500);
  }
  addEventListener("pagehide", () => { if (offen) hochladen(true); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && offen) hochladen(true); });
  addEventListener("online", () => { if (offen) hochladen().catch(() => {}); });

  // Stand vom Server holen und mit dem Gerät abgleichen
  async function abgleichen() {
    const zeilen = await rest(`spieler?select=name,stand&id=eq.${sitzung.id}`);
    if (!zeilen || !zeilen.length) throw Object.assign(new Error("Kein Spielerkonto gefunden"), { status: 401 });
    const server = zeilen[0].stand || {}, lokal = lokalerStand(), gehoert = lesen(GEHOERT);
    sitzung.name = zeilen[0].name; setzen(SITZUNG, sitzung);
    let hoch = false;
    if (gehoert === sitzung.id) {
      if (lokal.zeit > (+server.zeit || 0)) { standSchreiben({ ...lokal, erfahrung: Math.max(+lokal.erfahrung || 0, +server.erfahrung || 0), rekord: Math.max(+lokal.rekord || 0, +server.rekord || 0) }); hoch = true; }
      else standSchreiben(server);
    } else if (!gehoert) {             // Gerät hat noch Spielstand aus der Zeit vor den Konten
      standSchreiben(vereinen(lokal, server)); hoch = true;
    } else standSchreiben(server);     // vorher war hier jemand anderes angemeldet
    setzen(GEHOERT, sitzung.id); setzen(KNAME, sitzung.name);
    try { localStorage.setItem("froebelinchen-name", sitzung.name); } catch (e) {}
    if (hoch) await hochladen();
  }

  // ---------- Anmeldefenster ----------
  function fensterZeigen(hinweis) {
    return new Promise((fertig) => {
      const tor = document.createElement("div"); tor.className = "lauf-konto-tor";
      tor.innerHTML = `<button type="button" class="lk-zu" aria-label="Schließen">✕</button><form class="lk-karte" novalidate>
        <p class="lauf-titel">Fröbelinchen rennt</p>
        <div class="lk-reiter" role="tablist"><button type="button" role="tab" data-art="neu" aria-selected="true">Registrieren</button><button type="button" role="tab" data-art="an" aria-selected="false">Anmelden</button></div>
        <p class="lk-text"></p>
        <label>Benutzername<input name="name" maxlength="16" autocomplete="username" autocapitalize="off" spellcheck="false" enterkeyhint="next" required></label>
        <label>Passwort<input name="pw" type="password" minlength="6" autocomplete="new-password" enterkeyhint="next" required></label>
        <label class="lk-nur-neu">Passwort wiederholen<input name="pw2" type="password" autocomplete="new-password" enterkeyhint="go"></label>
        <p class="lk-meldung" role="status"></p>
        <button type="submit" class="pill lk-los">Konto anlegen</button>
        <p class="lk-klein lk-nur-neu">Der Name gilt für immer und steht auch in der Bestenliste. Passwort gut merken: Zurücksetzen geht nur über den Betreiber (<a href="impressum.html">Impressum</a>). <a href="datenschutz.html#konten">Datenschutz</a></p>
        <p class="lk-klein lk-nur-an">Passwort vergessen? Melde dich beim Betreiber (<a href="impressum.html">Impressum</a>).</p>
      </form>`;
      rahmen.append(tor);
      tor.querySelector(".lk-zu").addEventListener("click", () => { rahmen.classList.remove("vollbild"); document.body.classList.remove("spiel-offen"); });
      const f = tor.querySelector("form"), meldung = tor.querySelector(".lk-meldung"), los = tor.querySelector(".lk-los"), text = tor.querySelector(".lk-text");
      const hatAltstand = (+lesen(TEILE.erfahrung) || 0) > 0 && !lesen(GEHOERT);
      let art = hatAltstand || !lesen(KNAME) ? "neu" : "an";
      const fehler = (t) => { meldung.textContent = t; meldung.classList.toggle("fehler", !!t); };
      function artSetzen(a) {
        art = a; tor.classList.toggle("anmelden", a === "an");
        for (const b of tor.querySelectorAll(".lk-reiter button")) b.setAttribute("aria-selected", b.dataset.art === a);
        los.textContent = a === "an" ? "Anmelden" : "Konto anlegen";
        f.pw.autocomplete = a === "an" ? "current-password" : "new-password";
        text.textContent = hinweis || (a === "an" ? "Melde dich mit deinem Namen und Passwort an. So hast du deinen Spielstand auf jedem Gerät."
          : hatAltstand ? "Leg dir ein Konto an, damit deine Fröbel-Stufe nicht mehr verloren geht. Dein bisheriger Spielstand wird übernommen."
          : "Leg dir ein Konto an. Dein Spielstand wird gespeichert und ist auf jedem Gerät da.");
        fehler("");
      }
      for (const b of tor.querySelectorAll(".lk-reiter button")) b.addEventListener("click", () => { hinweis = ""; artSetzen(b.dataset.art); });
      artSetzen(art);
      if (lesen(KNAME)) f.name.value = lesen(KNAME);
      f.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = normName(f.name.value), pw = f.pw.value;
        const nf = nameFehler(name); if (nf) { fehler(nf); f.name.focus(); return; }
        if (pw.length < 6) { fehler("Das Passwort braucht mindestens 6 Zeichen."); f.pw.focus(); return; }
        if (art === "neu" && pw !== f.pw2.value) { fehler("Die beiden Passwörter sind nicht gleich."); f.pw2.focus(); return; }
        los.disabled = true; fehler(""); meldung.textContent = art === "neu" ? "Konto wird angelegt …" : "Anmelden …";
        try {
          const email = kennung(name) + DOMAIN;
          const j = art === "neu" ? await auth("signup", { email, password: pw, data: { name } }) : await auth("token?grant_type=password", { email, password: pw });
          sitzungMerken(j, name);
          await abgleichen();
          tor.remove(); fertig();
        } catch (err) {
          const c = String(err.code || ""), m = String(err.message || "");
          fehler(c === "user_already_exists" || /already registered/i.test(m) ? "Diesen Namen gibt es schon. Bitte einen anderen wählen oder anmelden."
            : c === "invalid_credentials" || /invalid login/i.test(m) ? "Name oder Passwort stimmt nicht."
            : c === "weak_password" ? "Das Passwort ist zu schwach. Bitte ein längeres wählen."
            : err.status === 429 ? "Zu viele Versuche. Bitte in ein paar Minuten nochmal."
            : /database error/i.test(m) ? "Dieser Name ist nicht erlaubt. Bitte einen anderen wählen."
            : err instanceof TypeError ? "Keine Verbindung. Bist du online?" : "Hat nicht geklappt: " + m);
        } finally { los.disabled = false; }
      });
    });
  }

  // Wartet, bis jemand angemeldet ist und der Spielstand auf dem Gerät liegt
  async function bereit() {
    if (sitzung && sitzung.id) {
      try {
        await Promise.race([abgleichen(), new Promise((_, nein) => setTimeout(() => nein(new Error("langsam")), 5000))]);
        return;
      } catch (e) {
        // offline oder langsam: mit dem Gerätestand weiterspielen, sofern er zu diesem Konto gehört
        if (e.status !== 401 && e.status !== 400 && lesen(GEHOERT) === sitzung.id) return;
        sitzung = null; setzen(SITZUNG, undefined);
      }
    }
    await fensterZeigen(lesen(KNAME) ? "Bitte melde dich wieder an." : "");
  }

  async function abmelden() {
    if (offen) { try { await hochladen(); } catch (e) {} }
    try { if (sitzung) await fetch(`${db.url}/auth/v1/logout`, { method: "POST", headers: { apikey: db.key, Authorization: `Bearer ${sitzung.at}` } }); } catch (e) {}
    sitzung = null; setzen(SITZUNG, undefined);
    for (const key of Object.values(TEILE)) setzen(key, undefined);
    setzen(ZEIT, undefined); setzen(GEHOERT, undefined);
    location.reload();
  }

  async function eintragen(punkte, sekunden) {
    return rest("rpc/eintragen_konto", { method: "POST", body: JSON.stringify({ p_punkte: punkte, p_sekunden: sekunden }) });
  }

  return { bereit: () => laeuft || (laeuft = bereit()), name: () => sitzung && sitzung.name, geaendert, abmelden, eintragen, TEILE };
}
