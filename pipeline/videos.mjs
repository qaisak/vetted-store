// Finds demo videos that projects link in their own README: YouTube links and videos uploaded to GitHub.
// Usage: node pipeline/videos.mjs data/data.json data/videos.json
// Only links the project itself put in its README are kept, so every video shown is one its developer chose.
import fs from 'node:fs';

const [, , dataPath, outPath] = process.argv;
const d = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const out = {};
const YT = /https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/g;
const GH = /https:\/\/github\.com\/user-attachments\/assets\/[0-9a-f-]{36}/g;
// Skip badges, channel links and star-history images that aren't videos of the project
// Reviewed by hand: links that aren't demos of the project (checked November 1, 2026)
const EXCLUDE = new Set(['N4E2B_k2Bss' /* lazygit: "kidpix style" joke link */, 'ODaHJzOyVCQ' /* youtube-transcript: sample input */]);
const near = (text, i) => text.slice(Math.max(0, i - 160), i + 40).toLowerCase();

const listings = d.listings;
const repos = [...new Set(listings.map(l => l.repo))];
for (const repo of repos) {
  const m = d.repos[repo] || Object.values(d.repos).find(x => x?.full === repo);
  if (!m) continue;
  const paths = new Set(['README.md', ...listings.filter(l => l.repo === repo && l.kind === 'mcp' && l.path).map(l => `${l.path}/README.md`)]);
  for (const p of paths) {
    let text = '';
    try { const r = await fetch(`https://raw.githubusercontent.com/${m.full}/${m.branch}/${p}`); if (r.ok) text = await r.text(); } catch (e) { continue; }
    if (!text) continue;
    const vids = [];
    const inCode = i => (text.slice(0, i).match(/^\s*```/gm) || []).length % 2 === 1;   // example commands, not demos
    // The README's own words just before the link, as a label: [label](url) or a heading/line before it
    const labelAt = i => { const before = text.slice(Math.max(0, i - 300), i); const m = before.match(/\[([^\]]{4,90})\]\($/) || before.match(/(?:^|\n)#+\s*([^\n]{3,60})\n[^#]*$/);
      const label = m ? m[1].replace(/!\[[^\]]*\]|[*_`]/g, '').replace(/^[^\p{L}\p{N}"]+/u, '').trim() : null;
      return label && !/[<>]|https?:/.test(label) ? label : null; };
    for (const mm of text.matchAll(YT)) {
      const ctx = near(text, mm.index);
      if (/subscribe|channel|sponsor/.test(ctx) || inCode(mm.index) || EXCLUDE.has(mm[1])) continue;
      if (!vids.some(v => v.id === mm[1])) vids.push({ kind: 'youtube', id: mm[1], url: `https://www.youtube.com/watch?v=${mm[1]}`, label: labelAt(mm.index) });
    }
    for (const mm of text.matchAll(GH)) {
      // GitHub renders a bare asset URL on its own line as a video player; images use ![...](...) or <img>
      const line = text.slice(text.lastIndexOf('\n', mm.index) + 1, text.indexOf('\n', mm.index) === -1 ? undefined : text.indexOf('\n', mm.index)).trim();
      if (line !== mm[0] && !/<video[^>]*src=["']?$/.test(text.slice(Math.max(0, mm.index - 40), mm.index))) continue;
      if (inCode(mm.index)) continue;
      if (!vids.some(v => v.url === mm[0])) vids.push({ kind: 'github', url: mm[0], label: labelAt(mm.index) });
    }
    if (vids.length) out[`${m.full}${p === 'README.md' ? '' : ':' + p.replace(/\/README\.md$/, '')}`] = vids.slice(0, 3);
  }
}
fs.writeFileSync(outPath, JSON.stringify({ _about: `Demo videos linked in each project's own README, collected ${new Date().toISOString().slice(0, 10)}.`, ...out }, null, 2) + '\n');
console.error(Object.keys(out).length, 'repos with demo videos');
