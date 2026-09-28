const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file:///Users/konstantin/Documents/Dev/Space%20Bunny/game/index.html');
  await p.waitForTimeout(700);
  await p.keyboard.press('Enter');
  await p.waitForTimeout(300);
  console.log(await p.evaluate(async () => {
    const w = G.scenes.game.world, pl = w.player;
    pl.x = 700; pl.y = Level.groundYAt(700) - 26; pl.vx = 0; pl.vy = 0;
    const log = [];
    Keys.right = true;
    for (let i = 0; i < 90; i++) {
      await new Promise(r => requestAnimationFrame(r));
      log.push(`${i} x=${pl.x.toFixed(1)} y=${pl.y.toFixed(1)} vx=${pl.vx.toFixed(0)} vy=${pl.vy.toFixed(0)} g=${pl.onGround?1:0}`);
    }
    Keys.right = false;
    return log.filter((_,i)=>i%6===0).join('\n') + '\nFINAL x=' + pl.x.toFixed(1);
  }));
  await b.close();
})();
