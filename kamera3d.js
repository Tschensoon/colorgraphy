// Sony α7 II in Einzelteilen: vereinfachtes 3D-Modell (Three.js), das beim Scrollen auseinanderfliegt.
// Maße in Zentimetern, Objektivachse zeigt nach +z. Texte der Bauteile kommen aus der Liste im HTML.
const sektion = document.getElementById("innenleben");
const kannWebGL = (() => {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch (e) {
    return false;
  }
})();

if (sektion && kannWebGL) {
  sektion.classList.add("is-3d");
  const beobachter = new IntersectionObserver((eintraege) => {
    if (!eintraege.some((e) => e.isIntersecting)) return;
    beobachter.disconnect();
    Promise.all([import("./vendor/three/three.module.min.js"), import("./vendor/three/RoomEnvironment.js")])
      .then(([THREE, { RoomEnvironment }]) => aufbauen(THREE, RoomEnvironment))
      .catch(() => sektion.classList.remove("is-3d"));
  }, { rootMargin: "1200px 0px" });
  beobachter.observe(sektion);
}

function aufbauen(T, RoomEnvironment) {
  const buehne = sektion.querySelector(".xray-stage");
  const spur = sektion.querySelector(".xray-track");
  const canvas = sektion.querySelector(".xray-canvas");
  const ebene = sektion.querySelector(".xray-labels");
  const unterzeile = sektion.querySelector(".xray-caption");
  const liste = [...sektion.querySelectorAll(".xray-list li")].map((li) => ({
    key: li.dataset.teil,
    name: li.querySelector("strong").textContent,
    text: li.querySelector("span").textContent,
  }));

  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  const szene = new T.Scene();
  const pmrem = new T.PMREMGenerator(renderer);
  szene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  const kamera = new T.PerspectiveCamera(30, 1, 0.5, 400);
  const licht = new T.DirectionalLight(0xffffff, 2.2);
  licht.castShadow = true;
  licht.shadow.mapSize.set(innerWidth < 700 ? 1024 : 2048, innerWidth < 700 ? 1024 : 2048);
  Object.assign(licht.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 120 });
  licht.shadow.bias = -0.0004;
  licht.shadow.normalBias = 0.03;
  szene.add(licht, licht.target);
  const randlicht = new T.DirectionalLight(0x9d7bf7, 1.3);
  randlicht.position.set(-14, 6, -12);
  szene.add(randlicht);
  const boden = new T.Mesh(new T.PlaneGeometry(400, 400).rotateX(-Math.PI / 2), new T.ShadowMaterial({ opacity: 0.12 }));
  boden.receiveShadow = true;
  szene.add(boden);
  const modell = new T.Group();
  szene.add(modell);

  // ---------- Texturen (alles im Browser erzeugt, keine Bilddateien) ----------
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const leinwand = (w, h, malen) => {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    malen(c.getContext("2d"), w, h);
    return c;
  };
  const tex = (c, { farbe = true, wdh = [1, 1], versatz = [0, 0] } = {}) => {
    const t = new T.CanvasTexture(c);
    if (farbe) t.colorSpace = T.SRGBColorSpace;
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.repeat.set(...wdh);
    t.offset.set(...versatz);
    t.anisotropy = maxAniso;
    return t;
  };
  // Textur auf die Deckfläche eines Extrude-Körpers legen (UV = Form-Koordinaten in cm)
  const deckel = (c, w, h) => tex(c, { wdh: [1 / w, 1 / h], versatz: [0.5, 0.5] });
  let saat = 11;
  const zufall = () => (saat = (saat * 16807) % 2147483647) / 2147483647;

  // Höhenfeld (kachelbar) in eine Normal Map umrechnen
  const normalKarte = (n, hoehe, staerke) => leinwand(n, n, (g) => {
    const bild = g.createImageData(n, n), d = bild.data;
    const h = (x, y) => hoehe[((y + n) % n) * n + ((x + n) % n)];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const dx = (h(x + 1, y) - h(x - 1, y)) * staerke, dy = (h(x, y + 1) - h(x, y - 1)) * staerke;
      const l = Math.hypot(dx, dy, 1), i = (y * n + x) * 4;
      d[i] = (-dx / l * 0.5 + 0.5) * 255;
      d[i + 1] = (dy / l * 0.5 + 0.5) * 255;
      d[i + 2] = (1 / l * 0.5 + 0.5) * 255;
      d[i + 3] = 255;
    }
    g.putImageData(bild, 0, 0);
  });
  // Ledernarbung: Zellen (Worley-Rauschen), Fugen zwischen den Zellen liegen tiefer
  const lederHoehe = (() => {
    const n = 256, z = 22, gr = n / z, h = new Float32Array(n * n), p = [];
    for (let i = 0; i < z * z; i++) p.push([((i % z) + zufall()) * gr, (Math.floor(i / z) + zufall()) * gr]);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const cx = Math.floor(x / gr), cy = Math.floor(y / gr);
      let d1 = 1e9, d2 = 1e9;
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        const zx = (cx + ox + z) % z, zy = (cy + oy + z) % z, q = p[zy * z + zx];
        const d = Math.hypot(q[0] + (cx + ox - zx) * gr - x, q[1] + (cy + oy - zy) * gr - y);
        if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
      }
      h[y * n + x] = Math.min(1, (d2 - d1) / (gr * 0.45)) + zufall() * 0.08;
    }
    return h;
  })();
  // Feines Korn für den Lack
  const kornHoehe = (() => {
    const n = 256, a = new Float32Array(n * n).map(() => zufall()), b = new Float32Array(n * n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      let s = 0;
      for (let o = -1; o <= 1; o++) for (let q = -1; q <= 1; q++) s += a[((y + o + n) % n) * n + ((x + q + n) % n)];
      b[y * n + x] = s / 9;
    }
    return b;
  })();
  // Rändel: senkrechte Rippen
  const riffelHoehe = (() => {
    const n = 256, h = new Float32Array(n * n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) h[y * n + x] = Math.pow(Math.abs(Math.sin((x / n) * Math.PI * 16)), 0.6);
    return h;
  })();
  const narbeTex = tex(normalKarte(256, lederHoehe, 2.2), { farbe: false, wdh: [0.9, 0.9] });
  const kornTex = tex(normalKarte(256, kornHoehe, 1.5), { farbe: false, wdh: [0.7, 0.7] });
  const riffelTex = tex(normalKarte(256, riffelHoehe, 1.2), { farbe: false, wdh: [5, 1] });
  // Gebürstetes Metall: feine Längsstreifen in der Rauheit
  const buerstTex = tex(leinwand(256, 256, (g) => {
    g.fillStyle = "#5a5a5a"; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) {
      const v = 60 + zufall() * 90;
      g.fillStyle = `rgba(${v},${v},${v},0.5)`;
      g.fillRect(zufall() * 256, zufall() * 256, 20 + zufall() * 120, 1);
    }
  }), { farbe: false, wdh: [2, 2] });

  // Schrift-Helfer
  const SCHRIFT = "Figtree, Arial, sans-serif";
  const kreisText = (g, text, cx, cy, r, mitteWinkel, groesse, farbe = "#ececf0") => {
    g.save();
    g.font = `700 ${groesse}px ${SCHRIFT}`;
    g.fillStyle = farbe; g.textAlign = "center"; g.textBaseline = "middle";
    const breite = g.measureText(text).width, start = mitteWinkel - breite / r / 2;
    let a = start;
    for (const zeichen of text) {
      const w = g.measureText(zeichen).width;
      g.save();
      g.translate(cx + Math.cos(a + w / r / 2) * r, cy + Math.sin(a + w / r / 2) * r);
      g.rotate(a + w / r / 2 + Math.PI / 2);
      g.fillText(zeichen, 0, 0);
      g.restore();
      a += w / r;
    }
    g.restore();
  };

  // Moduswahlrad und Belichtungskorrektur (Draufsicht, Kreis füllt die Fläche)
  const radOben = (zeichen, bogen) => tex(leinwand(512, 512, (g) => {
    g.fillStyle = "#1a1a1f"; g.fillRect(0, 0, 512, 512);
    for (let r = 150; r > 4; r -= 2) {
      const v = 46 + zufall() * 22;
      g.strokeStyle = `rgb(${v},${v},${v + 4})`;
      g.beginPath(); g.arc(256, 256, r, 0, Math.PI * 2); g.stroke();
    }
    zeichen.forEach((z, i) => {
      const a = -Math.PI / 2 - bogen / 2 + (bogen * i) / (zeichen.length - 1);
      g.save();
      g.translate(256 + Math.cos(a) * 205, 256 + Math.sin(a) * 205);
      g.rotate(a + Math.PI / 2);
      g.font = `700 ${z.length > 2 ? 30 : 44}px ${SCHRIFT}`;
      g.fillStyle = z === "0" ? "#ffb020" : "#ececf0";
      g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText(z, 0, 0);
      g.restore();
    });
  }));
  const modusTex = radOben(["SCN", "MR", "M", "S", "A", "P", "AUTO", "PANO", "VIDEO"], Math.PI * 1.75);
  const korrekturTex = radOben(["+3", "•", "+2", "•", "+1", "•", "0", "•", "−1", "•", "−2", "•", "−3"], Math.PI * 1.3);

  // Brennweitenskala auf dem Zoomring (Band um den Tubus)
  const skalaTex = tex(leinwand(2048, 64, (g) => {
    g.font = `700 34px ${SCHRIFT}`;
    g.fillStyle = "#f2f2f5"; g.textAlign = "center"; g.textBaseline = "middle";
    ["24", "35", "50", "70", "105"].forEach((z, i) => g.fillText(z, 1024 - 260 + i * 130, 32));
  }));
  // Beschriftung am Frontring
  const frontTex = deckel(leinwand(1024, 1024, (g) => {
    g.fillStyle = "#151519"; g.fillRect(0, 0, 1024, 1024);
    const r = (3.36 / 3.62) * 512;
    kreisText(g, "24–105 mm  1:4", 512, 512, r, -Math.PI / 2, 30);
    kreisText(g, "Ø77 mm   OPTICAL STEADY SHOT", 512, 512, r, Math.PI / 2 + 0.05, 26, "#b8b8c0");
  }), 7.24, 7.24);

  // Display-Bild: wird durch das neueste Galerie-Foto ersetzt, sobald es eins gibt
  const displayLeinwand = leinwand(640, 427, () => {});
  const displayTex = tex(displayLeinwand, { wdh: [1, 1] });
  const malDisplay = (foto, exif = {}) => {
    const g = displayLeinwand.getContext("2d"), w = 640, h = 427;
    if (foto) {
      const s = Math.max(w / foto.naturalWidth, h / foto.naturalHeight);
      g.drawImage(foto, (w - foto.naturalWidth * s) / 2, (h - foto.naturalHeight * s) / 2, foto.naturalWidth * s, foto.naturalHeight * s);
    } else {
      const himmel = g.createLinearGradient(0, 0, 0, h * 0.64);
      himmel.addColorStop(0, "#26357f"); himmel.addColorStop(0.5, "#a5508c"); himmel.addColorStop(0.85, "#ff8a5c"); himmel.addColorStop(1, "#ffc46b");
      g.fillStyle = himmel; g.fillRect(0, 0, w, h);
      const sonne = g.createRadialGradient(420, 250, 4, 420, 250, 150);
      sonne.addColorStop(0, "rgba(255,244,210,1)"); sonne.addColorStop(0.12, "rgba(255,222,160,.95)"); sonne.addColorStop(1, "rgba(255,170,120,0)");
      g.fillStyle = sonne; g.fillRect(0, 0, w, h);
      [["#8a5390", 0.5, 70], ["#57367a", 0.57, 50], ["#2a1d4c", 0.63, 34]].forEach(([farbe, basis, amp], k) => {
        g.fillStyle = farbe; g.beginPath(); g.moveTo(0, h);
        for (let x = 0; x <= w; x += 6) g.lineTo(x, h * basis - amp * (0.55 + 0.45 * Math.sin(x / (60 + k * 30) + k * 2)) - amp * 0.25 * Math.sin(x / 17 + k));
        g.lineTo(w, h); g.fill();
      });
      const see = g.createLinearGradient(0, h * 0.64, 0, h);
      see.addColorStop(0, "#f39468"); see.addColorStop(0.35, "#6d4486"); see.addColorStop(1, "#120f2c");
      g.fillStyle = see; g.fillRect(0, h * 0.64, w, h * 0.36);
      g.fillStyle = "rgba(255,232,190,.55)";
      for (let i = 0; i < 16; i++) g.fillRect(420 - 70 + i * 3 + (i % 2) * 12, h * 0.655 + i * 8, 140 - i * 8, 2);
      g.fillStyle = "#0a0816"; g.beginPath(); g.moveTo(0, h); g.lineTo(0, h * 0.8);
      for (let x = 0; x <= 230; x += 9) g.lineTo(x, h * 0.8 - (x % 18 ? 8 : 34 + (x % 5) * 3) * (1 - x / 260));
      g.lineTo(260, h); g.fill();
    }
    // Aufnahme-Anzeige wie im Sucher
    g.fillStyle = "rgba(0,0,0,.38)"; g.fillRect(0, 0, w, 36); g.fillRect(0, h - 36, w, 36);
    g.fillStyle = "#fff"; g.textBaseline = "middle";
    g.font = `600 20px "JetBrains Mono", Consolas, monospace`;
    g.textAlign = "left"; g.fillText("P", 16, 18); g.fillText("RAW", 52, 18);
    g.textAlign = "right"; g.fillText("A7 II", w - 70, 18);
    g.strokeStyle = "#fff"; g.lineWidth = 2; g.strokeRect(w - 56, 9, 34, 18); g.fillRect(w - 22, 14, 4, 8); g.fillRect(w - 53, 12, 24, 12);
    g.textAlign = "center";
    g.fillText([exif.zeit || "1/250", exif.blende || "f/4", "±0.0", exif.iso || "ISO 100"].join("    "), w / 2, h - 18);
    g.strokeStyle = "#45d562"; g.lineWidth = 3;
    const fx = w * 0.62, fy = h * 0.5, fs = 26;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
      g.beginPath(); g.moveTo(fx + sx * fs, fy + sy * (fs - 12)); g.lineTo(fx + sx * fs, fy + sy * fs); g.lineTo(fx + sx * (fs - 12), fy + sy * fs); g.stroke();
    });
    displayTex.needsUpdate = true;
  };
  malDisplay();
  fetch("gallery.json").then((r) => r.json()).then((fotos) => {
    const f = fotos && fotos[0];
    if (!f) return;
    const img = new Image();
    img.onload = () => { malDisplay(img, f.exif || {}); anstossen(); };
    img.src = "vorschau/" + encodeURIComponent(f.datei) + "?v=" + (f.sha || "").slice(0, 8);
  }).catch(() => {});

  // Platine mit Leiterbahnen, Lötpunkten und Bestückungsdruck
  const platineTex = deckel(leinwand(1024, 700, (g, w, h) => {
    g.fillStyle = "#0d5535"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(0,0,0,${zufall() * 0.08})`; g.fillRect(zufall() * w, zufall() * h, 2, 2); }
    g.lineCap = "round"; g.lineJoin = "round";
    for (let i = 0; i < 140; i++) {
      g.strokeStyle = zufall() < 0.5 ? "#1f7a4e" : "#17694a";
      g.lineWidth = 2 + Math.floor(zufall() * 3);
      let x = zufall() * w, y = zufall() * h;
      g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 4; k++) {
        if (k % 2) y += (zufall() - 0.5) * 240; else x += (zufall() - 0.5) * 320;
        if (zufall() < 0.3) { x += 20; y += 20; }
        g.lineTo(x, y);
      }
      g.stroke();
      g.fillStyle = "#d9b25c"; g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = "#d9b25c";
    for (let i = 0; i < 260; i++) g.fillRect(zufall() * w, zufall() * h, 5, 3);
    [[24, 24], [w - 24, 24], [24, h - 24], [w - 24, h - 24]].forEach(([x, y]) => {
      g.beginPath(); g.arc(x, y, 14, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#081a12"; g.beginPath(); g.arc(x, y, 7, 0, Math.PI * 2); g.fill(); g.fillStyle = "#d9b25c";
    });
    g.strokeStyle = "rgba(240,240,240,.85)"; g.fillStyle = "rgba(240,240,240,.85)"; g.lineWidth = 2;
    g.font = `600 16px ${SCHRIFT}`;
    // Umrisse der Bauteile (Positionen relativ zur Platinenmitte, 1 cm = 109 px)
    const px = (x) => w / 2 + x * (w / 9.4), py = (y) => h / 2 - y * (h / 6.4);
    [[2.6, 1.3, 1.9, 1.9, "IC100"], [-2.9, 2.0, 1.5, 1.1, "IC300"], [-2.9, -1.9, 1.5, 1.1, "IC301"], [3.4, -1.7, 1.2, 1.6, "IC500"], [-0.6, -2.5, 2.4, 0.7, "CN201"]]
      .forEach(([x, y, bw, bh, name]) => {
        g.strokeRect(px(x - bw / 2), py(y + bh / 2), bw * (w / 9.4), bh * (h / 6.4));
        g.fillText(name, px(x - bw / 2), py(y + bh / 2) - 10);
      });
    ["C112", "R205", "L301", "C407", "R118", "Q210"].forEach((t, i) => g.fillText(t, 140 + i * 130, 330 + (i % 2) * 40));
  }), 9.4, 6.4);
  // Chip-Beschriftungen
  const chipTex = (zeilen, hell = false) => tex(leinwand(256, 256, (g) => {
    g.fillStyle = hell ? "#b8bcc4" : "#141418"; g.fillRect(0, 0, 256, 256);
    if (hell) for (let i = 0; i < 300; i++) { const v = 160 + zufall() * 40; g.fillStyle = `rgba(${v},${v},${v + 6},.5)`; g.fillRect(0, zufall() * 256, 256, 1); }
    g.fillStyle = hell ? "#2a2c33" : "#9a9aa2"; g.textAlign = "center"; g.textBaseline = "middle";
    zeilen.forEach((z, i) => { g.font = `${i ? 500 : 700} ${i ? 26 : 34}px ${SCHRIFT}`; g.fillText(z, 128, 128 + (i - (zeilen.length - 1) / 2) * 40); });
    g.beginPath(); g.arc(30, 226, 9, 0, Math.PI * 2); g.fill();
  }));
  // Sensor: Bayer-Muster (rot, grün, grün, blau) und Gehäuse mit Anschlüssen
  const bayerTex = tex(leinwand(16, 16, (g) => {
    [["#5a1a2a", 0, 0], ["#1f4a2a", 8, 0], ["#1f4a2a", 0, 8], ["#1d2a5e", 8, 8]].forEach(([f, x, y]) => { g.fillStyle = f; g.fillRect(x, y, 8, 8); });
  }), { wdh: [180, 120] });
  const sensorGehTex = deckel(leinwand(512, 416, (g, w, h) => {
    const v = g.createLinearGradient(0, 0, w, h); v.addColorStop(0, "#b28a48"); v.addColorStop(1, "#8a6a35");
    g.fillStyle = v; g.fillRect(0, 0, w, h);
    g.fillStyle = "#2b2116"; g.fillRect(52, 70, w - 104, h - 140);
    g.fillStyle = "#e8c77a";
    for (let i = 0; i < 40; i++) { g.fillRect(60 + i * 10, 52, 5, 12); g.fillRect(60 + i * 10, h - 64, 5, 12); }
    for (let i = 0; i < 26; i++) { g.fillRect(34, 80 + i * 10, 12, 5); g.fillRect(w - 46, 80 + i * 10, 12, 5); }
  }), 4.8, 3.9);
  // Akku- und Kartenaufdruck
  const akkuTex = tex(leinwand(512, 720, (g, w, h) => {
    g.fillStyle = "#24252b"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#3a3c44"; g.fillRect(0, 120, w, 70);
    g.fillStyle = "#ececf0"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = `800 64px ${SCHRIFT}`; g.fillText("NP-FW50", w / 2, 300);
    g.font = `600 38px ${SCHRIFT}`; g.fillText("Li-ion", w / 2, 380);
    g.font = `500 30px ${SCHRIFT}`; g.fillText("7.2 V  1020 mAh  7.3 Wh", w / 2, 440);
    g.fillStyle = "#9a9aa2"; g.font = `500 22px ${SCHRIFT}`; g.fillText("Rechargeable battery pack", w / 2, 520);
    g.strokeStyle = "#9a9aa2"; g.lineWidth = 3; g.beginPath(); g.moveTo(w / 2 - 22, 640); g.lineTo(w / 2 + 22, 640); g.lineTo(w / 2, 602); g.closePath(); g.stroke();
  }));
  const karteTex = tex(leinwand(640, 470, (g, w, h) => {
    const v = g.createLinearGradient(0, 0, w, h); v.addColorStop(0, "#2a1650"); v.addColorStop(1, "#0b0b12");
    g.fillStyle = v; g.fillRect(0, 0, w, h);
    g.fillStyle = "#8b5cf6"; g.fillRect(0, h - 70, w, 70);
    g.fillStyle = "#fff"; g.textBaseline = "middle";
    g.font = `800 120px ${SCHRIFT}`; g.fillText("64", 40, 170);
    g.font = `700 48px ${SCHRIFT}`; g.fillText("GB", 220, 196);
    g.font = `800 44px ${SCHRIFT}`; g.fillText("SDXC", 40, 300);
    g.font = `700 34px ${SCHRIFT}`; g.fillText("U3  V30", 400, 300);
    g.font = `600 28px ${SCHRIFT}`; g.fillText("UHS-I  ·  colorgraphy", 40, h - 35);
  }));
  // Rückwand: Beschriftung der Tasten (von hinten gesehen, darum gespiegelt)
  const rueckTex = deckel(leinwand(1260, 720, (g, w, h) => {
    g.fillStyle = "#1e1e24"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#cfcfd6"; g.textAlign = "center"; g.textBaseline = "middle"; g.font = `600 22px ${SCHRIFT}`;
    const px = (x) => w / 2 + x * (w / 12.6), py = (y) => h / 2 - y * (h / 7.2);
    [["MENU", -3.3, 2.15], ["C3", -5.4, 0.15], ["Fn", -4.4, 0.15], ["AF/MF  AEL", -4.4, 2.85], ["DISP", -4.4, -0.45], ["ISO", -5.35, -1.4], ["▶", -5.4, -3.35], ["C4", -3.4, -3.35]]
      .forEach(([t, x, y]) => { g.save(); g.translate(px(x), py(y)); g.scale(-1, 1); g.fillText(t, 0, 0); g.restore(); });
  }), 12.6, 7.2);

  const mat = {
    gehaeuse: () => new T.MeshPhysicalMaterial({ color: 0x1d1d22, roughness: 0.55, metalness: 0.2, clearcoat: 0.35, clearcoatRoughness: 0.45, normalMap: kornTex, normalScale: new T.Vector2(0.35, 0.35) }),
    gummi: () => new T.MeshStandardMaterial({ color: 0x18181b, roughness: 0.82, normalMap: narbeTex, normalScale: new T.Vector2(0.9, 0.9) }),
    metall: () => new T.MeshStandardMaterial({ color: 0xcfd2d8, roughness: 0.9, roughnessMap: buerstTex, metalness: 1 }),
    dunkelmetall: () => new T.MeshStandardMaterial({ color: 0x3c3d44, roughness: 0.75, roughnessMap: buerstTex, metalness: 0.9 }),
    geriffelt: () => new T.MeshStandardMaterial({ color: 0x2d2e34, roughness: 0.45, metalness: 0.85, normalMap: riffelTex }),
    gold: () => new T.MeshStandardMaterial({ color: 0xe2b65c, roughness: 0.22, metalness: 1 }),
    kupfer: () => new T.MeshStandardMaterial({ color: 0xc47a42, roughness: 0.35, metalness: 1, normalMap: riffelTex, normalScale: new T.Vector2(0.6, 0.6) }),
    schwarz: () => new T.MeshStandardMaterial({ color: 0x08080a, roughness: 0.9 }),
    glas: () => new T.MeshPhysicalMaterial({ color: 0xbfe0f5, roughness: 0.02, transparent: true, opacity: 0.45, clearcoat: 1, iridescence: 0.9, iridescenceIOR: 1.4, iridescenceThicknessRange: [260, 520], envMapIntensity: 1.6, side: T.DoubleSide, depthWrite: false }),
    platine: () => new T.MeshStandardMaterial({ color: 0xffffff, map: platineTex, roughness: 0.5, metalness: 0.1 }),
    chip: () => new T.MeshStandardMaterial({ color: 0x111114, roughness: 0.4, metalness: 0.3 }),
    keramik: () => new T.MeshStandardMaterial({ color: 0xffffff, map: sensorGehTex, roughness: 0.4, metalness: 0.5 }),
    sensor: () => new T.MeshPhysicalMaterial({ color: 0xffffff, map: bayerTex, roughness: 0.12, metalness: 0.75, iridescence: 1, iridescenceIOR: 1.8, iridescenceThicknessRange: [250, 900] }),
    druck: (map) => new T.MeshStandardMaterial({ color: 0xffffff, map, roughness: 0.55, metalness: 0.15 }),
    weiss: () => new T.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.5 }),
    bildschirm: () => new T.MeshStandardMaterial({ color: 0x000000, roughness: 0.15, emissive: 0xffffff, emissiveMap: displayTex, emissiveIntensity: 0.9 }),
  };

  // ---------- Geometrie-Helfer ----------
  const rundRechteck = (w, h, r) => {
    const s = new T.Shape(), x = -w / 2, y = -h / 2;
    r = Math.max(0.01, Math.min(r, w / 2, h / 2));
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  };
  const kreis = (r, x = 0, y = 0) => new T.Path().absarc(x, y, r, 0, Math.PI * 2, true);
  const kasten = (w, h, d, r = 0.3, loecher = []) => {
    const b = Math.min(r * 0.6, d * 0.3, 0.25);
    const s = rundRechteck(w - 2 * b, h - 2 * b, r - b);
    s.holes.push(...loecher);
    const g = new T.ExtrudeGeometry(s, { depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 10 });
    return g.translate(0, 0, -(d - 2 * b) / 2);
  };
  const ring = (ra, ri, d) => {
    const s = new T.Shape().absarc(0, 0, ra, 0, Math.PI * 2, false);
    s.holes.push(kreis(ri));
    return new T.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 64 }).translate(0, 0, -d / 2);
  };
  const bogenStueck = (ra, ri, a0, a1, d) => {
    const s = new T.Shape().absarc(0, 0, ra, a0, a1, false);
    s.absarc(0, 0, ri, a1, a0, true);
    return new T.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 20 }).translate(0, 0, -d / 2);
  };
  const zylinder = (r, h, seg = 48) => new T.CylinderGeometry(r, r, h, seg); // stehend (y)
  const scheibe = (r, d, seg = 48) => new T.CylinderGeometry(r, r, d, seg).rotateX(Math.PI / 2); // liegend (z)
  const band = (r, h) => new T.CylinderGeometry(r, r, h, 96, 1, true).rotateX(Math.PI / 2);
  const linse = (r, t, vorne, hinten) => {
    const p = [];
    for (let i = 0; i <= 12; i++) { const a = i / 12; p.push(new T.Vector2(r * a, -t / 2 - t * hinten * 0.7 * (1 - a * a))); }
    for (let i = 12; i >= 0; i--) { const a = i / 12; p.push(new T.Vector2(r * a, t / 2 + t * vorne * 0.7 * (1 - a * a))); }
    return new T.LatheGeometry(p, 56).rotateX(Math.PI / 2);
  };
  const box = (w, h, d) => new T.BoxGeometry(w, h, d);
  const flaeche = (w, h) => new T.PlaneGeometry(w, h);

  // ---------- Bauteile ----------
  const teile = {};
  const teil = (key, versatz, { drehpunkt = [0, 0, 0], drehung = [0, 0, 0] } = {}) => {
    const g = new T.Group();
    g.userData = { basis: new T.Vector3(...drehpunkt), versatz: new T.Vector3(...versatz), drehung: new T.Vector3(...drehung), e: 0, licht: 0 };
    g.position.copy(g.userData.basis);
    modell.add(g);
    teile[key] = g;
    return g;
  };
  const stueck = (g, geo, m, pos = [0, 0, 0], { streuung, rot, schatten = true } = {}) => {
    const x = new T.Mesh(geo, m);
    x.position.set(pos[0], pos[1], pos[2]).sub(g.userData.basis);
    if (rot) x.rotation.set(...rot);
    x.userData.basis = x.position.clone();
    if (streuung) x.userData.streuung = new T.Vector3(...streuung);
    x.castShadow = schatten;
    x.receiveShadow = true;
    g.add(x);
    return x;
  };
  // Schraube mit Kreuzschlitz, Blick nach +z
  const schraube = (g, m, x, y, z, r = 0.13) => {
    stueck(g, scheibe(r, 0.08, 16), m, [x, y, z]);
    const schlitz = mat.schwarz();
    stueck(g, box(r * 1.5, 0.03, 0.02), schlitz, [x, y, z + 0.045]);
    stueck(g, box(0.03, r * 1.5, 0.02), schlitz, [x, y, z + 0.045]);
  };

  const LX = 0.9, LY = -0.3; // Mitte des Bajonetts

  // Objektiv
  {
    const g = teil("tubus", [0, 9.5, 14]);
    const m = mat.gehaeuse(), gm = mat.gummi(), me = mat.metall();
    stueck(g, ring(3.55, 3.3, 9), m, [LX, LY, 7]);
    stueck(g, ring(2.9, 2.2, 0.5), me, [LX, LY, 2.25]);
    stueck(g, ring(3.3, 2.9, 0.3), mat.schwarz(), [LX, LY, 2.4]);
    stueck(g, ring(3.72, 3.5, 3), gm, [LX, LY, 5.1]);
    stueck(g, ring(3.66, 3.5, 1.6), gm, [LX, LY, 9.1]);
    stueck(g, ring(3.62, 3.05, 0.6), mat.druck(frontTex), [LX, LY, 11.55]);
    stueck(g, ring(3.3, 3.05, 0.14), me, [LX, LY, 11.9]);
    stueck(g, ring(3.06, 2.9, 0.5), mat.schwarz(), [LX, LY, 11.6]);
    stueck(g, band(3.565, 0.42), new T.MeshStandardMaterial({ map: skalaTex, transparent: true, roughness: 0.5 }), [LX, LY, 7.2], { schatten: false });
    stueck(g, box(0.07, 0.3, 0.5), mat.weiss(), [LX, LY + 3.6, 7.75]);
    // Rippen von Zoom- und Fokusring
    const rippe = box(0.13, 0.12, 1);
    [[5.1, 2.8, 3.72, 72], [9.1, 1.4, 3.66, 84]].forEach(([z, l, r, n]) => {
      const im = new T.InstancedMesh(rippe, gm, n);
      const h = new T.Object3D();
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        h.position.set(LX + Math.cos(a) * r, LY + Math.sin(a) * r, z).sub(g.userData.basis);
        h.rotation.set(0, 0, a);
        h.scale.set(1, 1, l);
        h.updateMatrix();
        im.setMatrixAt(i, h.matrix);
      }
      im.castShadow = im.receiveShadow = true;
      g.add(im);
    });
  }
  {
    // Linsen mit geschwärztem Rand (gegen Streulicht) und Vergütung
    const g = teil("linsen", [0, 0, 11.5]);
    const m = mat.glas(), rand = mat.schwarz();
    [[3.15, 11.2, 0.55, 0.8, 0.5], [2.9, 10.3, 0.35, -0.5, 0.9], [2.4, 8.5, 0.5, 0.9, 0.9], [2.0, 7.5, 0.3, -0.4, -0.4],
      [2.2, 5.6, 0.5, 0.8, 0.8], [2.5, 4.2, 0.45, 0.6, 0.9], [2.7, 3.1, 0.4, 0.9, 0.4]]
      .forEach(([r, z, t, v, h], i) => {
        const s = { streuung: [0, 0, (6 - i) * 1.25] };
        stueck(g, linse(r, t, v, h), m, [LX, LY, z], { ...s, schatten: false });
        stueck(g, ring(r + 0.015, r - 0.04, t * 0.55), rand, [LX, LY, z], { ...s, schatten: false });
      });
  }
  {
    const g = teil("blende", [0, 0, 14.3]);
    const dm = mat.dunkelmetall();
    stueck(g, ring(2.9, 2.1, 0.2), dm, [LX, LY, 6.5]);
    const lamelle = box(1.9, 0.9, 0.025), lm = new T.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.55, metalness: 0.6, roughnessMap: buerstTex });
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      stueck(g, lamelle, lm, [LX + Math.cos(a) * 1.55, LY + Math.sin(a) * 1.55, 6.5 + (i % 3) * 0.025], { rot: [0, 0, a + Math.PI / 2 + 0.35] });
    }
    for (let i = 0; i < 3; i++) schraube(g, mat.metall(), LX + Math.cos(i * 2.1 + 0.4) * 2.5, LY + Math.sin(i * 2.1 + 0.4) * 2.5, 6.62, 0.09);
  }

  // Bajonett mit drei Laschen, Kontakten und Schrauben
  {
    const g = teil("bajonett", [0, 1.2, 8]);
    const me = mat.metall(), go = mat.gold();
    stueck(g, ring(2.95, 2.3, 0.25), me, [LX, LY, 1.85]);
    [[0.35, 1.15], [2.35, 3.05], [3.75, 5.0]].forEach(([a0, a1]) => stueck(g, bogenStueck(2.32, 2.08, a0, a1, 0.12), me, [LX, LY, 1.68]));
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i * Math.PI) / 2;
      schraube(g, me, LX + Math.cos(a) * 2.62, LY + Math.sin(a) * 2.62, 2.0);
    }
    stueck(g, bogenStueck(2.26, 1.98, -Math.PI / 2 - 0.5, -Math.PI / 2 + 0.5, 0.1), mat.schwarz(), [LX, LY, 1.85]);
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i - 4.5) * 0.085;
      stueck(g, box(0.1, 0.22, 0.06), go, [LX + Math.cos(a) * 2.12, LY + Math.sin(a) * 2.12, 1.92], { rot: [0, 0, a + Math.PI / 2] });
    }
  }

  // Verschluss: Rahmen, Lamellen und Antrieb
  {
    const g = teil("verschluss", [0, 0.8, 5.6]);
    stueck(g, kasten(5.6, 4.4, 0.35, 0.3, [rundRechteck(3.9, 2.7, 0.1)]), mat.dunkelmetall(), [LX, LY, 1.25]);
    const v = new T.MeshStandardMaterial({ color: 0x18181c, roughness: 0.45, metalness: 0.5, roughnessMap: buerstTex });
    [1.02, 0.36, -1.02].forEach((dy) => stueck(g, box(3.95, 0.64, 0.03), v, [LX, LY + dy, 1.45]));
    stueck(g, zylinder(0.32, 0.5, 24).rotateX(Math.PI / 2), mat.metall(), [LX + 2.35, LY + 1.55, 1.55]);
    stueck(g, scheibe(0.32, 0.05, 24), mat.kupfer(), [LX + 2.35, LY + 1.55, 1.82]);
    [[-2.45, 1.85], [2.45, -1.85], [-2.45, -1.85]].forEach(([x, y]) => schraube(g, mat.metall(), LX + x, LY + y, 1.45, 0.1));
  }

  // Bildsensor mit Filter
  {
    const g = teil("sensor", [0, 0.4, 3.3]);
    stueck(g, kasten(4.8, 3.9, 0.3, 0.2), mat.keramik(), [LX, LY, 0.6]);
    stueck(g, box(3.58, 2.39, 0.05), mat.sensor(), [LX, LY, 0.77]);
    stueck(g, box(3.9, 2.7, 0.1), mat.glas(), [LX, LY, 0.95], { schatten: false });
  }

  // Bildstabilisator: Rahmen, Spulen, Magnete
  {
    const g = teil("ibis", [0, 0, 0]);
    stueck(g, kasten(7.2, 5.8, 0.45, 0.4, [rundRechteck(5.0, 4.1, 0.2)]), mat.dunkelmetall(), [LX, LY, 0.2]);
    const ku = mat.kupfer(), sp = new T.TorusGeometry(0.42, 0.16, 14, 32);
    [[-3.05, 2.4], [3.05, 2.4], [-3.05, -2.4], [3.05, -2.4]].forEach(([x, y]) => stueck(g, sp, ku, [LX + x, LY + y, 0.5]));
    const ma = mat.metall();
    [[0, 2.5], [0, -2.5], [-3.1, 0]].forEach(([x, y]) => stueck(g, box(x ? 0.5 : 1.0, x ? 1.0 : 0.5, 0.25), ma, [LX + x, LY + y, 0.5]));
    [[3.1, 0.6], [3.1, -0.6]].forEach(([x, y]) => schraube(g, ma, LX + x, LY + y, 0.45, 0.11));
    stueck(g, box(1.6, 0.5, 0.04), new T.MeshStandardMaterial({ color: 0xc7882e, roughness: 0.5 }), [LX - 0.6, LY - 2.95, 0.3]);
  }

  // Hauptplatine mit Prozessor
  {
    const g = teil("platine", [0, 0, -3.4]);
    stueck(g, kasten(9.4, 6.4, 0.14, 0.3), mat.platine(), [1.0, -0.1, -0.9]);
    stueck(g, kasten(1.9, 1.9, 0.2, 0.06), mat.chip(), [3.6, 1.2, -0.74]);
    stueck(g, flaeche(1.5, 1.5), mat.druck(chipTex(["IMAGE", "PROCESSOR", "2015"], true)), [3.6, 1.2, -0.635]);
    [[-1.9, 1.9, 1.5, 1.1, ["DDR3L", "4Gb"]], [-1.9, -2.0, 1.5, 1.1, ["NAND", "8Gb"]], [4.4, -1.8, 1.2, 1.6, ["PMIC"]], [0.4, -2.6, 2.4, 0.7, null]]
      .forEach(([x, y, w, h, text]) => {
        stueck(g, box(w, h, 0.14), mat.chip(), [x, y, -0.78]);
        if (text) stueck(g, flaeche(w * 0.9, h * 0.9), mat.druck(chipTex(text)), [x, y, -0.708]);
      });
    const me = mat.metall();
    for (let i = 0; i < 9; i++) stueck(g, zylinder(0.12, 0.3, 14).rotateX(Math.PI / 2), me, [-2.9 + (i % 3) * 0.4, 0.2 + Math.floor(i / 3) * 0.4, -0.7]);
    const bauteil = mat.chip();
    for (let i = 0; i < 26; i++) stueck(g, box(0.18, 0.1, 0.06), bauteil, [-3.4 + (i % 13) * 0.55, -1.0 + Math.floor(i / 13) * 0.35 + (i % 2) * 0.08, -0.8]);
    stueck(g, box(2.6, 0.25, 0.12), mat.gold(), [1.5, 2.9, -0.78]);
  }

  // Akku und Speicherkarte
  {
    const g = teil("akku", [-2.5, -9, 6]);
    stueck(g, kasten(1.15, 4.6, 3.2, 0.18), new T.MeshStandardMaterial({ color: 0x24252b, roughness: 0.55, metalness: 0.1, normalMap: kornTex, normalScale: new T.Vector2(0.3, 0.3) }), [-4.6, -0.9, 1.2]);
    stueck(g, flaeche(2.9, 4.1), mat.druck(akkuTex), [-4.6 + 0.58, -0.95, 1.2], { rot: [0, Math.PI / 2, 0] });
    const go = mat.gold();
    [-0.6, 0, 0.6].forEach((dz) => stueck(g, box(0.5, 0.06, 0.22), go, [-4.6, 1.42, 1.2 + dz]));
    const k = { streuung: [-2.4, 2.2, 0.6] };
    stueck(g, kasten(0.22, 2.4, 3.2, 0.12), mat.chip(), [-5.6, -0.6, 1.4], k);
    stueck(g, flaeche(3.0, 2.2), mat.druck(karteTex), [-5.485, -0.6, 1.4], { ...k, rot: [0, Math.PI / 2, 0] });
    stueck(g, box(0.02, 0.3, 2.6), go, [-5.72, 0.62, 1.4], k);
  }

  // Elektronischer Sucher mit Zubehörschuh
  {
    const g = teil("sucher", [0, 6.5, -2.5]);
    stueck(g, kasten(5.2, 2.4, 3.4, 0.55), mat.gehaeuse(), [LX, 4.55, 0]);
    stueck(g, kasten(3.8, 2.6, 0.8, 0.5), mat.gummi(), [LX, 4.6, -2.05]);
    stueck(g, box(2.2, 1.6, 0.04), mat.schwarz(), [LX, 4.6, -2.46]);
    stueck(g, box(1.8, 1.2, 0.04), mat.bildschirm(), [LX, 4.6, -2.48], { rot: [0, Math.PI, 0] });
    stueck(g, kasten(2.1, 0.14, 1.9, 0.06), mat.dunkelmetall(), [LX, 5.78, 0.2]);
    const go = mat.gold();
    for (let i = 0; i < 7; i++) stueck(g, box(0.08, 0.04, 0.3), go, [LX - 0.6 + i * 0.2, 5.86, 1.0]);
    stueck(g, zylinder(0.32, 0.18, 32).rotateZ(Math.PI / 2), [mat.geriffelt(), mat.dunkelmetall(), mat.dunkelmetall()], [LX + 2.65, 4.5, -1.3]);
  }

  // Klappdisplay (dreht sich am oberen Scharnier auf)
  {
    const g = teil("display", [0, -0.6, -12], { drehpunkt: [1.0, 1.9, -2.45], drehung: [0.55, 0, 0] });
    stueck(g, kasten(7.6, 4.9, 0.4, 0.3), mat.gehaeuse(), [1.0, -0.55, -2.45]);
    stueck(g, flaeche(7.0, 4.4), mat.bildschirm(), [1.0, -0.55, -2.66], { rot: [0, Math.PI, 0] });
    stueck(g, zylinder(0.15, 7.0, 20).rotateZ(Math.PI / 2), mat.metall(), [1.0, 1.85, -2.45]);
  }

  // Bedienelemente oben: Moduswahlrad, Belichtungskorrektur, Auslöser, vorderes Einstellrad
  {
    const g = teil("tasten", [0, 9, 1]);
    const rif = mat.geriffelt(), me = mat.metall(), gh = mat.gehaeuse();
    stueck(g, zylinder(1.05, 0.6, 64), [rif, mat.druck(modusTex), rif], [-2.6, 3.9, -0.5]);
    stueck(g, box(0.08, 0.03, 0.3), mat.weiss(), [-2.6, 4.21, 0.75]);
    stueck(g, zylinder(0.9, 0.55, 64), [rif, mat.druck(korrekturTex), rif], [-5.1, 3.88, -1.1]);
    stueck(g, zylinder(0.72, 0.24, 48), [rif, gh, gh], [-4.7, 3.52, 2.5]);
    stueck(g, zylinder(0.42, 0.3, 48), me, [-4.7, 3.76, 2.5]);
    stueck(g, zylinder(0.6, 0.26, 48), [rif, gh, gh], [-4.7, 3.3, 3.55]);
    [-0.6, 0.4].forEach((x) => stueck(g, zylinder(0.3, 0.2, 32), gh, [x, 3.68, -0.9]));
  }

  // Rückwand mit Tasten und Beschriftung
  {
    const g = teil("rueckwand", [0, 0, -7.2]);
    stueck(g, kasten(12.6, 7.2, 0.5, 0.6), [mat.druck(rueckTex), mat.gehaeuse()], [0, 0, -1.95]);
    const me = mat.dunkelmetall();
    stueck(g, new T.TorusGeometry(0.78, 0.15, 14, 48), mat.geriffelt(), [-4.4, -1.4, -2.25]);
    stueck(g, scheibe(0.4, 0.14), me, [-4.4, -1.4, -2.25]);
    [[-4.4, 0.6], [-5.4, 0.6], [-4.4, 2.3], [-3.3, 2.6], [-5.4, -2.9], [-3.4, -2.9]].forEach(([x, y]) => stueck(g, scheibe(0.28, 0.16, 24), me, [x, y, -2.25]));
  }

  // Gehäuse mit Griff (vorne offen fürs Bajonett)
  {
    const g = teil("gehaeuse", [4, -10.5, -5]);
    stueck(g, kasten(12.6, 7.2, 3.4, 0.7, [kreis(2.35, LX, LY)]), mat.gehaeuse(), [0, 0, 0]);
    stueck(g, kasten(3.2, 7.0, 2.2, 1.0), mat.gummi(), [-4.7, -0.1, 2.5]);
    stueck(g, scheibe(0.25, 0.12, 24), new T.MeshStandardMaterial({ color: 0x5a1020, roughness: 0.15, metalness: 0.2 }), [-2.4, 2.6, 1.72]);
    stueck(g, scheibe(0.3, 0.14, 32), mat.dunkelmetall(), [LX + 3.45, LY - 0.8, 1.75]);
    const me = mat.metall();
    [-6.35, 6.35].forEach((x) => stueck(g, new T.TorusGeometry(0.3, 0.08, 10, 24), me, [x, 2.4, -0.4], { rot: [0, Math.PI / 2, 0] }));
    stueck(g, zylinder(0.45, 0.05, 32), mat.dunkelmetall(), [LX, -3.62, 0]);
    const loch = mat.schwarz();
    [[-1.7, 1.0], [-1.45, 1.0], [-1.2, 1.0], [3.3, 1.0], [3.55, 1.0], [3.8, 1.0]].forEach(([x, z]) => stueck(g, zylinder(0.06, 0.02, 10), loch, [x, 3.61, z]));
  }

  // Ablauf
  const explosion = ["tubus", "linsen", "blende", "tasten", "sucher", "rueckwand", "display", "gehaeuse", "akku", "bajonett", "verschluss", "sensor", "platine", "ibis"];
  // Fortschritt 0–1: auseinander, kurz offen lassen (zum Anschauen), wieder zusammen
  const AUF = [0.04, 0.34], ZU = [0.66, 0.94];
  const klemmen = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const weich = (x) => x * x * (3 - 2 * x);
  const akzent = new T.Color(0x8b5cf6).multiplyScalar(0.55);

  // Materialien je Teil für das Hervorheben merken
  Object.values(teile).forEach((g) => {
    const set = new Set();
    g.traverse((o) => o.material && [].concat(o.material).forEach((m) => set.add(m)));
    g.userData.materialien = [...set].map((m) => ({ m, farbe: m.emissive.clone(), staerke: m.emissiveIntensity }));
  });

  // Beschriftungen: Punkt am Teil, Name mit Linie in eine feste Richtung (o/u/l/r), weicht anderen Namen aus
  const RICHTUNG = { linsen: "u", blende: "o", tubus: "o", bajonett: "u", verschluss: "o", sensor: "u", ibis: "o", platine: "u", akku: "u", sucher: "r", display: "r", tasten: "l", rueckwand: "o", gehaeuse: "r" };
  const SVG = "http://www.w3.org/2000/svg";
  const linien = document.createElementNS(SVG, "svg");
  linien.setAttribute("class", "xl-linien");
  ebene.append(linien);
  const marken = liste.map((t, i) => {
    const punkt = document.createElement("span");
    punkt.className = "xl-dot";
    punkt.textContent = i + 1;
    const etikett = document.createElement("span");
    etikett.className = "xl-name";
    etikett.textContent = t.name;
    const linie = document.createElementNS(SVG, "line");
    linien.append(linie);
    ebene.append(etikett, punkt);
    return { ...t, punkt, etikett, linie, richtung: RICHTUNG[t.key], teil: teile[t.key], w: 0, h: 0 };
  });

  const box3 = new T.Box3(), hilf = new T.Box3(), v = new T.Vector3(), mitte = new T.Vector3();
  const blick = new T.Vector3(), ziel3 = new T.Vector3(), zielGlatt = new T.Vector3(), rechts = new T.Vector3(), oben = new T.Vector3();
  let abstandGlatt = 0, breite = 1, hoehe = 1, zuletztZustand = "", erstesBild = true;
  let gewaehlt = -1, offen = false; // gewähltes Bauteil (Maus darüber oder angetippt)
  const beruehrung = matchMedia("(hover: none)").matches;

  const unterzeileSetzen = (i, zustand) => {
    if (zustand === zuletztZustand) return;
    zuletztZustand = zustand;
    if (i >= 0) {
      const t = marken[i];
      unterzeile.innerHTML = `<span class="nr">${String(i + 1).padStart(2, "0")} / ${marken.length}</span><strong></strong><p></p>`;
      unterzeile.querySelector("strong").textContent = t.name;
      unterzeile.querySelector("p").textContent = t.text;
    } else {
      unterzeile.innerHTML = {
        offen: `<span class="nr">${marken.length} Bauteile</span><strong>So sieht die Kamera von innen aus.</strong><p>${beruehrung ? "Tippe auf ein Bauteil oder eine Nummer" : "Fahr mit der Maus über ein Bauteil"}, um mehr zu erfahren. Oder scroll einfach weiter.</p>`,
        start: `<span class="nr">Scroll weiter</span><strong>Gleich fliegt die Kamera auseinander.</strong><p>Ein vereinfachtes Modell meiner Sony α7 II mit dem 24–105 mm.</p>`,
        zu: `<span class="nr">Fertig</span><strong>Wieder zusammengebaut.</strong><p>Weiter geht's mit ein paar Worten über mich.</p>`,
      }[zustand];
    }
  };

  const zeichnen = (p) => {
    const auf = weich(klemmen((p - AUF[0]) / (AUF[1] - AUF[0]))) * (1 - weich(klemmen((p - ZU[0]) / (ZU[1] - ZU[0]))));
    offen = auf > 0.9;
    if (!offen) gewaehlt = -1;
    const aktiv = gewaehlt;
    unterzeileSetzen(aktiv, aktiv >= 0 ? "teil" + aktiv : auf > 0.5 ? "offen" : p > 0.5 ? "zu" : "start");
    let bewegt = false;

    explosion.forEach((key, k) => {
      const g = teile[key], d = g.userData;
      const e = weich(klemmen((auf - k * 0.04) / 0.48));
      g.position.copy(d.basis).addScaledVector(d.versatz, e);
      g.rotation.set(d.drehung.x * e, d.drehung.y * e, d.drehung.z * e);
      g.children.forEach((x) => x.userData.streuung && x.position.copy(x.userData.basis).addScaledVector(x.userData.streuung, e));
      // Hervorheben
      const soll = aktiv >= 0 && marken[aktiv].key === key ? 1 : 0;
      d.licht += (soll - d.licht) * 0.2;
      if (Math.abs(soll - d.licht) < 0.01) d.licht = soll; else bewegt = true;
      d.materialien.forEach(({ m, farbe, staerke }) => {
        m.emissive.copy(farbe).lerp(akzent, d.licht);
        m.emissiveIntensity = staerke + (1 - staerke) * d.licht;
      });
    });
    modell.updateMatrixWorld(true);

    // Kamera: schaut schräg von vorne rechts, dreht beim Zerlegen zur Seite
    const schmal = breite < 640;
    const theta = T.MathUtils.degToRad(36 + 22 * auf);
    const phi = T.MathUtils.degToRad(15 + 9 * auf);
    blick.set(Math.sin(theta) * Math.cos(phi), Math.sin(phi), Math.cos(theta) * Math.cos(phi));
    box3.makeEmpty();
    modell.children.forEach((g) => box3.union(hilf.setFromObject(g)));
    box3.getCenter(mitte);
    ziel3.copy(mitte);
    // Licht und Schattenboden wandern mit dem Modell
    licht.target.position.copy(mitte);
    licht.position.copy(mitte).add(v.set(12, 22, 16));
    boden.position.set(mitte.x, box3.min.y - 0.6, mitte.z);
    if (aktiv >= 0) {
      hilf.setFromObject(marken[aktiv].teil).getCenter(v);
      ziel3.lerp(v, schmal ? 0.35 : 0);
    }
    kamera.position.copy(ziel3).add(blick);
    kamera.lookAt(ziel3);
    kamera.updateMatrixWorld();
    rechts.setFromMatrixColumn(kamera.matrixWorld, 0);
    oben.setFromMatrixColumn(kamera.matrixWorld, 1);

    // Abstand so wählen, dass alles in den freien Bereich über der Unterzeile passt
    const unten = unterzeile.offsetHeight + 24;
    const randX = schmal ? 18 : 150, randY = 36;
    const tanV = Math.tan(T.MathUtils.degToRad(kamera.fov / 2));
    const tanY = (tanV * (hoehe - unten - 2 * randY)) / hoehe;
    const tanX = (tanV * kamera.aspect * (breite - 2 * randX)) / breite;
    let abstand = 0;
    modell.children.forEach((g) => {
      hilf.setFromObject(g);
      for (let i = 0; i < 8; i++) {
        v.set(i & 1 ? hilf.max.x : hilf.min.x, i & 2 ? hilf.max.y : hilf.min.y, i & 4 ? hilf.max.z : hilf.min.z).sub(ziel3);
        const tiefe = v.dot(blick);
        abstand = Math.max(abstand, tiefe + Math.abs(v.dot(rechts)) / tanX, tiefe + Math.abs(v.dot(oben)) / tanY);
      }
    });
    if (aktiv >= 0 && schmal) abstand *= 0.8;
    if (erstesBild) { zielGlatt.copy(ziel3); abstandGlatt = abstand; erstesBild = false; }
    zielGlatt.lerp(ziel3, 0.18);
    abstandGlatt += (abstand - abstandGlatt) * 0.18;
    if (zielGlatt.distanceTo(ziel3) > 0.01 || Math.abs(abstand - abstandGlatt) > 0.01) bewegt = true;
    kamera.position.copy(zielGlatt).addScaledVector(blick, abstandGlatt);
    kamera.lookAt(zielGlatt);
    kamera.setViewOffset(breite, hoehe, 0, unten / 2, breite, hoehe);
    kamera.updateMatrixWorld();
    renderer.render(szene, kamera);

    // Beschriftungen an die Teile heften (feste Reihenfolge, damit nichts unter der Maus wegspringt)
    const sichtbar = auf > 0.92, belegt = [];
    marken.forEach((_, i) => {
      const t = marken[i], ist = i === aktiv;
      hilf.setFromObject(t.teil).getCenter(v);
      if (t.richtung === "o") v.y = hilf.max.y;
      if (t.richtung === "u") v.y = hilf.min.y;
      v.project(kamera);
      const x = (v.x * 0.5 + 0.5) * breite, y = (-v.y * 0.5 + 0.5) * hoehe;
      const deckkraft = sichtbar ? (aktiv < 0 || ist ? 1 : 0.6) : 0;
      const zeigen = sichtbar && (!schmal || ist);
      t.punkt.classList.toggle("aktiv", ist);
      t.etikett.classList.toggle("aktiv", ist);
      t.punkt.style.opacity = deckkraft;
      t.punkt.style.pointerEvents = sichtbar ? "auto" : "none";
      t.punkt.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%)`;
      t.etikett.style.opacity = t.linie.style.opacity = zeigen ? deckkraft : 0;
      t.etikett.style.pointerEvents = zeigen ? "auto" : "none";
      if (!zeigen) return;
      if (!t.w) { t.w = t.etikett.offsetWidth; t.h = t.etikett.offsetHeight; }
      const { w, h, richtung: r } = t, abst = 24;
      let nx = r === "r" ? x + abst : r === "l" ? x - abst - w : x - w / 2;
      let ny = r === "o" ? y - abst - h : r === "u" ? y + abst : y - h / 2;
      nx = klemmen(nx, 8, breite - w - 8);
      for (let n = 0; n < 30; n++) {
        const k = belegt.find((b) => nx < b.x + b.w + 6 && nx + w + 6 > b.x && ny < b.y + b.h + 4 && ny + h + 4 > b.y);
        if (!k) break;
        ny = r === "o" ? k.y - h - 4 : k.y + k.h + 4;
      }
      belegt.push({ x: nx, y: ny, w, h });
      t.etikett.style.transform = `translate(${nx.toFixed(1)}px,${ny.toFixed(1)}px)`;
      t.linie.setAttribute("x1", x.toFixed(1));
      t.linie.setAttribute("y1", y.toFixed(1));
      t.linie.setAttribute("x2", klemmen(x, nx + 12, nx + w - 12).toFixed(1));
      t.linie.setAttribute("y2", klemmen(y, ny, ny + h).toFixed(1));
    });
    return bewegt;
  };

  // Scrollen steuert den Fortschritt, mit etwas Nachlauf
  let soll = 0, ist = 0, laeuft = false;
  const fortschritt = () => {
    const r = spur.getBoundingClientRect();
    return klemmen(-r.top / Math.max(1, r.height - buehne.offsetHeight));
  };
  const bildSchritt = () => {
    ist += (soll - ist) * 0.16;
    if (Math.abs(soll - ist) < 0.0005) ist = soll;
    const bewegt = zeichnen(ist);
    if (ist !== soll || bewegt) requestAnimationFrame(bildSchritt);
    else laeuft = false;
  };
  const anstossen = () => {
    soll = fortschritt();
    if (!laeuft) { laeuft = true; requestAnimationFrame(bildSchritt); }
  };
  const groesse = () => {
    breite = buehne.clientWidth; hoehe = buehne.clientHeight;
    renderer.setSize(breite, hoehe, false);
    kamera.aspect = breite / hoehe;
    kamera.updateProjectionMatrix();
    marken.forEach((t) => (t.w = 0));
    erstesBild = true;
    anstossen();
  };
  // Bauteil wählen: Maus darüber (PC) oder antippen (Handy), über das Modell oder die Beschriftung
  const waehlen = (i) => {
    if (!offen || i === gewaehlt) return;
    gewaehlt = i;
    canvas.style.cursor = i >= 0 ? "pointer" : "";
    anstossen();
  };
  const strahl = new T.Raycaster(), zeiger = new T.Vector2();
  const treffer = (e) => {
    const r = canvas.getBoundingClientRect();
    zeiger.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    strahl.setFromCamera(zeiger, kamera);
    const h = strahl.intersectObjects(modell.children, true)[0];
    if (!h) return -1;
    let o = h.object;
    while (o.parent !== modell) o = o.parent;
    return marken.findIndex((t) => t.teil === o);
  };
  canvas.addEventListener("pointermove", (e) => e.pointerType === "mouse" && waehlen(treffer(e)));
  canvas.addEventListener("pointerleave", (e) => e.pointerType === "mouse" && waehlen(-1));
  canvas.addEventListener("click", (e) => { const i = treffer(e); waehlen(i === gewaehlt ? -1 : i); });
  marken.forEach((t, i) => [t.punkt, t.etikett].forEach((el) => {
    el.addEventListener("pointerenter", (e) => e.pointerType === "mouse" && waehlen(i));
    el.addEventListener("pointerleave", (e) => e.pointerType === "mouse" && waehlen(-1));
    el.addEventListener("click", () => waehlen(gewaehlt === i && beruehrung ? -1 : i));
  }));

  new ResizeObserver(groesse).observe(buehne);
  document.fonts?.ready.then(groesse);
  addEventListener("scroll", anstossen, { passive: true });
  groesse();
  ist = soll = fortschritt();
  anstossen();
  sektion.classList.add("bereit");
}
