#!/usr/bin/env node
// Vetted Checkup: which of your Claude Code skills to keep, which to drop, and why.
// Reads only local files: your installed skills, your plugins, and your own session logs (to count real use).
// Never deletes or changes anything, and sends nothing anywhere.
//
// Usage: node checkup.mjs [--project <dir>] [--days 30] [--json]
//   CLAUDE_CONFIG_DIR is honoured (default ~/.claude).
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };
const JSON_OUT = args.includes('--json');
const DAYS = Number(opt('--days', 30));
const PROJECT = path.resolve(opt('--project', process.cwd()));
const CONFIG = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const DATA_FILE = path.join(HERE, 'vetted-data.json');
const VETTED = fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { site: null, listings: [] };

// ---------- 1. Installed skills ----------
function frontmatter(md) {
  const m = md.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
  const out = {};
  if (!m) return out;
  let cur = null;
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-zA-Z_-]+):\s*(.*)$/);
    if (kv) { cur = kv[1]; out[cur] = kv[2].replace(/^["']|["']$/g, '').replace(/^[>|][-+]?\s*$/, ''); }
    else if (cur && /^\s+\S/.test(line)) out[cur] = (out[cur] + ' ' + line.trim()).trim();
  }
  return out;
}
function skillsIn(dir, scope, extra = {}) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory() && !e.isSymbolicLink()) continue;
    const f = path.join(dir, e.name, 'SKILL.md');
    if (!fs.existsSync(f)) continue;
    const md = fs.readFileSync(f, 'utf8'), fm = frontmatter(md);
    out.push({ folder: e.name, name: fm.name || e.name, description: fm.description || '', scope, dir: path.join(dir, e.name), lines: md.split('\n').length, ...extra });
  }
  return out;
}
const installed = [
  ...skillsIn(path.join(CONFIG, 'skills'), 'personal'),
  ...skillsIn(path.join(PROJECT, '.claude', 'skills'), 'this project'),
];
// Plugins: ~/.claude/plugins/installed_plugins.json lists each plugin and where it's installed
const pluginsFile = path.join(CONFIG, 'plugins', 'installed_plugins.json');
if (fs.existsSync(pluginsFile)) {
  try {
    const reg = JSON.parse(fs.readFileSync(pluginsFile, 'utf8'));
    for (const [key, entries] of Object.entries(reg.plugins || reg)) {
      for (const p of [].concat(entries || [])) if (p?.installPath) installed.push(...skillsIn(path.join(p.installPath, 'skills'), 'plugin', { plugin: key }));
    }
  } catch (e) { /* an unreadable registry just means no plugin skills are listed */ }
}

// ---------- 2. Real use, from your own session logs ----------
// Each session is a JSONL file under <config>/projects/. A skill used by Claude shows up as a Skill tool call;
// one you run yourself shows up as a /command. Only the last DAYS days count.
const since = Date.now() - DAYS * 864e5;
const uses = {}, lastUse = {};
let sessions = 0, oldest = null;
const projDir = path.join(CONFIG, 'projects');
if (fs.existsSync(projDir)) {
  for (const p of fs.readdirSync(projDir)) {
    const d = path.join(projDir, p);
    if (!fs.statSync(d).isDirectory()) continue;
    for (const f of fs.readdirSync(d).filter(f => f.endsWith('.jsonl'))) {
      const file = path.join(d, f), st = fs.statSync(file);
      if (st.mtimeMs < since) continue;
      sessions++;
      for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
        if (!line.includes('Skill') && !line.includes('<command-name>')) continue;
        let o; try { o = JSON.parse(line); } catch { continue; }
        const t = Date.parse(o.timestamp || '') || st.mtimeMs;
        if (t < since) continue;
        if (!oldest || t < oldest) oldest = t;
        const hit = n => { if (!n) return; n = String(n).replace(/^\//, '').split(':').pop(); uses[n] = (uses[n] || 0) + 1; lastUse[n] = Math.max(lastUse[n] || 0, t); };
        const c = o.message?.content;
        if (Array.isArray(c)) for (const b of c) if (b?.type === 'tool_use' && b.name === 'Skill') hit(b.input?.skill || b.input?.command);
        const text = typeof c === 'string' ? c : Array.isArray(c) ? c.map(b => b?.text || '').join(' ') : '';
        for (const m of text.matchAll(/<command-name>\/?([^<\s]+)<\/command-name>/g)) hit(m[1]);
      }
    }
  }
}
const usedCount = s => (uses[s.folder] || 0) + (s.name !== s.folder ? uses[s.name] || 0 : 0);

// ---------- 3. Match to Vetted's checks ----------
const STOP = new Set('a an and are as at be by for from has have in into is it its of on or that the this to use used user when with you your will can not any all also more only than then them they their what which who how'.split(' '));
const words = s => new Set(String(s).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w)));
const jaccard = (a, b) => { let n = 0; for (const w of a) if (b.has(w)) n++; return n / Math.max(1, a.size + b.size - n); };
function vettedMatch(s) {
  const cands = VETTED.listings.filter(l => l.slug === s.name || l.slug === s.folder);
  if (!cands.length) return null;
  const w = words(s.description);
  const best = cands.map(l => [l, jaccard(w, words(l.description))]).sort((a, b) => b[1] - a[1])[0];
  // Same name but a different description is a different skill: say so instead of borrowing its check
  return best[1] >= 0.35 || (cands.length === 1 && best[1] >= 0.2) ? best[0] : null;
}

// ---------- 4. Overlaps: skills that do the same job ----------
const overlaps = [];
for (let i = 0; i < installed.length; i++) for (let j = i + 1; j < installed.length; j++) {
  const a = installed[i], b = installed[j];
  const sim = jaccard(words(a.description), words(b.description));
  const va = vettedMatch(a), vb = vettedMatch(b);
  const sameGroup = va?.group && va.group === vb?.group;
  if (sim >= 0.3 || sameGroup) overlaps.push({ a: a.folder, b: b.folder, why: sameGroup ? `both ${va.groupLabel}` : 'very similar descriptions' });
}

// ---------- 5. The report ----------
const tokens = s => Math.round((s.name.length + s.description.length) / 4);
const rows = installed.map(s => {
  const v = vettedMatch(s), n = usedCount(s);
  const reasons = [];
  let verdict = 'keep';
  if (sessions && !n) { verdict = 'consider removing'; reasons.push(`not used in the last ${DAYS} days`); }
  if (v?.notes?.some(x => x.level !== 'note')) { verdict = 'review'; reasons.push('Vetted found a risk to know'); }
  if (overlaps.some(o => o.a === s.folder || o.b === s.folder)) reasons.push('overlaps with another skill you have');
  return { skill: s.folder, name: s.name, scope: s.scope, plugin: s.plugin || null, used: n, lastUsed: lastUse[s.folder] ? new Date(lastUse[s.folder]).toISOString().slice(0, 10) : null,
    tokens: tokens(s), verdict, reasons, vetted: v ? { label: v.label, notes: v.notes, page: VETTED.site ? `${VETTED.site}#${v.id}` : null, repo: v.repo } : null, path: s.dir };
});
const report = { generated: new Date().toISOString(), days: DAYS, sessionsRead: sessions, skills: rows, overlaps,
  totals: { installed: rows.length, neverUsed: rows.filter(r => sessions && !r.used).length, notChecked: rows.filter(r => !r.vetted).length, descriptionTokens: rows.reduce((a, r) => a + r.tokens, 0) },
  vettedData: VETTED.generated || null };

if (JSON_OUT) { console.log(JSON.stringify(report, null, 1)); process.exit(0); }

const L = [];
L.push(`Vetted Checkup: ${rows.length} skill${rows.length === 1 ? '' : 's'} installed (${rows.filter(r => r.scope === 'personal').length} personal, ${rows.filter(r => r.scope === 'this project').length} in this project, ${rows.filter(r => r.scope === 'plugin').length} from plugins).`);
L.push(sessions ? `Read ${sessions} of your sessions from the last ${DAYS} days to see which skills actually ran.` : `No session logs from the last ${DAYS} days, so use isn't counted.`);
L.push(`Their names and descriptions take about ${report.totals.descriptionTokens.toLocaleString('en-US')} tokens of every session.`);
const sec = (title, list, fmt) => { if (!list.length) return; L.push('', `## ${title}`); for (const x of list) L.push(`- ${fmt(x)}`); };
sec('Review first: a risk Vetted found', rows.filter(r => r.verdict === 'review'), r => `${r.skill}: ${r.vetted.notes.filter(n => n.level !== 'note').map(n => n.title).join('; ')}${r.vetted.page ? ` (${r.vetted.page})` : ''}`);
sec('Never used: consider removing', rows.filter(r => r.verdict === 'consider removing'), r => `${r.skill} (${r.scope}${r.plugin ? `, ${r.plugin}` : ''}), ~${r.tokens} tokens a session`);
sec('Doing the same job: keep one', overlaps, o => `${o.a} and ${o.b}: ${o.why}`);
sec('Worth knowing (from Vetted)', rows.filter(r => r.vetted?.notes?.some(n => n.level === 'note')), r => `${r.skill}: ${r.vetted.notes.filter(n => n.level === 'note').map(n => n.title).join('; ')}`);
sec('Not checked by Vetted yet', rows.filter(r => !r.vetted), r => `${r.skill}${r.scope === 'plugin' ? ` (${r.plugin})` : ''}`);
sec('Used and checked: keep', rows.filter(r => r.verdict === 'keep' && r.vetted), r => `${r.skill}: ${r.used ? `used ${r.used} time${r.used === 1 ? '' : 's'}` : 'use not counted'}, ${r.vetted.label}`);
L.push('', 'Nothing was changed. To remove a skill, delete its folder; the paths are in the --json output.');
console.log(L.join('\n'));
