// Hero 3D chip: glossy package with gold leads, glowing AI die, a circuit board whose
// traces carry light pulses, floating data particles, bloom, and mouse/scroll interaction.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const canvas = document.querySelector('[data-chip3d]');
const hero = document.querySelector('[data-hero]');

function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}

if (canvas && hero) {
  if (!webglOK()) hero.classList.add('no-webgl');
  else {
    const fontsReady = document.fonts ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 2000))]) : Promise.resolve();
    fontsReady.then(() => {
      try { init(); } catch (e) { console.warn('3D chip disabled:', e); hero.classList.add('no-webgl'); }
    });
  }
}

// Deterministic RNG so the board layout is identical on every visit.
function rng(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function cssVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

const PIN_COUNT = 12, PIN_PITCH = 0.3, BODY = 4.2, FOOT_END = 2.95;

// ---------- Procedural textures ----------
function traceTexture(worldSize) {
  const size = 2048;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, size, size);
  g.globalCompositeOperation = 'lighter';
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const u = size / worldSize, cx = size / 2, cy = size / 2;
  const R = rng(11);

  const toCanvas = (side, d, lat) => {
    const map = [[d, lat], [-d, -lat], [lat, d], [-lat, -d]][side];
    return [cx + map[0] * u, cy + map[1] * u];
  };
  const draw = (side, pts, intensity, width) => {
    g.strokeStyle = `rgb(${intensity},0,0)`;
    g.lineWidth = width * u;
    g.beginPath();
    pts.forEach(([d, l], i) => { const [x, y] = toCanvas(side, d, l); i ? g.lineTo(x, y) : g.moveTo(x, y); });
    g.stroke();
    const [ex, ey] = toCanvas(side, ...pts[pts.length - 1]);
    g.fillStyle = 'rgb(0,255,0)';
    g.beginPath(); g.arc(ex, ey, width * u * 1.9, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgb(0,0,0)';
    g.beginPath(); g.arc(ex, ey, width * u * .8, 0, Math.PI * 2); g.fill();
  };

  // Escape routing: each chip lead fans out into the board.
  for (let side = 0; side < 4; side++) {
    for (let k = 0; k < PIN_COUNT; k++) {
      const t = (k - (PIN_COUNT - 1) / 2) * PIN_PITCH;
      const s = Math.sign(t) || 1;
      let d = FOOT_END, lat = t;
      const pts = [[d, lat]];
      d += 0.35 + R() * 0.9; pts.push([d, lat]);
      const bend = s * (0.15 + Math.abs(t) * (0.5 + R() * 0.7));
      d += Math.abs(bend); lat += bend; pts.push([d, lat]);
      d += 1 + R() * 7; pts.push([d, lat]);
      if (R() < 0.65) {
        const b2 = (R() < 0.5 ? -1 : 1) * (0.4 + R() * 1.4);
        d += Math.abs(b2); lat += b2; pts.push([d, lat]);
        d += 1 + R() * 6; pts.push([d, lat]);
      }
      draw(side, pts, 255, 0.055);
    }
  }
  // Background routing across the rest of the board.
  for (let i = 0; i < 170; i++) {
    const side = Math.floor(R() * 4);
    let d = 5 + R() * 13, lat = (R() - 0.5) * worldSize * 0.9;
    const pts = [[d, lat]];
    const steps = 2 + Math.floor(R() * 3);
    for (let s = 0; s < steps; s++) {
      if (s % 2) { const b = (R() < 0.5 ? -1 : 1) * (0.5 + R() * 2); d += Math.abs(b); lat += b; }
      else d += 1 + R() * 4;
      pts.push([d, lat]);
    }
    draw(side, pts, 110 + Math.floor(R() * 60), 0.04);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function dieTextures(accent) {
  const size = 1024;
  const base = document.createElement('canvas');
  const glow = document.createElement('canvas');
  base.width = base.height = glow.width = glow.height = size;
  const b = base.getContext('2d'), e = glow.getContext('2d');
  b.fillStyle = '#060a14'; b.fillRect(0, 0, size, size);
  e.fillStyle = '#000'; e.fillRect(0, 0, size, size);
  const R = rng(5);
  const n = 8, pad = 60, cell = (size - pad * 2) / n;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const x = pad + i * cell + 6, y = pad + j * cell + 6, w = cell - 12;
      b.fillStyle = (i + j) % 3 === 0 ? '#101a2e' : '#0c1424';
      b.fillRect(x, y, w, w);
      b.strokeStyle = 'rgba(120,160,220,.25)';
      b.lineWidth = 2; b.strokeRect(x + 8, y + 8, w - 16, w - 16);
      // tensor-core micro pattern
      e.strokeStyle = `rgba(255,255,255,${0.25 + R() * 0.55})`;
      e.lineWidth = 2.5;
      e.strokeRect(x + 10, y + 10, w - 20, w - 20);
      for (let k = 0; k < 3; k++) {
        const yy = y + 22 + k * (w - 44) / 2;
        e.beginPath(); e.moveTo(x + 18, yy); e.lineTo(x + w - 18, yy); e.stroke();
      }
      if (R() < 0.35) { e.fillStyle = 'rgba(255,255,255,.95)'; e.fillRect(x + w / 2 - 8, y + w / 2 - 8, 16, 16); }
    }
  }
  // Bus lines between cores
  e.strokeStyle = 'rgba(255,255,255,.6)'; e.lineWidth = 3;
  for (let i = 1; i < n; i++) {
    const p = pad + i * cell;
    e.beginPath(); e.moveTo(p, pad - 30); e.lineTo(p, size - pad + 30); e.stroke();
    e.beginPath(); e.moveTo(pad - 30, p); e.lineTo(size - pad + 30, p); e.stroke();
  }
  e.strokeStyle = '#fff'; e.lineWidth = 6; e.strokeRect(24, 24, size - 48, size - 48);
  const t1 = new THREE.CanvasTexture(base); t1.colorSpace = THREE.SRGBColorSpace; t1.anisotropy = 8;
  const t2 = new THREE.CanvasTexture(glow); t2.colorSpace = THREE.SRGBColorSpace; t2.anisotropy = 8;
  return [t1, t2];
}

function labelTexture(brand, label) {
  const size = 1024;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.clearRect(0, 0, size, size);
  g.fillStyle = 'rgba(150,160,180,.8)';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '600 64px "Space Grotesk", sans-serif';
  g.fillText(String(brand).toUpperCase(), size / 2, 110);
  g.font = '700 84px "Space Grotesk", sans-serif';
  g.fillText(String(label).toUpperCase(), size / 2, size - 130);
  g.font = '500 30px "JetBrains Mono", monospace';
  g.fillStyle = 'rgba(150,160,180,.55)';
  g.fillText('AI ACCELERATOR  ·  NPU  ·  2.5D', size / 2, size - 62);
  // pin-1 marker
  g.beginPath(); g.arc(90, 90, 24, 0, Math.PI * 2);
  g.strokeStyle = 'rgba(150,160,180,.6)'; g.lineWidth = 5; g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function radialTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(255,255,255,.45)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------- Scene ----------
function init() {
  const accentHex = cssVar('--accent', '#22d3ee');
  const accent2Hex = cssVar('--accent-2', '#8b5cf6');
  const accent = new THREE.Color(accentHex);
  const accent2 = new THREE.Color(accent2Hex);
  const isSmall = () => window.innerWidth < 900;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  let dpr = Math.min(window.devicePixelRatio || 1, isSmall() ? 1.5 : 1.75);
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#04060b');
  scene.fog = new THREE.Fog('#04060b', 16, 34);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const camBase = new THREE.Vector3(0, 7.2, 10.5);
  camera.position.copy(camBase);
  const lookAt = new THREE.Vector3(0, 0.3, 0);

  // Lights
  scene.add(new THREE.AmbientLight(0x8899bb, 0.25));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(-4, 8, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(accent, 1.1);
  rim.position.set(5, 3, -6);
  scene.add(rim);
  const under = new THREE.PointLight(accent, 5, 7, 1.8);
  under.position.set(0, 0.4, 0);
  scene.add(under);
  const violet = new THREE.PointLight(accent2, 3.5, 12, 1.8);
  violet.position.set(-4.5, 2.5, 1);
  scene.add(violet);

  // Board with shader-driven light pulses
  const WORLD = 44;
  const boardUniforms = {
    uTrace: { value: traceTexture(WORLD) },
    uTime: { value: 0 },
    uPower: { value: 0 },
    uA: { value: accent.clone() },
    uB: { value: accent2.clone() }
  };
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD, WORLD),
    new THREE.ShaderMaterial({
      uniforms: boardUniforms,
      vertexShader: /* glsl */`
        varying vec2 vUv; varying vec3 vW;
        void main() {
          vUv = uv;
          vec4 w = modelMatrix * vec4(position, 1.0);
          vW = w.xyz;
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: /* glsl */`
        uniform sampler2D uTrace; uniform float uTime; uniform float uPower; uniform vec3 uA; uniform vec3 uB;
        varying vec2 vUv; varying vec3 vW;
        void main() {
          vec4 tx = texture2D(uTrace, vUv);
          float trace = tx.r; float via = tx.g;
          float d = length(vW.xz);
          float fall = 1.0 - smoothstep(3.5, 19.0, d);
          float w1 = fract(d * 0.075 - uTime * 0.18);
          float band1 = smoothstep(0.0, 0.012, w1) * (1.0 - smoothstep(0.012, 0.2, w1));
          float w2 = fract(d * 0.12 - uTime * 0.29 + 0.37);
          float band2 = smoothstep(0.0, 0.01, w2) * (1.0 - smoothstep(0.01, 0.1, w2));
          float pulse = (band1 + band2 * 0.55) * uPower;
          vec3 hot = mix(uA, uB, smoothstep(2.0, 14.0, d));
          vec3 col = vec3(0.0016, 0.0024, 0.0045);
          col += hot * 0.05 * trace * fall * (0.4 + 0.6 * uPower);
          col += hot * trace * pulse * 3.2 * fall;
          col += uA * via * (0.08 + pulse * 1.6) * fall;
          float dots = smoothstep(0.06, 0.0, length(fract(vW.xz * 1.25) - 0.5)) * 0.035 * fall;
          col += vec3(0.4, 0.5, 0.7) * dots;
          gl_FragColor = vec4(col, 1.0);
        }`
    })
  );
  board.rotation.x = -Math.PI / 2;
  scene.add(board);

  // Glow halo under the chip
  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(11, 11),
    new THREE.MeshBasicMaterial({ map: radialTexture(), color: accent, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.015;
  scene.add(halo);

  // ---------- Chip ----------
  const chip = new THREE.Group();
  scene.add(chip);

  const bodyMat = new THREE.MeshPhysicalMaterial({ color: 0x0a0c12, roughness: 0.38, metalness: 0.25, clearcoat: 1, clearcoatRoughness: 0.22 });
  const body = new THREE.Mesh(new RoundedBoxGeometry(BODY, 0.42, BODY, 4, 0.12), bodyMat);
  body.position.y = 0.51;
  chip.add(body);

  const top = 0.72;
  const gold = new THREE.MeshStandardMaterial({ color: 0xc99a45, metalness: 1, roughness: 0.34 });
  const dieFrame = new THREE.Mesh(new RoundedBoxGeometry(2.3, 0.03, 2.3, 2, 0.04), gold);
  dieFrame.position.y = top + 0.012;
  chip.add(dieFrame);

  const [dieMap, dieGlow] = dieTextures(accentHex);
  const dieMat = new THREE.MeshStandardMaterial({ map: dieMap, emissiveMap: dieGlow, emissive: accent, emissiveIntensity: 1.4, roughness: 0.28, metalness: 0.6 });
  const die = new THREE.Mesh(new THREE.BoxGeometry(2.06, 0.05, 2.06), dieMat);
  die.position.y = top + 0.04;
  chip.add(die);

  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(BODY - 0.25, BODY - 0.25),
    new THREE.MeshStandardMaterial({ map: labelTexture(canvas.dataset.brand || 'SFA', canvas.dataset.label || 'SFA-X1'), transparent: true, roughness: 0.55, metalness: 0.1 })
  );
  label.rotation.x = -Math.PI / 2;
  label.position.y = top + 0.003;
  chip.add(label);

  // Gold gull-wing leads (3 segments each) as instanced meshes
  const W = 0.14, T = 0.045;
  const segA = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, T, W), gold, PIN_COUNT * 4);
  const segB = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, T, W), gold, PIN_COUNT * 4);
  const segC = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, T, W), gold, PIN_COUNT * 4);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1);
  const up = new THREE.Vector3(0, 1, 0), fwd = new THREE.Vector3(0, 0, 1);
  const slope = Math.atan2(0.36, 0.2);
  let idx = 0;
  for (let side = 0; side < 4; side++) {
    const qs = new THREE.Quaternion().setFromAxisAngle(up, -side * Math.PI / 2);
    for (let k = 0; k < PIN_COUNT; k++) {
      const t = (k - (PIN_COUNT - 1) / 2) * PIN_PITCH;
      p.set(BODY / 2 + 0.16, 0.42, t).applyQuaternion(qs);
      segA.setMatrixAt(idx, m.compose(p, qs, sc));
      const qb = qs.clone().multiply(new THREE.Quaternion().setFromAxisAngle(fwd, -slope));
      p.set(BODY / 2 + 0.42, 0.24, t).applyQuaternion(qs);
      segB.setMatrixAt(idx, m.compose(p, qb, sc));
      p.set(BODY / 2 + 0.67, 0.045, t).applyQuaternion(qs);
      segC.setMatrixAt(idx, m.compose(p, qs, sc));
      idx++;
    }
  }
  chip.add(segA, segB, segC);

  // ---------- Particles ----------
  const COUNT = isSmall() ? 260 : 520;
  const pos = new Float32Array(COUNT * 3);
  const speed = new Float32Array(COUNT);
  const PR = rng(3);
  for (let i = 0; i < COUNT; i++) {
    const r = 1.5 + PR() * 11, a = PR() * Math.PI * 2;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = PR() * 6;
    pos[i * 3 + 2] = Math.sin(a) * r;
    speed[i] = 0.15 + PR() * 0.5;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({
    size: 0.06, map: radialTexture(), color: accent, transparent: true, opacity: 0.9,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
  }));
  scene.add(particles);

  // ---------- Post-processing ----------
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.75, 0.5, 0.82);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // ---------- Layout ----------
  let W0 = 0, H0 = 0;
  function resize() {
    const w = hero.clientWidth, h = hero.clientHeight;
    if (w === W0 && h === H0) return;
    W0 = w; H0 = h;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.setSize(w, h);
    camera.aspect = w / h;
    // Shift the projection so the chip sits on the right on wide screens.
    const shift = w >= 1100 ? -0.24 : w >= 900 ? -0.16 : 0;
    camera.setViewOffset(w, h, shift * w, isSmall() ? -0.06 * h : 0, w, h);
    camBase.set(0, isSmall() ? 10 : 8.6, isSmall() ? 15 : 13.2);
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // ---------- Interaction ----------
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (e) => {
    mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  // Intro: chip drops in and the board powers up once the preloader is gone.
  let introStart = null;
  const startIntro = () => { if (introStart === null) introStart = performance.now(); };
  if (window.sfaIntroDone) startIntro();
  window.addEventListener('sfa:intro', startIntro);
  setTimeout(startIntro, 6000);

  const ease = (t) => 1 - Math.pow(1 - t, 4);
  let visible = true, running = false;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) loop(); }, { threshold: 0 }).observe(hero);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loop(); });

  const timer = new THREE.Timer();
  timer.connect?.(document);
  let frames = 0, slowFrames = 0, degraded = false;

  function frame() {
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.05);
    const t = timer.getElapsed();
    const intro = introStart === null ? 0 : Math.min((performance.now() - introStart) / 2200, 1);
    const ei = ease(intro);
    const scroll = Math.min(Math.max(window.sfaHero?.progress || 0, 0), 1);

    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;

    boardUniforms.uTime.value = t;
    boardUniforms.uPower.value = Math.max(0, (intro - 0.35) / 0.65);
    halo.material.opacity = 0.5 * ei * (0.85 + Math.sin(t * 2) * 0.15);
    dieMat.emissiveIntensity = (0.6 + ei * 0.9) * (0.85 + Math.sin(t * 2.4) * 0.15);
    under.intensity = 5 * ei;

    // Chip motion: drop-in, idle float, mouse tilt, scroll lift & spin
    chip.position.y = (1 - ei) * 4 + Math.sin(t * 1.1) * 0.06 + scroll * 1.6;
    chip.rotation.y = (1 - ei) * -1.6 + Math.sin(t * 0.35) * 0.18 + mouse.x * 0.35 + scroll * 1.4;
    chip.rotation.x = mouse.y * 0.12 + scroll * 0.5;
    chip.rotation.z = -mouse.x * 0.05;

    camera.position.set(
      camBase.x + mouse.x * 0.6,
      camBase.y - mouse.y * 0.35 - scroll * 2.5,
      camBase.z - scroll * 3
    );
    camera.lookAt(lookAt);

    // Particles drift upward and respawn at the board.
    const arr = pGeo.attributes.position.array;
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3 + 1] += speed[i] * dt;
      if (arr[i * 3 + 1] > 6) arr[i * 3 + 1] = 0;
    }
    pGeo.attributes.position.needsUpdate = true;
    particles.rotation.y = t * 0.03;
    particles.material.opacity = 0.9 * ei;

    composer.render();

    // Adaptive quality: drop resolution if the device struggles.
    if (!degraded && ++frames > 30) {
      if (dt > 0.034) slowFrames++;
      if (frames > 150) {
        if (slowFrames > 60) {
          degraded = true;
          dpr = 1;
          renderer.setPixelRatio(dpr);
          composer.setPixelRatio?.(dpr);
          W0 = 0; resize();
        }
        frames = -1e9;
      }
    }
  }

  function loop() {
    if (running) return;
    running = true;
    timer.update();
    const tick = () => {
      if (!visible || document.hidden) { running = false; return; }
      frame();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  canvas.classList.add('is-live');
  loop();
}
