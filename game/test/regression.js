const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    // Deterministic simulation: exercise the actual game classes without wall-clock timing.
    await page.addInitScript(() => { window.requestAnimationFrame = () => 1; });
    await page.goto('file://' + path.resolve(__dirname, '../index.html'));
    await page.waitForFunction(() => window.__gameReady);
    const results = await page.evaluate(() => {
      const checks = [];
      function check(ok, name, detail = '') { if (!ok) throw Error(name + ': ' + detail); checks.push(name); }
      function inputs(v = {}) { for (const k in Keys) Keys[k] = false; clearEdges(); Object.assign(Keys, v); }
      function tick(p, w, n = 1) { for (let i = 0; i < n; i++) { p.update(STEP, w); clearEdges(); } }
      Scene.set('game');
      const w = G.scenes.game.world, p = w.player;
      const flat = () => { Level.grid.fill(0); Level.groundY.fill(18); for (let y = 18; y < Level.H; y++) for (let x = 0; x < Level.W; x++) Level.grid[y * Level.W + x] = T_SOLID; w.pickups = []; p.reset(100, 288 - 22); inputs(); tick(p, w, 2); };
      flat(); const y = p.y; tick(p, w, 240);
      check(Math.abs(p.y - y) < 0.03 && p.onGround, 'Stable ground contact', p.y);
      inputs({right:true}); tick(p, w, 60);
      check(p.x > 200 && p.anim === 'run', 'Run speed and animation', p.x);
      inputs(); tick(p, w, 10); const feet = p.feet;
      inputs({down:true}); tick(p, w); check(p.crouch && Math.abs(p.feet - feet) < 0.03, 'Crouch preserves feet');
      inputs(); tick(p, w); check(p.h === 22 && Math.abs(p.feet-feet)<0.03, 'Stand preserves feet');
      pressed.jump = true; tick(p, w); check(p.vy < 0 && !p.onGround, 'Jump launches');
      tick(p, w, 90); check(p.onGround && Math.abs(p.feet-288)<0.03, 'Jump lands');
      flat(); Level.grid[15 * Level.W + 6] = T_PLAT; p.x = 100;
      pressed.jump = true; let min = p.feet; for(let i=0;i<60;i++){tick(p,w);min=Math.min(min,p.feet);}
      check(min < 240 && Math.abs(p.feet-240)<0.03, 'Jump through and land on one-way platform', [min,p.feet]);
      flat(); Level.grid[17*Level.W+7]=T_SOLID; inputs({right:true}); tick(p,w,35);
      check(p.x>145, 'Run over one-tile step', p.x);
      flat(); for(let ty=13;ty<18;ty++)Level.grid[ty*Level.W+6]=T_LADDER;
      inputs({right:true}); tick(p,w,30); check(p.x>140,'Walk past ladder');
      p.reset(100,266); inputs({up:true});tick(p,w,20);check(p.y<250,'Climb on command');
      inputs({right:true});tick(p,w,20);check(p.x>120,'Leave ladder sideways');
      flat(); p.face=-1; inputs();tick(p,w);w.bullets=[];p.fire(w);
      check(w.bullets[0].vx<0 && w.bullets[0].x<p.cx,'Fire left');
      p.face=1; inputs({up:true});tick(p,w);w.bullets=[];p.fire(w);
      check(w.bullets[0].vy<0 && Math.abs(w.bullets[0].vx)<1,'Fire up');
      flat();p.invuln=0;w.enemies=[];w.bullets=[new Bullet({x:p.cx,y:p.cy,vx:0,vy:0,dmg:8,own:'e'})];w.updateEntities(STEP,false);
      check(p.hp===3 && p.state==='normal','Enemy bullet costs one health point',p.hp);
      p.x=180;p.hp=2;p.weapon='mg';p.ammo.mg=50;const before=[p.x,p.y,p.hp,p.weapon];
      Scene.set('pause');Scene.set('game');check(JSON.stringify(before)===JSON.stringify([p.x,p.y,p.hp,p.weapon]),'Resume does not respawn');
      p.die(w);const deadY=p.y;w.update(STEP);check(p.deadT>0 && p.y!==deadY,'Death animation advances');
      for(let i=0;i<115;i++)w.update(STEP);check(p.state==='normal' && w.lives===2,'Death consumes one life and respawns');
      flat();const enemy=new Enemy('soldier',160,266,'ground');enemy.vx=0;for(let i=0;i<90;i++)enemy.physics(STEP,w,p);
      check(Math.abs(enemy.feet-288)<0.03,'Enemy ground contact',enemy.feet);
      const v=w.vehicle;v.x=130;v.y=262;v.ridden=true;v.active=true;inputs({right:true});for(let i=0;i<60;i++)v.update(STEP,w);
      check(v.x>240 && Math.abs(v.feet-288)<0.03,'Vehicle movement stays on ground',[v.x,v.y]);
      w.exitVehicle();check(!v.ridden && !p.vehicle,'Vehicle exit');
      const alphaCount=canvas=>{const d=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i])n++;return n;};
      check(alphaCount(jeepFrame(0))>100 && alphaCount(birdFrame(0))>5,'Jeep and bird frames are not blank');
      for(const name of Object.keys(ANIMS))for(let f=0;f<ANIMS[name][1];f++){
        const spr=fighterFrame('hero',name,f,'rocket',{aim:0});check(alphaCount(spr)>30,'Sprite '+name+'/'+f);
        const data=spr.getContext('2d').getImageData(0,0,spr.width,spr.height).data;
        let edge=0;for(let yy=0;yy<spr.height;yy++)edge+=data[(yy*spr.width)*4+3]+data[(yy*spr.width+spr.width-1)*4+3];
        check(edge===0,'No horizontal clipping '+name+'/'+f);
      }
      const b=new Boss(w);b.layout();b.hurt('core',10,w);check(b.parts.core.hp===90,'Hidden boss core resists damage');
      for(const part of ['head','cannon','pod','core'])for(let i=0;i<30 && !b.parts[part].broken;i++)b.hurt(part,11,w);
      check(b.dead && b.hp===0,'Boss can be defeated through normal damage');
      // Traverse the real map using physics only: no position writes or forced forward motion.
      Level.build();w.pickups=[];p.reset(48,Level.groundYAt(48)-22);inputs({right:true});
      let stuck=0, previous=p.x, jumps=0;
      for(let i=0;i<9000 && p.x<8900;i++){
        if(Math.abs(p.x-previous)<0.05)stuck++;else stuck=0;
        previous=p.x;
        if(stuck>8 && p.onGround){pressed.jump=true;jumps++;}
        tick(p,w);
        if(stuck>180)break;
      }
      check(p.x>8900 && p.state==='normal','Whole map is traversable with run and jump',[p.x,p.y,stuck,jumps,Array.from({length:10},(_,i)=>Array.from({length:9},(_,j)=>Level.getT(60+j,7+i)).join('')).join('/')]);
      return {checks:checks.length,routeX:p.x};
    });
    console.log('PHYSICS / ART / PROGRESSION',results);
    const weapons=await page.evaluate(()=>{
      const check=(ok,name,data='')=>{if(!ok)throw Error(name+': '+JSON.stringify(data));};
      const empty={solidAt:()=>false,explodeDamage:()=>{}};
      const measured={};
      for(const [name,wp]of Object.entries(WEAPONS)){
        for(const dt of [1/60,1/120]){
          const b=new Bullet({x:0,y:100,vx:wp.speed,vy:0,dmg:wp.dmg,range:wp.range,life:wp.range/wp.speed+STEP*2,
            falloffStart:wp.falloffStart,minDamage:wp.minDamage});
          for(let frame=0;frame<1000&&!b.dead;frame++)b.update(dt,empty);
          check(b.dead&&Math.abs(b.x-wp.range)<0.001,'Exact range '+name,[b.x,wp.range]);
          if(name==='shotgun')check(Math.abs(b.dmg-wp.dmg*wp.minDamage)<0.001,'Shotgun distance falloff');
          measured[name]={range:b.x,damage:wp.dmg};
        }
      }
      Level.build();const w=new World(true);w.enemies=[];w.pickups=[];w.captives=[];w.bullets=[];
      const p=w.player;p.reset(100,266);p.aim=0;
      p.weapon='shotgun';p.ammo.shotgun=3;p.fire(w);
      check(w.bullets.length===7&&p.ammo.shotgun===2,'Seven pellets cost one cartridge');
      const angles=w.bullets.map(b=>Math.atan2(b.vy,b.vx));
      check(Math.abs(angles[3])<0.001&&Math.abs(angles[0]+angles[6])<0.001,'Shotgun pattern has a centered pellet');
      p.weapon='pistol';w.bullets=[];p.fire(w);check(p.ammo.pistol===undefined,'Pistol ammo stays unlimited');
      const soldier=new Enemy('soldier',300,266);soldier.hurt(WEAPONS.pistol.dmg,w,p.cx);
      check(!soldier.dead&&soldier.hp===1,'Ordinary soldier survives one pistol hit');
      soldier.hurt(WEAPONS.pistol.dmg,w,p.cx);check(soldier.dead,'Two pistol hits kill an ordinary soldier');
      const heavy=new Enemy('heavy',300,264);heavy.hurt(WEAPONS.laser.dmg,w,p.cx,{pierce:WEAPONS.laser.armorPiercing});
      check(heavy.hp===7,'Laser ignores armor');
      const armor=new Enemy('heavy',300,264);armor.hurt(WEAPONS.mg.dmg,w,p.cx);
      check(Math.abs(armor.hp-(12-1.25*0.45))<0.001,'Armor reduces conventional bullet damage');
      // Exercise actual projectile impacts, including a rocket whose target survives the blast.
      const target=new Enemy('heavy',170,264);target.hp=target.maxHp=100;target.update=()=>{};
      w.enemies=[target];w.bullets=[];p.weapon='rocket';p.ammo.rocket=1;p.fire(w);
      for(let i=0;i<60&&w.bullets.length;i++)w.updateEntities(STEP,false);
      const damage=100-target.hp;check(damage>12&&damage<=WEAPONS.rocket.dmg,'Rocket deals a single blast',damage);
      check(p.ammo.rocket===0,'Rocket consumes one round');p.fire(w);check(p.weapon==='pistol','Empty launcher falls back to pistol');
      return measured;
    });
    console.log('WEAPON RANGE / DAMAGE',weapons);
    const encounters=await page.evaluate(()=>{
      function check(ok,label,detail=''){if(!ok)throw Error(label+': '+JSON.stringify(detail));}
      for(const k in Keys)Keys[k]=false;clearEdges();Particles.length=0;G.hitStop=0;
      Level.build();const w=new World(true);G.scenes.game.world=w;G.scene=G.scenes.game;
      const p=w.player;
      for(const c of w.captives){
        check(!w.anySolid(c.x,c.y,c.x+c.w,c.feet),'Captive is above ground',[c.x,c.y]);
        check(w.anySolid(c.x,c.feet+0.1,c.x+c.w,c.feet+1)||w.platformTop(c.x,c.x+c.w,c.feet,c.feet+1)!==null,'Captive has support',[c.x,c.y]);
      }
      check(w.enemies.length===Level.spawns.length,'All fixed posts exist before scrolling');
      for(const e of w.enemies)check(!w.anySolid(e.x,e.y,e.x+e.w,e.feet),'Post has clear body',[e.type,e.x,e.y]);
      const posts=w.enemies.length;w.updateEvents(STEP);w.updateEvents(STEP);check(w.enemies.length===posts,'No duplicate fixed posts');
      const far=w.enemies.find(e=>e.x>4000);const pos=[far.x,far.y];for(let i=0;i<120;i++)far.update(STEP,w);
      check(far.x===pos[0]&&far.y===pos[1],'Distant post stays at its authored location');
      w.enemies=[];w.pickups=[];w.captives=[];
      p.reset(640,266);w.camX=448;w.camY=90;
      w.updateWaves(STEP);check(w.waveActive && w.waveActive.list.length===0,'Wave warning precedes spawning');
      for(let i=0;i<240;i++)w.updateWaves(STEP);
      check(w.waveActive.list.length===3,'First encounter has exactly three reinforcements');
      for(const e of w.waveActive.list){
        check(e.x>w.camX+VW && e.cx-p.cx>=128,'Reinforcement begins outside view at safe distance',e.x);
        check(!w.anySolid(e.x,e.y,e.x+e.w,e.feet),'Reinforcement fits terrain');
        const n=w.bullets.length;e.spawnT=0;e.shootAt(w,p,'pistol',180,1,0,1);check(w.bullets.length===n,'Offscreen reinforcement cannot shoot');
      }
      for(let i=0;i<180;i++){p.invuln=2;for(const e of w.enemies)e.update(STEP,w);}
      check(w.enemies.some(e=>e.cx<w.camX+VW),'Ground reinforcements walk onto screen');
      for(const e of [...w.waveActive.list])e.hurt(100,w,p.cx);
      for(let i=0;i<30;i++)w.updateWaves(STEP);
      check(!w.waveActive && w.camLock===null,'Clearing encounter unlocks camera');
      for(let i=0;i<60;i++)w.updateWaves(STEP);check(!w.waveActive,'Cleared encounter does not spawn twice');
      const checkpointWorld=new World(true);const hero=checkpointWorld.player;
      const cp=Level.checkpoints[0];hero.reset(cp.x,cp.y-22);checkpointWorld.updateCheckpoints();
      check(checkpointWorld.checkpoint.set && checkpointWorld.checkpoint.marker===0,'Walking past flag activates checkpoint');
      const saved={...checkpointWorld.checkpoint};
      hero.reset(920,266);hero.die(checkpointWorld);
      for(let i=0;i<109;i++)checkpointWorld.update(STEP);
      check(hero.state==='normal' && checkpointWorld.lives===2,'Checkpoint death respawns once');
      check(Math.abs(hero.x-saved.x)<1 && Math.abs(hero.y-saved.y)<1,'Respawn uses saved flag position',[hero.x,hero.y,saved]);
      checkpointWorld.waveIndex=2;checkpointWorld.setCheckpoint(2300,true);
      const cleared={...checkpointWorld.checkpoint};
      checkpointWorld.waveIndex=3;checkpointWorld.waveActive={list:[],queue:['soldier'],def:Level.waves[3]};
      checkpointWorld.shockwaves.push({});checkpointWorld.bossBeams.push({});
      hero.reset(3200,266);checkpointWorld.respawnAtCheckpoint();
      check(checkpointWorld.waveIndex===2 && !checkpointWorld.waveActive,'Respawn restores completed waves only');
      check(hero.x===cleared.x && hero.hp===hero.maxHp && hero.invuln>=2,'Respawn restores safe player state');
      check(!checkpointWorld.shockwaves.length && !checkpointWorld.bossBeams.length,'Respawn clears lingering attacks');
      checkpointWorld.setCheckpoint(300);check(checkpointWorld.checkpoint.x===cleared.x,'Backtracking cannot overwrite checkpoint');
      checkpointWorld.player.reset(Level.waves[3].x*TILE,266);checkpointWorld.updateWaves(STEP);
      check(checkpointWorld.waveIndex===3 && checkpointWorld.waveActive,'Interrupted encounter restarts once');
      // Sniper cycles, cancellation and line-of-sight use the same real objects as gameplay.
      w.enemies=[];w.lasers=[];w.bullets=[];w.camX=0;p.reset(100,266);
      const sniper=w.spawnEnemy('sniper',260);sniper.spawnT=0;sniper.alert=1;sniper.fireT=0;
      sniper.update(STEP,w);check(sniper.laser instanceof LaserLine,'Sniper stores laser object');
      const first=sniper.laser;
      for(let i=0;i<200;i++){p.invuln=2;sniper.update(STEP,w);for(const l of w.lasers)l.update(STEP,w);}
      check(sniper.laser!==first && w.lasers.length>=2,'Sniper shoots again after cooldown');
      const active=sniper.laser;sniper.hurt(999,w,p.cx);check(active.dead,'Killing sniper cancels aim');
      const soldier=w.spawnEnemy('soldier',240);soldier.spawnT=0;const n=w.bullets.length;
      for(let y=14;y<18;y++)Level.setT(12,y,T_SOLID);
      soldier.shootAt(w,p,'pistol',180,1,0,1);check(w.bullets.length===n,'Wall blocks enemy fire');
      for(let y=14;y<18;y++)Level.setT(12,y,T_EMPTY);
      const bomb=w.spawnEnemy('barrelman',360);bomb.alert=1;bomb.spawnT=0;bomb.fuseT=0.01;p.invuln=0;p.hp=4;
      bomb.update(STEP,w);check(p.hp===4,'Distant bomber explosion does not damage player');
      const drone=w.spawnEnemy('drone',300,170);drone.spawnT=0;
      for(let i=0;i<240;i++){drone.update(STEP,w);check(!w.anySolid(drone.x,drone.y,drone.x+drone.w,drone.feet),'Drone stays outside solid terrain');}
      // Exercise every authored encounter and normal boss death -> completion transition.
      Particles.length=0;G.shake=G.camShakeX=G.camShakeY=0;Level.build();G.scenes.game.world=new World(true);const campaign=G.scenes.game.world;campaign.pickups=[];campaign.captives=[];
      let total=0;
      for(let i=0;i<Level.waves.length;i++){
        const def=Level.waves[i];campaign.player.reset(def.x*TILE,Level.groundYAt(def.x*TILE)-22);campaign.updateWaves(STEP);
        check(campaign.waveIndex===i,'Encounters start in order');
        const seen=new Set();
        for(let frame=0;frame<900 && campaign.waveActive;frame++){
          campaign.updateWaves(STEP);
          if(campaign.waveActive)for(const e of campaign.waveActive.list){if(!seen.has(e)){seen.add(e);total++;}if(!e.dead)e.hurt(999,campaign,campaign.player.cx);}
        }
        check(!campaign.waveActive,'Encounter can finish',i);
        check(seen.size===def.list.reduce((n,v)=>n+v[1],0),'Encounter enemy count matches design',i);
      }
      campaign.player.reset(Level.bossTrigger+10,266);campaign.updateEvents(STEP);check(!!campaign.boss,'Boss spawns after final encounter');
      const boss=campaign.boss;for(const key of ['head','cannon','pod','core'])while(!boss.parts[key].broken)boss.hurt(key,11,campaign);
      for(let i=0;i<400 && G.scene!==G.scenes.complete;i++){campaign.player.invuln=2;campaign.update(STEP);}
      check(G.scene===G.scenes.complete,'Boss death reaches mission complete');
      return {captives:Level.captives.length,encounters:Level.waves.length,reinforcements:total};
    });
    console.log('ENCOUNTERS / AI / RESCUE',encounters);
    // Actual keyboard events, including two keys bound to the same action and a neutral pad.
    await page.evaluate(()=>{Scene.set('title');navigator.getGamepads=()=>[{connected:true,index:0,axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))}];});
    await page.keyboard.down('ArrowRight');await page.keyboard.down('d');await page.keyboard.up('ArrowRight');
    assert.equal(await page.evaluate(()=>{updatePad();return down('right')}),true);
    await page.keyboard.up('d');assert.equal(await page.evaluate(()=>down('right')),false);
    await page.evaluate(()=>{navigator.getGamepads=()=>[{connected:true,index:0,axes:[0,0],buttons:Array.from({length:16},(_,i)=>({pressed:i===0,value:i===0?1:0}))}];updatePad();});
    assert.equal(await page.evaluate(()=>hit('jump')),true);
    await page.evaluate(()=>{navigator.getGamepads=()=>[];updatePad();});assert.equal(await page.evaluate(()=>down('jump')),false);
    // Draw actual gameplay in each region and verify the camera offset reaches entities once.
    const drawResult=await page.evaluate(()=>{
      Particles.length=0;G.shake=G.camShakeX=G.camShakeY=0;Level.build();G.scenes.game.world=new World(true);Scene.set('game');const w=G.scenes.game.world;
      const p=w.player;w.camX=1000;w.camY=90;p.reset(1200,240);p.invuln=0;
      const original=p.draw;let observed;
      p.draw=function(c,cx,cy){const t=c.getTransform();observed={x:t.e+(this.cx-cx)*t.a,y:t.f+(this.feet-cy)*t.d};original.call(this,c,cx,cy)};
      Scene.draw();p.draw=original;
      return {observed,expected:{x:(p.cx-w.camX)*scale,y:(p.feet-w.camY)*scale}};
    });
    assert.ok(Math.abs(drawResult.observed.x-drawResult.expected.x)<1);
    assert.ok(Math.abs(drawResult.observed.y-drawResult.expected.y)<1);
    for(const tx of [20,200,380,550]){
      await page.evaluate(tx=>{const w=G.scenes.game.world;w.camX=tx*16;w.camY=90;w.player.reset(w.camX+180,Level.groundYAt(w.camX+180)-22);w.player.invuln=0;Scene.draw()},tx);
      await page.screenshot({path:path.resolve(__dirname,`../shots/fixed-zone-${tx}.png`)});
    }
    const mobile=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
    mobile.on('pageerror',e=>errors.push(e.message));
    await mobile.goto('file://'+path.resolve(__dirname,'../index.html'));
    await mobile.waitForFunction(()=>window.__gameReady);
    const bounds=await mobile.evaluate(()=>({canvas:document.querySelector('canvas').getBoundingClientRect().toJSON(),buttons:[...document.querySelectorAll('.tbtn')].map(b=>b.getBoundingClientRect().toJSON())}));
    assert.ok(bounds.canvas.width<=390);
    assert.ok(bounds.buttons.every(b=>b.left>=0 && b.right<=390 && b.top>=0 && b.bottom<=844));
    await mobile.locator('canvas').tap();await mobile.waitForTimeout(100);
    assert.equal(await mobile.evaluate(()=>G.scene===G.scenes.game),true);
    await mobile.screenshot({path:path.resolve(__dirname,'../shots/fixed-mobile.png')});
    assert.deepEqual(errors,[]);
    console.log('PASS: keyboard, gamepad, camera, four regions, mobile viewport and start; no runtime errors');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});
