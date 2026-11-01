// Merges a reviewer's verdicts on open findings into reviews.json.
// Usage: node pipeline/merge_reviews.mjs <batch.json from open_findings.mjs> <verdicts.json> [--date YYYY-MM-DD] [--dry]
// A verdict is {id, match?, file?, level: benign|notice|warning|concern|open, title?, note}.
// Each verdict is pinned to the files it was written for (one reviews.json entry per verdict and file), so a broad
// match such as ".env" never explains a finding in some other file later. A notice or warning that covers no finding
// becomes a listing-level notice. Findings no verdict covers are printed, so nothing is marked reviewed by accident.
import fs from 'node:fs';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const date = args.includes('--date') ? args[args.indexOf('--date') + 1] : new Date().toISOString().slice(0, 10);
const [batchPath, verdictPath] = args.filter(a => !a.startsWith('--') && a !== date);
const batch = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
const verdicts = JSON.parse(fs.readFileSync(verdictPath, 'utf8'));
const REV_PATH = new URL('./reviews.json', import.meta.url);
const REV = JSON.parse(fs.readFileSync(REV_PATH, 'utf8'));
const LEVELS = new Set(['benign', 'notice', 'warning', 'concern', 'open']);

const fileOk = (v, file) => !v.file || file === v.file || file.endsWith('/' + v.file);
const matchOk = (v, f) => !v.match || f.text.includes(v.match) || f.rule.includes(v.match);
const used = new Map();   // verdict -> Set(files)
const uncovered = [];
for (const l of batch) {
  const mine = verdicts.filter(v => v.id === l.id);
  for (const f of l.open) {
    // Most specific verdict first: one naming the file, then the longest match
    const v = mine.filter(v => (v.match || v.file) && matchOk(v, f) && fileOk(v, f.file))
      .sort((a, b) => (b.file ? 1 : 0) - (a.file ? 1 : 0) || (b.match || '').length - (a.match || '').length)[0];
    if (!v) { uncovered.push(`${l.id}  ${f.file}:${f.line}  ${f.rule}  «${f.text.slice(0, 90)}»`); continue; }
    if (!used.has(v)) used.set(v, new Set());
    used.get(v).add(f.file);
  }
}

let added = 0, notices = 0;
const bad = verdicts.filter(v => !LEVELS.has(v.level) || !v.note || !v.id);
for (const v of bad) console.error('SKIPPED (missing id, note or level):', JSON.stringify(v).slice(0, 160));
for (const v of verdicts) {
  if (bad.includes(v)) continue;
  const e = REV[v.id] ||= {};
  const files = used.get(v);
  if (files) {
    e._findings ||= [];
    for (const file of files) {
      if (e._findings.some(x => x.match === v.match && x.file === file)) continue;
      e._findings.push({ match: v.match || undefined, file, level: v.level, ...(v.title ? { title: v.title } : {}), note: v.note, date });
      added++;
    }
  } else if (v.level === 'notice' || v.level === 'warning' || v.level === 'concern') {
    e._notices ||= [];
    if (e._notices.some(x => x.title === v.title)) continue;
    e._notices.push({ title: v.title, level: v.level, note: v.note, where: v.file ? [[v.file, null]] : [], date });
    notices++;
  } else console.error('UNUSED verdict (covers no open finding):', v.id, JSON.stringify(v.match), v.file || '');
}
console.error(`${added} finding reviews added, ${notices} listing notices added, ${uncovered.length} findings still uncovered`);
for (const u of uncovered) console.error('  UNCOVERED', u);
if (!dry) fs.writeFileSync(REV_PATH, JSON.stringify(REV, null, 2) + '\n');
