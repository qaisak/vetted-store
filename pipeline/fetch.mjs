// Fetches real data for the Vetted store: GitHub repo metadata, SKILL.md files,
// OpenSSF Scorecard results, Hacker News discussions, README install commands, owner avatars.
// Responses are cached in ./cache so re-runs don't spend GitHub's 60/hour unauthenticated limit.
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.argv[2];
// --only owner/repo,owner/repo: fetch just those repos and merge them into the existing OUT file,
// keeping every other listing (and its Scorecard and Hacker News data) exactly as it was.
const onlyArg = process.argv.indexOf('--only');
const ONLY = onlyArg > 0 ? new Set(process.argv[onlyArg + 1].split(',').map(s => s.trim().toLowerCase())) : null;
const want = repo => !ONLY || ONLY.has(repo.toLowerCase());
const CACHE = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), 'cache');
fs.mkdirSync(CACHE, { recursive: true });
const UA = { 'User-Agent': 'vetted-prototype-builder', Accept: 'application/vnd.github+json' };
// GITHUB_TOKEN (optional, from the environment, never stored) lifts GitHub's 60-calls-an-hour limit. Sent to api.github.com only.
const headersFor = url => process.env.GITHUB_TOKEN && url.startsWith('https://api.github.com/') ? { ...UA, Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : UA;

async function get(url, { json = true, binary = false } = {}) {
  const key = path.join(CACHE, url.replace(/[^a-z0-9]+/gi, '_').slice(0, 180) + (binary ? '.bin' : '.txt'));
  if (fs.existsSync(key)) {
    const buf = fs.readFileSync(key);
    if (buf.length === 0) return null;
    return binary ? buf : json ? JSON.parse(buf.toString()) : buf.toString();
  }
  let res;
  get.failed = false;   // true when the host couldn't be reached or refused: "not checked", as opposed to "nothing there"
  try { res = await fetch(url, { headers: headersFor(url) }); } catch (e) { console.error('ERR', url, e.message); get.failed = true; return null; }
  if (res.status === 403 || res.status === 429) { console.error('RATE', url, res.status); get.failed = true; return null; }
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
  // Added November 1, 2026: `pick` lists the skill folders to list, in order
  { repo: 'kepano/obsidian-skills', pick: ['skills/obsidian-markdown', 'skills/obsidian-bases', 'skills/json-canvas', 'skills/obsidian-cli', 'skills/defuddle'] },
  { repo: 'zarazhangrui/frontend-slides', pick: ['plugins/frontend-slides/skills/frontend-slides'] },
  { repo: 'alirezarezvani/claude-skills', pick: ['productivity/meetings/skills/meetings', 'productivity/email/skills/inbox-triage', 'productivity/weekly-review/skills/weekly-review',
    'marketing-skill/skills/copywriting', 'marketing-skill/skills/seo-audit', 'marketing-skill/skills/social-media-manager', 'marketing-skill/skills/cold-email',
    'marketing-skill/skills/email-sequence', 'marketing-skill/skills/launch-strategy', 'business-operations/skills/process-mapper'] },
  { repo: 'muratcankoylan/Agent-Skills-for-Context-Engineering', pick: ['skills/context-fundamentals', 'skills/context-compression', 'skills/multi-agent-patterns', 'skills/memory-systems', 'skills/evaluation'] },
  { repo: 'czlonkowski/n8n-skills', pick: ['skills/n8n-workflow-patterns', 'skills/n8n-expression-syntax', 'skills/n8n-error-handling', 'skills/n8n-node-configuration'] },
  { repo: 'SawyerHood/dev-browser', pick: ['skills/dev-browser'] },
  { repo: 'lackeyjb/playwright-skill', pick: ['skills/playwright-skill'] },
  { repo: 'wshobson/agents', pick: ['plugins/startup-business-analyst/skills/startup-financial-modeling', 'plugins/startup-business-analyst/skills/market-sizing-analysis',
    'plugins/startup-business-analyst/skills/competitive-landscape', 'plugins/business-analytics/skills/data-storytelling', 'plugins/business-analytics/skills/kpi-dashboard-design',
    'plugins/hr-legal-compliance/skills/gdpr-data-handling', 'plugins/hr-legal-compliance/skills/employment-contract-templates', 'plugins/accessibility-compliance/skills/wcag-audit-patterns',
    'plugins/incident-response/skills/postmortem-writing', 'plugins/avoid-ai-writing/skills/avoid-ai-writing', 'plugins/before-you-build/skills/before-you-build',
    'plugins/payment-processing/skills/stripe-integration', 'plugins/developer-essentials/skills/sql-optimization-patterns', 'plugins/security-scanning/skills/stride-analysis-patterns',
    'plugins/ui-design/skills/visual-design-foundations'] },
  // Trending, added November 1, 2026
  { repo: 'wheresryan22/anatomy', pick: [''] },
  { repo: 'lemomo-ai/lemo-opuscar', pick: ['plugin/skills/lemo-opuscar'] },
  { repo: 'aicodeking/leanrea', pick: ['leanrea'] },
  // GitHub's monthly trending list, November 1, 2026
  { repo: 'Nutlope/hallmark', pick: ['skills/hallmark'] },
  { repo: 'Leonxlnx/taste-skill', pick: ['skills/taste-skill'] },
  { repo: 'AgriciDaniel/claude-seo', pick: ['skills/seo', 'skills/seo-audit', 'skills/seo-local'] },
  { repo: 'earthtojake/text-to-cad', pick: ['skills/cad'] },
  { repo: 'cloudflare/security-audit-skill', pick: ['skills/security-audit'] },
  { repo: 'heygen-com/hyperframes', pick: ['skills/hyperframes'] },
  // Filling thin job categories, November 1, 2026: security skills from Trail of Bits, business skills from Anthropic's knowledge-work plugins
  { repo: 'trailofbits/skills', pick: ['plugins/sharp-edges/skills/sharp-edges', 'plugins/differential-review/skills/differential-review',
    'plugins/supply-chain-risk-auditor/skills/supply-chain-risk-auditor', 'plugins/agentic-actions-auditor/skills/agentic-actions-auditor', 'plugins/variant-analysis/skills/variant-analysis'] },
  { repo: 'anthropics/knowledge-work-plugins', pick: ['small-business/skills/invoice-chase', 'small-business/skills/cash-flow-snapshot', 'small-business/skills/tax-season-organizer',
    'small-business/skills/proposal-builder', 'small-business/skills/review-reputation', 'small-business/skills/job-post-builder', 'small-business/skills/contract-review', 'legal/skills/triage-nda'] },
  // Everyday & home had no skills, November 7, 2026: job hunting, money, travel, cooking, health, smart home and family
  { repo: 'Paramchoudhary/ResumeSkills', pick: ['skills/resume-tailor', 'skills/cover-letter-generator', 'skills/interview-prep-generator', 'skills/salary-negotiation-prep', 'skills/offer-comparison-analyzer'] },
  { repo: 'zubair-trabzada/ai-finance-claude', pick: ['skills/finance-debt', 'skills/finance-goals'] },
  { repo: 'komal-SkyNET/claude-skill-homeassistant', pick: ['skills/home-assistant-manager'] },
  { repo: 'tonylofgren/aurora-smart-home', pick: ['home-assistant'] },
  { repo: 'ericporres/family-assistant-skill', pick: [''] },
  { repo: 'cooklang/cooklang-skills', pick: ['skills/recipe-import', 'skills/meal-planning', 'skills/shopping-list'] },
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
  { repo: 'GLips/Figma-Context-MCP' },
  { repo: 'mrexodia/ida-pro-mcp' },
  { repo: 'hangwin/mcp-chrome' },
  { repo: 'wonderwhy-er/DesktopCommanderMCP' },
  { repo: 'taylorwilsdon/google_workspace_mcp' },
  { repo: 'korotovsky/slack-mcp-server' },
  { repo: 'nickclyde/duckduckgo-mcp-server' },
  { repo: 'nspady/google-calendar-mcp' },
  { repo: 'MarkusPfundstein/mcp-obsidian' },
  { repo: 'Jpisnice/shadcn-ui-mcp-server' },
  { repo: 'suekou/mcp-notion-server' },
  { repo: 'kimtaeyoon83/mcp-server-youtube-transcript' },
  { repo: 'vivekVells/mcp-pandoc' },
  { repo: 'Pimzino/spec-workflow-mcp' },
  { repo: 'jae-jae/fetcher-mcp' },
  { repo: 'lharries/whatsapp-mcp' },
  { repo: 'chigwell/telegram-mcp' },
  { repo: 'domdomegg/airtable-mcp-server' },
  { repo: 'marcelmarais/spotify-mcp-server' },
  { repo: 'morluto/rea' },
  { repo: 'mksglu/context-mode' },
];
const TOOLS = ['NVIDIA/SkillSpector', 'vercel-labs/skills', 'BurntSushi/ripgrep', 'sharkdp/fd', 'junegunn/fzf', 'jqlang/jq', 'cli/cli', 'astral-sh/uv',
  'sharkdp/bat', 'jesseduffield/lazygit', 'ollama/ollama', 'aquasecurity/trivy', 'semgrep/semgrep', 'gitleaks/gitleaks',
  // Community: individual developers
  'ajeetdsouza/zoxide', 'aristocratos/btop', 'dandavison/delta', 'bootandy/dust', 'sharkdp/hyperfine', 'casey/just', 'sxyazi/yazi',
  'extrawurst/gitui', 'jdx/mise', 'jesseduffield/lazydocker', 'XAMPPRocky/tokei',
  'yt-dlp/yt-dlp', 'Wilfred/difftastic', 'muesli/duf', 'ClementTsang/bottom', 'ducaale/xh', 'chmln/sd',
  'schollz/croc', 'FiloSottile/age', 'saulpw/visidata', 'derailed/k9s', 'nicolargo/glances', 'yorukot/superfile', 'darrenburns/posting', 'tconbeer/harlequin', 'denisidoro/navi',
  // Trending, added November 1, 2026
  'Gathin23/cleanyourtv', 'storytold/photocraft', 'storytold/pdfcraft', 'KnifeLemon/Filee', 'robbietilton/Compositor', 'jub0t/Concat', 'crmne/spotifast',
  // GitHub's monthly trending list, November 1, 2026
  'debpalash/VoiceStudio', 'storytold/lightcraft',
  // Local AI and free everyday apps people look for most (GitHub stars, Hacker News, Reddit and app round-ups, November 22, 2026)
  'janhq/jan', 'ggml-org/llama.cpp', 'open-webui/open-webui', 'Comfy-Org/ComfyUI', 'cjpais/Handy', 'Zackriya-Solutions/meetily', 'Mintplex-Labs/anything-llm',
  'Stirling-Tools/Stirling-PDF', 'AppFlowy-IO/AppFlowy', 'actualbudget/actual', 'penpot/penpot', 'immich-app/immich', 'obsproject/obs-studio', 'excalidraw/excalidraw',
  // Filling thin job categories (everyday and security), November 1, 2026
  'localsend/localsend', 'upscayl/upscayl', 'qarmin/czkawka', 'flameshot-org/flameshot', 'keepassxreboot/keepassxc', 'syncthing/syncthing', 'trufflesecurity/trufflehog',
  'gorhill/uBlock', 'pi-hole/pi-hole', 'rustdesk/rustdesk'];

const meta = {}, scores = {}, hn = {}, avatars = {};
async function repoMeta(repo) {
  if (meta[repo] !== undefined) return meta[repo];
  // The search API returns the same repository object; it's the fallback where /repos/ isn't reachable.
  const search = async () => {
    let r = await get(`https://api.github.com/search/repositories?q=repo:${repo}`);
    if (!r && get.failed) { console.error('waiting out the search rate limit'); await new Promise(res => setTimeout(res, 61000)); r = await get(`https://api.github.com/search/repositories?q=repo:${repo}`); }
    if (!r && get.failed) console.error('FAILED (rate limit)', repo);
    return r?.items?.find(i => i.full_name.toLowerCase() === repo.toLowerCase());
  };
  const m = await get(`https://api.github.com/repos/${repo}`) || await search();
  meta[repo] = m && { full: m.full_name, desc: m.description, stars: m.stargazers_count, forks: m.forks_count, issues: m.open_issues_count,
    license: m.license?.spdx_id && m.license.spdx_id !== 'NOASSERTION' ? m.license.spdx_id : (m.license?.name || null), pushed: m.pushed_at, created: m.created_at,
    archived: m.archived, topics: m.topics || [], branch: m.default_branch, owner: m.owner.login, ownerType: m.owner.type, homepage: m.homepage || null, language: m.language,
    fetched: new Date().toISOString().slice(0, 10) };
  if (m) {
    const sc = await get(`https://api.securityscorecards.dev/projects/github.com/${m.full_name}`);
    scores[repo] = !sc && get.failed ? 'unchecked' : sc && { score: sc.score, date: sc.date, checks: (sc.checks || []).map(c => ({ name: c.name, score: c.score, reason: c.reason })) };
    const h = await get(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent('github.com/' + m.full_name)}&restrictSearchableAttributes=url&tags=story&hitsPerPage=20`);
    if (!h && get.failed) hn[repo] = 'unchecked';
    else hn[repo] = (h?.hits || []).filter(x => (x.points || 0) >= 5).sort((a, b) => b.points - a.points).slice(0, 4)
      .map(x => ({ id: x.objectID, title: x.title, url: x.url, points: x.points, comments: x.num_comments || 0, date: x.created_at?.slice(0, 10) }));
    if (!avatars[m.owner.login]) {
      const img = await get(`https://github.com/${m.owner.login}.png?size=96`, { binary: true })
        || await get(`${m.owner.avatar_url}${m.owner.avatar_url.includes('?') ? '&' : '?'}s=96`, { binary: true });
      if (img) avatars[m.owner.login] = `data:image/${img[0] === 0xFF ? 'jpeg' : 'png'};base64,` + img.toString('base64');
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

// Where the git tree API isn't reachable, list SKILL.md files from a local clone: VETTED_SRC=<scan-root>
function localSkillFiles(m) {
  const base = process.env.VETTED_SRC && path.join(process.env.VETTED_SRC, 'src', m.full.replace('/', '__'), `${m.full.split('/')[1]}-${m.branch}`);
  if (!base || !fs.existsSync(base)) return [];
  const out = [];
  const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.name === '.git' || e.name === 'node_modules') continue;
    const f = path.join(d, e.name); if (e.isDirectory()) walk(f); else if (e.name === 'SKILL.md') out.push(path.relative(base, f).split(path.sep).join('/')); } };
  walk(base);
  return out.sort();
}
for (const { repo, max = 99, nvidia, pick } of SKILL_REPOS) {
  if (!want(repo)) continue;
  const m = await repoMeta(repo);
  if (!m) continue;
  const tree = await get(`https://api.github.com/repos/${m.full}/git/trees/${m.branch}?recursive=1`);
  const readme = await get(`https://raw.githubusercontent.com/${m.full}/${m.branch}/README.md`, { json: false });
  const all = tree ? tree.tree.filter(t => t.type === 'blob' && /(^|\/)SKILL\.md$/.test(t.path)).map(t => t.path) : localSkillFiles(m);
  const files = pick ? pick.map(p => p ? `${p}/SKILL.md` : 'SKILL.md').filter(p => all.includes(p))
    : all.filter(p => !/(^|\/)(test|tests|fixtures|examples?|template)s?\//i.test(p) || repo === 'anthropics/skills');
  if (pick && files.length < pick.length) console.error('MISSING PICKS', repo, pick.filter(p => !all.includes(p ? `${p}/SKILL.md` : 'SKILL.md')));
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
  if (!want(repo)) continue;
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
  if (!want(repo)) continue;
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

let data = { generated: new Date().toISOString(), listings, repos: meta, scores, hn, avatars };
if (ONLY) {
  const old = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  const fresh = new Set(listings.map(l => l.repo.toLowerCase()));
  // Keep the configured order: each repo's listings sit where that repo appears in the lists above.
  // Renamed repos are listed under their new name, so map each listing back to the name it was configured under.
  const order = [...SKILL_REPOS.map(x => x.repo), ...MCP.map(x => x.repo), ...TOOLS].map(r => r.toLowerCase());
  const asConfigured = Object.fromEntries(Object.entries({ ...old.repos, ...meta }).filter(([, m]) => m).map(([k, m]) => [m.full.toLowerCase(), k.toLowerCase()]));
  const pos = l => { const r = l.repo.toLowerCase(), i = order.indexOf(asConfigured[r] || r); return i < 0 ? order.length : i; };
  const merged = [...old.listings.filter(l => !fresh.has(l.repo.toLowerCase())), ...listings].map((l, i) => [l, i])
    .sort((a, b) => pos(a[0]) - pos(b[0]) || a[1] - b[1]).map(([l]) => l);
  data = { generated: old.generated, updated: data.generated, listings: merged, repos: { ...old.repos, ...meta }, scores: { ...old.scores, ...scores },
    hn: { ...old.hn, ...hn }, avatars: { ...old.avatars, ...avatars } };
}
fs.writeFileSync(OUT, JSON.stringify(data));
console.error('listings', listings.length, 'repos', Object.keys(meta).length, 'avatars', Object.keys(avatars).length, 'bytes', fs.statSync(OUT).size);
