/* ============================================================
   02 - PROCEDURAL PIXEL ART
   Everything here is drawn in code. Sprites are baked into
   offscreen canvases once, then blitted.
   ============================================================ */

/* ---------- tiny offscreen canvas helper ---------- */
function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return c;
}
const spriteCache = new Map();
function bake(key, w, h, fn) {
  let c = spriteCache.get(key);
  if (c) return c;
  c = makeCanvas(w, h);
  fn(c.getContext('2d'), c);
  c.__w = c.width; c.__h = c.height;
  spriteCache.set(key, c);
  return c;
}
function bakeTo(canvas, fn) { fn(canvas.getContext('2d'), canvas); return canvas; }

/* ---------- drawing primitives (outline-first, chunky) ---------- */
function R(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x | 0, y | 0, Math.max(1, w | 0), Math.max(1, h | 0)); }
function RE(c, x, y, w, h, col) { // outlined rect
  R(c, x - 1, y - 1, w + 2, h + 2, col.o);
  R(c, x, y, w, h, col.c);
  if (col.h) R(c, x, y, w, 1, col.h);
  if (col.s) R(c, x, y + h - 1, w, 1, col.s);
}
function disc(c, cx, cy, r, col) {
  c.fillStyle = col;
  for (let y = -r; y <= r; y++) {
    const w = Math.floor(Math.sqrt(r * r - y * y));
    if (w >= 0) c.fillRect((cx - w) | 0, (cy + y) | 0, w * 2 + 1, 1);
  }
}
function ellipseO(c, cx, cy, rx, ry, col) {
  c.fillStyle = col.o;
  for (let y = -ry - 1; y <= ry + 1; y++) {
    const t = (y) / (ry + 1), w = Math.floor((rx + 1) * Math.sqrt(Math.max(0, 1 - t * t)));
    if (w >= 0) c.fillRect((cx - w) | 0, (cy + y) | 0, w * 2 + 1, 1);
  }
  c.fillStyle = col.c;
  for (let y = -ry; y <= ry; y++) {
    const t = (y) / (ry + 1), w = Math.floor(rx * Math.sqrt(Math.max(0, 1 - t * t)));
    if (w >= 0) c.fillRect((cx - w) | 0, (cy + y) | 0, w * 2 + 1, 1);
  }
  c.fillStyle = col.h;
  for (let y = -ry; y < 0; y++) {
    const t = (y) / (ry + 1), w = Math.floor(rx * Math.sqrt(Math.max(0, 1 - t * t)));
    if (w >= 0) c.fillRect((cx - w) | 0, (cy + y) | 0, w * 2, 1);
  }
  if (col.s) { c.fillStyle = col.s; for (let y = 0; y < ry; y++) { const t = y / (ry + 1), w = Math.floor(rx * Math.sqrt(Math.max(0, 1 - t * t))); if (w >= 0) c.fillRect((cx - w) | 0, (cy + y) | 0, w * 2, 1); } }
}
function segO(c, x1, y1, x2, y2, w, col) {
  // outline
  c.strokeStyle = col.o; c.lineWidth = w + 2; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  c.strokeStyle = col.c; c.lineWidth = w;
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  if (col.h) {
    c.strokeStyle = col.h; c.lineWidth = Math.max(1, w - 2);
    c.beginPath(); c.moveTo(x1 - .6, y1 - .6); c.lineTo(x2 - .6, y2 - .6); c.stroke();
  }
}
function polyO(c, pts, col) {
  c.beginPath(); c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  c.closePath();
  c.strokeStyle = col.o; c.lineWidth = 2; c.lineJoin = 'round'; c.stroke();
  c.fillStyle = col.c; c.fill();
  if (col.h) { c.fillStyle = col.h; c.fillRect(pts[0], pts[1], 1, 1); }
}
function lineO(c, x1, y1, x2, y2, col, w) {
  c.strokeStyle = col.o; c.lineWidth = (w || 1) + 1;
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  c.strokeStyle = col.c; c.lineWidth = w || 1;
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
}

/* ---------- bitmap font (5x7) ---------- */
const FONT = {
  'A': '01110,10001,10001,11111,10001,10001,10001',
  'B': '11110,10001,10001,11110,10001,10001,11110',
  'C': '01110,10001,10000,10000,10000,10001,01110',
  'D': '11110,10001,10001,10001,10001,10001,11110',
  'E': '11111,10000,10000,11110,10000,10000,11111',
  'F': '11111,10000,10000,11110,10000,10000,10000',
  'G': '01110,10001,10000,10111,10001,10001,01111',
  'H': '10001,10001,10001,11111,10001,10001,10001',
  'I': '11111,00100,00100,00100,00100,00100,11111',
  'J': '00111,00010,00010,00010,00010,10010,01100',
  'K': '10001,10010,10100,11000,10100,10010,10001',
  'L': '10000,10000,10000,10000,10000,10000,11111',
  'M': '10001,11011,10101,10101,10001,10001,10001',
  'N': '10001,11001,10101,10011,10001,10001,10001',
  'O': '01110,10001,10001,10001,10001,10001,01110',
  'P': '11110,10001,10001,11110,10000,10000,10000',
  'Q': '01110,10001,10001,10001,10101,10010,01101',
  'R': '11110,10001,10001,11110,10100,10010,10001',
  'S': '01111,10000,10000,01110,00001,00001,11110',
  'T': '11111,00100,00100,00100,00100,00100,00100',
  'U': '10001,10001,10001,10001,10001,10001,01110',
  'V': '10001,10001,10001,10001,10001,01010,00100',
  'W': '10001,10001,10001,10101,10101,11011,01010',
  'X': '10001,10001,01010,00100,01010,10001,10001',
  'Y': '10001,10001,01010,00100,00100,00100,00100',
  'Z': '11111,00001,00010,00100,01000,10000,11111',
  '0': '01110,10001,10011,10101,11001,10001,01110',
  '1': '00100,01100,00100,00100,00100,00100,01110',
  '2': '01110,10001,00001,00010,00100,01000,11111',
  '3': '11111,00010,00100,00010,00001,10001,01110',
  '4': '00010,00110,01010,10010,11111,00010,00010',
  '5': '11111,10000,11110,00001,00001,10001,01110',
  '6': '00110,01000,10000,11110,10001,10001,01110',
  '7': '11111,00001,00010,00100,01000,01000,01000',
  '8': '01110,10001,10001,01110,10001,10001,01110',
  '9': '01110,10001,10001,01111,00001,00010,01100',
  ' ': '00000,00000,00000,00000,00000,00000,00000',
  '.': '00000,00000,00000,00000,00000,01100,01100',
  ',': '00000,00000,00000,00000,01100,00100,01000',
  '!': '00100,00100,00100,00100,00100,00000,00100',
  '?': '01110,10001,00001,00010,00100,00000,00100',
  ':': '00000,01100,01100,00000,01100,01100,00000',
  '-': '00000,00000,00000,01110,00000,00000,00000',
  '_': '00000,00000,00000,00000,00000,00000,11111',
  '+': '00000,00100,00100,11111,00100,00100,00000',
  '/': '00001,00010,00010,00100,01000,01000,10000',
  '\\': '10000,01000,01000,00100,00010,00010,00001',
  '(': '00010,00100,01000,01000,01000,00100,00010',
  ')': '01000,00100,00010,00010,00010,00100,01000',
  "'": '00100,00100,00000,00000,00000,00000,00000',
  '"': '01010,01010,00000,00000,00000,00000,00000',
  '*': '00000,10101,01110,11111,01110,10101,00000',
  '=': '00000,00000,11111,00000,11111,00000,00000',
  '<': '00010,00100,01000,10000,01000,00100,00010',
  '>': '01000,00100,00010,00001,00010,00100,01000',
  '%': '11001,11010,00010,00100,01000,01011,10011',
  '#': '01010,11111,01010,01010,11111,01010,00000',
  '&': '01100,10010,10100,01000,10101,10010,01101',
  '[': '01110,01000,01000,01000,01000,01000,01110',
  ']': '01110,00010,00010,00010,00010,00010,01110',
  '@': '01110,10001,10111,10101,10111,10000,01110',
};
const FONTW = 5, FONTH = 7;
const glyphCache = new Map();
function glyph(ch, col) {
  const key = ch + col;
  let g = glyphCache.get(key);
  if (g) return g;
  const data = FONT[ch] || FONT['?'];
  g = bake('f' + key, FONTW, FONTH, (c) => {
    const rows = data.split(',');
    c.fillStyle = col;
    for (let y = 0; y < 7; y++) {
      const r = rows[y];
      for (let x = 0; x < 5; x++) if (r[x] === '1') c.fillRect(x, y, 1, 1);
    }
  });
  glyphCache.set(key, g);
  return g;
}
function textW(str, s) { s = s || 1; return str.length * (FONTW + 1) * s - s; }
function text(c, str, x, y, col, s, align, shadow) {
  str = String(str).toUpperCase();
  s = s || 1;
  if (align === 'c') x -= textW(str, s) / 2;
  else if (align === 'r') x -= textW(str, s);
  x = Math.round(x); y = Math.round(y);
  if (shadow !== false) {
    const so = shadow || '#0b0a10';
    let sx = x, sy = y;
    // draw shadow by offsetting in screen space
    const pass = (col2, ox, oy) => {
      let cx = sx + ox, cy = sy + oy;
      for (let i = 0; i < str.length; i++) {
        const g = glyph(str[i], col2);
        c.drawImage(g, cx, cy, g.width * s, g.height * s);
        cx += (FONTW + 1) * s;
      }
    };
    pass(so, s, s);
  }
  let cx = x;
  for (let i = 0; i < str.length; i++) {
    const g = glyph(str[i], col);
    c.drawImage(g, cx, y, g.width * s, g.height * s);
    cx += (FONTW + 1) * s;
  }
  return x;
}
function textMulti(c, str, x, y, col, s, align, lh) { // \n aware
  const lines = String(str).split('\n');
  for (let i = 0; i < lines.length; i++) text(c, lines[i], x, y + i * (lh || 10 * s), col, s, align);
}

/* ---------- palettes ---------- */
const PAL = {
  hero: { o: '#141018', c: '#3f7fbf', h: '#5f9fdf', s: '#2a5c8f', skin: '#e8a878', skinH: '#ffcfa0', boot: '#4a3524', band: '#e04a3f', bandH: '#ff7a6a', hair: '#3a2a20' },
  soldier: { o: '#141018', c: '#7a8a4a', h: '#9aab60', s: '#55633a', skin: '#d99a68', skinH: '#f0b88a', boot: '#33291d', band: '#c8b040', bandH: '#e8d060', hair: '#2e241c' },
  soldier2: { o: '#141018', c: '#8a5a3a', h: '#a87a52', s: '#63412a', skin: '#c98c5e', skinH: '#e0a878', boot: '#2b2018', band: '#b03a3a', bandH: '#d85a52', hair: '#241c14' },
  rusher: { o: '#100c14', c: '#a03050', h: '#c04a68', s: '#701c36', skin: '#e0a070', skinH: '#ffc890', boot: '#2a1a18', band: '#e0e0e0', bandH: '#ffffff', hair: '#1a1210' },
  sniper: { o: '#0d0d14', c: '#3a4a5a', h: '#4e6274', s: '#26313d', skin: '#c89468', skinH: '#e6b58a', boot: '#20242c', band: '#2a2a30', bandH: '#454550', hair: '#181418' },
  heavy: { o: '#0e0c10', c: '#5a5a68', h: '#787886', s: '#3c3c48', skin: '#c08858', skinH: '#dda878', boot: '#2a2a30', band: '#c03a2a', bandH: '#e06048', hair: '#1c1c20' },
  civ: { o: '#141018', c: '#d8c8a0', h: '#f0e0b8', s: '#a89878', skin: '#d8a070', skinH: '#f0c090', boot: '#4a4030', band: '#7a6a50', bandH: '#9a8a68', hair: '#40301e' },
  bossDark: { o: '#0a0a10', c: '#4a4f5c', h: '#6b7280', s: '#2b2f38' },
};
const SKINCOL = p => ({ o: p.o, c: p.skin, h: p.skinH, s: '#a86c46' });
const CLOTH = p => ({ o: p.o, c: p.c, h: p.h, s: p.s });
const BOOT = p => ({ o: p.o, c: p.boot, h: '#6a5240', s: '#1e1712' });

/* ---------- weapons drawing (in art space, muzzle at origin, pointing +x) ---------- */
function drawWeapon(c, kind, pal) {
  const o = '#141018', g1 = '#5a5f6b', g2 = '#8b93a3', g3 = '#2e323c';
  switch (kind) {
    case 'pistol':
      R(c, 0, -1, 6, 3, o); R(c, 1, -1, 4, 2, g1); R(c, 1, 0, 2, 1, g3);
      R(c, 0, 1, 2, 3, o); R(c, 1, 1, 1, 2, g2);
      break;
    case 'mg':
      R(c, -3, -2, 12, 4, o); R(c, -2, -1, 10, 2, g3); R(c, 0, -1, 9, 1, g1);
      R(c, 2, 1, 2, 4, o); R(c, 2, 1, 1, 3, g2); R(c, 8, -1, 5, 1, g3);
      R(c, -1, -4, 2, 2, o); R(c, -1, -4, 1, 1, g2);
      break;
    case 'shotgun':
    case 'spread':
      R(c, -4, -2, 12, 4, o); R(c, -3, -1, 10, 2, '#6b4a2a'); R(c, 0, -1, 8, 1, '#8f6a3a');
      R(c, 1, 1, 2, 4, o); R(c, 1, 1, 1, 3, '#a0784a');
      R(c, 6, -3, 2, 2, o); R(c, -3, -4, 3, 2, o);
      break;
    case 'flame':
      R(c, -5, -2, 11, 4, o); R(c, -4, -1, 9, 2, '#8a3a2a'); R(c, 5, -1, 4, 2, o); R(c, 5, -1, 3, 1, g2);
      R(c, -6, 1, 3, 5, o); R(c, -6, 1, 2, 4, '#c8b040');
      R(c, 1, 1, 2, 3, o); R(c, 1, 1, 1, 2, '#c8b040');
      break;
    case 'rocket':
      R(c, -5, -3, 14, 6, o); R(c, -4, -2, 12, 4, '#5a6a4a'); R(c, -3, -2, 10, 1, '#7a8a5a');
      R(c, 8, -4, 4, 8, o); R(c, 8, -3, 3, 6, '#7a8a5a'); R(c, 10, -2, 1, 4, g3);
      R(c, 0, 2, 2, 4, o); R(c, 0, 2, 1, 3, '#4a4a3a');
      R(c, 12, -2, 2, 4, o);
      break;
    case 'laser':
      R(c, -3, -3, 11, 6, o); R(c, -2, -2, 9, 4, '#3a3a58'); R(c, -2, -2, 9, 1, '#5a5a88');
      R(c, 7, -1, 4, 2, o); R(c, 7, -1, 3, 1, '#40e0e0');
      R(c, -1, 2, 2, 3, o);
      R(c, 2, -4, 2, 2, o); R(c, 2, -4, 1, 1, '#40e0e0');
      break;
    default:
      R(c, 0, -1, 4, 2, o);
  }
}

/* ============================================================
   FIGHTER RIG
   Art canvas 22x28, feet at y=27, facing right.
   ============================================================ */
const AW = 24, AH = 30, FEET = 28, HIPY = 16, SHY = 10, HEADY = 6;

/** Build one frame of a humanoid. pose = {lean, bob, headTilt, armF:[sh,el], armB:[sh,el], legF:[th,kn], legB:[th,kn], crouch, gun, gunFlip, aim} */
function drawFighter(c, pal, pose, opts) {
  opts = opts || {};
  const dir = pose.face < 0 ? -1 : 1;
  const crouch = pose.crouch || 0;
  const bob = pose.bob || 0;
  const hipY = HIPY + bob + crouch * 5;
  const shY = SHY + bob + crouch * 4.5;
  const hipX = 11 + (pose.lean || 0);
  const shX = 11 + (pose.lean || 0) * 1.5 + 1;
  const lean = pose.lean || 0;
  const A = (sh, el) => { // convert to point
    const a1 = sh, a2 = sh + el;
    return [Math.sin(a1), Math.cos(a1), Math.sin(a2), Math.cos(a2)];
  };
  const armLen = 6.5 - crouch * 0.5, foreLen = 6;
  const thigh = 5.5 + crouch * 1.5, shin = 6 + crouch * 1.5;

  // ---- LEG: thigh then shin, angle 0 = straight down, + = forward
  function legAngles(l, hx, hy) {
    const th = l[0], kn = l[1];
    const kx = hx + Math.sin(th) * thigh, ky = hy + Math.cos(th) * thigh;
    const fa = th - kn;
    const fx = kx + Math.sin(fa) * shin, fy = ky + Math.cos(fa) * shin;
    return [[hx, hy, kx, ky, fx, fy]];
  }
  const drawLeg = (l, back) => {
    const p = legAngles(l, hipX, hipY)[0];
    const col = back ? { o: pal.o, c: shade(pal.c, -18), s: shade(pal.s, -20) } : CLOTH(pal);
    const boot = back ? { o: pal.o, c: shade(pal.boot, -16), h: shade(pal.boot, 6) } : BOOT(pal);
    segO(c, p[0], p[1], p[2], p[3], 3.4, col);
    segO(c, p[2], p[3], p[4], p[5], 3, col);
    // foot
    R(c, p[4] - 2.5, p[5] - 1.5, 6, 4, boot.o);
    R(c, p[4] - 2, p[5] - 1, 5, 3, boot.c);
    R(c, p[4] - 2, p[5] - 1, 5, 1, boot.h);
  };
  drawLeg(pose.legB || [0.2, 0.1], true);

  // ---- BACK ARM
  const bA = A((pose.armB || [0.3, 0.4])[0], (pose.armB || [0.3, 0.4])[1]);
  const bEx = shX + bA[0] * armLen * dir, bEy = shY + bA[1] * armLen;
  const bHx = bEx + bA[2] * foreLen * dir, bHy = bEy + bA[3] * foreLen;
  segO(c, shX - 1, shY, bEx, bEy, 3.2, { o: pal.o, c: shade(pal.c, -22) });
  segO(c, bEx, bEy, bHx, bHy, 3, { o: pal.o, c: shade(pal.c, -26) });
  R(c, bHx - 1.5, bHy - 1.5, 3, 3, pal.o);
  R(c, bHx - 1, bHy - 1, 2, 2, SKINCOL(pal).c);

  // ---- TORSO
  const tw = 7 + crouch * 1.5, th = hipY - shY + 3;
  const tx = shX - tw / 2, ty = shY - 2;
  R(c, tx - 1, ty - 1, tw + 2, th + 2, pal.o);
  R(c, tx, ty, tw, th, CLOTH(pal).c);
  R(c, tx, ty, tw, 2, CLOTH(pal).h);
  R(c, tx, ty + th - 2, tw, 2, CLOTH(pal).s);
  // chest strap / vest
  if (pal.vest) { R(c, tx + 1, ty + 2, tw - 2, 3, shade(pal.vest, -30)); R(c, tx + 1, ty + 2, tw - 2, 1, pal.vest); }
  if (opts.belt) { R(c, tx - 1, hipY - 1, tw + 2, 2, pal.o); R(c, tx, hipY, tw, 1, '#3a2a1a'); }

  // ---- HEAD
  const hx = shX + 1.5 + (pose.headX || 0) * dir, hy = shY - 4 + crouch * 1;
  const tilt = pose.headTilt || 0;
  c.save();
  c.translate(hx, hy); c.rotate(tilt * 0.25);
  // neck
  R(c, -1.5, 2, 3, 4, pal.o); R(c, -1, 2, 2, 3, SKINCOL(pal).c);
  ellipseO(c, 0, 0, 3.6, 4, SKINCOL(pal));
  // face features
  c.fillStyle = '#1a1018';
  c.fillRect(1, -1, 1, 2); c.fillRect(3, -1, 1, 1);
  R(c, 2, 2, 2, 1, '#8a4a3a');
  // hair / hat / bandana
  if (pal.hat === 'cap') {
    R(c, -4, -4, 8, 3, pal.o); R(c, -3, -4, 6, 2, pal.band);
    R(c, 2, -2, 4, 2, pal.o); R(c, 2, -2, 3, 1, pal.bandH);
  } else if (pal.hat === 'helmet') {
    ellipseO(c, 0, -1, 4.4, 3.8, { o: pal.o, c: pal.band, h: pal.bandH, s: shade(pal.band, -24) });
    R(c, 3, -2, 4, 2, pal.o); R(c, 3, -2, 3, 1, pal.bandH);
    R(c, -1, -5, 3, 2, pal.o);
  } else if (pal.hat === 'hood') {
    ellipseO(c, -0.5, -0.5, 4.6, 4.8, { o: pal.o, c: pal.c, h: pal.h, s: pal.s });
    R(c, 1, -1, 2, 2, pal.o);
  } else {
    // bandana with knot
    R(c, -4, -3, 8, 3, pal.o); R(c, -4, -3, 7, 2, pal.band); R(c, -4, -3, 7, 1, pal.bandH);
    R(c, -6, -2, 2, 2, pal.o); R(c, -6, -2, 1, 1, pal.band);
  }
  c.restore();

  // ---- FRONT LEG
  drawLeg(pose.legF || [-0.2, 0.1], false);

  // ---- FRONT ARM + WEAPON
  const fA = A((pose.armF || [-0.4, 0.3])[0], (pose.armF || [-0.4, 0.3])[1]);
  const fEx = shX + fA[0] * armLen * dir, fEy = shY + fA[1] * armLen;
  const fHx = fEx + fA[2] * foreLen * dir, fHy = fEy + fA[3] * foreLen;
  segO(c, shX + 1, shY, fEx, fEy, 3.4, CLOTH(pal));
  segO(c, fEx, fEy, fHx, fHy, 3.1, CLOTH(pal));
  // hand
  R(c, fHx - 1.5, fHy - 1.5, 3.5, 3.5, pal.o);
  R(c, fHx - 1, fHy - 1, 2.5, 2.5, SKINCOL(pal).c);
  R(c, fHx - 1, fHy - 1, 2.5, 1, SKINCOL(pal).h);
  // weapon in hand
  if (pose.gun && pose.gun !== 'none' && !opts.hideGun) {
    c.save();
    c.translate(fHx, fHy);
    const ga = pose.aim !== undefined ? pose.aim : (Math.atan2(fA[3], fA[2] * dir));
    c.rotate(ga);
    c.scale(1, dir);
    drawWeapon(c, pose.gun, pal);
    c.restore();
  }
  return { handX: fHx, handY: fHy };
}

function shade(hex, amt) {
  const h = hex.replace('#', '');
  let r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16);
  r = clamp(r + amt, 0, 255); g = clamp(g + amt, 0, 255); b = clamp(b + amt, 0, 255);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
function mix(a, b, t) {
  const p = h => { h = h.replace('#', ''); return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
  const A = p(a), B = p(b);
  return '#' + A.map((v, i) => clamp(Math.round(v + (B[i] - v) * t), 0, 255).toString(16).padStart(2, '0')).join('');
}
