// Screenshots every finished run: desktop (1440 wide, first screen and full page) and phone (390 wide, first screen).
// Uses the machine's HTTPS proxy so web fonts and images load as they would for a visitor, and records anything that failed to load.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = process.argv[2], OUT = process.argv[3];
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined;
  const b = await chromium.launch({ proxy });
  const report = {};
  for (const brief of fs.readdirSync(ROOT)) for (const c of fs.readdirSync(path.join(ROOT, brief))) {
    const file = path.join(ROOT, brief, c, 'index.html');
    if (!fs.existsSync(file)) continue;
    const failed = [], errors = [];
    for (const [label, vp] of [['desk', { width: 1440, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
      const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 1, ignoreHTTPSErrors: true });
      const p = await ctx.newPage();
      p.on('requestfailed', r => failed.push(r.url().slice(0, 100)));
      p.on('pageerror', e => errors.push(e.message.slice(0, 100)));
      await p.goto('file://' + file, { waitUntil: 'networkidle', timeout: 45000 }).catch(e => errors.push('load: ' + e.message.slice(0, 80)));
      await p.waitForTimeout(1200);
      await p.screenshot({ path: path.join(OUT, `${brief}-${c}-${label}.png` ) });
      if (label === 'desk') await p.screenshot({ path: path.join(OUT, `${brief}-${c}-full.png`), fullPage: true });
      if (label === 'desk') report[`${brief}/${c}`] = { height: await p.evaluate(() => document.documentElement.scrollHeight), overflowPhone: null };
      if (label === 'phone') report[`${brief}/${c}`].overflowPhone = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      await ctx.close();
    }
    Object.assign(report[`${brief}/${c}`], { failed: [...new Set(failed)], errors });
  }
  fs.writeFileSync(path.join(OUT, 'shots.json'), JSON.stringify(report, null, 1));
  console.log(JSON.stringify(report, null, 1));
  await b.close();
})();
