// The link preview picture (assets/og.png, 1200x627) drawn from the built site itself, so it uses the site's own colours,
// fonts and real project logos. Run after a build, with NODE_PATH pointing at playwright.
// Usage: node pipeline/og.cjs [vetted-store.html] [assets/og.png]
const path = require('path');
const { chromium } = require('playwright');
const [site = 'vetted-store.html', out = 'assets/og.png'] = process.argv.slice(2);
const ICONS = ['excalidraw', 'localsend', 'obs-studio', 'affine', 'ublock-origin', 'handy', 'ollama', 'jan'];
const SWAPS = ['noop', 'opencut', 'photocraft', 'rustdesk'];
(async () => {
  const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined });
  const p = await b.newPage({ viewport: { width: 1200, height: 627 }, colorScheme: 'light', deviceScaleFactor: 1 });
  await p.goto('file:///' + path.resolve(site).replace(/\\/g, '/')); await p.waitForSelector('.hero h1');
  await p.evaluate(([icons, swaps]) => {
    const mark = document.getElementById('mark').outerHTML;
    const swap = id => { const l = BY[id]; return `<div class="og-pair">${icon(l, 60)}<div><span class="og-was">Instead of <s>${esc(l.alt.n.replace(/ membership$/, ''))}</s></span><b>${esc(l.n)}</b></div><span class="alt-tag">Free</span></div>`; };
    document.body.innerHTML = `<style>
      body { margin: 0; background: var(--bg); }
      .og { width: 1200px; height: 627px; display: grid; grid-template-columns: 1fr 480px; gap: 44px; padding: 60px 60px 52px; box-sizing: border-box; font-family: var(--font); color: var(--label); }
      .og-brand { display: flex; align-items: center; gap: 12px; font-weight: 700; font-size: 30px; }
      .og-brand .mark { width: 46px; height: 46px; border-radius: 12px; font-size: 26px; }
      .og h1 { font-size: 70px; line-height: 1.02; font-weight: 800; letter-spacing: -0.025em; margin-top: 40px; }
      .og p { font-size: 26px; line-height: 1.38; color: var(--label2); margin-top: 22px; max-width: 30ch; }
      .og-icons { display: flex; gap: 12px; margin-top: 34px; } .og-icons .icon { width: 56px !important; height: 56px !important; }
      .og-right { background: var(--band-green); border-radius: 28px; padding: 28px 26px; display: flex; flex-direction: column; gap: 14px; justify-content: center; }
      .og-right h2 { font-size: 24px; font-weight: 700; margin-bottom: 2px; }
      .og-pair { display: flex; align-items: center; gap: 16px; background: var(--card); border: 1px solid var(--line); border-radius: 18px; padding: 13px 16px; }
      .og-pair > div { flex: 1; display: flex; flex-direction: column; gap: 2px; } .og-pair b { font-size: 23px; }
      .og-was { font-size: 16px; color: var(--label2); font-weight: 600; }
      .og-was s { color: var(--label); text-decoration-color: var(--red); text-decoration-thickness: 3px; }
      .og-pair .alt-tag { font-size: 16px; padding: 5px 12px; margin: 0; align-self: center; }
    </style>
    <div class="glow"></div>
    <div class="og"><div><div class="og-brand">${mark}Skillshelf</div>
      <h1>The app store for <mark class="hl">open source</mark></h1>
      <p>Free apps, AI skills and connectors from GitHub, in plain English, set up for you by Claude.</p>
      <div class="og-icons">${icons.map(id => icon(BY[id], 56)).join('')}</div></div>
      <div class="og-right"><h2>Free alternatives to tools you pay for</h2>${swaps.map(swap).join('')}</div></div>`;
  }, [ICONS, SWAPS]);
  await p.waitForFunction(() => [...document.images].every(i => i.complete), null, { timeout: 15000 }).catch(() => {});
  await p.screenshot({ path: out, clip: { x: 0, y: 0, width: 1200, height: 627 } });
  console.log('wrote', out);
  await b.close();
})();
