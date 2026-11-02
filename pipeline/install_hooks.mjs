// Finds code that runs on its own when you install a listing: npm lifecycle scripts (preinstall, install, postinstall)
// in the package.json of the listing's folder and of the repository root.
// Usage: node pipeline/install_hooks.mjs [data/data.json] [data/sources.json] [data/install-hooks.json]
// Reads each package.json from raw.githubusercontent.com at the scanned commit when sources.json has one, else the default
// branch. Output: { listingId: [{ file, script, cmd, refs: [paths the command runs] }] }, only for listings that have hooks.
import fs from 'node:fs';

const [, , dataPath = 'data/data.json', srcPath = 'data/sources.json', outPath = 'data/install-hooks.json'] = process.argv;
const d = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const SOURCES = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
const HOOKS = ['preinstall', 'install', 'postinstall'];

const cache = new Map();
async function pkg(repo, ref, file) {
  const url = `https://raw.githubusercontent.com/${repo}/${ref}/${file}`;
  if (cache.has(url)) return cache.get(url);
  let out = null;
  try { const r = await fetch(url); if (r.ok) out = JSON.parse(await r.text()); } catch (e) { out = null; }
  cache.set(url, out);
  return out;
}
// Paths a lifecycle command runs, like "node dist/track-installation.js" or "bash ./scripts/setup.sh"
const refsOf = cmd => [...cmd.matchAll(/(?:^|[\s"'=])(\.?\/?[\w@.-]+(?:\/[\w@.-]+)*\.(?:m?js|cjs|ts|sh|ps1|py))(?=$|[\s"';&|])/g)].map(m => m[1].replace(/^\.\//, ''));

const out = {};
for (const l of d.listings) {
  if (l.kind === 'skill') continue;                    // skills are copied as files; nothing runs at install
  const m = d.repos[l.repo];
  if (!m) continue;
  const ref = SOURCES[l.repo]?.commit || m.branch;
  const files = [...new Set([l.path ? `${l.path}/package.json` : null, 'package.json'].filter(Boolean))];
  for (const file of files) {
    const p = await pkg(l.repo, ref, file);
    if (!p?.scripts) continue;
    for (const s of HOOKS) if (p.scripts[s]) (out[l.id] ||= []).push({ file, script: s, cmd: p.scripts[s], refs: refsOf(p.scripts[s]).map(r => (file.includes('/') ? file.replace(/[^/]+$/, '') : '') + r) });
  }
}
fs.writeFileSync(outPath, JSON.stringify({ _about: 'npm lifecycle scripts (preinstall, install, postinstall) that run on their own when a listing is installed with npm or npx, read from package.json at the scanned commit.', ...out }, null, 1) + '\n');
console.error(Object.keys(out).length, 'listings with install hooks');
for (const [id, h] of Object.entries(out)) for (const x of h) console.error(' ', id, x.file, x.script + ':', x.cmd, x.refs.length ? '→ ' + x.refs.join(', ') : '');
