/* ============================================================
   13 - BOSS: "IRON MAW" tier-9 siege machine
   ============================================================ */
/* widest part of the machine (hull 168 wide, but the missile pod overhangs
   to x+188 and the head juts out to x-26) - used to frame the fight */
const BOSS_W = 190;
class Boss {
  constructor(w) {
    this.w = w;
    this.x = w.camX + VW + 120; this.y = Level.groundYAt(0) - 96;
    this.vx = 0; this.vy = 0;
    this.face = -1;
    this.hp = 260; this.maxHp = 260;
    this.phase = 0;
    this.state = 'enter'; this.t = 0; this.atkT = 2;
    this.parts = {
      head: { key: 'head', x: 0, y: 0, w: 66, h: 52, hp: 60, max: 60, broken: false },
      cannon: { key: 'cannon', x: 0, y: 0, w: 78, h: 34, hp: 55, max: 55, broken: false },
      pod: { key: 'pod', x: 0, y: 0, w: 56, h: 40, hp: 55, max: 55, broken: false },
      core: { key: 'core', x: 0, y: 0, w: 34, h: 34, hp: 90, max: 90, broken: false, hidden: true },
    };
    this.dead = false; this.deathT = 0;
    this.flash = 0; this.slamY = 0; this.charge = 0;
    this.summoned = 0; this.beamT = 0; this.beamWarn = 0;
    this.roar = false;
    this.shakeT = 0;
    this.intro = 0;
  }
  get cx() { return this.x + 84; }
  get cy() { return this.y + 48; }
  get top() { return this.y; }

  layout() {
    const p = this.parts;
    p.head.x = this.x - 26; p.head.y = this.y + 2;
    p.cannon.x = this.x + 8; p.cannon.y = this.y + 34;
    p.pod.x = this.x + 132; p.pod.y = this.y + 16;
    p.core.x = this.x + 66; p.core.y = this.y + 30;
  }

  start(w) {
    this.state = 'enter';
    this.intro = 0;
    SFX('bossRoar');
    FX.shake(9);
    w.lockCamera(true);
    w.msg('WARNING!  TIER-9 SIEGE MACHINE', '#ff4030', 2.6);
    w.msg('IRON MAW', '#ffd040', 2.0);
    Audio_.playMusic('boss');
  }

  hurt(part, dmg, w) {
    const p = this.parts[part];
    if (this.dead || !p || p.broken || p.hidden) { FX.hit(this.cx, this.y + 20, '#c0c0d0', 4); SFX('hitArmor', { v: 0.4 }); return; }
    const dealt = Math.min(p.hp, dmg);
    p.hp = Math.max(0, p.hp - dmg);
    this.flash = 0.6;
    FX.hit(p.x + p.w / 2, p.y + p.h / 2, '#ffd060', 5);
    SFX('hitArmor', { v: 0.5 });
    if (p.hp <= 0) {
      p.broken = true;
      FX.fireball(p.x + p.w / 2, p.y + p.h / 2, 1.4);
      FX.explosion(p.x + p.w / 2, p.y + p.h / 2, 1.4);
      FX.shake(6);
      SFX('explodeBig');
      if (part === 'cannon' || part === 'pod') {
        this.checkPhase();
        if (this.parts.cannon.broken && this.parts.pod.broken) {
          this.parts.core.hidden = false;
          w.msg('CORE EXPOSED!', '#ffd040', 2);
        }
      }
    }
    this.hp = Math.max(0, this.hp - dealt);
    this.checkPhase();
    if (this.parts.core.broken || this.hp <= 0) this.die(w);
  }
  checkPhase() {
    const frac = this.hp / this.maxHp;
    const total = this.parts.cannon.hp + this.parts.pod.hp + (this.parts.core.hidden ? 0 : this.parts.core.hp);
    if (!this.parts.cannon.broken || !this.parts.pod.broken) {
      if (frac < 0.62 && this.phase < 1) {
        this.phase = 1;
        this.w.msg('ENRAGED!', '#ff6040', 1.6);
        this.atkT = 0.4;
      }
    } else if (frac < 0.3 && this.phase < 2) {
      this.phase = 2;
      this.w.msg('FINAL FORM!', '#ff3020', 1.8);
      this.atkT = 0.3;
    }
  }

  die(w) {
    if (this.dead) return;
    this.dead = true; this.deathT = 0;
    this.hp = 0;
    Audio_.playMusic('action');
  }

  update(dt, w) {
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt * 3);
    if (this.shakeT > 0) this.shakeT -= dt;
    const p = w.player;

    if (this.dead) {
      this.deathT += dt;
      this.vx *= 0.9;
      this.x += this.vx * dt;
      if (this.deathT < 2.6) {
        if (chance(0.55)) {
          const ex = this.x + rnd(20, 150), ey = this.y + rnd(10, 90);
          FX.fireball(ex, ey, 0.9);
          FX.explosion(ex, ey, 0.8);
          SFX('explode', { v: 0.7 });
          FX.shake(4);
        }
        if (this.deathT > 0.6 && chance(0.3)) FX.smokeTrail(this.x + rnd(0, 160), this.y + rnd(0, 90), 'rgba(60,55,55,0.7)', 4);
      }
      if (this.deathT > 1.4 && !this.finalExplosions) {
        this.finalExplosions = true;
        for (let i = 0; i < 5; i++) {
          setTimeout(() => { if (w.active) { FX.fireball(this.x + rnd(0,160), this.y + rnd(0,90), 2.0); FX.explosion(this.x + rnd(0,160), this.y + rnd(0,90), 1.6); FX.shake(10); SFX("explodeBig"); } }, i * 130);
        }
      }
      if (this.deathT > 2.6) { w.bossDefeated(); }
      return;
    }

    const gy = Level.groundYAt(this.cx);
    this.layout();
    const targetY = gy - 96;
    const speed = this.phase >= 2 ? 46 : this.phase >= 1 ? 38 : 30;

    switch (this.state) {
      case 'enter': {
        this.intro += dt;
        this.x -= 90 * dt;
        this.y = lerp(this.y, targetY, 0.05);
        this.bobT = (this.bobT || 0) + dt;
        this.bob = Math.sin(this.bobT * 6) * 2;
        if (chance(0.6)) FX.dust(this.x + 20 + rnd(0, 140), this.y + 96, 1, 'rgba(160,150,130,0.5)');
        if (this.x < w.camX + VW - BOSS_W - 20) {
          this.state = 'fight';
          w.msg('DESTROY IT!', '#ffffff', 1.6);
          FX.shake(6);
          w.bossActive = true;
        }
        break;
      }
      case 'fight': {
        this.bobT = (this.bobT || 0) + dt;
        this.bob = Math.sin(this.bobT * 5) * 1.6;
        // pacing
        this.atkT -= dt;
        if (this.atkT <= 0) {
          const roll = Math.random();
          if (this.phase === 0) this.atk = roll < 0.45 ? 'cannon' : roll < 0.75 ? 'slam' : 'summon';
          else if (this.phase === 1) this.atk = roll < 0.3 ? 'cannon' : roll < 0.55 ? 'missiles' : roll < 0.8 ? 'slam' : 'beam';
          else this.atk = roll < 0.28 ? 'cannon' : roll < 0.5 ? 'missiles' : roll < 0.68 ? 'slam' : roll < 0.85 ? 'beam' : 'summon';
          this.atkPhase = 0;
          this.actT = 0;
          this.act = this.atk;
          if (this.act === 'slam') { this.actT = 0.75; SFX('engine', { v: 0.8 }); }
          if (this.act === 'beam') { this.beamWarn = 0.9; SFX('alarm', { v: 0.5 }); }
          this.atkT = this.phase >= 2 ? rnd(1.5, 2.3) : this.phase >= 1 ? rnd(1.9, 2.8) : rnd(2.4, 3.4);
        }
        this.runAttack(dt, w, p);
        // movement: pace across the right-hand half of the arena
        const center = w.camX + VW - BOSS_W - 40;
        if (this.x > center + 40) this.vx = -speed;
        else if (this.x < center - 60) this.vx = speed;
        else this.vx = Math.sin(this.t * 0.6) * speed * 0.6;
        if (this.act === 'slam' && this.actPhase === 1) this.vx = 0;
        this.x += this.vx * dt;
        this.x = clamp(this.x, w.camX + 20, w.camX + VW - BOSS_W - 14);
        this.y = lerp(this.y, targetY, 0.08);
        this.face = -1;
        if (chance(0.35)) FX.smokeTrail(this.x + rnd(10, 150), this.y - 6, 'rgba(90,85,85,0.5)', 3);
        break;
      }
    }
  }

  runAttack(dt, w, p) {
    this.actT -= dt;
    const a = Math.atan2(p.cy - (this.y + 46), p.cx - (this.cx));
    switch (this.act) {
      case 'cannon': {
        this.actPhase = 0;
        if (this.parts.cannon.broken) { this.act = 'summon'; this.actT = 0.6; break; }
        if (this.actT <= 0) {
          this.actT = 0.16;
          this.burst = (this.burst || 0) + 1;
          const cx = this.parts.cannon.x + 40, cy = this.parts.cannon.y + 16;
          for (let i = -1; i <= 1; i++) {
            const ang = a + i * 0.16;
            w.bullets.push(new Bullet({ x: cx, y: cy, vx: Math.cos(ang) * 215, vy: Math.sin(ang) * 215, dmg: 14, life: 2.4, own: 'e', kind: 'ebolt', r: 3 }));
          }
          FX.muzzle(cx + 30, cy, a, true);
          SFX('cannon', { v: 0.5 });
          FX.shake(1.5);
          if (this.burst >= (this.phase >= 1 ? 4 : 3)) { this.burst = 0; this.act = null; }
        }
        break;
      }
      case 'missiles': {
        this.actPhase = 0;
        if (this.actT <= 0) {
          this.actT = 0.18;
          this.burst = (this.burst || 0) + 1;
          const px = this.parts.pod.x + 28, py = this.parts.pod.y + 20;
          const ang = a + rnd(-0.5, 0.5);
          w.bullets.push(new Bullet({ x: px, y: py, vx: Math.cos(ang) * 120, vy: Math.sin(ang) * 120 - 40, dmg: 16, life: 3.2, own: 'e', kind: 'grenade', grav: 150, explode: 0.6, selfSafe: true }));
          SFX('thrown', { v: 0.5 });
          FX.muzzle(px, py, ang, false);
          if (this.burst >= 5) { this.burst = 0; this.act = null; }
        }
        break;
      }
      case 'slam': {
        this.actPhase = this.actT > 0.2 ? 0 : 1;
        if (this.actT <= 0) {
          this.act = null;
          this.shakeT = 0.4;
          FX.shake(10);
          SFX('explodeBig', { v: 0.6 });
          for (let i = 0; i < 5; i++) {
            const sx = this.x + 20 + rnd(0, 130), sy = this.y + 80 + rnd(0, 16);
            FX.fireball(sx, sy, 0.7);
            FX.explosion(sx, sy, 0.5);
          }
          const gy = Level.groundYAt(this.x);
          // shockwaves
          for (let k = 0; k < 2; k++) {
            w.shockwaves.push({ x: this.x + 30, y: gy - 6, vx: (k ? 1 : -1) * 190, life: 1.6, t: 0 });
          }
          // falling debris
          for (let i = 0; i < 5; i++) {
            w.bullets.push(new Bullet({ x: this.x + rnd(10, 150), y: this.y - 10, vx: rnd(-30, 30), vy: 60, dmg: 16, life: 3, own: 'e', kind: 'grenade', grav: 300, explode: 0.5, selfSafe: true }));
          }
        }
        break;
      }
      case 'beam': {
        this.actPhase = 0;
        this.beamWarn -= dt;
        if (this.beamWarn <= 0 && !this.beamed) {
          this.beamed = true;
          const hy = this.y + 30;
          w.bossBeams.push({ x: this.x - 20, y: hy, t: 0, life: 0.9, h: 22 });
          SFX('laser', { v: 1, pitch: 0.4 });
          FX.shake(4);
        }
        if (this.beamed && this.actT <= 0) { this.act = null; this.beamed = false; this.beamWarn = 0; }
        break;
      }
      case 'summon': {
        this.actPhase = 0;
        if (this.actT <= 0) {
          this.act = null;
          for (let i = 0; i < 2; i++) {
            w.spawnEnemy('soldier', this.x + 40 + i * 26, this.y - 40 - i * 10, 'drop');
          }
          w.msg('REINFORCEMENTS!', '#ff8030', 1.2);
        }
        break;
      }
      default: this.actPhase = 0;
    }
    if (!this.act) this.actPhase = 0;
  }

  hitBullets(bullets, w) {
    // returns true if consumed
    for (const b of bullets) {
      if (b.dead) continue;
      for (const k in this.parts) {
        const p = this.parts[k];
        if (p.broken) continue;
        if (k === 'core' && p.hidden) continue;
        if (b.x > p.x && b.x < p.x + p.w && b.y > p.y && b.y < p.y + p.h) {
          this.hurt(k, b.dmg, w);
          if (!b.explode) b.dead = true;
          if (b.explode) { b.boom(w); return true; }
          return true;
        }
      }
      // hull: armoured
      if (b.x > this.x && b.x < this.x + 168 && b.y > this.y + 8 && b.y < this.y + 96) {
        FX.hit(b.x, b.y, '#c0c0d0', 5);
        SFX('hitArmor', { v: 0.35 });
        b.dead = true;
        return true;
      }
    }
    return false;
  }

  draw(c, camX, camY) {
    const x = Math.round(this.x - camX), y = Math.round(this.y - camY + (this.bob || 0));
    c.save();
    if (this.dead) c.globalAlpha = clamp(1 - (this.deathT - 1.6) * 0.8, 0, 1);
    // shadow
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.beginPath(); c.ellipse(x + 84, y + 98, 80, 8, 0, 0, TAU); c.fill();
    const flash = this.flash;
    const drawPart = (key, spr) => {
      const p = this.parts[key];
      const px = Math.round(p.x - camX), py = Math.round(p.y - camY + (this.bob || 0));
      if (p.broken) {
        // torn-off wreck: jagged black stub, torn plating, embers, smoke
        c.save();
        c.fillStyle = '#15151c';
        c.beginPath();
        c.moveTo(px + 2, py + p.h);
        for (let i = 0; i <= 6; i++) {
          const t = i / 6;
          const jag = (i % 2 ? 3 : 9) + hash2(i, p.h) * 8;
          c.lineTo(px + 2 + t * (p.w - 4), py + p.h - 6 - jag);
        }
        c.lineTo(px + p.w - 2, py + p.h);
        c.closePath(); c.fill();
        // exposed frame ribs
        c.strokeStyle = '#3c414c'; c.lineWidth = 2;
        for (let i = 1; i < 4; i++) {
          const xx = px + 4 + (i / 4) * (p.w - 8);
          c.beginPath(); c.moveTo(xx, py + p.h - 4); c.lineTo(xx + rnd(-4, 4), py + 6); c.stroke();
        }
        // hanging cable
        c.strokeStyle = '#22262e'; c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(px + p.w * 0.4, py + 8);
        c.quadraticCurveTo(px + p.w * 0.55, py + 20, px + p.w * 0.3, py + 30);
        c.stroke();
        // embers
        if (chance(0.5)) {
          c.save();
          c.globalCompositeOperation = 'lighter';
          c.globalAlpha = 0.5 + Math.random() * 0.4;
          c.fillStyle = '#ff7020';
          c.fillRect(px + rnd(3, p.w - 6), py + p.h - rnd(8, 18), 3, 2);
          c.restore();
        }
        if (chance(0.35)) FX.smokeTrail(px + rnd(2, p.w - 2), py + 4, 'rgba(70,65,65,0.55)', 3);
        c.restore();
        return;
      }
      c.drawImage(spr, px, py);
      if (flash > 0) { c.save(); c.globalAlpha = flash * 0.55; c.drawImage(whiten(spr), px, py); c.restore(); }
      if (p.hp < p.max * 0.4) {
        if (chance(0.14)) { FX.smokeTrail(px + rnd(4, p.w - 4), py + 4, 'rgba(80,75,75,0.55)', 3); }
      }
    };
    // hull has no weak-point entry of its own
    c.drawImage(bossParts.hull, Math.round(this.x - camX), y);
    // head
    const hd = this.parts.head;
    if (!hd.broken) {
      const hx = Math.round(hd.x - camX), hy = Math.round(hd.y - camY + (this.bob || 0));
      c.save(); c.translate(hx + 33, hy + 22); c.scale(-1, 1);
      const wob = Math.sin(this.t * 3) * 0.05;
      c.rotate(wob);
      c.drawImage(bossParts.head, -33, -22);
      // visor glow
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = 0.5 + 0.3 * Math.sin(this.t * 5);
      c.fillStyle = this.phase >= 1 ? '#ff4020' : '#e0603a';
      c.fillRect(-24, -6, 44, 6);
      c.restore();
      if (this.beamWarn > 0 && this.beamed !== true) {
        c.save(); c.globalAlpha = 0.6; c.fillStyle = '#ff3020'; c.fillRect(-24, -6, 44 * (1 - this.beamWarn), 6); c.restore();
      }
      c.restore();
      if (flash > 0) { c.save(); c.globalAlpha = flash * 0.5; c.drawImage(whiten(bossParts.head), hx, hy); c.restore(); }
    }
    drawPart('cannon', bossParts.cannon);
    drawPart('pod', bossParts.pod);
    // core
    const co = this.parts.core;
    if (!co.hidden) {
      const px = Math.round(co.x - camX), py = Math.round(co.y - camY + (this.bob || 0));
      c.save();
      c.translate(px + 17, py + 17);
      c.rotate(this.t * (co.broken ? 0 : 1.4));
      c.drawImage(bossParts.core, -17, -17);
      c.restore();
      if (!co.broken) {
        c.save();
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = 0.30 + 0.16 * Math.sin(this.t * 6);
        c.drawImage(glowSprite('rgb(255,112,48)'), px - 14, py - 14);
        c.restore();
      }
    }
    // targeting brackets on the live weak points so the fight is readable
    c.save();
    for (const k of ['cannon', 'pod', 'core']) {
      const p = this.parts[k];
      if (p.broken || (k === 'core' && p.hidden)) continue;
      const px = p.x - camX, py = p.y - camY + (this.bob || 0);
      const bl = 7, a = 0.5 + 0.3 * Math.sin(this.t * 5);
      c.strokeStyle = 'rgba(255,80,60,' + a.toFixed(2) + ')';
      c.lineWidth = 1;
      for (const [sx, sy] of [[0, 0], [p.w, 0], [0, p.h], [p.w, p.h]]) {
        const dx = sx === 0 ? 1 : -1, dy = sy === 0 ? 1 : -1;
        c.beginPath();
        c.moveTo(px + sx + dx * bl, py + sy); c.lineTo(px + sx, py + sy); c.lineTo(px + sx, py + sy + dy * bl);
        c.stroke();
      }
    }
    c.restore();
    c.restore();
  }
}
