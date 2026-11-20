---
name: skillshelf-checkup
description: Checks which of the user's installed Claude Code skills to keep, switch off or review, and switches skills on or off for them. Use when the user asks to check, clean up, audit or tidy their skills or plugins, asks which skills they actually use, says Claude feels slow or cluttered from too many skills, asks whether an installed skill is safe, or asks to turn a skill on or off.
---

# Skillshelf Checkup

Tell the user which of their skills earn their place. Fewer, better skills: every installed skill's name and description is sent with every session, and skills that do the same job compete with each other.

## Run it

Run the script from this skill's folder. It only reads files and changes nothing:

```bash
node <this skill's folder>/checkup.mjs --project "$PWD"
```

Add `--days 90` for a longer look back, or `--json` for every detail, including each skill's folder path.

The script reads:
- the skills in `~/.claude/skills`, in this project's `.claude/skills`, and in installed plugins;
- the user's own session logs under `~/.claude/projects`, only to count which skills actually ran;
- `skillshelf-data.json` next to it: Skillshelf's checks of listed skills (labels and notes). Nothing is sent anywhere.

## Tell the user

Lead with what to do, in plain words, in this order:

1. **Review first**: skills where Skillshelf found a risk. Name the risk.
2. **Never used**: skills that didn't run in the period. Say how many tokens of every session they cost.
3. **Doing the same job**: pairs or groups; suggest keeping the one they use most.
4. **Not checked by Skillshelf yet**: say that's unknown, not unsafe.
5. Everything else is fine to keep.

Keep it short. A skill used once is not "never used". Say when no session logs were found, because then "never used" can't be judged.

## Switch skills on or off

Switching off is the usual fix, not deleting. It uses Claude Code's own `skillOverrides` setting, so it's undone with one command and shows in `/skills`:

```bash
node <this skill's folder>/toggle.mjs <skill> off --project "$PWD"
node <this skill's folder>/toggle.mjs <skill> on --project "$PWD"
```

It finds the skill in this project's `.claude/skills` or in `~/.claude/skills`, changes only the `skillOverrides` entry in the matching settings file (`.claude/settings.local.json` or `~/.claude/settings.json`), and keeps a `.skillshelf-backup` copy of the file it changed. It prints one line of JSON saying what changed.

- **Always ask first.** List the skills you'd switch off and why, and wait for a yes. Switch only the ones the user agreed to.
- Add `--dry` to show what would change without writing.
- Skills from a plugin are left alone: tell the user to use `/plugin` to disable the plugin.
- Never delete a skill folder unless the user asks for deletion by name. Then show the folder from `--json`, confirm, and delete only that one.

## Report slop

If the user says a skill's output was bad and the Skillshelf connector is installed, use its `flag_slop` tool after they agree. Without the connector, tell them it can be added in Claude Code with `claude mcp add --transport http skillshelf <connector address>/mcp`, using the address on Skillshelf's site.
