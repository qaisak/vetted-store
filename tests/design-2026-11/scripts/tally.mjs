// Maps each blind judging round back to contestants and averages the scores.
import fs from 'node:fs';
const D = process.argv[2], rows = {}, picks = {};
for (const f of fs.readdirSync(D).filter(f => f.endsWith('.result.json'))) {
  const id = f.replace('.result.json', ''), [brief] = id.split('-');
  let res; try { res = JSON.parse(fs.readFileSync(`${D}/${f}`, 'utf8')); } catch { console.error('unreadable', f); continue; }
  const txt = res.result || '', m = txt.match(/\{[\s\S]*\}/);
  if (!m) { console.error('no JSON in', f); continue; }
  const j = JSON.parse(m[0]), key = JSON.parse(fs.readFileSync(`${D}/${id}.key.json`, 'utf8'));
  for (const [L, s] of Object.entries(j.scores)) { const c = key[L], k = `${brief}|${c}`;
    (rows[k] ||= []).push(s); }
  (picks[brief] ||= []).push({ best: key[j.best], worst: key[j.worst], cost: res.total_cost_usd });
}
const crit = ['designed', 'clarity', 'fit', 'polish', 'phone'];
const out = [];
for (const [k, list] of Object.entries(rows)) { const [brief, c] = k.split('|'), avg = {};
  for (const x of crit) avg[x] = +(list.reduce((a, s) => a + s[x], 0) / list.length).toFixed(1);
  avg.total = +(crit.reduce((a, x) => a + avg[x], 0) / crit.length).toFixed(2);
  out.push({ brief, contestant: c, rounds: list.length, ...avg, why: list.map(s => s.why) }); }
out.sort((a, b) => a.brief.localeCompare(b.brief) || b.total - a.total);
for (const r of out) console.log(r.brief.padEnd(9), r.contestant.padEnd(16), 'avg', String(r.total).padEnd(5), crit.map(x => `${x} ${r[x]}`).join('  '), `(${r.rounds} rounds)`);
for (const [b, p] of Object.entries(picks)) console.log(b, 'best:', p.map(x => x.best).join(', '), '| worst:', p.map(x => x.worst).join(', '), '| judge cost $', p.reduce((a, x) => a + (x.cost || 0), 0).toFixed(2));
fs.writeFileSync(`${D}/tally.json`, JSON.stringify({ rows: out, picks }, null, 1));
