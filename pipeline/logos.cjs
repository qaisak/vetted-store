// Finds each project's own logo, so listings don't show the developer's profile photo as an app icon.
// Only for repositories owned by a person: an organisation's avatar is usually its logo already.
// Candidates come from the top of the README (an image named or labelled logo/icon) and from the repository's files
// (logo.png, icon.svg, app icons). Each is drawn at 128x128 in a browser; wide banners and screenshots are rejected.
// Output: data/logos.json, { "owner/repo": { src, img } } with img a PNG data URL. Run with NODE_PATH pointing at playwright.
// Usage: node pipeline/logos.cjs [data/data.json] [data/logos.json] [--only owner/repo,...]
const fs = require('fs');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const [dataPath = 'data/data.json', outPath = 'data/logos.json'] = process.argv.slice(2).filter(a => !a.startsWith('--') && !a.includes(','));
const onlyI = process.argv.indexOf('--only');
const ONLY = onlyI > 0 ? new Set(process.argv[onlyI + 1].toLowerCase().split(',')) : null;
// Organisations whose separate products would otherwise all show the same company avatar
const MULTI = new Set(['FrigadeHQ', 'HKUDS']);
const d = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const out = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, 'utf8')) : {};
const gh = p => { try { return JSON.parse(execFileSync('gh', ['api', p], { encoding: 'utf8', maxBuffer: 64e6, stdio: ['ignore', 'pipe', 'ignore'] })); } catch { return null; } };

const NOT_LOGO = /shields\.io|badge|badgen|workflows|star-history|contrib\.rocks|codecov|screenshot|screen-shot|demo|preview|banner|social|sponsor|discord|twitter|youtube|gif$|\.gif\?|readme-stats|trendshift|producthunt|vercel\.com\/button|deploy|buymeacoffee|ko-fi|repobeats|hits\.|visitor|wakatime|stars?\.svg|zread|deepwiki|_preview|cover/i;
function candidates(repo, branch, readme, tree) {
  const raw = p => `https://raw.githubusercontent.com/${repo}/${branch}/${p.replace(/^\.?\//, '')}`;
  const abs = s => /^https?:\/\//.test(s) ? s.replace(/github\.com\/([^/]+\/[^/]+)\/(?:blob|raw)\//, 'raw.githubusercontent.com/$1/') : raw(s);
  const out = [];
  // The top of the README: images whose file name or label says logo or icon come first
  const top = (readme || '').split(/\r?\n/).slice(0, 60).join('\n');
  const imgs = [...top.matchAll(/<img[^>]*?src=["']([^"']+)["'][^>]*>/gi)].map(m => ({ src: m[1], tag: m[0] }))
    .concat([...top.matchAll(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g)].map(m => ({ src: m[2], tag: m[1] })));
  for (const { src, tag } of imgs) {
    if (NOT_LOGO.test(src)) continue;
    const named = /logo|icon|mark|brand/i.test(src + ' ' + tag);
    out.push({ url: abs(src), score: named ? 3 : 1, why: 'readme' });
  }
  // Files in the repository named like a logo or an app icon
  for (const t of tree || []) {
    if (t.type !== 'blob' || /node_modules|test|fixture|example|vendor|third.?party|\/dist\//i.test(t.path)) continue;
    const name = t.path.split('/').pop().toLowerCase();
    if (!/\.(png|svg|webp|jpe?g)$/.test(name) || NOT_LOGO.test(t.path)) continue;
    let s = 0;
    if (/^(logo|icon|app[-_]?icon)(@\dx)?\.(png|svg|webp)$/.test(name)) s = 2.6;
    else if (/^(logo|icon|app[-_]?icon)[-_.](\d+|light|dark|square|round|color|512x512|256x256|128x128|1024)/.test(name)) s = 2.4;
    else if (/logo|appicon|app-icon/.test(name)) s = 2;
    else if (/src-tauri\/icons\/(icon|128x128@2x|128x128)\.png$/i.test(t.path)) s = 2.5;
    if (!s) continue;
    if (/dark/.test(name)) s -= 0.3;
    if (/(^|\/)(assets|docs|\.github|public|resources|build|static|images?|media|brand|art|logo)\//i.test(t.path)) s += 0.2;
    s -= t.path.split('/').length * 0.05;
    out.push({ url: raw(t.path), score: s, why: t.path });
  }
  const seen = new Set();
  return out.sort((a, b) => b.score - a.score).filter(c => !seen.has(c.url) && seen.add(c.url)).slice(0, 5);
}

(async () => {
  const b = await chromium.launch({ channel: process.env.PW_CHANNEL || 'chrome' });
  const page = await b.newPage();
  const repos = Object.values(d.repos).filter(m => m && (m.ownerType === 'User' || MULTI.has(m.owner)) && (!ONLY || ONLY.has(m.full.toLowerCase())));
  let found = 0;
  for (const m of repos) {
    if (out._rejected?.[m.full]) continue;   // checked by eye: not the project's own logo
    if (out[m.full] && !ONLY) { found++; continue; }
    const rd = gh(`repos/${m.full}/readme`);
    const readme = rd ? Buffer.from(rd.content, 'base64').toString('utf8') : '';
    const tree = gh(`repos/${m.full}/git/trees/${m.branch}?recursive=1`)?.tree;
    let got = null;
    for (const c of candidates(m.full, m.branch, readme, tree)) {
      // Draw it on a 128x128 canvas: full-bleed when its corners are opaque (an app icon), padded on white when transparent (a mark)
      got = await page.evaluate(async (url) => {
        const img = new Image(); img.crossOrigin = 'anonymous';
        const ok = await new Promise(r => { img.onload = () => r(true); img.onerror = () => r(false); img.src = url; setTimeout(() => r(false), 12000); });
        if (!ok || !img.naturalWidth) return null;
        const w = img.naturalWidth, h = img.naturalHeight, ratio = w / h;
        if (ratio > 1.6 || ratio < 0.62 || Math.max(w, h) < 48) return null;
        const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
        const probe = document.createElement('canvas'); probe.width = probe.height = 64; const px = probe.getContext('2d'); px.drawImage(img, 0, 0, 64, 64);
        const a = [[1, 1], [62, 1], [1, 62], [62, 62]].map(([i, j]) => px.getImageData(i, j, 1, 1).data[3]);
        const bleed = a.every(v => v > 230) && Math.abs(ratio - 1) < 0.08;
        if (bleed) x.drawImage(img, 0, 0, 128, 128);
        else { x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, 128, 128); const s = 92 / Math.max(w, h); x.drawImage(img, (128 - w * s) / 2, (128 - h * s) / 2, w * s, h * s); }
        try { return c.toDataURL('image/png'); } catch { return null; }
      }, c.url).catch(() => null);
      if (got) { out[m.full] = { src: c.url, img: got }; found++; break; }
    }
    console.log(got ? 'LOGO' : 'none', m.full, got ? out[m.full].src.replace(/^https:\/\/raw\.githubusercontent\.com\//, '') : '');
  }
  await b.close();
  fs.writeFileSync(outPath, JSON.stringify(out, null, 1) + '\n');
  console.log(`logos ${found} of ${repos.length} person-owned repositories`);
})();
