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
    let seen = null;
    BG.draw = function(c, camX, camY, t) { seen = { camX, zone: Level.zoneAtPx(camX+VW/2).name }; return origBG(c,camX,camY,t); };
    w.camX = 2760; w.camY = 0;
    w.update = function(dt){};
    G.scenes.game.update = function(){};
    return new Promise(res => setTimeout(() => res(JSON.stringify({ seen, worldCamX: w.camX, camXused: Math.round(w.camX) })), 200));
  }));
  await b.close();
})();
