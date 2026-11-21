// Loads the Skillshelf card in a sandboxed iframe, with a small stand-in for Claude's side of MCP Apps
// (ui/initialize, tool-input/tool-result, tools/call proxied to the real worker), then clicks through it.
// Usage: node connector/test/card.test.mjs [screenshot-dir]   (needs Playwright with Chromium; Node 22+)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = await import('playwright')); }

const HERE = path.dirname(new URL(import.meta.url).pathname);
const SRC = path.join(HERE, '..', 'src');
const SHOTS = process.argv[2];
const CARD = fs.readFileSync(path.join(SRC, 'card.html'), 'utf8');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'skillshelf-card-'));
fs.writeFileSync(path.join(tmp, 'worker.mjs'), fs.readFileSync(path.join(SRC, 'worker.js'), 'utf8')
  .replace("import CATALOG from './catalog.json';", `const CATALOG = ${fs.readFileSync(path.join(SRC, 'catalog.json'), 'utf8')};`)
  .replace("import CARD_HTML from './card.html';", `const CARD_HTML = ${JSON.stringify(CARD)};`));
const worker = (await import(path.join(tmp, 'worker.mjs'))).default;
const db = new DatabaseSync(':memory:');
db.exec(fs.readFileSync(path.join(HERE, '..', 'schema.sql'), 'utf8'));
const stmt = (sql, args = []) => ({ bind: (...a) => stmt(sql, a), all: async () => ({ results: db.prepare(sql).all(...args) }), first: async () => db.prepare(sql).get(...args) ?? null, run: async () => db.prepare(sql).run(...args) });
const env = { DB: { prepare: sql => stmt(sql) } };
let rid = 0;
const rpc = async (method, params, session = 'card-test') => (await (await worker.fetch(new Request('https://x.test/mcp', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Mcp-Session-Id': session }, body: JSON.stringify({ jsonrpc: '2.0', id: ++rid, method, params }) }), env)).json());

// The card must be the exact text the server hands out
const served = (await rpc('resources/read', { uri: 'ui://skillshelf/card.html' })).result.contents[0].text;

let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

// A minimal host: the card runs in a sandboxed iframe with no same-origin access, like in Claude
const HOST = theme => `<!doctype html><html><body style="margin:0;padding:16px;background:${theme === 'dark' ? '#262624' : '#faf9f5'}">
<iframe id="f" sandbox="allow-scripts" style="width:100%;border:0;display:block;height:200px"></iframe>
<script>
  window.log = [];
  const f = document.getElementById('f');
  const reply = (id, result) => f.contentWindow.postMessage({ jsonrpc: '2.0', id, result }, '*');
  window.sendResult = (args, result) => {
    f.contentWindow.postMessage({ jsonrpc: '2.0', method: 'ui/notifications/tool-input', params: { arguments: args } }, '*');
    f.contentWindow.postMessage({ jsonrpc: '2.0', method: 'ui/notifications/tool-result', params: result }, '*');
  };
  window.addEventListener('message', async e => {
    if (e.source !== f.contentWindow) return;
    const m = e.data; window.log.push(m);
    if (m.method === 'ui/initialize') reply(m.id, { protocolVersion: '2026-01-26', hostInfo: { name: 'test-host', version: '1' },
      hostCapabilities: { openLinks: {}, serverTools: {}, updateModelContext: { text: {} } },
      hostContext: { theme: '${theme}', platform: 'web', styles: { variables: { '--font-sans': 'system-ui, sans-serif' } } } });
    else if (m.method === 'ui/notifications/initialized') window.ready = true;
    else if (m.method === 'ui/notifications/size-changed') f.style.height = m.params.height + 'px';
    else if (m.method === 'tools/call') reply(m.id, await window.hostCall(m.params.name, m.params.arguments));
    else if (m.method === 'ui/open-link' || m.method === 'ui/update-model-context') reply(m.id, {});
  });
  f.srcdoc = ${JSON.stringify(served).replace(/</g, '\\u003c')};
</script></body></html>`;

const browser = await chromium.launch();
async function open(theme = 'light', viewport = { width: 680, height: 900 }) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: SHOTS ? 2 : 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.exposeFunction('hostCall', async (name, args) => (await rpc('tools/call', { name, arguments: args })).result);
  await page.setContent(HOST(theme));
  await page.waitForFunction(() => window.ready === true, null, { timeout: 5000 });
  const card = page.frameLocator('#f');
  const show = async (name, args) => { const r = (await rpc('tools/call', { name, arguments: args })).result; await page.evaluate(([a, r]) => window.sendResult(a, r), [args, r]); };
  const log = () => page.evaluate(() => window.log);
  return { page, card, show, log, errors };
}
const shot = async (page, name) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, name), fullPage: true }); } };

// 1. Picks for a task
{
  const { page, card, show, log, errors } = await open();
  ok((await log()).some(m => m.method === 'ui/initialize' && m.params.protocolVersion === '2026-01-26'), 'the card says hello with ui/initialize');
  await show('find_skills', { task: 'make my website look less AI generated' });
  await card.locator('article.card').first().waitFor();
  const n = await card.locator('article.card').count();
  ok(n >= 3, `find_skills shows ${n} pick cards`);
  ok(/checked pick/.test(await card.locator('.head').innerText()) && /less AI generated/.test(await card.locator('.head').innerText()), 'the header repeats what was asked');
  ok(await card.locator('article.card').first().locator('.badge').count() === 1, 'each pick has a safety badge');
  await page.waitForTimeout(150);
  ok((await log()).some(m => m.method === 'ui/notifications/size-changed' && m.params.height > 200), 'the card tells Claude its height');
  await shot(page, '1-picks.png');

  const first = card.locator('article.card').first();
  await first.locator('[data-act="install"]').click();
  ok(/npx skills add/.test(await first.locator('.drawer.act').innerText()), 'Install shows the install command');
  await first.locator('[data-copy]').first().click();
  ok(/Copied|Select it to copy/.test(await first.locator('[data-copy]').first().innerText()), 'Copy responds');
  await shot(page, '2-install.png');

  await first.locator('[data-act="details"]').click();
  await first.locator('.drawer.act .row, .drawer.act .small').first().waitFor();
  const det = await first.locator('.drawer.act').innerText();
  ok(/Worth knowing|reach|slop reports|instructions/i.test(det), 'What it can do loads the check from the server');

  await first.locator('[data-act="slop"]').click();
  ok(await first.locator('[data-act="send"]').isDisabled(), 'Send report waits until a reason is picked');
  await first.locator('[data-reason="generic"]').click();
  await shot(page, '3-report.png');
  await first.locator('[data-act="send"]').click();
  await first.locator('.done').waitFor();
  ok(/Report sent/.test(await first.locator('.drawer.act').innerText()), 'the report is sent and confirmed');
  const flags = db.prepare("SELECT listing, reason FROM flags").all();
  ok(flags.length === 1 && flags[0].reason === 'generic', 'the report reached the database with the chosen reason');
  ok((await log()).some(m => m.method === 'ui/update-model-context' && /reported/.test(m.params.content[0].text)), 'Claude is told about the report');
  await shot(page, '4-reported.png');

  await first.locator('[data-act="slop"]').click();
  await first.locator('[data-reason="padded"]').click();
  await first.locator('[data-act="send"]').click();
  await first.locator('.done').waitFor();
  ok(/already reported/.test(await first.locator('.drawer.act').innerText()), 'a second report in the same chat is not counted');

  await first.locator('[data-act="toggle"]').click();
  await first.locator('[data-where="claude-app"]').click();
  await first.locator('ol.steps').waitFor();
  ok(/Customize/.test(await first.locator('ol.steps').innerText()), 'Switch off gives the Claude app steps');
  await first.locator('[data-where="claude-code"]').click();
  await first.locator('ol.steps [data-copy]').waitFor();
  ok(/skillOverrides/.test(await first.locator('ol.steps').innerText()), 'and the Claude Code setting, with a copy button');
  await shot(page, '5-switch-off.png');

  await first.locator('[data-act="page"]').click();
  await page.waitForTimeout(100);
  ok((await log()).some(m => m.method === 'ui/open-link' && /claude\.ai\/artifact\/.+#/.test(m.params.url)), 'Full check opens the listing page through Claude');
  ok(!errors.length, 'no errors in the card' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await page.close();
}

// 2. A risky one, in dark mode
{
  const { page, card, show, errors } = await open('dark');
  await show('check_skill', { skill: 'https://github.com/lharries/whatsapp-mcp' });
  await card.locator('.row.risk').first().waitFor();
  ok(await card.locator('.badge.risk').count() === 1 && /port 8080/.test(await card.locator('.row.risk').first().innerText()), 'a serious risk shows in red with the reason');
  ok(await card.locator('[data-act="toggle"]').count() === 0, 'no Switch off button for a connector');
  const bg = await card.locator('article.card').evaluate(el => getComputedStyle(el).backgroundColor);
  ok(bg !== 'rgb(255, 255, 255)', 'dark mode uses dark colours');
  await shot(page, '6-risk-dark.png');
  ok(!errors.length, 'no errors in dark mode');
  await page.close();
}

// 3. Not on Skillshelf, several matches, steps on their own, phone width
{
  const { page, card, show, errors } = await open('light', { width: 390, height: 800 });
  await show('check_skill', { skill: 'https://github.com/nobody/not-a-real-thing' });
  await card.getByText('Not checked yet').waitFor();
  ok(/security-audit/.test(await card.locator('code').innerText()), 'an unlisted repo gets the Cloudflare check command');
  await shot(page, '7-unlisted-phone.png');

  await show('find_skills', { task: 'remember things between chats' });
  await card.locator('article.card').first().waitFor();
  const wide = await card.locator('body').evaluate(b => b.scrollWidth <= b.clientWidth + 1);
  ok(wide, 'no sideways scrolling at phone width');
  await shot(page, '8-picks-phone.png');

  await show('how_to_toggle', { skill: 'Impeccable', where: 'claude-code', on: false });
  await card.locator('ol.steps').waitFor();
  ok(/switch it off/i.test(await card.locator('.lbl').innerText()) && await card.locator('ol.steps [data-copy]').count() === 1, 'how_to_toggle on its own shows numbered steps');

  const several = (await rpc('tools/call', { name: 'check_skill', arguments: { skill: 'memory' } })).result;
  if (several.structuredContent.found === 'several') {
    await page.evaluate(r => window.sendResult({ skill: 'memory' }, r), several);
    await card.locator('[data-pick]').first().click();
    await card.locator('article.card').waitFor();
    ok(await card.locator('article.card').count() === 1, 'picking one of several matches opens its check');
  } else ok(several.structuredContent.name, '"memory" resolves straight to one listing');
  ok(!errors.length, 'no errors at phone width');
  await page.close();
}

await browser.close();
fs.rmSync(tmp, { recursive: true, force: true });
process.exitCode = fails ? 1 : 0;
