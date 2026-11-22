// Reads GitHub's own trending lists (github.com/trending, all languages) into data/trending.json.
// Each entry: [repo, total stars, stars gained in the period, rank on the list]. The site shows only repositories it lists.
// Usage: node pipeline/trending.mjs [data/trending.json]
import fs from 'node:fs';

const OUT = process.argv[2] || new URL('../data/trending.json', import.meta.url);
const num = s => Number(String(s || '').replace(/[^0-9]/g, '')) || 0;

async function read(since) {
  const res = await fetch(`https://github.com/trending?since=${since}`, { headers: { 'User-Agent': 'Mozilla/5.0 (trending reader)', Accept: 'text/html' } });
  if (!res.ok) throw new Error(`github.com/trending?since=${since}: ${res.status}`);
  const html = await res.text();
  const rows = html.split('<article class="Box-row">').slice(1);
  return rows.map((row, i) => {
    const repo = (row.match(/<h2[^>]*>[\s\S]*?href="\/([^"]+)"/) || [])[1];
    const total = num((row.match(/href="\/[^"]+\/stargazers"[^>]*>[\s\S]*?<\/svg>\s*([\d,]+)/) || [])[1]);
    const gained = num((row.match(/([\d,]+)\s+stars?\s+(today|this week|this month)/) || [])[1]);
    return repo && [repo, total, gained, i + 1];
  }).filter(Boolean);
}

const out = {
  _about: `GitHub's own trending lists (github.com/trending, all languages), read ${new Date().toISOString().slice(0, 10)}. Each entry: [repo, total stars, stars gained in the period, rank on the list]. Only repositories listed on Skillshelf appear on the site.`,
  read: new Date().toISOString().slice(0, 10), source: 'https://github.com/trending',
};
for (const since of ['daily', 'weekly', 'monthly']) out[since] = await read(since);
fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
for (const since of ['daily', 'weekly', 'monthly']) console.log(since, out[since].length, out[since].slice(0, 25).map(([r, t, g]) => `${r} +${g}`).join(' | '));
