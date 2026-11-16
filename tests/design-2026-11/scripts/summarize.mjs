// Summarizes each design test run from its stream-json log: did the skill activate, what it read, what was blocked, time and cost.
import fs from 'node:fs';
import path from 'node:path';
const ROOT = process.argv[2];
const out = [];
for (const b of fs.readdirSync(ROOT)) for (const f of fs.readdirSync(path.join(ROOT, b)).filter(f => f.endsWith('.jsonl'))) {
  const c = f.replace('.jsonl', ''), lines = fs.readFileSync(path.join(ROOT, b, f), 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const tools = [], denied = [];
  let result = null, skill = null;
  for (const e of lines) {
    if (e.type === 'assistant') for (const x of e.message?.content || []) if (x.type === 'tool_use') { tools.push([x.name, x.input?.file_path || x.input?.skill || x.input?.pattern || x.input?.command || '']); if (x.name === 'Skill') skill = x.input?.skill; }
    if (e.type === 'user') for (const x of e.message?.content || []) if (x.type === 'tool_result' && /denied|not allowed|permission/i.test(JSON.stringify(x.content || '')) ) denied.push(JSON.stringify(x.content).slice(0, 120));
    if (e.type === 'result') result = e;
  }
  const meta = fs.existsSync(path.join(ROOT, b, c + '.meta.json')) ? JSON.parse(fs.readFileSync(path.join(ROOT, b, c + '.meta.json'), 'utf8')) : {};
  const html = path.join(ROOT, b, c, 'index.html');
  const reads = tools.filter(t => t[0] === 'Read' && /\.claude\/skills\//.test(t[1])).map(t => t[1].split('.claude/skills/')[1]);
  out.push({ brief: b, contestant: c, skillUsed: skill, skillFilesRead: reads, toolCalls: tools.length, toolsByName: tools.reduce((a, t) => (a[t[0]] = (a[t[0]] || 0) + 1, a), {}), denied,
    seconds: meta.seconds ?? null, costUSD: result?.total_cost_usd ?? null, turns: result?.num_turns ?? null, outputBytes: fs.existsSync(html) ? fs.statSync(html).size : 0, finished: !!result, finalNote: (result?.result || '').slice(0, 300) });
}
console.log(JSON.stringify(out, null, 1));
