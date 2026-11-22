"use client";

// The /world short film. One fixed three.js canvas, driven by a director that maps native scroll
// to a single smoothed value g = act + progress (0..6). Everything on screen is f(g, time):
// camera path, colour world, objects, and the opacity of each HTML text beat.
// Patterns learned from why.zero.university (docs/research/why-zero/REPORT.md): frame-rate
// independent exp-smoothing, one colour world per act, a grade pass with grain + cursor glow,
// a press-and-hold gesture at the threshold, a persistent CTA pill, adaptive quality tiers.
// Unlike that site: all copy stays real HTML text, scroll stays native, nothing is gesture-gated.

import { useEffect, useRef } from "react";

type Three = typeof import("three");

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ss = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const damp = (cur: number, to: number, speed: number, dt: number) => cur + (to - cur) * (1 - Math.exp(-speed * dt));
const rnd = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// One colour world per act: background top/bottom, glow, bloom strength/threshold, saturation.
const WORLDS = [
  { top: "#0b0a1f", bot: "#1c1233", glow: "#ff8a2e", bloom: 0.95, thr: 0.7, sat: 1.05, dust: "#ffb25c", petals: 0 },
  { top: "#3b1631", bot: "#c25a32", glow: "#ffd38a", bloom: 0.7, thr: 0.78, sat: 1.1, dust: "#ffd9a0", petals: 0.35 },
  { top: "#2a0306", bot: "#8f0f15", glow: "#ff4433", bloom: 0.6, thr: 0.95, sat: 1.12, dust: "#ff7a5c", petals: 0 },
  { top: "#03100b", bot: "#0e3627", glow: "#e8c46a", bloom: 0.8, thr: 0.9, sat: 1.0, dust: "#ffc35a", petals: 0 },
  { top: "#040a1c", bot: "#10284a", glow: "#5fd4ff", bloom: 0.9, thr: 0.72, sat: 1.08, dust: "#9fd8ff", petals: 0 },
  { top: "#fbf6ec", bot: "#efdcbc", glow: "#ffffff", bloom: 0.06, thr: 1.3, sat: 1.04, dust: "#ff9a3c", petals: 0.25 },
  { top: "#0d0b24", bot: "#2b1a3f", glow: "#ff8a2e", bloom: 0.5, thr: 0.98, sat: 1.04, dust: "#ffb25c", petals: 0.2 },
];

// Camera keyframes along g: [g, position, lookAt]. Eased with smoothstep between keys.
const CAM: [number, number[], number[]][] = [
  [0.0, [0, 0.42, 3.6], [0, 0.32, 0]],
  [0.7, [0, 0.6, 4.6], [0, 0.26, 0]],
  [1.5, [0.9, 1.1, 6.4], [0, 0.1, 0]],
  [2.5, [0, 0.2, 8.4], [0, 0, 0]],
  [3.5, [-0.5, 0.1, 6.8], [0, 0, 0]],
  [4.05, [0, 0.45, 7.4], [0, 0.2, 0]],
  [4.9, [0, 0.3, 6.6], [0, 0.2, 0]],
  [5.3, [0, 0, 5.6], [0, 0, 0]],
  [5.6, [3.3, 0.9, 4.3], [0.2, 0, -0.5]],
  [5.92, [0, 0.05, 5.6], [0, 0, 0]],
  [6.4, [0, 1.9, 9.8], [0, 0.25, 0]],
  [7.0, [0, 2.3, 10.8], [0, 0.25, 0]],
];

// Ring posters: public/world/p{i}.webp, width/height (height 1).
const POSTER_ASPECT = [0.8, 1, 0.8, 0.667, 0.8, 0.667, 0.667, 0.8, 0.8, 1, 0.8];

const NOISE_GLSL = /* glsl */ `
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 4; i++){ v += a*noise(p); p *= 2.03; a *= .5; } return v; }
`;

export default function WorldStage() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    const root = el?.closest(".w") as HTMLElement | null;
    if (!el || !root || !root.classList.contains("w-film")) return;
    let stop = () => {};
    let dead = false;
    (async () => {
      const fams = getComputedStyle(root);
      const font = (v: string) => fams.getPropertyValue(v).trim() || "serif";
      const F = { deva: font("--w-deva"), serif: font("--w-serif"), script: font("--w-script"), mono: font("--w-mono") };
      await Promise.all([
        document.fonts.load(`400 64px ${F.deva}`, "रोज़ ताज़ा मिठाई"),
        document.fonts.load(`300 64px ${F.serif}`),
        document.fonts.load(`400 64px ${F.script}`),
        document.fonts.load(`400 32px ${F.mono}`),
      ]).catch(() => {});
      const [THREE, post, room] = await Promise.all([
        import("three"),
        Promise.all([
          import("three/examples/jsm/postprocessing/EffectComposer.js"),
          import("three/examples/jsm/postprocessing/RenderPass.js"),
          import("three/examples/jsm/postprocessing/UnrealBloomPass.js"),
          import("three/examples/jsm/postprocessing/ShaderPass.js"),
          import("three/examples/jsm/postprocessing/OutputPass.js"),
        ]),
        import("three/examples/jsm/environments/RoomEnvironment.js"),
      ]);
      if (dead) return;
      stop = start(THREE, post, room.RoomEnvironment, el, root, F);
    })().catch((err) => {
      console.warn("[world] falling back to static page", err);
      root.classList.remove("w-film");
    });
    return () => {
      dead = true;
      stop();
    };
  }, []);

  return <div ref={host} className="w-canvas" aria-hidden="true" />;
}

type PostMods = [
  typeof import("three/examples/jsm/postprocessing/EffectComposer.js"),
  typeof import("three/examples/jsm/postprocessing/RenderPass.js"),
  typeof import("three/examples/jsm/postprocessing/UnrealBloomPass.js"),
  typeof import("three/examples/jsm/postprocessing/ShaderPass.js"),
  typeof import("three/examples/jsm/postprocessing/OutputPass.js"),
];

function start(
  THREE: Three,
  [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { ShaderPass }, { OutputPass }]: PostMods,
  RoomEnvironment: typeof import("three/examples/jsm/environments/RoomEnvironment.js").RoomEnvironment,
  el: HTMLDivElement,
  root: HTMLElement,
  F: { deva: string; serif: string; script: string; mono: string },
) {
  const narrow = () => innerWidth <= 768;
  const mobile = narrow() || matchMedia("(pointer: coarse)").matches;

  // ---------- renderer + post ----------
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: "high-performance" });
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
  renderer.setSize(innerWidth, innerHeight);
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.45;
  const camera = new THREE.PerspectiveCamera(narrow() ? 40 : 30, innerWidth / innerHeight, 0.1, 60);

  const rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: mobile ? 0 : 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.9, 0.6, 0.72);
  composer.addPass(bloom);
  const grade = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uTime: { value: 0 },
      uSat: { value: 1.05 },
      uContrast: { value: 1.04 },
      uGrain: { value: 0.035 },
      uVig: { value: 0.55 },
      uHover: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uRes: { value: new THREE.Vector2(innerWidth, innerHeight) },
      uGlowCol: { value: new THREE.Color("#ffdb9e") },
    },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse; uniform float uTime, uSat, uContrast, uGrain, uVig, uHover;
      uniform vec2 uMouse, uRes; uniform vec3 uGlowCol; varying vec2 vUv;
      void main(){
        vec3 c = texture2D(tDiffuse, vUv).rgb;
        float l = dot(c, vec3(.2126, .7152, .0722));
        c = mix(vec3(l), c, uSat);
        c = max((c - .18) * uContrast + .18, 0.);
        // colour-dodge light that follows the cursor
        vec2 m = (vUv - uMouse) * vec2(uRes.x / uRes.y, 1.);
        float g = pow(1. - smoothstep(0., .42, length(m)), 2.) * uHover;
        c = c / (1. - clamp(uGlowCol * g * .32, 0., .8));
        vec2 v = vUv - .5;
        c *= mix(1., smoothstep(.95, .25, length(v * vec2(1., .9))), uVig);
        float n = fract(sin(dot(floor(vUv * uRes) + fract(uTime) * 91.7, vec2(12.9898, 78.233))) * 43758.5453);
        c += (n - .5) * uGrain * (.25 + l);
        gl_FragColor = vec4(c, 1.);
      }`,
  });
  composer.addPass(grade);
  composer.addPass(new OutputPass());

  // ---------- helpers ----------
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const canvasTex = (w: number, h: number, draw: (x: CanvasRenderingContext2D, w: number, h: number) => void) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    draw(c.getContext("2d")!, w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = aniso;
    return t;
  };
  const roundRect = (x: CanvasRenderingContext2D, X: number, Y: number, W: number, H: number, r: number) => {
    x.beginPath();
    x.roundRect(X, Y, W, H, r);
  };



  // ---------- background: one quad, colour world lerped per act ----------
  const bgU = {
    uTop: { value: new THREE.Color(WORLDS[0].top) },
    uBot: { value: new THREE.Color(WORLDS[0].bot) },
    uGlow: { value: new THREE.Color(WORLDS[0].glow) },
    uGlowAmt: { value: 0.3 },
    uTime: { value: 0 },
    uAspect: { value: innerWidth / innerHeight },
  };
  const bg = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms: bgU,
      depthWrite: false,
      depthTest: false,
      vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 1., 1.); }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uTop, uBot, uGlow; uniform float uGlowAmt, uTime, uAspect; varying vec2 vUv;
        ${NOISE_GLSL}
        void main(){
          vec3 c = mix(uBot, uTop, smoothstep(0., 1., vUv.y));
          vec2 p = (vUv - vec2(.5, .38)) * vec2(uAspect, 1.);
          c += uGlow * uGlowAmt * exp(-dot(p, p) * 3.2);
          float haze = fbm(vUv * vec2(2.5, 1.6) + vec2(uTime * .015, uTime * .008));
          c *= .93 + haze * .14;
          gl_FragColor = vec4(c, 1.);
        }`,
    }),
  );
  bg.frustumCulled = false;
  bg.renderOrder = -10;
  scene.add(bg);

  // ---------- lights ----------
  scene.add(new THREE.HemisphereLight("#ffeedd", "#201030", 0.7));
  const key = new THREE.DirectionalLight("#ffd9b0", 1.4);
  key.position.set(2, 3, 4);
  scene.add(key);

  // ---------- the CREO core (opening image; the team orbits it in act 4, it returns for the finale) ----------
  const core = new THREE.Group();
  scene.add(core);
  const flameU = { uTime: { value: 0 }, uLit: { value: 0 } };
  const heart = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.27, 24),
    new THREE.ShaderMaterial({
      uniforms: flameU,
      vertexShader: /* glsl */ `
        uniform float uTime; varying vec3 vN, vP; varying vec3 vV;
        ${NOISE_GLSL}
        void main(){
          vec3 p = position * (1. + (fbm(position.xy * 4. + uTime * .3) - .5) * .12);
          vec4 wp = modelMatrix * vec4(p, 1.);
          vN = normalize(mat3(modelMatrix) * normal); vP = position; vV = normalize(cameraPosition - wp.xyz);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime, uLit; varying vec3 vN, vP, vV;
        ${NOISE_GLSL}
        void main(){
          float n = fbm(vP.xy * 5. + vec2(uTime * .25, -uTime * .18) + vP.z * 3.);
          vec3 a = vec3(1., .45, .1), b = vec3(1., .2, .55), c = vec3(1., .9, .6);
          vec3 col = mix(mix(a, b, smoothstep(.3, .7, n)), c, pow(n, 3.) * 1.5);
          float rim = pow(1. - abs(dot(vN, vV)), 2.);
          float on = .12 + uLit * .88;
          gl_FragColor = vec4(col * (.35 + rim * 1.4 + n * .8) * on * 1.6, 1.);
        }`,
    }),
  );
  core.add(heart);
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(0.44, 96, 64),
    new THREE.MeshPhysicalMaterial({
      color: "#ffffff", roughness: 0.06, transmission: 1, thickness: 0.6, ior: 1.42,
      iridescence: 0.7, iridescenceIOR: 1.3, clearcoat: 1, transparent: true,
    }),
  );
  core.add(shell);
  const orbitRings = [0.62, 0.74].map((r, i) => {
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.0045, 8, 220),
      new THREE.MeshStandardMaterial({ color: "#f3c47a", metalness: 1, roughness: 0.25, emissive: "#ff9a3c", emissiveIntensity: 0 }),
    );
    m.rotation.set(Math.PI / 2 + (i ? 0.35 : -0.25), i ? 0.4 : -0.2, 0);
    core.add(m);
    return m;
  });
  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 2.4),
    new THREE.ShaderMaterial({
      uniforms: flameU,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
      fragmentShader: /* glsl */ `uniform float uLit, uTime; varying vec2 vUv;
        void main(){ float d = length(vUv - .5); float a = exp(-d * d * 16.) * (.92 + .08 * sin(uTime * 2.));
          gl_FragColor = vec4(vec3(1., .5, .25) * a * .5 * uLit, 1.); }`,
    }),
  );
  core.add(halo);
  const lamp = new THREE.PointLight("#ffae5c", 0, 5, 2);
  core.add(lamp);
  const floorTex = canvasTex(1024, 1024, (x, w, h) => {
    x.translate(w / 2, h / 2);
    x.strokeStyle = "rgba(255,226,180,0.9)";
    for (let i = 1; i <= 9; i++) {
      x.lineWidth = i % 3 ? 1.5 : 3;
      x.globalAlpha = 1 - i / 11;
      x.beginPath();
      x.arc(0, 0, i * 52, 0, Math.PI * 2);
      x.stroke();
    }
    x.globalAlpha = 0.6;
    for (let i = 0; i < 120; i++) {
      x.rotate((Math.PI * 2) / 120);
      x.fillStyle = "rgba(255,226,180,0.9)";
      x.fillRect(0, -470, i % 10 ? 1.5 : 3, i % 10 ? 14 : 30);
    }
  });
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 2.6),
    new THREE.MeshBasicMaterial({ map: floorTex, transparent: true, depthWrite: false, opacity: 0.25, blending: THREE.AdditiveBlending }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.62;
  core.add(floor);

  // ---------- the team: six specialists orbiting the core (act 4) ----------
  const AGENTS: [string, string][] = [
    ["Brand", "#ffb25c"], ["Strategist", "#7c9cff"], ["Designer", "#ff5e8a"],
    ["Manager", "#3fd0a8"], ["Research", "#c58bff"], ["Analyst", "#ffd84a"],
  ];
  const team = new THREE.Group();
  scene.add(team);
  const nodes = AGENTS.map(([name, col], i) => {
    const g0 = new THREE.Group();
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 48, 32),
      new THREE.MeshPhysicalMaterial({ color: col, emissive: col, emissiveIntensity: 0.4, roughness: 0.2, clearcoat: 1 }),
    );
    g0.add(orb);
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.16),
      new THREE.MeshBasicMaterial({
        transparent: true,
        depthWrite: false,
        map: canvasTex(900, 160, (x, w, h) => {
          x.textAlign = "center";
          x.fillStyle = col;
          x.font = `400 30px ${F.mono}`;
          x.fillText(`0${i + 1}`, w / 2, 48);
          x.fillStyle = "#fff6e6";
          x.font = `300 76px ${F.serif}`;
          x.fillText(name, w / 2, 130);
        }),
      }),
    );
    label.position.y = -0.24;
    g0.add(label);
    team.add(g0);
    return { g: g0, orb, label, hot: 0 };
  });
  const linkGeo = new THREE.BufferGeometry();
  linkGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(AGENTS.length * 6), 3));
  const links = new THREE.LineSegments(
    linkGeo,
    new THREE.LineBasicMaterial({ color: "#ffd9a0", transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  links.frustumCulled = false;
  team.add(links);

  // ---------- the swarm: posts you're expected to make (act 2), then the traps that burn (act 3) ----------
  const CARD_N = mobile ? 30 : 54;
  const atlas = canvasTex(2048, 640, (x) => {
    const cell = (i: number, fn: () => void) => {
      x.save();
      x.translate(i * 512, 0);
      x.beginPath();
      x.rect(0, 0, 512, 640);
      x.clip();
      fn();
      x.restore();
    };
    // 0 — blank post nobody made yet
    cell(0, () => {
      x.fillStyle = "#ece8e2";
      x.fillRect(0, 0, 512, 640);
      x.fillStyle = "#d6d0c7";
      roundRect(x, 36, 36, 440, 400, 18);
      x.fill();
      x.fillStyle = "#c2bab0";
      x.beginPath();
      x.moveTo(90, 390); x.lineTo(210, 250); x.lineTo(300, 340); x.lineTo(350, 290); x.lineTo(430, 390);
      x.fill();
      x.beginPath();
      x.arc(370, 140, 34, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = "#d6d0c7";
      roundRect(x, 36, 470, 300, 26, 13); x.fill();
      roundRect(x, 36, 516, 200, 26, 13); x.fill();
      x.font = `400 26px ${F.mono}`;
      x.fillStyle = "#a69d92";
      x.fillText("0 POSTS THIS WEEK", 36, 600);
    });
    // 1 — the agency invoice
    cell(1, () => {
      x.fillStyle = "#fbfaf7";
      x.fillRect(0, 0, 512, 640);
      x.fillStyle = "#1d1712";
      x.font = `500 54px ${F.serif}`;
      x.fillText("Invoice", 40, 96);
      x.font = `400 22px ${F.mono}`;
      x.fillStyle = "#7a7067";
      ["Social media retainer", "Festival creative — rev. 6", "Rush charges", "Hindi version (extra)"].forEach((t, i) => {
        x.fillText(t, 40, 180 + i * 62);
        x.fillText("₹ ———", 380, 180 + i * 62);
        x.fillStyle = "#e5ded4";
        x.fillRect(40, 196 + i * 62, 432, 2);
        x.fillStyle = "#7a7067";
      });
      x.save();
      x.translate(270, 520);
      x.rotate(-0.22);
      x.strokeStyle = "#c81e1e";
      x.lineWidth = 6;
      roundRect(x, -150, -46, 300, 92, 10);
      x.stroke();
      x.fillStyle = "#c81e1e";
      x.font = `400 44px ${F.mono}`;
      x.textAlign = "center";
      x.fillText("OVERDUE", 0, 16);
      x.restore();
    });
    // 2 — the template everyone uses
    cell(2, () => {
      const g = x.createLinearGradient(0, 0, 512, 640);
      g.addColorStop(0, "#7b2ff7");
      g.addColorStop(1, "#f107a3");
      x.fillStyle = g;
      x.fillRect(0, 0, 512, 640);
      x.fillStyle = "#ffe600";
      x.font = `900 118px Impact, "Arial Black", sans-serif`;
      x.textAlign = "center";
      x.fillText("BIG", 256, 230);
      x.fillText("SALE", 256, 350);
      x.fillStyle = "#ffffff";
      x.font = `400 30px ${F.mono}`;
      x.fillText("YOUR TEXT HERE", 256, 430);
      x.strokeStyle = "rgba(255,255,255,0.8)";
      x.setLineDash([10, 8]);
      x.lineWidth = 4;
      x.beginPath();
      x.arc(256, 535, 50, 0, Math.PI * 2);
      x.stroke();
      x.font = `400 22px ${F.mono}`;
      x.fillText("LOGO", 256, 543);
    });
    // 3 — generic AI that can't shape Indian scripts (broken conjuncts + typo)
    cell(3, () => {
      const g = x.createRadialGradient(256, 260, 20, 256, 300, 420);
      g.addColorStop(0, "#f0d7ff");
      g.addColorStop(1, "#7aa7ff");
      x.fillStyle = g;
      x.fillRect(0, 0, 512, 640);
      x.fillStyle = "#3b1d6b";
      x.font = `400 92px ${F.deva}, sans-serif`;
      let cx = 40;
      ["न", "म", "स", "्", "त", "े"].forEach((ch) => {
        x.fillText(ch, cx, 280);
        cx += x.measureText(ch).width + 14;
      });
      x.font = `italic 400 46px ${F.serif}`;
      x.fillText("Grand Openning Sael", 52, 380);
      x.font = `400 22px ${F.mono}`;
      x.fillStyle = "rgba(59,29,107,0.7)";
      x.fillText("AI GENERATED · 1 OF 1000", 52, 590);
    });
  });
  const cardMat = new THREE.ShaderMaterial({
    uniforms: { uMap: { value: atlas }, uEmber: { value: new THREE.Color("#ff8a1e") } },
    side: THREE.DoubleSide,
    transparent: true,
    vertexShader: /* glsl */ `
      attribute float aVar; attribute float aBurn; attribute float aSeed;
      varying vec2 vUv; varying float vVar, vBurn, vSeed, vShade;
      void main(){
        vUv = uv; vVar = aVar; vBurn = aBurn; vSeed = aSeed;
        vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.);
        vec3 n = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
        vec3 V = normalize(cameraPosition - wp.xyz);
        vShade = .74 + .26 * abs(dot(n, normalize(vec3(.3, .8, .6)))) + pow(1. - abs(dot(n, V)), 3.) * .1;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap; uniform vec3 uEmber;
      varying vec2 vUv; varying float vVar, vBurn, vSeed, vShade;
      ${NOISE_GLSL}
      void main(){
        vec2 p = (vUv - .5) * vec2(.8, 1.);
        float d = length(max(abs(p) - vec2(.4, .5) + .035, 0.)) - .035;
        if (d > 0.) discard;
        float v = fbm(vUv * 3.5 + vSeed * 17.) * .55 + vUv.y * .45;
        float thr = vBurn * 1.12 - .06;
        if (v < thr) discard;
        float edge = (1. - smoothstep(0., .05, v - thr)) * step(.001, vBurn);
        float char = (1. - smoothstep(0., .14, v - thr)) * step(.001, vBurn);
        vec3 c = texture2D(uMap, vec2((vVar + vUv.x) / 4., vUv.y)).rgb * vShade;
        c *= .8;
        c = mix(c, vec3(.08, .04, .02), char * .85);
        c += uEmber * edge * 5.;
        gl_FragColor = vec4(c, 1.);
      }`,
  });
  const cardGeo = new THREE.PlaneGeometry(0.8, 1.0);
  const aVar = new Float32Array(CARD_N), aBurn = new Float32Array(CARD_N), aSeed = new Float32Array(CARD_N);
  const homes: InstanceType<Three["Vector3"]>[] = [];
  for (let i = 0; i < CARD_N; i++) {
    aSeed[i] = rnd(i + 1);
    aVar[i] = i < 3 ? i + 1 : rnd(i + 9) < 0.6 ? 0 : rnd(i + 3) < 0.5 ? 2 : 3;
    const th = rnd(i + 11) * Math.PI * 2, ph = Math.acos(2 * rnd(i + 21) - 1), r = 1.9 + rnd(i + 31) * 2.4;
    homes.push(new THREE.Vector3(Math.sin(ph) * Math.cos(th) * r * 1.5, Math.cos(ph) * r * 0.8, Math.sin(ph) * Math.sin(th) * r - 0.6));
  }
  cardGeo.setAttribute("aVar", new THREE.InstancedBufferAttribute(aVar, 1));
  cardGeo.setAttribute("aBurn", new THREE.InstancedBufferAttribute(aBurn, 1));
  cardGeo.setAttribute("aSeed", new THREE.InstancedBufferAttribute(aSeed, 1));
  const cards = new THREE.InstancedMesh(cardGeo, cardMat, CARD_N);
  cards.frustumCulled = false;
  scene.add(cards);

  // ---------- the hero post: built in real layers (act 4) ----------
  const PW = 1.6, PH = 2.0;
  // Real CREO engine output (The Pizza Bakery), split into the plate it generated and the layers composited over it.
  const imgTex = (src: string) => {
    const t = new THREE.TextureLoader().load(src);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = aniso;
    return t;
  };
  const layerTex = ["bg", "photo", "type", "bar"].map((n) => imgTex(`/world/hero-${n}.webp`));
  const LABELS = ["01  Background plate", "02  Product photos", "03  Type + logo — exact, never misspelled", "04  Footer — address, contact"];
  const heroPost = new THREE.Group();
  scene.add(heroPost);
  const layers = layerTex.map((map, k) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(PW, PH),
      new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: k === 0, side: THREE.DoubleSide }),
    );
    m.renderOrder = k;
    heroPost.add(m);
    return m;
  });
  const finalPost = new THREE.Mesh(
    new THREE.PlaneGeometry(PW, PH),
    new THREE.MeshBasicMaterial({ map: imgTex("/world/hero-final.webp"), transparent: true, depthWrite: false, side: THREE.DoubleSide }),
  );
  finalPost.renderOrder = layerTex.length;
  finalPost.position.z = 0.06;
  heroPost.add(finalPost);
  const scatter = [[-2.4, 1.3, -1.2], [2.6, -0.9, -0.6], [-2.0, -1.5, 0.6], [2.2, 1.6, 0.3], [0.2, -2.6, 1.0]];
  const labels = LABELS.map((t) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 0.11),
      new THREE.MeshBasicMaterial({
        transparent: true,
        depthWrite: false,
        map: canvasTex(1500, 110, (x, w, h) => {
          x.fillStyle = "rgba(29,23,18,0.55)";
          x.fillRect(0, h / 2 - 1, 90, 2);
          x.fillStyle = "#1d1712";
          x.font = `400 40px ${F.mono}`;
          x.fillText(t.toUpperCase(), 110, h / 2 + 14);
        }),
      }),
    );
    heroPost.add(m);
    return m;
  });
  const approve = new THREE.Mesh(
    new THREE.PlaneGeometry(0.95, 0.22),
    new THREE.MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
      map: canvasTex(860, 200, (x, w, h) => {
        x.fillStyle = "#15803d";
        roundRect(x, 4, 4, w - 8, h - 8, (h - 8) / 2);
        x.fill();
        x.strokeStyle = "#fff";
        x.lineWidth = 14;
        x.lineCap = "round";
        x.beginPath();
        x.moveTo(70, 100); x.lineTo(105, 135); x.lineTo(170, 65);
        x.stroke();
        x.fillStyle = "#fff";
        x.font = `400 46px ${F.mono}`;
        x.fillText("APPROVED BY YOU", 210, 118);
      }),
    }),
  );
  approve.position.set(0.5, -0.95, 0.3);
  heroPost.add(approve);

  // ---------- the ring: real posters made by CREO's design engine (act 6) ----------
  const ring = new THREE.Group();
  scene.add(ring);
  const ringPosts = POSTER_ASPECT.map((asp, i) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(asp, 1.0),
      new THREE.MeshBasicMaterial({ map: imgTex(`/world/p${i}.webp`), color: "#c9c9c9", transparent: true }),
    );
    ring.add(m);
    return m;
  });

  // ---------- confetti (sparse, one per agent colour) ----------
  const PETAL_N = mobile ? 120 : 260;
  const petalTex = canvasTex(64, 96, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(1, "#d9d9d9");
    x.fillStyle = g;
    x.beginPath();
    x.ellipse(w / 2, h / 2, w * 0.42, h * 0.46, 0, 0, Math.PI * 2);
    x.fill();
  });
  const petals = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(0.06, 0.09),
    new THREE.MeshBasicMaterial({ map: petalTex, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
    PETAL_N,
  );
  petals.frustumCulled = false;
  const petalCol = ["#ffb300", "#ff5e8a", "#3fd0a8", "#7c9cff", "#ffd84a"];
  for (let i = 0; i < PETAL_N; i++) petals.setColorAt(i, new THREE.Color(petalCol[i % petalCol.length]));
  scene.add(petals);

  // ---------- dust / embers ----------
  const DUST_N = mobile ? 260 : 620;
  const dGeo = new THREE.BufferGeometry();
  const dPos = new Float32Array(DUST_N * 3), dSeed = new Float32Array(DUST_N);
  for (let i = 0; i < DUST_N; i++) {
    dPos.set([(rnd(i + 5) - 0.5) * 13, (rnd(i + 6) - 0.5) * 8, (rnd(i + 7) - 0.5) * 8 - 1], i * 3);
    dSeed[i] = rnd(i + 8);
  }
  dGeo.setAttribute("position", new THREE.BufferAttribute(dPos, 3));
  dGeo.setAttribute("aSeed", new THREE.BufferAttribute(dSeed, 1));
  const dustU = {
    uTime: { value: 0 },
    uRise: { value: 0.1 },
    uPix: { value: renderer.getPixelRatio() * innerHeight },
    uCol: { value: new THREE.Color(WORLDS[0].dust) },
    uAmt: { value: 0.6 },
  };
  const dust = new THREE.Points(
    dGeo,
    new THREE.ShaderMaterial({
      uniforms: dustU,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute float aSeed; uniform float uTime, uRise, uPix; varying float vA;
        void main(){
          vec3 p = position;
          p.y = mod(p.y + uTime * uRise * (.4 + aSeed) + 4., 8.) - 4.;
          p.x += sin(uTime * .4 + aSeed * 20.) * .2;
          vec4 mv = modelViewMatrix * vec4(p, 1.);
          gl_PointSize = (2. + aSeed * 5.) * uPix / 900. * (6. / -mv.z);
          gl_Position = projectionMatrix * mv;
          vA = .45 + .55 * sin(uTime * 1.7 + aSeed * 40.);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uCol; uniform float uAmt; varying float vA;
        void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, 0., d);
          gl_FragColor = vec4(uCol * a * a * vA * uAmt, 1.); }`,
    }),
  );
  dust.frustumCulled = false;
  scene.add(dust);

  // ---------- director state ----------
  const acts = [...root.querySelectorAll<HTMLElement>("[data-act]")];
  const beats = [...root.querySelectorAll<HTMLElement>(".w-beat")].map((b) => ({
    el: b,
    act: Number(b.closest<HTMLElement>("[data-act]")!.dataset.act),
    a: Number(b.dataset.in),
    z: Number(b.dataset.out),
    o: -1,
  }));
  const chapters = [...root.querySelectorAll<HTMLElement>("[data-chapter]")];
  const holdBtn = root.querySelector<HTMLButtonElement>("[data-hold]");
  let tops: number[] = [], heights: number[] = [], filmEnd = Infinity;
  const measure = () => {
    tops = acts.map((a) => a.getBoundingClientRect().top + scrollY);
    // The last act finishes as the normal-scroll content below it starts entering the viewport.
    heights = acts.map((a, i) => a.offsetHeight - (i === acts.length - 1 ? innerHeight : 0));
    filmEnd = tops[tops.length - 1] + acts[acts.length - 1].offsetHeight;
  };
  const rawG = () => {
    const y = scrollY;
    let i = 0;
    while (i < acts.length - 1 && y >= tops[i + 1]) i++;
    const v = i + clamp01((y - tops[i]) / Math.max(1, heights[i]));
    return Number.isFinite(v) ? v : 0;
  };

  measure();
  let g = rawG(), gs = g;
  let lit = 0, litT = 0, hold = 0, holding = false, ignitedAt = -1;
  const mouse = { x: 0, y: 0, sx: 0, sy: 0, u: 0.5, v: 0.5, on: 0 };
  let ringRot = 0, ringVel = 0, dragging = false, lastX = 0;
  let flow = 0;
  let tier = mobile ? 1 : 0, frames = 0, msSum = 0, cool = 0;
  const applyTier = () => {
    const dpr = [Math.min(devicePixelRatio, 2), Math.min(devicePixelRatio, 1.4), 1][tier];
    renderer.setPixelRatio(dpr);
    composer.setPixelRatio(dpr);
    composer.setSize(innerWidth, innerHeight);
    bloom.enabled = tier < 2;
    dustU.uPix.value = dpr * innerHeight;
  };
  applyTier();

  // ---------- smooth wheel (desktop only; keyboard, scrollbar and touch stay native) ----------
  const finePointer = matchMedia("(pointer: fine)").matches;
  let wTarget = scrollY, wCur = scrollY, wheeling = false;
  const maxScroll = () => document.documentElement.scrollHeight - innerHeight;
  const onWheel = (e: WheelEvent) => {
    if (e.ctrlKey || !finePointer) return;
    e.preventDefault();
    const d = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaMode === 2 ? e.deltaY * innerHeight : e.deltaY;
    if (!wheeling) wTarget = wCur = scrollY;
    wTarget = Math.min(maxScroll(), Math.max(0, wTarget + d));
    wheeling = true;
  };
  const glideTo = (y: number) => {
    if (!wheeling) wCur = scrollY;
    wTarget = Math.min(maxScroll(), Math.max(0, y));
    wheeling = true;
  };
  addEventListener("wheel", onWheel, { passive: false });

  // ---------- hold to light ----------
  const ignite = () => {
    if (lit) return;
    lit = 1;
    ignitedAt = performance.now();
  };
  const holdOn = (e: Event) => {
    holding = true;
    if (e instanceof PointerEvent) holdBtn?.setPointerCapture(e.pointerId);
  };
  const holdOff = () => (holding = false);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (e.type === "keydown" && !e.repeat) holding = true;
      if (e.type === "keyup") holding = false;
    }
  };
  // assistive tech clicks without pointer/key events: light immediately
  const onClick = (e: MouseEvent) => {
    if (e.detail === 0 && !holding) ignite();
  };
  holdBtn?.addEventListener("pointerdown", holdOn);
  holdBtn?.addEventListener("pointerup", holdOff);
  holdBtn?.addEventListener("pointercancel", holdOff);
  holdBtn?.addEventListener("keydown", onKey);
  holdBtn?.addEventListener("keyup", onKey);
  holdBtn?.addEventListener("click", onClick);

  // ---------- pointer: parallax, cursor light, ring drag ----------
  const onMove = (e: PointerEvent) => {
    mouse.x = (e.clientX / innerWidth) * 2 - 1;
    mouse.y = (e.clientY / innerHeight) * 2 - 1;
    mouse.u = e.clientX / innerWidth;
    mouse.v = 1 - e.clientY / innerHeight;
    mouse.on = e.pointerType === "mouse" ? 1 : 0;
    if (dragging) {
      ringVel = (e.clientX - lastX) * 0.006;
      ringRot += ringVel;
      lastX = e.clientX;
    }
  };
  const onDown = (e: PointerEvent) => {
    if (gs < 5.95) return;
    dragging = true;
    lastX = e.clientX;
  };
  const onUp = () => (dragging = false);
  addEventListener("pointermove", onMove, { passive: true });
  el.addEventListener("pointerdown", onDown);
  addEventListener("pointerup", onUp);
  const onLeave = () => (mouse.on = 0);
  document.documentElement.addEventListener("pointerleave", onLeave);

  const onResize = () => {
    camera.fov = narrow() ? 40 : 30;
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
    bloom.resolution.set(innerWidth / 2, innerHeight / 2);
    grade.uniforms.uRes.value.set(innerWidth, innerHeight);
    bgU.uAspect.value = innerWidth / innerHeight;
    dustU.uPix.value = renderer.getPixelRatio() * innerHeight;
    measure();
  };
  addEventListener("resize", onResize);
  const ro = new ResizeObserver(measure);
  ro.observe(root);

  // ---------- frame ----------
  const tmpC = new THREE.Color(), tmpC2 = new THREE.Color();
  const v3 = new THREE.Vector3(), v3b = new THREE.Vector3(), look = new THREE.Vector3();
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), qb = new THREE.Quaternion(), e3 = new THREE.Euler(), sc = new THREE.Vector3();
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  let raf = 0, last = performance.now(), time = 0, tone = "dark", pillOn = false, afterOn = false, chapter = -1;

  const world = (gg: number) => {
    const i = Math.min(WORLDS.length - 1, Math.max(0, Math.floor(gg)));
    const j = Math.min(WORLDS.length - 1, i + 1);
    return { A: WORLDS[i], B: WORLDS[j], t: ss(0.8, 1.0, gg - i), i };
  };
  const mixNum = (a: number, b: number, t: number) => a + (b - a) * t;

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt;

    // scroll → g
    if (wheeling) {
      wCur = damp(wCur, wTarget, 9, dt);
      if (Math.abs(wTarget - wCur) < 0.5) {
        wCur = wTarget;
        wheeling = false;
      }
      scrollTo(0, wCur);
    }
    g = rawG();
    gs = damp(gs, g, 7, dt);

    // hold-to-light
    if (!lit) {
      hold = holding ? Math.min(1, hold + dt / 1.1) : damp(hold, 0, 6, dt);
      if (hold >= 1) ignite();
      if (gs > 0.55) ignite();
    }
    holdBtn?.style.setProperty("--hold", (lit ? 1 : hold).toFixed(3));
    if (ignitedAt > 0 && now - ignitedAt > 900 && scrollY < tops[1]) {
      ignitedAt = -1;
      glideTo(tops[1] + heights[1] * 0.08);
    }
    litT = damp(litT, lit ? 1 : hold * 0.45, lit ? 2.2 : 8, dt);

    // colour world
    const { A, B, t, i: ai } = world(gs);
    bgU.uTop.value.copy(tmpC.set(A.top)).lerp(tmpC2.set(B.top), t);
    bgU.uBot.value.copy(tmpC.set(A.bot)).lerp(tmpC2.set(B.bot), t);
    bgU.uGlow.value.copy(tmpC.set(A.glow)).lerp(tmpC2.set(B.glow), t);
    bgU.uGlowAmt.value = (ai === 0 && t < 0.5 ? 0.08 + litT * 0.32 : 0.3) * (1 - (ai === 5 ? 1 - t : ai === 4 ? t : 0) * 0.8);
    bgU.uTime.value = time;
    bloom.strength = mixNum(A.bloom, B.bloom, t);
    bloom.threshold = mixNum(A.thr, B.thr, t);
    grade.uniforms.uSat.value = mixNum(A.sat, B.sat, t);
    dustU.uCol.value.copy(tmpC.set(A.dust)).lerp(tmpC2.set(B.dust), t);
    const light = (ai === 5 ? 1 - t : 0) + (ai === 4 ? t : 0);
    dustU.uAmt.value = 0.65 * (1 - light * 0.6);
    dustU.uRise.value = 0.08 + ss(2.9, 3.2, gs) * (1 - ss(3.9, 4.1, gs)) * 0.45;
    dustU.uTime.value = time;
    const nextTone = light > 0.5 ? "light" : "dark";
    if (nextTone !== tone) root.dataset.tone = tone = nextTone;
    grade.uniforms.uTime.value = time;
    grade.uniforms.uVig.value = 0.55 * (1 - light * 0.6);
    grade.uniforms.uGrain.value = 0.035 * (1 - light * 0.4);
    grade.uniforms.uHover.value = damp(grade.uniforms.uHover.value, mouse.on * (1 - light * 0.6), 3, dt);
    grade.uniforms.uMouse.value.set(mouse.u, mouse.v);

    // camera along keyframes + pointer parallax
    let k = 0;
    while (k < CAM.length - 2 && gs >= CAM[k + 1][0]) k++;
    const [g0, p0, l0] = CAM[k], [g1, p1, l1] = CAM[k + 1];
    const ct = ss(0, 1, (gs - g0) / (g1 - g0));
    camPos.set(p0[0], p0[1], p0[2]).lerp(v3.set(p1[0], p1[1], p1[2]), ct);
    camLook.set(l0[0], l0[1], l0[2]).lerp(v3.set(l1[0], l1[1], l1[2]), ct);
    const aspect = innerWidth / innerHeight;
    const far = aspect < 1 ? Math.min(1.9, 0.95 / aspect) : 1;
    camPos.sub(camLook).multiplyScalar(far).add(camLook);
    mouse.sx = damp(mouse.sx, mouse.x, 8, dt);
    mouse.sy = damp(mouse.sy, mouse.y, 8, dt);
    const dist = camPos.distanceTo(camLook);
    camera.position.copy(camPos).add(v3.set(mouse.sx * 0.05 * dist, -mouse.sy * 0.035 * dist, 0));
    look.copy(camLook);
    camera.lookAt(look);

    // core: opening image, sinks away, rises again for the team (act 4), steps aside for the post, returns for the finale
    const coreY = -0.1 - 3.4 * ss(1.35, 2.3, gs) + 3.4 * ss(4.06, 4.24, gs) - 3.4 * ss(4.9, 5.15, gs) + 3.4 * ss(5.95, 6.35, gs);
    core.visible = coreY > -2.6;
    core.position.y = coreY;
    flameU.uTime.value = time;
    const pulse = 0.94 + Math.sin(time * 1.8) * 0.06;
    flameU.uLit.value = litT * pulse;
    lamp.intensity = litT * 1.6 * pulse;
    heart.rotation.y = time * 0.25;
    orbitRings[0].rotation.z = time * 0.3;
    orbitRings[1].rotation.z = -time * 0.22;
    (orbitRings[0].material as InstanceType<Three["MeshStandardMaterial"]>).emissiveIntensity = litT * 0.8;
    (orbitRings[1].material as InstanceType<Three["MeshStandardMaterial"]>).emissiveIntensity = litT * 0.8;
    halo.quaternion.copy(camera.quaternion);
    (floor.material as InstanceType<Three["MeshBasicMaterial"]>).opacity = 0.06 + litT * 0.3;

    // team: six nodes orbit the core while act 4 names them one by one (beat k live at 0.17 + 0.13k)
    const tIn = ss(4.1, 4.24, gs) * (1 - ss(4.92, 5.08, gs));
    team.visible = tIn > 0.01;
    if (team.visible) {
      const lp4 = gs - 4;
      const act = lp4 >= 0.17 && lp4 < 0.95 ? Math.floor((lp4 - 0.17) / 0.13) : -1;
      const R0 = (narrow() ? 1.05 : 1.65) * (0.6 + tIn * 0.4);
      const pos = linkGeo.attributes.position as InstanceType<Three["BufferAttribute"]>;
      nodes.forEach((n, i) => {
        const a = (i / nodes.length) * Math.PI * 2 + time * 0.12;
        n.g.position.set(Math.sin(a) * R0, coreY + Math.cos(a) * R0 * 0.55, Math.cos(a) * 0.5);
        n.hot = damp(n.hot, act === i ? 1 : act < 0 ? 0.5 : 0, 6, dt);
        n.g.scale.setScalar(tIn * (0.75 + n.hot * 0.55));
        (n.orb.material as InstanceType<Three["MeshPhysicalMaterial"]>).emissiveIntensity = 0.25 + n.hot * 1.6;
        const lm = n.label.material as InstanceType<Three["MeshBasicMaterial"]>;
        lm.opacity = tIn * (0.25 + n.hot * 0.75);
        n.label.quaternion.copy(camera.quaternion);
        pos.setXYZ(i * 2, 0, coreY, 0);
        pos.setXYZ(i * 2 + 1, n.g.position.x, n.g.position.y, n.g.position.z);
      });
      pos.needsUpdate = true;
      (links.material as InstanceType<Three["LineBasicMaterial"]>).opacity = 0.3 * tIn;
    }

    // swarm
    cards.visible = gs > 1.45 && gs < 3.98;
    if (cards.visible) {
      const arrive = ss(1.5, 2.15, gs);
      flow += dt * 0.35 * (1 - ss(2.85, 3.15, gs));
      const slots = [[3.04, 3.3, 0.95], [3.3, 3.55, -0.95], [3.55, 3.8, 0.95]];
      for (let i = 0; i < CARD_N; i++) {
        const h = homes[i], s = aSeed[i];
        const y = ((((h.y + flow * (0.6 + s) + 3.5) % 7) + 7) % 7) - 3.5;
        v3.set(h.x, y, h.z);
        v3b.set(h.x * 4, h.y * 4 - 2, h.z - 9);
        v3.lerpVectors(v3b, v3, arrive);
        e3.set(time * 0.2 * (s - 0.5) + s * 6, time * 0.25 * (0.5 - s) + s * 9, s * 3);
        q.setFromEuler(e3);
        let scale = arrive;
        let burn = ss(3.12 + s * 0.55, 3.3 + s * 0.55, gs);
        if (i < 3) {
          const [s0, s1, side] = slots[i];
          const f = ss(s0 - 0.06, s0 + 0.04, gs);
          v3b.set(side * (narrow() ? 0.25 : 1.0), narrow() ? -0.35 : 0, 2.6);
          v3.lerp(v3b, f);
          qb.copy(camera.quaternion);
          q.slerp(qb, f);
          scale *= 1 + f * 0.3;
          burn = ss(s1 - 0.07, s1 + 0.01, gs);
        }
        aBurn[i] = burn;
        m4.compose(v3, q, sc.setScalar(burn >= 0.999 ? 0 : scale));
        cards.setMatrixAt(i, m4);
      }
      cards.instanceMatrix.needsUpdate = true;
      (cardGeo.attributes.aBurn as InstanceType<Three["InstancedBufferAttribute"]>).needsUpdate = true;
    }

    // hero post: assemble → explode into layers → approve → hand over to the ring
    heroPost.visible = gs > 5.15 && gs < 6.3;
    if (heroPost.visible) {
      const e = ss(5.45, 5.56, gs) * (1 - ss(5.7, 5.8, gs));
      const out = ss(5.98, 6.22, gs);
      const yes = ss(5.74, 5.8, gs);
      // Phones: the exploded stack fans toward the left edge, so nudge it right, lift it clear of the copy, and shrink it to fit.
      heroPost.position.set(narrow() ? e * 0.3 : e * 0.9 + yes * 1.3, out * -0.6 + (narrow() ? Math.max(e, yes) * 0.6 : 0), 0);
      heroPost.scale.setScalar((1 - out * 0.55) * (narrow() ? 1 - yes * 0.25 - e * 0.22 : 1));
      heroPost.rotation.y = Math.sin(time * 0.4) * 0.04 * (1 - e) - e * 0.5;
      layers.forEach((m, k2) => {
        const a = ss(5.22 + k2 * 0.035, 5.36 + k2 * 0.035, gs);
        const s = scatter[k2];
        m.position.set(s[0] * (1 - a), s[1] * (1 - a), s[2] * (1 - a) + 0.012 * k2 + e * 0.42 * k2);
        m.rotation.set((1 - a) * (k2 - 2) * 0.5, (1 - a) * (k2 % 2 ? 0.8 : -0.8), (1 - a) * 0.3 * (k2 - 2));
        (m.material as InstanceType<Three["MeshBasicMaterial"]>).opacity = a * (1 - out);
        const lbl = labels[k2];
        lbl.position.set(PW / 2 + 0.85, 0.75 - k2 * 0.36, m.position.z);
        (lbl.material as InstanceType<Three["MeshBasicMaterial"]>).opacity = e;
        lbl.visible = e > 0.01;
      });
      const built = ss(5.72, 5.8, gs) * (1 - out); // the real finished poster once the layers close
      (finalPost.material as InstanceType<Three["MeshBasicMaterial"]>).opacity = Math.min(1, built);
      finalPost.visible = built > 0.01;
      const ap = ss(5.8, 5.88, gs) * (1 - out);
      approve.visible = ap > 0.01;
      (approve.material as InstanceType<Three["MeshBasicMaterial"]>).opacity = ap;
      approve.scale.setScalar(0.85 + ap * 0.15);
    }

    // ring of languages
    ring.visible = gs > 6.34;
    if (ring.visible) {
      const r = ss(6.36, 6.6, gs);
      if (!dragging) {
        ringVel *= Math.exp(-dt * 2.5);
        ringRot += ringVel + dt * 0.08;
      }
      ring.rotation.set(0.1, ringRot, 0);
      ring.position.y = -2 * (1 - r) + 0.1;
      const R = narrow() ? 2.2 : 3.1;
      ringPosts.forEach((m, i2) => {
        const a = (i2 / ringPosts.length) * Math.PI * 2;
        m.position.set(Math.sin(a) * R, Math.sin(time * 0.6 + i2) * 0.06, Math.cos(a) * R);
        m.rotation.set(0, -ringRot + Math.sin(a) * 0.35, 0); // face the viewer, slight fan
        m.scale.setScalar(r);
        (m.material as InstanceType<Three["MeshBasicMaterial"]>).opacity = r;
      });
    }

    // petals
    const pd = mixNum(A.petals, B.petals, t);
    for (let i = 0; i < PETAL_N; i++) {
      const s = rnd(i + 101), s2 = rnd(i + 202);
      const vis = clamp01(pd * PETAL_N - i);
      const y = 3.5 - ((time * (0.18 + s * 0.22) + s2 * 7) % 7);
      v3.set((s - 0.5) * 10 + Math.sin(time * 0.7 + i) * 0.3, y, (s2 - 0.5) * 6 - 0.5);
      e3.set(time * (0.6 + s), time * (0.9 + s2), s * 6);
      q.setFromEuler(e3);
      m4.compose(v3, q, sc.setScalar(vis));
      petals.setMatrixAt(i, m4);
    }
    petals.instanceMatrix.needsUpdate = true;

    // HTML beats follow the same smoothed g
    for (const b of beats) {
      const lp = gs - b.act;
      const o = ss(b.a, b.a + 0.05, lp) * (1 - ss(b.z - 0.05, b.z, lp));
      if (Math.abs(o - b.o) > 0.002) {
        b.o = o;
        b.el.style.setProperty("--o", o.toFixed(3));
        b.el.style.visibility = o < 0.01 ? "hidden" : "visible";
      }
    }
    root.style.setProperty("--rp", clamp01(gs / 6.6).toFixed(4));
    const ch = Math.min(6, Math.floor(gs + 0.08));
    if (ch !== chapter) {
      chapters.forEach((c, i) => (i === ch ? c.setAttribute("aria-current", "step") : c.removeAttribute("aria-current")));
      chapter = ch;
    }
    const pill = gs > 0.9 && gs < 6.42;
    if (pill !== pillOn) {
      pillOn = pill;
      root.dataset.pill = pill ? "on" : "off";
    }

    // Past the film the page reads like a normal site: give the HUD a solid backing.
    const after = scrollY >= filmEnd - 80;
    if (after !== afterOn) root.dataset.after = (afterOn = after) ? "on" : "off";
    // Normal-scroll content fully covers the canvas: skip the GPU work (and the quality sampling).
    if (scrollY >= filmEnd) return;
    composer.render(dt);

    // adaptive quality: 60-frame window, downgrade >22ms, upgrade <12ms, 180-frame cooldown
    frames++;
    msSum += dt * 1000;
    if (cool > 0) cool--;
    if (frames === 60) {
      const avg = msSum / 60;
      if (!cool && avg > 22 && tier < 2) {
        tier++;
        applyTier();
        cool = 180;
      } else if (!cool && avg < 12 && tier > (mobile ? 1 : 0)) {
        tier--;
        applyTier();
        cool = 180;
      }
      frames = 0;
      msSum = 0;
    }
  };

  const onVis = () => {
    cancelAnimationFrame(raf);
    if (!document.hidden) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  };
  document.addEventListener("visibilitychange", onVis);
  raf = requestAnimationFrame(frame);
  el.dataset.on = "true";

  return () => {
    cancelAnimationFrame(raf);
    removeEventListener("wheel", onWheel);
    removeEventListener("pointermove", onMove);
    removeEventListener("pointerup", onUp);
    removeEventListener("resize", onResize);
    document.removeEventListener("visibilitychange", onVis);
    document.documentElement.removeEventListener("pointerleave", onLeave);
    el.removeEventListener("pointerdown", onDown);
    holdBtn?.removeEventListener("pointerdown", holdOn);
    holdBtn?.removeEventListener("pointerup", holdOff);
    holdBtn?.removeEventListener("pointercancel", holdOff);
    holdBtn?.removeEventListener("keydown", onKey);
    holdBtn?.removeEventListener("keyup", onKey);
    holdBtn?.removeEventListener("click", onClick);
    ro.disconnect();
    scene.traverse((o) => {
      const m = o as InstanceType<Three["Mesh"]>;
      m.geometry?.dispose();
      const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
      mats.forEach((mt) => {
        Object.values(mt).forEach((v) => v instanceof THREE.Texture && v.dispose());
        mt.dispose();
      });
    });
    atlas.dispose();
    scene.environment?.dispose();
    pmrem.dispose();
    composer.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}
