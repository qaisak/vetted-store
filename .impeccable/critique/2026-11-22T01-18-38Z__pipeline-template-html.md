---
target: Skillshelf site
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
target_identity: "file:C:\\Users\\qaisa\\OneDrive\\Career\\vetted-store\\pipeline\\template.html"
target_fingerprint: "sha256:e7d8cd724c448fc3338e85f2b1ae7264f18e007d595143cff4c4dd3d150882ea"
target_path: "C:\\Users\\qaisa\\OneDrive\\Career\\vetted-store\\pipeline\\template.html"
timestamp: 2026-11-22T01-18-38Z
slug: pipeline-template-html
---
Method: dual-agent (A: design review · B: detector + browser)

## Design Health Score
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Back link says "Today" or "Home" depending on entry |
| 2 | Match system / real world | 2 | Jargon: Agent Skill, AGPL-3.0, POWERSHELL, raw scanner labels |
| 3 | User control and freedom | 3 | Make it yours can quietly hide listings |
| 4 | Consistency and standards | 2 | 9 sidebar entries vs 5 different phone tabs; kits, powers, jobs share one card |
| 5 | Error prevention | 3 | `irm ... | iex` shown before "let your AI install it" |
| 6 | Recognition rather than recall | 3 | Truncated names; "one thing worth knowing below" hidden in a closed drawer |
| 7 | Flexibility and efficiency | 3 | No sort on lists |
| 8 | Aesthetic and minimalist design | 1 | Home 7 shelves / ~35 equal cards; listing ~7,900px when opened |
| 9 | Error recovery | 3 | Good empty states |
| 10 | Help and documentation | 2 | Help explains the security check, not setup or what a skill is |
| **Total** | | **25/40** | Acceptable |

## Design Specificity Verdict
LLM: an Apple App Store look without its selling devices (no screenshots, synthetic glyph icons, one card shape for everything). Nothing shows "open source", "free alternative", or "Claude sets it up"; the page still pitches security.
Detector: CLI 1 finding (low-contrast, false positive from theme mixing). Browser: ~25-105 findings per view, mostly real contrast misses (#007AFF GET pills 3.5:1, 10px status captions, 2.0:1 inactive phone tabs, 1.6:1 banner captions on lime), plus straggler, nested-cards, ai-color-palette (listing icon gradients). No overflow at 375px.

## Priority Issues
- [P0] Home doesn't say what the visitor gets; the bar (success #1) sits after 10 tiles. Fix: benefit hero, bar card in the first viewport, free-alternatives shelf. (shape, clarify)
- [P1] Navigation sprawl: 9 sidebar entries, 4 parallel groupings in Browse. Fix: Home / Browse / My list; kinds as a filter. (distill, layout)
- [P1] Getting a listing is a wall of commands; skills need a zip-unzip-rezip routine. Fix: one "Set it up with Claude" path, raw commands folded. (clarify, distill)
- [P1] Cards all look the same; synthetic icons; unlabeled counts. Fix: real avatars/images, benefit line + alive signals, labeled counts. (bolder, typeset)
- [P2] Security wording everywhere (row captions, verdict, scary drawer). Fix: move into Technical details. (clarify)

## Persona Red Flags
Maya (everyday): doesn't know what skills/connectors are; meets AGPL, PowerShell and a hidden .agent folder before Claude. Alex (Claude Code): bar commands buried; listing installs use a third-party CLI, not the Skillshelf marketplace. Casey (phone): bar setup takes ~900px on a phone; action pills wrap to 3 rows.

## Minor Observations
Empty "What it uses" heading on Impeccable; duplicate "See the full check"; contrast misses on system blue; 10px tab labels.

## Questions to Consider
Why show bar commands to visitors who can't use Claude Code? What would home look like with one sentence, one button and three real projects? Does a listing need a verdict at all if Claude checks on the device?
