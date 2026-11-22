# Skillshelf bar

A Skills bar that sits above the chat box in every Claude Code session (terminal, IDE, or the Code tab of the Claude desktop app).

- **Skill switches.** Each chip shows a skill and whether it's ON or OFF for this session. Click to switch it. A skill you switch off is refused if Claude reaches for it, and Claude is told up front not to use it. Switches last for the session only.
- **All skills.** The bar keeps to a few chips; "All skills (N)" or `/skills-bar` opens a side pane with every skill and its switch.
- **+ Add skill** opens a small box: paste any skill (a GitHub link or a name, on Skillshelf or not) or say what you need. Claude checks it with Skillshelf; if Skillshelf hasn't checked it, Claude reads its code and tells you what it does and anything risky, then asks before installing.
- **⚑ Flag slop** bans a word or phrase for good. Type what Claude wrote (one per line) and press Ban it: from then on, every session tells Claude never to write it. **Banned (N)** opens the list, where "Allow again" lifts a ban and "Copy for the Claude app" copies the rule to paste into Settings → Your Claude → Instructions, so claude.ai chats follow it too.

The plugin also connects the Skillshelf connector (`https://skillshelf.skillshelf.workers.dev/mcp`), which every skill it suggests has been checked by reading its code. Banned phrases stay on your computer: they are kept by Claude Code for this plugin and never sent to Skillshelf.
