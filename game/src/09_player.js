/* ============================================================
   09 - THE PLAYER: "BUNNY" the commando
   ============================================================ */
class Player {
  constructor(x, y) {
    this.x = x; this.y = y; this.w = 11; this.h = 22;
    this.vx = 0; this.vy = 0; this.face = 1;
    this.onGround = false; this.coyote = 0; this.jumpBuf = 0;
    this.hp = 4; this.maxHp = 4;
    this.state = 'normal';
    this.anim = 'idle'; this.frame = 0; this.animT = 0; this.animSpeed = 1;
    this.aim = 0; this.crouch = false;
    this.weapon = 'pistol'; this.ammo = { mg: 0, shotgun: 0, flame: 0, rocket: 0, laser: 0 };
    this.grenades = 6; this.maxGrenades = 99;
    this.fireT = 0; this.knifeT = 0; this.throwT = 0;
    this.invuln = 0; this.deadT = 0; this.hurtT = 0;
    this.shield = 0;
    this.stepT = 0; this.lastStep = 0;
    this.vehicle = null;
    this.respawnT = 0;
    this.winT = 0;
    this.hitFlash = 0;
    this.muzzle = 0;
    this.bandage = 0;
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  get feet() { return this.y + this.h; }
  get headY() { return this.y + 3; }

  reset(x, y) {
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.hp = this.maxHp; this.state = 'normal';
    this.h = 22; this.crouch = false; this.climbing = false; this.onGround = false;
    this.coyote = 0; this.jumpBuf = 0; this.vehicle = null;
    this.fireT = this.knifeT = this.throwT = this.animT = this.shield = 0;
    this.invuln = 1.2; this.deadT = 0; this.hurtT = 0;
    this.weapon = 'pistol'; this.anim = 'idle'; this.frame = 0;
    this.grenades = Math.max(this.grenades, 6);
  }

  update(dt, w) {
    if (this.state === 'dead') { this.deadT += dt; this.vy += 1200 * dt; this.y += this.vy * dt; this.animT += dt; return; }
    if (this.state === 'victory') { this.winT += dt; this.animT += dt; this.vx *= 0.8; return; }

    this.invuln = Math.max(0, this.invuln - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt * 4);
    this.muzzle = Math.max(0, this.muzzle - dt);
    this.shield = Math.max(0, this.shield - dt);
    this.fireT -= dt; this.knifeT -= dt; this.throwT -= dt;

    const locked = w.inputLocked;
    const L = !locked && down('left'), R = !locked && down('right');
    const U = !locked && down('up'), D = !locked && down('down');
    const RUN = 112, ACC = 950, FRIC = 1400, AIR = 0.45;
    const nearLadder = this.inLadder(w);
    if (!nearLadder || L || R || hit('jump')) this.climbing = false;
    else if (U || D && !this.onGround) this.climbing = true;
    const crouching = D && this.onGround && !this.climbing;

    // --- horizontal ---
    let dir = 0;
    if (!this.climbing) {
      if (L) dir = -1; else if (R) dir = 1;
      const acc = (this.onGround ? ACC : ACC * AIR) * dt;
      if (dir !== 0) { this.vx += dir * acc; this.vx = clamp(this.vx, -RUN, RUN); this.face = dir; }
      else if (this.onGround) { const f = FRIC * dt; if (Math.abs(this.vx) <= f) this.vx = 0; else this.vx -= Math.sign(this.vx) * f; }
    }

    // --- jump with coyote + buffer ---
    this.coyote = this.onGround ? 0.1 : Math.max(0, this.coyote - dt);
    if (!locked && hit('jump')) this.jumpBuf = 0.13;
    this.jumpBuf = Math.max(0, this.jumpBuf - dt);
    if (this.jumpBuf > 0 && this.coyote > 0) {
      this.vy = -400; this.onGround = false; this.coyote = 0; this.jumpBuf = 0;
      SFX('jump', { pitch: rnd(0.95, 1.08) });
      FX.dust(this.cx, this.feet, 4, 'rgba(210,190,150,0.5)');
    }
    this.vy += 1500 * dt;
    this.vy = Math.min(this.vy, 700);

    // --- ladders ---
    const onLad = this.climbing;
    if (onLad) {
      this.vy = U ? -95 : D ? 95 : 0;
      this.vx = 0;
      if (U || D) { this.x += 0; this.climbAnim = (this.climbAnim || 0) + dt; }
    }

    // --- crouch / aim ---
    this.crouch = crouching;
    const newH = crouching ? 15 : 22;
    if (newH <= this.h || !w.anySolid(this.x, this.feet - newH, this.x + this.w, this.feet)) {
      this.y += this.h - newH; this.h = newH;
    } else this.crouch = true;
    let aim = this.face > 0 ? 0 : Math.PI;
    if (U) {
      if (this.crouch) aim = -1.4;
      else if (dir !== 0) aim = dir > 0 ? -0.8 : -2.35;
      else aim = -Math.PI / 2;
    }
    if (D && !this.onGround) aim = Math.PI / 2;
    if (this.crouch) aim = this.face > 0 ? 0 : Math.PI;
    this.aim = aim;

    // --- weapons ---
    const wp = WEAPONS[this.weapon];
    const canFire = !locked;
    if (canFire && down('fire') && this.fireT <= 0) {
      if (wp.auto || hit('fire')) this.fire(w);
    }
    if (canFire && hit('grenade') && this.grenades > 0 && this.throwT <= 0) this.throwGrenade(w);
    if (canFire && hit('knife') && this.knifeT <= 0) this.knife(w);
    if (canFire && hit('special') && this.shield <= 0 && w.giveShield) w.giveShield(this);

    // --- movement resolve ---
    const prevY = this.y;
    this.moveX(this.vx * dt, w);
    if (onLad) { this.moveY(this.vy * dt, w); }
    else { this.moveY(this.vy * dt, w); }

    // --- footsteps & dust ---
    if (this.onGround && Math.abs(this.vx) > 40) {
      this.stepT += dt * Math.abs(this.vx) * 0.06;
      if (this.stepT > 1) {
        this.stepT = 0;
        SFX('step', { v: 0.5 });
        FX.dust(this.cx - this.face * 4, this.feet, 1);
      }
    }

    // --- vehicle entry ---
    if (w.vehicle && w.vehicle.active && !w.vehicle.ridden) {
      const d = dist2(this.cx, this.cy, w.vehicle.x + 22, w.vehicle.y - 10);
      if (d < 40 * 40) {
        w.showPrompt('PRESS ' + 'UP' + ' TO BOARD', this.cx, this.y - 34);
        if (!locked && hit('up')) w.enterVehicle();
      }
    }

    this.updateAnim(dt);
  }

  updateAnim(dt) {
    let a = 'idle';
    if (this.hurtT > 0) a = 'hurt';
    else if (this.knifeT > 0) a = 'knife';
    else if (this.throwT > 0) a = 'throw';
    else if (!this.onGround) a = this.vy < 0 ? 'jump' : 'fall';
    else if (this.crouch) a = (Math.abs(this.vx) > 20) ? 'crouchwalk' : 'crouch';
    else if (Math.abs(this.vx) > 22) a = 'run';
    if (this.anim !== a) this.animT = 0;
    this.anim = a;
    this.animT += dt;
    const def = ANIMS[a];
    const fps = def[2];
    this.frame = Math.floor(this.animT * fps * (a === 'knife' ? 3 / def[1] : 1)) % def[1];
    if (a === 'knife') this.frame = clamp(Math.floor(this.knifeProgress * 3), 0, 2);
  }
  get knifeProgress() { return 1 - Math.max(0, this.knifeT) / 0.22; }
  get throwProgress() { return 1 - Math.max(0, this.throwT) / 0.28; }

  moveX(dx, w) {
    const steps = Math.max(1, Math.ceil(Math.abs(dx)));
    const step = dx / steps;
    for (let i = 0; i < steps; i++) {
      const nx = this.x + step;
      if (!w.anySolid(nx, this.y + 0.01, nx + this.w, this.feet)) {
        this.x = nx;
        continue;
      }
      // Walk up a single terrain tile, but never through a ceiling.
      let climbed = false;
      if (this.onGround) for (let rise = 1; rise <= TILE; rise++) {
        if (!w.anySolid(nx, this.y - rise, nx + this.w, this.feet - rise) &&
            !w.anySolid(this.x, this.y - rise, this.x + this.w, this.feet - rise)) {
          this.x = nx; this.y -= rise; climbed = true; break;
        }
      }
      if (!climbed) { this.vx = 0; break; }
    }
    this.x = clamp(this.x, 0, Level.W * TILE - this.w);
  }
  moveY(dy, w) {
    const wasGround = this.onGround;
    this.onGround = false;
    const steps = Math.max(1, Math.ceil(Math.abs(dy)));
    const step = dy / steps;
    for (let i = 0; i < steps; i++) {
      const ny = this.y + step;
      const landing = step >= 0 ? w.platformTop(this.x + 0.01, this.x + this.w - 0.01,
        this.feet, ny + this.h) : null;
      if (landing !== null) {
        this.y = landing - this.h; this.onGround = true; this.vy = 0; break;
      }
      if (w.anySolid(this.x + 0.01, ny, this.x + this.w - 0.01, ny + this.h)) {
        // Binary refinement keeps feet exactly on the surface, without jitter.
        let lo = 0, hi = 1;
        for (let j = 0; j < 16; j++) {
          const mid = (lo + hi) / 2, y = this.y + step * mid;
          if (w.anySolid(this.x + 0.01, y, this.x + this.w - 0.01, y + this.h)) hi = mid;
          else lo = mid;
        }
        this.y += step * lo;
        this.onGround = step >= 0; this.vy = 0; break;
      }
      this.y = ny;
    }
    if (this.onGround && !wasGround) { SFX('land', { v: 0.5 }); FX.dust(this.cx, this.feet, 4); }
    this.clampToWorld();
  }
  clampToWorld() {
    if (this.y > Level.H * TILE + 40) { this.die(null); }
  }
  checkLand() { }

  inLadder(w) {
    return w.onLadder(this.x + 2, this.y + this.h - 4) || w.onLadder(this.x + this.w - 2, this.y + this.h - 4);
  }

  muzzlePos() {
    const cy = this.crouch ? this.y + 5 : this.y + 10;
    return [this.cx + Math.cos(this.aim) * 17, cy + Math.sin(this.aim) * 13];
  }

  fire(w) {
    const wp = WEAPONS[this.weapon];
    if (wp.ammo !== Infinity && this.ammo[this.weapon] !== undefined) {
      if (this.ammo[this.weapon] <= 0) {
        this.weapon = 'pistol';
        SFX('blip');
        return;
      }
      this.ammo[this.weapon]--;
    }
    this.fireT = wp.rate;
    this.muzzle = 0.06;
    const [mx, my] = this.muzzlePos();
    const ang = this.aim;
    const n = wp.pellets || 1;
    for (let i = 0; i < n; i++) {
      let a = ang;
      if (wp.spread) a += n > 1 ? lerp(-wp.spread, wp.spread, i / (n - 1)) : rnd(-wp.spread, wp.spread);
      const sp = wp.speed;
      w.bullets.push(new Bullet({
        x: mx, y: my, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        dmg: wp.dmg, range: wp.range, life: wp.range / sp + STEP * 2,
        falloffStart: wp.falloffStart, minDamage: wp.minDamage, armorPiercing: wp.armorPiercing, own: 'p', kind: wp.blt, grav: wp.grav || 0, explode: wp.explode || 0, flame: wp.flame, r: wp.explode ? 3 : 2,
      }));
    }
    SFX(wp.sfx, { v: 0.9 });
    if (wp.kick) this.vx -= Math.cos(ang) * wp.kick * 0.16 * (this.onGround ? 1 : 0.3);
    if (wp.shake) FX.shake(wp.shake);
    FX.muzzle(mx, my, ang, wp.muzzle > 1);
    if (this.weapon !== 'flame') FX.shell(mx - Math.cos(ang) * 2, my - Math.sin(ang) * 2, this.face);
    // muzzle light
    emit({ x: mx, y: my, life: 0.07, kind: 'flash', col: 'rgba(255,230,160,0.5)', size: 7 });
    if (this.aim > 1.0) FX.dust(this.cx, this.y + this.h, 2);
  }

  throwGrenade(w) {
    if (this.grenades <= 0) { SFX('blip'); return; }
    this.grenades--;
    this.throwT = 0.28;
    const a = this.aim === 0 ? this.face * 0.5 : this.aim;
    const sp = 250;
    const gx = this.cx + Math.cos(a) * 8, gy = this.y + 6 + (this.aim < -1 ? -2 : 0);
    w.grenades.push(new Grenade(gx, gy, Math.cos(a) * sp, Math.sin(a) * sp - (this.aim === 0 ? 160 : 60), 'p', 1.5));
    SFX('thrown');
  }

  knife(w) {
    this.knifeT = 0.22;
    SFX('knife');
    const dir = this.face;
    const hx = this.cx + dir * 8, hy = this.crouch ? this.y + 8 : this.y + 12;
    w.knifeHit(hx, hy, dir, 20, 34);
  }

  damage(n, w, srcX) {
    if (this.invuln > 0 || this.state !== 'normal') return;
    if (this.shield > 0) {
      this.shield = 0;
      this.invuln = 0.8; this.hitFlash = 1;
      SFX('clank'); FX.hit(this.cx, this.cy, '#60f0f0', 14);
      FX.popup(this.cx, this.y - 6, 'SHIELD!', '#60f0f0');
      return;
    }
    this.hp -= n;
    this.invuln = 1.1;
    this.hurtT = 0.22;
    this.hitFlash = 1;
    SFX('hurt');
    FX.hurtFlash();
    FX.blood(this.cx, this.cy, '#c03a3a', 6);
    if (srcX !== undefined && srcX !== null) this.vx += sign(this.cx - srcX) * 70;
    if (this.hp <= 0) this.die(w);
  }

  die(w) {
    if (this.state === 'dead') return;
    this.state = 'dead';
    this.deadT = 0;
    this.hp = 0;
    this.vy = -260; this.vx = -sign(this.vx || 1) * 40;
    SFX('playerDie');
    FX.shake(4);
  }

  draw(c, camX, camY) {
    if (this.state === 'normal' && this.invuln > 0 && (G.time * 22 | 0) % 2) return;
    const gun = (this.anim === 'knife' || this.anim === 'throw') ? 'none' : this.weapon;
    let opt = {};
    let pal = 'hero';
    if (this.state === 'dead' || this.deadT > 0) {
      const k = clamp(this.deadT / 0.7, 0, 1);
      const spr = fighterFrame('hero', 'dead', Math.min(3, Math.floor(k * 4)), 'none', { rot: -k * 1.5, sq: k * 0.4 });
      c.save(); c.globalAlpha = 1;
      c.drawImage(spr, Math.round(this.cx - camX - spr.width / 2), Math.round(this.y - camY + this.h - (spr.height - 4) + k * 2), spr.width, spr.height);
      c.restore();
      return;
    }
    if (this.state === 'victory') {
      const spr = fighterFrame('hero', 'victory', this.frame, 'none');
      drawSpr(c, spr, this.cx - camX, this.feet - camY, this.face, 0);
      return;
    }
    const spr = fighterFrame(pal, this.anim, this.frame, gun, { aim: this.face > 0 ? this.aim : Math.PI - this.aim });
    const flash = this.hitFlash > 0 ? this.hitFlash : (this.invuln > 0 ? 0.35 : 0);
    drawSpr(c, spr, this.cx - camX, this.feet - camY, this.face, flash);
    // muzzle flash
    if (this.muzzle > 0) {
      const [mx, my] = this.muzzlePos();
      const spr2 = WEAPONS[this.weapon].muzzle > 1 ? muzzleFlashBig() : muzzleFlash();
      c.save();
      c.translate(Math.round(mx - camX), Math.round(my - camY));
      c.rotate(this.aim);
      c.globalAlpha = clamp(this.muzzle / 0.06, 0, 1);
      c.drawImage(spr2, 0, -spr2.height / 2);
      c.restore();
    }
  }
}
