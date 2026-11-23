// Turns data.json (from fetch.mjs) into the compact DATA object embedded in the store page.
// Usage: node build.mjs data.json template.html out.html
import fs from 'node:fs';
import { otherNote } from './filekind.mjs';
import { findingStatus, isSerious } from './findings.mjs';
import { buildMarketplace, writeMarketplace, installName, commitsFrom, branchesFrom, MARKETPLACE, MARKETPLACE_REPO } from './marketplace.mjs';

const [, , dataPath, tplPath, outPath] = process.argv;
const d = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

let marketplace = null;
try { marketplace = await (await fetch('https://raw.githubusercontent.com/anthropics/skills/main/.claude-plugin/marketplace.json')).json(); } catch (e) {}
const anthPlugin = {};
for (const p of marketplace?.plugins || []) for (const s of p.skills || []) anthPlugin[s.replace(/^\.\//, '').replace(/\/$/, '')] = p.name;

const OWNER = { anthropics: 'Anthropic', openai: 'OpenAI', NVIDIA: 'NVIDIA', huggingface: 'Hugging Face', 'vercel-labs': 'Vercel Labs', modelcontextprotocol: 'Model Context Protocol',
  github: 'GitHub', microsoft: 'Microsoft', upstash: 'Upstash', ChromeDevTools: 'Chrome DevTools', jqlang: 'jq', cli: 'GitHub', 'astral-sh': 'Astral', ollama: 'Ollama',
  aquasecurity: 'Aqua Security', semgrep: 'Semgrep', gitleaks: 'Gitleaks', cloudflare: 'Cloudflare', 'heygen-com': 'HeyGen', trailofbits: 'Trail of Bits', trufflesecurity: 'Truffle Security' };
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
  'nspady/google-calendar-mcp': 'Google Calendar MCP', 'MarkusPfundstein/mcp-obsidian': 'Obsidian MCP', 'Jpisnice/shadcn-ui-mcp-server': 'shadcn/ui MCP Server',
  'suekou/mcp-notion-server': 'Notion MCP Server', 'kimtaeyoon83/mcp-server-youtube-transcript': 'YouTube Transcript MCP', 'vivekVells/mcp-pandoc': 'Pandoc MCP',
  'Pimzino/spec-workflow-mcp': 'Spec Workflow MCP', 'jae-jae/fetcher-mcp': 'Fetcher MCP', 'schollz/croc': 'croc', 'FiloSottile/age': 'age', 'saulpw/visidata': 'VisiData',
  'derailed/k9s': 'k9s', 'nicolargo/glances': 'Glances', 'yorukot/superfile': 'superfile', 'darrenburns/posting': 'Posting', 'tconbeer/harlequin': 'Harlequin', 'denisidoro/navi': 'navi',
  'lharries/whatsapp-mcp': 'WhatsApp MCP', 'chigwell/telegram-mcp': 'Telegram MCP', 'domdomegg/airtable-mcp-server': 'Airtable MCP Server', 'marcelmarais/spotify-mcp-server': 'Spotify MCP Server',
  'morluto/rea': 'REA: Reverse Engineer Anything', 'Gathin23/cleanyourtv': 'CleanYourTV', 'storytold/photocraft': 'PhotoCraft', 'storytold/pdfcraft': 'PdfCraft',
  'KnifeLemon/Filee': 'Filee', 'robbietilton/Compositor': 'Compositor', 'jub0t/Concat': 'Concat', 'crmne/spotifast': 'Spotifast',
  'mksglu/context-mode': 'context-mode', 'debpalash/VoiceStudio': 'VoiceStudio', 'storytold/lightcraft': 'LightCraft',
  'localsend/localsend': 'LocalSend', 'upscayl/upscayl': 'Upscayl', 'qarmin/czkawka': 'Krokiet (Czkawka)', 'flameshot-org/flameshot': 'Flameshot',
  'keepassxreboot/keepassxc': 'KeePassXC', 'syncthing/syncthing': 'Syncthing', 'trufflesecurity/trufflehog': 'TruffleHog',
  'gorhill/uBlock': 'uBlock Origin', 'pi-hole/pi-hole': 'Pi-hole', 'rustdesk/rustdesk': 'RustDesk',
  'janhq/jan': 'Jan', 'ggml-org/llama.cpp': 'llama.cpp', 'open-webui/open-webui': 'Open WebUI', 'Comfy-Org/ComfyUI': 'ComfyUI', 'cjpais/Handy': 'Handy',
  'Zackriya-Solutions/meetily': 'Meetily', 'Mintplex-Labs/anything-llm': 'AnythingLLM', 'Stirling-Tools/Stirling-PDF': 'Stirling PDF', 'AppFlowy-IO/AppFlowy': 'AppFlowy',
  'actualbudget/actual': 'Actual Budget', 'penpot/penpot': 'Penpot', 'immich-app/immich': 'Immich', 'obsproject/obs-studio': 'OBS Studio', 'excalidraw/excalidraw': 'Excalidraw',
  'Niko1221/Strata': 'Strata', 'FrigadeHQ/hob': 'Hob', 'FrigadeHQ/yogurt': 'Yogurt', 'HKUDS/nanobot': 'nanobot', 'jaredpalmer/kev': 'Kev', 'ollaya-dev/ollaya': 'ollaya',
  'NandhaKishorM/laya': 'laya', 'toeverything/AFFiNE': 'AFFiNE', 'genspark-ai/genoffice': 'GenOffice', 'HKUDS/DeepTutor': 'DeepTutor', 'nexu-io/open-design': 'Open Design',
  'backnotprop/plannotator': 'Plannotator', 'HKUDS/CLI-Anything': 'CLI-Anything', 'Graphify-Labs/graphify': 'Graphify', 'DIYgod/pinky': 'Pinky',
  'ryanbr/noop': 'NOOP', 'CapSoftware/Cap': 'Cap', 'OpenCut-app/OpenCut': 'OpenCut', 'fastrepl/anarlog': 'Anarlog', 'OpenWhispr/openwhispr': 'OpenWhispr', 'dyad-sh/dyad': 'Dyad',
  'lfnovo/open-notebook': 'Open Notebook', 'jellyfin/jellyfin': 'Jellyfin', 'usebruno/bruno': 'Bruno', 'hoppscotch/hoppscotch': 'Hoppscotch', 'twentyhq/twenty': 'Twenty',
  'makeplane/plane': 'Plane', 'hcengineering/platform': 'Huly', 'Leantime/leantime': 'Leantime', 'documenso/documenso': 'Documenso', 'formbricks/formbricks': 'Formbricks',
  'chatwoot/chatwoot': 'Chatwoot', 'activepieces/activepieces': 'Activepieces', 'docmost/docmost': 'Docmost', 'bigcapitalhq/bigcapital': 'Bigcapital', 'inovector/mixpost': 'Mixpost',
  'HiEventsDev/Hi.Events': 'Hi.Events', 'coollabsio/coolify': 'Coolify', 'Dokploy/dokploy': 'Dokploy', 'TabbyML/tabby': 'Tabby',
  'yt-dlp/yt-dlp': 'yt-dlp', 'Wilfred/difftastic': 'difftastic', 'muesli/duf': 'duf', 'ClementTsang/bottom': 'bottom', 'ducaale/xh': 'xh', 'chmln/sd': 'sd' };
// Hand-written plain-language lines, job tags and setup level (pipeline/plain.json)
const SOURCES = JSON.parse(fs.readFileSync(new URL('../data/sources.json', import.meta.url), 'utf8'));
// npm lifecycle scripts that run on their own at install (pipeline/install_hooks.mjs), keyed by data.json listing id
const HOOKS = fs.existsSync(new URL('../data/install-hooks.json', import.meta.url)) ? JSON.parse(fs.readFileSync(new URL('../data/install-hooks.json', import.meta.url), 'utf8')) : {};
const VIDEOS = fs.existsSync(new URL('../data/videos.json', import.meta.url)) ? JSON.parse(fs.readFileSync(new URL('../data/videos.json', import.meta.url), 'utf8')) : {};
const PLAIN = JSON.parse(fs.readFileSync(new URL('./plain.json', import.meta.url), 'utf8'));
// What a listing is a free alternative to, only where the project itself says so, with the source (data/alternatives.json)
// Skills that only ask Claude to do what it already does well, each read and judged (data/redundant.json): kept reachable, off the shelves
const REDUNDANT = fs.existsSync(new URL('../data/redundant.json', import.meta.url)) ? JSON.parse(fs.readFileSync(new URL('../data/redundant.json', import.meta.url), 'utf8')) : {};
// What Skillshelf leaves off the site and why (data/curation.json): Claude's own built-ins, Codex-only skills, test servers, the extra pieces of packs
const CUR = JSON.parse(fs.readFileSync(new URL('../data/curation.json', import.meta.url), 'utf8'));
// Each project's own logo where a person owns the repository (pipeline/logos.cjs, checked by eye), so no listing shows a developer's photo as its icon
const LOGOS = fs.existsSync(new URL('../data/logos.json', import.meta.url)) ? JSON.parse(fs.readFileSync(new URL('../data/logos.json', import.meta.url), 'utf8')) : {};
// One installer per kind of computer from each app's latest GitHub release (pipeline/releases.mjs)
const RELEASES = fs.existsSync(new URL('../data/releases.json', import.meta.url)) ? JSON.parse(fs.readFileSync(new URL('../data/releases.json', import.meta.url), 'utf8')) : {};
// Apps you host yourself: free when you run them, on a server or an always-on computer. Each link is the project's own guide (from its README, November 22, 2026)
const SELF_HOST = { 'twentyhq/twenty': ['https://docs.twenty.com/developers/self-host/capabilities/docker-compose'], 'makeplane/plane': ['https://developers.plane.so/self-hosting/overview'],
  'hcengineering/platform': ['https://github.com/hcengineering/huly-selfhost'], 'Leantime/leantime': ['https://github.com/Leantime/docker-leantime'],
  'documenso/documenso': ['https://docs.documenso.com/docs/self-hosting'], 'formbricks/formbricks': ['https://formbricks.com/docs/self-hosting/deployment'],
  'chatwoot/chatwoot': ['https://chatwoot.com/deploy'], 'activepieces/activepieces': ['https://www.activepieces.com/docs/install/overview'],
  'docmost/docmost': ['https://docmost.com/docs'], 'bigcapitalhq/bigcapital': ['https://docs.bigcapital.app/deployment/docker'],
  'inovector/mixpost': ['https://docs.mixpost.app/lite/', 'This is Mixpost Lite, the free edition. Mixpost Pro is a paid product.'],
  'HiEventsDev/Hi.Events': ['https://hi.events/docs/getting-started'], 'coollabsio/coolify': ['https://coolify.io/docs/start-with-self-hosted'],
  'TabbyML/tabby': ['https://tabby.tabbyml.com/docs/installation/'], 'lfnovo/open-notebook': ['https://github.com/lfnovo/open-notebook#readme', 'Its README has the Docker steps, including the secret key to set first.'] };
const SERVER = new Set([...Object.keys(SELF_HOST), 'Dokploy/dokploy', 'jellyfin/jellyfin']);
const ALTS = fs.existsSync(new URL('../data/alternatives.json', import.meta.url)) ? JSON.parse(fs.readFileSync(new URL('../data/alternatives.json', import.meta.url), 'utf8')) : {};
// Install steps for MCP servers whose README gives a JSON config or several steps instead of one command.
// Every command is the README's own, or its JSON config written as the equivalent `claude mcp add`.
const MCP_INSTALL = {
  'DIYgod/pinky': [{ to: 'Mac, Windows, Linux', how: 'Download', link: 'https://github.com/DIYgod/pinky/releases/latest', linkText: 'Download Pinky', note: 'Then open Settings › Agents in Pinky to connect Claude Code or Claude Desktop in one click. Early software: its README calls it pre-alpha.' },
    { to: 'macOS', how: 'Homebrew', cmds: ['brew install --cask diygod/tap/pinky'], note: 'From the README.' }],
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
  'MarkusPfundstein/mcp-obsidian': [
    { to: 'Claude Code', how: 'CLI', cmds: ['claude mcp add obsidian -e OBSIDIAN_API_KEY=YOUR-KEY -- uvx mcp-obsidian'], note: 'First install and enable the Local REST API community plugin in Obsidian and copy its API key. Same settings as the README\'s config.' }],
  'Jpisnice/shadcn-ui-mcp-server': [
    { to: 'Claude Code', how: 'CLI', cmds: ['claude mcp add shadcn -- npx @jpisnice/shadcn-ui-mcp-server'], note: 'Run in your terminal. Add --github-api-key with a GitHub token if you hit GitHub\'s rate limit, as the README describes.' }],
  'suekou/mcp-notion-server': [
    { to: 'Claude Code', how: 'CLI', cmds: ['claude mcp add notion -e NOTION_API_TOKEN=your-integration-token -- npx -y @suekou/mcp-notion-server'], note: 'Create a Notion integration, share the pages it may use with it, and paste its token. Same settings as the README\'s config.' }],
  'kimtaeyoon83/mcp-server-youtube-transcript': [
    { to: 'Claude Code', how: 'CLI', cmds: ['claude mcp add youtube-transcript -- npx -y @kimtaeyoon83/mcp-server-youtube-transcript'], note: 'Run in your terminal. No key needed for transcripts.' },
    { to: 'Codex', how: 'CLI', cmds: ['codex mcp add youtube-transcript -- npx -y @kimtaeyoon83/mcp-server-youtube-transcript'], note: 'Run in your terminal.' }],
  'vivekVells/mcp-pandoc': [
    { to: 'Claude Code', how: 'CLI', cmds: ['claude mcp add pandoc -- uvx mcp-pandoc'], note: 'Needs pandoc installed on your computer (pandoc.org). Same settings as the README\'s config.' }],
  'Pimzino/spec-workflow-mcp': [
    { to: 'Claude Code', how: 'CLI', cmds: ['claude mcp add spec-workflow -- npx -y @pimzino/spec-workflow-mcp@latest /path/to/your/project'], note: 'Replace the path with your project folder. Same settings as the README\'s config.' },
    { to: 'Dashboard', how: 'Optional', cmds: ['npx -y @pimzino/spec-workflow-mcp@latest --dashboard'], note: 'Opens its web dashboard for reviewing and approving specs.' }],
  'jae-jae/fetcher-mcp': [
    { to: 'Claude Code', how: 'CLI', cmds: ['claude mcp add fetcher -- npx -y fetcher-mcp'], note: 'Run in your terminal. It downloads a headless browser the first time.' },
    { to: 'Codex', how: 'CLI', cmds: ['codex mcp add fetcher -- npx -y fetcher-mcp'], note: 'Run in your terminal.' }],
  'lharries/whatsapp-mcp': [
    { to: 'All clients', how: 'Two parts', link: 'https://github.com/lharries/whatsapp-mcp#installation', note: 'Needs Go and uv. You run its WhatsApp bridge, scan a QR code with your phone to link it like WhatsApp Web, then add the server to your client as the README shows.' }],
  'chigwell/telegram-mcp': [
    { to: 'All clients', how: 'Install guide', link: 'https://github.com/chigwell/telegram-mcp#readme', note: 'Needs a Telegram API ID and hash from my.telegram.org, then a session string from its generator script. That session acts as your account.' }],
  'domdomegg/airtable-mcp-server': [
    { to: 'Claude Code', how: 'CLI', cmds: ['claude mcp add airtable -e AIRTABLE_API_KEY=your-token -- npx -y airtable-mcp-server'], note: 'Create an Airtable personal access token with only the scopes you need, as the README explains. Same settings as its install link.' }],
  'marcelmarais/spotify-mcp-server': [
    { to: 'All clients', how: 'Install guide', link: 'https://github.com/marcelmarais/spotify-mcp-server#readme', note: 'Needs a Spotify developer app (client ID and secret); you build it locally and sign in with Spotify once.' }],
  // README install section, checked November 1, 2026
  'mksglu/context-mode': [
    { to: 'Claude Code', how: 'Plugin', cmds: ['/plugin marketplace add mksglu/context-mode', '/plugin install context-mode@context-mode'], note: 'Run inside Claude Code, then restart it. The plugin adds hooks that route large tool output through context-mode automatically.' },
    { to: 'Claude Code', how: 'Connector only', cmds: ['claude mcp add context-mode -- npx -y context-mode'], note: 'Run in your terminal. Gives the same tools without the hooks, so your assistant uses them only when it chooses to.' }],
  'morluto/rea': [
    { to: 'Your agent', how: 'Setup command', cmds: ['npx rea-agents setup'], note: 'From the README. Registers REA with your agent (Claude Code, Codex and others) and installs its workflow instructions. Needs Node.js 22.' }],
  'nspady/google-calendar-mcp': [
    { to: 'Claude Code', how: 'CLI', cmds: ['claude mcp add google-calendar -e GOOGLE_OAUTH_CREDENTIALS=/path/to/gcp-oauth.keys.json -- npx -y @cocal/google-calendar-mcp'], note: 'First create a Google Cloud OAuth client (Desktop app) and download its keys file, as the README explains. Then ask your assistant to authenticate.' }],
};
// Companies whose own repositories are listed as "Trusted publisher" (no scan up front)
const TRUSTED = new Set(['anthropics', 'openai', 'NVIDIA', 'microsoft', 'github', 'cli', 'modelcontextprotocol', 'ChromeDevTools', 'huggingface', 'vercel-labs', 'upstash', 'aquasecurity', 'semgrep', 'astral-sh', 'GoogleChrome', 'google-labs-code', 'alibaba', 'ollama', 'cloudflare', 'heygen-com', 'trailofbits', 'trufflesecurity']);
OWNER.cli = 'GitHub'; OWNER.ChromeDevTools = 'Google Chrome';
const SUB = { everything: 'Everything (test server)', sequentialthinking: 'Sequential Thinking' };
const DESC_FIX = { everything: 'Reference test server that exercises every MCP feature (tools, prompts, resources and more). Built for people developing MCP clients, not for daily use.' };

// Display names: fix acronyms and small words in names made from folder names ("Ci Cd And Automation" -> "CI/CD and Automation")
const ACRO = { ai: 'AI', seo: 'SEO', aso: 'ASO', api: 'API', cli: 'CLI', mcp: 'MCP', hf: 'HF', adhd: 'ADHD', ui: 'UI', ux: 'UX', gdpr: 'GDPR', kpi: 'KPI', sql: 'SQL',
  wcag: 'WCAG', stride: 'STRIDE', pdf: 'PDF', docx: 'DOCX', pptx: 'PPTX', xlsx: 'XLSX', aws: 'AWS', iam: 'IAM', nim: 'NIM', pdbs: 'PDBs', rtsp: 'RTSP', amc: 'AMC', gh: 'GH',
  n8n: 'n8n', json: 'JSON', svg: 'SVG', gif: 'GIF', cudf: 'cuDF', codonfm: 'CodonFM', kermt: 'KERMT', evo2: 'Evo 2', genmol: 'GenMol', diffdock: 'DiffDock', boltz2: 'Boltz-2',
  openai: 'OpenAI', chatgpt: 'ChatGPT', aspnet: 'ASP.NET', winui: 'WinUI', sagemaker: 'SageMaker', cmim: 'cMIM', ios: 'iOS', css: 'CSS', html: 'HTML', llm: 'LLM', ab: 'A/B', nvidia: 'NVIDIA',
  devtools: 'DevTools', github: 'GitHub', pci: 'PCI', tam: 'TAM', bdi: 'BDI', mem: 'Mem', ide: 'IDE' };
const SMALL = new Set(['and', 'or', 'of', 'to', 'for', 'with', 'the', 'a', 'in', 'on', 'by', 'from']);
const niceName = n => String(n).replace(/\bCi Cd\b/i, 'CI/CD').split(' ').map((w, i) => { const k = w.toLowerCase(); return ACRO[k] || (i > 0 && SMALL.has(k) ? k : w); }).join(' ');
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
  // Licenses GitHub can't classify, read from the repository's own license file (checked November 1, 2026)
  const LICENSE_FIX = { 'muesli/duf': 'MIT', 'nicolargo/glances': 'LGPL-3.0', 'Gathin23/cleanyourtv': 'MIT', 'mksglu/context-mode': 'Elastic License 2.0',
    'qarmin/czkawka': 'MIT (library), GPL-3.0 (apps)', 'keepassxreboot/keepassxc': 'GPL-2.0 or GPL-3.0', 'pi-hole/pi-hole': 'EUPL',
    // Read November 22, 2026
    'janhq/jan': 'Apache-2.0', 'open-webui/open-webui': 'Open WebUI License (BSD-3 style, keep its branding)', 'Stirling-Tools/Stirling-PDF': 'MIT, with a proprietary folder' };
  R[m.full] = { st: m.stars, fk: m.forks, is: m.issues, lic: LICENSE_FIX[m.full] || m.license, pu: m.pushed?.slice(0, 10), cr: m.created?.slice(0, 10), ar: m.archived, own: m.owner,
    org: m.ownerType === 'Organization', on: OWNER[m.owner] || m.owner, lang: m.language, br: m.branch,
    sc: sc === 'unchecked' ? 'u' : sc ? { s: sc.score, date: sc.date?.slice(0, 10), ch: sc.checks.filter(c => c.score >= 0).map(c => [c.name, c.score, c.reason]) } : null,
    hn: d.hn[repo] === 'unchecked' ? null : (d.hn[repo] || []).filter(h => urlRe.test(h.url || '')).map(h => [h.title, h.url, h.points, h.comments, h.date, h.id]), fd: m.fetched || d.generated.slice(0, 10), cm: SOURCES[m.full]?.commit?.slice(0, 7) || null };
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
  if (CUR.repos[repo] || CUR.ids[id]) continue;
  const desc = clean(DESC_FIX[l.slug] || l.desc);
  const inst = [];
  if (l.kind === 'skill') {
    // Claude app (claude.ai, desktop, mobile): upload the skill folder as a ZIP at Plugins > Add > Upload plugin
    // (claude.ai/plugins/new/upload takes a .zip, .skill or SKILL.md; checked in the app November 21, 2026, after
    // Customize > Skills became Plugins). Anthropic's own skills are built in.
    const folder = l.path.split('/').pop();
    // A skill whose name has spaces ("Home Assistant YAML") needs quotes on the command line, and keeps its folder name
    const q = s => /\s/.test(s) ? `"${s}"` : s;
    // Cooklang's skills only work with its Cook server, which a Claude app upload doesn't include
    if (repo !== 'cooklang/cooklang-skills') inst.push({ to: 'Claude app', how: 'Upload', dl: `https://github.com/${repo}/archive/refs/heads/${m.branch}.zip`,
      steps: ['Download the project as a ZIP with the button below, and unzip it.', `Find the folder ${repoName}-${m.branch}${l.path ? '/' + l.path : ''}.`,
        ...(folder !== l.slug && !/\s/.test(l.slug) ? [`Rename that folder to ${l.slug} (the upload needs the folder named like the skill).`] : []),
        `Zip just that folder.`, 'In Claude, open Plugins, click Add, choose Upload plugin, and pick your ZIP (or go straight to claude.ai/plugins/new/upload).'],
      note: 'Needs "Create and edit files" turned on in Settings → Capabilities. Works on Free, Pro, Max, Team and Enterprise plans.' });
    if (owner === 'anthropics') {
      const plug = anthPlugin[l.path];
      if (plug) inst.push({ to: 'Claude Code', how: 'Plugin', cmds: ['/plugin marketplace add anthropics/skills', `/plugin install ${plug}@anthropic-agent-skills`], note: `Run inside Claude Code. Installs the ${plug} bundle, which includes this skill.` });
      inst.unshift({ to: 'Claude app', how: 'Example skill', text: 'Anthropic\'s example skills are in Claude\'s Plugins directory: open Plugins, search for this one and add it. If it isn\'t listed there, upload it with the steps below.', note: 'Needs "Create and edit files" turned on in Settings → Capabilities.' });
    }
    if (owner === 'obra') inst.push({ to: 'Claude Code', how: 'Plugin', cmds: ['/plugin install superpowers@claude-plugins-official'], note: 'Run inside Claude Code. Installs the whole Superpowers pack.' });
    if (owner === 'huggingface') inst.push({ to: 'Claude Code', how: 'Plugin', cmds: ['/plugin marketplace add huggingface/skills'], note: 'Run inside Claude Code, then choose plugins from /plugin.' });
    // Cooklang's skills need its Cook server, which only the plugin installs (README, read November 7, 2026)
    if (repo === 'cooklang/cooklang-skills') inst.push({ to: 'Claude Code', how: 'Plugin', cmds: ['/plugin marketplace add cooklang/cooklang-skills', '/plugin install cooklang@cooklang-skills'],
      note: 'Run inside Claude Code. Adds all its skills and the Cook server that reads your recipe folder. Needs Node.js; there are no Windows builds yet, its README says.' });
    else if (repo === 'tonylofgren/aurora-smart-home') inst.push({ to: 'Claude Code', how: 'Plugin', cmds: ['/plugin marketplace add tonylofgren/aurora-smart-home', '/plugin install aurora@aurora-smart-home'],
      note: 'From the project\'s README. Run inside Claude Code. Installs the whole Aurora smart home pack, which includes this skill.' });
    else if (!TRUSTED.has(owner) && owner !== 'obra' && l.readmeInstall?.plugin)
      inst.push({ to: 'Claude Code', how: 'Plugin', cmds: [l.readmeInstall.plugin.replace(/\s+#.*$/, '')], note: 'From the project\'s README. Run inside Claude Code, then pick what to install from /plugin.' });
    if (owner === 'openai') inst.push({ to: 'Codex', how: 'Built-in installer', cmds: [/\.curated\//.test(l.path) ? `$skill-installer ${l.slug}` : `$skill-installer install https://github.com/${repo}/tree/${m.branch}/${l.path}`], note: 'Type this inside Codex.' });
    if (CUR.keep[id]?.pack) inst.push({ to: 'Any agent', how: 'skills CLI', agentCmd: `npx skills add ${repo}`, note: 'Uses the open skills CLI. It lists the pack\'s skills so you can pick which to install.' });
    else inst.push({ to: 'Any agent', how: 'skills CLI', agentCmd: `npx skills add ${repo} --skill ${q(l.slug)}`, note: repo === 'cooklang/cooklang-skills' ? 'Adds the skill only. It also needs the Cook server, which the plugin sets up; its README shows how to add it to other clients.' : 'Uses the open skills CLI. Pick the agent to install into.' });
    inst.push({ scan: true, cmds: [`git clone --depth 1 https://github.com/${repo}`, `skillspector scan ${repoName}/${l.path} --no-llm`] });
  } else if (l.kind === 'mcp') {
    const run = l.npxPkg ? `npx -y ${l.npxPkg}${l.slug === 'filesystem' ? ' /path/to/allowed/folder' : ''}` : l.uvxPkg ? `uvx ${l.uvxPkg}` : null;
    // A README card for other clients, unless the README-based cards already cover every client
    if (MCP_INSTALL[repo]) inst.push(...MCP_INSTALL[repo], ...(MCP_INSTALL[repo].some(c => /^All /.test(c.to)) ? [] : [{ to: 'Other clients', how: 'Install guide', link: `https://github.com/${repo}#readme`, note: 'Setup differs by client. Follow the project\'s README.' }]));
    else if (repo === 'ChromeDevTools/chrome-devtools-mcp') inst.push({ to: 'Claude Code', how: 'Plugin', cmds: ['/plugin marketplace add ChromeDevTools/chrome-devtools-mcp', '/plugin install chrome-devtools-mcp@chrome-devtools-plugins'], note: 'Run inside Claude Code.' });
    else if (repo === 'upstash/context7') inst.push({ to: 'Claude Code', how: 'Setup CLI', cmds: ['npx ctx7 setup --claude'], note: 'Signs you in with OAuth and configures Context7. Needs Node.js 22.13 or newer.' });
    else if (l.install?.claude) inst.push({ to: 'Claude Code', how: 'CLI', cmds: [l.install.claude], note: repo === 'github/github-mcp-server' ? 'Needs Docker and a GitHub personal access token in $GITHUB_PAT.' : 'Run in your terminal.' });
    else if (run) inst.push({ to: 'Claude Code', how: 'CLI', cmds: [`claude mcp add ${l.slug} -- ${run}`], note: l.slug === 'filesystem' ? 'Run in your terminal. Replace the path with the folder it may access.' : 'Run in your terminal.' });
    if (MCP_INSTALL[repo]) {}
    // Codex reads everything after "--" as the server's own command, so a flag like npx's -y can't be taken for one of Codex's
    else if (l.install?.codex) inst.push({ to: 'Codex', how: 'CLI', cmds: [/ -- /.test(l.install.codex) ? l.install.codex : l.install.codex.replace(/^(codex mcp add \S+) /, '$1 -- ')], note: 'Run in your terminal.' });
    else if (run) inst.push({ to: 'Codex', how: 'CLI', cmds: [`codex mcp add ${l.slug} -- ${run}`], note: 'Run in your terminal.' });
    if (repo === 'upstash/context7') inst.push({ to: 'Other agents', how: 'Setup CLI', cmds: ['npx ctx7 setup'], note: 'Interactive. Also supports --cursor and other flags.' });
    if (!inst.length) inst.push({ to: 'All clients', how: 'Install guide', link: `https://github.com/${repo}#readme`, note: 'Setup differs by client. Follow the project\'s README.' });
    inst.push({ scan: true, cmds: [`skillspector scan https://github.com/${repo} --no-llm`] });
  } else {
    // Commands copied from each README where the line-matcher missed them (checked November 1, 2026)
    const TOOL_INSTALL = { 'Wilfred/difftastic': { brew: 'brew install difftastic', winget: 'winget install difftastic', scoop: 'scoop install difftastic' },
      'muesli/duf': { brew: 'brew install duf', scoop: 'scoop install duf', apt: 'apt install duf' }, 'chmln/sd': { cargo: 'cargo install sd' },
      'ducaale/xh': { brew: 'brew install xh', scoop: 'scoop install xh', cargo: 'cargo install xh --locked' },
      'FiloSottile/age': { brew: 'brew install age', winget: 'winget install --id FiloSottile.age', apt: 'apt install age' },
      'darrenburns/posting': { brew: 'brew install darrenburns/homebrew/posting@beta', go: 'go install github.com/darrenburns/posting/v3/cmd/posting@latest' },
      'nicolargo/glances': { pipx: "pipx install 'glances[all]'", pip: 'pip install glances' },
      'tconbeer/harlequin': { brew: 'brew install harlequin', uvTool: 'uv tool install harlequin' },
      'denisidoro/navi': { brew: 'brew install navi' },
      // LocalSend's README links its Homebrew cask and winget package (the fetched brew line is its separate command-line tool)
      'localsend/localsend': { brew: 'brew install --cask localsend', winget: 'winget install LocalSend.LocalSend' },
      'flameshot-org/flameshot': { brew: 'brew tap flameshot-org/flameshot && brew trust --cask flameshot-org/flameshot/flameshot-org-flameshot && brew install flameshot-org-flameshot', apt: 'apt install flameshot' },
      // Package-manager lines from each README's install section (read November 2, 2026)
      'junegunn/fzf': { brew: 'brew install fzf', winget: 'winget install fzf', scoop: 'scoop install fzf', apt: 'sudo apt install fzf', dnf: 'sudo dnf install fzf', pacman: 'sudo pacman -S fzf' },
      'derailed/k9s': { brew: 'brew install derailed/k9s/k9s', winget: 'winget install k9s', scoop: 'scoop install k9s', pacman: 'pacman -S k9s', dnf: 'dnf install k9s', snap: 'snap install k9s --devmode', go: 'go install github.com/derailed/k9s@latest' },
      'gitui-org/gitui': { brew: 'brew install gitui', winget: 'winget install gitui', scoop: 'scoop install gitui', pacman: 'sudo pacman -S gitui', dnf: 'sudo dnf install gitui' },
      'BurntSushi/ripgrep': { brew: 'brew install ripgrep', winget: 'winget install BurntSushi.ripgrep.MSVC', scoop: 'scoop install ripgrep', apt: 'sudo apt-get install ripgrep', dnf: 'sudo dnf install ripgrep', pacman: 'sudo pacman -S ripgrep' },
      'dandavison/delta': { brew: 'brew install git-delta', winget: 'winget install dandavison.delta', scoop: 'scoop install delta', dnf: 'dnf install git-delta', pacman: 'pacman -S git-delta', cargo: 'cargo install git-delta' },
      'gitleaks/gitleaks': { brew: 'brew install gitleaks', docker: 'docker pull ghcr.io/gitleaks/gitleaks:latest' },
      // From each README's install section (read November 22, 2026)
      'cjpais/Handy': { brew: 'brew install --cask handy', winget: 'winget install cjpais.Handy' },
      'ggml-org/llama.cpp': { curl: 'curl -LsSf https://llama.app/install.sh | sh' },
      'open-webui/open-webui': { pip: 'pip install open-webui' },
      // From each README's install section (read November 22, 2026)
      'Niko1221/Strata': { ps: 'irm -TimeoutSec 120 https://github.com/Niko1221/Strata/releases/latest/download/install.ps1 | iex' },
      'NandhaKishorM/laya': { pip: 'pip install laya' },
      'HKUDS/CLI-Anything': { pip: 'pip install cli-anything-hub' },
      'Graphify-Labs/graphify': { uvTool: 'uv tool install graphifyy', pipx: 'pipx install graphifyy' },
      'usebruno/bruno': { brew: 'brew install bruno', winget: 'winget install Bruno.Bruno' } };
    const i = Object.fromEntries(Object.entries({ ...(l.install || {}), ...(TOOL_INSTALL[repo] || {}) }).map(([k, v]) => [k, v.replace(/\s+#.*$/, '')]));   // drop trailing shell comments
    if (repo === 'ollama/ollama') delete i.pip;
    if (repo === 'astral-sh/uv') delete i.uvTool;
    if (repo === 'Comfy-Org/ComfyUI') delete i.pip;   // README's developer setup, not an install
    if (repo === 'Zackriya-Solutions/meetily') delete i.curl;   // Linux-only script; the download card covers every system
    if (repo === 'aristocratos/btop') delete i.brew;   // README line lists build dependencies, not an install
    if (i.cargo && /--path/.test(i.cargo)) delete i.cargo;
    if (repo === 'vercel-labs/skills') delete i.npx;
    if (repo === 'pi-hole/pi-hole') delete i.curl;   // shown on its own card with the README's caveat
    if (repo === 'derailed/k9s') delete i.curl;
    if (repo === 'jaredpalmer/kev') { delete i.npx; delete i.pip; }   // a separate skill and a cloud account setup, not the install
    if (repo === 'nexu-io/open-design') delete i.curl;   // the script takes the agent's name; the desktop download is the plain route
    if (repo === 'HKUDS/CLI-Anything') delete i.npx;   // installs one of its skills, not the tool
    if (repo === 'ryanbr/noop' || repo === 'TabbyML/tabby') delete i.brew;   // a build tool for developers, not the app
    if (repo === 'OpenCut-app/OpenCut') delete i.ps;   // a developer tool for building it
    if (repo === 'twentyhq/twenty') { delete i.npm; delete i.npx; }   // its app-building CLI and agent skills, not the CRM
    if (repo === 'hcengineering/platform') delete i.npm;   // a build tool for developers
    if (repo === 'coollabsio/coolify' || repo === 'Dokploy/dokploy') delete i.curl;   // shown on a server card below
    if (repo === 'Graphify-Labs/graphify') { delete i.brew; delete i.winget; delete i.curl; delete i.pip; }   // those lines install Python and uv, which Graphify needs first      // a third-party webinstall script; its README lists package managers for every system
    // Desktop apps: installers on each project's releases page (checked in their READMEs, November 1, 2026)
    const DESKTOP = { 'storytold/photocraft': 'macOS, Windows, Linux', 'storytold/pdfcraft': 'macOS, Windows, Linux', 'KnifeLemon/Filee': 'Windows, macOS, Linux',
      'robbietilton/Compositor': 'macOS', 'jub0t/Concat': 'Windows, macOS, Linux', 'crmne/spotifast': 'Linux, macOS, Windows',
      'debpalash/VoiceStudio': 'macOS, Windows, Linux', 'storytold/lightcraft': 'Windows, macOS, Linux',
      'localsend/localsend': 'Windows, macOS, Linux, Android', 'upscayl/upscayl': 'Windows, macOS, Linux', 'qarmin/czkawka': 'Windows, macOS, Linux',
      'flameshot-org/flameshot': 'Windows, Linux', 'keepassxreboot/keepassxc': 'Windows, macOS, Linux', 'syncthing/syncthing': 'Windows, macOS, Linux and more',
      'rustdesk/rustdesk': 'Windows, macOS, Linux, Android',
      'cjpais/Handy': 'Windows, macOS, Linux', 'Zackriya-Solutions/meetily': 'Windows, macOS, Linux', 'AppFlowy-IO/AppFlowy': 'Windows, macOS, Linux',
      'Niko1221/Strata': 'Windows, macOS, Linux', 'FrigadeHQ/hob': 'macOS, Windows, Linux', 'FrigadeHQ/yogurt': 'macOS, Windows, Linux', 'toeverything/AFFiNE': 'Windows, macOS, Linux',
      'genspark-ai/genoffice': 'macOS, Windows, Linux', 'HKUDS/DeepTutor': 'macOS, Windows', 'nexu-io/open-design': 'macOS, Windows',
      'OpenWhispr/openwhispr': 'macOS, Windows, Linux' };
    // Desktop apps whose own site has the download page (each link checked November 22, 2026)
    const SITE_DL = { 'janhq/jan': ['Windows, macOS, Linux', 'https://jan.ai/download', 'Download from jan.ai'],
      'Comfy-Org/ComfyUI': ['Windows, macOS', 'https://www.comfy.org/download', 'Download the ComfyUI desktop app', 'Its README also lists a portable Windows build and a manual install.'],
      'Mintplex-Labs/anything-llm': ['Windows, macOS, Linux', 'https://anythingllm.com/desktop', 'Download AnythingLLM Desktop'],
      'Stirling-Tools/Stirling-PDF': ['Windows, macOS, Linux', 'https://www.stirling.com/download', 'Download Stirling PDF'],
      'actualbudget/actual': ['Windows, macOS, Linux', 'https://actualbudget.org/download', 'Download Actual'],
      'obsproject/obs-studio': ['Windows, macOS, Linux', 'https://obsproject.com/download', 'Download OBS Studio'],
      'open-webui/open-webui': ['macOS, Windows, Linux', 'https://github.com/open-webui/desktop', 'Get the desktop app', 'A separate desktop app from the same team. Open WebUI itself is a chat interface for models you run, like Ollama.'],
      'CapSoftware/Cap': ['macOS, Windows, Linux', 'https://cap.so/download', 'Download Cap'],
      'fastrepl/anarlog': ['macOS, Windows, Linux', 'https://anarlog.so/download', 'Download Anarlog'],
      'dyad-sh/dyad': ['macOS, Windows, Linux', 'https://www.dyad.sh/#download', 'Download Dyad'],
      'usebruno/bruno': ['macOS, Windows, Linux', 'https://www.usebruno.com/downloads', 'Download Bruno'],
      'jellyfin/jellyfin': ['Windows, macOS, Linux', 'https://jellyfin.org/downloads', 'Download Jellyfin', 'Install the server on the computer that holds your films and music, then watch with Jellyfin\'s apps on your TV, phone or browser.'] };
    if (SITE_DL[repo]) { const [to, link, linkText, note] = SITE_DL[repo]; inst.push({ to, how: 'Download', link, linkText, note: note || 'Pick the installer for your computer.' }); }
    // Apps you use in the browser, or host for your household (from each README and website, November 22, 2026)
    if (repo === 'excalidraw/excalidraw') inst.push({ to: 'Any browser', how: 'Web app', link: 'https://excalidraw.com', linkText: 'Open Excalidraw', note: 'Free to use in your browser, nothing to install. Drawings stay in your browser unless you share them.' });
    if (repo === 'penpot/penpot') inst.push({ to: 'Any browser', how: 'Web app', link: 'https://design.penpot.app', linkText: 'Open Penpot', note: 'Free account on Penpot\'s own server. You can also host it yourself with Docker, as its docs explain.' });
    if (repo === 'immich-app/immich') inst.push({ to: 'A home server or always-on computer', how: 'Docker', link: 'https://immich.app/docs/install/docker-compose', linkText: 'Open the install guide', note: 'Runs on a computer at home with Docker, then phone apps back up your photos to it. Claude can walk you through it.' });
    if (repo === 'open-webui/open-webui') inst.push({ to: 'Docker', how: 'Docker', cmds: ['docker run -d -p 3000:8080 --add-host=host.docker.internal:host-gateway -v open-webui:/app/backend/data --name open-webui --restart always ghcr.io/open-webui/open-webui:main'], note: 'From the README. Then open http://localhost:3000.' });
    if (repo === 'Stirling-Tools/Stirling-PDF') inst.push({ to: 'Docker', how: 'Docker', cmds: ['docker run -p 8080:8080 docker.stirlingpdf.com/stirlingtools/stirling-pdf'], note: 'From the README: runs it in your browser at http://localhost:8080.' });
    if (repo === 'Comfy-Org/ComfyUI') inst.push({ to: 'Command line', how: 'comfy-cli', cmds: ['pip install comfy-cli && comfy install'], note: 'From the README.' });
    // From each README (November 22, 2026)
    if (repo === 'ryanbr/noop') inst.push({ to: 'Mac, Android, iPhone', how: 'Download', link: 'https://github.com/ryanbr/noop/releases/latest', linkText: 'Download from GitHub', note: 'Needs a WHOOP 4.0 or 5.0 strap. It isn\'t in the App Store or Google Play: on Android you allow installs from unknown apps, on iPhone you install it through AltStore or SideStore with your own Apple ID, and on a Mac its README shows how to open an app Apple hasn\'t notarized.' });
    if (repo === 'OpenCut-app/OpenCut') inst.push({ to: 'Any browser', how: 'Web app', link: 'https://opencut.app', linkText: 'Open OpenCut', note: 'Nothing to install. The project is being rewritten; its README says opencut.app runs the earlier version, which is the one to use today.' });
    if (repo === 'hoppscotch/hoppscotch') inst.push({ to: 'Any browser', how: 'Web app', link: 'https://hoppscotch.io', linkText: 'Open Hoppscotch', note: 'Free in your browser. Its README also links desktop apps and a self-hosting guide.' });
    if (repo === 'coollabsio/coolify') inst.push({ to: 'A Linux server', how: 'Install script', cmds: ['curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash'], note: 'From the README. Run it on a fresh Linux server, such as a rented VPS. It runs the installer straight from the internet; the README links the script so you can read it first.' });
    if (repo === 'Dokploy/dokploy') inst.push({ to: 'A Linux server', how: 'Install script', cmds: ['curl -sSL https://dokploy.com/install.sh | bash'], note: 'From the README. Run it on a fresh Linux server, such as a rented VPS. It runs the installer straight from the internet.' });
    if (SELF_HOST[repo]) inst.push({ to: 'Your own server', how: 'Self-host', link: SELF_HOST[repo][0], linkText: 'Open the self-hosting guide', note: 'Free when you run it yourself, on a server or an always-on computer, usually with Docker. Claude Code can set it up with you.' + (SELF_HOST[repo][1] ? ' ' + SELF_HOST[repo][1] : '') });
    // App stores linked from LocalSend's README (read November 2, 2026): the easiest install for most people, and the only one for iPhone
    if (repo === 'localsend/localsend') inst.push({ to: 'Windows', how: 'App store', link: 'https://www.microsoft.com/store/apps/9NCB4Z0TZ6RR', linkText: 'Get it from the Microsoft Store' },
      { to: 'Mac, iPhone and iPad', how: 'App store', link: 'https://apps.apple.com/us/app/localsend/id1661733229', linkText: 'Get it from the App Store' },
      { to: 'Android', how: 'App store', link: 'https://play.google.com/store/apps/details?id=org.localsend.localsend_app', linkText: 'Get it on Google Play', note: 'Also on F-Droid and Amazon, its README says.' });
    if (DESKTOP[repo]) inst.push({ to: DESKTOP[repo], how: 'Download', link: `https://github.com/${repo}/releases/latest`, linkText: 'Download from GitHub', note: 'Pick the installer for your computer from the latest release.' });
    // Browser extension and home-server installs, from each README (November 1, 2026)
    if (repo === 'gorhill/uBlock') inst.push({ to: 'Firefox', how: 'Add-on', link: 'https://addons.mozilla.org/addon/ublock-origin/', linkText: 'Get it from Firefox Add-ons' },
      { to: 'Microsoft Edge', how: 'Add-on', link: 'https://microsoftedge.microsoft.com/addons/detail/ublock-origin/odfafepnkmbhccpbejgmiehpchacaeak', linkText: 'Get it from Edge Add-ons', note: 'Google Chrome no longer allows it, as its README notes.' });
    if (repo === 'pi-hole/pi-hole') inst.push({ to: 'A Linux computer or Raspberry Pi on your network', how: 'Install script', cmds: ['curl -sSL https://install.pi-hole.net | bash'], note: 'From the README. It runs the installer straight from the internet; the README also shows how to download and read it first. Then point your router\'s DNS at it.' });
    if (repo === 'Gathin23/cleanyourtv') inst.push({ to: 'With a coding assistant', how: 'Prompt', cmds: ['git clone https://github.com/Gathin23/cleanyourtv'], note: 'Open that folder in Claude Code or Codex, paste PROMPT.md and fill in your TV model. Your computer needs Python 3, a JDK (17 to 22) and the Android SDK, as the README explains. Turn on USB debugging on the TV first.' },
      { to: 'Android phone only', how: 'Separate app', link: 'https://cleanyour.tv/app', linkText: 'Open the phone app page', note: 'A community-built phone app by another developer. Skillshelf hasn\'t checked it.' });
    // One card per system; several commands on a card are alternatives (alt), so the page says "any one of these"
    const mac = [i.brew].filter(Boolean), win = [i.winget, i.scoop, i.ps].filter(Boolean), lin = [i.apt, i.dnf, i.pacman, i.snap].filter(Boolean),
      script = [i.curl].filter(Boolean), dev = [i.uvTool, i.pipx, i.cargo, i.npm, i.go, i.pip].filter(Boolean);
    if (mac.length) inst.push({ to: 'macOS', how: 'Homebrew', cmds: mac, alt: true });
    if (win.length) inst.push({ to: 'Windows', how: win[0].startsWith('winget') ? 'winget' : win[0].startsWith('scoop') ? 'Scoop' : 'PowerShell', cmds: win, alt: true });
    if (lin.length) inst.push({ to: 'Linux', how: 'Package manager', cmds: lin, alt: true, note: 'Use the one for your Linux: apt on Debian and Ubuntu, dnf on Fedora, pacman on Arch.' });
    if (script.length) inst.push({ to: lin.length ? 'macOS & Linux (install script)' : 'macOS & Linux', how: 'Install script', cmds: script });
    if (i.docker) inst.push({ to: 'Any computer with Docker', how: 'Docker', cmds: [i.docker] });
    if (dev.length) inst.push({ to: 'Any computer with developer tools', how: 'From source', cmds: dev, alt: true, note: 'Needs the matching language tools (Rust, Go, Python or Node).' });
    if (repo === 'gitleaks/gitleaks') inst.push({ to: 'Windows, Linux', how: 'Download', link: 'https://github.com/gitleaks/gitleaks/releases/latest', linkText: 'Download from GitHub', note: 'Its README points to ready-made binaries for many systems on the releases page.' });
    if (repo === 'Graphify-Labs/graphify') inst.push({ to: 'Then, in your project', how: 'Add the skill', cmds: ['graphify install'], note: 'From the README. Adds the /graphify skill to Claude Code and other assistants it finds. Graphify needs Python 3.10 or newer and uv.' });
    if (repo === 'dandavison/delta') inst.push({ to: 'All platforms', how: 'Note', text: 'The package is called git-delta in most package managers, but the command it installs is delta.' });
    if (repo === 'vercel-labs/skills') inst.push({ to: 'Any agent', how: 'npx', cmds: ['npx skills add vercel-labs/agent-skills'], note: 'No install needed. Runs through npx; this example adds Vercel\'s skills.' });
    if (repo === 'cli/cli') inst.push({ to: 'Coding agents', how: 'Agent skill', cmds: ['gh skill install cli/cli gh --scope user'], note: 'Installs the gh agent skill. Install GitHub CLI itself first.' });
    // A download from the releases page names the one file each kind of computer needs (data/releases.json)
    for (const o of inst) if (o.link === `https://github.com/${repo}/releases/latest` && RELEASES[repo]) o.files = RELEASES[repo];
    if (!inst.length || repo === 'cli/cli' || repo === 'jqlang/jq') if (!DESKTOP[repo]) inst.push({ to: 'All platforms', how: 'Install guide', link: repo === 'jqlang/jq' ? 'https://github.com/jqlang/jq/releases' : repo === 'cli/cli' ? 'https://github.com/cli/cli#installation' : repo === 'yt-dlp/yt-dlp' ? 'https://github.com/yt-dlp/yt-dlp#installation' : `https://github.com/${repo}#readme`, note: repo === 'jqlang/jq' ? 'Download the binary for your platform from the releases page.' : 'Follow the project\'s install guide.' });
  }
  // Skills whose folder name isn't the name the project goes by (from each README)
  const SKILL_NAME = { 'zubair-trabzada/ai-finance-claude:finance-debt': 'Debt Payoff Strategy', 'zubair-trabzada/ai-finance-claude:finance-goals': 'Financial Goal Planner', 'heygen-com/hyperframes:hyperframes': 'HyperFrames', 'earthtojake/text-to-cad:cad': 'Text-to-CAD', 'Leonxlnx/taste-skill:design-taste-frontend': 'Taste Skill',
    'AgriciDaniel/claude-seo:seo': 'Claude SEO', 'AgriciDaniel/claude-seo:seo-audit': 'SEO Audit', 'AgriciDaniel/claude-seo:seo-local': 'Local SEO', 'cloudflare/security-audit-skill:security-audit': 'Security Audit',
    'trailofbits/skills:sharp-edges': 'Sharp Edges', 'google-labs-code/stitch-skills:stitch::generate-design': 'Stitch Design', 'Jakeschincariol/instagram-agent-skill:ig-reel': 'Instagram Agent',
    'kajisho5/ffmpeg-skill:ffmpeg-skill': 'FFmpeg Skill', 'typesafe-ai/skills:typesafe-ai': 'TypeSafe Jev Skill', 'mvanhorn/last30days-skill:last30days': 'last30days',
    'career-ops-hq/career-ops:career-ops': 'Career-Ops', 'MemPalace/mempalace:mempalace': 'MemPalace', 'GoogleChrome/modern-web-guidance:modern-web-guidance': 'Modern Web Guidance',
    'alibaba/open-code-review:open-code-review': 'Open Code Review', 'vercel-labs/agent-browser:agent-browser': 'agent-browser', 'anthropics/knowledge-work-plugins:triage-nda': 'NDA Triage' };
  const name = CUR.keep[id]?.n || SKILL_NAME[`${repo}:${l.slug}`] || niceName(l.kind === 'skill' ? l.name : l.kind === 'mcp' && l.path ? (SUB[l.slug] || l.name) : (NAME[repo] || l.name));
  L.push({ id, k: l.kind, n: name, sl: l.slug, t: tagline(desc), d: desc, r: repo, u: l.url, p: l.path, nv: !!l.nvidia, tr: TRUSTED.has(owner), g: glyphFor(l.slug + ' ' + desc + ' ' + repo), c: colorFor(id),
    lines: l.lines || null, lic: l.license || null, inst, pl: CUR.keep[id]?.pl || PLAIN[id]?.[0] || null, jb: PLAIN[id]?.[1] || [], lv: PLAIN[id]?.[2] || null,
    vd: (VIDEOS[l.kind === 'mcp' && l.path ? `${repo}:${l.path}` : repo] || []).map(v => [v.kind, v.url, v.label || null, v.id || null]),
    ...(ALTS[id] ? { alt: ALTS[id] } : {}),
    ...(REDUNDANT[id] ? { rd: REDUNDANT[id].why } : {}),
    ...(SERVER.has(repo) ? { sv: 1 } : {}),
    ...(CUR.keep[id]?.pack ? { pk: 1 } : {}),
    ...(HOOKS[l.id] ? { ih: HOOKS[l.id].map(h => ({ f: h.file, s: h.script, c: h.cmd, refs: h.refs })) } : {}) });
  if (!PLAIN[id]) console.error('NO PLAIN TEXT', id);
}

// Purpose-relative check (from purpose_analyze.mjs) and written reviews (reviews.json)
const MR = process.argv[6] && fs.existsSync(process.argv[6]) ? JSON.parse(fs.readFileSync(process.argv[6], 'utf8')) : {};
const REV = JSON.parse(fs.readFileSync(new URL('./reviews.json', import.meta.url), 'utf8'));
// Notes on scanner patterns are written per kind (filekind.mjs); a skill's findings are explained by a reviewer, shown in its scan section
for (const m of Object.values(MR)) if (m?.other) for (const [k, o] of Object.entries(m.other)) { if (m.kind === 'skill') delete m.other[k]; else o.note = otherNote(k, m.kind) || o.note; }

// SkillSpector static-scan reports, one JSON per listing id (from scan.mjs).
// Every high or critical finding carries our review status (findings.mjs), so a page can say plainly what was read and what it was.
const SC = {};
const scanDir = process.argv[5];
const SEV_RANK = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
const ST_RANK = { bad: 0, warn: 1, note: 2, open: 3, cov: 4, ok: 5 };
const NT_RANK = { bad: 0, warn: 1, note: 2 };
const trim = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
let reviewedTotal = 0, openTotal = 0;
for (const l of L) {
  const rev = REV[l.id] || {}, mr = MR[l.id];
  // Things worth knowing before installing: reviewer notes on the listing, plus findings a reviewer marked notice, warning or concern
  const nt = [];
  const addNote = (t, n, lv, where) => {
    const ex = nt.find(x => x.t === t || x.n === n);
    if (ex) { for (const w of where) if (ex.w.length < 3 && !ex.w.some(e => e[0] === w[0] && e[1] === w[1])) ex.w.push(w); if (NT_RANK[lv] < NT_RANK[ex.lv]) ex.lv = lv; return; }
    nt.push({ t, n, lv, w: where.slice(0, 3) });
  };
  for (const x of rev._notices || []) addNote(x.title, x.note, x.level === 'warning' ? 'warn' : x.level === 'concern' ? 'bad' : 'note', x.where || []);
  const f = scanDir && `${scanDir}/${l.id}.json`;
  if (f && fs.existsSync(f)) {
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    // Scoped scans (large repos) report paths relative to the scanned folder
    const scope = fs.existsSync(`${scanDir}/${l.id}.scope.txt`) ? fs.readFileSync(`${scanDir}/${l.id}.scope.txt`, 'utf8').trim() : null;
    // Folders left out of a whole-repository scan (scan_scoped.mjs "-folder,folder"), shown on the page
    const skipped = fs.existsSync(`${scanDir}/${l.id}.exclude.txt`) ? fs.readFileSync(`${scanDir}/${l.id}.exclude.txt`, 'utf8').trim().split(',') : null;
    if (scope) for (const i of j.issues) if (i.location?.file) i.location.file = `${scope}/${i.location.file.replace(/\\/g, '/')}`;
    // rv: status counts; how: how each finding was explained (read line by line, by where it is, by what the listing is for, or by a scanner rule)
    const by = {}, rv = { n: 0, ok: 0, note: 0, warn: 0, bad: 0, cov: 0, open: 0, read: 0, where: 0, purpose: 0, rule: 0 }, st = new Map();
    for (const i of j.issues) {
      by[i.severity] = (by[i.severity] || 0) + 1;
      if (!isSerious(i)) continue;
      const r = findingStatus(i, { id: l.id, k: l.k, ih: l.ih }, rev, mr);
      st.set(i, r); rv.n++; rv[r.s]++; if (r.by && r.s !== 'cov') rv[r.by]++;
      if (NT_RANK[r.s] != null && r.n) addNote(r.t || { note: 'Worth knowing', warn: 'A risk to know about', bad: 'Looks harmful' }[r.s], r.n, r.s, i.location?.file ? [[i.location.file, i.location.start_line || null]] : []);
    }
    reviewedTotal += rv.n - rv.open; openTotal += rv.open;
    // Findings that need a reader's attention first, then the rest by severity
    const key = i => st.has(i) ? ST_RANK[st.get(i).s] : 9;
    // Findings with the same review explanation are shown once, with where else they occur
    const sorted = [...j.issues].sort((a, b) => key(a) - key(b) || (SEV_RANK[a.severity] ?? 9) - (SEV_RANK[b.severity] ?? 9) || (b.confidence || 0) - (a.confidence || 0));
    const groups = [], gi = new Map();
    for (const i of sorted) {
      const r = st.get(i), k = r?.n ? `${r.s}|${r.n}|${i.category}` : null;
      if (k && gi.has(k)) { const g = gi.get(k); g.n++; if (g.more.length < 6) g.more.push([i.location?.file || '', i.location?.start_line || null]); continue; }
      if (groups.length >= 20) continue;
      const g = { i, n: 1, more: [] }; groups.push(g); if (k) gi.set(k, g);
    }
    const top = groups.map(({ i, n, more }) => [i.severity, i.id, i.category, trim(i.pattern, 120), i.location?.file || '', i.location?.start_line || null, trim(i.finding, 140), trim(i.explanation, 220), i.confidence ?? null,
      st.get(i)?.s || null, st.has(i) && st.get(i).n ? trim(st.get(i).n, 260) : null, st.get(i)?.by || null, n, more]);
    const ac = j.analysis_completeness || {};
    SC[l.id] = { s: j.risk_assessment.score, sev: j.risk_assessment.severity, rec: j.risk_assessment.recommendation, n: j.issues.length, by, rv,
      files: j.components?.length || 0, exe: !!j.metadata?.has_executable_scripts, ver: j.metadata?.skillspector_version, at: j.skill?.scanned_at?.slice(0, 10),
      cov: ac.coverage_percent ?? null, scope, skipped, top };
  }
  // Purpose-check notices for findings outside the scan's serious set (e.g. medium findings a reviewer flagged)
  for (const x of mr?.notices || []) addNote(x.title, x.note, x.level === 'warning' ? 'warn' : 'note', x.where || []);
  if (nt.length) l.nt = nt.sort((a, b) => NT_RANK[a.lv] - NT_RANK[b.lv]);
}

// Skillshelf no longer scans new listings (November 22, 2026): the setup prompt visitors copy asks their own Claude to read
// the code on their computer before installing. Listings without a scan report are listed and say "Not scanned by Skillshelf".
if (scanDir) { const unscanned = L.filter(l => !SC[l.id]); if (unscanned.length) console.error('NOT SCANNED (listed; the visitor\'s Claude checks):', unscanned.map(l => l.id).join(', ')); }

// GitHub's own trending lists, read at build time (data/trending.json); the page shows only repositories listed here
const TRF = new URL('../data/trending.json', import.meta.url);
const TR = fs.existsSync(TRF) ? JSON.parse(fs.readFileSync(TRF, 'utf8')) : null;
if (TR) for (const k of ['daily', 'weekly', 'monthly']) TR[k] = (TR[k] || []).filter(([repo]) => L.some(l => l.r === repo));

// Digest issues (pipeline/digest.mjs), newest first
const DGD = new URL('../data/digests/', import.meta.url);
const DG = fs.existsSync(DGD) ? fs.readdirSync(DGD).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(new URL(f, DGD), 'utf8'))).sort((a, b) => b.to.localeCompare(a.to) || a.type.localeCompare(b.type)) : [];

// Head-to-head tests (tests/<id>/results.json): the same task for several skills and plain Claude, judged blind. Newest first.
const TD = new URL('../tests/', import.meta.url);
const TESTS = fs.existsSync(TD) ? fs.readdirSync(TD).filter(d => fs.existsSync(new URL(`${d}/results.json`, TD))).map(d => JSON.parse(fs.readFileSync(new URL(`${d}/results.json`, TD), 'utf8')))
  // Every contestant stays in its test, even one no longer on the shelves (its page then has no link to a listing)
  .sort((a, b) => b.date.localeCompare(a.date)) : [];
const LG = Object.fromEntries(Object.entries(LOGOS).filter(([k, v]) => !k.startsWith('_') && v?.img && L.some(l => l.r === k)).map(([k, v]) => [k, v.img]));
const DATA = { gen: d.generated.slice(0, 10), L, R, AV: d.avatars, LG, SC, MR, TR, DG, TESTS };
// Each skill's install name in the Skillshelf marketplace (plugin@skillshelf), filled in below, so listing pages can offer it
const MK = {};

// The Checkup's copy of Skillshelf's checks (checkup/skills/skillshelf-checkup/skillshelf-data.json): every listed skill with its label and notes,
// plus groups of skills that do the same job, so the Checkup can say "you have two of these, keep one".
// The chat connector's copy of the catalog (connector/src/catalog.json): what each listing is, its check, what it uses and how to install it
const CONNECTOR_DIR = new URL('../connector/src/', import.meta.url);
if (fs.existsSync(CONNECTOR_DIR)) {
  const lab = l => { const nt = l.nt || [], w = nt.filter(x => x.lv === 'warn').length, n = nt.filter(x => x.lv === 'note').length;
    return nt.some(x => x.lv === 'bad') ? 'Looks harmful' : MR[l.id]?.verdict === 'flag' ? 'Flagged' : MR[l.id]?.verdict === 'review' ? 'Does more than stated' : w ? `${w} risk${w > 1 ? 's' : ''} to know` : n ? `${n} thing${n > 1 ? 's' : ''} to know` : 'No issues found'; };
  const cat = { generated: DATA.gen, site: 'https://claude.ai/artifact/FPBcjYdeXFHDF2zDMqhGCG', listings: L.map(l => {
    const m = MR[l.id], r = R[l.r];
    return { id: l.id, name: l.n, kind: l.k, by: r.on, company: !!l.tr, repo: l.r, path: l.p || '', slug: l.sl, plain: l.pl || l.t, about: String(l.d || '').slice(0, 300),
      jobs: l.jb || [], level: l.lv || null, check: lab(l), notes: (l.nt || []).map(x => ({ title: x.t, level: x.lv, note: x.n })),
      uses: m && !m.codeFree ? m.caps.filter(c => c.found && c.expected).map(c => [c.k, c.why]) : m?.codeFree ? 'instructions only' : null,
      install: l.inst.filter(o => !o.scan).map(o => ({ to: o.to, how: o.how, ...(o.agentCmd ? { cmd: `${o.agentCmd} --agent claude-code` } : o.cmds?.length ? { cmd: o.cmds[0] } : {}), ...(o.link ? { link: o.link } : {}) })).slice(0, 4),
      stars: r.st, checkedCommit: r.cm || null };
  }) };
  // The Skillshelf plugin marketplace (.claude-plugin/marketplace.json): skills with no serious risk, pinned to the checked commit.
  // Each listing in it gets its install name (plugin@skillshelf), so the connector can offer the one-click route.
  const { marketplace: mk, skipped } = buildMarketplace(cat, commitsFrom(SOURCES), branchesFrom(d));
  cat.marketplace = { name: MARKETPLACE, repo: MARKETPLACE_REPO };
  for (const l of cat.listings) { const n = installName(mk, l.id); if (n) l.plugin = n; }
  for (const l of cat.listings) if (l.plugin) MK[l.id] = l.plugin;
  fs.writeFileSync(new URL('catalog.json', CONNECTOR_DIR), JSON.stringify(cat) + '\n');
  console.error('connector catalog:', cat.listings.length, 'listings');
  console.error('marketplace:', mk.plugins.length, 'skills, written to', writeMarketplace(mk), 'left out:', JSON.stringify(skipped));
}
// Quoted code can hold strings shaped like keys or tokens (a scanner's test samples, a README's example). The page never
// shows one: anything in a known credential format becomes [redacted], so neither visitors nor secret scanners see it.
const SECRET_SHAPES = [/\bapi_org_[A-Za-z0-9]{20,}/g, /\bhf_[A-Za-z0-9]{30,}/g, /\bgh[pousr]_[A-Za-z0-9]{30,}/g, /\bgithub_pat_[A-Za-z0-9_]{40,}/g,
  /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{30,}/g, /\bxox[baprs]-[A-Za-z0-9-]{20,}/g, /\bAKIA[0-9A-Z]{16}\b/g, /\bAIza[0-9A-Za-z_-]{35}\b/g,
  /\bglpat-[A-Za-z0-9_-]{20,}/g, /\bnpm_[A-Za-z0-9]{36}\b/g, /\bsk_live_[A-Za-z0-9]{20,}/g, /-----BEGIN [A-Z ]*PRIVATE KEY-----/g];
const redactSecrets = s => SECRET_SHAPES.reduce((t, re) => t.replace(re, '[redacted]'), s);
// The store page, written once the marketplace install names are known
{
  const json = redactSecrets(JSON.stringify({ ...DATA, MK })).replace(/</g, '\\u003c');
  const tpl = fs.readFileSync(tplPath, 'utf8');
  // A function replacement, so "$'" or "$&" inside scanned text is inserted literally
  fs.writeFileSync(outPath, tpl.replace('/*__DATA__*/null', () => json));
}
const CHECKUP_DIR = new URL('../checkup/skills/skillshelf-checkup/', import.meta.url);
if (fs.existsSync(CHECKUP_DIR)) {
  const GROUPS = {
    'design-look': ['the same job: making pages look designed, not generated', ['anthropics-frontend-design', 'leonxlnx-design-taste-frontend', 'pbakaus-impeccable', 'nutlope-hallmark']],
    'humanize': ['the same job: making AI text sound human', ['blader-humanizer', 'wshobson-avoid-ai-writing']],
    'seo-audit': ['the same job: auditing a site for SEO', ['agricidaniel-seo', 'agricidaniel-seo-audit', 'alirezarezvani-seo-audit']],
    'debugging': ['the same job: finding the cause of a bug', ['obra-systematic-debugging', 'addyosmani-debugging-and-error-recovery']],
  };
  const groupOf = id => Object.entries(GROUPS).find(([, [, ids]]) => ids.includes(id));
  // The label a listing gets on the site (one scale: no issues, things to know, risks, flagged)
  const label = l => { const nt = l.nt || [], w = nt.filter(x => x.lv === 'warn').length, n = nt.filter(x => x.lv === 'note').length, bad = nt.some(x => x.lv === 'bad');
    return bad ? 'Looks harmful' : MR[l.id]?.verdict === 'flag' ? 'Flagged' : MR[l.id]?.verdict === 'review' ? 'Does more than stated' : w ? `${w} risk${w > 1 ? 's' : ''} to know` : n ? `${n} thing${n > 1 ? 's' : ''} to know` : 'No issues found'; };
  const data = { generated: DATA.gen, site: 'https://claude.ai/artifact/FPBcjYdeXFHDF2zDMqhGCG',
    listings: L.filter(l => l.k === 'skill').map(l => { const g = groupOf(l.id);
      return { id: l.id, slug: l.sl, name: l.n, description: String(l.d || '').slice(0, 400), repo: l.r, path: l.p, label: label(l),
        notes: (l.nt || []).map(x => ({ title: x.t, level: x.lv })), ...(g ? { group: g[0], groupLabel: g[1][0] } : {}) }; }) };
  fs.writeFileSync(new URL('skillshelf-data.json', CHECKUP_DIR), JSON.stringify(data) + '\n');
  console.error('checkup data:', data.listings.length, 'skills');
}
console.error('listings', L.length, 'skills', L.filter(x => x.k === 'skill').length, 'mcp', L.filter(x => x.k === 'mcp').length, 'tools', L.filter(x => x.k === 'tool').length,
  'scanned', Object.keys(SC).length, 'serious reviewed', reviewedTotal, 'open', openTotal, 'anth plugins mapped', Object.keys(anthPlugin).length, 'hn kept', Object.values(R).reduce((a, r) => a + (r.hn?.length || 0), 0), 'bytes', fs.statSync(outPath).size);
