/* ============================================================
   08 - WEAPONS, BULLETS, GRENADES
   ============================================================ */
// Range is measured in world pixels (one screen = 480), independently of shot speed.
const WEAPONS = {
  pistol: { name: 'PISTOL', sfx: 'pistol', dmg: 2, range: 320, rate: 0.24, auto: true, speed: 360, ammo: Infinity, blt: 'pistol', kick: 18, shake: 0.5, muzzle: 1 },
  mg: { name: 'MACHINE GUN', sfx: 'mg', dmg: 1.25, range: 420, rate: 0.085, auto: true, speed: 460, ammo: 200, blt: 'mg', kick: 10, shake: 0.35, muzzle: 1, spread: 0.025 },
  shotgun: { name: 'SPREAD GUN', sfx: 'shotgun', dmg: 1.5, range: 180, falloffStart: 60, minDamage: 0.3, rate: 0.65, auto: false, speed: 380, ammo: 24, blt: 'shotgun', kick: 44, shake: 1.8, muzzle: 2, pellets: 7, spread: 0.18 },
  flame: { name: 'FLAMETHROWER', sfx: 'flame', dmg: 0.65, range: 100, rate: 0.065, auto: true, speed: 220, ammo: 180, blt: 'flame', kick: 3, shake: 0.15, muzzle: 0, flame: true, spread: 0.06 },
  rocket: { name: 'ROCKET LAUNCHER', sfx: 'rocket', dmg: 20, range: 640, rate: 0.9, auto: false, speed: 320, ammo: 8, blt: 'rocket', kick: 60, shake: 3, muzzle: 2, explode: 1.15, grav: 0, selfSafe: true },
  laser: { name: 'LASER RIFLE', sfx: 'laser', dmg: 5, range: 560, rate: 0.22, auto: true, speed: 480, ammo: 60, blt: 'laser', kick: 6, shake: 0.45, muzzle: 2, armorPiercing: true },
};
const WEAPON_KEYS = ['pistol', 'mg', 'shotgun', 'flame', 'rocket', 'laser'];

class Bullet {
  constructor(o) {
    this.x = o.x; this.y = o.y; this.vx = o.vx; this.vy = o.vy;
    this.dmg = o.dmg; this.baseDamage = o.dmg;
    this.range = o.range ?? Infinity; this.travelled = 0; this.rangeEnded = false;
    this.falloffStart = o.falloffStart ?? Infinity; this.minDamage = o.minDamage ?? 1;
    this.armorPiercing = !!o.armorPiercing;
    this.life = o.life || 0.5; this.t = 0;
    this.own = o.own || 'p'; this.kind = o.kind || 'pistol';
    this.r = o.r || 2; this.grav = o.grav || 0;
    this.explode = o.explode || 0; this.dead = false;
    this.rot = Math.atan2(this.vy, this.vx);
    this.pierce = o.pierce || 0; this.hitList = null;
    this.sx = this.x; this.sy = this.y;
    this.flame = o.flame || false;
    this.color = o.color || null;
    this.crit = o.crit || false;
  }
  update(dt, w) {
    if (this.dead) return;
    if (this.rangeEnded) { this.onEnd(w); return; }
    this.t += dt;
    if (this.t >= this.life) { this.onEnd(w); return; }
    this.sx = this.x; this.sy = this.y;
    this.vy += this.grav * dt;
    const dx = this.vx * dt, dy = this.vy * dt;
    const distance = Math.hypot(dx, dy);
    const movement = Math.min(distance, Math.max(0, this.range - this.travelled));
    const fraction = distance > 0 ? movement / distance : 0;
    this.x += dx * fraction; this.y += dy * fraction;
    this.travelled += movement;
    this.rangeEnded = this.travelled >= this.range;
    if (this.travelled > this.falloffStart) {
      const fade = clamp((this.travelled - this.falloffStart) / (this.range - this.falloffStart), 0, 1);
      this.dmg = this.baseDamage * lerp(1, this.minDamage, fade);
    }
    this.rot = Math.atan2(this.vy, this.vx);
    if (this.flame) {
      FX.fireTrail(this.x, this.y);
      if (chance(0.4)) emit({ x: this.x, y: this.y, vx: rnd(-20, 20), vy: rnd(-20, 10), life: 0.2, kind: 'spark', col: '#ffb040', size: 2 });
    } else if (this.explode) {
      if (chance(0.7)) FX.smokeTrail(this.x - Math.cos(this.rot) * 4, this.y - Math.sin(this.rot) * 4, 'rgba(200,200,210,0.5)', 2);
      if (chance(0.5)) emit({ x: this.x, y: this.y, life: 0.12, kind: 'flash', col: 'rgba(255,220,150,0.6)', size: 4 });
    } else if (this.kind === 'laser' || this.kind === 'ebolt') {
      if (chance(0.5)) emit({ x: this.x, y: this.y, vx: 0, vy: 0, life: 0.1, kind: 'trail', col: this.kind === 'laser' ? 'rgba(80,240,240,0.7)' : 'rgba(160,120,255,0.6)', size: 3 });
    }
    // world collision
    if (w.solidAt(this.x, this.y) || w.solidAt(this.x - Math.sign(this.vx) * 2, this.y) || w.solidAt(this.x, this.y - Math.sign(this.vy) * 2)) {
      this.onHitWall(w);
      return;
    }
    if (this.y > VH + 400) this.dead = true;
  }
  onHitWall(w) {
    if (this.explode) { this.boom(w); return; }
    FX.hit(this.x, this.y, this.kind === 'laser' ? '#60f0f0' : '#ffd060', 4);
    if (this.kind === 'ebolt') FX.hit(this.x, this.y, '#b090ff', 4);
    SFX('hit', { v: 0.5, pitch: rnd(0.9, 1.3) });
    this.dead = true;
  }
  onEnd(w) {
    if (this.explode) this.boom(w);
    this.dead = true;
  }
  boom(w) {
    const p = this.explode * 0.8 + 0.3;
    FX.fireball(this.x, this.y, p);
    FX.bigExplosion(this.x, this.y, p);
    w.explodeDamage(this.x, this.y, this.dmg, this.explode * 42 + 16, this.own);
    this.dead = true;
  }
  draw(c, camX, camY) {
    const spr = bulletSprite(this.kind);
    c.save();
    c.translate(this.x - camX, this.y - camY);
    c.rotate(this.rot);
    if (this.flame) {
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = 0.9;
    }
    c.drawImage(spr, -3, -4);
    c.restore();
  }
}

/* ---------- grenades ---------- */
class Grenade {
  constructor(x, y, vx, vy, own, fuse) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.own = own || 'p';
    this.fuse = fuse === undefined ? 1.5 : fuse;
    this.rot = 0; this.vr = 8;
    this.dead = false; this.bounces = 0;
    this.r = 4;
  }
  update(dt, w) {
    this.fuse -= dt;
    this.rot += this.vr * dt;
    this.vy += 620 * dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    // tile bounce
    if (w.solidAt(this.x, this.y)) {
      // try axis separation
      const hitX = w.solidAt(this.x + Math.sign(this.vx) * 3, this.y - 1);
      const hitY = w.solidAt(this.x, this.y + Math.sign(this.vy) * 3);
      if (hitY) { this.y -= Math.sign(this.vy) * 3; this.vy = -this.vy * 0.42; this.vr = -this.vr * 0.6; SFX('bounce', { pitch: rnd(0.8, 1.3) }); }
      if (hitX) { this.x -= Math.sign(this.vx) * 3; this.vx = -this.vx * 0.45; }
      if (!hitX && !hitY) { this.vy = -this.vy * 0.4; this.y -= 1; }
      this.bounces++;
      if (this.vy < -60) { this.vx *= 0.8; }
    }
    if (w.solidAt(this.x, this.y - 1) && this.vy < 0) { this.y += 1; this.vy = Math.abs(this.vy) * 0.4; }
    if (this.fuse <= 0) this.boom(w);
    if (this.x < w.camX - 60 || this.x > w.camX + VW + 60) this.dead = true;
  }
  boom(w) {
    SFX('explode');
    FX.fireball(this.x, this.y, 1.15);
    FX.explosion(this.x, this.y, 1.1);
    w.explodeDamage(this.x, this.y, 95, 62, this.own);
    this.dead = true;
  }
  draw(c, camX, camY) {
    c.save();
    c.translate(this.x - camX, this.y - camY);
    c.rotate(this.rot);
    c.fillStyle = '#141018'; c.fillRect(-4, -4, 8, 8);
    c.fillStyle = '#3a5a3a'; c.fillRect(-3, -3, 6, 6);
    c.fillStyle = '#5a8a5a'; c.fillRect(-3, -3, 6, 2);
    c.fillStyle = '#8a8a92'; c.fillRect(-1, -6, 2, 3);
    const blink = (this.fuse < 0.6 && (G.time * 12 | 0) % 2) ? '#ff4030' : '#c8b070';
    c.fillStyle = blink; c.fillRect(1, -7, 2, 2);
    c.restore();
  }
}

/* ---------- laser sight line (sniper telegraph) ---------- */
class LaserLine {
  constructor(x, y, ang, t) { this.x = x; this.y = y; this.ang = ang; this.t = t; this.max = t; this.dead = false; this.fired = false; }
  update(dt, w) {
    if(this.dead)return;
    if(this.owner && this.owner.dead){this.dead=true;return;}
    this.length=460;
    for(let d=4;d<460;d+=4)if(w.solidAt(this.x+Math.cos(this.ang)*d,this.y+Math.sin(this.ang)*d)){this.length=d;break;}
    this.t -= dt;
    if (this.t <= 0) {
      this.dead = true;
      if (!this.fired) {
        this.fired=true;
        SFX('laser', { v: 0.9, pitch: 0.6 });
        const ex = this.x + Math.cos(this.ang) * (this.length || 460), ey = this.y + Math.sin(this.ang) * (this.length || 460);
        w.beamHit(this.x, this.y, ex, ey, 26, this.own || 'e');
        FX.hit(this.x + Math.cos(this.ang) * 6, this.y + Math.sin(this.ang) * 6, '#60f0f0', 8);
      }
    }
  }
  draw(c, camX, camY) {
    const a = 1 - Math.abs(this.t / this.max - 0.5) * 2;
    c.save();
    c.globalAlpha = 0.35 + 0.45 * a;
    c.strokeStyle = '#ff3020';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(this.x - camX, this.y - camY);
    c.lineTo(this.x - camX + Math.cos(this.ang) * (this.length || 460), this.y - camY + Math.sin(this.ang) * (this.length || 460));
    c.stroke();
    c.globalAlpha = 0.9;
    c.strokeStyle = '#ffffff';
    c.lineWidth = 1;
    c.stroke();
    c.restore();
  }
}
