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
    const origBG = BG.draw.bind(BG);
    const log = [];
    BG.draw = function(c, camX, camY, t) { log.push(camX + ':' + Level.zoneAtPx(camX+VW/2).type); return origBG(c,camX,camY,t); };
    w.update = function(dt){};
    G.scenes.game.update = function(){};
    return new Promise(res => setTimeout(() => res(JSON.stringify(log.slice(0,4)) + ' | worldCamX=' + w.camX), 200));
  }));
  await b.close();
})();
