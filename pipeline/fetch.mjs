// Fetches real data for the Vetted store: GitHub repo metadata, SKILL.md files,
// OpenSSF Scorecard results, Hacker News discussions, README install commands, owner avatars.
// Responses are cached in ./cache so re-runs don't spend GitHub's 60/hour unauthenticated limit.
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.argv[2];
const CACHE = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), 'cache');
fs.mkdirSync(CACHE, { recursive: true });
const UA = { 'User-Agent': 'vetted-prototype-builder', Accept: 'application/vnd.github+json' };

async function get(url, { json = true, binary = false } = {}) {
  const key = path.join(CACHE, url.replace(/[^a-z0-9]+/gi, '_').slice(0, 180) + (binary ? '.bin' : '.txt'));
  if (fs.existsSync(key)) {
    const buf = fs.readFileSync(key);
    if (buf.length === 0) return null;
    return binary ? buf : json ? JSON.parse(buf.toString()) : buf.toString();
  }
  let res;
  try { res = await fetch(url, { headers: UA }); } catch (e) { console.error('ERR', url, e.message); return null; }
  if (res.status === 403 || res.status === 429) { console.error('RATE', url, res.status); return null; }
  if (!res.ok) { console.error('MISS', res.status, url); fs.writeFileSync(key, ''); return null; }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(key, buf);
  return binary ? buf : json ? JSON.parse(buf.toString()) : buf.toString();
}

const SKILL_REPOS = [
  { repo: 'anthropics/skills', max: 40 },
  { repo: 'openai/skills', max: 40 },
  { repo: 'NVIDIA/skills', max: 24, nvidia: true },
  { repo: 'obra/superpowers', max: 20 },
  { repo: 'huggingface/skills', max: 12 },
  { repo: 'vercel-labs/agent-skills', max: 12 },
  // Community: individual developers
  { repo: 'addyosmani/agent-skills', max: 8 },
  { repo: 'blader/humanizer', max: 3 },
  { repo: 'pbakaus/impeccable', max: 6 },
  { repo: 'coreyhaines31/marketingskills', max: 8 },
  { repo: 'OthmanAdi/planning-with-files', max: 3 },
  { repo: 'Jeffallan/claude-skills', max: 8 },
  { repo: 'cathrynlavery/diagram-design', max: 3 },
  { repo: 'ayghri/i-have-adhd', max: 3 },
  { repo: 'Weizhena/Deep-Research-skills', max: 4 },
  { repo: 'LukasNiessen/terrashark', max: 3 },
  { repo: 'thedotmack/claude-mem', max: 4 },
];
const MCP = [
  { repo: 'modelcontextprotocol/servers', sub: ['everything', 'fetch', 'filesystem', 'git', 'memory', 'sequentialthinking', 'time'] },
  { repo: 'github/github-mcp-server' },
  { repo: 'microsoft/playwright-mcp' },
  { repo: 'upstash/context7' },
  { repo: 'ChromeDevTools/chrome-devtools-mcp' },
  // Community: individual developers
  { repo: 'czlonkowski/n8n-mcp' },
  { repo: 'ahujasid/mcp-for-blender' },
  { repo: '54yyyu/zotero-mcp' },
  { repo: 'haris-musa/excel-mcp-server' },
  { repo: 'blazickjp/arxiv-mcp-server' },
  { repo: 'zcaceres/markdownify-mcp' },
  { repo: 'ihor-sokoliuk/mcp-searxng' },
  { repo: 'DeusData/codebase-memory-mcp' },
];
const TOOLS = ['NVIDIA/SkillSpector', 'vercel-labs/skills', 'BurntSushi/ripgrep', 'sharkdp/fd', 'junegunn/fzf', 'jqlang/jq', 'cli/cli', 'astral-sh/uv',
  'sharkdp/bat', 'jesseduffield/lazygit', 'ollama/ollama', 'aquasecurity/trivy', 'semgrep/semgrep', 'gitleaks/gitleaks',
  // Community: individual developers
  'ajeetdsouza/zoxide', 'aristocratos/btop', 'dandavison/delta', 'bootandy/dust', 'sharkdp/hyperfine', 'casey/just', 'sxyazi/yazi',
  'extrawurst/gitui', 'jdx/mise', 'jesseduffield/lazydocker', 'XAMPPRocky/tokei'];

const meta = {}, scores = {}, hn = {}, avatars = {};
async function repoMeta(repo) {
  if (meta[repo] !== undefined) return meta[repo];
  const m = await get(`https://api.github.com/repos/${repo}`);
  meta[repo] = m && { full: m.full_name, desc: m.description, stars: m.stargazers_count, forks: m.forks_count, issues: m.open_issues_count,
    license: m.license?.spdx_id && m.license.spdx_id !== 'NOASSERTION' ? m.license.spdx_id : (m.license?.name || null), pushed: m.pushed_at, created: m.created_at,
    archived: m.archived, topics: m.topics || [], branch: m.default_branch, owner: m.owner.login, ownerType: m.owner.type, homepage: m.homepage || null, language: m.language };
  if (m) {
    const sc = await get(`https://api.securityscorecards.dev/projects/github.com/${m.full_name}`);
    scores[repo] = sc && { score: sc.score, date: sc.date, checks: (sc.checks || []).map(c => ({ name: c.name, score: c.score, reason: c.reason })) };
    const h = await get(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent('github.com/' + m.full_name)}&restrictSearchableAttributes=url&tags=story&hitsPerPage=20`);
    hn[repo] = (h?.hits || []).filter(x => (x.points || 0) >= 5).sort((a, b) => b.points - a.points).slice(0, 4)
      .map(x => ({ id: x.objectID, title: x.title, url: x.url, points: x.points, comments: x.num_comments || 0, date: x.created_at?.slice(0, 10) }));
    if (!avatars[m.owner.login]) {
      const img = await get(`https://github.com/${m.owner.login}.png?size=96`, { binary: true });
      if (img) avatars[m.owner.login] = 'data:image/png;base64,' + img.toString('base64');
    }
  }
  return meta[repo];
}

function frontmatter(md) {
  const m = md.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const out = {};
  let cur = null;
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-zA-Z_-]+):\s*(.*)$/);
    if (kv) { cur = kv[1]; out[cur] = kv[2].replace(/^["']|["']$/g, '').replace(/^[>|]-?\s*$/, ''); }
    else if (cur && /^\s+\S/.test(line)) out[cur] = (out[cur] + ' ' + line.trim()).trim();
  }
  return out;
}
const titleCase = s => s.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace(/\bMcp\b/g, 'MCP').replace(/\bPdf\b/g, 'PDF').replace(/\bApi\b/g, 'API').replace(/\bDocx\b/g, 'DOCX').replace(/\bPptx\b/g, 'PPTX').replace(/\bXlsx\b/g, 'XLSX').replace(/\bGh\b/g, 'GH').replace(/\bCi\b/g, 'CI');

// Pull candidate install lines straight out of a README so every command shown is one the project documents.
function installLines(readme, patterns) {
  const lines = (readme || '').split(/\r?\n/).map(l => l.trim().replace(/^\$\s+/, '').replace(/^>\s*/, ''));
  const out = {};
  for (const [k, re] of Object.entries(patterns)) {
    const hit = lines.find(l => re.test(l) && l.length < 200 && !l.startsWith('#') && !l.startsWith('|'));
    if (hit) out[k] = hit.replace(/^`|`$/g, '');
  }
  return out;
}

const listings = [];

for (const { repo, max, nvidia } of SKILL_REPOS) {
  const m = await repoMeta(repo);
  if (!m) continue;
  const tree = await get(`https://api.github.com/repos/${m.full}/git/trees/${m.branch}?recursive=1`);
  const readme = await get(`https://raw.githubusercontent.com/${m.full}/${m.branch}/README.md`, { json: false });
  const files = (tree?.tree || []).filter(t => t.type === 'blob' && /(^|\/)SKILL\.md$/.test(t.path)).map(t => t.path)
    .filter(p => !/(^|\/)(test|tests|fixtures|examples?|template)s?\//i.test(p) || repo === 'anthropics/skills');
  let n = 0;
  for (const p of files) {
    if (n >= max) break;
    const md = await get(`https://raw.githubusercontent.com/${m.full}/${m.branch}/${p}`, { json: false });
    if (!md) continue;
    const fm = frontmatter(md);
    const folder = p.replace(/\/?SKILL\.md$/, '');
    const slug = fm.name || folder.split('/').pop();
    if (!slug || !fm.description) continue;
    n++;
    listings.push({ id: `${m.full}/${folder}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'), kind: 'skill', name: titleCase(slug), slug, desc: fm.description,
      repo: m.full, path: folder, url: `https://github.com/${m.full}/tree/${m.branch}/${folder}`, nvidia: !!nvidia,
      license: fm.license || null, readmeInstall: installLines(readme, { plugin: /^\/plugin (marketplace add|install)\b/, skillsCli: /^npx skills(@latest)? add\b/ }),
      lines: md.split('\n').length });
  }
  console.error(repo, 'skills:', n, 'of', files.length);
}

for (const { repo, sub } of MCP) {
  const m = await repoMeta(repo);
  if (!m) continue;
  const targets = sub ? sub.map(s => ({ s, readmePath: `src/${s}/README.md` })) : [{ s: null, readmePath: 'README.md' }];
  for (const { s, readmePath } of targets) {
    const readme = await get(`https://raw.githubusercontent.com/${m.full}/${m.branch}/${readmePath}`, { json: false });
    if (!readme) continue;
    const firstPara = readme.split(/\r?\n\r?\n/).map(x => x.trim()).find(x => x && !x.startsWith('#') && !x.startsWith('[') && !x.startsWith('<') && !x.startsWith('!') && x.length > 40);
    const inst = installLines(readme, {
      claude: /^claude mcp add\b/, codex: /^codex mcp add\b/, npx: /^"?npx -y @?[\w./-]+/, uvx: /^uvx [\w.-]+/,
    });
    const npxPkg = (readme.match(/"(@modelcontextprotocol\/server-[\w-]+)"/) || readme.match(/npx -y (@[\w./-]+|[\w-]+mcp[\w-]*)/) || [])[1] || null;
    const uvxPkg = (readme.match(/"args":\s*\[\s*"(mcp-server-[\w-]+)"/) || readme.match(/uvx (mcp-server-[\w-]+)/) || [])[1] || null;
    listings.push({ id: (m.full + (s ? '-' + s : '')).toLowerCase().replace(/[^a-z0-9]+/g, '-'), kind: 'mcp', name: s ? titleCase(s) : titleCase(m.full.split('/')[1]),
      slug: s || m.full.split('/')[1], desc: (s ? firstPara : m.desc || firstPara || '').replace(/\s+/g, ' ').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_`]/g, '').slice(0, 400),
      repo: m.full, path: s ? `src/${s}` : '', url: s ? `https://github.com/${m.full}/tree/${m.branch}/src/${s}` : `https://github.com/${m.full}`,
      install: inst, npxPkg, uvxPkg });
  }
}

for (const repo of TOOLS) {
  const m = await repoMeta(repo);
  if (!m) continue;
  const readme = await get(`https://raw.githubusercontent.com/${m.full}/${m.branch}/README.md`, { json: false });
  const inst = installLines(readme, {
    brew: /^brew install\b/, winget: /^winget install\b/, scoop: /^scoop install\b/, cargo: /^cargo install\b/, npm: /^npm (install|i) -g\b/, npx: /^npx [\w@/.-]+/,
    pip: /^pip3? install\b/, pipx: /^pipx install\b/, uvTool: /^uv tool install\b/, curl: /^curl -[a-zA-Z]+ https:\/\/\S+ \| (sh|bash)/, ps: /^(powershell .*)?irm https:\/\/\S+ \| iex/, go: /^go install\b/,
  });
  listings.push({ id: m.full.toLowerCase().replace(/[^a-z0-9]+/g, '-'), kind: 'tool', name: titleCase(m.full.split('/')[1]), slug: m.full.split('/')[1], desc: m.desc || '',
    repo: m.full, path: '', url: `https://github.com/${m.full}`, install: inst });
}

const data = { generated: new Date().toISOString(), listings, repos: meta, scores, hn, avatars };
fs.writeFileSync(OUT, JSON.stringify(data));
console.error('listings', listings.length, 'repos', Object.keys(meta).length, 'avatars', Object.keys(avatars).length, 'bytes', fs.statSync(OUT).size);
