#!/bin/bash
# Blind judging: <brief> <round>. Copies the five pages' screenshots under shuffled letters, asks a fresh Claude session
# (file reading only) to score them on a fixed rubric, and saves the key that maps letters back to contestants.
SP=${DT_ROOT:?set DT_ROOT to a work folder}
b="$1"; r="$2"; dir="$SP/dt/judge/$b-$r"; rm -rf "$dir"; mkdir -p "$dir"
# Rounds 4-6 rotate the order, so every contestant sits in a different slot each round
base=(impeccable hallmark none frontend-design taste-skill); [ "$b" = streakly ] && base=(none hallmark frontend-design taste-skill impeccable)
rot=$(( (r - 3) * 2 )); order=(); for i in 0 1 2 3 4; do order+=("${base[$(( (i + rot) % 5 ))]}"); done
letters=(A B C D E); key="{"
for i in 0 1 2 3 4; do L=${letters[$i]}; c=${order[$i]}
  cp "$SP/dt/shots/$b-$c-desk.png" "$dir/$L-desktop-first-screen.png"; cp "$SP/dt/shots/$b-$c-full.png" "$dir/$L-desktop-full-page.png"; cp "$SP/dt/shots/$b-$c-phone.png" "$dir/$L-phone-first-screen.png"
  key="$key\"$L\":\"$c\"$([ $i -lt 4 ] && echo ,)"; done
echo "$key}" > "$SP/dt/judge/$b-$r.key.json"
declare -A BRIEF=( [streakly]="a landing page for Streakly, a habit-tracking app for busy parents" [bakery]="a homepage for Rosa's Bakery, a neighborhood bakery in Lisbon that takes pre-orders for weekend pastries" )
prompt="You are judging five websites, A to E, all made for the same brief: ${BRIEF[$b]}. In this folder each one has three screenshots: X-desktop-first-screen.png, X-desktop-full-page.png and X-phone-first-screen.png. Look at all fifteen with the Read tool before scoring.
Score each site from 1 to 10 on: designed (looks made by a skilled designer for this business, not a generic template), clarity (you instantly get what it is and what to do next), fit (suits this business and its customers), polish (spacing, type, alignment, nothing broken), phone (works well on the phone screenshot). Be strict and use the whole scale.
Reply with only JSON: {\"scores\": {\"A\": {\"designed\": n, \"clarity\": n, \"fit\": n, \"polish\": n, \"phone\": n, \"why\": \"one sentence\"}, ...}, \"best\": \"letter\", \"worst\": \"letter\"}"
cd "$dir" && timeout 900 "$SP/dt/cc.sh" claude-opus-5-5 "$prompt" --output-format json --allowedTools "Read,Glob" > "$SP/dt/judge/$b-$r.result.json" 2> "$SP/dt/judge/$b-$r.err"
