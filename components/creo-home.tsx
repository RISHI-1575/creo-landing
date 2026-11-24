"use client";

// Behaviour for the "Living Letters" home page (app/page.tsx renders all the readable markup).
// - A three.js point field (20k points) spells Creo., then morphs through five scripts and a
//   poster as #letters scrolls; afterwards it dissolves into an ambient star field.
// - GSAP ScrollTrigger pins the team reel and turns vertical scroll into horizontal travel.
// - The poster wall is an infinite, draggable, tilted masonry of the real posters in /public/world.
// - "Press & hold" fills a ring, floods the section and bursts script glyphs.
// Runs only when the root has .motion (set before paint by the inline script in page.tsx).

import { useEffect, useRef } from "react";

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const sstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

// Real posters: public/world/p{i}.webp with width/height ratios.
const POSTER_ASPECT = [0.8, 1, 0.8, 0.667, 0.8, 0.667, 0.667, 0.8, 0.8, 1, 0.8];
const LOADER_GLYPHS = ["क", "க", "ক", "ಕ", "ક", "ਕ", "କ", "క", "ക", "C"];
const BURST_GLYPHS = ["न", "க", "ক", "ಕ", "ક", "ਕ", "କ", "క", "ക", "C", "म", "ல"];

export default function CreoHome() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = host.current?.closest(".c") as HTMLElement | null;
    if (!root) return;
    const $ = <T extends Element = HTMLElement>(s: string) => root.querySelector(s) as T;
    const $$ = <T extends Element = HTMLElement>(s: string) => [...root.querySelectorAll(s)] as T[];
    const cleanups: (() => void)[] = [];
    const on = <K extends keyof WindowEventMap>(t: EventTarget, ev: K | string, fn: (e: never) => void, opts?: AddEventListenerOptions) => {
      t.addEventListener(ev, fn as EventListener, opts);
      cleanups.push(() => t.removeEventListener(ev, fn as EventListener, opts));
    };

    // IST clock runs in every mode
    const clock = $("[data-clock]");
    const tickClock = () => { clock.textContent = "IST " + new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour12: false }); };
    tickClock();
    const clockId = setInterval(tickClock, 1000);
    cleanups.push(() => clearInterval(clockId));

    const motion = root.classList.contains("motion");
    if (!motion) {
      root.classList.remove("is-loading");
      return () => cleanups.forEach((f) => f());
    }

    let dead = false;
    let raf = 0;
    const fine = matchMedia("(pointer: fine)").matches;
    const font = (v: string) => getComputedStyle(root).getPropertyValue(v).trim() || "sans-serif";

    // ---------- poster wall ----------
    const plane = $("[data-plane]");
    const mobile = innerWidth < 760;
    const CW = mobile ? 150 : 230, GAP = mobile ? 22 : 34, COLS = 8, PER = 5;
    type Cell = { el: HTMLElement; c: number; y: number; h: number };
    const cells: Cell[] = [];
    const colH: number[] = [];
    for (let c = 0; c < COLS; c++) {
      let y = c % 2 ? CW * 0.45 : 0;
      for (let r = 0; r < PER; r++) {
        const i = (c * 3 + r * 4) % POSTER_ASPECT.length;
        const h = CW / POSTER_ASPECT[i];
        const el = document.createElement("div");
        el.className = "c-cell";
        el.style.width = CW + "px";
        el.style.height = h + "px";
        el.innerHTML = `<img src="/world/p${i}.webp" alt="" loading="lazy" draggable="false">`;
        plane.appendChild(el);
        cells.push({ el, c, y, h });
        y += h + GAP;
      }
      colH[c] = y;
    }
    cleanups.push(() => { plane.innerHTML = ""; });
    const wall = $("#wall");
    let ox = 0, oy = 0, vx = 0, vy = 0, dragging = false, lx = 0, ly = 0, wallVisible = false;
    on(wall, "pointerdown", (e: PointerEvent) => { dragging = true; lx = e.clientX; ly = e.clientY; wall.setPointerCapture(e.pointerId); });
    on(wall, "pointermove", (e: PointerEvent) => {
      if (!dragging) return;
      vx = e.clientX - lx; vy = e.clientY - ly; ox += vx * 1.4; oy += vy * 1.4; lx = e.clientX; ly = e.clientY;
    });
    on(wall, "pointerup", () => (dragging = false));
    on(wall, "pointercancel", () => (dragging = false));
    const wallIO = new IntersectionObserver(([e]) => (wallVisible = e.isIntersecting));
    wallIO.observe(wall);
    cleanups.push(() => wallIO.disconnect());
    const wallFrame = () => {
      if (!dragging) { vx *= 0.94; vy *= 0.94; ox += vx - 0.35; oy += vy - 0.18; }
      const cw = CW + GAP, TW = COLS * cw, skew = clamp(vx * 0.25, -10, 10);
      for (const k of cells) {
        const TH = colH[k.c];
        const x = (((k.c * cw + ox) % TW) + TW) % TW - TW / 2;
        const y = (((k.y + oy) % TH) + TH) % TH - TH / 2;
        k.el.style.transform = `translate3d(${x - CW / 2}px, ${y}px, 0) skewX(${-skew}deg)`;
      }
    };

    // ---------- cursor + magnetic buttons ----------
    const cur = $(".c-cursor"), dot = $(".c-dot"), ring = $(".c-ring"), clabel = $(".c-cursor em");
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    on(window, "pointermove", (e: PointerEvent) => { mx = e.clientX; my = e.clientY; });
    if (fine) {
      on(root, "pointerover", (e: PointerEvent) => {
        const t = e.target as HTMLElement;
        const lab = t.closest<HTMLElement>("[data-cursor]");
        cur.classList.toggle("label", !!lab);
        if (lab) clabel.textContent = lab.dataset.cursor || "";
        cur.classList.toggle("hover", !lab && !!t.closest("a, button, summary"));
      });
      $$("[data-magnetic]").forEach((b) => {
        on(b, "pointermove", (e: PointerEvent) => {
          const r = b.getBoundingClientRect();
          b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px, ${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
        });
        on(b, "pointerleave", () => (b.style.transform = ""));
      });
    }

    // ---------- press & hold ----------
    const hold = $<HTMLButtonElement>("[data-hold]"), yes = $("#yes"), flood = $("[data-flood]"), msg = $("#yes-msg");
    const holdLabel = hold.querySelector("span") as HTMLElement;
    let hp = 0, holding = false, done = false;
    const resetHold = () => {
      done = false; hp = 0; yes.classList.remove("done"); flood.style.setProperty("--s", "0");
      holdLabel.innerHTML = "Press<br>&amp; hold"; msg.textContent = "Try it. This is the only button Creo needs from you.";
    };
    const startHold = (e?: Event) => { e?.preventDefault(); if (done) return resetHold(); holding = true; };
    on(hold, "pointerdown", startHold);
    on(window, "pointerup", () => (holding = false));
    on(hold, "pointerleave", () => (holding = false));
    on(hold, "keydown", (e: KeyboardEvent) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) startHold(e); });
    on(hold, "keyup", (e: KeyboardEvent) => { if (e.key === " " || e.key === "Enter") holding = false; });
    on(hold, "click", (e: MouseEvent) => e.preventDefault());
    let gsapRef: typeof import("gsap").gsap | null = null;
    const burst = () => {
      const r = hold.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      for (let i = 0; i < 36; i++) {
        const s = document.createElement("span");
        s.className = "c-glyph-burst";
        s.textContent = BURST_GLYPHS[i % BURST_GLYPHS.length];
        s.style.left = cx + "px"; s.style.top = cy + "px"; s.style.fontSize = 18 + Math.random() * 30 + "px";
        root.appendChild(s);
        const a = Math.random() * Math.PI * 2, d = 120 + Math.random() * 320;
        s.animate(
          [
            { transform: "translate(-50%,-50%) scale(.2)", opacity: 1 },
            { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) rotate(${(Math.random() - 0.5) * 360}deg) scale(1)`, opacity: 0 },
          ],
          { duration: 1400 + Math.random() * 600, easing: "cubic-bezier(.15,.8,.25,1)" },
        ).onfinish = () => s.remove();
      }
    };
    const completeHold = () => {
      done = true; holding = false; yes.classList.add("done");
      const scale = (Math.hypot(yes.clientWidth, yes.clientHeight) / 10) * 1.1;
      if (gsapRef) gsapRef.to(flood, { "--s": scale, duration: 1.1, ease: "expo.out" });
      else flood.style.setProperty("--s", String(scale));
      holdLabel.innerHTML = "Approved<br>✓";
      msg.textContent = "Approved. Your post goes live Saturday, 7:30 pm IST. Hold again to undo.";
      burst();
    };

    // ---------- the living letters ----------
    const canvas = $<HTMLCanvasElement>(".c-gl");
    const letters = $("#letters");
    const caps = $$(".c-cap");
    const rails = $$(".c-rail b");
    const mani = $("[data-manifesto]");
    const maniWords = $$(".w").filter((w) => mani.contains(w));

    type GLState = {
      render: (t: number, mixv: number, seg: number, after: number) => void;
      uScatter: { value: number };
      dispose: () => void;
    };
    let GL: GLState | null = null;

    async function initGL(): Promise<GLState | null> {
      const THREE = await import("three");
      if (dead) return null;
      let renderer: import("three").WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "high-performance" });
      } catch {
        return null;
      }
      const N = mobile ? 9000 : 20000;
      const PR = Math.min(devicePixelRatio || 1, 2);
      renderer.setPixelRatio(PR);
      renderer.setSize(innerWidth, innerHeight, false);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 100);
      camera.position.z = 10;
      const vis = () => { const h = 2 * Math.tan((35 / 2) * (Math.PI / 180)) * 10; return { h, w: h * camera.aspect }; };

      const WORDS: [string, string, string, number][] = [
        ["Creo.", "700", font("--font-display"), -0.07],
        ["नमस्ते", "800", font("--font-deva"), 0],
        ["வணக்கம்", "800", font("--font-tamil"), 0],
        ["নমস্কার", "800", font("--font-beng"), 0],
        ["ನಮಸ್ಕಾರ", "800", font("--font-knda"), 0],
      ];
      await Promise.race([
        Promise.all(WORDS.map(([txt, wt, fam]) => document.fonts.load(`${wt} 200px ${fam}`, txt))),
        new Promise((r) => setTimeout(r, 3500)),
      ]);
      if (dead) { renderer.dispose(); return null; }

      type Sample = { pts: number[]; minX: number; maxX: number; minY: number; maxY: number };
      const sampleWord = ([txt, wt, fam, track]: [string, string, string, number]): Sample => {
        const W = 1600, H = 640, c = document.createElement("canvas");
        c.width = W; c.height = H;
        const x = c.getContext("2d", { willReadFrequently: true })!;
        const ls = x as CanvasRenderingContext2D & { letterSpacing?: string };
        let size = 440;
        x.font = `${wt} ${size}px ${fam}`;
        if ("letterSpacing" in ls) ls.letterSpacing = track * size + "px";
        size = Math.min(440, (size * 1450) / x.measureText(txt).width);
        x.font = `${wt} ${size}px ${fam}`;
        if ("letterSpacing" in ls) ls.letterSpacing = track * size + "px";
        x.textAlign = "center"; x.textBaseline = "middle"; x.fillStyle = "#fff";
        x.fillText(txt, W / 2, H / 2);
        const d = x.getImageData(0, 0, W, H).data, pts: number[] = [];
        let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
        for (let y = 0; y < H; y += 2) for (let xx = 0; xx < W; xx += 2) {
          if (d[(y * W + xx) * 4 + 3] > 140) {
            pts.push(xx, y);
            if (xx < minX) minX = xx; if (xx > maxX) maxX = xx; if (y < minY) minY = y; if (y > maxY) maxY = y;
          }
        }
        return { pts, minX, maxX, minY, maxY };
      };
      const raw = WORDS.map(sampleWord);
      const rand = (a: number, b: number) => a + Math.random() * (b - a);
      const targets: Float32Array[] = [];
      const buildTargets = () => {
        targets.length = 0;
        const v = vis(), mob = innerWidth < 760;
        const tw = v.w * (mob ? 0.86 : 0.6), th = v.h * (mob ? 0.26 : 0.36), yOff = v.h * (mob ? 0.14 : 0.1);
        for (const s of raw) {
          const arr = new Float32Array(N * 3), n = s.pts.length / 2 || 1;
          const sc = Math.min(tw / (s.maxX - s.minX || 1), th / (s.maxY - s.minY || 1));
          const cx = (s.minX + s.maxX) / 2, cy = (s.minY + s.maxY) / 2;
          for (let i = 0; i < N; i++) {
            const j = ((Math.random() * n) | 0) * 2;
            arr[i * 3] = (s.pts[j] - cx) * sc + rand(-1, 1) * sc;
            arr[i * 3 + 1] = -(s.pts[j + 1] - cy) * sc + yOff + rand(-1, 1) * sc;
            arr[i * 3 + 2] = rand(-0.12, 0.12);
          }
          targets.push(arr);
        }
        // the poster: frame, photo disc, headline bars, offer pill, footer band
        const arr = new Float32Array(N * 3), h = v.h * (mob ? 0.5 : 0.6), w = h * 0.8, y0 = yOff * 0.6;
        for (let i = 0; i < N; i++) {
          const r = Math.random();
          let x: number, y: number;
          if (r < 0.3) {
            const t = Math.random() * 2 * (w + h);
            if (t < w) { x = -w / 2 + t; y = h / 2; }
            else if (t < w + h) { x = w / 2; y = h / 2 - (t - w); }
            else if (t < 2 * w + h) { x = w / 2 - (t - w - h); y = -h / 2; }
            else { x = -w / 2; y = -h / 2 + (t - 2 * w - h); }
          } else if (r < 0.55) {
            const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * w * 0.3;
            x = w * 0.18 + Math.cos(a) * rr; y = -h * 0.02 + Math.sin(a) * rr;
          } else if (r < 0.72) { x = rand(-w * 0.42, w * 0.22); y = h * 0.34 + rand(-h * 0.04, h * 0.04); }
          else if (r < 0.84) { x = rand(-w * 0.42, w * 0.02); y = h * 0.23 + rand(-h * 0.035, h * 0.035); }
          else if (r < 0.92) { x = rand(-w * 0.42, -w * 0.02); y = -h * 0.3 + rand(-h * 0.035, h * 0.035); }
          else { x = rand(-w / 2, w / 2); y = -h * 0.42 + rand(-h * 0.02, h * 0.02); }
          arr[i * 3] = x; arr[i * 3 + 1] = y + y0; arr[i * 3 + 2] = rand(-0.08, 0.08);
        }
        targets.push(arr);
      };
      buildTargets();

      const geo = new THREE.BufferGeometry();
      const posA = new Float32Array(targets[0]), posB = new Float32Array(targets[1]);
      const scat = new Float32Array(N * 3), rnd4 = new Float32Array(N * 4);
      for (let i = 0; i < N; i++) {
        scat[i * 3] = rand(-13, 13); scat[i * 3 + 1] = rand(-8, 8); scat[i * 3 + 2] = rand(-10, 3);
        for (let k = 0; k < 4; k++) rnd4[i * 4 + k] = Math.random();
      }
      geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(targets[0]), 3));
      geo.setAttribute("posA", new THREE.BufferAttribute(posA, 3));
      geo.setAttribute("posB", new THREE.BufferAttribute(posB, 3));
      geo.setAttribute("aScatter", new THREE.BufferAttribute(scat, 3));
      geo.setAttribute("aRand", new THREE.BufferAttribute(rnd4, 4));
      geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 50);

      const uniforms = {
        uMix: { value: 0 }, uTime: { value: 0 }, uScatter: { value: 1 }, uSize: { value: 2.9 }, uPR: { value: PR },
        uMouse: { value: new THREE.Vector2(99, 99) }, uMouseOn: { value: 0 },
        cA: { value: new THREE.Color("#ff9a1f") }, cB: { value: new THREE.Color("#ff2e63") },
        cC: { value: new THREE.Color("#7a5cff") }, cP: { value: new THREE.Color("#f3efe6") },
      };
      const mat = new THREE.ShaderMaterial({
        uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        vertexShader: /* glsl */ `
          uniform float uMix, uTime, uScatter, uSize, uPR, uMouseOn; uniform vec2 uMouse;
          uniform vec3 cA, cB, cC, cP;
          attribute vec3 posA; attribute vec3 posB; attribute vec3 aScatter; attribute vec4 aRand;
          varying vec3 vCol; varying float vA;
          void main(){
            float m = smoothstep(0., 1., clamp(uMix * 1.7 - aRand.x * .7, 0., 1.));
            vec3 p = mix(posA, posB, m);
            float sw = sin(m * 3.14159);
            vec3 dir = normalize(vec3(sin(aRand.y * 40. + uTime * .6), cos(aRand.z * 40. + uTime * .5), sin(aRand.w * 40. + 1.)) + 1e-4);
            p += dir * sw * (.5 + aRand.w * 1.6);
            p += .02 * vec3(sin(uTime * 1.3 + aRand.y * 30.), cos(uTime * 1.1 + aRand.z * 30.), 0.);
            vec2 d = p.xy - uMouse; float f = exp(-dot(d, d) * 2.4) * uMouseOn;
            p.xy += normalize(d + 1e-4) * f * .8; p.z += f * 1.4;
            vec3 sp = aScatter + .35 * vec3(sin(uTime * .2 + aRand.x * 20.), cos(uTime * .17 + aRand.y * 20.), 0.);
            p = mix(p, sp, uScatter);
            vec4 mv = modelViewMatrix * vec4(p, 1.);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = uSize * uPR * (.55 + aRand.z * .9) * (10. / -mv.z) * (1. + f * 1.6 + sw * .5);
            float g = clamp(p.x / 7. + .5, 0., 1.);
            vec3 foil = mix(mix(cA, cB, smoothstep(.1, .55, g)), cC, smoothstep(.5, .95, g));
            vCol = mix(cP, foil, clamp(step(.58, aRand.y) + f + sw * .6, 0., 1.));
            vA = (.75 + .25 * sin(uTime * 2. + aRand.w * 6.28)) * (1. - uScatter * .45);
          }`,
        fragmentShader: /* glsl */ `
          varying vec3 vCol; varying float vA;
          void main(){ float r = length(gl_PointCoord - .5); if (r > .5) discard; gl_FragColor = vec4(vCol, smoothstep(.5, .05, r) * vA); }`,
      });
      scene.add(new THREE.Points(geo, mat));

      let seg = -1;
      const setSeg = (s: number, force = false) => {
        if (s === seg && !force) return;
        seg = s;
        posA.set(targets[s]); posB.set(targets[s + 1]);
        geo.attributes.posA.needsUpdate = true; geo.attributes.posB.needsUpdate = true;
      };
      setSeg(0);

      let rt: ReturnType<typeof setTimeout>;
      const onResize = () => {
        renderer.setSize(innerWidth, innerHeight, false);
        camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
        clearTimeout(rt);
        rt = setTimeout(() => { buildTargets(); setSeg(Math.max(0, seg), true); }, 200);
      };
      on(window, "resize", onResize);

      let mouseOn = 0, smx = 99, smy = 99;
      return {
        uScatter: uniforms.uScatter,
        render(t, mixv, s, after) {
          setSeg(s);
          uniforms.uTime.value = t / 1000;
          uniforms.uMix.value = mixv;
          const v = vis();
          smx += ((mx / innerWidth - 0.5) * v.w - smx) * 0.12;
          smy += (-(my / innerHeight - 0.5) * v.h - smy) * 0.12;
          uniforms.uMouse.value.set(smx, smy);
          mouseOn += ((fine && after < 0.5 ? 1 : 0) - mouseOn) * 0.05;
          uniforms.uMouseOn.value = mouseOn;
          camera.position.x += ((mx / innerWidth - 0.5) * 0.5 - camera.position.x) * 0.04;
          camera.position.y += (-(my / innerHeight - 0.5) * 0.3 - camera.position.y) * 0.04;
          camera.lookAt(0, 0, 0);
          renderer.render(scene, camera);
        },
        dispose() { clearTimeout(rt); geo.dispose(); mat.dispose(); renderer.dispose(); },
      };
    }

    const K = 6;
    let smoothP = 0, introDone = false;
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      const lr = letters.getBoundingClientRect();
      const p = clamp(-lr.top / (lr.height - innerHeight));
      smoothP += (p - smoothP) * 0.09;
      const pos = smoothP * (K - 1);
      let s = Math.min(K - 2, Math.floor(pos)), f = pos - s;
      if (pos >= K - 1) { s = K - 2; f = 1; }
      const mixv = sstep(0.22, 0.82, f);
      const stageF = s + mixv;
      for (const c of caps) {
        const i = Number(c.dataset.stage);
        if (i === 0 && !introDone) continue;
        const o = clamp(1 - Math.abs(stageF - i) * 2.6);
        c.style.opacity = String(o);
        c.classList.toggle("live", o > 0.5);
      }
      rails.forEach((b, i) => b.style.setProperty("--p", String(clamp(stageF - i + 1))));

      const after = clamp((innerHeight - lr.bottom) / innerHeight);
      if (GL) {
        if (introDone) GL.uScatter.value = after * 0.92;
        canvas.style.opacity = String(1 - after * 0.55);
        GL.render(t, mixv, s, after);
      }
      const mr = mani.getBoundingClientRect();
      const lit = Math.floor(clamp((innerHeight * 0.85 - mr.top) / (mr.height + innerHeight * 0.2)) * maniWords.length * 1.05);
      maniWords.forEach((w, i) => (w.style.opacity = i < lit ? "1" : "0.14"));
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      dot.style.transform = `translate(${mx}px, ${my}px)`;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      if (!done) {
        hp = holding ? Math.min(1, hp + 1 / 95) : Math.max(0, hp - 0.03);
        hold.style.setProperty("--p", String(hp));
        if (hp >= 1) completeHold();
      }
      if (wallVisible) wallFrame();
    };

    // ---------- loader → intro ----------
    (async () => {
      const glyph = $(".ld-glyph"), count = $(".ld-count"), bar = $(".ld-bar");
      let gi = 0;
      const gt = setInterval(() => { gi = (gi + 1) % LOADER_GLYPHS.length; glyph.textContent = LOADER_GLYPHS[gi]; }, 150);
      cleanups.push(() => clearInterval(gt));
      const libs = Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
      const glReady = initGL().then((g) => { GL = g; if (g) root.classList.add("gl-ok"); }).catch(() => null);
      const t0 = performance.now();
      await new Promise<void>((res) => {
        const tick = () => {
          if (dead) return res();
          const k = clamp((performance.now() - t0) / 1900);
          count.textContent = String(Math.round(k * 100)).padStart(3, "0");
          bar.style.transform = `scaleX(${k})`;
          if (k < 1) requestAnimationFrame(tick); else res();
        };
        tick();
      });
      const [[{ gsap }, { ScrollTrigger }]] = await Promise.all([libs, glReady]);
      if (dead) return;
      clearInterval(gt);
      glyph.textContent = "C";
      gsap.registerPlugin(ScrollTrigger);
      gsapRef = gsap;
      raf = requestAnimationFrame(frame);

      const ctx = gsap.context(() => {
        const reel = $("[data-reel]"), reelBar = $("[data-reel-bar]");
        const dist = () => Math.max(0, reel.scrollWidth - innerWidth);
        const reelTween = gsap.to(reel, {
          x: () => -dist(), ease: "none",
          scrollTrigger: {
            trigger: "#team", pin: true, scrub: 1, start: "top top", end: () => "+=" + dist(), invalidateOnRefresh: true,
            onUpdate: (st) => (reelBar.style.transform = `scaleX(${st.progress})`),
          },
        });
        $$(".c-panel:not(.intro) .p-name").forEach((n) =>
          gsap.from(n, { yPercent: 40, opacity: 0, ease: "power3.out", scrollTrigger: { trigger: n.closest(".c-panel"), containerAnimation: reelTween, start: "left 80%", end: "left 40%", scrub: true } }),
        );
        gsap.from(".c-giant span", { yPercent: 100, stagger: 0.06, ease: "expo.out", duration: 1.4, scrollTrigger: { trigger: ".c-footer", start: "top 70%" } });
        $$(".c-how h2, .c-faq h2, .c-footer h2, .c-yes-h").forEach((h) =>
          gsap.from(h, { y: 60, opacity: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: h, start: "top 85%" } }),
        );
        $$(".c-steps li").forEach((li) => gsap.from(li, { y: 40, opacity: 0, duration: 1, ease: "expo.out", scrollTrigger: { trigger: li, start: "top 88%" } }));

        const lines = $$(".c-hero-h .c-line > span");
        const side = $$(".c-hero-side > *, .c-hero-kick, .c-scroll-cue");
        gsap.set(lines, { yPercent: 110 });
        gsap.set(side, { opacity: 0, y: 20 });
        root.classList.remove("is-loading");
        gsap.timeline({ onComplete: () => { introDone = true; } })
          .to(".c-loader", { clipPath: "inset(0 0 100% 0)", duration: 1.1, ease: "expo.inOut" })
          .add(() => { if (GL) gsap.to(GL.uScatter, { value: 0, duration: 2.6, ease: "expo.out" }); }, "-=.6")
          .to(lines, { yPercent: 0, stagger: 0.09, duration: 1.3, ease: "expo.out" }, "-=.2")
          .to(side, { opacity: 1, y: 0, stagger: 0.08, duration: 1, ease: "expo.out" }, "-=1")
          .set(".c-loader", { display: "none" });
        if (!GL) introDone = true;
      }, root);
      cleanups.push(() => ctx.revert());
      ScrollTrigger.refresh();
    })();

    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      cleanups.forEach((f) => f());
      GL?.dispose();
      root.classList.remove("gl-ok");
    };
  }, []);

  return (
    <div ref={host} style={{ display: "contents" }}>
      <div className="c-loader" aria-hidden="true">
        <div className="ld-glyph">क</div>
        <div className="ld-count">000</div>
        <div className="ld-cap c-mono">Creo.<br />Your marketing team</div>
        <div className="ld-bar" />
      </div>
      <canvas className="c-gl" aria-hidden="true" />
      <div className="c-vignette" aria-hidden="true" />
      <div className="c-grain" aria-hidden="true" />
      <div className="c-cursor" aria-hidden="true"><span className="c-dot" /><span className="c-ring"><em>Drag</em></span></div>
    </div>
  );
}
