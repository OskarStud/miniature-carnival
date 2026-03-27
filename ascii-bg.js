(function () {
  const canvas = document.getElementById("ascii-canvas");
  const ctx = canvas.getContext("2d", { alpha: false });

  const SPEED = 0.5;

  const glyphs =
    "アイウエオカキクケコ0123456789█▓▒░⟨⟩⟨⟩::··''\"\"··××++--//\\\\||__..,,;;";

  const fontSize = 13;
  const lineHeight = fontSize * 1.05;
  let cols = 0;
  let rows = 0;
  let drops = [];
  let charPool = [];

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    cols = Math.ceil(w / fontSize) + 1;
    rows = Math.ceil(h / lineHeight) + 2;

    drops = new Float32Array(cols);
    for (let i = 0; i < cols; i++) {
      drops[i] = Math.random() * rows;
    }

    charPool = [];
    for (let y = 0; y < rows; y++) {
      const row = [];
      for (let x = 0; x < cols; x++) {
        row.push(glyphs[(Math.random() * glyphs.length) | 0]);
      }
      charPool.push(row);
    }
  }

  let t = 0;

  function tick() {
    t += 0.016 * SPEED;
    const w = window.innerWidth;
    const h = window.innerHeight;

    ctx.fillStyle = "#020403";
    ctx.fillRect(0, 0, w, h);

    ctx.font = `${fontSize}px "IBM Plex Mono", monospace`;
    ctx.textBaseline = "top";

    for (let x = 0; x < cols; x++) {
      drops[x] +=
        (0.35 + Math.sin(t * 0.7 + x * 0.08) * 0.12) * SPEED;
      if (drops[x] > rows + 2) {
        drops[x] = -Math.random() * rows * 0.5;
      }
    }

    for (let dy = 0; dy < rows; dy++) {
      for (let x = 0; x < cols; x++) {
        const headY = Math.floor(drops[x]);
        const dist = Math.abs(dy - headY);
        let alpha = 0.10;
        if (dist < 18) {
          alpha = 0.10 + (1 - dist / 18) * 0.55;
        }
        if (Math.random() < 0.035 * SPEED) {
          charPool[dy][x] = glyphs[(Math.random() * glyphs.length) | 0];
        }
        const ch = charPool[dy][x];
        const jitter = Math.sin(t * 1.3 + dy * 0.15 + x * 0.11) * 0.03;
        const g = Math.floor(105 + alpha * 95 + jitter * 32);
        const b = Math.floor(155 + alpha * 58);
        ctx.fillStyle = `rgba(35, ${g}, ${b}, ${0.09 + alpha * 0.52})`;
        ctx.fillText(ch, x * fontSize, dy * lineHeight);
      }
    }

    requestAnimationFrame(tick);
  }

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(tick);
})();
