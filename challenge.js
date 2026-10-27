// Foto-Challenge: Tages-Challenge (für alle gleich, wiederholt sich nicht), Würfel-Automat, Missionen, Serie und Abzeichen.
// Inhalte stehen in challenge-daten.js. Der Fortschritt bleibt im Browser (localStorage).
"use strict";

const $ = (id) => document.getElementById(id);
const ruhig = matchMedia("(prefers-reduced-motion: reduce)").matches;
const zwei = (n) => String(n).padStart(2, "0");
const tagesSchluessel = (d = new Date()) => `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`;
const tagNummer = (d = new Date()) => Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(2026, 0, 1)) / 864e5);
const zufall = (n) => Math.floor(Math.random() * n);

/* ---------- Speicher ---------- */
const SPEICHER = "foto-challenge";
let stand = { verlauf: [], gewuerfelt: [], missionen: [], joker: {}, ersatz: {}, abzeichen: [] };
try { Object.assign(stand, JSON.parse(localStorage.getItem(SPEICHER)) || {}); } catch (e) {}
const sichern = () => { try { localStorage.setItem(SPEICHER, JSON.stringify(stand)); } catch (e) {} };

/* ---------- Kombinationen ---------- */
KONFLIKTE.push(["d", "fensterlicht"]);
const M = MOTIVE.length, T = TECHNIKEN.length, R = REGELN.length, N = M * T * R;
const mTags = (i) => [MOTIVE[i][1], ...(MOTIVE[i][2] ? [MOTIVE[i][2]] : [])];
const tTags = (i) => TECHNIKEN[i][4] || [];
const rTags = (i) => REGELN[i][2] || [];
const vertragen = (a, b) => !KONFLIKTE.some(([x, y]) => (a.includes(x) && b.includes(y)) || (a.includes(y) && b.includes(x)));
const stimmig = (m, t, r) => vertragen(mTags(m), tTags(t)) && vertragen(mTags(m), rTags(r)) && vertragen(tTags(t), rTags(r));
const nurKamera = (t) => /Langzeit|offener Blende|Doppelbelichtung|Sonnenstern/.test(TECHNIKEN[t][0]);
const schwierigkeit = (t, r) => Math.max(1, Math.min(3, Math.round((TECHNIKEN[t][1] + REGELN[r][1]) / 2)));

// Tages-Challenge: eine feste Vertauschung aller Kombinationen, jeder Tag bekommt die nächste.
// So wiederholt sich die Tages-Challenge erst nach über 200.000 Tagen.
const ggT = (a, b) => (b ? ggT(b, a % b) : a);
let FAKTOR = 104729;
while (ggT(FAKTOR, N) !== 1) FAKTOR += 2;
// Tag n bekommt die n-te widerspruchsfreie Kombination dieser Reihenfolge, dadurch gibt es keine Wiederholungen
const kombiCache = [];
let suchIndex = 0;
const tagesKombi = (n) => {
  n = Math.max(0, n);
  while (kombiCache.length <= n && suchIndex < N) {
    const i = (suchIndex * FAKTOR + 7919) % N;
    suchIndex++;
    const m = i % M, t = Math.floor(i / M) % T, r = Math.floor(i / (M * T));
    if (stimmig(m, t, r)) kombiCache.push([m, t, r]);
  }
  return kombiCache[n % kombiCache.length];
};
const heute = () => {
  const s = tagesSchluessel(), [m, t, r] = tagesKombi(tagNummer()), e = stand.ersatz[s] || {};
  return { m: e.m ?? m, t: e.t ?? t, r: e.r ?? r };
};

const satz = (k) => `Fotografiere ${MOTIVE[k.m][0]} ${TECHNIKEN[k.t][0]}.`;
const tipp = (k) => {
  const [, , text, link] = TECHNIKEN[k.t];
  return `<strong>Tipp:</strong> ${text}${link ? ` <a href="${link}">Mehr dazu auf der Lernseite</a>` : ""}`;
};
const sterne = (n) => "★".repeat(n) + "☆".repeat(3 - n);
const sterneHtml = (n) => `<span aria-hidden="true">${"★".repeat(n)}<span class="leer">${"★".repeat(3 - n)}</span></span>`;
const STUFEN = ["", "Entspannt", "Mittel", "Knifflig"];
const walzenFuellen = (box, k) => {
  box.querySelector('[data-teil="motiv"] .walze-text').textContent = MOTIVE[k.m][0];
  box.querySelector('[data-teil="technik"] .walze-text').textContent = TECHNIKEN[k.t][0];
  box.querySelector('[data-teil="regel"] .walze-text').textContent = REGELN[k.r][0];
};

/* ---------- Tabs ---------- */
const tabZeigen = (name) => {
  document.querySelectorAll(".ch-tabs button").forEach((b) => { const an = b.dataset.tab === name; b.setAttribute("aria-pressed", String(an)); b.setAttribute("aria-selected", String(an)); });
  document.querySelectorAll(".ch-panel").forEach((p) => (p.hidden = p.dataset.panel !== name));
  if (name === "fortschritt") fortschrittZeigen();
  try { history.replaceState(null, "", name === "heute" ? location.pathname : "#" + name); } catch (e) {}
};
document.querySelectorAll(".ch-tabs button").forEach((b) => b.addEventListener("click", () => tabZeigen(b.dataset.tab)));

/* ---------- Heute ---------- */
const heuteZeigen = () => {
  const k = heute(), s = tagesSchluessel(), stufe = schwierigkeit(k.t, k.r);
  $("heute-datum").textContent = new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
  $("heute-sterne").innerHTML = `${sterneHtml(stufe)} ${STUFEN[stufe]}`;
  $("heute-sterne").setAttribute("aria-label", `Schwierigkeit: ${STUFEN[stufe]}`);
  walzenFuellen($("heute-walzen"), k);
  $("heute-satz").innerHTML = `${satz(k)} <span class="regel">${REGELN[k.r][0]}</span>`;
  $("heute-tipp").innerHTML = tipp(k);
  const erledigt = stand.verlauf.some((v) => v.art === "tag" && v.datum === s), joker = 3 - (stand.joker[s] || 0);
  $("heute-geschafft").disabled = erledigt;
  $("heute-geschafft").textContent = erledigt ? "✓ Heute geschafft" : "Geschafft!";
  $("heute-joker").textContent = joker > 0 ? `${joker} ${joker === 1 ? "Joker" : "Joker"} übrig: Tippe auf 🎲, um einen Teil neu zu würfeln` : "Alle Joker für heute verbraucht";
  document.querySelectorAll(".joker-knopf").forEach((b) => (b.disabled = joker <= 0 || erledigt));
  countdown();
};
const countdown = () => {
  const jetzt = new Date(), morgen = new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate() + 1);
  const min = Math.ceil((morgen - jetzt) / 60000), h = Math.floor(min / 60);
  $("heute-countdown").textContent = `Neue Challenge in ${h ? h + " Std. " : ""}${min % 60} Min.`;
};
let letzterTag = tagesSchluessel();
setInterval(() => { if (tagesSchluessel() !== letzterTag) { letzterTag = tagesSchluessel(); heuteZeigen(); } else countdown(); }, 30000);

document.querySelectorAll(".joker-knopf").forEach((b) => b.addEventListener("click", () => {
  const s = tagesSchluessel();
  if ((stand.joker[s] || 0) >= 3) return;
  const k = heute(), teil = b.dataset.joker, neu = { ...k };
  for (let v = 0; v < 200; v++) {
    if (teil === "motiv") neu.m = zufall(M); else if (teil === "technik") neu.t = zufall(T); else neu.r = zufall(R);
    if (stimmig(neu.m, neu.t, neu.r) && (neu.m !== k.m || neu.t !== k.t || neu.r !== k.r)) break;
  }
  stand.ersatz = { [s]: { ...(stand.ersatz[s] || {}), [teil[0]]: neu[teil[0]] } };
  stand.joker = { [s]: (stand.joker[s] || 0) + 1 };
  sichern();
  const walze = b.closest(".walze");
  drehen(walze, teil, teil === "motiv" ? MOTIVE[neu.m][0] : teil === "technik" ? TECHNIKEN[neu.t][0] : REGELN[neu.r][0], 700).then(heuteZeigen);
  if (stand.joker[s] === 3) neueAbzeichen();
}));

const geschafft = (eintrag) => {
  const jetzt = new Date();
  stand.verlauf.push({ ...eintrag, datum: tagesSchluessel(jetzt), stunde: jetzt.getHours(), tag: jetzt.getDay() });
  sichern();
  konfetti();
  neueAbzeichen();
};
$("heute-geschafft").addEventListener("click", () => {
  const k = heute();
  geschafft({ art: "tag", text: `${satz(k)} ${REGELN[k.r][0]}` });
  heuteZeigen();
});

/* ---------- Walzen-Animation ---------- */
const drehen = (walze, teil, ziel, dauer) => new Promise((fertig) => {
  const feld = walze.querySelector(".walze-text"), liste = teil === "motiv" ? MOTIVE : teil === "technik" ? TECHNIKEN : REGELN;
  if (ruhig) { feld.textContent = ziel; fertig(); return; }
  walze.classList.add("dreht");
  const start = performance.now();
  const schritt = (zeit) => {
    const t = (zeit - start) / dauer;
    if (t >= 1) { feld.textContent = ziel; walze.classList.remove("dreht"); walze.classList.add("stopp"); setTimeout(() => walze.classList.remove("stopp"), 400); fertig(); return; }
    feld.textContent = liste[zufall(liste.length)][0];
    setTimeout(() => requestAnimationFrame(schritt), 40 + 220 * t * t);
  };
  requestAnimationFrame(schritt);
});

/* ---------- Würfeln ---------- */
let wurf = null, wuerfelt = false;
$("w-los").addEventListener("click", async () => {
  if (wuerfelt) return;
  const ort = $("w-ort").value, stufe = $("w-schwer").value, handy = $("w-geraet").value === "handy";
  const motive = MOTIVE.map((_, i) => i).filter((i) => ort === "alle" || MOTIVE[i][1] === ort || MOTIVE[i][1] === "b");
  const techniken = TECHNIKEN.map((_, i) => i).filter((i) => !handy || !nurKamera(i));
  let k = null;
  for (let v = 0; v < 3000 && !k; v++) {
    const m = motive[zufall(motive.length)], t = techniken[zufall(techniken.length)], r = zufall(R);
    if (!stimmig(m, t, r)) continue;
    if (ort !== "alle" && !(vertragen([ort], tTags(t)) && vertragen([ort], rTags(r)))) continue;
    if (stufe !== "alle" && schwierigkeit(t, r) !== +stufe) continue;
    if (stand.gewuerfelt.includes(`${m}-${t}-${r}`) && v < 2500) continue;
    k = { m, t, r };
  }
  if (!k) return;
  wurf = k; wuerfelt = true;
  stand.gewuerfelt.push(`${k.m}-${k.t}-${k.r}`);
  if (stand.gewuerfelt.length > 5000) stand.gewuerfelt = stand.gewuerfelt.slice(-5000);
  sichern();
  $("w-los").disabled = true; $("w-satz").textContent = ""; $("w-tipp").textContent = ""; $("w-geschafft").hidden = $("w-karte").hidden = true;
  const box = $("w-walzen");
  await Promise.all([
    drehen(box.querySelector('[data-teil="motiv"]'), "motiv", MOTIVE[k.m][0], 900),
    drehen(box.querySelector('[data-teil="technik"]'), "technik", TECHNIKEN[k.t][0], 1350),
    drehen(box.querySelector('[data-teil="regel"]'), "regel", REGELN[k.r][0], 1800),
  ]);
  const st = schwierigkeit(k.t, k.r);
  $("w-satz").innerHTML = `${satz(k)} <span class="regel">${REGELN[k.r][0]}</span>`;
  $("w-tipp").innerHTML = tipp(k);
  $("w-info").textContent = `${sterne(st)} ${STUFEN[st]} · ${stand.gewuerfelt.length} ${stand.gewuerfelt.length === 1 ? "Kombination" : "Kombinationen"} gewürfelt, keine kommt doppelt.`;
  $("w-geschafft").hidden = $("w-karte").hidden = false;
  $("w-geschafft").disabled = false; $("w-geschafft").textContent = "Geschafft!";
  $("w-los").disabled = false; $("w-los").textContent = "Nochmal würfeln";
  wuerfelt = false;
});
$("w-geschafft").addEventListener("click", () => {
  if (!wurf) return;
  geschafft({ art: "wurf", text: `${satz(wurf)} ${REGELN[wurf.r][0]}` });
  $("w-geschafft").disabled = true; $("w-geschafft").textContent = "✓ Geschafft";
});

/* ---------- Missionen ---------- */
let mission = null;
$("m-neu").addEventListener("click", () => {
  const offen = MISSIONEN.map((_, i) => i).filter((i) => !stand.missionen.includes(i) && i !== mission);
  if (!offen.length) { $("m-titel").textContent = "Alle Missionen erfüllt!"; $("m-text").textContent = "Du hast alle 100 Missionen geschafft. Respekt! Neue folgen."; return; }
  mission = offen[zufall(offen.length)];
  const karte = document.querySelector(".ch-karte.mission");
  karte.classList.remove("auftritt"); void karte.offsetWidth; karte.classList.add("auftritt");
  $("m-nummer").textContent = `Mission ${mission + 1} von ${MISSIONEN.length}`;
  $("m-titel").textContent = MISSIONEN[mission][0];
  $("m-text").textContent = MISSIONEN[mission][1];
  $("m-neu").textContent = "Andere Mission";
  $("m-geschafft").hidden = $("m-karte").hidden = false;
  $("m-geschafft").disabled = false; $("m-geschafft").textContent = "Mission erfüllt!";
  $("m-info").textContent = `${stand.missionen.length} von ${MISSIONEN.length} Missionen erfüllt.`;
});
$("m-geschafft").addEventListener("click", () => {
  if (mission === null || stand.missionen.includes(mission)) return;
  stand.missionen.push(mission);
  geschafft({ art: "mission", text: `Mission „${MISSIONEN[mission][0]}“: ${MISSIONEN[mission][1]}` });
  $("m-geschafft").disabled = true; $("m-geschafft").textContent = "✓ Erfüllt";
  $("m-info").textContent = `${stand.missionen.length} von ${MISSIONEN.length} Missionen erfüllt.`;
});

/* ---------- Serie und Abzeichen ---------- */
const tageListe = () => [...new Set(stand.verlauf.map((v) => v.datum))].sort();
const tagWert = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 864e5;
const serie = () => {
  const tage = new Set(tageListe().map(tagWert)), heuteW = tagWert(tagesSchluessel());
  let start = tage.has(heuteW) ? heuteW : tage.has(heuteW - 1) ? heuteW - 1 : null, n = 0;
  while (start !== null && tage.has(start - n)) n++;
  return n;
};
const laengsteSerie = () => {
  const tage = tageListe().map(tagWert);
  let best = 0, lauf = 0;
  tage.forEach((t, i) => { lauf = i && t - tage[i - 1] === 1 ? lauf + 1 : 1; best = Math.max(best, lauf); });
  return best;
};
const ABZEICHEN = [
  ["erster", "📸", "Erster Schritt", "Deine erste Challenge geschafft", () => stand.verlauf.length >= 1],
  ["serie3", "🔥", "Dranbleiber", "3 Tage in Folge", () => laengsteSerie() >= 3],
  ["serie7", "🗓️", "Wochenheld", "7 Tage in Folge", () => laengsteSerie() >= 7],
  ["serie30", "🏆", "Monatsmeister", "30 Tage in Folge", () => laengsteSerie() >= 30],
  ["zehn", "🎯", "Zehnerpack", "10 Challenges geschafft", () => stand.verlauf.length >= 10],
  ["fuenfzig", "💎", "Bildersammler", "50 Challenges geschafft", () => stand.verlauf.length >= 50],
  ["wuerfel", "🎲", "Glücksspieler", "5 gewürfelte Challenges geschafft", () => stand.verlauf.filter((v) => v.art === "wurf").length >= 5],
  ["mission5", "🕵️", "Agent", "5 Missionen erfüllt", () => stand.missionen.length >= 5],
  ["mission25", "🚀", "Missionsprofi", "25 Missionen erfüllt", () => stand.missionen.length >= 25],
  ["eule", "🦉", "Nachteule", "Eine Challenge zwischen 21 und 5 Uhr geschafft", () => stand.verlauf.some((v) => v.stunde >= 21 || v.stunde < 5)],
  ["frueh", "🌅", "Frühaufsteher", "Eine Challenge vor 8 Uhr morgens geschafft", () => stand.verlauf.some((v) => v.stunde >= 5 && v.stunde < 8)],
  ["wochenende", "🏖️", "Wochenend-Krieger", "Samstag und Sonntag derselben Woche geschafft", () => {
    const tage = new Set(tageListe().map(tagWert));
    return stand.verlauf.some((v) => v.tag === 6 && tage.has(tagWert(v.datum) + 1));
  }],
  ["joker", "🃏", "Zocker", "Alle 3 Joker an einem Tag eingesetzt", () => Object.values(stand.joker).some((n) => n >= 3) || stand.abzeichen.includes("joker")],
];
const neueAbzeichen = () => {
  const neu = ABZEICHEN.filter(([id, , , , ok]) => !stand.abzeichen.includes(id) && ok());
  if (!neu.length) return;
  neu.forEach(([id]) => stand.abzeichen.push(id));
  sichern();
  const [, icon, name] = neu[0];
  meldung(`${icon} Neues Abzeichen: ${name}${neu.length > 1 ? ` und ${neu.length - 1} weitere` : ""}!`);
};
const fortschrittZeigen = () => {
  $("s-serie").textContent = serie();
  $("s-gesamt").textContent = stand.verlauf.length;
  $("s-missionen").textContent = stand.missionen.length;
  $("s-abzeichen").textContent = `${stand.abzeichen.length}/${ABZEICHEN.length}`;
  $("abzeichen").innerHTML = ABZEICHEN.map(([id, icon, name, text]) => {
    const da = stand.abzeichen.includes(id);
    return `<div class="abz${da ? " da" : ""}" title="${text}"><span class="abz-icon" aria-hidden="true">${da ? icon : "🔒"}</span><strong>${name}</strong><span>${text}</span></div>`;
  }).join("");
  const liste = stand.verlauf.slice(-15).reverse();
  $("verlauf").innerHTML = liste.length ? "" : '<li class="leer-eintrag">Noch nichts geschafft. Leg los!</li>';
  liste.forEach((v) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="v-datum">${new Date(v.datum + "T12:00").toLocaleDateString("de-DE", { day: "numeric", month: "short" })}</span><span class="v-text"></span>`;
    li.querySelector(".v-text").textContent = v.text;
    $("verlauf").append(li);
  });
};
$("zuruecksetzen").addEventListener("click", () => {
  if (!confirm("Wirklich den ganzen Fortschritt löschen? Serie, Abzeichen und Verlauf sind dann weg.")) return;
  stand = { verlauf: [], gewuerfelt: [], missionen: [], joker: {}, ersatz: {}, abzeichen: [] };
  sichern(); fortschrittZeigen(); heuteZeigen();
});

/* ---------- Meldung und Konfetti ---------- */
const meldung = (text) => {
  let el = document.querySelector(".ch-toast");
  if (!el) { el = document.createElement("div"); el.className = "ch-toast"; el.setAttribute("role", "status"); document.body.append(el); }
  el.textContent = text; el.classList.add("an");
  clearTimeout(el.zeit); el.zeit = setTimeout(() => el.classList.remove("an"), 3500);
};
const konfetti = () => {
  if (ruhig) return;
  const c = $("konfetti"), g = c.getContext("2d"), dpr = Math.min(devicePixelRatio || 1, 2);
  c.width = innerWidth * dpr; c.height = innerHeight * dpr;
  const farben = ["#ff4d6d", "#ff9f1c", "#ffd23f", "#3ddc84", "#3aa0ff", "#8b5cf6"];
  const teile = Array.from({ length: 160 }, () => ({ x: innerWidth / 2 + (Math.random() - 0.5) * 200, y: innerHeight * 0.55, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 16 - 6, r: Math.random() * 6.3, vr: (Math.random() - 0.5) * 0.4, w: 6 + Math.random() * 6, f: farben[zufall(6)] }));
  const start = performance.now();
  const bild = (t) => {
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, innerWidth, innerHeight);
    teile.forEach((p) => {
      p.vy += 0.45; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.f; g.fillRect(-p.w / 2, -p.w / 4, p.w, p.w / 2); g.restore();
    });
    if (t - start < 2600) requestAnimationFrame(bild); else g.clearRect(0, 0, innerWidth, innerHeight);
  };
  requestAnimationFrame(bild);
};

/* ---------- Story-Karte (1080 × 1920) und Teilen ---------- */
const umbrechen = (g, text, breite) => {
  const zeilen = [];
  let zeile = "";
  text.split(" ").forEach((w) => { const probe = zeile ? zeile + " " + w : w; if (g.measureText(probe).width > breite && zeile) { zeilen.push(zeile); zeile = w; } else zeile = probe; });
  if (zeile) zeilen.push(zeile);
  return zeilen;
};
const storyKarte = async (titel, bloecke) => {
  await document.fonts?.ready;
  const W = 1080, H = 1920, c = document.createElement("canvas"), g = c.getContext("2d");
  c.width = W; c.height = H;
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#120b2a"); bg.addColorStop(0.55, "#2a1557"); bg.addColorStop(1, "#0b1a3a");
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  [["#8b5cf6", 900, 300, 520], ["#ff4d6d", 120, 1500, 460], ["#3aa0ff", 980, 1650, 380]].forEach(([f, x, y, r]) => {
    const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, f + "66"); rg.addColorStop(1, f + "00"); g.fillStyle = rg; g.fillRect(0, 0, W, H);
  });
  const regenbogen = g.createLinearGradient(90, 0, W - 90, 0);
  ["#ff4d6d", "#ff9f1c", "#ffd23f", "#3ddc84", "#3aa0ff", "#8b5cf6"].forEach((f, i) => regenbogen.addColorStop(i / 5, f));
  g.fillStyle = regenbogen; g.fillRect(90, 200, W - 180, 10);
  g.fillStyle = "#ffffff"; g.textBaseline = "top";
  g.font = "700 40px Figtree, Arial, sans-serif"; g.fillText("colorgraphy · FOTO-CHALLENGE", 90, 120);
  g.font = "800 92px Figtree, Arial, sans-serif";
  let y = 270;
  umbrechen(g, titel, W - 180).forEach((z) => { g.fillText(z, 90, y); y += 104; });
  y += 40;
  bloecke.forEach(([label, text]) => {
    g.font = "600 46px Figtree, Arial, sans-serif";
    const zeilen = umbrechen(g, text, W - 260), hoehe = 90 + zeilen.length * 60;
    g.fillStyle = "rgba(255,255,255,0.09)"; g.beginPath(); g.roundRect(90, y, W - 180, hoehe, 36); g.fill();
    g.fillStyle = "#c9b6ff"; g.font = "700 32px Figtree, Arial, sans-serif"; g.fillText(label.toUpperCase(), 130, y + 30);
    g.fillStyle = "#ffffff"; g.font = "600 46px Figtree, Arial, sans-serif";
    zeilen.forEach((z, i) => g.fillText(z, 130, y + 76 + i * 60));
    y += hoehe + 28;
  });
  // Freie Fläche für das eigene Ergebnisfoto
  const frei = H - 340 - y - 20;
  if (frei > 260) {
    g.setLineDash([22, 16]); g.lineWidth = 5; g.strokeStyle = "rgba(255,255,255,0.35)";
    g.beginPath(); g.roundRect(90, y + 20, W - 180, frei, 40); g.stroke(); g.setLineDash([]);
    g.textAlign = "center"; g.fillStyle = "rgba(255,255,255,0.55)"; g.font = "700 50px Figtree, Arial, sans-serif";
    g.fillText("Dein Foto hier", W / 2, y + 20 + frei / 2 - 30);
    g.font = "500 34px Figtree, Arial, sans-serif"; g.fillText("In Instagram einfach drüberlegen", W / 2, y + 20 + frei / 2 + 34);
    g.textAlign = "start";
  }
  g.textAlign = "center";
  g.fillStyle = "#ffffff"; g.font = "800 58px Figtree, Arial, sans-serif"; g.fillText("#colorgraphychallenge", W / 2, H - 260);
  g.fillStyle = "#c9b6ff"; g.font = "600 40px Figtree, Arial, sans-serif"; g.fillText("Mach mit: colorgraphy.de/challenge", W / 2, H - 180);
  const blob = await new Promise((ok) => c.toBlob(ok, "image/png"));
  const name = `foto-challenge-${tagesSchluessel()}.png`, datei = new File([blob], name, { type: "image/png" });
  if (navigator.canShare && matchMedia("(pointer: coarse)").matches && navigator.canShare({ files: [datei] })) {
    try { await navigator.share({ files: [datei] }); return; } catch (e) { if (e.name === "AbortError") return; }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 8000);
  meldung("Story-Karte gespeichert. Ab damit in deine Instagram-Story!");
};
const kombiBloecke = (k) => [["Motiv", MOTIVE[k.m][0]], ["Technik", TECHNIKEN[k.t][0]], ["Extra-Regel", REGELN[k.r][0]]];
$("heute-karte-laden").addEventListener("click", () => storyKarte("Meine Challenge heute", kombiBloecke(heute())));
$("w-karte").addEventListener("click", () => wurf && storyKarte("Meine gewürfelte Challenge", kombiBloecke(wurf)));
$("m-karte").addEventListener("click", () => mission !== null && storyKarte(`Mission: ${MISSIONEN[mission][0]}`, [["Aufgabe", MISSIONEN[mission][1]]]));
$("heute-teilen").addEventListener("click", async () => {
  const k = heute(), text = `Meine Foto-Challenge heute: ${satz(k)} ${REGELN[k.r][0]} #colorgraphychallenge`;
  if (navigator.share) { try { await navigator.share({ title: "Foto-Challenge", text, url: location.origin + location.pathname }); return; } catch (e) { if (e.name === "AbortError") return; } }
  try { await navigator.clipboard.writeText(`${text} ${location.origin + location.pathname}`); meldung("Text kopiert. Einfügen und teilen!"); }
  catch (e) { meldung("Teilen klappt in diesem Browser nicht."); }
});

/* ---------- Start ---------- */
heuteZeigen();
const start = location.hash.slice(1);
if (["wuerfeln", "missionen", "fortschritt"].includes(start)) tabZeigen(start);
