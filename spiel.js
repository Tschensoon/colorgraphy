// Spielseite: Teilen, Offline-Hilfe und die Auswahlkarte oben. Das Spiel selbst steht in lauf.js.
(() => {
  // Teilen: Text mit dem eigenen Rekord aus „Fröbelinchen rennt“, falls schon gespielt
  const LINK = "https://colorgraphy.de/spiel.html";
  const rekord = () => { try { return +JSON.parse(localStorage.getItem("froebelinchen-rennt-rekord") || "0") || 0; } catch (e) { return 0; } };
  const teilText = () => (rekord() > 0 ? `Ich habe ${rekord()} Punkte bei Fröbelinchen rennt geschafft. Schaffst du mehr?`
                                       : "Schaffst du mehr Punkte als ich? Fröbelinchen rennt:");
  const wa = document.getElementById("spiel-whatsapp"), kopiert = document.getElementById("spiel-kopiert"), teilen = document.getElementById("spiel-teilen");
  if (wa) wa.addEventListener("click", () => { wa.href = "https://wa.me/?text=" + encodeURIComponent(teilText() + " " + LINK); });
  if (teilen) teilen.addEventListener("click", async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "Fröbelinchen rennt", text: teilText(), url: LINK }); return; }
      catch (e) { if (e.name === "AbortError") return; }
    }
    try { await navigator.clipboard.writeText(teilText() + " " + LINK); kopiert.textContent = "Link kopiert, jetzt einfach einfügen und verschicken."; }
    catch (e) { kopiert.textContent = LINK; }
  });

  // Offline spielbar (z. B. als App auf dem Startbildschirm): Dateien werden im Browser gemerkt, siehe sw.js
  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});

  // Auswahlkarte oben: am Handy öffnet sie das Spiel im Vollbild, am PC springt die Seite zum Spiel
  document.querySelectorAll(".wahl-karte").forEach(k => k.addEventListener("click", () => {
    if (window.froebelRennen) window.froebelRennen.oeffnen();
  }));
})();
