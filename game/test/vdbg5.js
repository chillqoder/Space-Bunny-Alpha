const { chromium } = require('playwright');
const P='/Users/konstantin/Documents/Dev/Space Bunny/game/';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport:{width:960,height:540} });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file://'+P+'index.html');
  await p.waitForTimeout(800);
  await p.keyboard.press('Enter');
  await p.waitForTimeout(400);
  console.log(await p.evaluate(async () => {
    const w = G.scenes.game.world, pl = w.player;
    const log = [];
    pl.x = 2556;
    const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(pl), 'x');
    // hook: trace assignment
    let _x = pl.x;
    Object.defineProperty(pl, 'x', {
      get() { return _x; },
      set(v) { log.push('setX ' + Math.round(_x) + '->' + Math.round(v) + ' ' + new Error().stack.split('\n').slice(1,4).join(' | ')); _x = v; },
      configurable: true,
    });
    await new Promise(r => setTimeout(r, 120));
    return log.slice(0, 6).join('\n---\n');
  }));
  await b.close();
})();
