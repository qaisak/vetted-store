// Lists every serious SkillSpector finding that has no written review yet, grouped by listing.
// Usage: node pipeline/open_findings.mjs data/data.json data/scan-reports data/purpose.json out.json
// Each entry: listing id, kind, repo and path, and the open findings with file, line, rule and matched text.
import fs from 'node:fs';
import { findingStatus, isSerious } from './findings.mjs';

const [, , dataPath, scanDir, purposePath, outPath] = process.argv;
const d = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const MR = JSON.parse(fs.readFileSync(purposePath, 'utf8'));
const REV = JSON.parse(fs.readFileSync(new URL('./reviews.json', import.meta.url), 'utf8'));
const HF = new URL('../data/install-hooks.json', import.meta.url);
const HOOKS = fs.existsSync(HF) ? JSON.parse(fs.readFileSync(HF, 'utf8')) : {};
const NAME = { 'cli/cli': 'GitHub CLI', 'vercel-labs/skills': 'skills CLI', 'NVIDIA/SkillSpector': 'SkillSpector' };
const BUILD_NAME = JSON.parse(process.env.VETTED_NAMES || '{}');
const out = [];
const seen = new Set();
for (const l of d.listings) {
  const m = d.repos[l.repo] || Object.values(d.repos).find(x => x?.full === l.repo);
  if (!m || l.slug === 'template-skill') continue;
  const id = (l.kind === 'skill' ? `${m.owner}-${l.slug}` : l.kind === 'mcp' ? `mcp-${l.slug}` : (BUILD_NAME[m.full] || NAME[m.full] || l.slug)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (seen.has(id)) continue; seen.add(id);
  const f = `${scanDir}/${id}.json`;
  if (!fs.existsSync(f)) continue;
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  const scope = fs.existsSync(`${scanDir}/${id}.scope.txt`) ? fs.readFileSync(`${scanDir}/${id}.scope.txt`, 'utf8').trim() : null;
  const open = [];
  for (const i of j.issues.filter(isSerious)) {
    if (scope && i.location?.file) i.location.file = `${scope}/${i.location.file.replace(/\\/g, '/')}`;
    if (findingStatus(i, { id, k: l.kind, ih: HOOKS[l.id] }, REV[id], MR[id]).s !== 'open') continue;
    open.push({ file: i.location?.file || '', line: i.location?.start_line || null, sev: i.severity, rule: `${i.category} / ${i.pattern}`.slice(0, 120), text: String(i.finding || '').replace(/\s+/g, ' ').slice(0, 160) });
  }
  if (open.length) out.push({ id, kind: l.kind, repo: m.full, branch: m.branch, path: l.path || '', scope, open });
}
fs.writeFileSync(outPath, JSON.stringify(out, null, 1));
console.error(out.length, 'listings with open findings,', out.reduce((a, x) => a + x.open.length, 0), 'open findings');
