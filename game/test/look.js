const { chromium } = require('playwright');
const P='/Users/konstantin/Documents/Dev/Space Bunny/game/';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  page.on('pageerror', e => console.log('ERR', e.message));
  await page.goto('file://'+P+'index.html');
  await page.waitForTimeout(600);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  const x = +(process.argv[2]||800), y = +(process.argv[3]||200);
  await page.evaluate(([x,y]) => {
    const w = G.scenes.game.world;
    w.player.x = x; w.player.y = y; w.player.vx=0; w.player.vy=0;
    w.camX = x - 240; w.camY = 0;
    w.enemies.length = 0; w.bullets.length=0; Particles.length=0;
    // freeze
    w.update = function(){};
    G.scenes.game.update = function(){};
  }, [x,y]);
  await page.waitForTimeout(500);
  await page.screenshot({ path: P+'shots/look.png' });
  await browser.close();
})();
