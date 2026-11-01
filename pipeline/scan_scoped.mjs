// Scans only the main source folder of repos whose whole-repo scan timed out.
// Writes <id>.json plus <id>.scope.txt (the folder scanned) next to the other reports.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = process.argv[2] || process.env.VETTED_SCAN_ROOT;
const EXE = process.env.SKILLSPECTOR || 'skillspector';
if (!ROOT) throw new Error('Usage: node scan_scoped.mjs <scan-root> [<id> <repo-dir> <scope> ...]');
// Default jobs, or triples from the command line: listing id, repo folder under <scan-root>, folder to scan inside it
const ARGS = process.argv.slice(3);
const JOBS = ARGS.length ? Array.from({ length: Math.floor(ARGS.length / 3) }, (_, i) => ({ id: ARGS[i * 3], dir: ARGS[i * 3 + 1], scope: ARGS[i * 3 + 2] })) : [
  { id: 'mcp-zotero-mcp', dir: 'src/54yyyu__zotero-mcp/zotero-mcp-main', scope: 'src/zotero_mcp' },
  { id: 'mcp-codebase-memory-mcp', dir: 'src/DeusData__codebase-memory-mcp/codebase-memory-mcp-main', scope: 'src' },
  { id: 'mcp-mcp-chrome', dir: 'src/hangwin__mcp-chrome/mcp-chrome-master', scope: 'app' },
  // November 1, 2026: repositories whose whole-repo scan passed the 15-minute limit
  { id: 'skillspector', dir: 'src/NVIDIA__SkillSpector/SkillSpector-main', scope: 'src' },
  { id: 'github-cli', dir: 'src/cli__cli/cli-trunk', scope: 'pkg/cmd' },
  { id: 'uv', dir: 'src/astral-sh__uv/uv-main', scope: 'crates/uv' },
  { id: 'trivy', dir: 'src/aquasecurity__trivy/trivy-main', scope: 'pkg/commands' },
  { id: 'semgrep', dir: 'src/semgrep__semgrep/semgrep-develop', scope: 'cli/src/semgrep' },
  { id: 'mise', dir: 'src/jdx__mise/mise-main', scope: 'src' },
  { id: 'yt-dlp', dir: 'src/yt-dlp__yt-dlp/yt-dlp-master', scope: 'yt_dlp' },
  { id: 'difftastic', dir: 'src/Wilfred__difftastic/difftastic-master', scope: 'src' },
  { id: 'lazygit', dir: 'src/jesseduffield__lazygit/lazygit-master', scope: 'pkg' },
  { id: 'ollama', dir: 'src/ollama__ollama/ollama-main', scope: 'server' },
  { id: 'lazydocker', dir: 'src/jesseduffield__lazydocker/lazydocker-master', scope: 'pkg' },
  { id: 'posting', dir: 'src/darrenburns__posting/posting-main', scope: 'internal' },
  { id: 'harlequin', dir: 'src/tconbeer__harlequin/harlequin-main', scope: 'src/harlequin' },
  { id: 'visidata', dir: 'src/saulpw__visidata/visidata-develop', scope: 'visidata' },
  { id: 'glances', dir: 'src/nicolargo__glances/glances-develop', scope: 'glances' },
  { id: 'k9s', dir: 'src/derailed__k9s/k9s-master', scope: 'internal' },
];

await Promise.all(JOBS.map(({ id, dir, scope }) => new Promise(resolve => {
  const t0 = Date.now();
  const p = spawn(EXE, ['scan', path.join(ROOT, dir, scope), '--no-llm', '--format', 'json'], { windowsHide: true });
  let out = '';
  const timer = setTimeout(() => p.kill(), 45 * 60 * 1000);
  p.stdout.on('data', b => out += b);
  p.on('close', code => {
    clearTimeout(timer);
    try {
      JSON.parse(out);
      fs.writeFileSync(path.join(ROOT, 'out', id + '.json'), out);
      fs.writeFileSync(path.join(ROOT, 'out', id + '.scope.txt'), scope);
      fs.rmSync(path.join(ROOT, 'out', id + '.err.txt'), { force: true });
      console.error(id, 'ok', Math.round((Date.now() - t0) / 1000) + 's');
    } catch (e) { console.error(id, 'FAILED exit', code, Math.round((Date.now() - t0) / 1000) + 's'); }
    resolve();
  });
})));
