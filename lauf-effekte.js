// Nachbearbeitung für „Fröbelinchen rennt“: weiches Leuchten (Bloom), Farbstimmung je Welt, Vignette und Kantenglättung.
// Das Bild wird erst in eine Fläche mit hohem Helligkeitsumfang gezeichnet, helle Stellen werden herausgefiltert,
// in mehreren Stufen verkleinert und wieder vergrößert (weicher Schein) und zum Schluss mit dem Bild gemischt.
export function effekte(T, renderer, handy) {
  const typ = T.HalfFloatType;
  const bild = new T.WebGLRenderTarget(1, 1, { type: typ, samples: handy ? 2 : 4 });   // samples = Kantenglättung
  const STUFEN = 5;
  const neuesZiel = () => new T.WebGLRenderTarget(1, 1, { type: typ, depthBuffer: false });
  const runter = Array.from({ length: STUFEN }, neuesZiel), hoch = Array.from({ length: STUFEN }, neuesZiel);

  const kam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1), sz = new T.Scene();
  const dreieck = new T.BufferGeometry();
  dreieck.setAttribute("position", new T.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  dreieck.setAttribute("uv", new T.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  const flaeche = new T.Mesh(dreieck); flaeche.frustumCulled = false; sz.add(flaeche);
  const ecke = "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }";
  const shader = (fragmentShader, uniforms, extra = {}) => new T.ShaderMaterial({ vertexShader: ecke, fragmentShader, uniforms, depthTest: false, depthWrite: false, ...extra });

  // helle Stellen herausfiltern (weicher Übergang an der Schwelle) und dabei halbieren
  const hell = shader(`uniform sampler2D tBild; uniform vec2 px; uniform float schwelle; varying vec2 vUv;
    void main() {
      vec3 c = (texture2D(tBild, vUv + px * vec2(-.5, -.5)).rgb + texture2D(tBild, vUv + px * vec2(.5, -.5)).rgb
              + texture2D(tBild, vUv + px * vec2(-.5, .5)).rgb + texture2D(tBild, vUv + px * vec2(.5, .5)).rgb) * .25;
      float l = max(c.r, max(c.g, c.b));
      float w = clamp(l - schwelle, 0., 4.) / max(l, 1e-4);
      gl_FragColor = vec4(min(c * w, vec3(8.)), 1.);
    }`, { tBild: { value: null }, px: { value: new T.Vector2() }, schwelle: { value: 1 } });
  const klein = shader(`uniform sampler2D tBild; uniform vec2 px; varying vec2 vUv;
    void main() {
      vec3 s = texture2D(tBild, vUv).rgb * 4.;
      s += texture2D(tBild, vUv - px).rgb + texture2D(tBild, vUv + px).rgb;
      s += texture2D(tBild, vUv + vec2(px.x, -px.y)).rgb + texture2D(tBild, vUv - vec2(px.x, -px.y)).rgb;
      gl_FragColor = vec4(s / 8., 1.);
    }`, { tBild: { value: null }, px: { value: new T.Vector2() } });
  const gross = shader(`uniform sampler2D tBild; uniform sampler2D tDazu; uniform vec2 px; varying vec2 vUv;
    void main() {
      vec3 s = texture2D(tBild, vUv + vec2(-px.x * 2., 0.)).rgb + texture2D(tBild, vUv + vec2(px.x * 2., 0.)).rgb
             + texture2D(tBild, vUv + vec2(0., -px.y * 2.)).rgb + texture2D(tBild, vUv + vec2(0., px.y * 2.)).rgb;
      s += (texture2D(tBild, vUv + px).rgb + texture2D(tBild, vUv - px).rgb
          + texture2D(tBild, vUv + vec2(px.x, -px.y)).rgb + texture2D(tBild, vUv - vec2(px.x, -px.y)).rgb) * 2.;
      gl_FragColor = vec4(s / 12. + texture2D(tDazu, vUv).rgb, 1.);
    }`, { tBild: { value: null }, tDazu: { value: null }, px: { value: new T.Vector2() } });
  // Zusammensetzen: Bild + Schein, Farbstimmung, Sättigung, Vignette; danach Tonwerte (ACES) und sRGB wie beim normalen Zeichnen
  const schluss = shader(`uniform sampler2D tBild; uniform sampler2D tSchein; uniform float staerke; uniform vec3 farbe;
    uniform float saett; uniform float kontrast; uniform float vignette; varying vec2 vUv;
    void main() {
      vec3 c = texture2D(tBild, vUv).rgb + texture2D(tSchein, vUv).rgb * staerke;
      c *= farbe;
      float l = dot(c, vec3(.2126, .7152, .0722));
      c = max(mix(vec3(l), c, saett), 0.);
      vec2 d = vUv - .5; c *= 1. - vignette * dot(d, d) * 1.8;
      gl_FragColor = vec4(c, 1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      gl_FragColor.rgb = clamp((gl_FragColor.rgb - .5) * kontrast + .5, 0., 1.);
    }`, { tBild: { value: null }, tSchein: { value: null }, staerke: { value: .6 }, farbe: { value: new T.Color(1, 1, 1) },
      saett: { value: 1.1 }, kontrast: { value: 1.04 }, vignette: { value: .35 } });

  const pass = (m, ziel) => { flaeche.material = m; renderer.setRenderTarget(ziel); renderer.render(sz, kam); };
  const v = new T.Vector2();
  function groesse() {
    renderer.getDrawingBufferSize(v);
    const w = Math.max(1, v.x), h = Math.max(1, v.y);
    bild.setSize(w, h);
    for (let i = 0; i < STUFEN; i++) {
      const f = 2 ** (i + 1), b = Math.max(1, Math.round(w / f)), hh = Math.max(1, Math.round(h / f));
      runter[i].setSize(b, hh); hoch[i].setSize(b, hh);
    }
  }
  function zeichnen(szene, kamera) {
    renderer.setRenderTarget(bild); renderer.render(szene, kamera);
    hell.uniforms.tBild.value = bild.texture; hell.uniforms.px.value.set(1 / bild.width, 1 / bild.height);
    pass(hell, runter[0]);
    for (let i = 1; i < STUFEN; i++) {
      klein.uniforms.tBild.value = runter[i - 1].texture; klein.uniforms.px.value.set(.5 / runter[i - 1].width, .5 / runter[i - 1].height);
      pass(klein, runter[i]);
    }
    let quelle = runter[STUFEN - 1];
    for (let i = STUFEN - 2; i >= 0; i--) {
      gross.uniforms.tBild.value = quelle.texture; gross.uniforms.tDazu.value = runter[i].texture;
      gross.uniforms.px.value.set(.5 / quelle.width, .5 / quelle.height);
      pass(gross, hoch[i]); quelle = hoch[i];
    }
    schluss.uniforms.tBild.value = bild.texture; schluss.uniforms.tSchein.value = quelle.texture;
    pass(schluss, null);
  }
  // Stimmung weich überblenden (Farbe, Sättigung, Kontrast, Stärke des Scheins)
  const ziel = { farbe: new T.Color(1, 1, 1), saett: 1.1, kontrast: 1.04, staerke: .6 };
  function stimmung(s) { ziel.farbe.set(s.farbe); ziel.saett = s.saett; ziel.kontrast = s.kontrast; ziel.staerke = s.glanz; }
  function schritt(dt, sofort) {
    const k = sofort ? 1 : Math.min(1, dt * .8), u = schluss.uniforms;
    u.farbe.value.lerp(ziel.farbe, k);
    u.saett.value += (ziel.saett - u.saett.value) * k; u.kontrast.value += (ziel.kontrast - u.kontrast.value) * k;
    u.staerke.value += (ziel.staerke - u.staerke.value) * k;
  }
  return { groesse, zeichnen, stimmung, schritt, schwelle: hell.uniforms.schwelle };
}
