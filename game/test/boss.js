const { chromium } = require('playwright');
const P='/Users/konstantin/Documents/Dev/Space Bunny/game/';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport:{width:960,height:540} });
  const errs=[]; p.on('pageerror', e => { if(errs.length<4) errs.push(e.message+' @ '+(e.stack||'').split('\n')[1]); });
  await p.goto('file://'+P+'index.html');
  await p.waitForTimeout(800);
  await p.keyboard.press('Enter');
  await p.waitForTimeout(400);
  await p.evaluate(() => {
    const w = G.scenes.game.world, pl = w.player;
    w.waveIndex = Level.waves.length - 1; w.waveActive=null; w.camLock=null;
    w.enemies.length=0; w.defeatedPosts=new Set(Level.spawns.map((_,i)=>i));
    pl.x = Level.bossTrigger + 40; pl.y = Level.groundYAt(pl.x) - 30;
    w.camX = pl.x - 240; w.camY = 0;
    pl.hp = pl.maxHp;
  });
  await p.waitForTimeout(400);
  // wait for boss to roll in
  for (let i=0;i<40;i++){
    const st = await p.evaluate(() => { const b=G.scenes.game.world.boss; return b ? b.state : null; });
    if (st === 'fight') break;
    await p.waitForTimeout(200);
  }
  await p.screenshot({ path: P+'shots/b-enter.png' });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: P+'shots/b-fight.png' });
  // shoot the cannon weak point
  await p.evaluate(() => {
    const w = G.scenes.game.world, b = w.boss;
    for (let i=0;i<10;i++) b.hurt('cannon', 12, w);
  });
  await p.waitForTimeout(500);
  await p.screenshot({ path: P+'shots/b-cannon-broken.png' });
  await p.evaluate(() => {
    const w = G.scenes.game.world, b = w.boss;
    for (let i=0;i<10;i++) b.hurt('pod', 12, w);
  });
  await p.waitForTimeout(500);
  await p.screenshot({ path: P+'shots/b-core.png' });
  console.log('phase:', await p.evaluate(() => { const b=G.scenes.game.world.boss; return JSON.stringify({phase:b.phase, coreHidden:b.parts.core.hidden, cannon:b.parts.cannon.broken, pod:b.parts.pod.broken, hp:Math.round(b.hp)}); }));
  // force phases
  await p.evaluate(() => { const b=G.scenes.game.world.boss; b.hp = b.maxHp*0.5; b.checkPhase(); });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: P+'shots/b-phase2.png' });
  await p.evaluate(() => { const b=G.scenes.game.world.boss; b.hp = b.maxHp*0.2; b.checkPhase(); });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: P+'shots/b-phase3.png' });
  // kill
  await p.evaluate(() => { const w=G.scenes.game.world; w.boss.die(w); });
  await p.waitForTimeout(2200);
  await p.screenshot({ path: P+'shots/b-die.png' });
  await p.waitForTimeout(3500);
  console.log('scene:', await p.evaluate(() => Object.keys(G.scenes).find(k=>G.scenes[k]===G.scene)));
  await p.screenshot({ path: P+'shots/b-complete.png' });
  console.log('ERRORS:', errs.length?errs:'none');
  await b.close();
})();
