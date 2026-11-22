# Skillshelf

**Fewer, better AI skills.** Most skills don't help, and every one installed takes up room in each session.
Skillshelf tests the popular ones head to head against plain Claude (`tests/`), reads their code, and offers a
Checkup that tells Claude Code users which of their skills to keep (`checkup/`, private for now).

Underneath is a catalog of real open-source projects: CLI apps, agent skills and MCP servers.
Projects from **independent developers** are the focus: each gets a **Purpose Check** (what its code can
actually do, compared with what it says it's for) and a static **NVIDIA SkillSpector** scan.
Projects from companies (Anthropic, OpenAI, NVIDIA, GitHub, Microsoft, Google and others) are listed as
**Trusted publishers**, which says who made them, and are scanned like everything else.

Every high or critical SkillSpector finding on every listing has a written status: read line by line (with the
reason), in tests or build files that don't run, explained by what the listing is for, a known scanner false alarm,
or a file the scanner couldn't read. A listing isn't published until it's scanned, and each page leads with one
verdict built from all of this. SkillSpector's raw score is shown below it as "before our review".

The site is a single self-contained page: [`vetted-store.html`](vetted-store.html), published as a Claude artifact.

## Layout

| Path | What it is |
| --- | --- |
| `vetted-store.html` | The built site (generated, don't edit by hand) |
| `pipeline/template.html` | Site source: HTML, CSS and JS; the build injects the data |
| `pipeline/fetch.mjs` | Pulls repo metadata, SKILL.md files, OpenSSF Scorecard, Hacker News threads, README install lines and avatars |
| `pipeline/scan.mjs` | Runs SkillSpector on every skill and MCP server |
| `pipeline/scan_scoped.mjs` | Scans only the main source folder of repos too large for a whole-repo scan, or the whole repo minus named folders |
| `pipeline/findings.mjs` | Review status of each high or critical finding, shared by the build and the review tools |
| `pipeline/finding-rules.json` | The two scanner rules that say nothing about a listing on their own, with the reason |
| `pipeline/open_findings.mjs` | Lists the high or critical findings that have no review yet, for reviewers |
| `pipeline/merge_reviews.mjs` | Merges reviewers' verdicts into `reviews.json`, pinned to the files they were written for |
| `pipeline/install_hooks.mjs` | Finds npm lifecycle scripts (preinstall, install, postinstall) that run on their own at install (`data/install-hooks.json`) |
| `pipeline/purpose_analyze.mjs` | The Purpose Check: production-code filter, capability detection, purpose profiles, tool extraction, peer comparison |
| `pipeline/reviews.json` | Written reviews: capability notes, per-finding verdicts (`_findings`: benign, notice, warning, concern) and listing notes (`_notices`) |
| `pipeline/plain.json` | Hand-written plain-language line, job tags and setup level for every listing |
| `pipeline/videos.mjs` | Collects demo videos each project links in its own README (`data/videos.json`) |
| `pipeline/smoke.mjs` | Headless smoke test: every tab, job page, listing, install sheet and story, desktop and phone |
| `pipeline/flows.cjs` | Headless checks of navigation, search, the Digest, Make it yours, install sheets per computer, My list, shared lists and setup links |
| `pipeline/build.mjs` | Builds the data and writes `vetted-store.html` |
| `pipeline/marketplace.mjs` | Writes `.claude-plugin/marketplace.json`, the Skillshelf plugin marketplace (see below); `pipeline/marketplace.test.mjs` tests it |
| `.claude-plugin/marketplace.json` | The Skillshelf plugin marketplace, written by the build: checked skills with no serious risk, each pinned to the commit Skillshelf checked |
| `data/data.json` | Fetched listings and repo data (October 31, 2026) |
| `data/purpose.json` | Purpose Check results |
| `data/scan-reports/` | SkillSpector JSON reports, one per listing (`*.scope.txt` marks scoped scans, `*.exclude.txt` lists skipped folders) |
| `data/sources.json` | Exact commits scanned for listings added or rescanned after October 31, 2026 |
| `pipeline/digest.mjs` | Writes the weekly, monthly and yearly Digest issues from the trending lists, launch dates and additions |
| `data/digests/` | One JSON file per Digest issue; past issues are never rewritten, so the archive keeps what was true then |
| `data/trending.json` | GitHub's own trending lists (today, this week, this month) with stars gained, read on the date it states |
| `tests/<id>/` | A head-to-head test: `results.json` (runs, blind scores, verdict), screenshots, the pages each session made, the scripts, and a README with the method and caveats. The build shows every test on the Tested page |
| `checkup/skills/vetted-checkup/` | The Checkup skill: `SKILL.md`, `checkup.mjs` (reads installed skills, plugins and the user's own session logs; changes nothing) and `vetted-data.json`, written by the build |
| `checkup/test/checkup.test.mjs` | Builds a made-up Claude Code setup and checks the Checkup's report |
| `checkup/skills/skillshelf-checkup/toggle.mjs` | Switches a Claude Code skill on or off with Claude Code's own `skillOverrides` setting; `checkup/test/toggle.test.mjs` tests it |
| `desktop/` | Skillshelf for the Claude desktop app: a local, no-dependency MCP server packed as a desktop extension (`dist/skillshelf.mcpb`). Ask "show my skills" to get a card of every Claude Code skill on the computer (personal, project, plugin) with on/off switches (Claude Code's `skillOverrides`, with a backup), Skillshelf's badge on each, and Report slop. `node desktop/pack.mjs` builds it; `node desktop/test/desktop.test.mjs` tests it on a made-up computer |
| `connector/` | The Skillshelf connector for Claude: a no-dependency remote MCP server for Cloudflare Workers (`src/worker.js`) with tools to find and check skills, report slop and get on/off steps. `src/catalog.json` is written by the build; slop reports go to D1 (`schema.sql`). It also has `my_skills` (Claude passes the skills it has in the chat; the card matches each to Skillshelf's check and switches them off for that chat by telling Claude) and `check_slop` (`src/slop.js`: common AI-writing tells, highlighted, with buttons to avoid them in this chat, rewrite, or get a rule for Claude's personal preferences). Results come with an interactive card in the chat (MCP Apps, `src/card.html`): checked picks with colour-coded safety badges, Install, What it can do, Switch off and Report slop buttons; apps without card support show the same answer as text. `node connector/test/worker.test.mjs` runs it against SQLite; `node connector/test/card.test.mjs [shots-dir]` clicks through the card in Chromium |

## Rebuild the site

Only needs Node.js 20 or newer:

```bash
node pipeline/build.mjs data/data.json pipeline/template.html vetted-store.html data/scan-reports data/purpose.json
```

## The Skillshelf plugin marketplace

People can install a checked skill in one step instead of downloading a folder and uploading it. The build writes
[`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json), a Claude plugin marketplace with one plugin per skill.

Its first plugin is Skillshelf's own: **the Skillshelf bar** ([`plugins/skillshelf`](plugins/skillshelf)), a Skills bar that
stays above the message box in Claude Code. It switches skills on or off for the session, adds any skill after Skillshelf
checks it, bans phrases, and brings the Skillshelf connector with it. Install it with
`/plugin marketplace add qaisak/vetted-store`, then `/plugin install skillshelf@skillshelf`. The connector's home page
(https://skillshelf.skillshelf.workers.dev/) leads with it.

**Add it once, then install from it:**

- Claude app (claude.ai, desktop): Plugins, then Add, then Add marketplace, and enter `qaisak/vetted-store`.
- Claude Code: `/plugin marketplace add qaisak/vetted-store`, then `/plugin install <listing-id>@skillshelf`
  (for example `/plugin install obra-brainstorming@skillshelf`).

**What goes in** (`pipeline/marketplace.mjs`):

- Skills only, and only those whose Skillshelf check found no serious risk: "No issues found" or "things to know".
  Anything with a risk, flagged, harmful, or doing more than it says stays out.
- Only skills where Skillshelf has the exact commit it checked (`data/sources.json`). Each plugin is pinned to that commit,
  so people get the code that was checked, not whatever the repo has today.
- Each plugin is just the checked skill folder (a `git-subdir` source). Claude loads a folder with `SKILL.md` at its top as
  one skill, so nothing else from the repo comes along. Skills whose folder is the whole repo stay out for that reason.
- Today that is 127 skills. 103 more are left out only because their check has no exact commit on record: they were
  scanned from the October 31 zip downloads. All are from companies (OpenAI 39, NVIDIA 24, Anthropic 19, Hugging Face 12,
  Vercel Labs 9). Rescanning them at a known commit adds them on the next build.

The connector offers this route first. `find_skills` and `check_skill` results carry `add_marketplace` (the Claude app steps
and the two Claude Code commands) for skills in it, and the card's Install drawer leads with "Easiest: add the Skillshelf
marketplace". The catalog marks those listings with `plugin` (`<id>@skillshelf`).

To regenerate the marketplace on its own: `node pipeline/marketplace.mjs`. To test it: `node pipeline/marketplace.test.mjs`.
If Claude Code is installed, `claude plugin validate .` checks the file against Claude's own rules.

The repo must be public, and the file must be on its default branch, for other people to add it. To try this branch first in
Claude Code: `/plugin marketplace add qaisak/vetted-store#claude/clever-knuth-9eryqo`. Every source points at a public GitHub
repo, so the file also works if copied as-is into a separate public repo.

## Full pipeline

1. **Fetch** (GitHub allows 60 unauthenticated API calls an hour; responses are cached in `pipeline/cache/`):
   `node pipeline/fetch.mjs data/data.json`.
   To add repos without refetching everything, list them in `fetch.mjs` and run
   `node pipeline/fetch.mjs data/data.json --only owner/repo,owner/repo`: it merges them into the existing file and leaves every
   other listing (and its Scorecard and Hacker News data) untouched. Where `/repos/` isn't reachable it falls back to the search API.
2. **Download sources** for scanning into `<scan-root>/src/<owner>__<repo>/<repo>-<branch>/`: GitHub zip archives, or
   `git clone --depth 1 -b <branch>` followed by deleting `.git`. Record the commit in `data/sources.json`.
3. **Scan** (needs SkillSpector: `uv tool install --python 3.12 "skillspector @ https://github.com/NVIDIA/SkillSpector/archive/refs/heads/main.zip"`,
   or `git clone` it and `uv tool install --python 3.12 ./SkillSpector`):
   `node pipeline/scan.mjs data/data.json <scan-root> 6 [--tools] [--skip id,id]`; reports land in `<scan-root>/out/`.
   `--tools` also scans the command-line apps. For repos too large for the 15-minute limit, scan the main source folder:
   `node pipeline/scan_scoped.mjs <scan-root> <id> <repo-dir> <folder>`, or scan everything except some top-level folders with
   `-folder,folder` in place of `<folder>` (the page names the skipped folders). Set `SKILLSPECTOR` if the executable isn't on your PATH.
4. **Purpose Check**: `node pipeline/purpose_analyze.mjs data/data.json <scan-root> data/purpose.json`. Listings whose source isn't
   under `<scan-root>` keep their earlier result, so you can check new listings alone.
4a. **Install hooks**: `node pipeline/install_hooks.mjs` reads each connector's and app's package.json at the scanned commit. Findings in
   those scripts, and in the files they run, are never filed as "doesn't run": they stay open until someone reads them.
4b. **Review every high or critical finding** no rule explains: `node pipeline/open_findings.mjs data/data.json data/scan-reports data/purpose.json open.json`
   lists them with file, line and matched text. Read each line in its repository, then write verdicts
   (`[{id, match, file?, level: benign|notice|warning|concern, title?, note}]`) and merge them with
   `node pipeline/merge_reviews.mjs open.json verdicts.json --date YYYY-MM-DD`. It prints any finding still uncovered.
   Never mark something a warning or concern without reading the code. Rerun the Purpose Check afterwards.
4c. **Trending**: refresh `data/trending.json` from github.com/trending (`?since=daily`, `weekly`, `monthly`): repo, total stars,
   stars gained, rank. The build keeps only repositories listed in Skillshelf, so a trending project appears only after it's scanned.
4d. **Digest**: after refreshing `data/trending.json`, run `node pipeline/digest.mjs`. It writes this week's issue, the month's and
   the year's so far; earlier issues stay as they were and appear under Past issues. Headlines and intros are computed from the
   numbers (the leading job among the week's top gainers, the month's biggest gainer), so nothing is written by hand.
   A weekly routine: refresh the trending lists, run the digest, rebuild, smoke test, publish.
5. **Plain words**: add a line to `pipeline/plain.json` for every new listing (the build warns when one is missing).
   **Videos**: `node pipeline/videos.mjs data/data.json data/videos.json`, then check each new link is a demo of the project.
6. **Build** as above, pointing the scan-reports argument at `<scan-root>/out` or `data/scan-reports`.
7. **Smoke test** before publishing: `node pipeline/smoke.mjs vetted-store.html` and `node pipeline/flows.cjs vetted-store.html`
   (both use the preinstalled Playwright). Listings without a scan report are held back by the build, which names them.

## Head-to-head tests

Each test gives the same request to several skills and to plain Claude, in clean headless Claude Code sessions (no other
skills, file tools only), then has fresh Claude sessions score anonymised screenshots on a fixed rubric over several rounds,
rotating the order. See `tests/design-2026-11/README.md` for the first one: Impeccable won 11 of 12 blind rounds; plain
Claude scored 3 to 4 out of 10 for looking designed. A test page appears on the site once `tests/<id>/results.json` exists;
its screenshots are published with the artifact as files at the same relative paths.

## How the Purpose Check decides

- Only production code counts: tests, docs, examples, demos, vendored code, build scripts and comments are set aside.
- Seven kinds of access are detected: network, files, running programs, environment variables, tokens and keys, secret files, browser control.
- Each is compared with the project's purpose profile (hand-written for apps and MCP servers, inferred from the description for skills).
- Every mismatch, and every serious SkillSpector finding that isn't explained by the purpose, must have a written review in `reviews.json`. Otherwise the listing shows "Does more than stated".
- Things a user should know even when nothing is wrong (telemetry that's on by default, an agent that skips permission prompts) go in
  `_notices` in `reviews.json` and show as "Worth knowing" on the listing, and on the "What we caught" page.
- Who does what, as the site says: SkillSpector scans; scripts sort each flag by where it sits (tests and docs don't run, install
  hooks do) and by what the project is for; Claude, an AI model, reads the rest line by line and writes the reason down.
  Generic notes for prompt-text rules apply only to app and connector code; a skill's findings are always read.
- Labels use one scale: No issues found (green), things to know (blue), risks (orange), flagged or harmful (red). Who published a
  listing is shown separately on every row.

## Open items

Things that couldn't be done from the build machine on November 1, 2026, or need a decision:

- **Scorecard and Hacker News for listings added November 1.** `api.securityscorecards.dev` and `hn.algolia.com` weren't reachable,
  so those listings say "not checked" instead of showing results. Rerun `fetch.mjs --only <repos>` from a machine that can reach them.
- **OSV.dev** was unreachable during the November 1 scans, so SkillSpector's dependency check used its bundled vulnerability data.
  Rescanning with network access gives fresher dependency results.
- **Very large repositories** (GitHub CLI, uv, Trivy, Semgrep, mise, Ollama, lazygit, lazydocker, difftastic, yt-dlp, Posting,
  Harlequin, VisiData, Glances, k9s, SkillSpector, Chrome MCP) were scanned by their main source folder, because a whole-repository
  scan passed the time limit. `*.scope.txt` and `data/sources.json` say which folder; `node pipeline/scan_scoped.mjs <scan-root>` reruns them.
  Some listings added November 1 (CleanYourTV, Anatomy, Spotifast, Filee, Concat, REA, PdfCraft, PhotoCraft) were scanned without
  their tests, docs, examples or media folders; `*.exclude.txt` lists them and each page says so.
- **Audience testing.** Instead of MiroFish (which needs an LLM API key and its own services this machine can't reach), eight
  simulated users walked the site with headless screenshots: a non-technical marketer, a low-tech small-business owner, a student
  vibe coder, a skeptical security engineer, a Hacker News skeptic, a power developer, a designer and a data analyst. Their findings drove the one-verdict pages, the
  finding reviews, history-aware navigation, search fixes and the install sheet changes. A second round on November 2 (a senior
  developer, a VC, a small-business owner, a vibe coder, a non-technical school administrator and a product lead) drove the honest
  "who checks what" wording, the install-hook reviews, one label scale, installs that follow your setup, What we caught, My list and
  setup links. Real user testing is still worth doing.
- **Links with a #page.** Share buttons and setup links use the artifact's address plus `#listing` or `#setup?…`. Whether claude.ai
  passes the part after `#` to the page hasn't been checked from here; if it doesn't, shared links open on Today.
- **Request a check.** Searching for something not listed offers to ask your own assistant to check it. There's nowhere to send a
  request to Skillshelf yet: that needs a decision on where requests should go (a GitHub issue, a form or a shared database).
- **Publisher-run Purpose Checks.** Listings from companies have the scan and written reviews but not the "what it uses, and why"
  table, which only community projects have so far.
- **Pinned installs.** Installs get the newest version, and each install sheet says which commit was checked. Pinning installs to that
  commit, with checksums, would close the gap.
- **Social signals on the Trending page.** Hacker News search (`hn.algolia.com`) and Reddit (`www.reddit.com`) were blocked by
  the build environment's network policy on November 1, so Trending uses GitHub's trending lists, star growth and the Hacker News
  threads collected earlier. Allow those hosts in the environment's network settings to add live discussion counts.
- **Short videos.** Listings show demo videos their developers link in their READMEs (`pipeline/videos.mjs`). Curating third-party
  reels or TikToks would need a source and permission policy first.
