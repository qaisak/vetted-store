# Vetted Skill Store

An App Store-style catalog of real open-source projects: CLI apps, agent skills and MCP servers.
Projects from **independent developers** are the focus: each gets a **Purpose Check** (what its code can
actually do, compared with what it says it's for) and a static **NVIDIA SkillSpector** scan.
Projects from companies (Anthropic, OpenAI, NVIDIA, GitHub, Microsoft, Google and others) are listed as
**Trusted publishers** and aren't scanned up front.

The site is a single self-contained page: [`vetted-store.html`](vetted-store.html), published as a Claude artifact.

## Layout

| Path | What it is |
| --- | --- |
| `vetted-store.html` | The built site (generated, don't edit by hand) |
| `pipeline/template.html` | Site source: HTML, CSS and JS; the build injects the data |
| `pipeline/fetch.mjs` | Pulls repo metadata, SKILL.md files, OpenSSF Scorecard, Hacker News threads, README install lines and avatars |
| `pipeline/scan.mjs` | Runs SkillSpector on every skill and MCP server |
| `pipeline/scan_scoped.mjs` | Scans only the main source folder of repos too large for a whole-repo scan |
| `pipeline/purpose_analyze.mjs` | The Purpose Check: production-code filter, capability detection, purpose profiles, tool extraction, peer comparison |
| `pipeline/reviews.json` | Human reviews of every mismatch (benign reasons, and "worth knowing" notices) |
| `pipeline/build.mjs` | Builds the data and writes `vetted-store.html` |
| `data/data.json` | Fetched listings and repo data (October 31, 2026) |
| `data/purpose.json` | Purpose Check results |
| `data/scan-reports/` | SkillSpector JSON reports, one per listing (`*.scope.txt` marks scoped scans) |

## Rebuild the site

Only needs Node.js 20 or newer:

```bash
node pipeline/build.mjs data/data.json pipeline/template.html vetted-store.html data/scan-reports data/purpose.json
```

## Full pipeline

1. **Fetch** (GitHub allows 60 unauthenticated API calls an hour; responses are cached in `pipeline/cache/`):
   `node pipeline/fetch.mjs data/data.json`
2. **Download sources** for scanning into `<scan-root>/src/<owner>__<repo>/<repo>-<branch>/` (GitHub zip archives).
3. **Scan** (needs SkillSpector: `uv tool install --python 3.12 "skillspector @ https://github.com/NVIDIA/SkillSpector/archive/refs/heads/main.zip"`):
   `node pipeline/scan.mjs data/data.json <scan-root> 6`; reports land in `<scan-root>/out/`.
   Set `SKILLSPECTOR` if the executable isn't on your PATH.
4. **Purpose Check**: `node pipeline/purpose_analyze.mjs data/data.json <scan-root> data/purpose.json`
5. **Build** as above, pointing the scan-reports argument at `<scan-root>/out` or `data/scan-reports`.

## How the Purpose Check decides

- Only production code counts: tests, docs, examples, demos, vendored code, build scripts and comments are set aside.
- Seven kinds of access are detected: network, files, running programs, environment variables, tokens and keys, secret files, browser control.
- Each is compared with the project's purpose profile (hand-written for apps and MCP servers, inferred from the description for skills).
- Every mismatch, and every serious SkillSpector finding that isn't explained by the purpose, must have a written review in `reviews.json`. Otherwise the listing shows "Does more than stated".
