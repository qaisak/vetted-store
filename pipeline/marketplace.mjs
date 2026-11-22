// The Skillshelf plugin marketplace (.claude-plugin/marketplace.json at the repo root).
// Claude Code users add it with `/plugin marketplace add <repo>`, Claude app users at Plugins, Add, Add marketplace.
// It lists only skills whose Skillshelf check found no serious risk, each pinned to the exact commit Skillshelf checked,
// and each plugin is just that one skill folder, so nothing unchecked comes along with it.
// Format: code.claude.com/docs/en/plugins/marketplace-reference.md
//
// The build (build.mjs) calls buildMarketplace(). To regenerate on its own from the committed data:
//   node pipeline/marketplace.mjs
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export const MARKETPLACE = 'skillshelf';
// Where the marketplace file lives, as typed into `/plugin marketplace add` or the Claude app
export const MARKETPLACE_REPO = 'qaisak/vetted-store';
export const MARKETPLACE_FILE = '.claude-plugin/marketplace.json';

// Same rule as the connector's badge: any note that isn't a plain 'note' (a 'warn' or 'bad') is a serious risk
const LABEL_OK = new Set(['No issues found']);
const LABEL_NOTES = /^\d+ things? to know$/;
export const isSerious = l => (l.notes || []).some(n => n.level !== 'note') || !(LABEL_OK.has(l.check) || LABEL_NOTES.test(l.check));

// Why a listing is left out, or null when it's in. `full` is the 40-character commit Skillshelf checked.
export function leftOut(l, full) {
  if (l.kind !== 'skill') return 'not a skill';
  if (isSerious(l)) return 'serious risk';
  if (!l.checkedCommit) return 'no checked commit on record';
  if (!full || !/^[0-9a-f]{40}$/.test(full) || !full.startsWith(l.checkedCommit)) return 'full checked commit not on record';
  if (typeof l.path !== 'string') return 'no skill folder';
  // A skill at the repo root can only come with the whole repo (and its own plugin.json), not just the checked folder
  if (!l.path.split('/').filter(Boolean).length) return 'skill is the whole repo';
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(l.id)) return 'id is not a valid plugin name';
  return null;
}

// The plugin's source: exactly the skill folder Skillshelf checked, at the checked commit (a sparse checkout).
// Claude Code loads a plugin folder with SKILL.md at its root, no skills/ folder and no `skills` key as that one skill
// (code.claude.com/docs/en/plugins/manifest-reference.md, Standard layout). Listing `skills` would add to the default
// skills/ scan, so the entry leaves it out and nothing outside the checked folder can come along.
export function sourceOf(l, full, branch) {
  const path = l.path.split('/').filter(Boolean).join('/');
  return { source: { source: 'git-subdir', url: `https://github.com/${l.repo}.git`, path, ...(branch ? { ref: branch } : {}), sha: full } };
}

// listings: the connector catalog's listings. commits: repo -> full commit (data/sources.json). branches: repo -> default branch.
// Skillshelf's own plugin, kept in this repo (plugins/skillshelf): the Skills bar above the chat box in Claude Code,
// with the Skillshelf connector. It comes first in the list; install it with /plugin install skillshelf@skillshelf.
export const BAR_DIR = 'plugins/skillshelf';
export const BAR = {
  name: 'skillshelf',
  description: 'The Skillshelf bar: a Skills bar above the chat box in Claude Code. Switch skills on or off for the session, add any skill after Skillshelf checks it, and ban phrases Claude should never write. Brings the Skillshelf connector with it.',
  author: { name: 'Skillshelf' },
  homepage: 'https://skillshelf.skillshelf.workers.dev/',
  keywords: ['skills', 'safety', 'skill manager'],
  source: `./${BAR_DIR}`,
};

export function buildMarketplace({ listings, site, generated }, commits, branches = {}) {
  const plugins = [], skipped = {};
  for (const l of listings) {
    if (l.id === BAR.name) { skipped['name taken by the Skillshelf bar'] = (skipped['name taken by the Skillshelf bar'] || 0) + 1; continue; }
    const full = commits[l.repo], why = leftOut(l, full);
    if (why) { skipped[why] = (skipped[why] || 0) + 1; continue; }
    const { source } = sourceOf(l, full, branches[l.repo]);
    plugins.push({
      name: l.id,
      description: `${l.plain} Skillshelf check: ${l.check}, at commit ${full.slice(0, 7)}.`,
      author: { name: l.by },
      homepage: `${site}#${l.id}`,
      repository: `https://github.com/${l.repo}`,
      ...(l.jobs?.length ? { keywords: l.jobs } : {}),
      source,
    });
  }
  plugins.sort((a, b) => a.name.localeCompare(b.name));
  return {
    marketplace: {
      $schema: 'https://anthropic.com/claude-code/marketplace.schema.json',
      name: MARKETPLACE,
      description: `The Skillshelf bar for Claude Code, and skills checked by Skillshelf (${site}): each one's code was read, and none of these has a serious risk. Each skill is pinned to the exact commit that was checked. Catalog of ${generated}.`,
      owner: { name: 'Skillshelf' },
      plugins: [BAR, ...plugins],
    },
    skipped,
  };
}

// The plugin name a listing installs as, for the connector catalog (null when it isn't in the marketplace)
export const installName = (marketplace, id) => id !== BAR.name && marketplace.plugins.some(p => p.name === id) ? `${id}@${MARKETPLACE}` : null;

// Full commits by repo, from data/sources.json (its first key is a note, not a repo)
export const commitsFrom = sources => Object.fromEntries(Object.entries(sources).filter(([, v]) => v && typeof v === 'object' && v.commit).map(([k, v]) => [k, v.commit]));
export const branchesFrom = data => Object.fromEntries(Object.entries(data.repos || {}).filter(([, r]) => r?.branch).map(([k, r]) => [k, r.branch]));

export function writeMarketplace(marketplace, root = new URL('../', import.meta.url)) {
  const out = new URL(MARKETPLACE_FILE, root);
  fs.mkdirSync(new URL('./', out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(marketplace, null, 2) + '\n');
  return fileURLToPath(out);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const read = p => JSON.parse(fs.readFileSync(new URL(p, import.meta.url), 'utf8'));
  const { marketplace, skipped } = buildMarketplace(read('../connector/src/catalog.json'), commitsFrom(read('../data/sources.json')), branchesFrom(read('../data/data.json')));
  console.error('marketplace:', marketplace.plugins.length, 'skills, written to', writeMarketplace(marketplace), 'left out:', JSON.stringify(skipped));
}
