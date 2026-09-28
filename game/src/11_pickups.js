/* ============================================================
   11 - PICKUPS, CRATES, CAPTIVES
   ============================================================ */
const CRATE_CONTENT = {
  crate_mg: { weapon: 'mg', ammo: WEAPONS.mg.ammo, msg: 'WEAPON GET! MACHINE GUN' },
  crate_shotgun: { weapon: 'shotgun', ammo: WEAPONS.shotgun.ammo, msg: 'WEAPON GET! SPREAD GUN' },
  crate_flame: { weapon: 'flame', ammo: WEAPONS.flame.ammo, msg: 'WEAPON GET! FLAMETHROWER' },
  crate_rocket: { weapon: 'rocket', ammo: WEAPONS.rocket.ammo, msg: 'WEAPON GET! ROCKET LAUNCHER' },
  crate_laser: { weapon: 'laser', ammo: WEAPONS.laser.ammo, msg: 'WEAPON GET! LASER RIFLE' },
  crate_grenade: { ammo: null, grenades: 12, msg: 'GRENADES +12' },
  crate_ammo: { refil: true, msg: 'AMMO REFILL' },
  crate_health: { health: 2, msg: 'HEALTH UP' },
  crate_shield: { shield: true, msg: 'SHIELD UP' },
  crate_cover: { boom: true },
};

class Pickup {
  constructor(kind, x, y) {
    this.kind = CRATE_CONTENT['crate_'+kind] ? 'crate_'+kind : kind; this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.w = 14; this.h = 14; this.t = rnd(0, 6); this.dead = false;
    this.grounded = false; this.bounce = 0.35; this.life = 0;
    this.landed = false; this.spawnPop = 1;
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  update(dt, w) {
    this.t += dt; this.life += dt;
    if (this.spawnPop > 0) this.spawnPop -= dt * 3;
    if (!this.landed || this.kind === 'medal' || this.kind === 'fruit' || this.kind === 'gold') {
      this.vy += 900 * dt;
      this.x += this.vx * dt; this.y += this.vy * dt;
      this.vx *= Math.pow(0.02, dt);
      const gy = w.groundBelow(this.cx, this.y);
      if (gy !== null && this.y + this.h > gy) {
        this.y = gy - this.h;
        if (this.vy > 60) { this.vy = -this.vy * this.bounce; this.bounce *= 0.5; SFX('bounce', { v: 0.4, pitch: rnd(1.2, 1.6) }); }
        else { this.vy = 0; this.landed = true; }
        if (Math.abs(this.vy) < 20) { this.vy = 0; this.landed = true; }
      }
      if (w.solidAt(this.x, this.y) && this.vy < 0) this.vy = 0;
      this.x = clamp(this.x, 2, Level.W * TILE - 16);
    }
    if (this.y > Level.H * TILE + 40) this.dead = true;
  }
  draw(c, camX, camY) {
    const bx = Math.round(this.x - camX + this.w / 2);
    const by = Math.round(this.y - camY + this.h);
    const bob = this.landed ? Math.sin(this.t * 3.4) * 1.6 : 0;
    const isCrate = this.kind.indexOf('crate_') === 0;
    if (isCrate) {
      const spr = crate();
      c.drawImage(spr, bx - 8, by - 16);
      // glow
      const a = 0.25 + 0.2 * Math.sin(this.t * 4);
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = a;
      c.fillStyle = '#ffe060';
      c.fillRect(bx - 10, by - 20, 20, 20);
      c.restore();
      // icon bobbing above
      const ck = this.kind.slice(6);
      const icon = weaponIcon(WEAPONS[ck] ? ck : '') || pickupIcon('medal');
      const ic = WEAPONS[ck] ? weaponIcon(ck) : pickupIcon(ck === 'health' ? 'health' : ck === 'ammo' ? 'ammo' : ck === 'shield' ? 'shield' : ck === 'grenade' ? 'grenade' : 'star');
      c.drawImage(ic, bx - 7, by - 24 + Math.sin(this.t * 3) * 1.5);
      return;
    }
    const ic = pickupIcon(this.kind);
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = 0.18 + 0.12 * Math.sin(this.t * 5);
    c.fillStyle = this.kind === 'gold' ? '#ffd040' : this.kind === 'fruit' ? '#ff7050' : '#fff0a0';
    c.fillRect(bx - 9, by - 16 + bob, 18, 18);
    c.restore();
    c.drawImage(ic, bx - 7, by - 14 + bob);
  }
}

class Captive {
  constructor(o) {
    this.x = o.x; this.y = o.y; this.w = 11; this.h = 22;
    this.reward = o; this.freed = false; this.t = rnd(0, 3);
    this.anim = 'salute'; this.frame = 0; this.animT = 0;
    this.rope = true; this.leaveT = 0; this.face = 1;
    this.gone = false; this.vx = 0; this.vy = 0; this.onGround = false;
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  get feet() { return this.y + this.h; }
  clampToWorld() { if(this.y>Level.H*TILE)this.gone=true; }
  update(dt, w) {
    this.t += dt; this.animT += dt;
    this.frame = Math.floor(this.animT * 8) % 4;
    if (this.freed) {
      this.leaveT += dt;
      if (this.leaveT > 1.4) this.anim = 'run';
      if (this.leaveT > 3.4) this.gone = true;
      if (this.anim === 'run') {
        this.vx=55;this.vy=Math.min(700,this.vy+1500*dt);
        Player.prototype.moveX.call(this,this.vx*dt,w);
        Player.prototype.moveY.call(this,this.vy*dt,w);
      }
    }
  }
  draw(c, camX, camY) {
    if (this.gone) return;
    const x = this.cx - camX, y = this.y + this.h - camY;
    // rope + post
    c.save();
    c.strokeStyle = '#8a7040'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x - 1, y - 20); c.lineTo(x - 1, y - 3); c.stroke();
    if (this.rope) {
      c.strokeStyle = '#c8a860'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(x - 6, y - 12); c.lineTo(x + 5, y - 11); c.stroke();
      c.beginPath(); c.moveTo(x + 5, y - 11); c.lineTo(x + 1, y - 18); c.stroke();
    }
    c.restore();
    const spr = fighterFrame('civ', this.anim, this.frame, 'none', {});
    drawSpr(c, spr, x, y, this.face, this.t > 3 ? 0 : 0);
    if (this.freed && this.leaveT < 1.4) {
      const a = this.leaveT;
      text(c, 'THANKS!', x, y - 30 - a * 10, '#ffe060', 1, 'c');
    }
    if (!this.freed) {
      const bob = Math.sin(this.t * 3) * 1.5;
      c.save();
      c.globalAlpha = 0.4 + 0.3 * Math.sin(this.t * 4);
      c.fillStyle = '#ffe060';
      c.beginPath(); c.arc(x, y - 30 + bob, 2, 0, TAU); c.fill();
      c.restore();
    }
  }
}
