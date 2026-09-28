const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file:///Users/konstantin/Documents/Dev/Space%20Bunny/game/index.html');
  await p.waitForTimeout(700);
  console.log(await p.evaluate(() => {
    // simulate a simple walker: 11x22 box, walks right, jumps when blocked or a gap ahead
    const W = 11, H = 22;
    let x = 20, y = 0, vy = 0, onG = false;
    const solid = (a,b,c,d) => {
      for (let ty = Math.floor(b/16); ty <= Math.floor((d-0.01)/16); ty++)
        for (let tx = Math.floor(a/16); tx <= Math.floor((c-0.01)/16); tx++) {
          const t = Level.grid[ty*Level.W+tx];
          if (t === 1 || t === 4) return true;
        }
      return false;
    };
    const plat = (a,b,c,d) => {
      for (let ty = Math.floor(b/16); ty <= Math.floor((d-0.01)/16); ty++)
        for (let tx = Math.floor(a/16); tx <= Math.floor((c-0.01)/16); tx++)
          if (Level.grid[ty*Level.W+tx] === 2) return true;
      return false;
    };
    y = Level.groundYAt(x) * 16 - H;
    const stuck = [];
    let lastX = x, stuckT = 0;
    for (let step = 0; step < 20000; step++) {
      const vyBefore = vy;
      vy = Math.min(700, vy + 1500/60);
      y += vy/60;
      onG = false;
      if (solid(x+1, y+1, x+W-1, y+H)) { let g=0; while (solid(x+1,y+1,x+W-1,y+H) && g++<30) y--; y=Math.floor(y); vy=0; onG=true; }
      else if (plat(x+1, y+H+1, x+W-1, y+H+1) && vy>0) { let g=0; while (plat(x+1,y+H+1,x+W-1,y+H+1)&&g++<30) y--; vy=0; onG=true; }
      // move right 112/60
      x += 112/60;
      if (solid(x, y+1, x+W, y+H-0.5)) { let g=0; while (solid(x,y+1,x+W,y+H-0.5)&&g++<30) x--; }
      if (x < 0) x = 0;
      if (x >= Level.W*16 - W) { return 'reached end at step ' + step; }
      // jump if blocked or ledge ahead
      const ahead = solid(x+W+2, y+H+1, x+W+3, y+H+3);
      const wall = solid(x+W+1, y+4, x+W+2, y+H-4);
      if (onG && (ahead || wall)) vy = -400;
      if (Math.abs(x - lastX) < 0.3) { stuckT++; if (stuckT === 60) { stuck.push(Math.round(x)+' (tile '+(Math.round(x/16))+')'); stuckT = 0; } } else { stuckT = 0; lastX = x; }
    }
    return 'ran out of steps; x=' + Math.round(x) + ' stuck at ' + stuck.slice(0,10).join(', ');
  }));
  await b.close();
})();
