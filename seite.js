// Gemeinsam für die Tool-Seiten: Hell/Dunkel-Umschalter und Handy-Menü
"use strict";
(() => {
  const btn = document.querySelector(".theme-btn"), meta = document.querySelector('meta[name="theme-color"]');
  const set = (light) => {
    if (light) document.documentElement.dataset.theme = "light"; else delete document.documentElement.dataset.theme;
    meta.content = light ? "#ffffff" : "#000000";
    btn.setAttribute("aria-label", light ? "Dunkles Design einschalten" : "Helles Design einschalten");
  };
  set(document.documentElement.dataset.theme === "light");
  btn.addEventListener("click", () => { const light = document.documentElement.dataset.theme !== "light"; set(light); try { localStorage.setItem("theme", light ? "light" : "dark"); } catch (e) {} });
  const nav = document.querySelector(".nav"), menu = nav.querySelector(".menu-btn");
  const auf = (o) => { nav.classList.toggle("open", o); menu.setAttribute("aria-expanded", String(o)); menu.setAttribute("aria-label", o ? "Menü schließen" : "Menü öffnen"); };
  menu.addEventListener("click", () => auf(!nav.classList.contains("open")));
  nav.querySelectorAll("nav a").forEach((a) => a.addEventListener("click", () => auf(false)));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") auf(false); });
})();
