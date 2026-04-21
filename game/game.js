'use strict';

/* ============================================================
   Командный тест · 2 игрока на одной клавиатуре
   -----------------------------------------------------------
   Левая половина клавиатуры — игрок 1, правая — игрок 2.
   У каждого свой поток случайных мини-заданий. Успех даёт
   +1 HP ПАРТНЁРУ. Провал — штраф партнёру. HP утекает со
   временем; игра кончается, когда у любого из двух HP = 0.
   ============================================================ */

/* ---------- Constants ---------- */
const MAX_HP = 8;
const START_HP = 5;
const DECAY_PER_SEC = 0.36;            // baseline HP drain per second
const TASK_TIMEOUT_BASE = 5.8;          // seconds per task at level 1
const TASK_TIMEOUT_MIN = 2.4;           // floor at higher levels
const LEVEL_EVERY_SEC = 20;             // level increments

const TASKS = ['stroop', 'arrow', 'sequence', 'odd'];
const TASK_LABEL = {
  stroop:   'ЦВЕТ · СЛОВО',
  arrow:    'СТРЕЛКА',
  sequence: 'ПОСЛЕДОВАТЕЛЬНОСТЬ',
  odd:      'ЛИШНИЙ',
};

const COLORS = [
  { key: 'red',    name: 'КРАСНЫЙ', hex: '#ff2e63' },
  { key: 'yellow', name: 'ЖЁЛТЫЙ',  hex: '#ffe400' },
  { key: 'blue',   name: 'СИНИЙ',   hex: '#00c8ff' },
  { key: 'green',  name: 'ЗЕЛЁНЫЙ', hex: '#32ff7e' },
];

const SHAPES = ['●', '■', '▲', '◆', '★', '⬣', '✚', '◉'];

/* Use e.code (physical keys) so Cyrillic/non-Latin layouts still work. */
const KEYS = {
  p1: {
    yes: 'KeyF',
    no:  'KeyD',
    arrows: { KeyW: 'up', KeyA: 'left', KeyS: 'down', KeyD: 'right' },
    letters: ['KeyQ','KeyW','KeyE','KeyR','KeyA','KeyS','KeyD','KeyF'],
    slots:   ['KeyQ','KeyW','KeyE','KeyR'],
  },
  p2: {
    yes: 'KeyJ',
    no:  'KeyK',
    arrows: { KeyI: 'up', KeyJ: 'left', KeyK: 'down', KeyL: 'right' },
    letters: ['KeyU','KeyI','KeyO','KeyP','KeyJ','KeyK','KeyL','Semicolon'],
    slots:   ['KeyU','KeyI','KeyO','KeyP'],
  },
};

const CODE_LABEL = {
  KeyQ:'Q', KeyW:'W', KeyE:'E', KeyR:'R',
  KeyA:'A', KeyS:'S', KeyD:'D', KeyF:'F',
  KeyU:'U', KeyI:'I', KeyO:'O', KeyP:'P',
  KeyJ:'J', KeyK:'K', KeyL:'L', Semicolon:';',
};

const ARROW_GLYPH = { up: '↑', down: '↓', left: '←', right: '→' };

/* ---------- State ---------- */
const state = {
  running: false,
  paused: false,
  startTime: 0,
  pauseStart: 0,
  lastTick: 0,
  rafId: 0,
  score: 0,
  level: 1,
  hp:   { p1: START_HP, p2: START_HP },
  task: { p1: null,     p2: null     },
};

/* ---------- Helpers ---------- */
const $ = (id) => document.getElementById(id);
const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];
const partnerOf = (p) => (p === 'p1' ? 'p2' : 'p1');

function taskTimeout() {
  return Math.max(TASK_TIMEOUT_MIN,
                  TASK_TIMEOUT_BASE - (state.level - 1) * 0.35);
}

/* ---------- Rendering ---------- */
function renderHp() {
  for (const p of ['p1', 'p2']) {
    const host = $('hp-' + p);
    if (!host) continue;
    host.innerHTML = '';
    const filled = Math.max(0, Math.ceil(state.hp[p]));
    for (let i = 0; i < MAX_HP; i++) {
      const d = document.createElement('div');
      d.className = 'dot' + (i < filled ? ' on' : '');
      host.appendChild(d);
    }
  }
}

function renderTaskLabels() {
  for (const p of ['p1', 'p2']) {
    const t = state.task[p];
    $('task-' + p).textContent = t ? TASK_LABEL[t.type] : '—';
  }
}

function pulseQuad(p, kind) {
  const el = $(p);
  if (!el) return;
  el.classList.remove('pulse-ok', 'pulse-fail');
  void el.offsetWidth;
  el.classList.add(kind === 'ok' ? 'pulse-ok' : 'pulse-fail');
}

/* ---------- Task lifecycle ---------- */
function startTaskForPlayer(p) {
  const type = rnd(TASKS);
  const now = performance.now();
  const limit = taskTimeout() * 1000;
  state.task[p] = { type, start: now, deadline: now + limit, payload: {} };
  renderTaskLabels();
  switch (type) {
    case 'stroop':   return renderStroop(p);
    case 'arrow':    return renderArrow(p);
    case 'sequence': return renderSequence(p);
    case 'odd':      return renderOdd(p);
  }
}

function finishTask(p, success) {
  if (!state.task[p]) return;
  state.task[p] = null;
  const other = partnerOf(p);
  if (success) {
    state.hp[other] = Math.min(MAX_HP, state.hp[other] + 1);
    state.score += 10;
    pulseQuad(other, 'ok');
  } else {
    state.hp[other] = Math.max(0, state.hp[other] - 0.6);
    state.score = Math.max(0, state.score - 4);
    pulseQuad(p, 'fail');
  }
  renderHp();
  $('score').textContent = Math.floor(state.score);
  renderTaskLabels();
  setTimeout(() => { if (state.running) startTaskForPlayer(p); }, 260);
}

/* ============================================================
   TASK: STROOP — does the circle colour match the word name?
   ============================================================ */
function renderStroop(p) {
  const word = rnd(COLORS);
  const ink  = rnd(COLORS);
  const fill = rnd(COLORS);
  const match = (word.key === fill.key);
  state.task[p].payload = { match };

  const y = CODE_LABEL[KEYS[p].yes];
  const n = CODE_LABEL[KEYS[p].no];
  const root = $('root-' + p);
  root.innerHTML = `
    <div class="stroop">
      <div class="stroop-word"
           style="color:${ink.hex};
                  text-shadow: 0 0 10px ${ink.hex}, 0 0 28px ${ink.hex};">
        ${word.name}
      </div>
      <div class="stroop-circle"
           style="background:${fill.hex};
                  box-shadow: 0 0 20px ${fill.hex}, 0 0 60px ${fill.hex};">
      </div>
      <div class="stroop-hint">
        <span><kbd>${y}</kbd> ДА</span>
        <span><kbd>${n}</kbd> НЕТ</span>
      </div>
    </div>`;
  $('prompt-' + p).textContent =
    'Совпадает ли ЦВЕТ круга с тем, что НАПИСАНО (не цвет букв)?';
}

function handleStroop(p, code) {
  const match = state.task[p].payload.match;
  if (code === KEYS[p].yes) finishTask(p, match === true);
  else if (code === KEYS[p].no) finishTask(p, match === false);
}

/* ============================================================
   TASK: ARROW — press the direction key matching the arrow.
   ============================================================ */
function renderArrow(p) {
  const dirs = ['up', 'down', 'left', 'right'];
  const want = rnd(dirs);
  state.task[p].payload = { want };
  const hint = Object.entries(KEYS[p].arrows)
    .map(([code, dir]) => `<span><kbd>${CODE_LABEL[code]}</kbd>${ARROW_GLYPH[dir]}</span>`)
    .join(' ');
  $('root-' + p).innerHTML = `
    <div class="arrow-task">
      <div class="arrow-big">${ARROW_GLYPH[want]}</div>
      <div class="arrow-hint">${hint}</div>
    </div>`;
  $('prompt-' + p).textContent = 'Нажми клавишу по направлению стрелки.';
}

function handleArrow(p, code) {
  const pressedDir = KEYS[p].arrows[code];
  if (!pressedDir) return;
  finishTask(p, pressedDir === state.task[p].payload.want);
}

/* ============================================================
   TASK: SEQUENCE — type shown keys in order.
   Wrong key resets progress; timeout = fail.
   ============================================================ */
function renderSequence(p) {
  const len = 3 + Math.min(2, Math.floor(state.level / 3)); // 3..5
  const seq = [];
  for (let i = 0; i < len; i++) seq.push(rnd(KEYS[p].letters));
  state.task[p].payload = { seq, idx: 0 };
  const cells = seq.map((code, i) =>
    `<div class="seq-key" data-i="${i}">${CODE_LABEL[code]}</div>`
  ).join('');
  $('root-' + p).innerHTML = `
    <div class="seq-task">
      <div class="seq-row">${cells}</div>
      <div class="seq-hint">Нажимай клавиши по порядку.</div>
    </div>`;
  $('prompt-' + p).textContent = 'Введи последовательность клавиш в указанном порядке.';
  updateSeqRow(p);
}

function updateSeqRow(p) {
  const t = state.task[p];
  if (!t) return;
  const cells = $('root-' + p).querySelectorAll('.seq-key');
  cells.forEach((el, i) => {
    el.classList.toggle('done',   i <  t.payload.idx);
    el.classList.toggle('active', i === t.payload.idx);
  });
}

function handleSequence(p, code) {
  const t = state.task[p];
  if (!t) return;
  const expected = t.payload.seq[t.payload.idx];
  if (code === expected) {
    t.payload.idx++;
    if (t.payload.idx >= t.payload.seq.length) {
      finishTask(p, true);
    } else {
      updateSeqRow(p);
    }
  } else {
    // wrong key: reset progress, shake the row
    t.payload.idx = 0;
    updateSeqRow(p);
    const row = $('root-' + p).querySelector('.seq-row');
    if (row) {
      row.classList.remove('shake');
      void row.offsetWidth;
      row.classList.add('shake');
    }
  }
}

/* ============================================================
   TASK: ODD ONE OUT — 4 glyphs, 3 same + 1 different.
   Press the slot key matching the odd one.
   ============================================================ */
function renderOdd(p) {
  const base = rnd(SHAPES);
  let odd;
  do { odd = rnd(SHAPES); } while (odd === base);
  const oddIdx = Math.floor(Math.random() * 4);
  const glyphs = [0,1,2,3].map(i => i === oddIdx ? odd : base);
  state.task[p].payload = { oddIdx };
  const slots = KEYS[p].slots;
  const cells = glyphs.map((g, i) => `
    <div class="odd-cell">
      <div class="glyph">${g}</div>
      <div class="klabel"><kbd>${CODE_LABEL[slots[i]]}</kbd></div>
    </div>
  `).join('');
  $('root-' + p).innerHTML = `<div class="odd-row">${cells}</div>`;
  $('prompt-' + p).textContent = 'Найди лишний символ и нажми соответствующую клавишу.';
}

function handleOdd(p, code) {
  const idx = KEYS[p].slots.indexOf(code);
  if (idx === -1) return;
  finishTask(p, idx === state.task[p].payload.oddIdx);
}

/* ============================================================
   Keyboard routing
   ============================================================ */
function routeInput(p, code) {
  const t = state.task[p];
  if (!t) return;
  switch (t.type) {
    case 'stroop':   return handleStroop(p, code);
    case 'arrow':    return handleArrow(p, code);
    case 'sequence': return handleSequence(p, code);
    case 'odd':      return handleOdd(p, code);
  }
}

document.addEventListener('keydown', (e) => {
  // Global keys regardless of state
  if (e.code === 'KeyR') { hardReset(); return; }
  if (e.code === 'Escape') { togglePause(); return; }

  if (!state.running || state.paused) return;

  if (KEYS.p1.letters.includes(e.code)) routeInput('p1', e.code);
  if (KEYS.p2.letters.includes(e.code)) routeInput('p2', e.code);
});

/* ============================================================
   Main loop
   ============================================================ */
function loop(ts) {
  if (!state.running) return;
  if (state.paused) {
    state.rafId = requestAnimationFrame(loop);
    return;
  }

  if (!state.lastTick) state.lastTick = ts;
  const dt = (ts - state.lastTick) / 1000;
  state.lastTick = ts;

  // Health decay (scaled by level)
  const decay = DECAY_PER_SEC * (1 + (state.level - 1) * 0.18);
  state.hp.p1 = Math.max(0, state.hp.p1 - decay * dt);
  state.hp.p2 = Math.max(0, state.hp.p2 - decay * dt);

  // Task timeouts + timer bars
  for (const p of ['p1', 'p2']) {
    const t = state.task[p];
    const bar = $('timer-' + p);
    if (t) {
      const total = t.deadline - t.start;
      const left = Math.max(0, t.deadline - ts);
      if (bar) bar.style.width = (left / total * 100) + '%';
      if (ts >= t.deadline) finishTask(p, false);
    } else if (bar) {
      bar.style.width = '0%';
    }
  }

  // Elapsed + level
  const elapsed = (ts - state.startTime) / 1000;
  $('time').textContent = elapsed.toFixed(1);
  const m = Math.floor(elapsed / 60);
  const s = Math.floor(elapsed % 60);
  $('bigtimer').textContent =
    String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  const newLevel = 1 + Math.floor(elapsed / LEVEL_EVERY_SEC);
  if (newLevel !== state.level) {
    state.level = newLevel;
    $('level').textContent = state.level;
  }

  renderHp();

  if (state.hp.p1 <= 0 || state.hp.p2 <= 0) return gameOver();

  state.rafId = requestAnimationFrame(loop);
}

/* ============================================================
   Lifecycle: start / pause / game over / reset
   ============================================================ */
function start() {
  state.running = true;
  state.paused = false;
  state.startTime = performance.now();
  state.lastTick = 0;
  state.score = 0;
  state.level = 1;
  state.hp   = { p1: START_HP, p2: START_HP };
  state.task = { p1: null, p2: null };
  $('score').textContent = 0;
  $('level').textContent = 1;
  $('overlay').classList.remove('show');
  $('pauseOverlay').classList.remove('show');
  renderHp();
  startTaskForPlayer('p1');
  startTaskForPlayer('p2');
  state.rafId = requestAnimationFrame(loop);
}

function gameOver() {
  state.running = false;
  cancelAnimationFrame(state.rafId);
  const loser = state.hp.p1 <= 0 ? 'ИГРОК 1' : 'ИГРОК 2';
  const time = parseFloat($('time').textContent);
  $('ovTitle').textContent = 'ИГРА ОКОНЧЕНА';
  $('ovText').innerHTML =
    `${loser} упал до нуля. Продержались <b>${time.toFixed(1)} с</b>, очков: <b>${Math.floor(state.score)}</b>.<br/>
     Попробуйте ещё — стабильный ритм успехов решает всё.`;
  $('startBtn').textContent = 'ИГРАТЬ ЗАНОВО';
  $('overlay').classList.add('show');
}

function hardReset() {
  cancelAnimationFrame(state.rafId);
  state.running = false;
  state.paused = false;
  $('pauseOverlay').classList.remove('show');
  $('ovTitle').textContent = 'КОМАНДНЫЙ ТЕСТ';
  $('ovText').innerHTML =
    'Кооперативная головоломка в духе теста Försvarsmakten. У каждого игрока — свой поток мини-заданий. ' +
    'Очки от каждого успеха уходят партнёру. Здоровье медленно утекает. Один из вас упал до 0 — игра окончена.';
  $('startBtn').textContent = 'НАЧАТЬ ИГРУ';
  $('overlay').classList.add('show');
}

function togglePause() {
  if (!state.running) return;
  if (!state.paused) {
    state.paused = true;
    state.pauseStart = performance.now();
    $('pauseOverlay').classList.add('show');
  } else {
    const duration = performance.now() - state.pauseStart;
    state.startTime += duration;
    state.lastTick = performance.now();
    for (const p of ['p1', 'p2']) {
      const t = state.task[p];
      if (t) { t.deadline += duration; t.start += duration; }
    }
    state.paused = false;
    $('pauseOverlay').classList.remove('show');
  }
}

/* ---------- Init ---------- */
$('startBtn').addEventListener('click', start);
renderHp();
