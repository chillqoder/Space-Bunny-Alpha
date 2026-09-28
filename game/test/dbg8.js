const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file:///Users/konstantin/Documents/Dev/Space%20Bunny/game/index.html');
  await p.waitForTimeout(700);
  await p.keyboard.press('Enter');
  await p.waitForTimeout(300);
  await p.evaluate(() => {
    const w = G.scenes.game.world;
    w.camX = 2760; w.camY = 0;
    w.enemies.length=0;
    w.update = function(dt){};
    G.scenes.game.update = function(){};
  });
  await p.waitForTimeout(300);
  console.log(await p.evaluate(() => {
    const c = vctx;
    const px = (x,y) => { const d = c.getImageData(x*(view.width/VW), y*(view.height/VH), 1,1).data; return [d[0],d[1],d[2]]; };
    return JSON.stringify({ skyTop: px(20,60), skyMid: px(20,120), name: Level.zoneAtPx(2760+240).name, camX: G.scenes.game.world.camX });
  }));
  await b.close();
})();
