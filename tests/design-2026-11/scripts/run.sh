#!/bin/bash
# One design test run: <contestant> <brief-id>. Installs the skill into the project's .claude/skills (what `npx skills add --agent claude-code` does)
# and runs headless Claude Code limited to file tools in that folder (no shell commands), logging every event.
SP=${DT_ROOT:?set DT_ROOT to a work folder}
c="$1"; b="$2"; MODEL=claude-sonnet-5-5
declare -A SRC=( [frontend-design]="anthropics__skills/skills/frontend-design" [taste-skill]="Leonxlnx__taste-skill/skills/taste-skill" [impeccable]="pbakaus__impeccable/.agent/skills/impeccable" [hallmark]="Nutlope__hallmark/skills/hallmark" )
declare -A BRIEF=( [streakly]="Build a landing page for Streakly, a habit-tracking app for busy parents. Save it as a single index.html in this folder, with inline CSS and no build step." [bakery]="Build a homepage for Rosa's Bakery, a neighborhood bakery in Lisbon that takes pre-orders for weekend pastries. Save it as a single index.html in this folder, with inline CSS and no build step." )
dir="$SP/dt/runs/$b/$c"; rm -rf "$dir"; mkdir -p "$dir"
if [ "$c" != "none" ]; then mkdir -p "$dir/.claude/skills"; cp -r "$SP/dt/src/${SRC[$c]}" "$dir/.claude/skills/$c"; fi
cd "$dir"; start=$(date +%s)
timeout 1500 "$SP/dt/cc.sh" "$MODEL" "${BRIEF[$b]}" --output-format stream-json --verbose --permission-mode acceptEdits --allowedTools "Read,Write,Edit,Glob,Grep,Skill" > "$SP/dt/runs/$b/$c.jsonl" 2> "$SP/dt/runs/$b/$c.err"
echo "{\"contestant\":\"$c\",\"brief\":\"$b\",\"exit\":$?,\"seconds\":$(( $(date +%s) - start ))}" > "$SP/dt/runs/$b/$c.meta.json"
