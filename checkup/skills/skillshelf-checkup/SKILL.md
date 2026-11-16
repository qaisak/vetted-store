---
name: skillshelf-checkup
description: Checks which of the user's installed Claude Code skills to keep, remove or review. Use when the user asks to check, clean up, audit or tidy their skills or plugins, asks which skills they actually use, says Claude feels slow or cluttered from too many skills, or asks whether an installed skill is safe.
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

## Never remove anything on your own

Only suggest. If the user asks you to remove a skill, show the exact folder you'd delete (from `--json`), ask them to confirm, and only then delete that one folder. For a skill that came from a plugin, tell them to use `/plugin` to disable or uninstall the plugin instead of deleting files.
