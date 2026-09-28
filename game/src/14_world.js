/* ============================================================
   14 - WORLD: gameplay scene, waves, camera, HUD
   ============================================================ */
class World {
  constructor(fresh) {
    this.active = true;
    this.camX = 0; this.camY = 0; this.lockX = 0; this.camLock = null;
    this.bullets = []; this.grenades = []; this.lasers = [];
    this.enemies = []; this.corpses = []; this.pickups = []; this.captives = [];
    this.shockwaves = []; this.bossBeams = [];
    this.messages = []; this.prompts = [];
    this.boss = null; this.bossActive = false;
    this.waveIndex = -1; this.waveActive = null; this.waveClearT = 0;
    this.time = 0; this.finished = false; this.finishT = 0;
    this.zoneMsgT = 0; this.lastZone = 0;
    this.checkpoint = { x: 48, y: Level.groundYAt(48) - 22, set: false, waveIndex: -1, marker: -1 };
    this.inputLocked = false;
    this.hitPause = 0;
    this.events = {};
    this.rockT = 0;
    this.tally = null;
    this.lowAmmoWarn = 0;
    if (fresh) {
      this.score = 0; this.lives = 3; this.rescued = 0; this.totalCaptives = 0;
      this.startX = 48; this.startY = 0;
    }
    this.player = new Player(this.startX, this.startY);
    this.player.grenades = 8;
    this.player.y = Level.groundYAt(this.startX) - this.player.h;
    this.vehicle = new Vehicle(Level.vehicleX, Level.groundYAt(Level.vehicleX) - 26);
    this.totalCaptives = Level.captives.length;
    this.defeatedPosts = new Set();
    this.spawnFromLevel();
    Audio_.playMusic('action');
  }
  spawnFromLevel() {
    for (const p of Level.pickups) this.pickups.push(new Pickup(p.kind, p.x, p.y));
    for (const c of Level.captives) this.captives.push(new Captive(c));
    // static spawns are activated when near
    // Fixed guards already exist in the world; they never pop into view.
    this.spawnPosts();
  }
  spawnPosts() {
    for(let i=0;i<Level.spawns.length;i++){
      if(this.defeatedPosts.has(i))continue;
      const post=Level.spawns[i];
      const e=this.spawnEnemy(post.t,post.x,undefined,'ground',post.roof);
      e.postId=i;
    }
  }
  respawnAtCheckpoint() {
    const p = this.player;
    this.vehicle.ridden = false;
    p.reset(this.checkpoint.x, this.checkpoint.y);
    p.hp = p.maxHp;
    this.bullets.length = 0; this.grenades.length = 0; this.lasers.length = 0;
    this.shockwaves.length=0;this.bossBeams.length=0;this.prompts.length=0;
    Particles.length=0;G.hitStop=0;G.shake=G.camShakeX=G.camShakeY=0;
    p.invuln=2;this.deathT=0;this.inputLocked=false;
    for (const e of this.enemies) if (!e.dead) e.dead = true;
    this.enemies.length = 0;
    this.waveIndex = this.checkpoint.waveIndex;
    this.waveActive = null;
    this.camLock = null;
    if(this.boss && !this.boss.dead){this.boss=null;this.bossActive=false;}
    this.camX = clamp(p.cx - VW * 0.42, 0, Level.W * TILE - VW);
    this.camY=clamp(p.y-VH*0.56,0,Level.H*TILE-VH);
    this.spawnPosts();
    this.msg('CHECKPOINT - READY!', '#60f0f0', 1.5);
  }

  /* ---------- collision helpers ---------- */
  solidAt(x, y) {
    if (this.crateAt(x, y)) return true;
    return Level.solidAt(x, y);
  }
  crateAt(x, y) {
    for (const pk of this.pickups) {
      if (pk.dead || !pk.crate || pk.kind === 'crate_cover' && pk.breaking) continue;
      if (pk.kind.indexOf('crate_') !== 0) continue;
      if (x > pk.x && x < pk.x + 14 && y > pk.y && y < pk.y + 14) return true;
    }
    return false;
  }
  anySolid(x0, y0, x1, y1) {
    const tx0 = Math.floor(x0 / TILE), tx1 = Math.floor((x1 - 0.01) / TILE);
    const ty0 = Math.floor(y0 / TILE), ty1 = Math.floor((y1 - 0.01) / TILE);
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const t = Level.tileAt(tx * TILE + 1, ty * TILE + 1);
        if (t === T_SOLID || t === T_SPIKE) return true;
        if (t === T_SPIKE) return true;
      }
    }
    if (this.crateAt(x0, y0) || this.crateAt(x1, y0) || this.crateAt(x0, y1) || this.crateAt(x1, y1) ||
        this.crateAt((x0 + x1) / 2, (y0 + y1) / 2)) return true;
    return false;
  }
  anyPlat(x0, y0, x1, y1) {
    const tx0 = Math.floor(x0 / TILE), tx1 = Math.floor((x1 - 0.01) / TILE);
    const ty0 = Math.floor(y0 / TILE), ty1 = Math.floor((y1 - 0.01) / TILE);
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      if (Level.tileAt(tx * TILE + 1, ty * TILE + 1) === T_PLAT) return true;
    }
    return false;
  }
  platformTop(x0, x1, oldFeet, newFeet) {
    for (let ty = Math.max(0, Math.floor((oldFeet - 0.02) / TILE)); ty <= Math.floor(newFeet / TILE); ty++) {
      const top = ty * TILE;
      if (oldFeet > top + 0.02 || newFeet < top) continue;
      for (let tx = Math.floor(x0 / TILE); tx <= Math.floor(x1 / TILE); tx++) {
        if (Level.tileAt(tx * TILE + 1, top + 1) === T_PLAT) return top;
      }
    }
    return null;
  }
  onLadder(x, y) { return Level.tileAt(x, y) === T_LADDER; }
  groundBelow(x, y) {
    const tx = Math.floor(x / TILE);
    if (tx < 0 || tx >= Level.W) return null;
    const start = Math.max(0, Math.floor(y / TILE));
    for (let ty = start; ty < Level.H; ty++) {
      const t = Level.tileAt(tx * TILE + 2, ty * TILE + 2);
      if (t === T_SOLID || t === T_PLAT) return ty * TILE;
    }
    return null;
  }
  addScore(n, x, y) {
    this.score += n;
    if (x !== undefined) FX.popup(x, y - 10, n, n >= 1000 ? '#ffd040' : '#ffffff');
    if (Math.floor(this.score / 30000) > Math.floor((this.score - n) / 30000)) { this.lives++; SFX('pickup'); this.msg('EXTRA LIFE!', '#60f0f0', 1.6); }
  }
  msg(txt, col, life) {
    this.messages.push({ txt, col: col || '#ffffff', t: 0, life: life || 1.6 });
    if (this.messages.length > 4) this.messages.shift();
  }
  showPrompt(txt, x, y) {
    for (const p of this.prompts) if (p.txt === txt) return;
    this.prompts.push({ txt, x, y, t: 0, life: 0.3 });
  }
  damagePlayer(n, srcX) { this.player.damage(n, this, srcX); }
  giveShield(p) { p.shield = 6; SFX('shield'); FX.popup(p.cx, p.y - 10, 'SHIELD!', '#60f0f0'); emit({ x: p.cx, y: p.cy, life: 0.4, kind: 'ring', col: 'rgba(96,240,240,0.8)', size: 8 }); }
  explodeDamage(x, y, dmg, radius, own) {
    // damage enemies
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (dist2(x, y, e.cx, e.cy) < radius * radius) {
        const falloff = 1 - Math.sqrt(dist2(x, y, e.cx, e.cy)) / radius;
        e.hurt(dmg * clamp(falloff, 0.15, 1), this, x, { pierce: true });
      }
    }
    // damage player (unless selfSafe or friendly)
    if (own === 'e') {
      if (dist2(x, y, this.player.cx, this.player.cy) < radius * radius) this.damagePlayer(1, x);
    }
    // crates & pickups
    for (const pk of this.pickups) {
      if (pk.dead || pk.kind.indexOf('crate_') !== 0) continue;
      if (dist2(x, y, pk.cx, pk.cy) < radius * radius * 0.8) this.breakCrate(pk);
    }
    // barrels chain
    for (const e of this.enemies) {
      if (e.dead || e.type !== 'barrel') continue;
      if (dist2(x, y, e.cx, e.cy) < radius * radius * 0.9) e.hurt(99, this, x);
    }
  }
  beamHit(x0, y0, x1, y1, dmg, own) {
    if (own === 'e') {
      const p = this.player;
      if (segRect(x0, y0, x1, y1, p.x, p.y, p.w, p.h)) this.damagePlayer(1, x0);
    } else {
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (segRect(x0, y0, x1, y1, e.x, e.y, e.w, e.h)) e.hurt(dmg, this, x0);
      }
      if (this.boss && !this.boss.dead) this.boss.hitBullets([{ x: (x0 + x1) / 2, y: (y0 + y1) / 2, dead: false }], this);
    }
  }
  knifeHit(x, y, dir, range, arc) {
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (dist2(x, y, e.cx, e.cy) < range * range) e.hurt(3, this, x - dir * 10);
    }
    for (const pk of this.pickups) {
      if (pk.dead || pk.kind.indexOf('crate_') !== 0) continue;
      if (dist2(x, y, pk.cx, pk.cy) < range * range) this.breakCrate(pk);
    }
    for (const c of this.captives) {
      if (c.freed || c.gone) continue;
      if (dist2(x, y, c.cx, c.cy) < range * range) this.freeCaptive(c);
    }
    if (this.boss && !this.boss.dead) {
      for (const k in this.boss.parts) {
        const p = this.boss.parts[k];
        if (p.broken || (k === 'core' && p.hidden)) continue;
        if (p.x < x + 6 && p.x + p.w > x - 6) { this.boss.hurt(k, 12, this); break; }
      }
    }
    FX.hit(x + dir * 8, y, '#ffffff', 4);
  }
  enemyPosition(type, x, preferredY, roof = false) {
    const d = ETYPE[type];
    x = clamp(x, 2, Level.W * TILE - d.w - 2);
    if (d.fly) {
      let y = preferredY === undefined ? Level.groundYAt(x) - 100 : preferredY;
      for (let offset = 0; offset < 160; offset += 4) {
        for (const candidate of [y + offset, y - offset]) {
          if (candidate > 16 && !this.anySolid(x, candidate, x + d.w, candidate + d.h)) return {x,y:candidate};
        }
      }
    }
    // Locate a complete support surface with enough headroom for this enemy.
    for (let offset = 0; offset <= 160; offset += TILE) {
      for (const candidateX of [x + offset, x - offset]) {
        if (candidateX < 1 || candidateX + d.w >= Level.W*TILE) continue;
        const base = roof ? 2 : Math.max(2, Math.floor(Level.groundYAt(candidateX)/TILE)-2);
        for (let row = base; row < Level.H; row++) {
          const feet = row*TILE, y=feet-d.h;
          if (this.anySolid(candidateX,y,candidateX+d.w,feet)) continue;
          const supported = px => Level.solidAt(px,feet+1) || Level.platAt(px,feet+1);
          if (supported(candidateX+1) && supported(candidateX+d.w-1)) return {x:candidateX,y};
        }
      }
    }
    return {x,y:Level.groundYAt(x)-d.h};
  }
  spawnEnemy(type, x, y, entrance, roof = false) {
    const pos = this.enemyPosition(type, x, y, roof);
    const e = new Enemy(type, pos.x, pos.y, 'ground');
    e.face = this.player.cx < e.cx ? -1 : 1;
    e.spawnT = 0.65;
    e.onGround = !e.def.fly;
    this.enemies.push(e);
    return e;
  }
  lineClear(x0,y0,x1,y1) {
    const steps=Math.max(1,Math.ceil(Math.hypot(x1-x0,y1-y0)/4));
    for(let i=1;i<steps;i++)if(Level.solidAt(lerp(x0,x1,i/steps),lerp(y0,y1,i/steps)))return false;
    return true;
  }
  canEnemyAttack(e) {
    return e.spawnT <= 0 && e.stun <= 0 && this.player.state === 'normal' &&
      e.cx >= this.camX + 8 && e.cx <= this.camX + VW - 8 &&
      this.lineClear(e.cx,e.cy-2,this.player.cx,this.player.cy);
  }
  spawnPickup(x, y, kind) {
    this.pickups.push(new Pickup(kind, x - 7, y - 7));
  }
  breakCrate(pk) {
    if (pk.dead) return;
    pk.dead = true;
    const c = CRATE_CONTENT[pk.kind] || {};
    for (let i = 0; i < 10; i++) {
      emit({
        x: pk.cx, y: pk.cy, vx: rnd(-140, 140), vy: rnd(-190, -30), g: 700, life: rnd(0.5, 1.1),
        kind: 'debris', col: '#a07840', col2: '#5a4020', size: rnd(2, 4), rot: rnd(0, 6), vr: rnd(-12, 12), bounce: 1,
      });
    }
    SFX('clank', { v: 0.8 });
    if (c.weapon) {
      this.pickups.push(new Pickup(pk.kind, pk.x, pk.y));
      this.pickups[this.pickups.length - 1].bounce = 0.1;
    } else if (c.boom) {
      FX.fireball(pk.cx, pk.cy, 0.6);
      FX.explosion(pk.cx, pk.cy, 0.5);
      SFX('explode', { v: 0.5 });
    }
  }
  collect(pk) {
    if (pk.dead) return;
    const k = pk.kind;
    if (k === 'medal' || k === 'fruit' || k === 'gold') {
      pk.dead = true;
      this.addScore(k === 'gold' ? 1000 : k === 'fruit' ? 300 : 500, pk.cx, pk.cy);
      SFX(k === 'gold' ? 'coin' : 'coin', { v: 0.7 });
      emit({ x: pk.cx, y: pk.cy, life: 0.3, kind: 'flash', col: 'rgba(255,230,150,0.8)', size: 6 });
      return;
    }
    const c = CRATE_CONTENT[k] || {};
    if (c.boom) return;                     // cover crates are only broken, not collected
    pk.dead = true;
    let msg = null;
    if (c.weapon) {
      this.player.weapon = c.weapon;
      this.player.ammo[c.weapon] = (this.player.ammo[c.weapon] || 0) + c.ammo;
      msg = c.msg;
      SFX('weaponGet');
      FX.shake(2);
    } else if (c.grenades) {
      this.player.grenades = Math.min(this.player.maxGrenades, this.player.grenades + c.grenades);
      msg = c.msg; SFX('pickup');
    } else if (c.refil) {
      for (const weapon in this.player.ammo) this.player.ammo[weapon] += Math.ceil(WEAPONS[weapon].ammo / 2);
      msg = c.msg; SFX('pickup');
    } else if (c.health) {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + c.health);
      msg = c.msg; SFX('heal');
    } else if (c.shield) {
      this.giveShield(this.player);
      msg = c.msg; SFX('shield');
    }
    if (msg) this.msg(msg, '#ffe060', 1.4);
  }
  freeCaptive(c) {
    if (c.freed) return;
    c.freed = true; c.rope = false;
    this.rescued++;
    SFX('rescue');
    this.addScore(c.reward.pts || 200, c.cx, c.cy - 20);
    FX.popup(c.cx, c.cy - 30, 'FREE!', '#60f0f0');
    const it = c.reward.item;
    if (it && it !== 'medal' && it !== 'fruit' && it !== 'gold' && WEAPONS[it]) {
      this.spawnPickup(c.cx, c.cy - 10, 'crate_' + it);
      this.msg('WEAPON GET! ' + WEAPONS[it].name, '#ffe060', 1.6);
    } else if (it && CRATE_CONTENT['crate_' + it]) {
      this.spawnPickup(c.cx, c.cy - 10, 'crate_' + it);
      this.msg('BONUS! ' + it.toUpperCase(), '#ffe060', 1.4);
    } else if (it) {
      this.spawnPickup(c.cx, c.cy - 10, it);
    }
    if (c.reward.secret) {
      const s = Level.secrets[c.reward.secret - 1];
      if (s) { s.found = true; this.msg('SECRET AREA FOUND!', '#c060ff', 2); this.addScore(1000, c.cx, c.cy - 34); }
    }
  }
  enterVehicle() {
    if (this.vehicle.dead || !this.vehicle.active) return;
    this.vehicle.ridden = true;
    this.player.state = 'normal';
    this.player.vehicle = this.vehicle;
    SFX('engine');
    this.msg('IRON HARE!  Z=FIRE  V=CANNON  DOWN=EXIT', '#a0e0ff', 2.6);
    FX.shake(3);
  }
  exitVehicle(forced) {
    const v = this.vehicle;
    if (!v.ridden && !forced) return;
    v.ridden = false;
    this.vehicleOut = true;
    const p = this.player;
    p.vehicle = null;
    p.x = v.x - 10; p.y = v.y - 4;
    p.state = 'normal';
    p.invuln = Math.max(p.invuln, 1.4);
    p.vy = -180;
    if (forced) {
      this.msg('HOP OUT!', '#ff8040', 1.6);
      FX.fireball(v.cx, v.cy, 1.8);
      FX.explosion(v.cx, v.cy, 1.8);
    }
  }
  lockCamera(on) { this.camLock = on ? this.camX : null; }
  msgBanner() { }
  bossDefeated() {
    if (this.finished) return;
    this.finished = true;
    this.finishT = 0;
    this.player.state = 'victory';
    SFX('victory');
    Audio_.playMusic('action');
    this.tally = {
      score: this.score, rescued: this.rescued, total: this.totalCaptives,
      lives: this.lives, time: this.time,
    };
  }

  /* ================= UPDATE ================= */
  update(dt) {
    this.time += dt;
    const p = this.player;
    if (this.finished) {
      this.finishT += dt;
      this.updateCamera(dt, true);
      this.updateEntities(dt, true);
      if (this.finishT > 2.2) { this.active = false; Scene.set('complete', this.tally); }
      return;
    }
    // pause
    if (hit('pause')) { Scene.set('pause'); return; }
    if (hit('mute')) { G.muted = !G.muted; Audio_.setMuted(G.muted); this.msg(G.muted ? 'SOUND OFF' : 'SOUND ON', '#a0e0ff', 1); }
    if (p.state === 'dead') {
      p.update(dt, this);
      this.deathT = (this.deathT || 0) + dt;
      if (this.deathT > 1.8) {
        this.lives--;
        this.deathT = 0;
        if (this.lives <= 0) { this.active = false; Scene.set('gameover', this); return; }
        this.respawnAtCheckpoint();
      }
      this.updateEntities(dt, false);
      return;
    }
    this.deathT = 0;
    this.updateCamera(dt, false);
    // while driving, the player body is slaved to the vehicle (see updateEntities)
    if (!this.vehicle.ridden) p.update(dt, this);
    else { p.invuln = Math.max(0, p.invuln - dt); p.hitFlash = Math.max(0, p.hitFlash - dt * 4); }
    this.updateWaves(dt);
    this.updateEvents(dt);
    this.updateCheckpoints();
    this.updateEntities(dt, false);
    this.updateHUDState(dt);
  }

  updateCamera(dt, cinematic) {
    const p = this.player;
    if (p.state === 'dead') return;
    const targetX = p.cx - VW * 0.42;
    let tx = clamp(targetX, 0, Level.W * TILE - VW);
    // during the boss fight, frame the player on the left and the machine on
    // the right: the camera follows whichever edge needs to stay visible
    if (this.bossArenaLock && this.boss) {
      const bLeft = this.boss.x - 30, bRight = this.boss.x + BOSS_W;
      // camera must not scroll so far right that the machine runs off the edge
      const maxCam = bRight - VW + 8;
      // ...nor so far left that the player leaves the frame
      const minCam = p.cx - VW + 70;
      tx = clamp(tx, Math.min(minCam, maxCam), Math.max(minCam, maxCam));
      tx = clamp(tx, 0, Level.W * TILE - VW);
    }
    if (this.camLock !== null) {
      this.camX = this.camLock;
    } else {
      const k = cinematic ? 0.03 : 0.12;
      this.camX = lerp(this.camX, tx, k);
    }
    // vertical: follow the player, biased so their head sits above centre
    const wantY = (p.y + p.h * 0.4) - VH * 0.46;
    const groundY = Level.groundYAt(clamp(this.camX + VW / 2, 0, Level.W * TILE - 2)) - 196;
    const ty = lerp(wantY, groundY, 0.4);
    this.camY = lerp(this.camY, clamp(ty, 0, Level.H * TILE - VH), 0.06);
    this.camX = clamp(this.camX, 0, Level.W * TILE - VW);
  }

  updateWaves(dt) {
    const p = this.player;
    if (!this.waveActive && this.waveIndex + 1 < Level.waves.length) {
      const def = Level.waves[this.waveIndex + 1];
      if (p.cx >= def.x*TILE) {
        this.waveIndex++;
        const queue=[];
        for(const [type,count]of def.list)for(let i=0;i<count;i++)queue.push(type);
        this.waveActive={def,list:[],queue,timer:0.9};
        this.camLock=clamp(def.x*TILE-VW*0.4,0,Level.W*TILE-VW);
        this.camX=this.camLock;
        this.msg(def.msg+' - ENEMIES AHEAD', '#ffb060',2);
        SFX('lock');
      }
    }
    const wave=this.waveActive;
    if(wave){
      wave.timer-=dt;
      if(wave.queue.length && wave.timer<=0 && wave.list.filter(e=>!e.dead).length<4){
        const type=wave.queue.shift();
        let spawnX=Math.max(this.camLock+VW+16,p.cx+128);
        for(let attempt=0;attempt<8;attempt++){
          if(!this.enemies.some(e=>!e.dead && Math.abs(e.x-spawnX)<40))break;
          spawnX+=40;
        }
        const e=this.spawnEnemy(type,spawnX,this.camY+70,'ground');
        e.alert=1;e.face=-1;
        wave.list.push(e);wave.timer=0.7;
      }
      if(!wave.queue.length && !wave.list.some(e=>!e.dead)){
        wave.cleared=(wave.cleared||0)+dt;
        if(wave.cleared>0.4){
          this.camLock=null;this.waveActive=null;this.msg(wave.def.clear,'#60f0f0',1.6);
          SFX('unlock');this.addScore(500,p.cx,p.cy-20);this.setCheckpoint(Math.max(p.x,wave.def.x*TILE),true);
        }
      }
    }else this.goT=((this.goT||0)-dt)>0?this.goT-dt:1.6;
  }
  setCheckpoint(x, force = false, marker = this.checkpoint.marker) {
    if(!force && x<=this.checkpoint.x)return;
    const pos=this.enemyPosition('soldier',Math.max(x,this.checkpoint.x));
    this.checkpoint={...pos,set:true,waveIndex:this.waveIndex,marker};
    SFX('confirm');this.msg('CHECKPOINT SAVED', '#60f0f0', 1.8);
  }
  updateCheckpoints() {
    if(this.player.state!=='normal'||this.waveActive||this.bossActive)return;
    for(const point of Level.checkpoints){
      if(point.id>this.checkpoint.marker && this.player.cx>=point.x &&
        this.player.cx-point.x<80 && Math.abs(this.player.feet-point.y)<40){
        this.setCheckpoint(point.x,false,point.id);
      }
    }
  }

  updateEvents(dt) {
    const p = this.player;
    const ev = this.events;
    const z=Level.zoneAtPx(p.cx);
    // boss trigger
    if (!this.boss && !this.waveActive && p.cx > Level.bossTrigger) {
      this.boss = new Boss(this);
      this.boss.start(this);
      this.bossActive = true;
      // frame the fight: player on the left, machine on the right
      this.bossArenaLock = true;
    }
    // zone banner
    const zi = z.i;
    if (zi !== this.lastZone) {
      this.lastZone = zi;
      this.msg('- ' + z.name + ' -', '#ffffff', 2.4);
    }
  }

  updateEntities(dt, cinematic) {
    const p = this.player;
    // enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(dt, this);
      if (e.dead) {
        this.enemies.splice(i, 1);
        continue;
      }
      // separation so they don't stack
      for (let j = 0; j < i; j++) {
        const o = this.enemies[j];
        if (o.dead) continue;
        if (e.def.static || o.def.static) continue;
        if (Math.abs(e.cx - o.cx) < 9 && Math.abs(e.y - o.y) < 16) {
          const d = sign(e.cx - o.cx) || 1;
          e.x += d * 0.4; o.x -= d * 0.4;
        }
      }
    }
    // corpses
    for (let i = this.corpses.length - 1; i >= 0; i--) {
      this.corpses[i].update(dt, this);
      if (this.corpses[i].dead) this.corpses.splice(i, 1);
    }
    // player bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      if (b.dead) { this.bullets.splice(i, 1); continue; }
      b.update(dt, this);
      if (b.dead) { this.bullets.splice(i, 1); continue; }
      if (b.own === 'p') {
        let hit = false;
        for (const e of this.enemies) {
          if (e.dead) continue;
          if (b.x > e.x && b.x < e.x + e.w && b.y > e.y && b.y < e.y + e.h) {
            // Explosive impact is one blast, not a direct hit plus the same blast again.
            if (b.explode) { b.boom(this); hit = true; break; }
            e.hurt(b.dmg, this, b.sx, { pierce: b.armorPiercing });
            b.dead = true; hit = true; break;
          }
        }
        if (!hit) {
          for (const pk of this.pickups) {
            if (pk.dead || pk.kind.indexOf('crate_') !== 0) continue;
            if (b.x > pk.x && b.x < pk.x + 14 && b.y > pk.y && b.y < pk.y + 14) {
              this.breakCrate(pk);
              if (b.explode) b.boom(this);
              b.dead = true; hit = true; break;
            }
          }
        }
        if (!hit) {
          for (const c of this.captives) {
            if (c.freed || c.gone) continue;
            if (b.x > c.x - 6 && b.x < c.x + 17 && b.y > c.y - 24 && b.y < c.y + 22) {
              this.freeCaptive(c); b.dead = true; hit = true; break;
            }
          }
        }
        if (!hit && this.boss && !this.boss.dead) {
          const bl = [];
          bl.push(b);
          if (this.boss.hitBullets(bl, this) && b.dead) hit = true;
        }
        if (b.dead) { this.bullets.splice(i, 1); }
      } else {
        // enemy bullets vs player
        if (p.state === 'normal' && !(this.vehicle.ridden && b.selfSafe)) {
          if (b.x > p.x && b.x < p.x + p.w && b.y > p.y && b.y < p.y + p.h) {
            if (b.explode) {
              b.boom(this);
              if (dist2(b.x, b.y, p.cx, p.cy) < 40 * 40) p.damage(1, this, b.x);
            } else {
              p.damage(1, this, b.x);
              FX.hit(b.x, b.y, '#ff8060', 5);
              b.dead = true;
            }
          }
        }
        if (b.dead) this.bullets.splice(i, 1);
      }
    }
    // enemy grenades
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i];
      g.update(dt, this);
      if (g.dead) { this.grenades.splice(i, 1); continue; }
      if (g.own === 'p' && p.state === 'normal' && dist2(g.x, g.y, p.cx, p.cy) < 7 * 7) {
        g.boom(this);
        this.grenades.splice(i, 1);
        continue;
      }
    }
    // lasers
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const l = this.lasers[i];
      l.update(dt, this);
      if (l.dead) { const e = this.enemies.find(x => x.laser === l); if (e) e.laser = null; this.lasers.splice(i, 1); }
    }
    // pickups
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i];
      pk.update(dt, this);
      if (pk.dead) { this.pickups.splice(i, 1); continue; }
      if (p.state === 'normal') {
        if (dist2(pk.cx, pk.cy, p.cx, p.cy + 8) < 15 * 15) this.collect(pk);
      }
      if (pk.kind === 'crate_cover' && dist2(pk.cx, pk.cy, p.cx, p.cy + 8) < 12 * 12) {
        this.breakCrate(pk);
      }
    }
    // captives
    for (const c of this.captives) {
      c.update(dt, this);
      if (!c.freed && p.state === 'normal' && dist2(c.cx, c.cy + 6, p.cx, p.cy) < 15 * 15) this.freeCaptive(c);
    }
    // vehicle
    if(p.state==='normal' && !cinematic)this.vehicle.update(dt, this);
    // player in vehicle
    if (this.vehicle.ridden && p.state==='normal') {
      p.x = this.vehicle.x + 4;
      p.y = this.vehicle.y - 6;
      p.vx = 0; p.vy = 0; p.anim = 'crouch';
      p.frame = 0;
      if (p.state === 'normal' && !this.vehicle.dead) {
        // player takes less damage in vehicle
      }
    }
    // shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.t += dt;
      s.x += s.vx * dt;
      if (s.t > s.life) { this.shockwaves.splice(i, 1); continue; }
      if (p.state === 'normal' && dist2(s.x, s.y + 8, p.cx, p.cy) < 14 * 14 && p.onGround) {
        p.damage(1, this, s.x);
        s.vx *= 0.4;
      }
      if (chance(0.6)) FX.dust(s.x, s.y + 6, 1, 'rgba(200,190,160,0.6)');
    }
    // boss beams
    for (let i = this.bossBeams.length - 1; i >= 0; i--) {
      const b = this.bossBeams[i];
      b.t += dt;
      if (b.t > b.life) { this.bossBeams.splice(i, 1); continue; }
      if (p.state === 'normal' && p.x < b.x && p.y < b.y + 6 && p.y + p.h > b.y - b.h) this.damagePlayer(1);
      if (chance(0.8)) emit({ x: b.x - rnd(0, 30), y: b.y + rnd(-8, 8), vx: -rnd(40, 120), vy: rnd(-20, 20), life: 0.3, kind: 'spark', col: '#ff5040', size: 3 });
    }
    // boss
    if (this.boss) this.boss.update(dt, this);
    // particles
    updateParticles(dt, this);
    // messages
    for (let i = this.messages.length - 1; i >= 0; i--) {
      this.messages[i].t += dt;
      if (this.messages[i].t > this.messages[i].life) this.messages.splice(i, 1);
    }
    for (let i = this.prompts.length - 1; i >= 0; i--) {
      this.prompts[i].t += dt;
      if (this.prompts[i].t > this.prompts[i].life) this.prompts.splice(i, 1);
    }
    // ambient
    this.updateAmbient(dt);
    // despawn anything well off-screen (keeping the jeep and boss support alive)
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.dead || e.type === 'jeep') continue;
      if (e.x < this.camX - 160 || e.x > this.camX + VW + 320) e.dead = true;
    }
  }
  updateAmbient(dt) {
    const camX = this.camX, camY = this.camY;
    // birds
    for (const b of Level.birds) {
      b.x += b.dir * b.sp * dt;
      if (b.x < camX - 60) b.x = camX + VW + 40;
      if (b.x > camX + VW + 60) b.x = camX - 50;
      b.f += dt * 8;
    }
    for (const s of Level.smokes) {
      s.t += dt;
      s.x += 5 * dt;
      s.y += s.sp * dt;
      if (s.t > 6) { s.t = 0; s.x = camX + rnd(0, VW * 1.4); s.y = Level.groundYAt(clamp(s.x, 0, Level.W * TILE - 2)) - rnd(20, 120); }
    }
    // ambient particles from the visible field only
    if (chance(dt * 8)) {
      const z = Level.zoneAtPx(camX + rnd(0, VW));
      FX.smokeTrail(camX + rnd(0, VW), camY + rnd(40, 200), 'rgba(120,110,100,0.25)', 3);
    }
  }
  updateHUDState(dt) { }

  /* ================= DRAW ================= */
  draw(c) {
    const camX = Math.round(this.camX + G.camShakeX);
    const camY = Math.round(this.camY + G.camShakeY);
    // background in screen space (parallax layers handle their own offsets)
    BG.draw(c, camX, camY, G.time);
    c.save();
    c.translate(-Math.floor(camX), -Math.floor(camY));
    this.drawTiles(c, camX, camY);
    this.drawProps(c, camX, camY);
    c.restore();
    this.drawAmbient(c, camX, camY);
    c.save();
    c.translate(-camX, -camY);
    for(const point of Level.checkpoints){
      const saved=point.x<=this.checkpoint.x && this.checkpoint.set;
      const col=saved?'#60f0cf':'#c8a86c';
      R(c,point.x,point.y-36,3,36,'#292737');
      R(c,point.x+3,point.y-35,22,13,'#242534');
      R(c,point.x+5,point.y-33,18,9,col);
      text(c,saved?'OK':'CP',point.x+14,point.y-32,'#15262a',1,'c');
      R(c,point.x-4,point.y-2,12,2,'#968c78');
    }
    // entities
    for (const pk of this.pickups) pk.draw(c, 0, 0);
    for (const cap of this.captives) cap.draw(c, 0, 0);
    for (const e of this.enemies) e.draw(c, 0, 0);
    for (const cp of this.corpses) cp.draw(c, 0, 0);
    if (this.vehicle.active && (!this.vehicle.ridden)) this.vehicle.draw(c, 0, 0);
    if (this.boss) this.boss.draw(c, 0, 0);
    if (this.player.state !== 'normal' || !this.vehicle.ridden) this.player.draw(c, 0, 0);
    if (this.vehicle.ridden && this.vehicle.active) this.vehicle.draw(c, 0, 0);
    // bullets & fx
    for (const l of this.lasers) l.draw(c, 0, 0);
    for (const b of this.bullets) b.draw(c, 0, 0);
    for (const g of this.grenades) g.draw(c, 0, 0);
    this.drawShockwaves(c, 0, 0);
    this.drawBossBeams(c, 0, 0);
    drawParticles(c);
    c.restore();
    BG.fore(c, camX, camY, G.time);
    this.drawHUD(c);
  }

  drawTiles(c, camX, camY) {
    const x0 = Math.max(0, Math.floor(camX / TILE) - 1);
    const x1 = Math.min(Level.W - 1, Math.floor((camX + VW) / TILE) + 1);
    const y0 = Math.max(0, Math.floor(camY / TILE) - 1);
    const y1 = Math.min(Level.H - 1, Math.floor((camY + VH) / TILE) + 1);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const t = Level.grid[ty * Level.W + tx];
        if (t === T_EMPTY) continue;
        const px = tx * TILE, py = ty * TILE;
        if (t === T_LADDER) { c.drawImage(ladderSprite(), px, py); continue; }
        if (t === T_PLAT) { c.drawImage(platformSprite(ty % 2 ? 'wood' : 'metal'), px, py); continue; }
        if (t === T_SPIKE) {
          // spikes drawn over background
          const above = ty > 0 ? Level.grid[(ty - 1) * Level.W + tx] : T_EMPTY;
          if (above === T_EMPTY) {
            c.save();
            c.fillStyle = '#141018';
            for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(px + i * 4, py + 14); c.lineTo(px + i * 4 + 2, py + 2); c.lineTo(px + i * 4 + 4, py + 14); c.closePath(); c.fill(); }
            c.fillStyle = '#c0c4cc';
            for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(px + i * 4, py + 14); c.lineTo(px + i * 4 + 2, py + 3); c.lineTo(px + i * 4 + 2.6, py + 12); c.closePath(); c.fill(); }
            c.restore();
          }
          continue;
        }
        // solid
        const zone = Level.zoneAt[tx];
        const type = ZONES[zone] ? ZONES[zone].ground : 'sand';
        const above = ty > 0 ? Level.grid[(ty - 1) * Level.W + tx] : T_EMPTY;
        const cap = above !== T_SOLID && above !== T_PLAT;
        const v = (Math.floor(hash2(tx, ty * 3) * 3)) | 0;
        c.drawImage(tileSprite(type, v, cap), px, py);
        // depth shading: darken deeper rows so the mass reads as solid
        const depth = ty - Level.groundY[tx];
        if (depth > 0) {
          const k = Math.min(0.55, depth * 0.075);
          c.fillStyle = 'rgba(12,8,20,' + k.toFixed(3) + ')';
          c.fillRect(px, py, TILE, TILE);
        }
      }
    }
    // surface highlight line for a crisp silhouette
    c.save();
    c.globalAlpha = 0.25;
    c.fillStyle = '#ffffff';
    for (let tx = x0; tx <= x1; tx++) {
      const gy = Level.groundY[tx];
      const above = gy > 0 ? Level.grid[(gy - 1) * Level.W + tx] : T_EMPTY;
      if (above === T_EMPTY && gy >= y0 && gy <= y1) c.fillRect(tx * TILE, gy * TILE, TILE, 1);
    }
    c.restore();
  }

  drawProps(c, camX, camY) {
    const x0 = camX - 40, x1 = camX + VW + 40;
    for(const pr of Level.props){
      if(pr.kind!=='facade'||pr.x>x1||pr.x+pr.w<x0)continue;
      const c0=pr.z===1?'#635b60':'#806348';
      R(c,pr.x,pr.y,pr.w,pr.h,c0);
      R(c,pr.x+2,pr.y+3,pr.w-4,4,'#9b8980');
      for(let yy=pr.y+14;yy<pr.y+pr.h-28;yy+=24)for(let xx=pr.x+12;xx<pr.x+pr.w-12;xx+=28){
        R(c,xx,yy,13,16,'#282734');R(c,xx+2,yy+2,9,10,'#424452');R(c,xx-1,yy+15,16,3,'#92827a');
      }
      for(let xx=pr.x+24;xx<pr.x+pr.w-24;xx+=56){
        R(c,xx,pr.y+pr.h-30,22,30,'#292630');R(c,xx+2,pr.y+pr.h-28,18,28,'#3b333a');
      }
      for(let i=0;i<pr.w;i+=16)c.drawImage(platformSprite('metal'),pr.x+i,pr.y);
    }
    for (const pr of Level.props) {
      if (pr.x < x0 || pr.x > x1) continue;
      if (pr.kind === '_plat') continue;
      const y = pr.y;
      switch (pr.kind) {
        case 'ladder': {
          const h = pr.h || TILE;
          for (let i = 0; i < h; i += TILE) c.drawImage(ladderSprite(), pr.x, y + i);
          break;
        }
        case 'flag': {
          c.drawImage(flagProp(), pr.x, pr.y - flagProp().height);
          const cl = flagCloth(pr.zone || 0);
          const sway = Math.sin(G.time * 2.4 + pr.x * 0.05) * 2;
          c.save();
          c.translate(pr.x + 6, pr.y - flagProp().height + 1);
          c.drawImage(cl, Math.round(sway * 0.6), 0);
          c.restore();
          break;
        }
        case 'tyres': {
          c.drawImage(tyre(), pr.x, pr.y - 12); c.drawImage(tyre(), pr.x + 8, pr.y - 14);
          break;
        }
        case 'boulders': {
          for (let i = 0; i < 3; i++) {
            const bx = pr.x + i * 11, by = pr.y - (i === 1 ? 4 : 0);
            ellipseO(c, bx + 6, by - 6, 7, 6, { o: '#1a1418', c: i % 2 ? '#6a6058' : '#7a7068', h: '#9a9088', s: '#4a423c' });
          }
          break;
        }
        case 'roof': {
          for (let i = 0; i < pr.w; i += 48) c.drawImage(roofTile(), pr.x + i, pr.y - 14);
          break;
        }
        case 'window': {
          c.drawImage(windowFrame(), pr.x, pr.y);
          break;
        }
        default: {
          let spr = null;
          switch (pr.kind) {
            case 'sandbag': spr = sandbag(); break;
            case 'sandbagWall': spr = sandbagWall(); break;
            case 'crate': spr = crate(); break;
            case 'barrel': spr = barrel(); break;
            case 'barrelStack': spr = barrelStack(); break;
            case 'wreckCar': spr = wreckCar(); break;
            case 'cactus': spr = cactus(); break;
            case 'palm': spr = palm(); break;
            case 'rubble': spr = rubblePile(); break;
            case 'wallchunk': spr = wallChunk(); break;
            case 'balcony': spr = balcony(); break;
            case 'lamp': spr = lampPost(); break;
            case 'antenna': spr = antenna(); break;
            case 'sign': spr = signProp(); break;
            case 'bones': spr = bones(); break;
            case 'satellite': spr = satelliteDish(); break;
            case 'pipe': spr = pipeProp(); break;
            case 'fence': spr = fenceProp(); break;
            case 'tent': spr = tentProp(); break;
            case 'turretbase': spr = turretProp(); break;
            case 'drum': spr = drum(); break;
            case 'ammobox': spr = ammoBoxProp(); break;
            case 'street': spr = streetSign(); break;
            case 'girder': spr = girder(); break;
          }
          if (spr) c.drawImage(spr, pr.x, pr.kind === 'balcony' ? pr.y : pr.y - spr.height);
        }
      }
    }
  }

  drawAmbient(c, camX, camY) {
    // birds
    for (const b of Level.birds) {
      const x = b.x - camX, y = b.y - camY + Math.sin(b.f * 0.2) * 4;
      if (x < -20 || x > VW + 20) continue;
      c.save();
      c.globalAlpha = 0.5;
      c.translate(x, y); c.scale(b.dir, 1);
      c.drawImage(birdFrame(Math.floor(b.f) % 4), -6, -3);
      c.restore();
    }
    // smoke wisps
    for (const s of Level.smokes) {
      const x = s.x - camX, y = s.y - camY;
      if (x < -20 || x > VW + 20) continue;
      c.save();
      c.globalAlpha = 0.12 + 0.1 * Math.sin(s.t * 2);
      c.fillStyle = '#c8c0b0';
      const r = 3 + s.sc * 5;
      c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
      c.beginPath(); c.arc(x + 4, y - 3, r * 0.6, 0, TAU); c.fill();
      c.restore();
    }
  }

  drawShockwaves(c, camX, camY) {
    for (const s of this.shockwaves) {
      const k = s.t / s.life;
      c.save();
      c.globalAlpha = 1 - k;
      c.fillStyle = '#f0d8a0';
      const h = 12 - k * 8;
      c.fillRect(s.x - camX - 3, s.y - camY - h, 6, h);
      c.fillStyle = '#a08050';
      c.fillRect(s.x - camX - 5, s.y - camY - h * 0.4, 10, 3);
      c.restore();
    }
  }
  drawBossBeams(c, camX, camY) {
    for (const b of this.bossBeams) {
      const k = b.t / b.life;
      c.save();
      c.globalAlpha = clamp(1 - Math.abs(k - 0.5) * 2.2, 0, 1);
      const w = 300;
      c.fillStyle = '#ff3020';
      c.fillRect(b.x - camX - w, b.y - camY - b.h / 2, w, b.h);
      c.fillStyle = '#ffd060';
      c.fillRect(b.x - camX - w, b.y - camY - b.h / 4, w, b.h / 2);
      c.fillStyle = '#ffffff';
      c.fillRect(b.x - camX - w, b.y - camY - b.h / 8, w, b.h / 4);
      c.restore();
    }
  }

  /* ================= HUD ================= */
  drawHUD(c) {
    const p = this.player;
    // panel
    c.save();
    c.fillStyle = 'rgba(10,8,14,0.55)';
    c.fillRect(0, 0, VW, 30);
    c.fillStyle = 'rgba(255,255,255,0.08)';
    c.fillRect(0, 29, VW, 1);
    // score
    text(c, 'SCORE', 6, 4, '#8a90a0', 1);
    text(c, String(this.score).padStart(7, '0'), 6, 13, '#ffffff', 1);
    // lives: heart pips
    text(c, 'LIVES', 72, 4, '#8a90a0', 1);
    for (let i = 0; i < Math.max(0, Math.min(6, this.lives)); i++) heartIcon(c, 73 + i * 9, 14, 1);
    // health
    text(c, 'HP', 132, 4, '#8a90a0', 1);
    for (let i = 0; i < p.maxHp; i++) {
      const x = 132 + i * 7, y = 13;
      R(c, x, y, 6, 9, '#141018');
      R(c, x + 1, y + 1, 4, 7, i < p.hp ? '#e0402a' : '#38222a');
      if (i < p.hp) { R(c, x + 1, y + 1, 4, 2, '#ff7a58'); R(c, x + 1, y + 1, 1, 7, '#ff9a78'); }
    }
    // weapon slot
    const wp = WEAPONS[p.weapon];
    text(c, 'WEAPON', 170, 4, '#8a90a0', 1);
    R(c, 169, 12, 20, 15, 'rgba(255,255,255,0.10)');
    c.drawImage(weaponIcon(p.weapon), 170, 13);
    if (wp.ammo === Infinity) text(c, 'INF', 193, 17, '#60f0f0', 1);
    else text(c, String(p.ammo[p.weapon] | 0), 193, 17, p.ammo[p.weapon] <= 5 ? '#ff5040' : '#ffffff', 1);
    // grenades
    text(c, 'BOMB', 224, 4, '#8a90a0', 1);
    c.drawImage(pickupIcon('grenade'), 222, 12);
    text(c, String(p.grenades), 238, 17, p.grenades ? '#ffffff' : '#ff5040', 1);
    // captives
    text(c, 'POW', 266, 4, '#8a90a0', 1);
    text(c, this.rescued + '/' + this.totalCaptives, 266, 14, '#ffe060', 1);
    // score zone + boss bar
    const z = Level.zoneAtPx(this.camX + 10);
    text(c, z.name, VW - 6, 4, '#c0c8d8', 1, 'r');
    c.restore();

    // boss health bar
    if (this.boss && !this.boss.dead) {
      const b = this.boss;
      c.save();
      const bw = 240, bx = VW / 2 - bw / 2, by = VH - 34;
      c.fillStyle = 'rgba(10,8,14,0.7)'; c.fillRect(bx - 2, by - 2, bw + 4, 12);
      c.fillStyle = '#141018'; c.fillRect(bx, by, bw, 8);
      const frac = b.hp / b.maxHp;
      const col = frac > 0.5 ? '#e04a2a' : frac > 0.25 ? '#ff8020' : '#ff3020';
      R(c, bx, by, bw * frac, 8, col);
      R(c, bx, by, bw * frac, 3, '#ff9060');
      // phase separators
      c.fillStyle = '#141018';
      c.fillRect(bx + bw * 0.3, by, 2, 8);
      c.fillRect(bx + bw * 0.62, by, 2, 8);
      // part pips
      for (let i = 0; i < 3; i++) {
        const p2 = [b.parts.cannon, b.parts.pod, b.parts.core][i];
        if (p2.hidden) continue;
        const px = bx + bw * (0.15 + i * 0.3);
        c.fillStyle = p2.broken ? '#403030' : '#ffd040';
        c.fillRect(px - 2, by - 4, 4, 3);
      }
      text(c, 'IRON MAW', VW / 2, by - 12, '#ffd040', 1, 'c');
      c.restore();
    }
    // vehicle health
    if (this.vehicle.ridden && this.vehicle.active) {
      const v = this.vehicle;
      c.save();
      const bw = 80, bx = VW / 2 - bw / 2, by = 26;
      c.fillStyle = 'rgba(10,8,14,0.6)'; c.fillRect(bx - 2, by - 2, bw + 4, 10);
      R(c, bx, by, bw * clamp(v.hp / v.maxHp, 0, 1), 6, '#5fc04a');
      R(c, bx, by, bw * clamp(v.hp / v.maxHp, 0, 1), 2, '#a0e080');
      text(c, 'IRON HARE', VW / 2, by - 10, '#a0e0ff', 1, 'c');
      c.restore();
    }
    // messages
    for (let i = 0; i < this.messages.length; i++) {
      const m = this.messages[i];
      const k = m.t / m.life;
      const a = k < 0.1 ? k / 0.1 : k > 0.8 ? (1 - k) / 0.2 : 1;
      c.save();
      c.globalAlpha = clamp(a, 0, 1);
      const y = 46 + i * 14;
      text(c, m.txt, VW / 2, y, m.col, 1, 'c');
      c.restore();
    }
    if(this.waveActive){
      const remaining=this.waveActive.queue.length+this.waveActive.list.filter(e=>!e.dead).length;
      text(c,'HOLD POSITION  '+remaining+' HOSTILES  >',VW-8,VH-12,'#ffcf80',1,'r');
    }
    // prompts
    for (const pr of this.prompts) {
      const bob = Math.sin(G.time * 8) * 1;
      text(c, pr.txt, pr.x - this.camX, pr.y - this.camY + bob, '#ffffff', 1, 'c');
    }
    // GO! arrow
    if (!this.waveActive && !this.boss && this.player.state === 'normal' && this.goT > 0.2) {
      const a = 0.5 + 0.5 * Math.sin(G.time * 8);
      c.save();
      c.globalAlpha = a;
      const x = this.player.cx - this.camX + 24, y = this.player.y - this.camY - 12;
      c.fillStyle = '#ffe060';
      c.beginPath();
      c.moveTo(x, y); c.lineTo(x + 12, y - 7); c.lineTo(x + 12, y + 7);
      c.closePath(); c.fill();
      c.strokeStyle = '#141018'; c.lineWidth = 1; c.stroke();
      text(c, 'GO!', x + 20, y - 4, '#ffe060', 1);
      c.restore();
    }
    // low ammo / weapon flash
    if (p.weapon !== 'pistol' && (p.ammo[p.weapon] | 0) === 0) {
      c.save(); c.globalAlpha = 0.6 + 0.4 * Math.sin(G.time * 6);
      text(c, 'OUT OF AMMO - USE PISTOL', VW / 2, 36, '#ff5040', 1, 'c');
      c.restore();
    }
    // rescue / secret notifications
    if (this.rescued > 0 && this.showRescued === undefined && this.time < 3) { this.showRescued = this.rescued; }
  }
}

/* tiny 9x8 heart pip for the lives display */
function heartIcon(c, x, y, filled) {
  const px = (a, b, w, h, col) => R(c, x + a, y + b, w, h, col);
  const o = '#141018';
  const body = filled ? '#e04a5a' : '#3a2a34';
  const hi = filled ? '#ff8a90' : '#4a3a44';
  const lo = filled ? '#8a2030' : '#2a1e24';
  // outline silhouette
  const shape = [[1, 2, 2, 1], [6, 2, 2, 1], [0, 3, 9, 3], [1, 6, 7, 1], [2, 7, 5, 1], [3, 8, 3, 1]];
  for (const s of shape) px(s[0] - 0, s[1] - 0, s[2] + 2, s[3] + 2, o);
  for (const s of shape) px(s[0], s[1], s[2], s[3], body);
  px(2, 3, 2, 1, hi);
  px(1, 6, 7, 1, lo);
}

/* segment vs AABB (for laser beams) */
function segRect(x0, y0, x1, y1, rx, ry, rw, rh) {
  const steps = 26;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
    if (x >= rx && x <= rx + rw && y >= ry && y <= ry + rh) return true;
  }
  return false;
}
