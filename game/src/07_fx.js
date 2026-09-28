/* ============================================================
   07 - PARTICLES & FEEDBACK FX
   ============================================================ */
const Particles = [];
const Texts = [];
const MAXP = 900;

class Particle {
  constructor() { this.dead = true; }
  init(o) {
    this.x = o.x; this.y = o.y; this.vx = o.vx || 0; this.vy = o.vy || 0;
    this.g = o.g === undefined ? 0 : o.g;
    this.life = o.life || 0.5; this.t = 0;
    this.kind = o.kind || 'spark';
    this.col = o.col || '#ffffff';
    this.col2 = o.col2 || null;
    this.size = o.size || 2;
    this.rot = o.rot || 0; this.vr = o.vr || 0;
    this.fade = o.fade !== false;
    this.drag = o.drag || 0;
    this.bounce = o.bounce || 0;
    this.glow = o.glow || false;
    this.sprite = o.sprite || null;
    this.scale = o.scale || 1;
    this.dead = false;
    return this;
  }
  update(dt, world) {
    this.t += dt;
    if (this.t >= this.life) { this.dead = true; return; }
    this.vy += this.g * dt;
    if (this.drag) { const d = Math.pow(1 - this.drag, dt * 60); this.vx *= d; this.vy *= d; }
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.rot += this.vr * dt;
    if (this.bounce && world) {
      const gy = world.groundBelow(this.x, this.y);
      if (gy !== null && this.y > gy && this.vy > 0) { this.y = gy; this.vy = -this.vy * 0.42; this.vx *= 0.7; }
    }
  }
  draw(c) {
    const k = this.t / this.life;
    const a = this.fade ? clamp(1 - k * k, 0, 1) : 1;
    c.save();
    c.globalAlpha = a;
    switch (this.kind) {
      case 'smoke': {
        const s = this.size * (0.5 + k * 0.85);
        c.fillStyle = this.col;
        c.globalAlpha = a * 0.85;
        c.beginPath(); c.arc(this.x, this.y, s, 0, TAU); c.fill();
        c.beginPath(); c.arc(this.x - s * 0.25, this.y - s * 0.3, s * 0.6, 0, TAU); c.fill();
        c.beginPath(); c.arc(this.x + s * 0.3, this.y + s * 0.2, s * 0.5, 0, TAU); c.fill();
        break;
      }
      case 'ring': {
        c.strokeStyle = this.col; c.lineWidth = Math.max(0.6, 3 * (1 - k));
        c.beginPath(); c.arc(this.x, this.y, this.size * (0.3 + k * 2.2), 0, TAU); c.stroke();
        break;
      }
      case 'shockring': {
        // flat, ground-hugging dust ring - reads as pressure, not a magic circle
        c.strokeStyle = this.col;
        c.lineWidth = Math.max(0.8, 4 * (1 - k));
        c.beginPath();
        c.ellipse(this.x, this.y, this.size * (0.3 + k * 2.4), this.size * (0.12 + k * 0.4), 0, 0, TAU);
        c.stroke();
        break;
      }
      case 'spark': {
        c.fillStyle = this.col;
        const L = this.size * (1 - k * 0.5);
        c.fillRect(this.x - L / 2, this.y - 0.5, L, 1.2);
        c.fillStyle = this.col2 || '#ffffff';
        c.fillRect(this.x - 0.5, this.y - 0.5, 1.2, 1.2);
        break;
      }
      case 'debris': {
        c.translate(this.x, this.y); c.rotate(this.rot);
        c.fillStyle = this.col;
        c.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        c.fillStyle = this.col2 || 'rgba(0,0,0,0.3)';
        c.fillRect(-this.size / 2, this.size / 2 - 1, this.size, 1);
        break;
      }
      case 'shell': case 'cas': {
        c.translate(this.x, this.y); c.rotate(this.rot);
        c.fillStyle = this.col; c.fillRect(-1.5, -1, 3, 2);
        c.fillStyle = '#f0e090'; c.fillRect(-1.5, -1, 3, 1);
        break;
      }
      case 'goo': {
        c.fillStyle = this.col;
        c.beginPath(); c.arc(this.x, this.y, this.size * (1 - k * 0.4), 0, TAU); c.fill();
        break;
      }
      case 'flame': {
        // soft additive puff that cools from white-hot to deep red
        const s = this.size * (1.15 - k * 0.55);
        c.globalCompositeOperation = 'lighter';
        const g = c.createRadialGradient(this.x, this.y, 0, this.x, this.y, s);
        const hot = this.col, cool = this.col2 || '#701808';
        g.addColorStop(0, mix(hot, '#ffffff', 0.35 * (1 - k)));
        g.addColorStop(0.45, mix(hot, cool, k * 0.8));
        g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g;
        c.beginPath(); c.arc(this.x, this.y, s, 0, TAU); c.fill();
        break;
      }
      case 'text': {
        c.globalAlpha = k > 0.75 ? (1 - k) * 4 : 1;
        text(c, this.txt, this.x, this.y - k * 12, this.col, this.size >= 2 ? 1 : 1, 'c');
        break;
      }
      case 'flash': {
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = a;
        c.fillStyle = this.col;
        c.beginPath(); c.arc(this.x, this.y, this.size * (1 + k * 1.4), 0, TAU); c.fill();
        break;
      }
      case 'blast': {
        const spr = this.sprite || explosionSprite(0);
        // expand slightly as it plays out
        const grow = 1 + (1 - a) * 0.18;
        const w = spr.width * this.scale * grow, h = spr.height * this.scale * grow;
        c.translate(this.x, this.y); c.rotate(this.rot);
        c.drawImage(spr, -w / 2, -h / 2, w, h);
        break;
      }
      case 'trail': {
        c.globalAlpha = a * 0.6;
        c.fillStyle = this.col;
        c.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        break;
      }
    }
    c.restore();
  }
}
const _pool = [];
function emit(o) {
  let p;
  if (Particles.length < MAXP) { p = _pool.pop() || new Particle(); Particles.push(p); }
  else { p = Particles[(Math.random() * Particles.length) | 0]; }
  p.init(o);
  return p;
}
function updateParticles(dt, world) {
  for (let i = Particles.length - 1; i >= 0; i--) {
    const p = Particles[i];
    p.update(dt, world);
    if (p.dead) { Particles.splice(i, 1); _pool.push(p); }
  }
  for (let i = Texts.length - 1; i >= 0; i--) {
    const t = Texts[i];
    t.t += dt; t.y += t.vy * dt; t.vy += 40 * dt;
    if (t.t > t.life) Texts.splice(i, 1);
  }
}
function drawParticles(c) {
  for (let i = 0; i < Particles.length; i++) Particles[i].draw(c);
  for (let i = 0; i < Texts.length; i++) {
    const t = Texts[i];
    text(c, t.txt, t.x, t.y, t.col, 1, 'c');
  }
}

/* --- composite effects --- */
const FX = {
  shake(a) { G.shake = Math.min(14, Math.max(G.shake, a)); },
  hitStop(t) { G.hitStop = Math.max(G.hitStop, t); },
  popup(x, y, txt, col) { Texts.push({ x, y, txt: String(txt), col: col || '#ffffff', t: 0, life: 0.9, vy: -34 }); },
  hit(x, y, col, n) {
    n = n || 6;
    for (let i = 0; i < n; i++) {
      const a = rnd(0, TAU), s = rnd(40, 190);
      emit({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, g: 400, life: rnd(0.15, 0.4), kind: 'spark', col: col || '#ffd060', col2: '#ffffff', size: rnd(2, 5) });
    }
    emit({ x, y, life: 0.14, kind: 'flash', col: 'rgba(255,240,180,0.7)', size: 5, glow: true });
  },
  blood(x, y, col, n) {
    n = n || 8;
    for (let i = 0; i < n; i++) {
      const a = rnd(0, TAU), s = rnd(30, 150);
      emit({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, g: 620, life: rnd(0.25, 0.6), kind: 'goo', col: col || '#c03a3a', size: rnd(1.5, 3.2), bounce: 1 });
    }
  },
  dust(x, y, n, col) {
    n = n || 3;
    for (let i = 0; i < n; i++) {
      emit({ x: x + rnd(-4, 4), y: y + rnd(-2, 1), vx: rnd(-30, -5), vy: rnd(-40, -6), g: 60, life: rnd(0.25, 0.5), kind: 'smoke', col: col || 'rgba(200,180,140,0.6)', size: rnd(2, 4) });
    }
  },
  shell(x, y, dir) {
    emit({ x, y, vx: -dir * rnd(20, 60), vy: rnd(-90, -40), g: 700, life: 0.7, kind: 'shell', col: '#e0c060', rot: rnd(0, 6), vr: rnd(-14, 14), bounce: 1 });
  },
  smokeTrail(x, y, col, size) {
    emit({ x: x + rnd(-1, 1), y: y + rnd(-1, 1), vx: rnd(-8, 8), vy: rnd(-14, -4), life: rnd(0.4, 0.8), kind: 'smoke', col: col || 'rgba(120,120,130,0.55)', size: size || 2.5 });
  },
  fireTrail(x, y) {
    emit({ x, y, vx: rnd(-14, 14), vy: rnd(-18, 6), life: rnd(0.16, 0.34), kind: 'flame', col: '#f8d040', col2: '#d03a10', size: rnd(2, 4) });
    if (chance(0.5)) emit({ x, y, vx: rnd(-10, 10), vy: rnd(-24, -6), life: rnd(0.3, 0.6), kind: 'smoke', col: 'rgba(60,55,55,0.5)', size: rnd(2, 4) });
  },
  explosion(x, y, power, col) {
    power = power || 1;
    const n = Math.round(9 * power);
    emit({ x, y, life: 0.26, kind: 'flash', col: 'rgba(255,240,200,0.95)', size: 10 * power, glow: true });
    emit({ x, y, life: 0.3, kind: 'shockring', col: 'rgba(255,225,170,0.75)', size: 9 * power });
    // a few big hot puffs, many small sparks
    for (let i = 0; i < Math.round(4 * power); i++) {
      const a = rnd(0, TAU), s = rnd(40, 130) * power;
      emit({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 50, g: 120, life: rnd(0.2, 0.4) * power, kind: 'flame', col: '#fff0a0', col2: '#c03a10', size: rnd(7, 12) * power, drag: 0.05 });
    }
    for (let i = 0; i < n; i++) {
      const a = rnd(0, TAU), s = rnd(60, 240) * power;
      emit({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, g: 300, life: rnd(0.15, 0.35) * power, kind: 'spark', col: '#ffe8a0', size: rnd(2, 5) * power, drag: 0.02 });
    }
    for (let i = 0; i < Math.round(6 * power); i++) {
      const a = rnd(0, TAU), s = rnd(10, 70);
      emit({ x: x + rnd(-5, 5), y: y + rnd(-5, 5), vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, life: rnd(0.7, 1.4), kind: 'smoke', col: 'rgba(64,58,58,0.5)', size: rnd(2.5, 4.5) * power, drag: 0.02 });
    }
    for (let i = 0; i < Math.round(8 * power); i++) {
      const a = rnd(0, TAU), s = rnd(60, 260) * power;
      emit({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, g: 800, life: rnd(0.5, 1.1), kind: 'debris', col: '#5a5048', col2: '#2a2520', size: rnd(2, 4), rot: rnd(0, 6), vr: rnd(-12, 12), bounce: 1 });
    }
    for (let i = 0; i < Math.round(5 * power); i++) {
      const a = rnd(0, TAU), s = rnd(80, 300);
      emit({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 300, life: rnd(0.2, 0.45), kind: 'spark', col: '#fff0a0', size: rnd(3, 7) });
    }
    this.shake(3 + power * 3);
  },
  bigExplosion(x, y, power) {
    this.explosion(x, y, power);
    SFX('explodeBig');
    this.hitStop(0.05 + power * 0.03);
  },
  /** three-frame expanding fireball used for grenades, rockets and barrels */
  fireball(x, y, power) {
    power = power || 1;
    // one big flash frame, then a smaller cooling frame - overlapping many
    // translucent balls reads as mush, so keep it to a tight two-frame pop
    emit({ x, y, life: 0.1, kind: 'blast', sprite: explosionSprite(0), scale: 0.95 * power, rot: rnd(-0.25, 0.25) });
    emit({ x, y, life: 0.19, kind: 'blast', sprite: explosionSprite(1), scale: 1.25 * power, rot: rnd(-0.3, 0.3) });
  },
  muzzle(x, y, ang, big) {
    emit({ x, y, life: 0.05, kind: 'flash', col: 'rgba(255,240,190,0.9)', size: big ? 14 : 8, glow: true });
    for (let i = 0; i < (big ? 5 : 2); i++) {
      const a = ang + rnd(-0.3, 0.3);
      emit({ x, y, vx: Math.cos(a) * rnd(80, 200), vy: Math.sin(a) * rnd(80, 200), life: rnd(0.05, 0.14), kind: 'spark', col: '#fff0a0', size: rnd(2, 4) });
    }
  },
  bounceDust(x, y) { this.dust(x, y, 3); },
  hurtFlash() { this.shake(2.5); },
};
