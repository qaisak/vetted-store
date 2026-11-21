# Skillshelf: handoff to a local Claude Code session

Written at the end of a cloud session so a Claude Code session on the owner's own computer can pick up. Branch: `claude/clever-knuth-9eryqo`.

## What Skillshelf is

A store of AI skills, connectors (MCP servers) and apps. Every listing is checked by reading its code, explained in plain English, and serious security issues are colour-coded on the listing.

- **Site:** a single-file page published as a Claude artifact, https://claude.ai/artifact/FPBcjYdeXFHDF2zDMqhGCG. It is built from `pipeline/template.html` into `vetted-store.html`. Edit the template, never the output.
- **Build:** `node pipeline/build.mjs data/data.json pipeline/template.html vetted-store.html data/scan-reports data/purpose.json`
- **Tests:** `node pipeline/smoke.mjs vetted-store.html` and `node pipeline/flows.cjs vetted-store.html`

House rules:
- Only real data, nothing invented.
- Never call a project unsafe without reading its code.
- Record review findings in `pipeline/reviews.json`.
- Commit and push after each piece of work. No pull requests unless asked.
- Plain, simple wording for the owner.

## The connector (main product): `connector/`

A remote MCP server on Cloudflare Workers, live at https://skillshelf.skillshelf.workers.dev/mcp. It has no dependencies; reports go to the D1 database `skillshelf`, whose `database_id` is committed in `wrangler.toml`.

Tools:

| Tool | What it does |
|---|---|
| `find_skills` | Search checked skills, connectors and apps for a task. |
| `check_skill` | One listing's check, by name, id or GitHub link. |
| `flag_slop` | Report a listed skill's bad output. Fixed reasons only; a note is never shown to others. |
| `my_skills` | Claude passes the skills it has in the chat, plus `app`: `claude-code` or `claude-app`. The panel matches each to Skillshelf's check, gives per-chat on/off switches (it tells Claude via `ui/update-model-context`), and has a Find more tab. In Claude Code it adds **Turn off for good** (asks Claude Code to set `skillOverrides`) and **Add to Claude Code** (asks it to run the checked install command), both via `ui/message`. |
| `check_slop` | Highlights common AI-writing tells (`src/slop.js`). The user can ban the ones they pick for this chat, ask for a rewrite, or copy a rule for Claude's personal preferences. Text is not stored. |
| `how_to_toggle` | Steps to switch a skill off in the Claude app or Claude Code. |

Cards:
- Every tool shows an interactive card: MCP Apps, `ui://skillshelf/card.html` from `src/card.html`. The card is fully inline, uses the host's theme, and needs no network.
- Claude Code itself supports MCP Apps (it advertises `io.modelcontextprotocol/ui` when `CLAUDE_CODE_MCP_APPS_HOST` is set, which a hosting app like the desktop Code tab does). Whether the owner's desktop app version actually draws the card has **not been confirmed yet**.

Other endpoints:
- `GET /`: how to add the connector.
- `GET /flags.json`: 30-day report counts per listing.
- `GET /skillshelf.mcpb`: the desktop extension download.

Commands:
- Deploy: `cd connector && npx wrangler deploy` (needs `wrangler login`).
- Tests: `node connector/test/worker.test.mjs` (35 checks), and `node connector/test/card.test.mjs [screenshot-dir]` (54 checks; loads the card in a sandboxed iframe with a stand-in host).

## Desktop extension (bonus for Claude Code users): `desktop/`

- A local MCP server packed as `desktop/dist/skillshelf.mcpb`.
- It lists Claude Code skills on the computer (personal, chosen projects, plugins) with real on/off switches via Claude Code's `skillOverrides`, and keeps a backup of the settings file.
- Build it with `node desktop/pack.mjs`. That also copies the package to `connector/src/skillshelf-desktop.bin`, so redeploy the connector after repacking.
- Test it with `node desktop/test/desktop.test.mjs` (30 checks).
- The owner has no `~/.claude/skills` folder, so for them it shows nothing. Their 13 skills are Claude app skills.

## What is NOT done or NOT confirmed

1. **Deploy the latest commit.** The live connector has the 6 tools, but not the Claude Code mode added in commit `acac178`. Pull, then `cd connector && npx wrangler deploy`. Check that `tools/list` on the live `/mcp` returns 6 tools, and that the `my_skills` input schema has an `app` property.
2. **Confirm the panel shows in the desktop app's Code tab.**
   - Start a **new** Code session with Skillshelf switched on in the connectors (+) menu **before** the first message. Switching it on mid-session doesn't load its tools.
   - Then ask "open my skills in Skillshelf". Keep "in Skillshelf"; plain "show my skills" makes Claude use its own built-in skill list instead.
   - If only text appears, the app isn't drawing MCP Apps cards there. In that case make the text answers stand on their own: numbered skills, and clear "say 'turn off X for good'" prompts that Claude Code then carries out.
3. **Connector name in Claude.** It was first added as "SkillShare" (a different company). Claude doesn't allow renaming: remove it and re-add it as "Skillshelf" with the same URL.
4. **Slop reports.** `flag_slop` has never been sent against production, so whether the D1 `flags` table exists remotely is unconfirmed. If unsure, run `npx wrangler d1 execute skillshelf --remote --file schema.sql` (safe: `CREATE TABLE IF NOT EXISTS`).
5. **Sharing.** The site artifact is private. The owner must set Share → "anyone with the link" before posting it anywhere.
6. **Ideas not started:**
   - real one-tap "Add" for Claude app skills (Anthropic offers no API; today it links to the listing's upload steps);
   - importing `/flags.json` counts into the site's weekly refresh;
   - a Cloudflare API token, so cloud sessions can deploy without the laptop.
