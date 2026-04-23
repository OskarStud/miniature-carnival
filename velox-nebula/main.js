/**
 * Velox Nebula — несколько анимированных фонов, переключение по кнопке.
 */
(function () {
  const canvas = document.getElementById("bg-canvas");
  const btn = document.getElementById("bg-cycle");
  if (!canvas || !canvas.getContext || !btn) return;

  const ctx = canvas.getContext("2d");
  let W = 0;
  let H = 0;
  let dpr = 1;
  let mouse = { x: -9999, y: -9999 };

  const state = {
    modeIndex: 0,
    /** @type {unknown} */
    extra: null,
  };

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const mode = MODES[state.modeIndex];
    if (mode.onResize) mode.onResize();
  }

  function hexCorners(cx, cy, r) {
    const out = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      out.push(cx + r * Math.cos(a), cy + r * Math.sin(a));
    }
    return out;
  }

  /* ---------- 0. Туман — очень спокойные пастельные круги ---------- */
  function drawMist(t) {
    const s = t * 0.06;
    ctx.fillStyle = "#0d0e12";
    ctx.fillRect(0, 0, W, H);

    const spots = [
      { x: 0.35, y: 0.4, r: 0.55, hue: 220, sat: 35 },
      { x: 0.65, y: 0.55, r: 0.5, hue: 260, sat: 28 },
      { x: 0.5, y: 0.25, r: 0.4, hue: 200, sat: 25 },
    ];
    for (let i = 0; i < spots.length; i++) {
      const sp = spots[i];
      const ox = Math.sin(s * 0.7 + i) * W * 0.04;
      const oy = Math.cos(s * 0.55 + i * 1.1) * H * 0.03;
      const cx = W * sp.x + ox;
      const cy = H * sp.y + oy;
      const rad = Math.max(W, H) * sp.r;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      g.addColorStop(0, `hsla(${sp.hue}, ${sp.sat}%, 52%, 0.35)`);
      g.addColorStop(0.45, `hsla(${sp.hue + 15}, ${sp.sat}%, 40%, 0.12)`);
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
  }

  /* ---------- 1. Рассвет — медленный поворот мягкого градиента ---------- */
  function drawDawn(t) {
    const s = t * 0.04;
    const cx = W * 0.5 + Math.sin(s) * W * 0.08;
    const cy = H * 0.45 + Math.cos(s * 0.9) * H * 0.06;
    const angle = s * 0.15;
    const len = Math.hypot(W, H) * 0.8;
    const x0 = cx + Math.cos(angle) * len;
    const y0 = cy + Math.sin(angle) * len;
    const x1 = cx - Math.cos(angle) * len;
    const y1 = cy - Math.sin(angle) * len;
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    const shift = Math.sin(s * 0.3) * 0.08;
    g.addColorStop(0, `hsl(28, ${42 + shift * 20}%, ${18 + shift * 8}%)`);
    g.addColorStop(0.35, `hsl(340, ${28 + shift * 15}%, ${22}%)`);
    g.addColorStop(0.55, `hsl(220, ${35}%, ${16}%)`);
    g.addColorStop(1, `hsl(200, ${25}%, ${12}%)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const veil = ctx.createRadialGradient(cx, cy, 0, cx, cy, len * 0.6);
    veil.addColorStop(0, "rgba(255, 200, 160, 0.08)");
    veil.addColorStop(1, "transparent");
    ctx.fillStyle = veil;
    ctx.fillRect(0, 0, W, H);
  }

  /* ---------- 2. Облака — крупные мягкие «жидкие» пятна ---------- */
  function initBloom() {
    state.extra = {
      blobs: Array.from({ length: 6 }, (_, i) => ({
        nx: Math.random(),
        ny: Math.random(),
        phase: Math.random() * Math.PI * 2,
        speed: 0.08 + Math.random() * 0.06,
        r: 0.28 + Math.random() * 0.18,
        hue: 160 + Math.random() * 100,
      })),
    };
  }

  function drawBloom(t) {
    const s = t * 0.12;
    ctx.fillStyle = "#080a10";
    ctx.fillRect(0, 0, W, H);
    const { blobs } = state.extra;
    ctx.globalCompositeOperation = "screen";
    for (const b of blobs) {
      const cx =
        W * (0.5 + 0.42 * Math.sin(s * b.speed + b.phase)) * (0.5 + b.nx) +
        W * 0.25 * Math.sin(s * 0.11 + b.phase);
      const cy =
        H * (0.5 + 0.38 * Math.cos(s * b.speed * 0.9 + b.phase * 1.3)) * (0.5 + b.ny) +
        H * 0.2 * Math.cos(s * 0.09);
      const rad = Math.max(W, H) * b.r;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      g.addColorStop(0, `hsla(${b.hue}, 55%, 68%, 0.22)`);
      g.addColorStop(0.5, `hsla(${b.hue + 40}, 45%, 55%, 0.08)`);
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.globalCompositeOperation = "source-over";
  }

  /* ---------- 3. Сияние — волны цвета, средняя скорость ---------- */
  function drawAurora(t) {
    const s = t * 0.35;
    ctx.fillStyle = "#030508";
    ctx.fillRect(0, 0, W, H);
    const bands = Math.ceil(H / 6) + 2;
    for (let i = 0; i < bands; i++) {
      const y = i * 6;
      const wave = Math.sin(s * 1.2 + y * 0.012 + Math.sin(s * 0.4) * 2) * 0.5 + 0.5;
      const hue = 150 + wave * 80 + Math.sin(s * 0.5 + i * 0.08) * 20;
      const alpha = 0.06 + wave * 0.14;
      const g = ctx.createLinearGradient(0, y, W, y + 8);
      g.addColorStop(0, `hsla(${hue}, 70%, 45%, 0)`);
      g.addColorStop(0.35, `hsla(${hue + 30}, 65%, 50%, ${alpha})`);
      g.addColorStop(0.65, `hsla(${hue - 20}, 80%, 55%, ${alpha * 0.9})`);
      g.addColorStop(1, `hsla(${hue}, 60%, 40%, 0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, y, W, 8);
    }
    const mist = ctx.createRadialGradient(W * 0.5, H * 0.2, 0, W * 0.5, H * 0.35, H * 0.8);
    mist.addColorStop(0, "rgba(40, 120, 100, 0.15)");
    mist.addColorStop(1, "transparent");
    ctx.fillStyle = mist;
    ctx.fillRect(0, 0, W, H);
  }

  /* ---------- 4. Сетка — ровный ритм, умеренная пульсация ---------- */
  function drawGrid(t) {
    const s = t * 0.25;
    ctx.fillStyle = "#05060a";
    ctx.fillRect(0, 0, W, H);
    const step = 48;
    const pulse = 0.04 + 0.035 * Math.sin(s * 0.8);
    ctx.strokeStyle = `rgba(80, 200, 255, ${pulse})`;
    ctx.lineWidth = 1;
    const off = (s * 20) % step;
    ctx.beginPath();
    for (let x = -off; x < W + step; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
    }
    for (let y = off; y < H + step; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    ctx.stroke();

    const g = ctx.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.55);
    g.addColorStop(0, `rgba(30, 60, 120, ${0.12 + 0.06 * Math.sin(s)})`);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  /* ---------- 5. Киберсеть — гекс + узлы (интенсивнее) ---------- */
  const CYBER = {
    NODE_COUNT: 95,
    MAX_DIST: 148,
    SPEED: 0.36,
    HEX_SIZE: 26,
    HUES: [188, 198, 205, 24, 32, 265],
    nodes: /** @type {any[]} */ ([]),
  };

  class CyberNode {
    constructor() {
      this.reset(true);
    }
    reset(init) {
      this.x = Math.random() * W;
      this.y = init ? Math.random() * H : Math.random() < 0.5 ? -8 : H + 8;
      this.vx = (Math.random() - 0.5) * CYBER.SPEED;
      this.vy = (Math.random() - 0.5) * CYBER.SPEED;
      this.r = Math.random() * 1.5 + 0.5;
      this.pulse = Math.random() * Math.PI * 2;
      this.pulseSpeed = 0.018 + Math.random() * 0.02;
      this.hue = CYBER.HUES[(Math.random() * CYBER.HUES.length) | 0];
      this.isHot = Math.random() < 0.2;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.pulse += this.pulseSpeed;
      const mdx = this.x - mouse.x;
      const mdy = this.y - mouse.y;
      const md = Math.hypot(mdx, mdy);
      if (md < 125 && md > 0.001) {
        const force = ((125 - md) / 125) * 0.3;
        this.vx += (mdx / md) * force;
        this.vy += (mdy / md) * force;
      }
      const maxV = CYBER.SPEED * 3;
      const v = Math.hypot(this.vx, this.vy);
      if (v > maxV) {
        this.vx = (this.vx / v) * maxV;
        this.vy = (this.vy / v) * maxV;
      }
      this.vx *= 0.997;
      this.vy *= 0.997;
      if (this.x < -24 || this.x > W + 24 || this.y < -24 || this.y > H + 24) this.reset(false);
    }
    draw() {
      const a = 0.55 + 0.45 * Math.sin(this.pulse);
      const lum = this.isHot ? 68 : 72;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r * a, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${this.hue}, ${this.isHot ? 100 : 92}%, ${lum}%, ${a * 0.9})`;
      ctx.fill();
      const glowR = this.r * (this.isHot ? 7 : 5);
      const glow = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, glowR);
      glow.addColorStop(0, `hsla(${this.hue}, 100%, 65%, ${a * (this.isHot ? 0.32 : 0.16)})`);
      glow.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.arc(this.x, this.y, glowR, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();
    }
  }

  function initCyber() {
    CYBER.nodes = Array.from({ length: CYBER.NODE_COUNT }, () => new CyberNode());
  }

  function drawHexLatticeCyber(t) {
    const HEX_SIZE = CYBER.HEX_SIZE;
    const r = HEX_SIZE * 0.55;
    const wStep = HEX_SIZE * Math.sqrt(3);
    const hStep = HEX_SIZE * 1.5;
    const offsetY = (t * 16) % hStep;
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.85);
    ctx.save();
    ctx.translate(W * 0.5, H * 0.5);
    ctx.rotate(Math.sin(t * 0.11) * 0.018);
    ctx.translate(-W * 0.5, -H * 0.5);
    const cols = Math.ceil(W / wStep) + 2;
    const rows = Math.ceil(H / hStep) + 4;
    for (let row = -2; row < rows; row++) {
      const y = row * hStep - offsetY;
      const rowOffset = (row & 1) * (wStep * 0.5);
      for (let col = -1; col < cols; col++) {
        const x = col * wStep + rowOffset;
        const dist = Math.hypot(x - W * 0.45, y - H * 0.5);
        const vignette = Math.max(0, 1 - dist / (Math.max(W, H) * 0.65));
        const wave = Math.sin(t * 1.35 + col * 0.33 + row * 0.26) * 0.5 + 0.5;
        const al = (0.035 + 0.095 * wave * pulse) * vignette;
        const corners = hexCorners(x, y, r);
        ctx.beginPath();
        ctx.moveTo(corners[0], corners[1]);
        for (let k = 2; k < corners.length; k += 2) ctx.lineTo(corners[k], corners[k + 1]);
        ctx.closePath();
        ctx.strokeStyle = `rgba(0, ${(160 + wave * 60) | 0}, ${(200 + wave * 55) | 0}, ${al})`;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawCyberBase(t) {
    const cx = W * 0.5 + Math.sin(t * 0.32) * 36;
    const cy = H * 0.48 + Math.cos(t * 0.26) * 32;
    const g = ctx.createRadialGradient(cx, cy, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.85);
    g.addColorStop(0, "#0c1018");
    g.addColorStop(0.45, "#06080c");
    g.addColorStop(1, "#020304");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const g2 = ctx.createLinearGradient(0, 0, W, H);
    g2.addColorStop(0, `rgba(0, 80, 140, ${0.1 + 0.04 * Math.sin(t)})`);
    g2.addColorStop(0.5, "transparent");
    g2.addColorStop(1, `rgba(120, 40, 0, ${0.055 + 0.03 * Math.cos(t * 1.05)})`);
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, W, H);
  }

  function drawCyberSweep(t) {
    const phase = (t * 0.42) % (H + 200);
    const y = phase - 100;
    const grad = ctx.createLinearGradient(0, y - 36, 0, y + 110);
    grad.addColorStop(0, "transparent");
    grad.addColorStop(0.45, "rgba(0, 240, 255, 0.065)");
    grad.addColorStop(0.55, "rgba(255, 120, 40, 0.045)");
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  function drawCyberEdges() {
    const nodes = CYBER.nodes;
    const n = nodes.length;
    const MAX_DIST = CYBER.MAX_DIST;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist > MAX_DIST) continue;
        const alpha = (1 - dist / MAX_DIST) * 0.4;
        const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
        grad.addColorStop(0, `hsla(${a.hue}, 100%, 62%, ${alpha})`);
        grad.addColorStop(1, `hsla(${b.hue}, 100%, 62%, ${alpha})`);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = alpha * 1.05;
        ctx.stroke();
      }
    }
  }

  function drawCyber(t) {
    drawCyberBase(t);
    drawHexLatticeCyber(t * 0.06);
    drawCyberSweep(t);
    drawCyberEdges();
    for (const node of CYBER.nodes) {
      node.update();
      node.draw();
    }
  }

  /* ---------- 6. Гиперразгон — быстрые частицы и вспышки ---------- */
  function initHyper() {
    const count = 180;
    state.extra = {
      sparks: Array.from({ length: count }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.5) * 14,
        hue: Math.random() * 360,
        life: Math.random(),
      })),
      flash: 0,
    };
  }

  function drawHyper(t) {
    const s = t * 2.8;
    ctx.fillStyle = "rgba(2, 2, 6, 0.22)";
    ctx.fillRect(0, 0, W, H);

    const hueBase = (t * 120) % 360;
    const g = ctx.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.7);
    g.addColorStop(0, `hsla(${hueBase}, 80%, 12%, 0.35)`);
    g.addColorStop(0.5, `hsla(${(hueBase + 80) % 360}, 70%, 8%, 0.2)`);
    g.addColorStop(1, "#020208");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const { sparks } = state.extra;
    if (Math.random() < 0.04) state.extra.flash = 1;
    state.extra.flash *= 0.88;
    const flash = state.extra.flash;
    if (flash > 0.05) {
      ctx.fillStyle = `rgba(255, 255, 255, ${flash * 0.12})`;
      ctx.fillRect(0, 0, W, H);
    }

    for (const p of sparks) {
      p.x += p.vx;
      p.y += p.vy;
      p.hue = (p.hue + s * 0.15) % 360;
      p.life += 0.02;
      if (p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20 || p.life > 1) {
        p.x = Math.random() * W;
        p.y = Math.random() * H;
        p.vx = (Math.random() - 0.5) * 18;
        p.vy = (Math.random() - 0.5) * 18;
        p.life = 0;
      }
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 1.2, p.y - p.vy * 1.2);
      ctx.strokeStyle = `hsla(${p.hue}, 100%, 62%, 0.55)`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    const shards = 24;
    for (let i = 0; i < shards; i++) {
      const ang = (i / shards) * Math.PI * 2 + s * 3;
      const len = 40 + Math.sin(s * 4 + i) * 30;
      const x0 = W * 0.5 + Math.cos(ang) * 20;
      const y0 = H * 0.5 + Math.sin(ang) * 20;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 + Math.cos(ang) * len, y0 + Math.sin(ang) * len);
      ctx.strokeStyle = `hsla(${(hueBase + i * 14) % 360}, 90%, 55%, ${0.15 + 0.15 * Math.sin(s + i)})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  /* ---------- 7. Звёзды — параллакс, как космические хиро на Awwwards ---------- */
  function initStars() {
    const n = Math.min(320, Math.floor((W * H) / 9000) + 120);
    state.extra = {
      stars: Array.from({ length: n }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        z: Math.random(),
        tw: Math.random() * Math.PI * 2,
      })),
    };
  }

  function drawStars(t) {
    const s = t * 0.12;
    ctx.fillStyle = "#04060c";
    ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W * 0.35, H * 0.2, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.75);
    g.addColorStop(0, `hsla(230, 40%, 18%, 0.5)`);
    g.addColorStop(0.45, "hsla(250, 35%, 8%, 0.3)");
    g.addColorStop(1, "#020308");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const driftX = Math.sin(s * 0.4) * 8;
    const driftY = Math.cos(s * 0.35) * 6;
    for (const st of state.extra.stars) {
      st.tw += 0.04 + st.z * 0.06;
      const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(st.tw));
      const sz = 0.4 + st.z * 1.6;
      const a = (0.15 + st.z * 0.75) * twinkle;
      ctx.fillStyle = `rgba(230, 238, 255, ${a})`;
      ctx.fillRect(st.x + driftX * st.z, st.y + driftY * st.z, sz, sz);
      st.x += (0.15 + st.z * 0.55) * Math.sin(s * 0.2 + st.z * 10);
      st.y += (0.1 + st.z * 0.45) * 0.35;
      if (st.y > H + 2) {
        st.y = -2;
        st.x = Math.random() * W;
      }
      if (st.x < -2) st.x = W + 2;
      if (st.x > W + 2) st.x = -2;
    }
  }

  /* ---------- 8. Матрица — цифровой дождь (классика Codepen) ---------- */
  const MATRIX_CHARS =
    "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄ0123456789アイウエオ";

  function initMatrix() {
    const cell = Math.max(12, Math.min(18, (W / 80) | 0));
    const cols = Math.max(6, Math.ceil(W / cell) + 1);
    state.extra = {
      cell,
      drops: Array.from({ length: cols }, () => ({
        y: Math.random() * H,
        speed: 40 + Math.random() * 220,
        tail: 8 + ((Math.random() * 24) | 0),
      })),
    };
  }

  function drawMatrix(t) {
    ctx.fillStyle = "rgba(0, 3, 0, 0.14)";
    ctx.fillRect(0, 0, W, H);
    const { cell, drops } = state.extra;
    ctx.font = `${cell - 2}px ui-monospace, "Cascadia Code", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let i = 0; i < drops.length; i++) {
      const d = drops[i];
      const x = i * cell + cell * 0.5;
      d.y += d.speed * 0.018;
      if (d.y - d.tail * cell > H + 40) d.y = -Math.random() * H * 0.3;

      for (let k = 0; k < d.tail; k++) {
        const y = d.y - k * cell;
        if (y < -cell) continue;
        const head = k === 0;
        const fade = 1 - k / d.tail;
        const idx = (i * 17 + k * 3 + ((t * 14) | 0) + (head ? (t * 40) | 0 : 0)) % MATRIX_CHARS.length;
        const ch = MATRIX_CHARS[idx];
        if (head) {
          ctx.fillStyle = `rgba(220, 255, 230, 0.92)`;
          ctx.shadowColor = "rgba(0, 255, 100, 0.6)";
          ctx.shadowBlur = 8;
        } else {
          ctx.shadowBlur = 0;
          ctx.fillStyle = `rgba(0, 255, 80, ${0.08 + fade * 0.45})`;
        }
        ctx.fillText(ch, x, y);
      }
    }
    ctx.shadowBlur = 0;
  }

  /* ---------- 9. Поле — частицы по векторному полю (generative / Codepen) ---------- */
  function initFlow() {
    const count = Math.min(900, Math.floor((W * H) / 2500) + 400);
    state.extra = {
      parts: Array.from({ length: count }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        hue: 200 + Math.random() * 120,
      })),
    };
  }

  function drawFlow(t) {
    ctx.fillStyle = "rgba(6, 4, 12, 0.18)";
    ctx.fillRect(0, 0, W, H);
    const scale = 0.0028;
    const { parts } = state.extra;
    for (const p of parts) {
      const ang =
        Math.sin(p.x * scale + t * 0.7) * 2.2 +
        Math.cos(p.y * scale * 1.1 - t * 0.55) * 1.6 +
        Math.sin((p.x + p.y) * scale * 0.5 + t * 0.35);
      const sp = 1.6 + Math.sin(t * 0.8 + p.x * 0.01) * 0.4;
      p.x += Math.cos(ang) * sp;
      p.y += Math.sin(ang) * sp;
      if (p.x < 0) p.x += W;
      if (p.x > W) p.x -= W;
      if (p.y < 0) p.y += H;
      if (p.y > H) p.y -= H;
      ctx.fillStyle = `hsla(${p.hue + Math.sin(t + p.x * 0.01) * 30}, 70%, 62%, 0.35)`;
      ctx.fillRect(p.x, p.y, 1.2, 1.2);
    }
  }

  /* ---------- 10. Ретро — проволочный «рельеф» (vapor / demo scene) ---------- */
  function drawRetro(t) {
    const s = t * 0.9;
    ctx.fillStyle = "#07040f";
    ctx.fillRect(0, 0, W, H);
    const horizon = H * 0.42;
    const lines = 32;
    for (let i = 0; i < lines; i++) {
      const prog = i / (lines - 1);
      const y = horizon + prog * prog * (H - horizon + 20);
      const amp = (1 - prog) * 42;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= W; x += 12) {
        const h =
          Math.sin((x + s * 70) * 0.012 + prog * 5) * amp +
          Math.sin((x - s * 40) * 0.008 + i * 0.35) * amp * 0.35;
        ctx.lineTo(x, y + h);
      }
      ctx.strokeStyle = `hsla(275, 75%, ${38 + prog * 42}%, ${0.12 + prog * 0.38})`;
      ctx.lineWidth = 1 + prog;
      ctx.stroke();
    }
    const sweep = ctx.createLinearGradient(0, 0, W * 0.6, H);
    sweep.addColorStop(0, `rgba(255, 0, 180, ${0.04 + 0.03 * Math.sin(s)})`);
    sweep.addColorStop(1, "transparent");
    ctx.fillStyle = sweep;
    ctx.fillRect(0, 0, W, H);
  }

  /* ---------- 11. Полосы — жидкие волны-ленты (типичный award hero) ---------- */
  function drawLiquid(t) {
    const s = t * 0.45;
    ctx.fillStyle = "#08060e";
    ctx.fillRect(0, 0, W, H);
    const bands = 14;
    for (let b = 0; b < bands; b++) {
      const phase = b * 0.55 + s * 0.6;
      const hue = 230 + b * 8 + Math.sin(s * 0.3) * 15;
      ctx.beginPath();
      let firstY = 0;
      for (let x = 0; x <= W + 20; x += 14) {
        const base = (b / bands) * H * 1.05 + Math.sin(phase + x * 0.008) * 28;
        const yy = base + Math.sin(x * 0.02 + s * 1.4 + b) * 36;
        if (x === 0) {
          ctx.moveTo(x, yy);
          firstY = yy;
        } else ctx.lineTo(x, yy);
      }
      ctx.lineTo(W + 20, H + 50);
      ctx.lineTo(-20, H + 50);
      ctx.closePath();
      ctx.fillStyle = `hsla(${hue}, 45%, ${28 + (b / bands) * 22}%, 0.18)`;
      ctx.fill();
    }
  }

  /* ---------- 12. Глитч — срезы и RGB-сдвиг (editorial / Behance) ---------- */
  function drawGlitch(t) {
    const s = t * 1.2;
    ctx.fillStyle = "#060606";
    ctx.fillRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, `hsl(${260 + Math.sin(s) * 20}, 30%, 12%)`);
    g.addColorStop(0.5, `hsl(${200 + Math.cos(s * 0.8) * 30}, 25%, 8%)`);
    g.addColorStop(1, "#030303");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const slices = 10 + ((Math.sin(s * 3) * 6) | 0);
    for (let i = 0; i < slices; i++) {
      const y = (i / slices) * H;
      const h = 8 + ((Math.random() * 28) | 0);
      if (Math.random() < 0.65) continue;
      const shift = (Math.random() - 0.5) * 18;
      ctx.fillStyle = `rgba(255, 0, 80, ${0.03 + Math.random() * 0.06})`;
      ctx.fillRect(shift, y, W, h);
      ctx.fillStyle = `rgba(0, 200, 255, ${0.03 + Math.random() * 0.06})`;
      ctx.fillRect(-shift, y + 2, W, h * 0.6);
    }

    if (Math.random() < 0.07) {
      const gy = Math.random() * (H - 80);
      const gh = 30 + Math.random() * 120;
      const gx = Math.random() * (W * 0.3);
      const gw = W * 0.4 + Math.random() * W * 0.35;
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = "rgba(255, 0, 60, 0.12)";
      ctx.fillRect(gx + 6, gy, gw, gh);
      ctx.fillStyle = "rgba(0, 255, 255, 0.1)";
      ctx.fillRect(gx - 5, gy, gw, gh);
      ctx.restore();
    }

    ctx.strokeStyle = `rgba(255, 255, 255, ${0.03 + 0.02 * Math.sin(s * 10)})`;
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x + Math.sin(s + x * 0.02) * 12, 0);
      ctx.lineTo(x + Math.cos(s * 1.2 + x * 0.015) * 10, H);
      ctx.stroke();
    }
  }

  const MODES = [
    { label: "Туман", init: () => {}, draw: drawMist },
    { label: "Рассвет", init: () => {}, draw: drawDawn },
    { label: "Облака", init: initBloom, draw: drawBloom },
    { label: "Сияние", init: () => {}, draw: drawAurora },
    { label: "Сетка", init: () => {}, draw: drawGrid },
    {
      label: "Киберсеть",
      init: initCyber,
      draw: drawCyber,
      onResize: initCyber,
    },
    {
      label: "Гипер",
      init: initHyper,
      draw: drawHyper,
      onResize: initHyper,
    },
    { label: "Звёзды", init: initStars, draw: drawStars, onResize: initStars },
    { label: "Матрица", init: initMatrix, draw: drawMatrix, onResize: initMatrix },
    { label: "Поле", init: initFlow, draw: drawFlow, onResize: initFlow },
    { label: "Ретро", init: () => {}, draw: drawRetro },
    { label: "Полосы", init: () => {}, draw: drawLiquid },
    { label: "Глитч", init: () => {}, draw: drawGlitch },
  ];

  function applyMode() {
    const m = MODES[state.modeIndex];
    btn.textContent = m.label;
    state.extra = null;
    m.init();
  }

  function nextMode() {
    state.modeIndex = (state.modeIndex + 1) % MODES.length;
    applyMode();
    resize();
  }

  btn.addEventListener("click", nextMode);

  let t0 = performance.now();
  function loop(now) {
    const t = (now - t0) * 0.001;
    MODES[state.modeIndex].draw(t);
    requestAnimationFrame(loop);
  }

  window.addEventListener("resize", resize);
  window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });
  window.addEventListener("mouseleave", () => {
    mouse.x = -9999;
    mouse.y = -9999;
  });

  resize();
  applyMode();
  requestAnimationFrame(loop);
})();
