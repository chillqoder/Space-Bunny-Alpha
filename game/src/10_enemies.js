/* ============================================================
   10 - ENEMIES
   ============================================================ */
const ETYPE = {
  soldier: { hp: 3, score: 100, w: 11, h: 22, speed: 74, pal: 'soldier', gun: 'mg' },
  soldier2: { hp: 3, score: 120, w: 11, h: 22, speed: 68, pal: 'soldier2', gun: 'mg' },
  rusher: { hp: 2, score: 150, w: 11, h: 22, speed: 132, pal: 'rusher', gun: 'none' },
  sniper: { hp: 3, score: 220, w: 11, h: 22, speed: 40, pal: 'sniper', gun: 'pistol' },
  heavy: { hp: 12, score: 350, w: 15, h: 24, speed: 34, pal: 'heavy', gun: 'mg' },
  drone: { hp: 4, score: 250, w: 30, h: 16, speed: 92, pal: 'bossDark', gun: 'none', fly: true },
  turret: { hp: 6, score: 200, w: 24, h: 20, speed: 0, pal: 'bossDark', gun: 'ebolt', static: true },
  emplacement: { hp: 10, score: 300, w: 30, h: 22, speed: 0, pal: 'bossDark', gun: 'spread', static: true },
  barrelman: { hp: 2, score: 120, w: 11, h: 22, speed: 96, pal: 'soldier2', gun: 'none' },
  barrel: { hp: 1, score: 50, w: 12, h: 16, speed: 0, pal: 'bossDark', gun: 'none', static: true, barrel: true },
  jeep: { hp: 16, score: 500, w: 44, h: 24, speed: 118, pal: 'bossDark', gun: 'mg' },
  copter: { hp: 7, score: 400, w: 44, h: 24, speed: 80, pal: 'bossDark', gun: 'none', fly: true },
};

class Corpse {
  constructor(e) {
    this.x = e.x; this.y = e.y; this.vx = e.vx * 0.4 + rnd(-40, 40); this.vy = -rnd(120, 230);
    this.rot = 0; this.vr = rnd(-9, 9);
    this.pal = e.pal; this.t = 0; this.rot2 = 0; this.dead = false; this.fade = 1;
    this.spr = null; this.type = e.type;
    this.landed = false;
  }
  update(dt, w) {
    this.t += dt;
    if (this.landed) { this.fade = Math.max(0, 1 - (this.t - 0.6) / 2.5); if (this.fade <= 0) this.dead = true; return; }
    this.vy += 1000 * dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.rot += this.vr * dt;
    if (w.solidAt(this.x, this.y + 6)) {
      this.y = Math.floor(this.y + 6) - 6;
      this.landed = true; this.rot = Math.round(this.rot / (Math.PI / 2)) * (Math.PI / 2);
      FX.dust(this.x, this.y + 6, 3, 'rgba(140,120,100,0.5)');
    }
    if (this.t > 6) this.dead = true;
  }
  draw(c, camX, camY) {
    c.save();
    c.globalAlpha = this.fade;
    c.translate(Math.round(this.x - camX), Math.round(this.y - camY));
    c.rotate(this.rot);
    const spr = this.spr || (this.spr = fighterFrame(this.pal, 'dead', 3, 'none', {}));
    c.drawImage(spr, -spr.width / 2, -spr.height + 4);
    c.restore();
  }
}

class Enemy {
  constructor(type, x, y, entrance) {
    const d = ETYPE[type];
    this.type = type; this.def = d;
    this.x = x; this.y = y; this.w = d.w; this.h = d.h;
    this.vx = 0; this.vy = 0; this.face = -1;
    this.hp = d.hp; this.maxHp = d.hp;
    this.onGround = false;
    this.state = 'idle'; this.t = rnd(0, 1);
    this.anim = 'idle'; this.frame = 0; this.animT = rnd(0, 3);
    this.fireT = rnd(0.4, 1.6); this.grenadeT = rnd(3, 7);
    this.flash = 0; this.stun = 0; this.panic = 0; this.dead = false;
    this.aim = 0; this.shootAnim = 0; this.alert = 0;
    this.entrance = entrance || 'ground';
    this.dropT = 0; this.marked = false;
    this.scale = 1;
    this.homeY = y;
    this.orbit = rnd(0, TAU);
    this.spawnT = 0; this.atkT = 0; this.burst = 0; this.burstT = 0;
    if (d.fly) { this.vx = (chance(0.5) ? 1 : -1) * d.speed; this.y = y; }
    this.applyEntrance();
  }
  applyEntrance() {
    switch (this.entrance) {
      case 'drop': this.y -= 90; this.vy = 40; this.dropT = 0.5; break;
      case 'burst':
        FX.explosion(this.x, this.y + this.h / 2, 0.7);
        FX.shake(3);
        this.vx = rnd(-40, 40);
        break;
      case 'window': this.vy = -40; this.vx = 40; this.spawnT = 0.4; break;
      case 'truck': this.x -= 60; this.vx = 120; this.spawnT = 0.5; break;
    }
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  hurt(dmg, w, srcX, opts) {
    if (this.dead) return;
    opts = opts || {};
    const armored = this.type === 'heavy' || this.type === 'emplacement';
    if (armored && (!opts.pierce)) {
      dmg = dmg * 0.45;
      SFX('hitArmor');
      FX.hit(srcX !== undefined ? srcX : this.cx, this.cy, '#c0c0d0', 5);
    } else {
      SFX('hit', { pitch: rnd(0.9, 1.25) });
      FX.hit(this.cx, this.cy, this.def.barrel ? '#f08020' : '#ffd060', 5);
    }
    this.alert = 1;
    this.hp -= dmg;
    this.flash = 1;
    this.stun = Math.max(this.stun, 0.08);
    if (srcX !== undefined) {
      const k = sign(this.cx - srcX);
      this.vx += k * (armored ? 14 : 60);
      this.hurtDir = k;
    }
    if (this.hp <= this.maxHp * 0.4 && this.def.pal && chance(0.3)) this.panic = rnd(2, 4);
    if (this.hp <= 0) this.die(w, srcX);
  }
  die(w, srcX) {
    if (this.dead) return;
    this.dead = true;
    if(this.postId!==undefined)w.defeatedPosts.add(this.postId);
    if(this.laser)this.laser.dead=true;
    const s = this.def.score;
    w.addScore(s, this.cx, this.cy);
    if (this.def.barrel) {
      FX.fireball(this.cx, this.cy, 1.1);
      FX.explosion(this.cx, this.cy, 1.1);
      SFX('explode');
      w.explodeDamage(this.cx, this.cy, 60, 56, 'p');
      this.wave = 1; this.dead = true;
      return;
    }
    SFX(this.type === 'drone' || this.type === 'jeep' ? 'explode' : 'enemyDie', { v: 0.9 });
    if (chance(0.4)) SFX('scream', { v: 0.5 });
    if(!this.def.fly && !this.def.static && this.type !== 'jeep') w.corpses.push(new Corpse(this));
    FX.blood(this.cx, this.cy, this.def.pal === 'heavy' ? '#c0b040' : '#c03a3a', 7);
    if (this.type === 'drone' || this.type === 'jeep' || this.type === 'copter') {
      FX.fireball(this.cx, this.cy, 1.2);
      FX.explosion(this.cx, this.cy, 1.2);
      w.explodeDamage(this.cx, this.cy, 40, 48, 'p');
    } else if (chance(0.35)) {
      emit({ x: this.cx, y: this.cy, life: 0.6, kind: 'flash', col: 'rgba(255,240,200,0.8)', size: 8 });
    }
    // chance to drop ammo
    if (chance(0.16)) w.spawnPickup(this.cx, this.cy, 'ammo');
  }

  /* -------- AI -------- */
  update(dt, w) {
    if (this.dead) return;
    if(this.postId!==undefined && (this.x>w.camX+VW+64 || this.x+this.w<w.camX-64)){this.vx=0;return;}
    this.t += dt; this.animT += dt;
    this.flash = Math.max(0, this.flash - dt * 5);
    this.stun = Math.max(0, this.stun - dt);
    this.panic = Math.max(0, this.panic - dt);
    this.shootAnim = Math.max(0, this.shootAnim - dt);
    this.spawnT = Math.max(0, this.spawnT - dt);
    if (this.dropT > 0) { this.dropT -= dt; }
    const p = w.player;
    const px = p.cx, py = p.cy;
    const dx = px - this.cx, dy = py - this.cy;
    const dist = Math.hypot(dx, dy);
    this.aim = Math.atan2(dy, dx);

    // aggro
    if (dist < (this.def.static ? 260 : 250) && p.state === 'normal') this.alert = 1;

    if (p.state !== 'normal' || this.spawnT > 0 || this.stun > 0) {
      this.vx = 0;
      if (!this.def.fly) this.physics(dt,w,p);
      this.updateAnim(); return;
    }
    switch (this.type) {
      case 'soldier': case 'soldier2': this.aiSoldier(dt, w, p, dx, dist); break;
      case 'rusher': this.aiRusher(dt, w, p, dx, dist); break;
      case 'sniper': this.aiSniper(dt, w, p, dx, dist); break;
      case 'heavy': this.aiHeavy(dt, w, p, dx, dist); break;
      case 'drone': this.aiDrone(dt, w, p, dx, dy, dist); break;
      case 'copter': this.aiCopter(dt, w, p, dx, dy, dist); break;
      case 'turret': this.aiTurret(dt, w, p, dx, dist, 'ebolt'); break;
      case 'emplacement': this.aiTurret(dt, w, p, dx, dist, 'spread'); break;
      case 'barrelman': this.aiBarrelman(dt, w, p, dx, dist); break;
      case 'barrel': this.vx = 0; break;
      case 'jeep': this.aiJeep(dt, w, p); break;
    }

    if (!this.def.fly) this.physics(dt, w, p);
    else if (this.def.fly) this.flyPhysics(dt, w, p);

    this.updateAnim();
  }

  physics(dt, w, p) {
    this.vy += 1500 * dt;
    this.vy = Math.min(this.vy, 700);
    const sp = this.def.speed;
    if (this.stun > 0) { this.vx *= Math.pow(0.02, dt); }
    else this.vx = clamp(this.vx, -sp, this.panic > 0 ? sp * 1.35 : sp);
    if(this.onGround && this.vx && this.type !== 'rusher' && this.type !== 'barrelman' && this.type !== 'jeep'){
      const ahead=this.vx>0?this.x+this.w+2:this.x-2;
      const ground=w.groundBelow(ahead,this.feet);
      if(ground===null||ground-this.feet>TILE)this.vx=0;
    }
    Player.prototype.moveX.call(this, this.vx * dt, w);
    Player.prototype.moveY.call(this, this.vy * dt, w);
    // fall off world
    if (this.y > Level.H * TILE + 60) this.dead = true;
  }
  get feet() { return this.y + this.h; }
  clampToWorld() { if (this.y > Level.H * TILE + 60) this.dead = true; }
  flyPhysics(dt, w, p) {
    // Flight is velocity-controlled; gravity would drag the drone into the terrain.
    const nx=this.x+this.vx*dt,ny=this.y+this.vy*dt;
    if(!w.anySolid(nx,this.y,nx+this.w,this.y+this.h))this.x=nx;else this.vx*=-0.5;
    if(!w.anySolid(this.x,ny,this.x+this.w,ny+this.h))this.y=ny;else this.vy=0;
    this.x=clamp(this.x,0,Level.W*TILE-this.w);
  }

  shootAt(w, p, kind, speed, dmg, spread, life) {
    if(!w.canEnemyAttack(this))return;
    const o = { x: this.cx + Math.cos(this.aim) * 8, y: this.cy + Math.sin(this.aim) * 6 - 2, own: 'e' };
    let a = this.aim + rnd(-(spread || 0), (spread || 0));
    w.bullets.push(new Bullet({
      x: o.x, y: o.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
      dmg: dmg || 8, life: life || 1.6, own: 'e', kind: kind || 'pistol', r: 2,
    }));
    FX.muzzle(o.x, o.y, a, false);
    this.shootAnim = 0.14;
  }

  aiSoldier(dt, w, p, dx, dist) {
    if (this.alert && this.stun <= 0) {
      const dir = sign(dx) || 1;
      this.face = dir;
      this.fireT -= dt;
      this.grenadeT -= dt;
      if (this.panic > 0) {
        this.anim = 'panic';
        this.vx = -dir * this.def.speed * 1.25;
        this.wantsWalk = true;
        if (chance(0.01)) SFX('scream', { v: 0.5 });
      } else if (Math.abs(p.y - this.y) < 26) {
        if (dist > 130) { this.vx = dir * this.def.speed; this.wantsWalk = true; }
        else if (dist < 60) { this.vx = -dir * this.def.speed * 0.7; this.wantsWalk = true; }
        else { this.vx = 0; this.wantsWalk = false; }
        // shoot
        if (this.fireT <= 0 && Math.abs(dx) < 200) {
          this.fireT = rnd(0.7, 1.6);
          this.burst = 3;
        }
        if (this.burst > 0) {
          this.burstT = (this.burstT || 0) - dt;
          if (this.burstT <= 0) {
            this.burstT = 0.12;
            this.burst--;
            this.shootAt(w, p, 'pistol', 150 + dist * 0.35, 8, 0.09, 1.8);
            SFX('pistol', { v: 0.45, pitch: 0.8 });
          }
        }
        if (w.canEnemyAttack(this) && this.grenadeT <= 0 && dist > 90 && dist < 220 && this.onGround) {
          this.grenadeT = rnd(6, 12);
          this.throwT = 0.4;
          w.grenades.push(new Grenade(this.cx, this.y + 4, dir * 190, -180, 'e', 1.6));
          SFX('thrown', { v: 0.6 });
        }
      } else {
        // vertical difference: jump or find stairs
        if (p.y < this.y - 24 && this.onGround && Math.abs(dx) < 30 && chance(0.02)) { this.vy = -260; }
        this.vx = dist > 60 ? dir * this.def.speed * 0.6 : 0;
        this.wantsWalk = true;
      }
    } else {
      this.vx *= 0.9;
      this.anim = 'idle';
    }
  }

  aiRusher(dt, w, p, dx, dist) {
    if (!this.alert || this.stun > 0) { this.vx *= 0.9; return; }
    const dir = sign(dx) || 1;
    this.face = dir;
    this.vx = dir * this.def.speed;
    this.wantsWalk = true;
    if (chance(dt * 3)) SFX('grunt', { v: 0.5 });
    if (Math.abs(p.y - this.y) > 20 && this.onGround) { this.vy = -280; }
    if (dist < 20 && this.atkT <= 0 && w.canEnemyAttack(this)) {
      this.atkT = 0.8;
      SFX('knife');
      FX.hit(p.cx - dir * 4, p.cy, '#ffffff', 6);
      p.damage(1, w, this.cx);
      this.vx = -dir * 60;
    }
    this.atkT = Math.max(0, (this.atkT || 0) - dt);
  }

  aiSniper(dt,w,p,dx,dist) {
    this.vx=0;this.face=sign(dx)||this.face;this.anim='crouch';
    if(!this.alert||!w.canEnemyAttack(this)||dist>400)return;
    this.fireT-=dt;
    if(this.laser && this.laser.dead)this.laser=null;
    if(!this.laser && this.fireT<=0){
      this.laser=new LaserLine(this.cx,this.cy-2,this.aim,1.1);
      this.laser.owner=this;
      w.lasers.push(this.laser);
      this.fireT=2.8;
    }
  }

  aiHeavy(dt, w, p, dx, dist) {
    if (!this.alert || this.stun > 0) { this.vx *= 0.85; return; }
    const dir = sign(dx) || 1;
    this.face = dir;
    this.wantsWalk = true;
    if (dist > 120) this.vx = dir * this.def.speed;
    else this.vx = dist < 60 ? -dir * this.def.speed * 0.6 : 0;
    this.fireT -= dt;
    if (this.fireT <= 0 && dist < 240) {
      this.fireT = rnd(1.2, 2.2);
      this.burst = 4;
    }
    if (this.burst > 0) {
      this.burstT = (this.burstT || 0) - dt;
      if (this.burstT <= 0) {
        this.burstT = 0.14; this.burst--;
        this.shootAt(w, p, 'ebolt', 200, 12, 0.05, 2.2);
        SFX('ebolt', { v: 0.5 });
      }
    }
  }

  aiDrone(dt, w, p, dx, dy, dist) {
    // hold station above the player and circle, rather than drifting off-screen
    const targetY = p.y - 46 + Math.sin(this.t * 1.6 + this.orbit) * 16;
    this.vy = clamp((targetY - this.y) * 2.6, -100, 100);
    const dir = sign(dx) || 1;
    if (Math.abs(dx) > 54) this.vx = clamp(this.vx + dir * 130 * dt, -this.def.speed, this.def.speed);
    else this.vx = clamp(this.vx * Math.pow(0.25, dt), -34, 34);
    this.face = this.vx > 0 ? 1 : -1;
    // never let a flyer wander outside the visible field
    const lo = w.camX + this.w, hi = w.camX + VW - this.w;
    if (this.x < lo) { this.x = lo; this.vx = Math.abs(this.vx); }
    if (this.x > hi) { this.x = hi; this.vx = -Math.abs(this.vx); }
    this.bombT = (this.bombT || rnd(1.5, 3.5)) - dt;
    if (this.bombT <= 0 && this.alert && w.canEnemyAttack(this)) {
      this.bombT = rnd(2.2, 4);
      w.bullets.push(new Bullet({
        x: this.cx, y: this.y + 8, vx: rnd(-14, 14), vy: 60, dmg: 14, life: 4, own: 'e',
        kind: 'grenade', grav: 260, explode: 0.6, r: 3, selfSafe: true,
      }));
      SFX('thrown', { v: 0.4 });
    }
  }

  aiCopter(dt, w, p, dx, dy, dist) {
    const targetY = p.y - 78;
    this.vy = clamp((targetY - this.y) * 2, -60, 60);
    if (this.x < w.camX + 20) this.vx = Math.abs(this.vx) || 60;
    if (this.x > w.camX + VW - 20) this.vx = -Math.abs(this.vx) || -60;
    this.face = this.vx > 0 ? 1 : -1;
    this.bombT = (this.bombT || 1.5) - dt;
    if (this.bombT <= 0 && w.canEnemyAttack(this)) {
      this.bombT = rnd(1.2, 2.2);
      w.bullets.push(new Bullet({ x: this.x + 10, y: this.y + 16, vx: rnd(-8, 8), vy: 70, dmg: 16, life: 5, own: 'e', kind: 'grenade', grav: 240, explode: 0.7, r: 3 }));
      SFX('thrown', { v: 0.4 });
    }
    if (chance(0.4)) FX.smokeTrail(this.x + 6, this.y + 2, 'rgba(100,100,110,0.4)', 1.6);
  }

  aiTurret(dt, w, p, dx, dist, kind) {
    if (!this.alert) { this.anim = 'idle'; return; }
    this.face = sign(dx) || this.face;
    this.anim = 'idle';
    this.fireT -= dt;
    if (this.fireT <= 0 && dist < 250) {
      this.fireT = kind === 'ebolt' ? rnd(1.1, 1.9) : rnd(0.9, 1.5);
      this.burst = kind === 'ebolt' ? 1 : 3;
    }
    if (this.burst > 0) {
      this.burstT = (this.burstT || 0) - dt;
      if (this.burstT <= 0) {
        this.burstT = 0.16; this.burst--;
        this.shootAt(w, p, kind, kind === 'ebolt' ? 165 : 210, kind === 'ebolt' ? 11 : 8, kind === 'ebolt' ? 0.03 : 0.16, 2.4);
        SFX(kind === 'ebolt' ? 'ebolt' : 'shotgun', { v: 0.5 });
      }
    }
  }

  aiBarrelman(dt, w, p, dx, dist) {
    if (!this.alert) { this.vx *= 0.9; return; }
    const dir = sign(dx) || 1;
    this.face = dir;
    this.vx = dir * this.def.speed;
    this.wantsWalk = true;
    if(dist<56 && this.fuseT===undefined)this.fuseT=1.1;
    if(this.fuseT!==undefined){this.fuseT-=dt;this.vx=0;}
    if (this.fuseT < 0.8 && (G.time * 8 | 0) % 2) { /* blink */ }
    if (chance(dt * 4)) SFX('grunt', { v: 0.6, pitch: 1.4 });
    if (this.fuseT !== undefined && this.fuseT <= 0) {
      FX.fireball(this.cx, this.cy, 1.35);
      FX.explosion(this.cx, this.cy, 1.35);
      SFX('explodeBig');
      w.explodeDamage(this.cx, this.cy, 50, 62, 'e');
      this.dead = true;
      w.addScore(50, this.cx, this.cy);
      if (chance(0.5)) SFX('scream', { v: 0.6 });
    }
  }

  aiJeep(dt, w, p) {
    this.vx = this.face * this.def.speed;
    this.y += 0;
    // drive over ground
    const gy = w.groundBelow(this.cx, this.y + this.h);
    if (gy !== null && this.y + this.h >= gy) { this.y = gy - this.h; this.vy = 0; this.bump = (this.bump || 0) + dt; }
    else if (gy === null || this.y + this.h < gy - 20) { /* airborne */ }
    // crush / run over
    if (p.state === 'normal' && aabb(this, p) && p.state !== 'invincible') {
      this.crushT = (this.crushT || 0) - dt;
      if (this.crushT <= 0) { p.damage(2, w, this.cx); this.crushT = 0.8; FX.shake(4); }
    }
    // destroy obstacles
    for (const e of w.enemies) {
      if (e === this || e.dead) continue;
      if (e.def.static && aabb({ x: this.x, y: this.y, w: this.w, h: this.h - 6 }, e)) e.hurt(99, w, this.cx);
    }
    this.fireT -= dt;
    if (this.fireT <= 0 && w.canEnemyAttack(this)) {
      this.fireT = rnd(0.5, 0.8);
      const a = this.aim;
      w.bullets.push(new Bullet({
        x: this.x + this.w / 2 + Math.cos(a) * 14, y: this.y + 8,
        vx: Math.cos(a) * 230, vy: Math.sin(a) * 230, dmg: 8, life: 1.6, own: 'e', kind: 'pistol',
      }));
      SFX('mg', { v: 0.35 });
      FX.muzzle(this.x + this.w / 2 + Math.cos(a) * 16, this.y + 8, a, false);
    }
    this.aim = Math.atan2(p.cy - (this.y + 8), p.cx - (this.x + this.w / 2));
    if (this.x < w.camX - 80) this.face = 1;
    if (this.x > w.camX + VW + 120) this.face = -1;
    if (chance(0.5)) FX.dust(this.x + 4, this.y + this.h, 1, 'rgba(180,160,120,0.5)');
  }

  updateAnim() {
    let a = this.anim;
    if (this.panic > 0 && a !== 'panic') a = 'panic';
    else if (this.shootAnim > 0) a = 'crouch';
    else if (this.def.static) a = 'idle';
    else if (!this.onGround) a = this.vy < 0 ? 'jump' : 'fall';
    else if (Math.abs(this.vx) > 12) a = 'run';
    else a = 'idle';
    if (this.stun > 0) a = 'hurt';
    this.anim = a;
    const def = ANIMS[a];
    this.frame = Math.floor(this.animT * def[2]) % def[1];
  }

  draw(c, camX, camY) {
    if (this.dead) return;
    const d = this.def;
    c.save();
    c.translate(0, G.camShakeY * 0);
    switch (this.type) {
      case 'drone': {
        const spr = droneSprites[(G.time * 14 | 0) % 4];
        c.drawImage(spr, Math.round(this.x - camX), Math.round(this.y - camY));
        if (this.flash > 0) { c.globalAlpha = this.flash * 0.7; c.drawImage(whiten(spr), Math.round(this.x - camX), Math.round(this.y - camY)); c.globalAlpha = 1; }
        break;
      }
      case 'copter': {
        const spr = droneSprites[(G.time * 20 | 0) % 4];
        c.save();
        c.translate(this.x - camX, this.y - camY);
        c.scale(this.face, 1);
        c.drawImage(spr, 0, 0);
        c.drawImage(spr, 0, -10);
        c.restore();
        if (this.flash > 0) { c.globalAlpha = this.flash * 0.7; c.save(); c.translate(this.x - camX, this.y - camY); c.scale(this.face, 1); c.drawImage(whiten(spr), 0, 0); c.drawImage(whiten(spr), 0, -10); c.restore(); c.globalAlpha = 1; }
        break;
      }
      case 'turret': case 'emplacement': {
        const spr = this.type === 'turret' ? turretProp() : gunEmplacement();
        c.drawImage(spr, Math.round(this.x - camX), Math.round(this.y - camY));
        // barrel tracking player
        c.save();
        c.translate(Math.round(this.cx - camX), Math.round(this.cy - camY - 2));
        c.rotate(this.alert ? this.aim : Math.PI);
        R(c, 0, -2, 16, 4, '#141018'); R(c, 1, -1, 15, 2, '#4a4a58');
        c.restore();
        if (this.flash > 0) { c.globalAlpha = this.flash * 0.6; c.drawImage(whiten(spr), Math.round(this.x - camX), Math.round(this.y - camY)); c.globalAlpha = 1; }
        break;
      }
      case 'barrel': {
        const spr = this.type === 'barrel' && this.fuseT !== undefined ? barrel() : barrel();
        c.drawImage(spr, Math.round(this.x - camX), Math.round(this.y - camY));
        if (this.flash > 0) { c.globalAlpha = this.flash; c.drawImage(whiten(spr), Math.round(this.x - camX), Math.round(this.y - camY)); c.globalAlpha = 1; }
        break;
      }
      case 'jeep': {
        const spr = jeepFrame(Math.floor((this.bump || this.t) * 12) % 2);
        c.drawImage(spr, Math.round(this.x - camX), Math.round(this.y - camY));
        c.drawImage(jeepGunner(), Math.round(this.x - camX + (this.face > 0 ? 30 : 4)), Math.round(this.y - camY - 12));
        if (this.flash > 0) { c.globalAlpha = this.flash * 0.6; c.drawImage(whiten(spr), Math.round(this.x - camX), Math.round(this.y - camY)); c.globalAlpha = 1; }
        break;
      }
      default: {
        const spr = fighterFrame(d.pal, this.anim, this.frame, d.gun, { aim: this.face > 0 ? this.aim : Math.PI - this.aim });
        drawSpr(c, spr, this.cx - camX, this.y + this.h - camY, this.face, this.flash);
        // heavy armour plate
        if (this.type === 'heavy') {
          c.save();
          c.globalAlpha = 0.95;
          c.translate(Math.round(this.cx - camX + this.face * 4), Math.round(this.cy - camY));
          c.scale(this.face, 1);
          R(c, -1, -6, 8, 12, '#141018'); R(c, 0, -5, 6, 10, '#6a6a78'); R(c, 0, -5, 6, 2, '#8a8a9a');
          c.restore();
        }
        if (this.type === 'barrelman') {
          c.save();
          c.translate(Math.round(this.cx - camX), Math.round(this.cy - camY - 2));
          c.scale(this.face, 1);
          const blink = this.fuseT < 0.9 && (G.time * 10 | 0) % 2 ? '#ff4030' : '#f0d060';
          R(c, 0, -5, 7, 10, '#141018'); R(c, 1, -4, 5, 8, '#3a5a3a'); R(c, 1, -4, 5, 2, '#5a8a5a');
          R(c, 1, -6, 5, 2, blink);
          c.restore();
        }
        // rifle muzzle flash
        if (this.shootAnim > 0.05) {
          c.save();
          c.translate(Math.round(this.cx - camX + Math.cos(this.aim) * 12), Math.round(this.cy - camY + Math.sin(this.aim) * 10));
          c.rotate(this.aim);
          c.globalAlpha = clamp(this.shootAnim / 0.14, 0, 1);
          c.drawImage(muzzleFlash(), 0, -9);
          c.restore();
        }
      }
    }
    c.restore();
    // health pips for tough enemies
    if (this.maxHp > 5 && this.hp < this.maxHp && this.hp > 0) {
      const wpx = Math.round(this.cx - camX - 8), wpy = Math.round(this.y - camY - 5);
      R(c, wpx, wpy, 16, 3, '#141018');
      R(c, wpx + 1, wpy + 1, 14 * (this.hp / this.maxHp), 1, '#e05038');
    }
  }
}
