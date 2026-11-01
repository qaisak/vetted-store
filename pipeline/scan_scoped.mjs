// Scans only the main source folder of repos whose whole-repo scan timed out.
// Writes <id>.json plus <id>.scope.txt (the folder scanned) next to the other reports.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = process.argv[2] || process.env.VETTED_SCAN_ROOT;
const EXE = process.env.SKILLSPECTOR || 'skillspector';
if (!ROOT) throw new Error('Usage: node scan_scoped.mjs <scan-root>');
const JOBS = [
  { id: 'mcp-zotero-mcp', dir: 'src/54yyyu__zotero-mcp/zotero-mcp-main', scope: 'src/zotero_mcp' },
  { id: 'mcp-codebase-memory-mcp', dir: 'src/DeusData__codebase-memory-mcp/codebase-memory-mcp-main', scope: 'src' },
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
