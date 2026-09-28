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
    return new Promise(res => setTimeout(() => {
      const c = vctx;
      const sx = view.width/VW, sy = view.height/VH;
      const at = (x,y) => { const d = c.getImageData(Math.round(x*sx), Math.round(y*sy), 1,1).data; return `${d[0]},${d[1]},${d[2]}`; };
      res(JSON.stringify({ y40: at(200,40), y80: at(200,80), y120: at(200,120), y200: at(200,200) }));
    }, 200));
  }));
  await b.close();
})();
