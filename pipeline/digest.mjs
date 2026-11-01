// Writes the Digest issues (weekly, monthly, yearly) from data already collected: GitHub's trending lists
// (data/trending.json), launch dates and stars (data/data.json), and the date each repo was added to Vetted.
// Usage: node pipeline/digest.mjs [data/data.json] [data/trending.json] [data/digests]
// Each issue is a dated file. Past issues are never rewritten, so the archive keeps what was true at the time;
// the current week's, month's and year's issues are refreshed when this runs again with newer data.
// Issues store repositories and numbers only; the site matches them to listings and leaves out anything not listed.
import fs from 'node:fs';
import path from 'node:path';

const [, , dataPath = 'data/data.json', trendPath = 'data/trending.json', outDir = 'data/digests'] = process.argv;
const d = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const T = JSON.parse(fs.readFileSync(trendPath, 'utf8'));
fs.mkdirSync(outDir, { recursive: true });

const day = s => new Date(s.slice(0, 10) + 'T00:00:00Z');
const iso = t => t.toISOString().slice(0, 10);
const read = day(T.read);                                  // the day the trending lists were read
const generated = d.generated.slice(0, 10);                // the first catalog; later additions carry their own fetch date
const repos = Object.values(d.repos).filter(Boolean);
const MONTH = (y, m) => new Date(Date.UTC(y, m, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

const issues = [];
// Weekly: the week ending on the day the lists were read
{
  const from = new Date(read - 6 * 864e5);
  issues.push({ id: `weekly-${iso(read)}`, type: 'weekly', from: iso(from), to: iso(read),
    gainers: T.weekly.map(([repo, stars, gain]) => ({ repo, gain, stars })),
    today: T.daily.map(([repo, stars, gain]) => ({ repo, gain, stars })),
    added: repos.filter(m => m.fetched && m.fetched !== generated && day(m.fetched) >= from && day(m.fetched) <= read).map(m => ({ repo: m.full, stars: m.stars })) });
}
// Monthly: GitHub's monthly list covers the 30 days before it was read, so the issue is named for the month those days fall in
{
  const mid = new Date(read - 15 * 864e5), y = mid.getUTCFullYear(), m = mid.getUTCMonth();
  const inMonth = s => s && day(s).getUTCFullYear() === y && day(s).getUTCMonth() === m;
  const hn = [];
  for (const [repo, list] of Object.entries(d.hn || {})) if (Array.isArray(list)) for (const h of list)
    if (inMonth(h.date) && (h.url || '').toLowerCase().includes(`github.com/${repo.toLowerCase()}`)) hn.push({ repo, title: h.title, points: h.points, comments: h.comments, date: h.date, hnid: h.id });
  issues.push({ id: `monthly-${y}-${String(m + 1).padStart(2, '0')}`, type: 'monthly', title: MONTH(y, m), from: iso(new Date(read - 29 * 864e5)), to: iso(read),
    gainers: T.monthly.map(([repo, stars, gain]) => ({ repo, gain, stars })),
    launched: repos.filter(r => inMonth(r.created)).map(r => ({ repo: r.full, created: r.created.slice(0, 10), stars: r.stars })).sort((a, b) => b.stars - a.stars),
    hn: hn.sort((a, b) => b.points - a.points) });
}
// Yearly: everything launched this year so far, by stars
{
  const y = read.getUTCFullYear();
  issues.push({ id: `yearly-${y}`, type: 'yearly', title: String(y), to: iso(read),
    launched: repos.filter(r => (r.created || '').startsWith(String(y))).map(r => ({ repo: r.full, created: r.created.slice(0, 10), stars: r.stars })).sort((a, b) => b.stars - a.stars) });
}

for (const i of issues) {
  const f = path.join(outDir, i.id + '.json');
  fs.writeFileSync(f, JSON.stringify({ ...i, read: T.read, source: T.source }, null, 1) + '\n');
  console.error(i.id, Object.entries(i).filter(([, v]) => Array.isArray(v)).map(([k, v]) => `${k} ${v.length}`).join(', '));
}
