// Turns data.json (from fetch.mjs) into the compact DATA object embedded in the store page.
// Usage: node build.mjs data.json template.html out.html
import fs from 'node:fs';

const [, , dataPath, tplPath, outPath] = process.argv;
const d = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

let marketplace = null;
try { marketplace = await (await fetch('https://raw.githubusercontent.com/anthropics/skills/main/.claude-plugin/marketplace.json')).json(); } catch (e) {}
const anthPlugin = {};
for (const p of marketplace?.plugins || []) for (const s of p.skills || []) anthPlugin[s.replace(/^\.\//, '').replace(/\/$/, '')] = p.name;

const OWNER = { anthropics: 'Anthropic', openai: 'OpenAI', NVIDIA: 'NVIDIA', huggingface: 'Hugging Face', 'vercel-labs': 'Vercel Labs', modelcontextprotocol: 'Model Context Protocol',
  github: 'GitHub', microsoft: 'Microsoft', upstash: 'Upstash', ChromeDevTools: 'Chrome DevTools', jqlang: 'jq', cli: 'GitHub', 'astral-sh': 'Astral', ollama: 'Ollama',
  aquasecurity: 'Aqua Security', semgrep: 'Semgrep', gitleaks: 'Gitleaks' };
const NAME = { 'cli/cli': 'GitHub CLI', 'vercel-labs/skills': 'skills CLI', 'astral-sh/uv': 'uv', 'jqlang/jq': 'jq', 'sharkdp/fd': 'fd', 'sharkdp/bat': 'bat', 'junegunn/fzf': 'fzf',
  'BurntSushi/ripgrep': 'ripgrep', 'jesseduffield/lazygit': 'lazygit', 'ollama/ollama': 'Ollama', 'aquasecurity/trivy': 'Trivy', 'semgrep/semgrep': 'Semgrep', 'gitleaks/gitleaks': 'Gitleaks',
  'NVIDIA/SkillSpector': 'SkillSpector', 'github/github-mcp-server': 'GitHub MCP Server', 'microsoft/playwright-mcp': 'Playwright MCP', 'upstash/context7': 'Context7',
  'ChromeDevTools/chrome-devtools-mcp': 'Chrome DevTools MCP',
  'czlonkowski/n8n-mcp': 'n8n MCP', 'ahujasid/mcp-for-blender': 'Blender MCP', '54yyyu/zotero-mcp': 'Zotero MCP', 'haris-musa/excel-mcp-server': 'Excel MCP Server',
  'blazickjp/arxiv-mcp-server': 'arXiv MCP Server', 'zcaceres/markdownify-mcp': 'Markdownify MCP', 'ihor-sokoliuk/mcp-searxng': 'SearXNG MCP', 'DeusData/codebase-memory-mcp': 'Codebase Memory MCP',
  'ajeetdsouza/zoxide': 'zoxide', 'aristocratos/btop': 'btop', 'dandavison/delta': 'delta', 'bootandy/dust': 'dust', 'sharkdp/hyperfine': 'hyperfine', 'casey/just': 'just',
  'sxyazi/yazi': 'Yazi', 'gitui-org/gitui': 'gitui', 'jdx/mise': 'mise', 'jesseduffield/lazydocker': 'lazydocker', 'XAMPPRocky/tokei': 'tokei',
  'GLips/Figma-Context-MCP': 'Framelink MCP for Figma', 'mrexodia/ida-pro-mcp': 'IDA Pro MCP', 'hangwin/mcp-chrome': 'Chrome MCP Server', 'wonderwhy-er/DesktopCommanderMCP': 'Desktop Commander',
  'taylorwilsdon/google_workspace_mcp': 'Google Workspace MCP', 'korotovsky/slack-mcp-server': 'Slack MCP Server', 'nickclyde/duckduckgo-mcp-server': 'DuckDuckGo MCP Server',
  'nspady/google-calendar-mcp': 'Google Calendar MCP' };
// Hand-written plain-language lines, job tags and setup level (pipeline/plain.json)
const SOURCES = JSON.parse(fs.readFileSync(new URL('../data/sources.json', import.meta.url), 'utf8'));
const PLAIN = JSON.parse(fs.readFileSync(new URL('./plain.json', import.meta.url), 'utf8'));
// Install steps for MCP servers whose README gives a JSON config or several steps instead of one command.
// Every command is the README's own, or its JSON config written as the equivalent `claude mcp add`.
const MCP_INSTALL = {
  'GLips/Figma-Context-MCP': [
    { to: 'Claude Code', how: 'CLI', cmds: ['claude mcp add figma -- npx -y figma-developer-mcp --figma-api-key=YOUR-KEY --stdio'], note: 'Run in your terminal. Replace YOUR-KEY with a Figma personal access token. Same settings as the README\'s config.' },
    { to: 'Codex', how: 'CLI', cmds: ['codex mcp add figma -- npx -y figma-developer-mcp --figma-api-key=YOUR-KEY --stdio'], note: 'Run in your terminal. Replace YOUR-KEY with a Figma personal access token.' }],
  'mrexodia/ida-pro-mcp': [
    { to: 'Claude Code', how: 'Plugin', cmds: ['claude plugin marketplace add mrexodia/claude-marketplace', 'claude plugin install ida-pro-mcp@mrexodia'], note: 'Run in your terminal. Needs IDA Pro 8.3 or newer with idalib activated, and uv.' },
    { to: 'Codex', how: 'Plugin', cmds: ['codex plugin marketplace add mrexodia/codex-marketplace', 'codex plugin add ida-pro-mcp@mrexodia'], note: 'Run in your terminal. Same requirements.' }],
  'hangwin/mcp-chrome': [
    { to: 'Chrome', how: 'Extension + bridge', cmds: ['npm install -g mcp-chrome-bridge'], note: 'Then download the extension from the project\'s GitHub releases, load it at chrome://extensions with Developer mode on, and click Connect in it.' },
    { to: 'Claude Code', how: 'CLI', cmds: ['claude mcp add --transport http chrome-mcp-server http://127.0.0.1:12306/mcp'], note: 'Connects to the extension\'s local server once it\'s running. Same address as the README\'s config.' }],
  'wonderwhy-er/DesktopCommanderMCP': [
    { to: 'Claude Code', how: 'CLI', cmds: ['claude mcp add --scope user desktop-commander -- npx -y @wonderwhy-er/desktop-commander@latest'], note: 'Run in your terminal.' },
    { to: 'Codex', how: 'CLI', cmds: ['codex mcp add desktop-commander -- npx -y @wonderwhy-er/desktop-commander@latest'], note: 'Run in your terminal.' },
    { to: 'Claude Desktop', how: 'Setup command', cmds: ['npx @wonderwhy-er/desktop-commander@latest setup'], note: 'Run in your terminal, then restart Claude.' }],
  'taylorwilsdon/google_workspace_mcp': [
    { to: 'Claude Code', how: 'Local server', cmds: ['uvx workspace-mcp --transport streamable-http --tool-tier core', 'claude mcp add --transport http workspace-mcp http://localhost:8000/mcp'], note: 'First create a Google OAuth client and set its ID and secret as the README explains. Start the server, then connect Claude Code.' }],
  'korotovsky/slack-mcp-server': [
    { to: 'Claude Code', how: 'CLI', cmds: ['claude mcp add slack -e SLACK_MCP_XOXP_TOKEN=xoxp-... -- npx -y slack-mcp-server@latest --transport stdio'], note: 'Replace xoxp-... with a Slack user OAuth token, the safer option its docs describe. Same settings as its config example.' }],
  'nickclyde/duckduckgo-mcp-server': [
    { to: 'Claude Code', how: 'CLI', cmds: ['claude mcp add ddg-search -- uvx duckduckgo-mcp-server'], note: 'Run in your terminal. No API key needed.' },
    { to: 'Codex', how: 'CLI', cmds: ['codex mcp add ddg-search -- uvx duckduckgo-mcp-server'], note: 'Run in your terminal.' }],
  'nspady/google-calendar-mcp': [
    { to: 'Claude Code', how: 'CLI', cmds: ['claude mcp add google-calendar -e GOOGLE_OAUTH_CREDENTIALS=/path/to/gcp-oauth.keys.json -- npx -y @cocal/google-calendar-mcp'], note: 'First create a Google Cloud OAuth client (Desktop app) and download its keys file, as the README explains. Then ask your assistant to authenticate.' }],
};
// Companies whose own repositories are listed as "Trusted publisher" (no scan up front)
const TRUSTED = new Set(['anthropics', 'openai', 'NVIDIA', 'microsoft', 'github', 'cli', 'modelcontextprotocol', 'ChromeDevTools', 'huggingface', 'vercel-labs', 'upstash', 'aquasecurity', 'semgrep', 'astral-sh', 'ollama']);
OWNER.cli = 'GitHub'; OWNER.ChromeDevTools = 'Google Chrome';
const SUB = { everything: 'Everything (test server)', sequentialthinking: 'Sequential Thinking' };
const DESC_FIX = { everything: 'Reference test server that exercises every MCP feature (tools, prompts, resources and more). Built for people developing MCP clients, not for daily use.' };

const clean = s => (s || '').replace(/\*\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ').replace(/:[a-z_]+:\s*/g, '').trim();
function tagline(s) {
  s = clean(s);
  let t = s.split(/(?<=[.!?])\s|\s(?:Use when|Use this|Triggers|TRIGGER)/)[0];
  if (t.length > 84) t = t.slice(0, 82).replace(/\s+\S*$/, '') + '…';
  return t.replace(/[.:;,]$/, '');
}
const GLYPHS = [[/pdf|docx|word|document|doc-coauthor/, 'doc'], [/pptx|slide|deck|present/, 'slides'], [/xlsx|spreadsheet|excel|csv|notebook|jupyter/, 'table'],
  [/security|threat|vulnerab|scan|secret|leak|trivy|semgrep/, 'shield'], [/figma|design|frontend|theme|canvas|art|brand|ui\b|gif|image/, 'pen'],
  [/deploy|vercel|netlify|render|cloudflare/, 'cloud'], [/test|playwright|browser|webapp|chrome|devtools/, 'flask'], [/\bgit\b|github|\bgh\b|ci\b|pull request|commit|lazygit/, 'branch'],
  [/notion|comms|writing|docs|knowledge|memory|research|context7/, 'book'], [/speech|transcri|audio|voice/, 'wave'], [/mcp|server/, 'mcp'], [/time|calendar|schedule/, 'clock'],
  [/fetch|web|http/, 'globe'], [/search|grep|find|fuzzy|ripgrep|\bfd\b/, 'search'], [/json|jq\b/, 'braces'], [/model|ollama|llm|gpu|cuda|bionemo|nim\b/, 'chip'],
  [/python|package|uv\b|install|cli|terminal|command/, 'shell']];
const glyphFor = s => (GLYPHS.find(([re]) => re.test(s.toLowerCase())) || [0, 'skill'])[1];
function colorFor(s) {
  let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const hue = h % 360;
  return [`hsl(${hue} 72% 58%)`, `hsl(${(hue + 24) % 360} 70% 36%)`];
}

const R = {};
for (const [repo, m] of Object.entries(d.repos)) {
  if (!m) continue;
  const sc = d.scores[repo];
  const urlRe = new RegExp('github\\.com/' + m.full.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(/|$|#|\\?)', 'i');
  R[m.full] = { st: m.stars, fk: m.forks, is: m.issues, lic: m.license, pu: m.pushed?.slice(0, 10), cr: m.created?.slice(0, 10), ar: m.archived, own: m.owner,
    org: m.ownerType === 'Organization', on: OWNER[m.owner] || m.owner, lang: m.language, br: m.branch,
    sc: sc ? { s: sc.score, date: sc.date?.slice(0, 10), ch: sc.checks.filter(c => c.score >= 0).map(c => [c.name, c.score, c.reason]) } : null,
    hn: (d.hn[repo] || []).filter(h => urlRe.test(h.url || '')).map(h => [h.title, h.url, h.points, h.comments, h.date, h.id]), fd: m.fetched || d.generated.slice(0, 10), cm: SOURCES[m.full]?.commit?.slice(0, 7) || null };
}

const L = [];
const seen = new Set();
for (const l of d.listings) {
  const m = d.repos[l.repo] || Object.values(d.repos).find(x => x?.full === l.repo);
  if (!m || l.slug === 'template-skill') continue;
  const repo = m.full, owner = m.owner, repoName = repo.split('/')[1];
  let id = l.kind === 'skill' ? `${owner}-${l.slug}` : l.kind === 'mcp' ? `mcp-${l.slug}` : (NAME[repo] || l.slug);
  id = id.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (seen.has(id)) continue; seen.add(id);
  const desc = clean(DESC_FIX[l.slug] || l.desc);
  const inst = [];
  if (l.kind === 'skill') {
    // Claude app (claude.ai, desktop, mobile): upload the skill folder as a ZIP in Customize > Skills
    // (support.claude.com/en/articles/12512180, checked November 1, 2026). Anthropic's own skills are built in.
    const folder = l.path.split('/').pop();
    if (owner !== 'anthropics') inst.push({ to: 'Claude app', how: 'Upload', dl: `https://github.com/${repo}/archive/refs/heads/${m.branch}.zip`,
      steps: ['Download the project as a ZIP with the button below, and unzip it.', `Find the folder ${repoName}-${m.branch}/${l.path}.`,
        ...(folder !== l.slug ? [`Rename that folder to ${l.slug} (the upload needs the folder named like the skill).`] : []),
        `Zip just that folder.`, 'In Claude, open Customize → Skills, click +, choose Create skill, then Upload a skill, and pick your ZIP.'],
      note: 'Needs "Code execution and file creation" turned on in Settings → Capabilities. Works on Free, Pro, Max, Team and Enterprise plans.' });
    if (owner === 'anthropics') {
      const plug = anthPlugin[l.path];
      if (plug) inst.push({ to: 'Claude Code', how: 'Plugin', cmds: ['/plugin marketplace add anthropics/skills', `/plugin install ${plug}@anthropic-agent-skills`], note: `Run inside Claude Code. Installs the ${plug} bundle, which includes this skill.` });
      inst.unshift({ to: 'Claude app', how: 'Built in', text: 'Already in Claude. Turn it on in Customize → Skills.', note: 'Needs "Code execution and file creation" turned on in Settings → Capabilities.' });
    }
    if (owner === 'obra') inst.push({ to: 'Claude Code', how: 'Plugin', cmds: ['/plugin install superpowers@claude-plugins-official'], note: 'Run inside Claude Code. Installs the whole Superpowers pack.' });
    if (owner === 'huggingface') inst.push({ to: 'Claude Code', how: 'Plugin', cmds: ['/plugin marketplace add huggingface/skills'], note: 'Run inside Claude Code, then choose plugins from /plugin.' });
    if (!TRUSTED.has(owner) && owner !== 'obra' && l.readmeInstall?.plugin)
      inst.push({ to: 'Claude Code', how: 'Plugin', cmds: [l.readmeInstall.plugin], note: 'From the project\'s README. Run inside Claude Code, then pick what to install from /plugin.' });
    if (owner === 'openai') inst.push({ to: 'Codex', how: 'Built-in installer', cmds: [/\.curated\//.test(l.path) ? `$skill-installer ${l.slug}` : `$skill-installer install https://github.com/${repo}/tree/${m.branch}/${l.path}`], note: 'Type this inside Codex.' });
    inst.push({ to: 'Any agent', how: 'skills CLI', agentCmd: `npx skills add ${repo} --skill ${l.slug}`, note: 'Uses the open skills CLI. Pick the agent to install into.' });
    inst.push({ scan: true, cmds: [`git clone --depth 1 https://github.com/${repo}`, `skillspector scan ${repoName}/${l.path} --no-llm`] });
  } else if (l.kind === 'mcp') {
    const run = l.npxPkg ? `npx -y ${l.npxPkg}${l.slug === 'filesystem' ? ' /path/to/allowed/folder' : ''}` : l.uvxPkg ? `uvx ${l.uvxPkg}` : null;
    if (MCP_INSTALL[repo]) inst.push(...MCP_INSTALL[repo], { to: 'Other clients', how: 'Install guide', link: `https://github.com/${repo}#readme`, note: 'Setup differs by client. Follow the project\'s README.' });
    else if (repo === 'ChromeDevTools/chrome-devtools-mcp') inst.push({ to: 'Claude Code', how: 'Plugin', cmds: ['/plugin marketplace add ChromeDevTools/chrome-devtools-mcp', '/plugin install chrome-devtools-mcp@chrome-devtools-plugins'], note: 'Run inside Claude Code.' });
    else if (repo === 'upstash/context7') inst.push({ to: 'Claude Code', how: 'Setup CLI', cmds: ['npx ctx7 setup --claude'], note: 'Signs you in with OAuth and configures Context7. Needs Node.js 22.13 or newer.' });
    else if (l.install?.claude) inst.push({ to: 'Claude Code', how: 'CLI', cmds: [l.install.claude], note: repo === 'github/github-mcp-server' ? 'Needs Docker and a GitHub personal access token in $GITHUB_PAT.' : 'Run in your terminal.' });
    else if (run) inst.push({ to: 'Claude Code', how: 'CLI', cmds: [`claude mcp add ${l.slug} -- ${run}`], note: l.slug === 'filesystem' ? 'Run in your terminal. Replace the path with the folder it may access.' : 'Run in your terminal.' });
    if (MCP_INSTALL[repo]) {}
    else if (l.install?.codex) inst.push({ to: 'Codex', how: 'CLI', cmds: [l.install.codex], note: 'Run in your terminal.' });
    else if (run) inst.push({ to: 'Codex', how: 'CLI', cmds: [`codex mcp add ${l.slug} ${run}`], note: 'Run in your terminal.' });
    if (repo === 'upstash/context7') inst.push({ to: 'Other agents', how: 'Setup CLI', cmds: ['npx ctx7 setup'], note: 'Interactive. Also supports --cursor and other flags.' });
    if (!inst.length) inst.push({ to: 'All clients', how: 'Install guide', link: `https://github.com/${repo}#readme`, note: 'Setup differs by client. Follow the project\'s README.' });
    inst.push({ scan: true, cmds: [`skillspector scan https://github.com/${repo} --no-llm`] });
  } else {
    const i = l.install || {};
    if (repo === 'ollama/ollama') delete i.pip;
    if (repo === 'astral-sh/uv') delete i.uvTool;
    if (repo === 'aristocratos/btop') delete i.brew;   // README line lists build dependencies, not an install
    if (i.cargo && /--path/.test(i.cargo)) delete i.cargo;
    if (repo === 'vercel-labs/skills') delete i.npx;
    const mac = [i.brew].filter(Boolean), win = [i.winget, i.scoop, i.ps].filter(Boolean), any = [i.curl, i.uvTool, i.pipx, i.cargo, i.npm, i.go, i.pip].filter(Boolean);
    if (mac.length) inst.push({ to: 'macOS', how: 'Homebrew', cmds: mac });
    if (win.length) inst.push({ to: 'Windows', how: win[0].startsWith('winget') ? 'winget' : win[0].startsWith('scoop') ? 'Scoop' : 'PowerShell', cmds: win });
    if (any.length) inst.push({ to: 'Linux & others', how: 'Terminal', cmds: any });
    if (repo === 'vercel-labs/skills') inst.push({ to: 'Any agent', how: 'npx', cmds: ['npx skills add vercel-labs/agent-skills'], note: 'No install needed. Runs through npx; this example adds Vercel\'s skills.' });
    if (repo === 'cli/cli') inst.push({ to: 'Coding agents', how: 'Agent skill', cmds: ['gh skill install cli/cli gh --scope user'], note: 'Installs the gh agent skill. Install GitHub CLI itself first.' });
    if (!inst.length || repo === 'cli/cli' || repo === 'jqlang/jq') inst.push({ to: 'All platforms', how: 'Install guide', link: repo === 'jqlang/jq' ? 'https://github.com/jqlang/jq/releases' : repo === 'cli/cli' ? 'https://github.com/cli/cli#installation' : `https://github.com/${repo}#readme`, note: repo === 'jqlang/jq' ? 'Download the binary for your platform from the releases page.' : 'Follow the project\'s install guide.' });
  }
  const name = l.kind === 'skill' ? l.name : l.kind === 'mcp' && l.path ? (SUB[l.slug] || l.name) : (NAME[repo] || l.name);
  L.push({ id, k: l.kind, n: name, sl: l.slug, t: tagline(desc), d: desc, r: repo, u: l.url, p: l.path, nv: !!l.nvidia, tr: TRUSTED.has(owner), g: glyphFor(l.slug + ' ' + desc + ' ' + repo), c: colorFor(id),
    lines: l.lines || null, lic: l.license || null, inst, pl: PLAIN[id]?.[0] || null, jb: PLAIN[id]?.[1] || [], lv: PLAIN[id]?.[2] || null });
  if (!PLAIN[id]) console.error('NO PLAIN TEXT', id);
}

// SkillSpector static-scan reports, one JSON per listing id (from scan.mjs)
const SC = {};
const scanDir = process.argv[5];
const SEV_RANK = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
const trim = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
if (scanDir) for (const l of L) {
  const f = `${scanDir}/${l.id}.json`;
  if (!fs.existsSync(f)) continue;
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  // Scoped scans (large repos) report paths relative to the scanned folder
  const scope = fs.existsSync(`${scanDir}/${l.id}.scope.txt`) ? fs.readFileSync(`${scanDir}/${l.id}.scope.txt`, 'utf8').trim() : null;
  if (scope) for (const i of j.issues) if (i.location?.file) i.location.file = `${scope}/${i.location.file.replace(/\\/g, '/')}`;
  const by = {};
  for (const i of j.issues) by[i.severity] = (by[i.severity] || 0) + 1;
  const top = [...j.issues].sort((a, b) => (SEV_RANK[a.severity] ?? 9) - (SEV_RANK[b.severity] ?? 9) || (b.confidence || 0) - (a.confidence || 0)).slice(0, 15)
    .map(i => [i.severity, i.id, i.category, trim(i.pattern, 120), i.location?.file || '', i.location?.start_line || null, trim(i.finding, 140), trim(i.explanation, 220), i.confidence ?? null]);
  const ac = j.analysis_completeness || {};
  SC[l.id] = { s: j.risk_assessment.score, sev: j.risk_assessment.severity, rec: j.risk_assessment.recommendation, n: j.issues.length, by,
    files: j.components?.length || 0, exe: !!j.metadata?.has_executable_scripts, ver: j.metadata?.skillspector_version, at: j.skill?.scanned_at?.slice(0, 10),
    cov: ac.coverage_percent ?? null, scope, top };
}

// Purpose-relative MCP check (from mcp_analyze.mjs)
const MR = process.argv[6] && fs.existsSync(process.argv[6]) ? JSON.parse(fs.readFileSync(process.argv[6], 'utf8')) : {};

const DATA = { gen: d.generated.slice(0, 10), L, R, AV: d.avatars, SC, MR };
const json = JSON.stringify(DATA).replace(/</g, '\\u003c');
const tpl = fs.readFileSync(tplPath, 'utf8');
fs.writeFileSync(outPath, tpl.replace('/*__DATA__*/null', json));
console.error('listings', L.length, 'skills', L.filter(x => x.k === 'skill').length, 'mcp', L.filter(x => x.k === 'mcp').length, 'tools', L.filter(x => x.k === 'tool').length,
  'scanned', Object.keys(SC).length, 'anth plugins mapped', Object.keys(anthPlugin).length, 'hn kept', Object.values(R).reduce((a, r) => a + r.hn.length, 0), 'bytes', fs.statSync(outPath).size);
