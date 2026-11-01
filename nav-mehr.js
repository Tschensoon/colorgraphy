// Menüpunkt „Mehr“: per Klick oder Tastatur auf- und zuklappen, Esc schließt und gibt den Fokus zurück
"use strict";
document.querySelectorAll(".nav-mehr").forEach((mehr) => {
  const knopf = mehr.querySelector(".nav-mehr-titel");
  const setze = (auf) => { mehr.classList.toggle("auf", auf); knopf.setAttribute("aria-expanded", String(auf)); };
  knopf.addEventListener("click", () => setze(!mehr.classList.contains("auf")));
  mehr.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setze(false)));
  mehr.addEventListener("keydown", (e) => { if (e.key === "Escape" && mehr.classList.contains("auf")) { setze(false); knopf.focus(); } });
  mehr.addEventListener("focusout", (e) => { if (e.relatedTarget && !mehr.contains(e.relatedTarget)) setze(false); });
  document.addEventListener("click", (e) => { if (!mehr.contains(e.target)) setze(false); });
});
