/* ================================================================
   LOW-END DEVICE DETECTION
   Targets truly underpowered hardware regardless of OS.
   High-end Android phones run full quality just like desktop.
================================================================ */
const isLowEndDevice = (function() {
  // CPU cores: low-end = 4 or fewer logical processors
  const lowCPU = (navigator.hardwareConcurrency || 4) <= 4;

  // RAM: low-end = 2GB or less (Chrome/Android exposes this)
  const lowRAM = (navigator.deviceMemory || 4) <= 2;

  // Screen pixel density: very high DPR on a small screen = mid-range chip
  // We only penalise if DPR > 2.5 AND the screen is small (budget phones)
  const smallHighDPR = window.devicePixelRatio > 2.5 && window.screen.width < 400;

  // Must hit at least TWO signals to be flagged as low-end
  const signals = [lowCPU, lowRAM, smallHighDPR].filter(Boolean).length;
  return signals >= 2;
})();

/* ================================================================
   GALAXY BACKGROUND
================================================================ */
(function() {
  const canvas = document.getElementById('galaxy-canvas');
  const ctx = canvas.getContext('2d');
  let W, H, dpr;
  const isLowPerf = isLowEndDevice;

  function resize() {
    // Cap DPR at 1.5 only for confirmed low-end devices
    dpr = isLowPerf ? Math.min(window.devicePixelRatio || 1, 1.5) : (window.devicePixelRatio || 1);
    W = canvas.offsetWidth; H = canvas.offsetHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildNebula(); buildStarField();
  }

  function resize() {
    // Cap DPR at 1.5 for Android performance
    dpr = isLowPerf ? Math.min(window.devicePixelRatio || 1, 1.5) : (window.devicePixelRatio || 1);
    W = canvas.offsetWidth; H = canvas.offsetHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildNebula(); buildStarField();
  }

  let nebulaCache = null;
  function buildNebula() {
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const c = off.getContext('2d');
    c.fillStyle = '#06040a'; c.fillRect(0, 0, W, H);
    // Gold/amber nebula tones
    const arm = c.createLinearGradient(0, H * 0.7, W, H * 0.1);
    arm.addColorStop(0, 'rgba(40,20,5,0)');
    arm.addColorStop(0.45, 'rgba(140,80,10,0.18)');
    arm.addColorStop(1, 'rgba(20,10,3,0)');
    c.fillStyle = arm; c.fillRect(0, 0, W, H);
    const nebulae = [
      { x: W*0.2, y: H*0.25, r: W*0.28, col: 'rgba(212,160,40,', a: 0.07 },
      { x: W*0.75, y: H*0.60, r: W*0.22, col: 'rgba(234,124,26,', a: 0.055 },
      { x: W*0.55, y: H*0.15, r: W*0.18, col: 'rgba(184,134,11,', a: 0.05 },
    ];
    nebulae.forEach(n => {
      const g = c.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      g.addColorStop(0, n.col + n.a + ')'); g.addColorStop(1, n.col + '0)');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
    });
    nebulaCache = off;
  }

  // Fewer stars on Android
  const STAR_COUNT = isLowPerf ? 280 : 520;
  const stars = [];

  class Star {
    constructor() { this.init(); }
    init() {
      this.x = Math.random() * W; this.y = Math.random() * H;
      const r = Math.random();
      if (r < 0.70) this.base = 0.4 + Math.random() * 0.4;
      else if (r < 0.90) this.base = 0.8 + Math.random() * 0.5;
      else this.base = 1.3 + Math.random() * 0.7;
      this.r = this.base;
      // Gold/warm star colors
      const t = Math.random();
      if (t < 0.20) this.hue = '255,220,140'; // warm gold
      else if (t < 0.60) this.hue = '255,245,210'; // warm white
      else this.hue = '255,200,100'; // amber
      this.baseAlpha = 0.35 + Math.random() * 0.55;
      this.alpha = this.baseAlpha;
      this.twinkleSpeed = 0.003 + Math.random() * 0.010;
      this.twinklePhase = Math.random() * Math.PI * 2;
      this.dx = (Math.random() - 0.5) * 0.016;
      this.dy = (Math.random() - 0.5) * 0.010;
    }
    update(t) {
      this.x += this.dx; this.y += this.dy;
      if (this.x < -2) this.x = W + 2;
      if (this.x > W+2) this.x = -2;
      if (this.y < -2) this.y = H + 2;
      if (this.y > H+2) this.y = -2;
      const tw = Math.sin(t * this.twinkleSpeed + this.twinklePhase);
      this.alpha = this.baseAlpha + tw * 0.22 * this.baseAlpha;
      this.r = this.base + tw * 0.12 * this.base;
    }
    draw(ctx) {
      // Skip glow pass on Android
      if (!isLowPerf && this.base > 0.9) {
        const grd = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r * 4);
        grd.addColorStop(0, `rgba(${this.hue},${this.alpha * 0.5})`);
        grd.addColorStop(1, `rgba(${this.hue},0)`);
        ctx.beginPath(); ctx.arc(this.x, this.y, this.r * 4, 0, Math.PI * 2);
        ctx.fillStyle = grd; ctx.fill();
      }
      ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.hue},${this.alpha})`; ctx.fill();
    }
  }

  function buildStarField() {
    stars.length = 0;
    for (let i = 0; i < STAR_COUNT; i++) stars.push(new Star());
  }

  const shooters = [];
  function spawnShooter() {
    shooters.push({
      x: Math.random() * W, y: 0,
      vx: 3 + Math.random() * 4, vy: 3 + Math.random() * 4,
      alpha: 1, fade: 0.015, trail: []
    });
  }

  let lastShooter = 0, raf, tick = 0;
  // Throttle on Android
  let frameSkip = isLowPerf ? 1 : 0;
  let frameCount = 0;

  function render(ts) {
    frameCount++;
    if (isLowPerf && frameCount % 2 !== 0) {
      raf = requestAnimationFrame(render);
      return;
    }
    tick++;
    ctx.clearRect(0, 0, W, H);
    if (nebulaCache) ctx.drawImage(nebulaCache, 0, 0, W, H);
    stars.forEach(s => { s.update(tick); s.draw(ctx); });

    // Fewer shooters on Android
    if (!isLowPerf && ts - lastShooter > 2800) { spawnShooter(); lastShooter = ts; }

    for (let i = shooters.length - 1; i >= 0; i--) {
      const s = shooters[i];
      s.trail.push({ x: s.x, y: s.y });
      if (s.trail.length > 18) s.trail.shift();
      s.x += s.vx; s.y += s.vy; s.alpha -= s.fade;
      if (s.alpha <= 0) { shooters.splice(i, 1); continue; }
      if (s.trail.length > 1) {
        const grad = ctx.createLinearGradient(s.trail[0].x, s.trail[0].y, s.x, s.y);
        grad.addColorStop(0, `rgba(255,200,80,0)`);
        grad.addColorStop(1, `rgba(255,220,120,${s.alpha * 0.9})`);
        ctx.beginPath(); ctx.moveTo(s.trail[0].x, s.trail[0].y);
        s.trail.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.strokeStyle = grad; ctx.lineWidth = 1.2; ctx.stroke();
      }
    }
    raf = requestAnimationFrame(render);
  }

  window.addEventListener('resize', () => { cancelAnimationFrame(raf); resize(); raf = requestAnimationFrame(render); });
  resize();
  raf = requestAnimationFrame(render);
})();

/* ================================================================
   3D SOLAR SYSTEM — Three.js (gold/amber palette)
================================================================ */
(function initSolarSystem() {
  const container = document.getElementById('solar-canvas');
  const tooltip = document.getElementById('planet-tooltip');
  if (!container || typeof THREE === 'undefined') return;

  const isLowPerf = isLowEndDevice;

  const scene = new THREE.Scene();
  const size = container.parentElement.offsetWidth || 480;
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
  camera.position.set(0, 38, 72);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({
    canvas: container,
    antialias: !isLowPerf,
    alpha: true,
    powerPreference: isLowPerf ? 'low-power' : 'high-performance'
  });
  renderer.setPixelRatio(isLowPerf ? Math.min(window.devicePixelRatio, 1.5) : Math.min(window.devicePixelRatio, 2));
  renderer.setSize(size, size);
  renderer.shadowMap.enabled = !isLowPerf;
  if (!isLowPerf) {
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
  }

  function onResize() {
    const s = container.parentElement.offsetWidth || 480;
    renderer.setSize(s, s);
  }
  window.addEventListener('resize', onResize);

  (function addStars() {
    const geo = new THREE.BufferGeometry();
    const n = isLowPerf ? 1000 : 2200;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 350 + Math.random() * 400;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i*3+2] = r * Math.cos(phi);
      // Warm gold/amber star tones
      const t = Math.random();
      if (t < 0.25) { col[i*3]=1.0; col[i*3+1]=0.88; col[i*3+2]=0.55; }
      else if (t < 0.60) { col[i*3]=1; col[i*3+1]=0.96; col[i*3+2]=0.85; }
      else { col[i*3]=1; col[i*3+1]=0.75; col[i*3+2]=0.3; }
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size: 0.55, vertexColors: true, transparent: true, opacity: 0.85 });
    scene.add(new THREE.Points(geo, mat));
  })();

  const sunLight = new THREE.PointLight(0xffe8a0, 3.5, 400, 1.4);
  if (!isLowPerf) {
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
  }
  scene.add(sunLight);
  scene.add(new THREE.AmbientLight(0x1a0e00, 0.7));
  const rimLight = new THREE.DirectionalLight(0xd4a028, 0.20);
  rimLight.position.set(-80, 40, -80);
  scene.add(rimLight);

  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  function noiseVal(x, y, scale, seed) {
    const ix = Math.floor(x * scale + seed);
    const iy = Math.floor(y * scale + seed * 0.7);
    const fract = (n) => n - Math.floor(n);
    const hash = (a, b) => {
      let v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
      return fract(v);
    };
    const fx = fract(x * scale + seed);
    const fy = fract(y * scale + seed * 0.7);
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);
    return (
      hash(ix, iy) * (1 - ux) * (1 - uy) +
      hash(ix+1, iy) * ux * (1 - uy) +
      hash(ix, iy+1) * (1 - ux) * uy +
      hash(ix+1, iy+1) * ux * uy
    );
  }

  function fbm(x, y, octaves, scale, seed) {
    let v = 0, amp = 0.5, freq = 1, max = 0;
    for (let i = 0; i < octaves; i++) {
      v += noiseVal(x, y, scale * freq, seed + i * 31.4) * amp;
      max += amp; amp *= 0.5; freq *= 2.1;
    }
    return v / max;
  }

  // Sun with deeper amber/orange tones
  function createSunTexture() {
    const W = 256, H = 128;
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(W, H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const nx = x / W, ny = y / H;
        const n = fbm(nx, ny, 6, 4, 0);
        const n2 = fbm(nx + n * 0.4, ny + n * 0.3, 4, 6, 77);
        const val = (n + n2 * 0.5) / 1.5;
        const r = Math.min(255, 220 + val * 35);
        const g = Math.min(255, 100 + val * 120);
        const b = Math.min(255, 0 + val * 15);
        const i = (y * W + x) * 4;
        img.data[i] = r; img.data[i+1] = g; img.data[i+2] = b; img.data[i+3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return new THREE.CanvasTexture(c);
  }

  const sunGeo = new THREE.SphereGeometry(5.2, isLowPerf ? 32 : 64, isLowPerf ? 32 : 64);
  const sunMat = new THREE.MeshStandardMaterial({
    map: createSunTexture(),
    emissive: new THREE.Color(0xff8800),
    emissiveIntensity: 2.0,
    roughness: 1, metalness: 0
  });
  const sun = new THREE.Mesh(sunGeo, sunMat);
  sun.castShadow = false;
  scene.add(sun);

  function createCoronaSprite() {
    const c = makeCanvas(128, 128);
    const ctx = c.getContext('2d');
    const grd = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,200,50,0.60)');
    grd.addColorStop(0.35, 'rgba(240,130,20,0.24)');
    grd.addColorStop(0.7, 'rgba(220,80,0,0.08)');
    grd.addColorStop(1, 'rgba(200,50,0,0)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }
  const coronaMat = new THREE.SpriteMaterial({ map: createCoronaSprite(), blending: THREE.AdditiveBlending, transparent: true, opacity: 0.9 });
  const corona = new THREE.Sprite(coronaMat);
  corona.scale.set(22, 22, 1);
  scene.add(corona);

  function createEarthTexture() {
    const W = 512, H = 256;
    const c = makeCanvas(W, H); const ctx = c.getContext('2d'); const img = ctx.createImageData(W, H);
    for (let y = 0; y < H; y++) { for (let x = 0; x < W; x++) {
      const nx = x / W, ny = y / H;
      const lat = (ny - 0.5) * Math.PI;
      const land = fbm(nx, ny, 7, 3.5, 5);
      const cloud = fbm(nx + 0.3, ny - 0.2, 5, 4, 99);
      const polar = Math.max(0, Math.abs(lat) - 1.2) * 4;
      let r, g, b;
      if (land > 0.52) {
        const l = (land - 0.52) * 5;
        r = Math.min(255, 30 + l * 120); g = Math.min(255, 80 + l * 90); b = Math.min(255, 20 + l * 40);
      } else {
        const d = land / 0.52;
        r = Math.min(255, 5 + d * 25); g = Math.min(255, 40 + d * 60); b = Math.min(255, 120 + d * 80);
      }
      if (cloud > 0.56) { const cf = Math.min(1, (cloud-0.56)*6); r=r+(255-r)*cf; g=g+(255-g)*cf; b=b+(255-b)*cf; }
      if (polar > 0) { const pf = Math.min(1, polar); r=r+(240-r)*pf; g=g+(248-g)*pf; b=b+(255-b)*pf; }
      const i = (y * W + x) * 4;
      img.data[i] = r; img.data[i+1] = g; img.data[i+2] = b; img.data[i+3] = 255;
    }} ctx.putImageData(img, 0, 0); return new THREE.CanvasTexture(c);
  }

  function createMarsTexture() {
    const W = 256, H = 128; const c = makeCanvas(W, H); const ctx = c.getContext('2d'); const img = ctx.createImageData(W, H);
    for (let y = 0; y < H; y++) { for (let x = 0; x < W; x++) {
      const nx = x / W, ny = y / H; const n = fbm(nx, ny, 6, 3, 11); const crater = fbm(nx * 2, ny * 2, 3, 8, 55);
      const lat = (ny - 0.5) * Math.PI; const polar = Math.max(0, Math.abs(lat) - 1.35) * 5;
      let r = Math.min(255, 160 + n * 70); let g = Math.min(255, 55 + n * 40); let b = Math.min(255, 25 + n * 20);
      if (crater < 0.35) { r -= 25; g -= 10; b -= 5; }
      if (polar > 0) { const pf = Math.min(1, polar); r=r+(220-r)*pf; g=g+(230-g)*pf; b=b+(240-b)*pf; }
      const i = (y * W + x) * 4; img.data[i] = Math.max(0,r); img.data[i+1] = Math.max(0,g); img.data[i+2] = Math.max(0,b); img.data[i+3] = 255;
    }} ctx.putImageData(img, 0, 0); return new THREE.CanvasTexture(c);
  }

  function createJupiterTexture() {
    const W = 512, H = 256; const c = makeCanvas(W, H); const ctx = c.getContext('2d'); const img = ctx.createImageData(W, H);
    for (let y = 0; y < H; y++) { for (let x = 0; x < W; x++) {
      const nx = x / W, ny = y / H; const band = Math.sin(ny * Math.PI * 14) * 0.5 + 0.5;
      const turb = fbm(nx, ny, 5, 5, 22); const spot = fbm(nx * 3 + 0.3, ny * 3 + 0.15, 4, 8, 33);
      const combined = band * 0.6 + turb * 0.35 + spot * 0.05;
      let r = Math.min(255, 180 + combined * 60); let g = Math.min(255, 120 + combined * 60); let b = Math.min(255, 70 + combined * 50);
      const grsX = Math.abs(nx - 0.55), grsY = Math.abs(ny - 0.52);
      if (grsX < 0.06 && grsY < 0.055) { const d = Math.sqrt(grsX*grsX/(0.06*0.06) + grsY*grsY/(0.055*0.055)); if (d < 1) { r = Math.min(255, r + (1-d)*80); g = Math.max(0, g - (1-d)*40); b = Math.max(0, b - (1-d)*20); } }
      const i = (y * W + x) * 4; img.data[i] = r; img.data[i+1] = g; img.data[i+2] = b; img.data[i+3] = 255;
    }} ctx.putImageData(img, 0, 0); return new THREE.CanvasTexture(c);
  }

  function createSaturnTexture() {
    const W = 256, H = 128; const c = makeCanvas(W, H); const ctx = c.getContext('2d'); const img = ctx.createImageData(W, H);
    for (let y = 0; y < H; y++) { for (let x = 0; x < W; x++) {
      const nx = x / W, ny = y / H; const band = Math.sin(ny * Math.PI * 10) * 0.5 + 0.5; const turb = fbm(nx, ny, 4, 4, 44);
      const v = band * 0.7 + turb * 0.3;
      const r = Math.min(255, 190 + v * 50); const g = Math.min(255, 160 + v * 40); const b = Math.min(255, 90 + v * 40);
      const i = (y * W + x) * 4; img.data[i] = r; img.data[i+1] = g; img.data[i+2] = b; img.data[i+3] = 255;
    }} ctx.putImageData(img, 0, 0); return new THREE.CanvasTexture(c);
  }

  function createVenusTexture() {
    const W = 256, H = 128; const c = makeCanvas(W, H); const ctx = c.getContext('2d'); const img = ctx.createImageData(W, H);
    for (let y = 0; y < H; y++) { for (let x = 0; x < W; x++) {
      const nx = x/W, ny = y/H; const n = fbm(nx, ny, 5, 3.5, 7); const n2 = fbm(nx+0.5, ny+0.5, 4, 6, 13); const v = n * 0.6 + n2 * 0.4;
      const r = Math.min(255, 200 + v * 40); const g = Math.min(255, 160 + v * 50); const b = Math.min(255, 60 + v * 40);
      const i = (y * W + x) * 4; img.data[i] = r; img.data[i+1] = g; img.data[i+2] = b; img.data[i+3] = 255;
    }} ctx.putImageData(img, 0, 0); return new THREE.CanvasTexture(c);
  }

  function createMercuryTexture() {
    const W = 256, H = 128; const c = makeCanvas(W, H); const ctx = c.getContext('2d'); const img = ctx.createImageData(W, H);
    for (let y = 0; y < H; y++) { for (let x = 0; x < W; x++) {
      const nx = x/W, ny = y/H; const n = fbm(nx, ny, 6, 5, 3); const v = n;
      const r = Math.min(255, 100 + v * 100); const g = Math.min(255, 95 + v * 95); const b = Math.min(255, 90 + v * 90);
      const i = (y * W + x) * 4; img.data[i] = r; img.data[i+1] = g; img.data[i+2] = b; img.data[i+3] = 255;
    }} ctx.putImageData(img, 0, 0); return new THREE.CanvasTexture(c);
  }

  function createUranusTexture() {
    const W = 256, H = 128; const c = makeCanvas(W, H); const ctx = c.getContext('2d'); const img = ctx.createImageData(W, H);
    for (let y = 0; y < H; y++) { for (let x = 0; x < W; x++) {
      const nx = x/W, ny = y/H; const n = fbm(nx, ny, 4, 2, 66);
      const r = Math.min(255, 100 + n * 50); const g = Math.min(255, 200 + n * 40); const b = Math.min(255, 210 + n * 35);
      const i = (y * W + x) * 4; img.data[i] = r; img.data[i+1] = g; img.data[i+2] = b; img.data[i+3] = 255;
    }} ctx.putImageData(img, 0, 0); return new THREE.CanvasTexture(c);
  }

  function createNeptuneTexture() {
    const W = 256, H = 128; const c = makeCanvas(W, H); const ctx = c.getContext('2d'); const img = ctx.createImageData(W, H);
    for (let y = 0; y < H; y++) { for (let x = 0; x < W; x++) {
      const nx = x/W, ny = y/H; const n = fbm(nx, ny, 5, 3.5, 88); const storm = fbm(nx*2+0.6, ny*2+0.4, 4, 6, 77); const v = n * 0.65 + storm * 0.35;
      const r = Math.min(255, 20 + v * 40); const g = Math.min(255, 60 + v * 60); const b = Math.min(255, 180 + v * 60);
      const i = (y * W + x) * 4; img.data[i] = r; img.data[i+1] = g; img.data[i+2] = b; img.data[i+3] = 255;
    }} ctx.putImageData(img, 0, 0); return new THREE.CanvasTexture(c);
  }

  function createRingTexture() {
    const c = makeCanvas(512, 1); const ctx = c.getContext('2d');
    const grd = ctx.createLinearGradient(0, 0, 512, 0);
    grd.addColorStop(0,    'rgba(200,160,80,0)'); grd.addColorStop(0.05, 'rgba(220,180,100,0.55)');
    grd.addColorStop(0.15, 'rgba(240,200,120,0.75)'); grd.addColorStop(0.25, 'rgba(220,185,110,0.50)');
    grd.addColorStop(0.35, 'rgba(235,195,115,0.70)'); grd.addColorStop(0.48, 'rgba(210,175,95,0.35)');
    grd.addColorStop(0.55, 'rgba(225,190,108,0.65)'); grd.addColorStop(0.65, 'rgba(215,180,102,0.55)');
    grd.addColorStop(0.75, 'rgba(200,165,88,0.40)'); grd.addColorStop(0.85, 'rgba(185,155,78,0.25)');
    grd.addColorStop(1,    'rgba(170,140,65,0)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, 512, 1);
    return new THREE.CanvasTexture(c);
  }

  const PLANET_DATA = [
    { name:'Mercury', radius:0.55, orbit:8.5,  speed:4.15,  tilt:0.03, tex: createMercuryTexture(), color:0xaaaaaa },
    { name:'Venus',   radius:0.9,  orbit:11.5, speed:1.62,  tilt:0.05, tex: createVenusTexture(),   color:0xe8c97e },
    { name:'Earth',   radius:1.0,  orbit:15,   speed:1.0,   tilt:0.41, tex: createEarthTexture(),   color:0x3a7abf },
    { name:'Mars',    radius:0.7,  orbit:19,   speed:0.53,  tilt:0.44, tex: createMarsTexture(),    color:0xc1440e },
    { name:'Jupiter', radius:2.8,  orbit:27,   speed:0.084, tilt:0.05, tex: createJupiterTexture(), color:0xc88b3a },
    { name:'Saturn',  radius:2.3,  orbit:36,   speed:0.034, tilt:0.47, tex: createSaturnTexture(),  color:0xe4d098, ring:true },
    { name:'Uranus',  radius:1.6,  orbit:44,   speed:0.012, tilt:1.71, tex: createUranusTexture(),  color:0x7de8e8 },
    { name:'Neptune', radius:1.5,  orbit:51,   speed:0.006, tilt:0.49, tex: createNeptuneTexture(), color:0x4b70dd },
  ];

  const planets = [];
  const sphereDetail = isLowPerf ? 24 : 48;

  PLANET_DATA.forEach((pd, idx) => {
    const orbitGeo = new THREE.RingGeometry(pd.orbit - 0.04, pd.orbit + 0.04, 120);
    const orbitMat = new THREE.MeshBasicMaterial({ color: 0x8a6020, side: THREE.DoubleSide, transparent: true, opacity: 0.16 });
    const orbitMesh = new THREE.Mesh(orbitGeo, orbitMat);
    orbitMesh.rotation.x = -Math.PI / 2;
    scene.add(orbitMesh);

    const geo = new THREE.SphereGeometry(pd.radius, sphereDetail, sphereDetail);
    const mat = new THREE.MeshStandardMaterial({ map: pd.tex, roughness: 0.75, metalness: 0.05 });
    const mesh = new THREE.Mesh(geo, mat);
    if (!isLowPerf) { mesh.castShadow = true; mesh.receiveShadow = true; }
    mesh.rotation.z = pd.tilt;

    const pivot = new THREE.Object3D();
    pivot.rotation.y = (idx / PLANET_DATA.length) * Math.PI * 2;
    pivot.add(mesh);
    mesh.position.set(pd.orbit, 0, 0);
    scene.add(pivot);

    let ringMesh = null;
    if (pd.ring) {
      const ringGeo = new THREE.RingGeometry(pd.radius * 1.38, pd.radius * 2.4, 96, 4);
      const pos = ringGeo.attributes.position;
      const uv  = ringGeo.attributes.uv;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i);
        const r = Math.sqrt(x*x + z*z);
        const rMin = pd.radius * 1.38, rMax = pd.radius * 2.4;
        uv.setXY(i, (r - rMin) / (rMax - rMin), 0.5);
      }
      const ringMat = new THREE.MeshStandardMaterial({ map: createRingTexture(), side: THREE.DoubleSide, transparent: true, opacity: 0.88, roughness: 1, metalness: 0 });
      ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2 - 0.47;
      mesh.add(ringMesh);
    }

    if (!isLowPerf) {
      const atmC = makeCanvas(64, 64); const atmCtx = atmC.getContext('2d');
      const grd = atmCtx.createRadialGradient(32, 32, pd.radius * 4, 32, 32, 32);
      const atmCol = ['rgba(200,200,200,','rgba(240,180,60,','rgba(60,140,220,','rgba(200,80,30,','rgba(220,170,80,','rgba(220,190,100,','rgba(100,220,220,','rgba(80,100,220,'][idx];
      grd.addColorStop(0, atmCol + '0.0)'); grd.addColorStop(0.5, atmCol + '0.08)'); grd.addColorStop(0.75, atmCol + '0.12)'); grd.addColorStop(1, atmCol + '0)');
      atmCtx.fillStyle = grd; atmCtx.fillRect(0, 0, 64, 64);
      const atmMat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(atmC), blending: THREE.AdditiveBlending, transparent: true, opacity: 0.65 });
      const atmSprite = new THREE.Sprite(atmMat);
      const atmScale = pd.radius * 4.5;
      atmSprite.scale.set(atmScale, atmScale, 1);
      mesh.add(atmSprite);
    }

    planets.push({ mesh, pivot, pd, angle: (idx / PLANET_DATA.length) * Math.PI * 2, ringMesh });
  });

  let isDragging = false;
  let prevMouse = { x: 0, y: 0 };
  let rotationX = 0.35, rotationY = 0;
  let autoRotate = true;
  const solarGroup = new THREE.Object3D();
  scene.add(solarGroup);
  scene.children.forEach(c => {
    if (c !== solarGroup && !(c instanceof THREE.Light)) {
      scene.remove(c); solarGroup.add(c);
    }
  });
  solarGroup.rotation.x = rotationX;

  const raycaster = new THREE.Raycaster();
  const mouse2D = new THREE.Vector2();

  container.addEventListener('mousedown', (e) => { isDragging = true; autoRotate = false; prevMouse = { x: e.clientX, y: e.clientY }; container.style.cursor = 'grabbing'; });
  window.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const dx = e.clientX - prevMouse.x; const dy = e.clientY - prevMouse.y;
      rotationY += dx * 0.008; rotationX += dy * 0.008;
      rotationX = Math.max(-Math.PI/2.2, Math.min(Math.PI/2.2, rotationX));
      solarGroup.rotation.y = rotationY; solarGroup.rotation.x = rotationX;
      prevMouse = { x: e.clientX, y: e.clientY };
    }
    const rect = container.getBoundingClientRect();
    mouse2D.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse2D.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse2D, camera);
    const meshes = planets.map(p => p.mesh);
    const intersects = raycaster.intersectObjects(meshes);
    if (intersects.length > 0) {
      const obj = intersects[0].object; const pl = planets.find(p => p.mesh === obj);
      if (pl) {
        tooltip.textContent = pl.pd.name; tooltip.classList.add('visible');
        const x = e.clientX - container.getBoundingClientRect().left;
        const y = e.clientY - container.getBoundingClientRect().top;
        tooltip.style.left = (x + 14) + 'px'; tooltip.style.top = (y - 28) + 'px';
        container.style.cursor = 'pointer';
      }
    } else { tooltip.classList.remove('visible'); if (!isDragging) container.style.cursor = 'grab'; }
  });
  window.addEventListener('mouseup', () => { isDragging = false; setTimeout(() => { autoRotate = true; }, 2500); container.style.cursor = 'grab'; });

  container.addEventListener('touchstart', (e) => { isDragging = true; autoRotate = false; prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }, { passive: true });
  container.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const dx = e.touches[0].clientX - prevMouse.x; const dy = e.touches[0].clientY - prevMouse.y;
    rotationY += dx * 0.008; rotationX += dy * 0.008;
    rotationX = Math.max(-Math.PI/2.2, Math.min(Math.PI/2.2, rotationX));
    solarGroup.rotation.y = rotationY; solarGroup.rotation.x = rotationX;
    prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  container.addEventListener('touchend', () => { isDragging = false; setTimeout(() => { autoRotate = true; }, 2500); });

  let clock = 0;
  const BASE_SPEED = 0.006;
  let frameCount = 0;

  function animate() {
    requestAnimationFrame(animate);
    // Skip every other frame on Android
    if (isLowPerf) { frameCount++; if (frameCount % 2 !== 0) return; }
    clock += BASE_SPEED;
    sun.rotation.y += 0.004;
    planets.forEach(p => {
      p.angle += p.pd.speed * BASE_SPEED * 0.22;
      p.mesh.position.x = Math.cos(p.angle) * p.pd.orbit;
      p.mesh.position.z = Math.sin(p.angle) * p.pd.orbit;
      p.mesh.rotation.y += 0.012;
      if (p.ringMesh) p.ringMesh.rotation.z += 0.0005;
    });
    if (autoRotate) { rotationY += 0.0018; solarGroup.rotation.y = rotationY; }
    const pulse = 1 + Math.sin(clock * 2.5) * 0.012;
    sun.scale.set(pulse, pulse, pulse);
    corona.scale.set(22 * pulse, 22 * pulse, 1);
    renderer.render(scene, camera);
  }
  animate();
})();

/* ================================================================
   NAV SCROLL
================================================================ */
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  if (window.scrollY > 50) {
    nav.style.background = 'rgba(6,4,10,0.65)';
    nav.style.backdropFilter = 'blur(50px) saturate(240%) brightness(0.70)';
    nav.style.webkitBackdropFilter = 'blur(50px) saturate(240%) brightness(0.70)';
    nav.style.boxShadow = '0 1px 0 rgba(255,210,80,0.03), 0 12px 48px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,200,60,0.03)';
  } else {
    nav.style.background = 'rgba(6,4,10,0.40)';
    nav.style.backdropFilter = 'blur(40px) saturate(200%) brightness(0.75)';
    nav.style.webkitBackdropFilter = 'blur(40px) saturate(200%) brightness(0.75)';
    nav.style.boxShadow = '0 1px 0 rgba(255,220,100,0.04), 0 8px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,210,80,0.04)';
  }
}, { passive: true });

/* ================================================================
   SCROLL REVEAL
================================================================ */
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

/* ================================================================
   MOBILE MENU
================================================================ */
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
let menuOpen = false;

hamburger.addEventListener('click', () => {
  menuOpen = !menuOpen;
  mobileMenu.classList.toggle('open', menuOpen);
  const spans = hamburger.querySelectorAll('span');
  if (menuOpen) {
    spans[0].style.transform = 'rotate(45deg) translate(4px, 4px)';
    spans[1].style.opacity = '0';
    spans[2].style.transform = 'rotate(-45deg) translate(4px, -4px)';
  } else {
    spans.forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
  }
});

function closeMobile() {
  menuOpen = false;
  mobileMenu.classList.remove('open');
  hamburger.querySelectorAll('span').forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
}

/* ================================================================
   SMOOTH SCROLL
================================================================ */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
});

/* ================================================================
   COUNTER ANIMATION
================================================================ */
function animateCounters() {
  document.querySelectorAll('.hero-stat-num').forEach(el => {
    const text = el.textContent.trim();
    const num = parseInt(text);
    if (!isNaN(num) && num > 0 && num < 10000) {
      let current = 0;
      const hasSuffix = text.includes('+');
      const step = num / 40;
      const timer = setInterval(() => {
        current = Math.min(current + step, num);
        el.textContent = Math.round(current) + (hasSuffix ? '+' : '');
        if (current >= num) clearInterval(timer);
      }, 30);
    }
  });
}
const heroObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => { if (entry.isIntersecting) { animateCounters(); heroObserver.disconnect(); } });
}, { threshold: 0.3 });
const heroStatsEl = document.querySelector('.hero-stats');
if (heroStatsEl) heroObserver.observe(heroStatsEl);

/* ================================================================
   PARALLAX HERO — disabled only on confirmed low-end devices
================================================================ */
const isMobile = window.innerWidth < 768;

if (!isLowEndDevice) {
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const scrolled = window.scrollY;
        const heroContent = document.querySelector('.hero-content');
        if (heroContent && scrolled < window.innerHeight) {
          const progress = scrolled / window.innerHeight;
          heroContent.style.transform = `translateY(${scrolled * 0.18}px)`;
          heroContent.style.opacity = Math.max(0, 1 - progress * 1.2);
        }
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}
