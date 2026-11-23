# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences, spoken to equally (owner's answer, 2026-11-22):

- **Everyday people** who use Claude or a computer but don't know GitHub. They want useful free software and AI add-ons, explained in plain words, and someone to set it up for them.
- **Claude Code users** who want skills and the Skillshelf bar inside Claude Code. They can read a command, but they don't want to dig through READMEs either.

Both arrive with a job in mind ("edit photos", "read my PDFs", "stop paying for X") rather than a project name.

## Product Purpose

Skillshelf is the app store for open source: apps, skills and connectors from GitHub, explained in plain English, and set up for you by Claude.

It exists because GitHub is the biggest free software shelf in the world and most people can't use it: projects are named after jokes, explained in jargon, and installed from a terminal. Skillshelf turns each project into a plain card (what it does, what it replaces, whether it's alive) and hands the setup to Claude.

Success, in the owner's order:

1. The visitor installs the Skillshelf bar in Claude Code.
2. The visitor saves picks to My list to come back to.

## Positioning

- Open source first: every listing is a real public GitHub project, most free.
- "Free alternative to X" where the project itself says so, with the source cited.
- Claude does the setup: the bar, the connector or the Skillshelf marketplace for skills; the download link plus "ask Claude to set it up" for apps.
- Safety is an on-device check, not a central badge: when someone installs, Claude reads the code on their machine and says what it can reach before going ahead. The site no longer leads with security scores.

## Operating Context

- One self-contained HTML file (`pipeline/template.html` built into `vetted-store.html` with the catalog embedded). Published as a private Claude artifact and on Render.
- Three kinds of listing: skills (235), connectors / MCP servers (40), apps (59). 334 in total.
- The Skillshelf bar is a Claude Code plugin, installed with one line: `/plugin install skillshelf --marketplace qaisak/vetted-store` (in the desktop app: + next to the message box, Plugins, Add marketplace). Claude Code only for now.
- The Skillshelf connector (https://skillshelf.skillshelf.workers.dev/mcp) works in Claude chats.
- My list lives in the visitor's browser (localStorage) and can be shared as a link.

## Capabilities and Constraints

- No build tools, no new outside scripts, system fonts or Google Fonts only.
- Light and dark themes. No sideways scroll at 375px. Keyboard usable.
- Navigation: three tabs only (Home, Browse, My list). Skills, Connectors and Apps are a filter in Browse.
- The existing review data (Purpose Check, SkillSpector scan, OpenSSF Scorecard, review notes, repository health, discussions) stays, folded under "Technical details" on each listing.

## Brand Commitments

- Name: Skillshelf.
- Look: a familiar app store. The owner chose the category standard on purpose (2026-11-22): it should feel like Apple's App Store and the Mac App Store (big titles, rows with a Get button, clean product pages, a left sidebar on desktop and a bottom tab bar on phones). Their craft level is the bar. Skillshelf's own touch stays small: the "Free alternative to X" tag.
- Voice: plain, simple, friendly English for non-technical readers. No jargon without a one-line explanation. No AI-writing tells (the owner bans them; see the Avoid AI Writing skill).
- Only real data. Nothing invented: no fake reviews, counts, testimonials or alternatives.
- Never call a project unsafe without reading its code.

## Evidence on Hand

- `data/data.json`, `data/purpose.json`, `data/scan-reports/`, `pipeline/reviews.json`: the catalog and its checks.
- GitHub stars, last commit dates, licenses and Hacker News threads per repository.
- Developer-linked demo videos for some listings (`data/videos.json`).
- "Free alternative to X" data in `data/alternatives.json`, each with a source URL. Most listings have none, and must stay blank rather than guess.
- No user counts, ratings, testimonials or press. Don't fabricate them.

## Product Principles

1. **Benefit before mechanism.** Say what the visitor gets ("free photo editor that opens Photoshop files") before how it works.
2. **One decision per screen.** A listing page answers "do I want this, and how do I get it?" Everything else is folded away.
3. **Claude does the hard part.** Every install path ends in Claude setting it up, never a wall of commands.
4. **Cite or leave it out.** Every claim on a card traces back to the project's own words or GitHub's numbers.
5. **Safety happens on the device.** Point to the check Claude runs at install time; don't grade projects from afar.
