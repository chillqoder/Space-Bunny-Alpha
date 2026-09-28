const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file:///Users/konstantin/Documents/Dev/Space%20Bunny/game/index.html');
  await p.waitForTimeout(700);
  const px = +(process.argv[2]||745);
  console.log(await p.evaluate((px) => {
    const out = [];
    for (let y = 0; y < Level.H; y++) {
      let row = '';
      for (let tx = Math.floor(px/16)-3; tx < Math.floor(px/16)+4; tx++) {
        const t = Level.grid[y*Level.W+tx];
        row += t === 0 ? '.' : t === 1 ? '#' : t === 2 ? '=' : t === 3 ? 'L' : t === 4 ? '^' : '?';
      }
      out.push(y.toString().padStart(2) + ' ' + row);
    }
    const crates = [];
    for (const pk of Level.pickups) if (pk.kind.indexOf('crate_')===0 && Math.abs(pk.x - px) < 80) crates.push(pk.kind + '@' + Math.round(pk.x) + ',' + Math.round(pk.y));
    return 'px=' + px + ' tile=' + Math.floor(px/16) + '\n' + out.join('\n') + '\ncrates: ' + crates.join(' | ');
  }, px));
  await b.close();
})();
