// Builds the 1200x627 link preview (assets/og.png) from real listing data, in the site's own look.
// Usage: node pipeline/og.cjs (after a build; needs Playwright and Chrome). Publish assets/og.png as og.png beside the site.
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const REPO = path.resolve(__dirname, '..');
const h = fs.readFileSync(REPO + '/vetted-store.html', 'utf8');
const i = h.indexOf('const D = '), j = h.indexOf('\n', i);
const D = JSON.parse(h.slice(i + 10, j).trim().replace(/;$/, ''));
const BY = Object.fromEntries(D.L.map(l => [l.id, l]));
// The same icon the site shows: the project's own logo, or its organisation's avatar (never a person's photo)
const av = id => (D.LG || {})[BY[id].r] || D.AV[D.R[BY[id].r].own];
const pair = (id) => { const l = BY[id]; return `<div class="pair"><img src="${av(id)}"><div><span class="was">Instead of <s>${l.alt.n.replace('Adobe ', '')}</s></span><b>${l.n}</b></div><span class="free">Free</span></div>`; };
const icons = ['strata', 'hob', 'handy', 'affine', 'excalidraw', 'ollama', 'obs-studio', 'localsend'].map(id => `<img src="${av(id)}">`).join('');
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
* { box-sizing: border-box; margin: 0; }
body { width: 1200px; height: 627px; font-family: -apple-system, "Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif; background: #FFFFFF; color: #000; display: grid; grid-template-columns: 1fr 470px; gap: 40px; padding: 64px 64px 56px; }
.brand { display: flex; align-items: center; gap: 12px; font-weight: 700; font-size: 30px; }
.brand span { width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(160deg, #3B82F6, #1D4ED8); color: #fff; display: grid; place-items: center; }
.brand svg { width: 30px; height: 30px; }
h1 { font-size: 72px; line-height: 1.0; font-weight: 800; letter-spacing: -0.025em; margin-top: 42px; }
p { font-size: 27px; line-height: 1.35; color: #4A4A4F; margin-top: 22px; max-width: 30ch; }
.icons { display: flex; gap: 12px; margin-top: 38px; }
.icons img { width: 58px; height: 58px; border-radius: 22.5%; box-shadow: inset 0 0 0 1px rgba(0,0,0,.08); }
.right { background: #F2F2F7; border-radius: 28px; padding: 30px 28px; display: flex; flex-direction: column; gap: 16px; justify-content: center; }
.right h2 { font-size: 24px; font-weight: 700; }
.pair { display: flex; align-items: center; gap: 16px; background: #fff; border-radius: 18px; padding: 14px 16px; }
.pair img { width: 60px; height: 60px; border-radius: 22.5%; }
.pair div { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.was { font-size: 17px; color: #636368; font-weight: 600; }
.was s { color: #000; text-decoration-color: #FF3B30; text-decoration-thickness: 3px; }
.pair b { font-size: 23px; }
.free { font-size: 17px; font-weight: 700; color: #1B6B31; background: rgba(36,138,61,.16); padding: 5px 12px; border-radius: 8px; }
</style></head><body>
<div><div class="brand"><span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="4.2" height="12" rx="1"/><rect x="10" y="8" width="4.2" height="9" rx="1"/><path d="M16.6 8.6l2.6 8.2"/><path d="M2.5 20h19"/></svg></span>Skillshelf</div>
<h1>The app store for open source</h1>
<p>Free apps, AI skills and connectors from GitHub, in plain English, set up for you by Claude.</p>
<div class="icons">${icons}</div></div>
<div class="right"><h2>Free alternatives to tools you pay for</h2>${pair('genoffice')}${pair('photocraft')}${pair('voicestudio')}${pair('yogurt')}</div>
</body></html>`;
const dir = path.join(REPO, 'assets');
fs.writeFileSync(path.join(dir, 'og.html'), html);   // the source, kept beside the image
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await b.newPage({ viewport: { width: 1200, height: 627 }, deviceScaleFactor: 1 });
  await p.goto('file:///' + path.join(dir, 'og.html').split(path.sep).join('/')); await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(dir, 'og.png') });
  await b.close();
  console.log('ok', fs.statSync(path.join(dir, 'og.png')).size);
})();
