# Skillshelf bar

A Skills bar that sits above the chat box in every Claude Code session (terminal, IDE, or the Code tab of the Claude desktop app). It works in Claude Code only for now, not in Claude chats on claude.ai or the Claude app.

**Install it** with one line in Claude Code (a terminal or a code editor), then `y` and Enter:

```
/plugin install skillshelf --marketplace qaisak/vetted-store
```

In the Claude desktop app, where `/plugin` doesn't run: click + next to the message box, then Plugins, Add marketplace with `qaisak/vetted-store`, then add Skillshelf.

- **Skill switches.** Each chip shows a skill and whether it's ON or OFF for this session. Click to switch it. A skill you switch off is refused if Claude reaches for it, and Claude is told up front not to use it. Switches last for the session only.
- **All skills.** The bar keeps to a few chips; "All skills (N)" or `/skills-bar` opens a side pane with your skills and their switches, grouped by where they came from: your own and the project's first and open, then each plugin you installed, and connectors. Skills that come with Claude (Claude Code's own, the Claude app's Anthropic-managed set, and Anthropic's own plugins on your Claude account) are left out of the bar and the list; a line says how many, and /skills still has their switches.
- **+ Add skill** opens a small box: paste any skill (a GitHub link or a name, on Skillshelf or not) or say what you need. Claude checks it with Skillshelf; if Skillshelf hasn't checked it, Claude reads its code and tells you what it does and anything risky, then asks before installing.
- **⚑ Flag slop** bans a word or phrase for good. Type what Claude wrote (one per line) and press Ban it: from then on, every Claude Code session tells Claude never to write it. The bar tells Claude in its instructions and, as a backup, in a note beside your message that only Claude sees (sent when the list changes and every 20 messages): some sessions keep personal plugins out of Claude's instructions. **Banned (N)** opens the list, where "Allow again" lifts a ban.

The plugin also connects the Skillshelf connector (`https://skillshelf.skillshelf.workers.dev/mcp`): every skill it suggests has been checked by reading its code. Banned phrases stay on your computer: they are kept by Claude Code for this plugin and never sent to Skillshelf.
