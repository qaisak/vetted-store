// Builds a made-up Claude Code setup in a temp folder, runs the Checkup on it, and checks the report.
// Usage: node checkup/test/checkup.test.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const SCRIPT = path.join(HERE, '..', 'skills', 'skillshelf-checkup', 'checkup.mjs');
const DATA = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'skills', 'skillshelf-checkup', 'skillshelf-data.json'), 'utf8'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'checkup-'));
const cfg = path.join(tmp, 'config'), proj = path.join(tmp, 'project');
const byId = id => DATA.listings.find(l => l.id === id);
const skill = (dir, folder, name, description) => { fs.mkdirSync(path.join(dir, folder), { recursive: true });
  fs.writeFileSync(path.join(dir, folder, 'SKILL.md'), `---\nname: ${name}\ndescription: ${JSON.stringify(description)}\n---\n\n# ${name}\n`); };
const fromVetted = (dir, id, folder) => { const l = byId(id); if (!l) throw new Error('not in data: ' + id); skill(dir, folder || l.slug, l.slug, l.description); };

// Personal skills: two design skills (same job), one with a risk, one Skillshelf hasn't checked, one never used
fromVetted(path.join(cfg, 'skills'), 'anthropics-frontend-design');
fromVetted(path.join(cfg, 'skills'), 'nutlope-hallmark');
fromVetted(path.join(cfg, 'skills'), 'openai-winui-app');
fromVetted(path.join(cfg, 'skills'), 'blader-humanizer');
skill(path.join(cfg, 'skills'), 'my-notes', 'my-notes', 'Keeps my personal meeting notes in a folder.');
// A same-named skill with a different description must not borrow Skillshelf's check
skill(path.join(cfg, 'skills'), 'brainstorming', 'brainstorming', 'Generates random baby names from a list of syllables.');
// A project skill installed under a different folder name, like npx skills does for Taste Skill
fromVetted(path.join(proj, '.claude', 'skills'), 'leonxlnx-design-taste-frontend', 'taste-skill');
// A plugin with one skill
const plug = path.join(cfg, 'plugins', 'cache', 'mkt', 'superpowers', '1.0.0');
fromVetted(path.join(plug, 'skills'), 'obra-systematic-debugging');
fs.writeFileSync(path.join(cfg, 'plugins', 'installed_plugins.json'), JSON.stringify({ version: 2, plugins: { 'superpowers@mkt': [{ scope: 'user', installPath: plug }] } }));
// Session logs: frontend-design ran twice, humanizer once (as a /command), taste-skill once; the rest never
const sess = path.join(cfg, 'projects', '-tmp-project'); fs.mkdirSync(sess, { recursive: true });
const now = new Date().toISOString();
const ev = (content) => JSON.stringify({ type: 'assistant', timestamp: now, message: { role: 'assistant', content } });
fs.writeFileSync(path.join(sess, 's1.jsonl'), [
  ev([{ type: 'tool_use', name: 'Skill', input: { skill: 'frontend-design' } }]),
  ev([{ type: 'tool_use', name: 'Skill', input: { skill: 'frontend-design', args: 'a landing page' } }]),
  ev([{ type: 'tool_use', name: 'Skill', input: { skill: 'taste-skill' } }]),
  JSON.stringify({ type: 'user', timestamp: now, message: { role: 'user', content: '<command-name>/humanizer</command-name>' } }),
].join('\n'));

const out = JSON.parse(execFileSync('node', [SCRIPT, '--project', proj, '--json'], { env: { ...process.env, CLAUDE_CONFIG_DIR: cfg } }).toString());
const row = s => out.skills.find(r => r.skill === s);
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
ok(out.skills.length === 8, `finds all 8 skills: personal, project and plugin (${out.skills.length})`);
ok(row('frontend-design').used === 2 && row('taste-skill').used === 1 && row('humanizer').used === 1, 'counts Skill tool calls and /commands');
ok(row('hallmark').verdict === 'consider removing' && row('my-notes').verdict === 'consider removing', 'never-used skills are flagged');
ok(row('winui-app')?.verdict === 'review' || row('winui-app')?.vetted?.notes?.some(n => n.level === 'warn'), 'a skill with a Skillshelf risk is flagged for review');
ok(out.overlaps.some(o => [o.a, o.b].includes('frontend-design') && [o.a, o.b].includes('hallmark')), 'two design skills are flagged as doing the same job');
ok(row('my-notes').vetted === null, 'an unknown skill is "not checked", not borrowed from another listing');
ok(row('brainstorming').vetted === null, 'a same-named skill with a different description does not borrow Skillshelf\'s check');
ok(row('taste-skill').vetted?.label && row('systematic-debugging').vetted?.label, 'matches a renamed project skill and a plugin skill to Skillshelf');
const text = execFileSync('node', [SCRIPT, '--project', proj], { env: { ...process.env, CLAUDE_CONFIG_DIR: cfg } }).toString();
ok(/Review first/.test(text) && /Never used/.test(text) && /Doing the same job/.test(text) && /Nothing was changed/.test(text), 'the readable report has its sections');
ok(fs.existsSync(path.join(cfg, 'skills', 'hallmark', 'SKILL.md')), 'nothing was deleted');
fs.rmSync(tmp, { recursive: true, force: true });
process.exitCode = fails ? 1 : 0;
