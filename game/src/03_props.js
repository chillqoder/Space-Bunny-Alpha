/* ============================================================
   03 - PROPS, TILES, VEHICLES, BOSS ART, EFFECTS
   ============================================================ */

/* ---------- pose library ---------- */
function P(o) {
  return Object.assign({
    lean: 0, bob: 0, headTilt: 0, crouch: 0, face: 1,
    armF: [1.05, -0.5], armB: [1.3, -0.7], legF: [-0.15, 0.12], legB: [0.2, 0.14],
    gun: 'pistol', aim: 0,
  }, o || {});
}
function aimPose(aim, o) {
  const sh = Math.PI / 2 - aim;
  return P(Object.assign({ armF: [sh + 0.5, -0.5], armB: [sh + 0.95, -0.95], aim }, o || {}));
}
const POSES = {
  idle: (t, g) => {
    const s = Math.sin(t), c = Math.cos(t * 0.63);
    return aimPose(0, {
      bob: s * 0.4 + (Math.sin(t * 0.21) > 0.97 ? -1.2 : 0),
      headTilt: c * 0.16,
      armF: [1.02 + s * 0.05, -0.5 + s * 0.05],
      armB: [1.28 - s * 0.05, -0.7],
      legF: [-0.12 + s * 0.03, 0.12], legB: [0.18 - s * 0.03, 0.14], gun: g,
    });
  },
  run: (t, g) => {
    const s = Math.sin(t), s2 = Math.sin(t + Math.PI);
    return P({
      bob: -Math.abs(Math.sin(t * 1)) * 1.3,
      lean: 0.6 + Math.abs(s) * 0.3,
      headTilt: 0.1,
      armF: [1.0 - s * 0.9, -0.6], armB: [1.0 - s2 * 0.9, -0.6],
      legF: [s * 0.95, 0.12 + Math.max(0, -s) * 0.85],
      legB: [s2 * 0.95, 0.12 + Math.max(0, -s2) * 0.85],
      gun: g, aim: -0.08,
    });
  },
  jump: (t, g) => P({
    bob: -1, lean: 0.4, headTilt: -0.1,
    armF: [0.55, -0.5], armB: [0.9, -0.6], legF: [-0.75, 0.95], legB: [0.5, 0.5], gun: g, aim: -0.5,
  }),
  fall: (t, g) => P({
    bob: 0.5, lean: -0.2, headTilt: 0.15,
    armF: [0.75, -0.35], armB: [1.15, -0.5], legF: [-0.45, 0.35], legB: [0.62, 0.55], gun: g, aim: 0.35,
  }),
  crouch: (t, g) => aimPose(0.12, {
    crouch: 1, bob: Math.sin(t) * 0.25, gun: g,
    armF: [1.35, -0.5], armB: [1.5, -0.6], legF: [-1.05, 1.2], legB: [-0.75, 1.35],
  }),
  crouchwalk: (t, g) => {
    const s = Math.sin(t);
    return aimPose(0.12, {
      crouch: 1, bob: -Math.abs(s) * 0.7, lean: 0.5, gun: g,
      armF: [1.35 - s * 0.5, -0.5], armB: [1.5 - s * 0.5, -0.5],
      legF: [s * 0.75 - 0.4, 1.0 + Math.max(0, -s) * 0.5],
      legB: [-s * 0.75 - 0.4, 1.0 + Math.max(0, s) * 0.5],
    });
  },
  knife: (t, g) => { // t 0..1
    const k = Math.sin(t * Math.PI);
    return aimPose(0, {
      bob: -k * 1.2, lean: 1.2 * k, headTilt: 0.1,
      armF: [0.35 - k * 2.4, 0.1], armB: [1.1, -0.4],
      legF: [-0.2 - k * 0.5, 0.3], legB: [0.3 + k * 0.5, 0.4], gun: 'none', aim: -0.5 - k * 0.9,
    });
  },
  throw: (t, g) => { // t 0..1
    const k = t < 0.5 ? t * 2 : (1 - t) * 2;
    return aimPose(-0.9, {
      bob: -k * 0.6, armF: [0.15 + k * 0.5, -0.3], armB: [1.2, -0.5], gun: 'none', aim: -1.2 + k * 0.5,
    });
  },
  hurt: (t, g) => P({
    bob: -0.6, lean: -1.6, headTilt: -0.5,
    armF: [0.35, -0.9], armB: [0.15, -0.9], legF: [-0.5, 0.5], legB: [0.55, 0.45], gun: 'none',
  }),
  panic: (t, g) => { // flailing arms up
    const s = Math.sin(t * 6);
    return P({
      bob: Math.abs(Math.sin(t * 6)) * 1.2, headTilt: s * 0.3, lean: s * 0.4,
      armF: [-0.5 + s * 0.9, -1.0], armB: [-0.7 - s * 0.9, -1.0],
      legF: [-0.4 + s * 0.5, 0.6], legB: [0.5 - s * 0.5, 0.6], gun: 'none', headDown: 1,
    });
  },
  victory: (t, g) => P({
    bob: Math.abs(Math.sin(t * 3)) * 1.5, headTilt: -0.15, lean: 0.2,
    armF: [-1.1 + Math.sin(t * 3) * 0.3, -0.4], armB: [0.9, -0.4],
    legF: [-0.2, 0.15], legB: [0.25, 0.2], gun: 'none',
  }),
  salute: (t, g) => P({
    bob: Math.abs(Math.sin(t * 4)) * 0.8, headTilt: 0.1,
    armF: [-1.2, -0.2], armB: [0.6, -0.4], legF: [-0.15, 0.15], legB: [0.2, 0.15], gun: 'none',
  }),
  dead: (t, g) => { // 0..1 collapse
    const k = t;
    return P({
      bob: 2 + k * 6, lean: -k * 3, headTilt: -k * 0.8, crouch: k * 0.4,
      armF: [0.4 - k * 1.2, -0.6 - k * 0.8], armB: [0.6 - k * 1.4, -0.6 - k * 0.8],
      legF: [-0.3 - k * 0.4, 0.4 + k], legB: [0.4 + k * 0.5, 0.4 + k], gun: 'none',
    });
  },
  swim: (t, g) => P({ bob: Math.sin(t) * 0.5, armF: [0.2, -0.4], armB: [0.5, -0.4], legF: [-0.3, 0.3], legB: [0.3, 0.3], gun: g }),
};
/* animation definitions: name -> [poseFn, frameCount, framesPerSecond, loop] */
const ANIMS = {
  idle: ['idle', 4, 7, true],
  run: ['run', 8, 14, true],
  jump: ['jump', 1, 1, false],
  fall: ['fall', 1, 1, false],
  crouch: ['crouch', 1, 1, false],
  crouchwalk: ['crouchwalk', 4, 10, true],
  knife: ['knife', 3, 16, false],
  throw: ['throw', 3, 12, false],
  hurt: ['hurt', 1, 1, false],
  panic: ['panic', 4, 10, true],
  victory: ['victory', 4, 8, true],
  salute: ['salute', 4, 8, true],
  dead: ['dead', 4, 6, false],
};

const _frameCache = new Map();
function fighterFrame(palKey, state, fi, gun, opt) {
  opt = opt || {};
  const a = ANIMS[state] || ANIMS.idle;
  const n = a[1];
  fi = ((fi % n) + n) % n;
  const key = 'F|' + palKey + '|' + state + '|' + fi + '|' + (gun || '') + '|' + (opt.rot || 0) + '|' + (opt.sq || 0) + '|' + (opt.hideGun ? 1 : 0) + '|' + (opt.accessory || '') + '|' + (opt.aim === undefined ? '' : opt.aim);
  let c = _frameCache.get(key);
  if (c) return c;
  const pal = PAL[palKey] || PAL.hero;
  const t = ['knife', 'throw', 'dead'].includes(state) ? fi / Math.max(1, n - 1) : fi / n * TAU;
  let pose = POSES[a[0]](t, gun);
  if (opt.aim !== undefined && gun !== 'none') {
    pose.aim = opt.aim;
    const arm = Math.PI / 2 - opt.aim;
    pose.armF = [arm - 0.45, 0.45]; pose.armB = [arm - 0.65, 0.65];
  }
  if (opt.accessory === 'bandage') pose = Object.assign({}, pose, { bandage: 1 });
  const w = 72, h = 64;
  c = bakeTo(makeCanvas(w, h), (g) => {
    g.save();
    g.translate(w / 2, h - 4);
    if (opt.rot) g.rotate(opt.rot);
    if (opt.sq) g.scale(1, 1 - opt.sq);
    g.translate(-AW / 2, -30);
    drawFighter(g, pal, pose, { hideGun: opt.hideGun, belt: palKey === 'hero' });
    g.restore();
  });
  _frameCache.set(key, c);
  return c;
}
const _whiteCache = new Map();
function whiten(spr) {
  let c = _whiteCache.get(spr);
  if (c) return c;
  c = bakeTo(makeCanvas(spr.width, spr.height), (g) => {
    g.drawImage(spr, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = '#fff8f0';
    g.fillRect(0, 0, c0(spr), spr.height);
  });
  _whiteCache.set(spr, c);
  return c;
  function c0(s) { return s.width; }
}
function drawSpr(c, spr, x, y, face, flash, alpha) {
  if (!spr) return;
  c.save();
  if (alpha !== undefined) c.globalAlpha = alpha;
  const w = spr.width, h = spr.height;
  if (face < 0) { c.translate(Math.round(x), Math.round(y)); c.scale(-1, 1); c.drawImage(spr, -Math.round(w / 2), -Math.round(h - 4), w, h); }
  else { c.drawImage(spr, Math.round(x - w / 2), Math.round(y - h + 4), w, h); }
  c.restore();
  if (flash) {
    c.save();
    c.globalAlpha = (alpha === undefined ? 1 : alpha) * (flash === true ? 1 : flash);
    const ws = whiten(spr);
    if (face < 0) { c.translate(Math.round(x), Math.round(y)); c.scale(-1, 1); c.drawImage(ws, -Math.round(w / 2), -Math.round(h - 4), w, h); }
    else { c.drawImage(ws, Math.round(x - w / 2), Math.round(y - h + 4), w, h); }
    c.restore();
  }
}

/* ============================================================
   TILES
   ============================================================ */
const TILE_COLORS = {
  sand: { top: '#e8c477', top2: '#f2d896', body: '#c99a4e', body2: '#b3813c', line: '#8a5f28' },
  dirt: { top: '#a8794a', top2: '#bb8a56', body: '#8a5c34', body2: '#734a28', line: '#4f3018' },
  stone: { top: '#8a8296', top2: '#a49cb0', body: '#6b6478', body2: '#575061', line: '#3a3444' },
  metal: { top: '#7a8490', top2: '#96a0ac', body: '#59626d', body2: '#454d57', line: '#2b3138' },
  fort: { top: '#6a5a52', top2: '#85736a', body: '#4e423c', body2: '#3d332e', line: '#241d1a' },
  brick: { top: '#b0705a', top2: '#c88870', body: '#8e5646', body2: '#744436', line: '#4a2a20' },
  wood: { top: '#b08a52', top2: '#c8a268', body: '#8e6c3c', body2: '#6f5430', line: '#463420' },
};
function tileSprite(type, v, cap) {
  return bake('T|' + type + v + (cap ? 'c' : ''), TILE, TILE, (c) => {
    const p = TILE_COLORS[type] || TILE_COLORS.stone;
    R(c, 0, 0, TILE, TILE, p.body);
    // speckle texture
    for (let i = 0; i < 16; i++) {
      const r1 = hash2(v * 31 + i, i * 17), r2 = hash2(i * 7, v * 13 + 3), r3 = hash2(v + i * 5, i);
      if (r1 > 0.6) R(c, (r2 * TILE) | 0, (r3 * TILE) | 0, 1 + (r3 > 0.8 ? 1 : 0), 1, p.body2);
      else if (r1 < 0.16) R(c, (r2 * TILE) | 0, (r3 * TILE) | 0, 1, 1, p.line);
    }
    if (type === 'brick') {
      c.fillStyle = p.line;
      for (let y = 0; y < TILE; y += 5) c.fillRect(0, y, TILE, 1);
      for (let y = 0; y < TILE; y += 5) for (let x = ((y / 5) % 2) * 4; x < TILE; x += 8) c.fillRect(x, y, 1, 5);
    }
    if (type === 'metal') {
      c.fillStyle = p.line; c.fillRect(0, 0, TILE, 1);
      R(c, 1, 3, 14, 1, p.body2); R(c, 1, 9, 14, 1, p.body2);
      for (let x = 2; x < TILE; x += 4) { R(c, x, 2, 1, 1, p.top2); R(c, x, 8, 1, 1, p.top2); }
    }
    if (cap) {
      R(c, 0, 0, TILE, 3, p.top);
      R(c, 0, 0, TILE, 1, p.top2);
      c.fillStyle = p.line;
      for (let i = 0; i < TILE; i += 3) c.fillRect(i, 3, 1, 1);
    }
  });
}
function platformSprite(kind) {
  return bake('PL|' + kind, TILE, 8, (c) => {
    if (kind === 'wood') {
      R(c, 0, 0, TILE, 8, '#141018'); R(c, 0, 1, TILE, 5, '#a07840'); R(c, 0, 1, TILE, 2, '#c49a58');
      c.fillStyle = '#6b4f2c'; for (let x = 2; x < TILE; x += 5) c.fillRect(x, 1, 1, 5);
      c.fillStyle = '#4a3218'; c.fillRect(0, 6, TILE, 1);
    } else {
      R(c, 0, 0, TILE, 8, '#141018'); R(c, 0, 1, TILE, 5, '#6b7480'); R(c, 0, 1, TILE, 1, '#95a0ad');
      c.fillStyle = '#454d57'; for (let x = 1; x < TILE; x += 3) c.fillRect(x, 2, 2, 3);
      c.fillStyle = '#8a94a2'; R(c, 0, 1, 1, 5, '#8a94a2'); R(c, TILE - 1, 1, 1, 5, '#8a94a2');
    }
  });
}
function ladderSprite() {
  return bake('LAD', 12, TILE, (c) => {
    R(c, 0, 0, 12, TILE, '#141018'); R(c, 1, 1, 2, TILE - 2, '#a07840'); R(c, 9, 1, 2, TILE - 2, '#a07840');
    for (let y = 2; y < TILE; y += 5) { R(c, 2, y, 8, 2, '#c49a58'); R(c, 2, y, 8, 1, '#8a6a38'); }
  });
}

/* ============================================================
   PROPS  (each baked once)
   ============================================================ */
const P_OUT = '#1a1418';
function prop(key, w, h, fn) { return bake('P|' + key, w, h, fn); }

const sandbag = () => prop('sandbag', 16, 12, (c) => {
  const cols = ['#c8b070', '#b09a5c', '#968048'];
  for (let row = 0; row < 2; row++) for (let i = 0; i < 2; i++) {
    const x = i * 8 + (row % 2), y = row * 6;
    ellipseO(c, x + 4, y + 3, 4.4, 3.2, { o: P_OUT, c: cols[(i + row) % 3], h: shade(cols[(i + row) % 3], 22), s: shade(cols[(i + row) % 3], -26) });
  }
  c.strokeStyle = P_OUT; c.lineWidth = 1;
  c.beginPath(); c.moveTo(2, 8); c.lineTo(14, 8); c.stroke();
});
const sandbagWall = () => prop('sandbagwall', 32, 22, (c) => {
  for (let row = 0; row < 3; row++) for (let i = 0; i < 4; i++) {
    const off = (row % 2) * 4, x = i * 8 - off + 4, y = row * 7;
    const col = ['#c8b070', '#b09a5c', '#968048', '#ab9458'][(i * 3 + row) % 4];
    ellipseO(c, x, y + 3, 4.6, 3.4, { o: P_OUT, c: col, h: shade(col, 22), s: shade(col, -26) });
  }
  R(c, 0, 18, 32, 2, '#6b5a30');
});
const crate = () => prop('crate', 16, 16, (c) => {
  R(c, 0, 0, 16, 16, P_OUT); R(c, 1, 1, 14, 14, '#a07840'); R(c, 1, 1, 14, 2, '#c49a58');
  c.fillStyle = '#6b4f2c';
  c.fillRect(1, 1, 14, 1); c.fillRect(1, 14, 14, 1); c.fillRect(1, 1, 1, 14); c.fillRect(14, 1, 1, 14);
  c.strokeStyle = '#6b4f2c'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(2, 2); c.lineTo(13, 13); c.moveTo(13, 2); c.lineTo(2, 13); c.stroke();
  R(c, 6, 6, 4, 4, '#e0c060');
});
const barrel = () => prop('barrel', 14, 18, (c) => {
  R(c, 0, 0, 14, 18, P_OUT); R(c, 1, 1, 12, 16, '#b03a2a'); R(c, 1, 1, 12, 2, '#d05a3a');
  R(c, 1, 8, 12, 2, '#6b1f18'); R(c, 1, 13, 12, 2, '#6b1f18');
  R(c, 2, 3, 2, 12, '#d0684a'); R(c, 9, 3, 1, 12, '#7a2418');
  R(c, 4, 4, 6, 1, '#f0e0a0');
  R(c, 5, 5, 4, 1, '#f0e0a0');
});
const barrelBlue = () => prop('barrelBlue', 14, 18, (c) => {
  R(c, 0, 0, 14, 18, P_OUT); R(c, 1, 1, 12, 16, '#3a6ab0'); R(c, 1, 1, 12, 2, '#5a8ad0');
  R(c, 1, 8, 12, 2, '#24407a'); R(c, 2, 3, 2, 12, '#5f8fd0'); R(c, 9, 3, 1, 12, '#1e3460');
});
const tyre = () => prop('tyre', 14, 8, (c) => {
  ellipseO(c, 7, 4, 6.5, 3.6, { o: P_OUT, c: '#2e2a2c', h: '#4a4448', s: '#1a1718' });
  ellipseO(c, 7, 4, 2.6, 1.6, { o: P_OUT, c: '#6a6468', h: '#8a8488' });
});
const barrelStack = () => prop('barrelstack', 32, 34, (c) => {
  const b = barrel();
  c.drawImage(b, 0, 0); c.drawImage(b, 16, 0); c.drawImage(b, 8, 16);
});
const wreckCar = () => prop('car', 44, 26, (c) => {
  // body
  R(c, 0, 10, 44, 12, P_OUT);
  R(c, 1, 11, 42, 10, '#8a4a3a'); R(c, 1, 11, 42, 3, '#a8604a'); R(c, 1, 18, 42, 3, '#5e2f26');
  // cabin
  R(c, 10, 2, 22, 9, P_OUT); R(c, 11, 3, 20, 7, '#7a4032');
  R(c, 13, 4, 7, 5, '#1e2a2e'); R(c, 22, 4, 7, 5, '#1e2a2e');
  R(c, 13, 4, 7, 1, '#3a5a60'); R(c, 22, 4, 7, 1, '#3a5a60');
  // dents + holes
  c.fillStyle = '#2a1a16'; c.fillRect(4, 14, 3, 4); c.fillRect(34, 12, 4, 3); c.fillRect(24, 17, 2, 3);
  R(c, 18, 20, 8, 3, '#3a2018');
  // wheels
  const t = tyre();
  c.drawImage(t, 3, 18); c.drawImage(t, 28, 18);
  c.fillStyle = '#5a3a24'; c.fillRect(0, 14, 3, 3); c.fillRect(41, 14, 3, 3);
});
const cactus = () => prop('cactus', 16, 30, (c) => {
  const col = { o: P_OUT, c: '#3f8a4a', h: '#5cb065', s: '#276030' };
  R(c, 6, 6, 5, 24, col.o); R(c, 7, 7, 3, 22, col.c); R(c, 7, 7, 1, 22, col.h);
  R(c, 2, 12, 4, 4, col.o); R(c, 2, 14, 5, 3, col.c); R(c, 3, 15, 1, 5, col.h);
  R(c, 11, 10, 4, 4, col.o); R(c, 10, 12, 5, 3, col.c);
  R(c, 2, 9, 2, 1, col.h); R(c, 12, 7, 2, 1, col.h);
  R(c, 5, 28, 7, 2, '#8a6a3a');
});
const palm = () => prop('palm', 44, 62, (c) => {
  // trunk
  c.strokeStyle = P_OUT; c.lineWidth = 7;
  c.beginPath(); c.moveTo(24, 62); c.quadraticCurveTo(20, 40, 26, 18); c.stroke();
  c.strokeStyle = '#8a6a44'; c.lineWidth = 5;
  c.beginPath(); c.moveTo(24, 62); c.quadraticCurveTo(20, 40, 26, 18); c.stroke();
  c.strokeStyle = '#a8845a'; c.lineWidth = 1.5;
  for (let i = 0; i < 8; i++) { c.beginPath(); c.moveTo(22 + i * 0.6, 58 - i * 5); c.lineTo(27 - i * 0.4, 56 - i * 5); c.stroke(); }
  // fronds
  const fr = (a, len) => {
    c.strokeStyle = P_OUT; c.lineWidth = 5;
    c.beginPath(); c.moveTo(26, 18); c.quadraticCurveTo(26 + Math.cos(a) * len * 0.6, 18 + Math.sin(a) * len * 0.5 - 4, 26 + Math.cos(a) * len, 18 + Math.sin(a) * len * 0.8 + 5); c.stroke();
    c.strokeStyle = '#3f8a4a'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(26, 18); c.quadraticCurveTo(26 + Math.cos(a) * len * 0.6, 18 + Math.sin(a) * len * 0.5 - 4, 26 + Math.cos(a) * len, 18 + Math.sin(a) * len * 0.8 + 5); c.stroke();
  };
  for (let i = 0; i < 7; i++) fr(-0.2 + i * 0.42, 20 + (i % 2) * 4);
  disc(c, 26, 17, 3, P_OUT); disc(c, 26, 17, 2, '#7a5a2a');
});
const deadTree = () => prop('deadtree', 34, 44, (c) => {
  c.strokeStyle = P_OUT; c.lineWidth = 6;
  const br = (x, y, a, l, w) => {
    const x2 = x + Math.cos(a) * l, y2 = y + Math.sin(a) * l;
    c.strokeStyle = P_OUT; c.lineWidth = w + 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x2, y2); c.stroke();
    c.strokeStyle = '#4a3a2c'; c.lineWidth = w; c.beginPath(); c.moveTo(x, y); c.lineTo(x2, y2); c.stroke();
    if (l > 5) { br(x2, y2, a - 0.5 - Math.random() * 0.2, l * 0.66, w * 0.7); br(x2, y2, a + 0.5 + Math.random() * 0.2, l * 0.6, w * 0.7); }
  };
  const s = 0; // deterministic-ish
  br(17, 44, -Math.PI / 2 + 0.1, 15, 5);
});
const flagProp = () => prop('flag', 26, 34, (c) => {
  R(c, 6, 0, 2, 34, P_OUT); R(c, 6, 0, 1, 34, '#8a8478'); R(c, 4, 0, 6, 2, P_OUT); R(c, 4, 0, 5, 1, '#b0aa9a');
});
function flagCloth(zone) {
  const cols = [['#c03a3a', '#8a2020'], ['#3050a0', '#1e3068'], ['#c8a020', '#8a6a10']][zone % 3];
  return prop('flagcloth' + zone, 20, 12, (c) => {
    polyO(c, [0, 0, 20, 1, 19, 7, 18, 12, 0, 11], { o: P_OUT, c: cols[0] });
    R(c, 1, 1, 17, 2, cols[1]);
    R(c, 5, 4, 9, 4, '#f0e0c0');
    R(c, 7, 3, 5, 6, '#f0e0c0');
  });
}
const rubblePile = () => prop('rubble', 28, 18, (c) => {
  for (let i = 0; i < 12; i++) {
    const x = 2 + hash2(i, 3) * 22, y = 4 + hash2(i, 7) * 10, s = 2 + hash2(i, 11) * 4;
    R(c, x, y, s + 1, s + 1, P_OUT); R(c, x + 1, y + 1, s, s, i % 3 ? '#8a8078' : '#6a6058');
    R(c, x + 1, y + 1, s, 1, '#a8a096');
  }
  R(c, 0, 15, 28, 3, '#5a5048');
});
const wallChunk = () => prop('wallchunk', 40, 40, (c) => {
  R(c, 0, 8, 40, 32, P_OUT); R(c, 1, 9, 38, 30, '#b0705a');
  c.fillStyle = '#8e5646'; for (let y = 10; y < 38; y += 5) c.fillRect(1, y, 38, 1);
  c.fillStyle = '#d0a080';
  for (let y = 10; y < 38; y += 10) for (let x = 2 + ((y / 10) % 2) * 4; x < 38; x += 9) c.fillRect(x, y, 1, 1);
  // broken top
  for (let x = 0; x < 40; x++) { const h = 8 + (hash2(x, 5) * 6 | 0); c.fillStyle = '#b0705a'; c.fillRect(x, 9, 1, Math.max(0, h - 8)); c.fillStyle = P_OUT; c.fillRect(x, 8 + Math.max(0, h - 8), 1, 1); }
  R(c, 1, 34, 38, 5, '#7a4438');
});
const roofTile = () => prop('rooftile', 48, 14, (c) => {
  R(c, 0, 0, 48, 14, P_OUT); R(c, 1, 1, 46, 12, '#8a4a3a');
  for (let x = 0; x < 48; x += 6) { R(c, x + 1, 1, 5, 11, x % 12 ? '#a05a44' : '#934f3c'); R(c, x + 1, 1, 5, 2, '#c0705a'); }
  R(c, 1, 11, 46, 2, '#5a2f26');
});
const balcony = () => prop('balcony', 34, 22, (c) => {
  R(c, 0, 10, 34, 4, P_OUT); R(c, 1, 11, 32, 2, '#a07840');
  c.fillStyle = '#6b4f2c'; for (let x = 3; x < 32; x += 4) c.fillRect(x, 11, 1, 2);
  R(c, 1, 0, 2, 12, P_OUT); R(c, 30, 0, 2, 12, P_OUT);
  for (let x = 1; x < 32; x += 3) { R(c, x, 2, 1, 8, P_OUT); R(c, x, 2, 1, 6, '#8a949e'); }
  R(c, 1, 1, 32, 2, P_OUT); R(c, 1, 1, 32, 1, '#95a0ad');
});
const windowFrame = () => prop('window', 20, 24, (c) => {
  R(c, 0, 0, 20, 24, P_OUT); R(c, 1, 1, 18, 22, '#b0705a');
  R(c, 4, 4, 12, 15, '#1a1a22'); R(c, 4, 4, 12, 1, '#2a2a34');
  R(c, 9, 4, 2, 15, '#7a4032'); R(c, 4, 11, 12, 1, '#7a4032');
  R(c, 4, 4, 12, 2, '#5a2f26');
});
const lampPost = () => prop('lamp', 10, 40, (c) => {
  R(c, 4, 4, 3, 36, P_OUT); R(c, 4, 4, 2, 36, '#4a4a52');
  R(c, 2, 38, 7, 2, P_OUT);
  R(c, 2, 2, 7, 3, P_OUT); R(c, 3, 3, 5, 1, '#e8e070');
});
const antenna = () => prop('antenna', 16, 56, (c) => {
  c.strokeStyle = P_OUT; c.lineWidth = 4; c.beginPath(); c.moveTo(8, 56); c.lineTo(8, 10); c.stroke();
  c.strokeStyle = '#6a6a74'; c.lineWidth = 2; c.beginPath(); c.moveTo(8, 56); c.lineTo(8, 10); c.stroke();
  for (let y = 12; y < 50; y += 9) { R(c, 4, y, 9, 1, P_OUT); R(c, 5, y, 7, 1, '#8a8a94'); }
  R(c, 5, 6, 7, 3, P_OUT); R(c, 6, 7, 5, 1, '#d0d0d8');
  disc(c, 8, 4, 2, '#e05050');
});
const signProp = () => prop("sign", 34, 26, (c) => {
  R(c, 0, 0, 34, 14, P_OUT); R(c, 1, 1, 32, 12, '#c8b070'); R(c, 1, 1, 32, 1, '#e0cc90');
  R(c, 6, 5, 3, 3, '#7a5a2a'); R(c, 12, 5, 3, 3, '#7a5a2a'); R(c, 18, 5, 3, 3, '#7a5a2a'); R(c, 24, 5, 3, 3, '#7a5a2a');
  R(c, 4, 14, 3, 11, P_OUT); R(c, 27, 14, 3, 11, P_OUT);
});
const bones = () => prop('bones', 24, 10, (c) => {
  ellipseO(c, 6, 5, 3.4, 3, { o: P_OUT, c: '#e0dcc8', h: '#f8f4e0', s: '#b0aa96' });
  R(c, 4, 4, 1, 1, P_OUT); R(c, 8, 4, 1, 1, P_OUT); R(c, 5, 7, 3, 1, P_OUT);
  for (let i = 0; i < 3; i++) { R(c, 12 + i * 4, 6, 4, 2, P_OUT); R(c, 12 + i * 4, 6, 3, 1, '#e0dcc8'); }
});
const satelliteDish = () => prop('dish', 26, 26, (c) => {
  c.save(); c.translate(13, 14); c.rotate(-0.4);
  ellipseO(c, 0, 0, 11, 8, { o: P_OUT, c: '#b0b4bc', h: '#d8dce4', s: '#787c84' });
  R(c, -2, -10, 4, 6, P_OUT); R(c, -1, -10, 2, 5, '#8a8e96'); disc(c, 0, -10, 2, '#e0d060');
  c.restore();
  R(c, 11, 20, 4, 6, P_OUT); R(c, 11, 20, 3, 6, '#6a6a72');
});
const pipeProp = () => prop('pipe', 34, 12, (c) => {
  R(c, 0, 0, 34, 12, P_OUT); R(c, 1, 1, 32, 10, '#7a8088'); R(c, 1, 2, 32, 3, '#9aa2ac');
  R(c, 6, 0, 3, 12, P_OUT); R(c, 6, 1, 2, 10, '#5a6068');
  R(c, 24, 0, 3, 12, P_OUT); R(c, 24, 1, 2, 10, '#5a6068');
});
const fenceProp = () => prop('fence', 32, 22, (c) => {
  c.strokeStyle = P_OUT; c.lineWidth = 3;
  c.beginPath(); c.moveTo(2, 22); c.lineTo(2, 2); c.moveTo(16, 22); c.lineTo(16, 2); c.moveTo(30, 22); c.lineTo(30, 2); c.stroke();
  c.strokeStyle = '#8a8478'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(2, 22); c.lineTo(2, 2); c.moveTo(16, 22); c.lineTo(16, 2); c.moveTo(30, 22); c.lineTo(30, 2); c.stroke();
  c.strokeStyle = P_OUT; c.lineWidth = 2;
  c.beginPath(); c.moveTo(0, 5); c.lineTo(32, 5); c.moveTo(0, 11); c.lineTo(32, 11); c.moveTo(0, 17); c.lineTo(32, 17); c.stroke();
  c.strokeStyle = '#9a9488'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(0, 5); c.lineTo(32, 5); c.moveTo(0, 11); c.lineTo(32, 11); c.moveTo(0, 17); c.lineTo(32, 17); c.stroke();
});
const tentProp = () => prop('tent', 40, 30, (c) => {
  polyO(c, [20, 0, 40, 30, 0, 30], { o: P_OUT, c: '#8a8a5a' });
  polyO(c, [20, 4, 30, 30, 20, 30], { o: P_OUT, c: '#5a5a3a' });
  R(c, 6, 22, 28, 2, '#6b6b45');
});
const turretProp = () => prop('turret', 26, 22, (c) => {
  R(c, 2, 14, 22, 8, P_OUT); R(c, 3, 15, 20, 6, '#5a5a68'); R(c, 3, 15, 20, 2, '#7a7a8a');
  R(c, 8, 6, 12, 10, P_OUT); R(c, 9, 7, 10, 8, '#6a6a78'); R(c, 9, 7, 10, 2, '#8a8a9a');
  R(c, 17, 8, 9, 4, P_OUT); R(c, 17, 8, 8, 3, '#4a4a58');
  for (let x = 4; x < 24; x += 5) R(c, x, 19, 3, 2, '#3a3a46');
});
const gunEmplacement = () => prop('emplacement', 34, 26, (c) => {
  R(c, 0, 16, 34, 10, P_OUT); R(c, 1, 17, 32, 8, '#8a8078'); R(c, 1, 17, 32, 2, '#a89e94');
  for (let x = 2; x < 32; x += 6) R(c, x, 20, 4, 2, '#6a6058');
  R(c, 10, 6, 14, 11, P_OUT); R(c, 11, 7, 12, 9, '#5a5a68'); R(c, 11, 7, 12, 2, '#7a7a8a');
  R(c, 20, 9, 13, 4, P_OUT); R(c, 20, 9, 12, 3, '#3f3f4a');
});
const drum = () => prop('drum', 20, 20, (c) => {
  R(c, 1, 2, 18, 17, P_OUT); R(c, 2, 3, 16, 15, '#b03a2a'); R(c, 2, 3, 16, 3, '#d05a3a');
  R(c, 2, 10, 16, 2, '#7a2018'); R(c, 3, 5, 2, 12, '#d0684a');
  R(c, 5, 6, 9, 1, '#f0e0a0'); R(c, 7, 7, 5, 1, '#f0e0a0');
});
const ammoBoxProp = () => prop('ammobox', 18, 12, (c) => {
  R(c, 0, 0, 18, 12, P_OUT); R(c, 1, 1, 16, 10, '#4a6a3a'); R(c, 1, 1, 16, 2, '#5f8a4a');
  R(c, 4, 4, 10, 4, '#c8b070'); R(c, 5, 5, 8, 2, '#8a6a2a');
});
const streetSign = () => prop('street', 28, 40, (c) => {
  R(c, 12, 4, 3, 36, P_OUT); R(c, 12, 4, 2, 36, '#7a8088');
  R(c, 0, 0, 26, 12, P_OUT); R(c, 1, 1, 24, 10, '#3050a0'); R(c, 2, 2, 22, 2, '#5080d0');
  R(c, 4, 5, 8, 2, '#e0e0f0');
});
const girder = () => prop('girder', 64, 10, (c) => {
  R(c, 0, 0, 64, 10, P_OUT); R(c, 1, 1, 62, 8, '#6a7078'); R(c, 1, 1, 62, 2, '#8a929c');
  c.fillStyle = '#3f454c';
  for (let x = 2; x < 62; x += 8) { c.fillRect(x, 1, 2, 8); }
  c.beginPath(); c.moveTo(2, 2); c.lineTo(62, 8); c.moveTo(2, 8); c.lineTo(62, 2); c.strokeStyle = '#3f454c'; c.lineWidth = 1; c.stroke();
});

/* ---------- pickups ---------- */
function pickupIcon(kind) {
  return prop('pick|' + kind, 14, 14, (c) => {
    switch (kind) {
      case 'medal':
        ellipseO(c, 7, 9, 4, 4, { o: P_OUT, c: '#e0c040', h: '#f8e880', s: '#a08820' });
        R(c, 3, 5, 2, 5, '#c03a3a'); R(c, 9, 5, 2, 5, '#c03a3a');
        R(c, 6, 8, 3, 3, '#f0e0a0');
        break;
      case 'fruit':
        ellipseO(c, 7, 8, 4.4, 4.2, { o: P_OUT, c: '#e04a3a', h: '#ff7a5a', s: '#a02820' });
        R(c, 6, 2, 2, 4, '#3f8a4a'); R(c, 8, 3, 3, 2, '#5cb065');
        R(c, 5, 6, 2, 2, '#ffb0a0');
        break;
      case 'gold':
        polyO(c, [2, 9, 12, 9, 12, 12, 2, 12], { o: P_OUT, c: '#e0c040' });
        R(c, 2, 5, 10, 4, P_OUT); R(c, 3, 5, 8, 4, '#f0d050'); R(c, 4, 6, 2, 1, '#fff0a0');
        R(c, 2, 9, 10, 1, '#a08820');
        break;
      case 'health':
        R(c, 1, 3, 12, 9, P_OUT); R(c, 2, 4, 10, 7, '#e8e8f0'); R(c, 2, 4, 10, 2, '#ffffff');
        R(c, 6, 5, 2, 5, '#e03030'); R(c, 4, 7, 6, 2, '#e03030');
        R(c, 4, 12, 6, 2, P_OUT); R(c, 5, 12, 4, 1, '#a0a0b0');
        break;
      case 'ammo':
        R(c, 1, 3, 12, 9, P_OUT); R(c, 2, 4, 10, 7, '#5a6a3a'); R(c, 2, 4, 10, 2, '#7a8a4a');
        R(c, 4, 6, 6, 3, '#e0c040'); R(c, 5, 5, 2, 2, '#c8b070'); R(c, 8, 5, 2, 2, '#c8b070');
        break;
      case 'shield':
        polyO(c, [7, 1, 13, 4, 12, 10, 7, 14, 2, 10, 1, 4], { o: P_OUT, c: '#40a0e0' });
        polyO(c, [7, 3, 11, 5, 10, 9, 7, 12, 4, 9, 3, 5], { o: '#1a5a90', c: '#a0e0ff' });
        break;
      case 'grenade':
        ellipseO(c, 6, 8, 4.4, 4.4, { o: P_OUT, c: '#3a5a3a', h: '#5a8a5a', s: '#243a24' });
        R(c, 5, 1, 3, 4, P_OUT); R(c, 5, 1, 2, 3, '#8a8a92');
        R(c, 8, 2, 3, 1, P_OUT); R(c, 9, 1, 2, 1, '#c8b070');
        R(c, 3, 6, 2, 2, '#8ab08a');
        break;
      case 'star':
        c.save(); c.translate(7, 7);
        c.beginPath();
        for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 3 : 6.5; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
        c.closePath(); c.strokeStyle = P_OUT; c.lineWidth = 1.5; c.stroke(); c.fillStyle = '#e0c040'; c.fill();
        c.restore();
        break;
    }
  });
}
function weaponIcon(kind) {
  return prop('wicon|' + kind, 18, 14, (c) => {
    c.save(); c.translate(2, 7); drawWeapon(c, kind, PAL.hero); c.restore();
    R(c, 0, 0, 18, 14, 'rgba(0,0,0,0)');
  });
}

/* ---------- projectiles ---------- */
const bulletSprite = kind => prop('blt|' + kind, 16, 8, (c) => {
  switch (kind) {
    case 'pistol': R(c, 0, 3, 12, 2, P_OUT); R(c, 1, 3, 11, 1, '#fff0a0'); R(c, 11, 2, 3, 4, '#f0c040'); break;
    case 'mg': R(c, 0, 2, 15, 3, P_OUT); R(c, 1, 3, 14, 2, '#ffe860'); R(c, 13, 1, 3, 5, '#f0d040'); break;
    case 'shotgun': for (let i = 0; i < 3; i++) { R(c, 0, 1 + i * 3, 9, 2, P_OUT); R(c, 1, 1 + i * 3, 8, 1, '#ffd060'); } break;
    case 'rocket': R(c, 0, 2, 15, 5, P_OUT); R(c, 1, 3, 12, 3, '#c8c8d0'); R(c, 2, 3, 4, 3, '#e8e8f0'); R(c, 13, 2, 3, 5, '#e04030'); break;
    case 'laser': R(c, 0, 3, 15, 2, P_OUT); R(c, 1, 3, 14, 2, '#40f0f0'); R(c, 3, 2, 9, 4, 'rgba(64,240,240,0.35)'); break;
    case 'laserbig': R(c, 0, 2, 15, 3, P_OUT); R(c, 1, 2, 14, 3, '#c060f0'); R(c, 4, 1, 7, 5, 'rgba(192,96,240,0.4)'); break;
    case 'flame': R(c, 0, 1, 16, 7, 'rgba(240,120,20,0.5)'); R(c, 2, 2, 14, 5, '#f08020'); R(c, 6, 3, 10, 3, '#f8c040'); R(c, 10, 3, 6, 3, '#f8f0a0'); break;
    case 'ebolt': R(c, 2, 2, 12, 4, P_OUT); R(c, 3, 3, 10, 2, '#f0f0ff'); R(c, 5, 1, 3, 6, '#a0b0ff'); break;
    case 'grenade': disc(c, 8, 4, 4, P_OUT); disc(c, 8, 4, 3, '#3a5a3a'); R(c, 7, 0, 2, 2, '#c8b070'); break;
  }
});

/* ---------- explosions & fx ---------- */
function explosionSprite(i) {
  return prop('exp' + i, 48, 48, (c) => {
    const PALETTES = [
      ['#ffffff', '#fff0a0', '#f8b030', '#e06020', '#8a3020', '#5a2018'],
      ['#ffffff', '#f0f0ff', '#c0a0f0', '#8050c0', '#402068', '#20103a'],
      ['#ffffff', '#fff0a0', '#f09030', '#a03020', '#601810', '#300c08'],
    ];
    const cols = PALETTES[i % 3];
    // three frames of one blast, shrinking and cooling
    const scale = [1, 0.78, 0.52][i];
    const R = 21 * scale;
    const ring = R * 0.34;              // how far the lobes sit from the centre
    const lobe = R * 0.56;
    const lobes = 9;
    c.save(); c.translate(24, 24);
    // distance field over the union of the lobes
    const field = new Float32Array(48 * 48);
    for (let py = 0; py < 48; py++) {
      for (let px = 0; px < 48; px++) {
        const dx = px - 24, dy = py - 24;
        let m = 0;
        for (let k = 0; k < lobes; k++) {
          const a = k / lobes * TAU + (k % 2 ? 0.42 : 0);
          const rr = lobe * (0.86 + ((k * 7) % 4) * 0.09);
          const ex = Math.cos(a) * ring, ey = Math.sin(a) * ring;
          const dd = Math.hypot(dx - ex, dy - ey);
          if (dd < rr) m = Math.max(m, 1 - dd / rr);
        }
        // plus a central core so the ball is solid, not a ring of blobs
        const dc = Math.hypot(dx, dy);
        if (dc < lobe * 0.9) m = Math.max(m, 1 - dc / (lobe * 0.9));
        field[py * 48 + px] = m;
      }
    }
    // cols[5] is the dark outer shell (largest area, lowest m), cols[0] the
    // white-hot core (smallest area, highest m)
    const cuts = [0.9, 0.8, 0.7, 0.58, 0.45, 0.3];
    for (let bi = cols.length - 1; bi >= 0; bi--) {
      c.fillStyle = cols[bi];
      const cut = cuts[bi];
      for (let py = 0; py < 48; py++) {
        for (let px = 0; px < 48; px++) {
          const m = field[py * 48 + px];
          if (m >= cut) c.fillRect(px - 24, py - 24, 1, 1);
        }
      }
    }
    c.restore();
  });
}
const smokePuff = () => prop('smoke', 16, 16, (c) => {
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * TAU, d = 3.5;
    disc(c, 8 + Math.cos(a) * d, 8 + Math.sin(a) * d, 3.4, '#ffffff');
  }
  disc(c, 8, 8, 4, '#ffffff');
});
const sparkSprite = () => prop('spark', 6, 6, (c) => {
  c.fillStyle = '#fff0a0'; c.fillRect(0, 2, 6, 2); c.fillRect(2, 0, 2, 6);
  c.fillStyle = '#ffffff'; c.fillRect(2, 2, 2, 2);
});
const glowSprite = (col) => prop('glow' + col, 32, 32, (c) => {
  const g = c.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, col); g.addColorStop(0.4, col.replace('rgb', 'rgba').replace(')', ',0.5)'));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(0, 0, 32, 32);
});
const shellSprite = () => prop('shell', 4, 4, (c) => { R(c, 0, 0, 3, 4, P_OUT); R(c, 1, 1, 2, 3, '#e0c060'); });
const muzzleFlash = () => prop('muzzle', 22, 18, (c) => {
  c.save(); c.translate(4, 9);
  polyO(c, [0, -3, 9, -6, 18, 0, 9, 6, 0, 3], { o: '#f8d060', c: '#fff8d0' });
  polyO(c, [0, -2, 6, -3, 11, 0, 6, 3, 0, 2], { o: '#f09020', c: '#ffd060' });
  c.restore();
});
const flashRing = () => prop('ring', 40, 40, (c) => {
  c.strokeStyle = '#fff0c0'; c.lineWidth = 3;
  c.beginPath(); c.arc(20, 20, 17, 0, TAU); c.stroke();
  c.strokeStyle = '#f0a040'; c.lineWidth = 1.5;
  c.beginPath(); c.arc(20, 20, 14, 0, TAU); c.stroke();
});
const muzzleFlashBig = () => prop('muzzlebig', 34, 30, (c) => {
  c.save(); c.translate(6, 15);
  polyO(c, [0, -5, 14, -12, 28, 0, 14, 12, 0, 5], { o: '#f0a020', c: '#fff4c0' });
  polyO(c, [0, -3, 10, -6, 18, 0, 10, 6, 0, 3], { o: '#fff0a0', c: '#ffffff' });
  c.restore();
});
const bossWeakSprite = (i) => prop('bw' + i, 20, 20, (c) => {
  ellipseO(c, 10, 10, 8, 8, { o: '#0a0a10', c: '#c03a2a' });
  ellipseO(c, 10, 10, 5, 5, { o: '#501008', c: '#e05a3a' });
  disc(c, 8, 8, 2, '#ffd060');
  c.strokeStyle = '#f0e0c0'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(4, 4); c.lineTo(16, 16); c.moveTo(16, 4); c.lineTo(4, 16); c.stroke();
});
