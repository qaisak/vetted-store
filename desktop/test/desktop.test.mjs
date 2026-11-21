// Tests the Skillshelf desktop extension on a made-up computer: personal, project and plugin skills, then the switches,
// reporting (to a stand-in connector, never the real one) and the card in a sandboxed iframe with a stand-in host.
// Usage: node desktop/test/desktop.test.mjs [screenshot-dir]   (needs Playwright with Chromium)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SERVER = path.join(HERE, '..', 'server', 'index.mjs');
const SHOTS = process.argv[2];
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

// ---------- a made-up computer ----------
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skillshelf-desktop-'));
const CONFIG = path.join(root, '.claude'), PROJECT = path.join(root, 'my-site');
const DATA = JSON.parse(fs.readFileSync(path.join(HERE, '..', '..', 'checkup', 'skills', 'skillshelf-checkup', 'skillshelf-data.json'), 'utf8'));
const real = slug => DATA.listings.find(l => l.slug === slug);
const skill = (dir, folder, name, description) => { fs.mkdirSync(path.join(dir, folder), { recursive: true }); fs.writeFileSync(path.join(dir, folder, 'SKILL.md'), `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n`); };
skill(path.join(CONFIG, 'skills'), 'impeccable', 'impeccable', real('impeccable').description);
skill(path.join(CONFIG, 'skills'), 'meeting-notes', 'meeting-notes', 'Turns my rough meeting notes into a tidy summary with action items.');
skill(path.join(CONFIG, 'skills'), 'old-helper', 'old-helper', 'An old helper I wrote and no longer use.');
skill(path.join(PROJECT, '.claude', 'skills'), 'brand-voice', 'brand-voice', 'Writes copy in our brand voice for the website.');
const pluginDir = path.join(CONFIG, 'plugins', 'cache', 'design-pack');
skill(path.join(pluginDir, 'skills'), 'frontend-design', 'frontend-design', real('frontend-design').description);
fs.writeFileSync(path.join(CONFIG, 'plugins', 'installed_plugins.json'), JSON.stringify({ version: 2, plugins: { 'design-pack@market': [{ scope: 'user', installPath: pluginDir }] } }));
// An existing settings file whose other settings must survive, with one skill already off
fs.writeFileSync(path.join(CONFIG, 'settings.json'), JSON.stringify({ model: 'opus', permissions: { allow: ['Bash(ls:*)'] }, skillOverrides: { 'old-helper': 'off' } }, null, 2));

// ---------- a stand-in for the Skillshelf connector, so tests never touch real reports ----------
const reports = [];
const stub = http.createServer((req, res) => {
  let body = ''; req.on('data', c => body += c); req.on('end', () => {
    const m = JSON.parse(body);
    if (m.method === 'initialize') { res.writeHead(200, { 'Content-Type': 'application/json', 'Mcp-Session-Id': 'stub-session' }); return res.end(JSON.stringify({ jsonrpc: '2.0', id: m.id, result: { protocolVersion: '2025-06-18', capabilities: {}, serverInfo: { name: 'stub', version: '1' } } })); }
    if (!m.id) { res.writeHead(202); return res.end(); }
    reports.push({ session: req.headers['mcp-session-id'], ...m.params.arguments });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ jsonrpc: '2.0', id: m.id, result: { structuredContent: { saved: true, note: 'Thanks.' }, content: [] } }));
  });
});
await new Promise(r => stub.listen(0, '127.0.0.1', r));

// ---------- the server, spoken to over stdio like Claude desktop does ----------
const proc = spawn(process.execPath, [SERVER, PROJECT, '${user_config.other}'], { env: { ...process.env, CLAUDE_CONFIG_DIR: CONFIG, SKILLSHELF_CONNECTOR: `http://127.0.0.1:${stub.address().port}/mcp` }, stdio: ['pipe', 'pipe', 'inherit'] });
let out = '', id = 0;
const waiting = {};
proc.stdout.on('data', c => { out += c; let i; while ((i = out.indexOf('\n')) >= 0) { const line = out.slice(0, i); out = out.slice(i + 1); const m = JSON.parse(line); waiting[m.id]?.(m); } });
const rpc = (method, params) => new Promise(r => { const n = ++id; waiting[n] = r; proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: n, method, params }) + '\n'); });
const call = async (name, args = {}) => (await rpc('tools/call', { name, arguments: args })).result;

const init = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } });
ok(init.result.capabilities.resources && init.result.serverInfo.title === 'Skillshelf', 'initialize offers tools and the card');
proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
const tools = (await rpc('tools/list')).result.tools;
ok(tools.map(t => t.name).join() === 'show_my_skills,switch_skill,report_slop' && tools.every(t => t._meta.ui.resourceUri === 'ui://skillshelf-desktop/skills.html'), 'three tools, each showing the card');
const card = (await rpc('resources/read', { uri: 'ui://skillshelf-desktop/skills.html' })).result.contents[0];
ok(card.mimeType === 'text/html;profile=mcp-app' && /ui\/initialize/.test(card.text) && !/<script[^>]+src=/.test(card.text), 'the card is served whole, with nothing loaded from outside');

const list = (await call('show_my_skills')).structuredContent;
const by = k => list.skills.find(s => s.key === k);
ok(list.skills.length === 5, `finds personal, project and plugin skills (${list.skills.map(s => s.key).join(', ')})`);
ok(by('impeccable')?.check?.badge === 'note' && by('impeccable').check.label === '1 thing to know', 'a skill Skillshelf checked gets its badge');
ok(by('meeting-notes')?.check === null, 'a home-made skill has no check');
ok(by('old-helper')?.on === false && by('meeting-notes')?.on === true, 'reads which skills are already off');
ok(by('my-site/brand-voice')?.scope === 'project' && by('design-pack:frontend-design')?.can_switch === false, 'project skills switch; plugin skills are read-only');
ok(list.on === 3 && list.off === 1, 'counts on and off');

let r = (await call('switch_skill', { skill: 'impeccable', on: false })).structuredContent;
let st = JSON.parse(fs.readFileSync(path.join(CONFIG, 'settings.json'), 'utf8'));
ok(r.ok && r.changed && st.skillOverrides.impeccable === 'off' && st.skillOverrides['old-helper'] === 'off' && st.model === 'opus' && st.permissions.allow[0] === 'Bash(ls:*)', 'switching off adds skillOverrides and keeps every other setting');
ok(fs.existsSync(path.join(CONFIG, 'settings.json.skillshelf-backup')), 'the previous settings file is backed up');
r = (await call('switch_skill', { skill: 'old-helper', on: true })).structuredContent;
st = JSON.parse(fs.readFileSync(path.join(CONFIG, 'settings.json'), 'utf8'));
ok(r.ok && !('old-helper' in st.skillOverrides), 'switching on removes the entry');
r = (await call('switch_skill', { skill: 'brand-voice', on: false, project: 'my-site' })).structuredContent;
ok(r.ok && JSON.parse(fs.readFileSync(path.join(PROJECT, '.claude', 'settings.local.json'), 'utf8')).skillOverrides['brand-voice'] === 'off', 'a project skill is switched in that project\'s settings.local.json');
r = await call('switch_skill', { skill: 'frontend-design', on: false });
ok(r.isError && /plugin/.test(r.structuredContent.note), 'a plugin skill is refused with the way to do it');
r = await call('switch_skill', { skill: 'nope', on: false });
ok(r.isError, 'an unknown skill is refused');
fs.writeFileSync(path.join(PROJECT, '.claude', 'settings.local.json'), '{ broken');
r = await call('switch_skill', { skill: 'brand-voice', on: true, project: 'my-site' });
ok(r.isError && /isn't valid JSON/.test(r.structuredContent.note) && fs.readFileSync(path.join(PROJECT, '.claude', 'settings.local.json'), 'utf8') === '{ broken', 'a broken settings file is left alone');
fs.writeFileSync(path.join(PROJECT, '.claude', 'settings.local.json'), '{}');

r = (await call('report_slop', { skill: 'impeccable', reason: 'generic' })).structuredContent;
ok(r.saved && reports.length === 1 && reports[0].skill === 'pbakaus-impeccable' && reports[0].reason === 'generic' && reports[0].session === 'stub-session' && Object.keys(reports[0]).length === 3, 'a report sends only the Skillshelf id and reason');
r = await call('report_slop', { skill: 'meeting-notes', reason: 'generic' });
ok(r.isError && reports.length === 1, 'a skill Skillshelf never checked can\'t be reported');

// ---------- the card ----------
const HOST = theme => `<!doctype html><html><body style="margin:0;padding:16px;background:${theme === 'dark' ? '#262624' : '#faf9f5'}">
<iframe id="f" sandbox="allow-scripts" style="width:100%;border:0;display:block;height:200px"></iframe>
<script>
  window.log = []; const f = document.getElementById('f');
  const reply = (id, result) => f.contentWindow.postMessage({ jsonrpc: '2.0', id, result }, '*');
  window.sendResult = r => f.contentWindow.postMessage({ jsonrpc: '2.0', method: 'ui/notifications/tool-result', params: r }, '*');
  window.addEventListener('message', async e => {
    if (e.source !== f.contentWindow) return; const m = e.data; window.log.push(m);
    if (m.method === 'ui/initialize') reply(m.id, { protocolVersion: '2026-01-26', hostInfo: { name: 'test', version: '1' }, hostCapabilities: { openLinks: {}, serverTools: {}, updateModelContext: { text: {} } }, hostContext: { theme: '${theme}' } });
    else if (m.method === 'ui/notifications/initialized') window.ready = true;
    else if (m.method === 'ui/notifications/size-changed') f.style.height = m.params.height + 'px';
    else if (m.method === 'tools/call') reply(m.id, await window.hostCall(m.params.name, m.params.arguments));
    else if (m.id != null) reply(m.id, {});
  });
  f.srcdoc = ${JSON.stringify(card.text).replace(/</g, '\\u003c')};
</script></body></html>`;
const browser = await chromium.launch();
async function open(theme, width) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: SHOTS ? 2 : 1 });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.exposeFunction('hostCall', (name, args) => call(name, args));
  await page.setContent(HOST(theme));
  await page.waitForFunction(() => window.ready === true);
  await page.evaluate(r => window.sendResult(r), await call('show_my_skills'));
  const f = page.frameLocator('#f');
  await f.locator('.row').first().waitFor();
  return { page, f, errors };
}
const shot = async (page, n) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, n), fullPage: true }); } };
{
  const { page, f, errors } = await open('light', 680);
  ok(await f.locator('.row').count() === 5 && await f.locator('.switch').count() === 4, 'the card lists 5 skills with 4 switches (plugin skills have none)');
  ok(/personal/i.test(await f.locator('.group').first().innerText()) && await f.locator('.group', { hasText: /project: my-site/i }).count() === 1, 'grouped by personal, project and plugin');
  await shot(page, 'd1-skills.png');
  const sw = f.locator('[data-key="meeting-notes"] .switch');
  await sw.click();
  await f.locator('.toast').waitFor();
  ok(await sw.getAttribute('aria-checked') === 'false' && JSON.parse(fs.readFileSync(path.join(CONFIG, 'settings.json'), 'utf8')).skillOverrides['meeting-notes'] === 'off', 'tapping a switch turns the skill off in the settings file');
  ok(/meeting-notes is off/.test(await f.locator('.toast').innerText()), 'and says so, with when it takes effect');
  ok((await page.evaluate(() => window.log)).some(m => m.method === 'ui/update-model-context' && /meeting-notes/.test(m.params.content[0].text)), 'Claude is told what changed');
  await shot(page, 'd2-switched.png');
  await f.locator('[data-key="meeting-notes"] .switch').click();
  await page.waitForTimeout(300);
  ok(!('meeting-notes' in (JSON.parse(fs.readFileSync(path.join(CONFIG, 'settings.json'), 'utf8')).skillOverrides || {})), 'tapping again turns it back on');
  await f.locator('[data-key="impeccable"] [data-expand]').click();
  ok(/auto-running design hook/.test(await f.locator('[data-more="impeccable"]').innerText()), 'opening a checked skill shows what Skillshelf found');
  await f.locator('[data-more="impeccable"] [data-slop]').click();
  await f.locator('[data-reason="padded"]').click();
  await shot(page, 'd3-report.png');
  await f.locator('[data-send]').click();
  await f.getByText('Report sent').waitFor();
  ok(reports.length === 2 && reports[1].reason === 'padded', 'Report slop from the card reaches Skillshelf');
  await f.locator('.search').fill('brand');
  ok(await f.locator('.row').count() === 1, 'search narrows the list');
  ok(!errors.length, 'no errors in the card ' + errors.join('; '));
  await page.close();
}
{
  const { page, f, errors } = await open('dark', 390);
  ok(await f.locator('body').evaluate(b => b.scrollWidth <= b.clientWidth + 1), 'fits a narrow window');
  await shot(page, 'd4-dark-narrow.png');
  ok(!errors.length, 'no errors in dark mode');
  await page.close();
}
await browser.close();
proc.stdin.end(); stub.close();
fs.rmSync(root, { recursive: true, force: true });
process.exitCode = fails ? 1 : 0;
