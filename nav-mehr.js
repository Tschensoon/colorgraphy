"use strict";

// Handy-Menü: Esc gibt den Fokus an den Menüknopf zurück, damit er nicht im zugeklappten Menü verloren geht
const kopfzeile = document.querySelector(".nav");
kopfzeile?.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && kopfzeile.classList.contains("open")) kopfzeile.querySelector(".menu-btn").focus();
});

// Nach-oben-Knopf fürs Handy: erscheint nach einer Bildschirmhöhe. Im Spiel nicht, dort würde er im Weg liegen.
if (!document.querySelector(".spiel-rahmen,.lauf-rahmen")) {
  const knopf = document.createElement("button");
  knopf.type = "button";
  knopf.className = "nach-oben";
  knopf.setAttribute("aria-label", "Nach oben");
  knopf.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 15l7-7 7 7"/></svg>';
  document.body.append(knopf);
  const buehne = document.querySelector(".xray-stage");
  const unterzeile = document.querySelector(".xray-caption");
  const pruefen = () => {
    knopf.classList.toggle("sichtbar", scrollY > innerHeight);
    // Solange die 3D-Kamera steht, rutscht der Knopf über ihre Textbox
    const r = buehne && buehne.offsetHeight ? buehne.getBoundingClientRect() : null;
    const ueberBox = r && r.top < innerHeight / 2 && r.bottom > innerHeight - 20;
    knopf.style.bottom = ueberBox ? `calc(${unterzeile.offsetHeight}px + 1.75rem + env(safe-area-inset-bottom, 0px))` : "";
  };
  addEventListener("scroll", pruefen, { passive: true });
  addEventListener("resize", pruefen, { passive: true });
  if (unterzeile) new ResizeObserver(pruefen).observe(unterzeile); // Die Textbox ändert ihre Höhe auch ohne Scrollen
  pruefen();
  knopf.addEventListener("click", () => {
    scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    document.querySelector("main")?.focus({ preventScroll: true });
  });
}
