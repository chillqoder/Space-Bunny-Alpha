/* ============================================================
   SPACE BUNNIES: OPERATION SANDSTORM
   A fully procedural run-and-gun. No external assets.
   ============================================================ */
'use strict';

/* ---------------- canvas / scaling ---------------- */
const VW = 480, VH = 270;          // internal resolution (pixel-art space)
const TILE = 16;
const view = document.getElementById('game');
const vctx = view.getContext('2d', { alpha: false });
vctx.imageSmoothingEnabled = false;

let scale = 1, offX = 0, offY = 0;
function resize() {
  const ww = window.innerWidth, wh = window.innerHeight;
  const s = Math.min(ww / VW, wh / VH);
  // integer scale where possible for crunchy pixels, but allow half steps
  scale = s >= 1 ? Math.max(1, Math.floor(s * 2) / 2) : s;
  const w = Math.round(VW * scale), h = Math.round(VH * scale);
  view.width = w; view.height = h;
  view.style.width = w + 'px'; view.style.height = h + 'px';
  vctx.imageSmoothingEnabled = false;
  offX = 0; offY = 0;
  if (G.onResize) G.onResize();
}
window.addEventListener('resize', resize);

/* ---------------- math / utils ---------------- */
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const sign = v => v < 0 ? -1 : v > 0 ? 1 : 0;
const rnd = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const rndi = (a, b) => Math.floor(rnd(a, b + 1));
const pick = arr => arr[(Math.random() * arr.length) | 0];
const chance = p => Math.random() < p;
const TAU = Math.PI * 2;
function angLerp(a, b, t) {
  let d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI;
  return a + d * t;
}
function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function dist2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
function hash2(x, y) {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

/* ---------------- input ---------------- */
const Keys = Object.create(null);
const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  Space: 'jump', KeyZ: 'fire', KeyJ: 'fire',
  KeyX: 'grenade', KeyK: 'grenade',
  KeyC: 'knife', KeyL: 'knife',
  KeyV: 'special', ShiftLeft: 'special', ShiftRight: 'special',
  Enter: 'start', NumpadEnter: 'start',
  Escape: 'pause', KeyP: 'pause',
  KeyM: 'mute',
  KeyR: 'restart',
};
const keyboardHeld = new Set();
const padHeld = Object.create(null);
function setInput(k) {
  const value = [...keyboardHeld].some(code => KEYMAP[code] === k) || !!padHeld[k] ||
    Object.values(Touch.pointers).includes(k);
  if (value && !Keys[k]) pressed[k] = true;
  if (!value && Keys[k]) released[k] = true;
  Keys[k] = value;
}
const pressed = Object.create(null);   // edge
const released = Object.create(null);
const PAD = { axes: 0, buttons: [], prev: [], idx: -1 };

function keyName(e) {
  if (KEYMAP[e.code]) return KEYMAP[e.code];
  if (e.key === ' ') return 'jump';
  return null;
}
addEventListener('keydown', e => {
  const k = keyName(e);
  if (k) {
    keyboardHeld.add(e.code || (k === 'jump' ? 'Space' : e.key));
    setInput(k);
    e.preventDefault();
  }
  if (e.code === 'Space' || e.code.startsWith('Arrow') || e.code === 'Tab') e.preventDefault();
  Audio_.unlock();
});
addEventListener('keyup', e => {
  const k = keyName(e);
  if (k) { keyboardHeld.delete(e.code || (k === 'jump' ? 'Space' : e.key)); setInput(k); }
});
addEventListener('blur', () => {
  keyboardHeld.clear(); Touch.pointers = {};
  for (const k in padHeld) padHeld[k] = false;
  for (const b of Object.values(Touch.btns)) b.el.classList.remove('on');
  for (const k in Keys) Keys[k] = false;
  clearEdges();
});

// gamepad polling folded into input update
function updatePad() {
  const gps = navigator.getGamepads ? navigator.getGamepads() : [];
  const gp = [...gps].find(g => g && g.connected);
  const next = Object.create(null);
  if (gp) {
    const b = i => !!gp.buttons[i]?.pressed;
    const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
    next.left = ax < -0.35 || b(14); next.right = ax > 0.35 || b(15);
    next.up = ay < -0.35 || b(12); next.down = ay > 0.35 || b(13);
    next.jump = b(0); next.fire = b(2) || b(7);
    next.grenade = b(3); next.knife = b(1);
    next.special = b(4) || b(5) || b(6);
    next.start = b(9) || b(8); next.pause = b(9);
    PAD.idx = gp.index; PAD.axes = ax;
  } else PAD.idx = -1;
  for (const k of new Set([...Object.keys(padHeld), ...Object.keys(next)])) {
    padHeld[k] = !!next[k]; setInput(k);
  }
}
function down(k) { return !!Keys[k]; }
function hit(k) { return !!pressed[k]; }
function clearEdges() { for (const k in pressed) pressed[k] = false; for (const k in released) released[k] = false; }

/* ---------------- touch controls ---------------- */
const Touch = { active: false, btns: {}, pointers: {} };
function setupTouch() {
  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  if (!isTouch) return;
  const el = document.getElementById('touch');
  el.style.display = 'block';
  Touch.active = true;
  const layout = [
    { k: 'left', l: '◀', x: 12, y: 150, w: 62, h: 62 },
    { k: 'down', l: '▼', x: 80, y: 150, w: 62, h: 62 },
    { k: 'right', l: '▶', x: 148, y: 150, w: 62, h: 62 },
    { k: 'up', l: '▲', x: 80, y: 82, w: 62, h: 62 },
    { k: 'fire', l: 'FIRE', x: 268, y: 118, w: 86, h: 86 },
    { k: 'grenade', l: 'BOMB', x: 366, y: 150, w: 66, h: 54 },
    { k: 'jump', l: 'JUMP', x: 366, y: 40, w: 66, h: 54 },
    { k: 'knife', l: 'KNF', x: 268, y: 212, w: 86, h: 40 },
  ];
  for (const b of layout) {
    const d = document.createElement('div');
    d.className = 'tbtn'; d.textContent = b.l;
    d.style.left = b.x + 'px'; d.style.top = b.y + 'px';
    d.style.width = b.w + 'px'; d.style.height = b.h + 'px';
    el.appendChild(d);
    b.el = d; Touch.btns[b.k] = b;
  }
  // Keep controls inside the viewport in portrait and landscape.
  function layoutTouch() {
    const factor = Math.min(1, innerWidth / 480, innerHeight / 290);
    for (const b of Object.values(Touch.btns)) {
      b.el.style.left = (b.x / 480 * (innerWidth - 20) + 4) + 'px';
      b.el.style.top = (innerHeight - (270 - b.y) * factor - 12) + 'px';
      b.el.style.width = (b.w * factor) + 'px';
      b.el.style.height = (b.h * factor) + 'px';
    }
  }
  layoutTouch(); addEventListener('resize', layoutTouch);
  for (const [k, b] of Object.entries(Touch.btns)) {
    b.el.addEventListener('pointerdown', e => {
      e.preventDefault(); b.el.setPointerCapture(e.pointerId);
      Touch.pointers[e.pointerId] = k; setInput(k);
      b.el.classList.add('on'); Audio_.unlock();
    });
    const release = e => {
      delete Touch.pointers[e.pointerId]; setInput(k);
      b.el.classList.toggle('on', Object.values(Touch.pointers).includes(k));
    };
    b.el.addEventListener('pointerup', release);
    b.el.addEventListener('pointercancel', release);
    b.el.addEventListener('lostpointercapture', release);
  }
  view.addEventListener('pointerdown', () => { Audio_.unlock(); pressed.start = true; });

}

/* ---------------- global game state holder ---------------- */
const G = {
  scene: null, scenes: {}, time: 0, shake: 0, hitStop: 0,
  camX: 0, camY: 0, camShakeX: 0, camShakeY: 0,
  onResize: null,
  score: 0, lives: 3, credits: 0,
  muted: false,
  fps: 60, frames: 0, fpsTimer: 0,
};

/* ---------------- scene manager ---------------- */
const Scene = {
  set(name, arg) {
    if (G.scene && G.scene.exit) G.scene.exit();
    G.scene = G.scenes[name];
    G.scene.enter && G.scene.enter(arg);
  },
  update(dt) {
    updatePad();
    if (G.scene && G.scene.update) G.scene.update(dt);
    clearEdges();
  },
  draw() {
    vctx.save();
    vctx.setTransform(scale, 0, 0, scale, 0, 0);
    vctx.imageSmoothingEnabled = false;
    if (G.scene && G.scene.draw) G.scene.draw(vctx);
    vctx.restore();
  }
};

/* ---------------- main loop: fixed timestep ---------------- */
let last = 0, acc = 0;
const STEP = 1 / 60;
function frame(now) {
  requestAnimationFrame(frame);
  if (!last) last = now;
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.25) dt = 0.25;                    // guard against tab-switch spikes
  acc += dt;
  G.fpsTimer += dt; G.frames++;
  if (G.fpsTimer > 0.5) { G.fps = G.frames / G.fpsTimer; G.frames = 0; G.fpsTimer = 0; }
  let steps = 0;
  while (acc >= STEP && steps < 5) {
    acc -= STEP; steps++;
    G.time += STEP;
    Audio_.update();
    if (G.hitStop > 0) { G.hitStop -= STEP; }
    else Scene.update(STEP);
    // camera shake decay
    if (G.shake > 0) {
      G.shake = Math.max(0, G.shake - STEP * 42);
      G.camShakeX = rnd(-G.shake, G.shake);
      G.camShakeY = rnd(-G.shake, G.shake) * 0.6;
    } else { G.camShakeX = 0; G.camShakeY = 0; }
  }
  if (steps === 5) acc = 0;
  Scene.draw();
}
