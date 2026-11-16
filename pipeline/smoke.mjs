// Headless smoke test for the built store page.
// Usage: node pipeline/smoke.mjs vetted-store.html [screenshot-dir]
// Opens every tab, every listing page, every install sheet and every story, on desktop and phone widths,
// in light and dark mode, and fails on console errors, page errors, empty pages or horizontal overflow.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const [, , file, shots] = process.argv;
if (!file) throw new Error('Usage: node pipeline/smoke.mjs <page.html> [screenshot-dir]');
const url = 'file://' + path.resolve(file);
if (shots) fs.mkdirSync(shots, { recursive: true });
const problems = [];
const fail = (where, what) => { problems.push(`${where}: ${what}`); };

const browser = await chromium.launch();
for (const [label, viewport, scheme] of [['desktop', { width: 1280, height: 860 }, 'light'], ['phone', { width: 390, height: 844 }, 'dark']]) {
  const ctx = await browser.newContext({ viewport, colorScheme: scheme, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') fail(label, 'console: ' + m.text().slice(0, 200)); });
  page.on('pageerror', e => fail(label, 'pageerror: ' + e.message.slice(0, 200)));
  await page.goto(url);
  await page.waitForSelector('#main .page');
  const ids = await page.evaluate(() => L.map(l => l.id));
  const tabs = await page.evaluate(() => [...TABS.map(t => t[0]), ...PAGES, ...TESTS.map(t => 'test-' + t.id), ...JOBS.map(j => 'for-' + j[0]), ...KITS.map(k => 'kit-' + k[0])]);
  const missingKit = await page.evaluate(() => KITS.flatMap(k => k[5].map(([id]) => id).filter(id => !BY[id]).map(id => k[0] + ': ' + id)));
  if (missingKit.length) fail(label, 'kit items not in the catalog: ' + missingKit.join(', '));
  const missingPow = await page.evaluate(() => POWERS.flatMap(g => g[5].filter(id => !BY[id]).map(id => g[0] + ': ' + id)));
  if (missingPow.length) fail(label, 'power picks not in the catalog: ' + missingPow.join(', '));
  const overflow = async where => {
    const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (o > 1) fail(`${label} ${where}`, `horizontal overflow ${o}px`);
  };
  for (const t of tabs) {
    // My list is checked with a few listings saved: one skill, one connector, one app
    if (t === 'list') await page.evaluate(() => { LIST = ['anthropics-pptx', 'mcp-context7', 'ripgrep'].filter(id => BY[id]); });
    await page.evaluate(t => { location.hash = t; }, t);
    await page.waitForTimeout(60);
    const txt = await page.evaluate(() => document.getElementById('main').innerText.trim().length);
    if (txt < 200) fail(`${label} #${t}`, 'page looks empty');
    await overflow('#' + t);
    if (shots) await page.screenshot({ path: `${shots}/${label}-tab-${t}.png`, fullPage: false });
    if (t === 'list') await page.evaluate(() => { LIST = []; });
  }
  // Search
  await page.evaluate(() => { location.hash = 'search'; });
  await page.waitForTimeout(50);
  for (const q of ['pdf', 'figma', 'security', 'zzzz-no-hit']) {
    await page.fill('#q', q);
    const n = await page.evaluate(() => document.querySelectorAll('#results .row').length);
    if (q === 'zzzz-no-hit' ? n !== 0 : n === 0) fail(`${label} search`, `"${q}" gave ${n} results`);
  }
  // Every listing page, and its install sheet
  for (const id of ids) {
    await page.evaluate(id => { location.hash = id; }, id);
    await page.waitForTimeout(20);
    const h1 = await page.evaluate(() => document.querySelector('#main h1')?.innerText || '');
    if (!h1) fail(`${label} #${id}`, 'no title');
    const undef = await page.evaluate(() => /\bundefined\b|\bNaN\b|\[object Object\]/.test(document.getElementById('main').innerText));
    if (undef) fail(`${label} #${id}`, 'shows undefined/NaN/[object Object]');
    await overflow('#' + id);
    await page.click('#main .product-head [data-get]');
    const sheetOk = await page.evaluate(() => document.getElementById('sheet').open && document.querySelectorAll('#sheet .inst-card').length > 0);
    if (!sheetOk) fail(`${label} #${id}`, 'install sheet did not open or is empty');
    const badCmd = await page.evaluate(() => [...document.querySelectorAll('#sheet code')].map(c => c.textContent).filter(t => !t.trim() || /undefined|null/.test(t)));
    if (badCmd.length) fail(`${label} #${id}`, 'bad install command: ' + badCmd.join(' | '));
    await page.evaluate(() => document.getElementById('sheet').close());
    await page.waitForFunction(() => !history.state?.modal);   // closing a sheet steps back out of its history entry
  }
  if (shots) for (const id of ids.filter((_, i) => i % 25 === 0)) {
    await page.evaluate(id => { location.hash = id; }, id); await page.waitForTimeout(40);
    await page.screenshot({ path: `${shots}/${label}-listing-${id}.png`, fullPage: false });
  }
  // Stories
  await page.evaluate(() => { location.hash = 'today'; });
  await page.waitForTimeout(50);
  const stories = await page.evaluate(() => [...document.querySelectorAll('[data-story]')].map(b => b.dataset.story));
  if (!stories.length) fail(label, 'no stories on Today');
  for (const s of stories) {
    await page.click(`[data-story="${s}"]`);
    const ok = await page.evaluate(() => document.getElementById('story').open && document.querySelectorAll('#story .article p').length > 0
      && document.querySelector('#story .hero .art').getBoundingClientRect().height > 100);   // the hero art must fill the header, or its white title is invisible
    if (!ok) fail(`${label} story ${s}`, 'did not open');
    if (shots) await page.screenshot({ path: `${shots}/${label}-story-${s}.png` });
    await page.click('[data-closestory]');
    await page.waitForFunction(() => !history.state?.modal);
  }
  console.error(`${label}: ${tabs.length} tabs, job and kit pages, ${ids.length} listings, ${stories.length} stories checked`);
  await ctx.close();
}
await browser.close();
if (problems.length) { console.error(`${problems.length} problem(s):\n` + [...new Set(problems)].slice(0, 80).join('\n')); process.exit(1); }
console.error('smoke test passed');
