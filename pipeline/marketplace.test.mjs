// Checks the Skillshelf plugin marketplace that the build writes (.claude-plugin/marketplace.json).
// Usage: node pipeline/marketplace.test.mjs   (after the build)
import fs from 'node:fs';
import { buildMarketplace, commitsFrom, branchesFrom, leftOut, sourceOf, MARKETPLACE, MARKETPLACE_FILE } from './marketplace.mjs';

const read = p => JSON.parse(fs.readFileSync(new URL(p, import.meta.url), 'utf8'));
const cat = read('../connector/src/catalog.json'), sources = read('../data/sources.json'), data = read('../data/data.json');
const commits = commitsFrom(sources);
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

// The layout `/plugin marketplace add <repo>` reads: .claude-plugin/marketplace.json at the repo root
ok(fs.existsSync(new URL(`../${MARKETPLACE_FILE}`, import.meta.url)), `${MARKETPLACE_FILE} is at the repo root`);
const mk = read(`../${MARKETPLACE_FILE}`);
ok(JSON.stringify(mk) === JSON.stringify(buildMarketplace(cat, commits, branchesFrom(data)).marketplace), 'the committed file matches what the build writes from the current catalog');
ok(mk.name === MARKETPLACE && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(mk.name) && mk.owner?.name && Array.isArray(mk.plugins) && mk.plugins.length > 50, `has a kebab-case name, an owner and plugins (${mk.plugins.length})`);
const names = mk.plugins.map(p => p.name);
ok(new Set(names).size === names.length && names.every(n => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(n)), 'plugin names are unique and kebab-case');
ok(mk.plugins.every(p => p.description && p.source?.source === 'git-subdir' && p.source.path && !('skills' in p) && !('strict' in p)),
  'every plugin is one skill folder (a git-subdir source, and no skills list, which would add the default skills/ scan)');

// Only checked skills with no serious risk, pinned to the commit Skillshelf checked
const byId = Object.fromEntries(cat.listings.map(l => [l.id, l]));
const bad = mk.plugins.filter(p => { const l = byId[p.name]; return !l || l.kind !== 'skill' || l.notes.some(n => n.level !== 'note'); });
ok(!bad.length, `every plugin is a listed skill with no serious risk (badge ok or note)${bad.length ? ': ' + bad.map(p => p.name).join(', ') : ''}`);
const risky = cat.listings.filter(l => l.kind === 'skill' && l.notes.some(n => n.level !== 'note'));
ok(risky.length > 0 && risky.every(l => !names.includes(l.id)), `no skill with a serious risk is in it (${risky.map(l => l.id).join(', ')} left out)`);
ok(mk.plugins.every(p => { const l = byId[p.name], s = p.source;
  return /^[0-9a-f]{40}$/.test(s.sha) && s.sha === commits[l.repo] && s.sha.startsWith(l.checkedCommit) && s.url === `https://github.com/${l.repo}.git`; }),
  'every plugin is pinned to the full 40-character commit Skillshelf checked, from its own GitHub repo');
ok(mk.plugins.every(p => p.source.path === byId[p.name].path), 'each plugin is exactly the skill folder Skillshelf checked');
ok(mk.plugins.every(p => typeof p.source === 'object'), 'no plugin uses a relative path, so the file also works copied to another repo or added by its URL');
ok(mk.plugins.every(p => p.homepage === `${cat.site}#${p.name}`), 'every plugin links to its Skillshelf page');

// The connector catalog knows which listings are in it
const inCat = cat.listings.filter(l => l.plugin).map(l => l.id).sort();
ok(JSON.stringify(inCat) === JSON.stringify([...names].sort()) && cat.listings.filter(l => l.plugin).every(l => l.plugin === `${l.id}@${MARKETPLACE}`), 'the connector catalog marks exactly these listings with their install name');
ok(cat.marketplace?.name === MARKETPLACE && /^[\w.-]+\/[\w.-]+$/.test(cat.marketplace.repo), 'the connector catalog says where the marketplace is');

// The rule, on made-up listings
const base = { id: 'someone-tidy', kind: 'skill', repo: 'someone/skills', path: 'skills/tidy', check: 'No issues found', notes: [], checkedCommit: 'abcdef0', plain: 'x', by: 'someone', jobs: [] };
const full = 'abcdef0' + '1'.repeat(33);
ok(leftOut(base, full) === null, 'a clean skill with a checked commit is in');
ok(leftOut({ ...base, check: '1 thing to know', notes: [{ level: 'note' }] }, full) === null, 'a skill with only things to know is in');
ok(leftOut({ ...base, check: '1 risk to know', notes: [{ level: 'warn' }] }, full) === 'serious risk', 'a skill with a risk is left out');
ok(leftOut({ ...base, check: 'Looks harmful', notes: [{ level: 'bad' }] }, full) === 'serious risk', 'a harmful skill is left out');
ok(leftOut({ ...base, check: 'Flagged' }, full) === 'serious risk' && leftOut({ ...base, check: 'Does more than stated' }, full) === 'serious risk', 'a flagged skill, or one that does more than it says, is left out');
ok(leftOut({ ...base, checkedCommit: null }, full) === 'no checked commit on record', 'a skill with no checked commit is left out');
ok(leftOut(base, 'f'.repeat(40)) === 'full checked commit not on record' && leftOut(base, undefined) === 'full checked commit not on record', 'a commit that does not match the checked one is left out');
ok(leftOut({ ...base, kind: 'mcp' }, full) === 'not a skill', 'connectors and apps are left out');
ok(leftOut({ ...base, path: '' }, full) === 'skill is the whole repo', 'a skill at the repo root is left out (it would bring the whole repo and its own plugin.json)');
const deep = sourceOf(base, full, 'main').source, top = sourceOf({ ...base, path: 'tidy/' }, full).source;
ok(deep.source === 'git-subdir' && deep.url === 'https://github.com/someone/skills.git' && deep.path === 'skills/tidy' && deep.ref === 'main' && deep.sha === full, 'the source is exactly the checked skill folder, at the checked commit');
ok(top.path === 'tidy' && !('ref' in top), 'a folder just under the root works too, and ref is left to the default branch when unknown');

process.exitCode = fails ? 1 : 0;
