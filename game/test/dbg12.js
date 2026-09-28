const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file:///Users/konstantin/Documents/Dev/Space%20Bunny/game/index.html');
  await p.waitForTimeout(700);
  await p.keyboard.press('Enter');
  await p.waitForTimeout(300);
  console.log(await p.evaluate(() => {
    const w = G.scenes.game.world;
    w.camX = 2760; w.camY = 0;
    w.update = function(dt){};
    G.scenes.game.update = function(){};
    const origBG = BG.draw.bind(BG);
    const captured = [];
    BG.draw = function(c, camX, camY, t) {
      const z = Level.zoneAtPx(camX + VW/2);
      captured.push({ camX, type: z.type, sky: z.sky.slice(), sun: z.type==='desert' });
      return origBG(c, camX, camY, t);
    };
    return new Promise(res => setTimeout(() => res(JSON.stringify(captured.slice(0,2)) + ' shakeX=' + G.camShakeX), 200));
  }));
  await b.close();
})();
