# Design skills vs plain Claude (November 16, 2026)

**Question:** do the most popular "make it look designed" skills beat plain Claude, and which one is best?

**Answer:** yes, clearly, and Impeccable is the one to install. In 12 blind judging rounds it was picked best 11 times. Anthropic's Frontend Design came second and is already built into the Claude app. Taste Skill's bakery page broke on phones. Plain Claude made clear pages that looked generic: 3 to 4 out of 10 for "looks designed".

| | Streakly (product) | Rosa's Bakery (small business) | Picked best |
| --- | --- | --- | --- |
| Impeccable | 8.0 | 8.7 | 11 of 12 |
| Frontend Design (Anthropic) | 7.8 | 7.4 | 1 of 12 |
| Hallmark | 7.1 | 6.9 | 0 |
| Taste Skill | 7.3 | 5.1 | 0 |
| Plain Claude, no skill | 6.8 | 5.9 | 0 |

Scores are the average of five criteria (designed, clarity, fit, polish, phone), 1 to 10, over six rounds. Every number is in `results.json`.

## How it was run

- **Same task for everyone.** Two briefs: a landing page for Streakly, a habit tracker for busy parents, and a homepage for Rosa's Bakery in Lisbon, which takes weekend pre-orders. Each asked for a single `index.html`.
- **Clean sessions.** Each page was made in its own headless Claude Code session (version 2.1.325, model Sonnet 5.5) with an empty config: no other skills or plugins, only Claude Code's built-in ones. The skill under test was copied into the project's `.claude/skills/`, which is what `npx skills add --agent claude-code` does. Every skill switched on by itself; nobody named it.
- **Versions.** anthropics/skills `e4bb5d9`, Leonxlnx/taste-skill `f6b7657`, pbakaus/impeccable `d41d986`, Nutlope/hallmark `04977e1`, as of November 16, 2026.
- **Blind judging.** A fresh Claude Opus 5.5 session per round saw only screenshots (desktop first screen, desktop full page, phone first screen) labelled A to E, and scored each page on a fixed rubric. Rounds 4 to 6 rotated the order so each page sat in a different slot.
- **Cost.** About $2.73 to make the ten pages and $3.74 for the twelve judging rounds.

## Caveats

- One page per skill per brief. A single run can vary, so this is a strong signal, not a final verdict.
- The judges are AI, not people, and saw screenshots, not code.
- Hallmark picked a font from Fontshare that the test machine couldn't load, so its Streakly screenshots show a fallback font.
- Sessions could only read and write files in their own folder, so skills that check their work by opening a browser couldn't.

## Files

- `results.json`: every run (time, cost, whether the skill switched on, phone overflow), every score with the judges' one-line reasons, and the verdict.
- `img/`: desktop and phone screenshots of each page.
- `pages/`: the ten pages exactly as each session wrote them.
- `scripts/`: `run.sh` makes a page, `judge.sh` runs a blind round, `shots.cjs` takes the screenshots, `summarize.mjs` and `tally.mjs` read the logs and scores. Set `DT_ROOT` to a work folder, clone the four repos into `$DT_ROOT/dt/src/<owner>__<repo>`, and put the scripts in `$DT_ROOT/dt/`.
