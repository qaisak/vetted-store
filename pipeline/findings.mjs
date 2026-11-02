// Review status for every serious (high or critical) SkillSpector finding on a listing.
// A finding is "ok" (read and routine, or explained by the listing's purpose), "note" (worth knowing),
// "warn" (a real weakness or risky default), "bad" (looks harmful), "cov" (a gap in what the scanner could read),
// or "open" (not reviewed yet). Nothing is marked ok without a written reason.
import fs from 'node:fs';
import { fileKind, capOfFinding, otherNote } from './filekind.mjs';

const RULES_FILE = new URL('./finding-rules.json', import.meta.url);
// Pattern-level rules: only for patterns whose definition makes them say nothing about this listing's behaviour
export const RULES = fs.existsSync(RULES_FILE) ? JSON.parse(fs.readFileSync(RULES_FILE, 'utf8')).rules : [];

export const isSerious = i => i.severity === 'HIGH' || i.severity === 'CRITICAL';
const norm = s => String(s || '').replace(/\s+/g, ' ');
// reviews.json levels → status
export const LEVEL_STATUS = { benign: 'ok', notice: 'note', warning: 'warn', concern: 'bad', open: 'open' };
// Code that runs on its own when you install: npm lifecycle scripts, files named like install hooks, and the files a
// listing's hooks run (data/install-hooks.json, e.g. dist/x.js, also matched to its source src/x.ts). Never "doesn't run".
const HOOK_FILE = /(^|\/)(pre|post)install[\w.-]*\.(m?js|cjs|ts|sh|py)$/i;
const stem = f => f.split('/').pop().replace(/\.[^.]+$/, '');
export const atInstall = (file, text, l) => HOOK_FILE.test(file) || (/(^|\/)package\.json$/.test(file) && /"(pre|post)?install"\s*:/.test(text))
  || (l.ih || []).some(h => h.refs.some(r => file === r || file.endsWith('/' + r) || (stem(file) === stem(r) && /(^|\/)(src|dist|lib|build|scripts)\//.test(file))));

// i: a SkillSpector issue (file path already prefixed with any scan scope); l: { id, k } listing; rev: reviews.json entry; mr: purpose.json entry
export function findingStatus(i, l, rev = {}, mr = null) {
  const file = String(i.location?.file || '').replace(/\\/g, '/');
  const text = norm(i.finding), pat = `${i.category || ''} ${i.pattern || ''}`;
  const f = (rev._findings || []).find(f => (f.match || f.file) && (!f.match || text.includes(f.match) || norm(i.pattern).includes(f.match)) && (!f.file || file === f.file || file.endsWith('/' + f.file)));
  if (f) return { s: LEVEL_STATUS[f.level] || 'ok', n: f.level === 'open' ? null : f.note, t: f.title || null, by: f.level === 'open' ? null : 'read' };
  const rule = RULES.find(r => new RegExp(r.pattern, 'i').test(pat) && (!r.kinds || r.kinds.includes(l.k)));
  if (rule) return { s: rule.status || 'ok', n: rule.note, by: 'rule' };
  // Install hooks get a written review or stay open: no path, purpose or pattern shortcut
  if (atInstall(file, text, l)) return { s: 'open', n: null, by: null, hook: true };
  const kind = fileKind(file, l.k);
  if (l.k !== 'skill' && kind !== 'production') return { s: 'ok', n: 'In tests, docs or build tooling, which don\'t run when you use it.', by: 'where' };
  if (mr && !mr.codeFree) {
    const cap = capOfFinding(i);
    const c = mr.caps?.find(c => c.k === cap);
    if (c?.expected) return { s: 'ok', n: `Explained by what it's for: ${c.why}.`, by: 'purpose' };
    if (mr.reviewNotes?.[cap]) return { s: 'ok', n: mr.reviewNotes[cap], by: 'read' };
    if (cap === 'other') { const n = otherNote(i.pattern, l.k); if (n) return { s: 'ok', n, by: 'rule' }; }
  }
  return { s: 'open', n: null, by: null };
}

export function summarize(issues, l, rev, mr) {
  const out = { n: 0, ok: 0, note: 0, warn: 0, bad: 0, cov: 0, open: 0 };
  for (const i of issues.filter(isSerious)) { out.n++; out[findingStatus(i, l, rev, mr).s]++; }
  return out;
}
