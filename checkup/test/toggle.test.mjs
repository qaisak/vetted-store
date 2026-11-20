// Checks toggle.mjs against a made-up Claude Code setup: personal and project skills, existing settings kept, plugins refused.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const SCRIPT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'skills', 'skillshelf-checkup', 'toggle.mjs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'toggle-')), cfg = path.join(tmp, 'config'), proj = path.join(tmp, 'project');
const skill = (dir, folder, name) => { fs.mkdirSync(path.join(dir, folder), { recursive: true }); fs.writeFileSync(path.join(dir, folder, 'SKILL.md'), `---\nname: ${name}\ndescription: x\n---\n`); };
skill(path.join(cfg, 'skills'), 'hallmark', 'hallmark');
skill(path.join(proj, '.claude', 'skills'), 'taste-skill', 'design-taste-frontend');
fs.writeFileSync(path.join(cfg, 'settings.json'), JSON.stringify({ model: 'opus', permissions: { allow: ['Bash(ls)'] }, skillOverrides: { 'other-skill': 'off' } }, null, 2));
const run = (...a) => { try { return JSON.parse(execFileSync('node', [SCRIPT, ...a, '--project', proj], { env: { ...process.env, CLAUDE_CONFIG_DIR: cfg } }).toString()); } catch (e) { return JSON.parse(e.stdout.toString()); } };
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

let r = run('hallmark', 'off'), s = read(path.join(cfg, 'settings.json'));
ok(r.ok && r.changed && s.skillOverrides.hallmark === 'off', 'switches a personal skill off in ~/.claude/settings.json');
ok(s.model === 'opus' && s.permissions.allow[0] === 'Bash(ls)' && s.skillOverrides['other-skill'] === 'off', 'keeps every other setting');
ok(fs.existsSync(path.join(cfg, 'settings.json.skillshelf-backup')), 'keeps a backup of the file it changed');
ok(run('hallmark', 'off').changed === false, 'switching off twice changes nothing');
r = run('hallmark', 'on'); s = read(path.join(cfg, 'settings.json'));
ok(r.changed && !('hallmark' in s.skillOverrides) && s.skillOverrides['other-skill'] === 'off', 'switching on removes only its entry');
r = run('design-taste-frontend', 'off');
ok(r.ok && r.skill === 'taste-skill' && read(path.join(proj, '.claude', 'settings.local.json')).skillOverrides['taste-skill'] === 'off', 'a project skill is found by its SKILL.md name and set in .claude/settings.local.json under its folder name');
r = run('taste-skill', 'on');
ok(r.changed && !('skillOverrides' in read(path.join(proj, '.claude', 'settings.local.json'))), 'an empty skillOverrides is removed');
ok(run('brainstorming', 'off').ok === false, 'a skill that isn\'t installed (or comes from a plugin) is refused');
const before = fs.readFileSync(path.join(cfg, 'settings.json'), 'utf8'); run('hallmark', 'off', '--dry');
ok(fs.readFileSync(path.join(cfg, 'settings.json'), 'utf8') === before, '--dry writes nothing');
fs.writeFileSync(path.join(cfg, 'settings.json'), '{ not json');
ok(run('hallmark', 'off').ok === false && fs.readFileSync(path.join(cfg, 'settings.json'), 'utf8') === '{ not json', 'a broken settings file is left alone');
fs.rmSync(tmp, { recursive: true, force: true });
process.exitCode = fails ? 1 : 0;
