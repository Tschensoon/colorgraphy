// Als App auf dem Startbildschirm (iPhone/Android) fehlt das Aktualisieren des Browsers:
// hier gibt es dafür "nach unten ziehen" und nach längerer Pause automatisch eine frische Seite.
"use strict";
(() => {
  const app = navigator.standalone === true || matchMedia("(display-mode: standalone)").matches;
  if (!app) return;

  const css = document.createElement("style");
  css.textContent = `.ziehen{position:fixed;top:calc(env(safe-area-inset-top) + 8px);left:50%;z-index:2000;width:42px;height:42px;
    border-radius:50%;background:#fff;color:#7c3aed;box-shadow:0 4px 16px rgba(0,0,0,.3);display:flex;align-items:center;
    justify-content:center;pointer-events:none;opacity:0;transform:translate(-50%,-70px)}
    .ziehen svg{width:22px;height:22px}.ziehen.zurueck{transition:transform .25s,opacity .25s}
    .ziehen.laedt svg{animation:ziehen-drehen .8s linear infinite}@keyframes ziehen-drehen{to{transform:rotate(360deg)}}`;
  document.head.append(css);
  const zeichen = document.createElement("div");
  zeichen.className = "ziehen"; zeichen.setAttribute("aria-hidden", "true");
  zeichen.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M20 4v5h-5"/></svg>';
  document.body.append(zeichen);

  const SCHWELLE = 130; // so weit (px) muss der Finger nach unten
  let start = null, weg = 0;
  const zeigen = (w) => {
    const d = Math.min(w * .5, 80);
    zeichen.style.opacity = Math.min(1, w / SCHWELLE);
    zeichen.style.transform = `translate(-50%, ${d - 60}px) rotate(${w * 2}deg)`;
  };
  addEventListener("touchstart", (e) => {
    start = null;
    if (scrollY > 0 || e.touches.length !== 1) return;
    // Im Spiel wird getippt und gehalten, dort nicht aktualisieren
    if (document.body.classList.contains("spiel-offen") || e.target.closest(".spiel-rahmen")) return;
    start = e.touches[0].clientY; weg = 0; zeichen.classList.remove("zurueck");
  }, { passive: true });
  addEventListener("touchmove", (e) => {
    if (start === null) return;
    weg = scrollY > 0 ? 0 : Math.max(0, e.touches[0].clientY - start);
    zeigen(weg);
  }, { passive: true });
  addEventListener("touchend", () => {
    if (start === null) return;
    start = null;
    if (weg >= SCHWELLE) {
      zeichen.classList.add("laedt");
      zeichen.style.transform = "translate(-50%, 10px)";
      location.reload();
    } else {
      zeichen.classList.add("zurueck"); zeigen(0);
    }
  });

  // Nach mehr als 15 Minuten im Hintergrund die Seite frisch laden
  let weg_seit = 0;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) weg_seit = Date.now();
    else if (weg_seit && Date.now() - weg_seit > 15 * 60 * 1000) location.reload();
  });
})();
