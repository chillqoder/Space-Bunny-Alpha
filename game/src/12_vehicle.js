/* ============================================================
   12 - DRIVABLE TRACKED VEHICLE "IRON HARE"
   ============================================================ */
class Vehicle {
  constructor(x, y) {
    this.x = x; this.y = y; this.w = 44; this.h = 26;
    this.vx = 0; this.vy = 0; this.hp = 14; this.maxHp = 14;
    this.active = true; this.ridden = false;
    this.bob = 0; this.tilt = 0; this.t = 0;
    this.trackF = 0; this.mgT = 0; this.cannonT = 0;
    this.dead = false; this.deadT = 0; this.flash = 0;
    this.aim = 0; this.hopT = 0; this.smokeT = 0;
    this.face = 1; this.onGround = true;
    this.ejectT = 0;
  }
  get cx() { return this.x + this.w / 2; }
  get feet() { return this.y + this.h; }
  clampToWorld() { this.x = clamp(this.x, 0, Level.W * TILE - this.w); }
  get cy() { return this.y + this.h / 2; }

  update(dt, w) {
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt * 4);
    if (this.dead) {
      this.deadT += dt;
      this.vy += 900 * dt; this.y += this.vy * dt;
      if (chance(0.6)) {
        FX.fireball(this.cx + rnd(-16,16), this.y + rnd(0,20), 0.6);
        FX.explosion(this.cx + rnd(-16, 16), this.y + rnd(0, 20), 0.5);
        this.hp = 0;
        if (this.deadT < 1.2 && w.player.state === 'normal' && w.vehicleOut) {
          // eject player
        }
      }
      if (this.deadT > 1.6) this.active = false;
      return;
    }
    const p = w.player;
    if (!this.ridden) {
      // idle engine smoke
      this.smokeT -= dt;
      if (this.smokeT <= 0) { this.smokeT = 0.4; FX.smokeTrail(this.x + 40, this.y + 4, 'rgba(110,110,115,0.5)', 2.5); }
      return;
    }
    const locked = w.inputLocked;
    const L = !locked && down('left'), R = !locked && down('right');
    const dir = (L ? -1 : 0) + (R ? 1 : 0);
    const SP = 132;
    this.vx = dir * SP;
    this.face = dir !== 0 ? dir : this.face;
    // physics
    this.vy += 1200 * dt;
    this.vy = Math.min(this.vy, 600);
    Player.prototype.moveX.call(this, this.vx * dt, w);
    Player.prototype.moveY.call(this, this.vy * dt, w);
    if (this.onGround) {
      this.trackF += Math.abs(this.vx) * dt * 0.35;
      this.bob = Math.sin(this.trackF * 3) * 1.2;
      if (Math.abs(this.vx) > 30 && chance(dt * 22)) {
        FX.dust(this.x + (this.face > 0 ? 2 : 42), this.y + this.h, 1, 'rgba(180,165,130,0.55)');
        SFX('step', { v: 0.4, pitch: 0.7 });
      }
    } else this.trackF += dt * 0.2;
    // hop
    if (!locked && hit('jump') && this.onGround) {
      this.vy = -300;
      SFX('jump', { pitch: 0.7 });
      FX.dust(this.x + 20, this.y + this.h, 5);
    }
    // aim
    let aim = this.face > 0 ? 0 : Math.PI;
    if (!locked && down('up')) aim = -Math.PI / 2;
    if (!locked && down('down')) aim = Math.PI / 2;
    this.aim = angLerp(this.aim, aim, 0.35);
    const hx = this.cx + Math.cos(this.aim) * 18, hy = this.cy + Math.sin(this.aim) * 14;
    // machine gun
    this.mgT -= dt;
    if (!locked && down('fire') && this.mgT <= 0) {
      this.mgT = 0.075;
      const a = this.aim + rnd(-0.05, 0.05);
      w.bullets.push(new Bullet({ x: hx, y: hy, vx: Math.cos(a) * 330, vy: Math.sin(a) * 330, dmg: 8, life: 0.45, own: 'p', kind: 'mg' }));
      SFX('mgheavy', { v: 0.55 });
      FX.muzzle(hx, hy, a, false);
      FX.shell(hx - Math.cos(a) * 4, hy - Math.sin(a) * 4, this.face);
      FX.shake(0.8);
      this.vx -= Math.cos(a) * 4;
    }
    // cannon
    this.cannonT -= dt;
    if (!locked && hit('special') && this.cannonT <= 0) {
      this.cannonT = 0.85;
      const a = this.aim;
      w.bullets.push(new Bullet({ x: hx, y: hy, vx: Math.cos(a) * 210, vy: Math.sin(a) * 210, dmg: 90, life: 1.6, own: 'p', kind: 'rocket', explode: 1.2, grav: 60, selfSafe: true }));
      SFX('cannon');
      FX.muzzle(hx, hy, a, true);
      FX.shake(5);
      this.vx -= Math.cos(a) * 40;
    }
    // crush
    for (const e of w.enemies) {
      if (e.dead) continue;
      if (aabb({ x: this.x + 2, y: this.y + 6, w: this.w - 4, h: this.h - 8 }, e) && e !== w.vehicle) {
        if (e.def.static) { e.hurt(999, w, this.cx); FX.hit(e.cx, e.cy, '#fff0a0', 8); SFX('clank'); }
        else if (!e.hitByCar) {
          e.hitByCar = 0.6;
          e.hurt(999, w, this.cx);
          FX.popup(e.cx, e.cy - 10, 'SQUASH!', '#ffd060');
          SFX('clank', { v: 1.2 });
          FX.shake(2.5);
          this.vx *= 0.9;
        }
      }
    }
    for (const pk of w.pickups) { if (!pk.dead && aabb(this, pk)) w.collect(pk); }
    // exit
    if (!locked && hit('down') && this.onGround) w.exitVehicle();
    this.smokeT -= dt;
    if (this.smokeT <= 0) { this.smokeT = 0.18; FX.smokeTrail(this.x + 40, this.y + 4, 'rgba(90,90,95,0.4)', 2.2); }
  }

  hurt(n, w) {
    if (this.dead) return;
    this.hp -= n;
    this.flash = 1;
    SFX('hitArmor', { v: 0.6 });
    FX.hit(this.cx + rnd(-12, 12), this.cy + rnd(-6, 6), '#c0c0d0', 6);
    if (this.hp <= 0) this.destroy(w);
  }
  destroy(w) {
    this.dead = true; this.deadT = 0;
    SFX('explodeBig');
    FX.fireball(this.cx, this.cy, 1.7);
    FX.explosion(this.cx, this.cy, 1.6);
    FX.shake(8);
    w.exitVehicle(true);
  }

  draw(c, camX, camY) {
    if (!this.active) return;
    const x = Math.round(this.x - camX), y = Math.round(this.y - camY);
    if (this.dead) {
      c.save(); c.translate(x, y); c.rotate(Math.min(0.4, this.deadT * 0.3));
      c.globalAlpha = clamp(1 - (this.deadT - 1.2) * 2, 0, 1);
      c.drawImage(tankB, 0, 0);
      c.restore();
      if (chance(0.4)) { /* handled by fx */ }
      return;
    }
    c.save();
    // suspension tilt
    c.translate(x, y);
    c.rotate(this.tilt);
    c.translate(0, this.bob);
    if (this.face < 0) c.translate(this.w, 0);
    c.scale(this.face, 1);
    // tracks
    const tf = trackFrames[Math.floor(this.trackF) % 6];
    c.drawImage(tf, 2, this.h - 9);
    // body
    c.drawImage(tankB, 0, -4);
    c.restore();
    if (this.flash > 0) {
      c.save();
      c.globalAlpha = this.flash * 0.6;
      c.save();
      c.translate(x, y); c.rotate(this.tilt); c.translate(0, this.bob); if (this.face < 0) c.translate(this.w, 0); c.scale(this.face, 1);
      c.drawImage(whiten(tankB), 0, -4);
      c.drawImage(whiten(trackFrames[Math.floor(this.trackF) % 6]), 2, this.h - 9);
      c.restore();
      c.restore();
    }
    // muzzle
    const hx = this.cx + Math.cos(this.aim) * 20, hy = this.cy + Math.sin(this.aim) * 14;
    if (this.mgT > 0.06) {
      c.save();
      c.translate(Math.round(hx - camX), Math.round(hy - camY));
      c.rotate(this.aim); c.scale(this.face, 1);
      c.globalAlpha = clamp((this.mgT - 0.06) / 0.015, 0, 1);
      c.drawImage(muzzleFlash(), 0, -9);
      c.restore();
    }
    if (this.cannonT > 0.75) {
      c.save();
      c.translate(Math.round(hx - camX), Math.round(hy - camY));
      c.rotate(this.aim); c.scale(this.face, 1);
      c.drawImage(muzzleFlashBig(), 0, -15);
      c.restore();
    }
    // driver head visible
    if (this.ridden) {
      c.drawImage(jeepGunner(), Math.round(this.x - camX + 10), Math.round(this.y - camY - 10));
    }
  }
}
