#!/usr/bin/env node
// Switch a Claude Code skill on or off with Claude Code's own setting, "skillOverrides".
// A personal skill (~/.claude/skills/<name>) is set in ~/.claude/settings.json; a project skill (<project>/.claude/skills/<name>)
// in <project>/.claude/settings.local.json. Nothing is deleted: "off" adds { "<name>": "off" }, "on" removes that entry.
// Skills that come from a plugin are left alone: switch the plugin with /plugin instead.
//
// Usage: node toggle.mjs <skill> on|off [--project <dir>] [--dry]
//   CLAUDE_CONFIG_DIR is honoured (default ~/.claude). Prints what changed, as one line of JSON.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const [skill, state] = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--project');
const DRY = args.includes('--dry');
const PROJECT = path.resolve(opt('--project', process.cwd()));
const CONFIG = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const done = (o, code = 0) => { console.log(JSON.stringify(o)); process.exit(code); };

if (!skill || !['on', 'off'].includes(state)) done({ ok: false, error: 'Usage: node toggle.mjs <skill> on|off [--project <dir>]' }, 2);

// Find the skill by its folder name (what Claude Code calls it) or by the name in its SKILL.md
const nameIn = dir => { try { return (fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8').match(/^name:\s*["']?([^"'\n]+)/m) || [])[1]?.trim(); } catch { return null; } };
function find(root) {
  if (!fs.existsSync(root)) return null;
  for (const e of fs.readdirSync(root, { withFileTypes: true })) {
    const dir = path.join(root, e.name);
    if ((e.isDirectory() || e.isSymbolicLink()) && fs.existsSync(path.join(dir, 'SKILL.md')) && (e.name === skill || nameIn(dir) === skill)) return e.name;
  }
  return null;
}
const projectName = find(path.join(PROJECT, '.claude', 'skills')), personalName = find(path.join(CONFIG, 'skills'));
const name = projectName || personalName;
if (!name) done({ ok: false, error: `No personal or project skill called "${skill}". Skills from plugins are switched with /plugin.` }, 1);
const file = projectName ? path.join(PROJECT, '.claude', 'settings.local.json') : path.join(CONFIG, 'settings.json');

// Read, change only skillOverrides, keep everything else exactly
let settings = {};
if (fs.existsSync(file)) {
  try { settings = JSON.parse(fs.readFileSync(file, 'utf8') || '{}'); }
  catch { done({ ok: false, error: `${file} isn't valid JSON, so it was left alone. Fix it, or switch the skill in /skills.` }, 1); }
}
const before = settings.skillOverrides?.[name] ?? 'on';
const overrides = { ...(settings.skillOverrides || {}) };
if (state === 'off') overrides[name] = 'off'; else delete overrides[name];
if (Object.keys(overrides).length) settings.skillOverrides = overrides; else delete settings.skillOverrides;
if (before === state) done({ ok: true, skill: name, file, changed: false, state });
if (!DRY) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file)) fs.copyFileSync(file, file + '.skillshelf-backup');
  fs.writeFileSync(file, JSON.stringify(settings, null, 2) + '\n');
}
done({ ok: true, skill: name, file, changed: true, from: before, to: state, backup: fs.existsSync(file + '.skillshelf-backup') ? file + '.skillshelf-backup' : null, note: "If Claude Code doesn't pick it up right away, start a new session." });
