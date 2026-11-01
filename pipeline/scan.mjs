// Runs NVIDIA SkillSpector (static mode, --no-llm) on every skill and MCP server listing.
// Usage: node scan.mjs data.json <scan-root> [concurrency] [only-id] [--tools]
// --tools also scans the command-line apps (their whole repository, or use scan_scoped.mjs for very large ones).
// Reports land in <scan-root>/out/<listing-id>.json; existing reports are skipped.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const TOOLS = process.argv.includes('--tools');
const skipAt = process.argv.indexOf('--skip');   // --skip id,id: leave these to scan_scoped.mjs
const SKIP = new Set(skipAt > 0 ? process.argv[skipAt + 1].split(',') : []);
const [, , dataPath, root, conc = '6', only] = process.argv.filter((a, i) => a !== '--tools' && i !== skipAt && i !== skipAt + 1);
const EXE = process.env.SKILLSPECTOR || 'skillspector';
const d = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const OUT = path.join(root, 'out');
fs.mkdirSync(OUT, { recursive: true });

// Same id scheme as build.mjs
const NAME = { 'cli/cli': 'GitHub CLI', 'vercel-labs/skills': 'skills CLI', 'NVIDIA/SkillSpector': 'SkillSpector' };
const jobs = [];
for (const l of d.listings) {
  if ((l.kind === 'tool' && !TOOLS) || l.slug === 'template-skill') continue;
  const m = d.repos[l.repo] || Object.values(d.repos).find(x => x?.full === l.repo);   // renamed repos
  if (!m) continue;
  const id = (l.kind === 'skill' ? `${m.owner}-${l.slug}` : l.kind === 'mcp' ? `mcp-${l.slug}` : (NAME[m.full] || l.slug)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const base = path.join(root, 'src', m.full.replace('/', '__'), `${m.full.split('/')[1]}-${m.branch}`);
  const dir = l.path ? path.join(base, ...l.path.split('/')) : base;
  if (!fs.existsSync(dir)) { console.error('NO DIR', id, dir); continue; }
  if ((only && id !== only) || SKIP.has(id)) continue;
  jobs.push({ id, dir });
}

const todo = jobs.filter(j => !fs.existsSync(path.join(OUT, j.id + '.json')));
console.error(`jobs ${jobs.length}, to scan ${todo.length}`);
let done = 0, failed = 0;
const t0 = Date.now();

function run({ id, dir }) {
  return new Promise(resolve => {
    const p = spawn(EXE, ['scan', dir, '--no-llm', '--format', 'json'], { windowsHide: true });
    let out = '', err = '';
    const timer = setTimeout(() => { p.kill(); err += ' TIMEOUT'; }, 15 * 60 * 1000);
    p.stdout.on('data', b => out += b);
    p.stderr.on('data', b => err += b);
    p.on('close', code => {
      clearTimeout(timer);
      try { JSON.parse(out); fs.writeFileSync(path.join(OUT, id + '.json'), out); done++; }
      catch (e) { failed++; fs.writeFileSync(path.join(OUT, id + '.err.txt'), `exit ${code}\n${err.slice(0, 4000)}\n${out.slice(0, 2000)}`); }
      console.error(`[${done + failed}/${todo.length}] ${id} exit ${code} ${Math.round((Date.now() - t0) / 1000)}s`);
      resolve();
    });
  });
}

const queue = [...todo];
await Promise.all(Array.from({ length: +conc }, async () => { while (queue.length) await run(queue.shift()); }));
console.error(`finished: ${done} ok, ${failed} failed, ${Math.round((Date.now() - t0) / 1000)}s`);
