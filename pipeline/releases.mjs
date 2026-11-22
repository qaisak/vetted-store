// For desktop apps installed from GitHub releases: the one file each kind of computer needs, so "Download" can be
// "Download for Mac" instead of a page of files named .dmg, .msi and .AppImage.
// Reads the latest release of each app repository through the GitHub API (gh api) and writes data/releases.json:
// { "owner/repo": { "v": tag, "d": "YYYY-MM-DD", "mac": [file name, url], "win": [...], "linux": [...] } }.
// Usage: node pipeline/releases.mjs [data/data.json] [data/releases.json]
import fs from 'fs';
import { execFileSync } from 'child_process';

const [dataPath = 'data/data.json', outPath = 'data/releases.json'] = process.argv.slice(2);
const d = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const repos = [...new Set(d.listings.filter(l => l.kind === 'tool').map(l => l.repo))].sort();
const gh = p => { try { return JSON.parse(execFileSync('gh', ['api', p], { encoding: 'utf8', maxBuffer: 64e6, stdio: ['ignore', 'pipe', 'ignore'] })); } catch { return null; } };

// Never an installer: checksums, signatures, update feeds, debug symbols, source archives
const NOT = /\.(sig|asc|sha\d*|sha256sum|md5|blockmap|yml|yaml|json|txt|pem|pdb|dSYM|zsync|apk|aab|ipa)$|sha256|checksums?|source|src\.|symbols|debug|\.tar\.gz\.|latest/i;
const score = (n, os) => {
  if (NOT.test(n)) return -1;
  const x = n.toLowerCase();
  // A command-line or 32-bit build only when there is nothing else
  const pen = (/(^|[^a-z])cli([^a-z]|$)/.test(x) ? -12 : 0) + (/32-?bit|i386|i686/.test(x) ? -6 : 0) + (/unsigned/.test(x) ? -5 : 0);
  if (os === 'mac') {
    const ext = /\.dmg$/.test(x) ? 30 : /\.pkg$/.test(x) ? 25 : /(mac|darwin|osx|macos).*\.zip$|\.app\.zip$/.test(x) ? 15 : -1;
    if (ext < 0) return -1;
    return pen + ext + (/universal/.test(x) ? 6 : /arm64|aarch64|apple|silicon|\bm1\b/.test(x) ? 5 : /x64|x86_64|intel|amd64/.test(x) ? 1 : 3);
  }
  if (os === 'win') {
    if (/arm-?64|aarch64/.test(x) && !/x64|x86_64|amd64/.test(x)) return -1;
    if (/darwin|apple|macos|osx|linux/.test(x)) return -1;
    const ext = /\.exe$/.test(x) ? 25 : /\.msi$/.test(x) ? 22 : /\.msix$/.test(x) ? 12 : /(^|[^a-z])(win|windows|win64|win32)([^a-z]|$).*\.zip$/.test(x) ? 10 : -1;
    if (ext < 0) return -1;
    return pen + ext +(/setup|install/.test(x) ? 6 : 0) + (/portable/.test(x) ? -4 : 0) + (/x64|x86_64|amd64|win64/.test(x) ? 2 : /x86|win32|i386|i686/.test(x) ? -3 : 0);
  }
  if (/arm64|aarch64|armv7|armhf/.test(x) && !/x86_64|amd64|x64/.test(x)) return -1;
  const ext = /\.appimage$/.test(x) ? 30 : /\.deb$/.test(x) ? 22 : /\.rpm$/.test(x) ? 15 : /\.flatpak$/.test(x) ? 12 : /linux.*\.(tar\.gz|tgz|tar\.xz|zip)$/.test(x) ? 8 : -1;
  return ext < 0 ? -1 : pen + ext + (/x86_64|amd64|x64/.test(x) ? 2 : 0);
};
const best = (assets, os) => assets.map(a => [score(a.name, os), a]).filter(([s]) => s >= 0).sort((a, b) => b[0] - a[0])[0]?.[1];

const out = {};
for (const repo of repos) {
  const r = gh(`repos/${repo}/releases/latest`);
  if (!r || !r.assets?.length) continue;
  const e = { v: r.tag_name, d: (r.published_at || '').slice(0, 10) };
  for (const os of ['mac', 'win', 'linux']) { const a = best(r.assets, os); if (a) e[os] = [a.name, a.browser_download_url]; }
  if (e.mac || e.win || e.linux) out[repo] = e;
  process.stdout.write('.');
}
fs.writeFileSync(outPath, JSON.stringify({ _about: 'One installer per kind of computer from each app\'s latest GitHub release (pipeline/releases.mjs). Download buttons use these; the releases page stays one click away.', ...out }, null, 1) + '\n');
console.log(`\nreleases: ${Object.keys(out).length} of ${repos.length} app repositories have installers`);
