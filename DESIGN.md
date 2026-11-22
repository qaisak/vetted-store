---
name: Skillshelf
description: The app store for open source. Apps, skills and connectors from GitHub, explained in plain English, and set up for you by Claude.
colors:
  bg: "#FFFFFF"
  bg-grouped: "#F2F2F7"
  card: "#FFFFFF"
  sidebar: "#F5F5F7"
  fill: "#EEEEF3"
  label: "#000000"
  label-secondary: "#636368"
  label-tertiary: "#8A8A8E"
  separator: "rgba(60, 60, 67, 0.18)"
  accent: "#0062CC"
  button: "#0062CC"
  green: "#248A3D"
  green-ink: "#1B6B31"
  orange: "#C26A00"
  red: "#FF3B30"
  dark-bg: "#000000"
  dark-bg-grouped: "#1C1C1E"
  dark-fill: "#2C2C2E"
  dark-label: "#FFFFFF"
  dark-label-secondary: "#A1A1A8"
  dark-accent: "#4BA3FF"
  dark-button: "#0A68D4"
  dark-green-ink: "#4CD777"
typography:
  hero:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"SF Pro Display\", \"Segoe UI Variable Text\", \"Segoe UI\", system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  large-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"SF Pro Display\", \"Segoe UI Variable Text\", \"Segoe UI\", system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 700
    lineHeight: 1.1
  section:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"SF Pro Display\", \"Segoe UI Variable Text\", \"Segoe UI\", system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"SF Pro Text\", \"Segoe UI Variable Text\", \"Segoe UI\", system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.4
  caption:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"SF Pro Text\", \"Segoe UI Variable Text\", \"Segoe UI\", system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.35
  code:
    fontFamily: "ui-monospace, \"SF Mono\", \"Cascadia Mono\", Menlo, Consolas, monospace"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1.45
rounded:
  tag: "6px"
  control: "10px"
  card: "14px"
  panel: "18px"
  feature: "20px"
  pill: "999px"
  icon: "22.5%"
spacing:
  xs: "6px"
  sm: "10px"
  md: "14px"
  lg: "18px"
  section: "34px"
  gutter-phone: "16px"
  gutter-desktop: "36px"
components:
  button-get:
    backgroundColor: "{colors.fill}"
    textColor: "{colors.accent}"
    rounded: "{rounded.pill}"
    height: "30px"
    padding: "0 16px"
  button-get-primary:
    backgroundColor: "{colors.button}"
    textColor: "{colors.bg}"
    rounded: "{rounded.pill}"
    height: "30px"
    padding: "0 16px"
  pill-link:
    backgroundColor: "{colors.fill}"
    textColor: "{colors.accent}"
    rounded: "{rounded.pill}"
    height: "30px"
    padding: "0 14px"
  alt-tag:
    backgroundColor: "color-mix(in srgb, {colors.green} 16%, transparent)"
    textColor: "{colors.green-ink}"
    rounded: "{rounded.tag}"
    padding: "4px 8px"
  search-field:
    backgroundColor: "{colors.fill}"
    textColor: "{colors.label}"
    rounded: "{rounded.control}"
    padding: "10px 12px 10px 34px"
  card-grouped:
    backgroundColor: "{colors.bg-grouped}"
    rounded: "{rounded.panel}"
    padding: "16px"
---

# Design System: Skillshelf

## Overview

Skillshelf looks like an app store on purpose. The owner chose the category standard (Apple's App Store and the Mac App Store) so that anyone, including people who have never used GitHub, already knows how to use it: big titles, rows with a Get button, clean product pages, a left sidebar on desktop and a bottom tab bar on phones. The craft bar is those stores.

What makes it Skillshelf is the content, not ornament: every picture is the maker's real GitHub picture, every card says what the project does in plain words, and where a project itself says it replaces a paid tool, a small green "Free alternative to X" tag says so, with the source one click away. Safety is not a badge on cards; each listing ends with "Before you install", where Claude reads the code on the visitor's own computer.

Three tabs only: Home, Browse, My list. Apps, Skills and Connectors are a filter inside Browse.

## Colors

### Primary
- **Accent blue** (`#0062CC` light, `#4BA3FF` dark): links, Get text, active nav icons. Darker than Apple's system blue so it passes 4.5:1 as text.
- **Button blue** (`#0062CC` light, `#0A68D4` dark): filled primary buttons with white text.

### Secondary
- **Free green** (`--green-ink` `#1B6B31` light / `#4CD777` dark, on a 16% green tint): only for "Free alternative to X" and "Free" tags.

### Neutral
- White page, `#F2F2F7` grouped panels, `#EEEEF3` fills for controls; black page with `#1C1C1E` / `#2C2C2E` in dark mode.
- Secondary text `#636368` (light) and `#A1A1A8` (dark); tertiary `#8A8A8E` / `#8E8E93` for icons and decoration only, never for text a visitor must read.

### Named Rules
- **Green means free.** Green tags appear only where `data/alternatives.json` cites the project's own words.
- **Orange and red are for real risks.** They appear only inside "Before you install" or Technical details, from a reviewer's written note.

## Typography

One family: the platform's system UI face (SF on Apple devices, Segoe UI on Windows), as the App Store does. Monospace only for commands people copy.

### Hierarchy
- Hero 40px/800 (32px on phones), home only.
- Large title 34px/700 for page titles; product name 26px/700.
- Section headings 22px/700 with a 15px secondary-text subtitle under them.
- Body 15px, row titles 16px, captions 13px, tags 11.5 to 13.5px. Nothing a visitor must read is under 11px.

## Layout

- Desktop: a 240px sidebar (wordmark, search, three tabs) and a content column up to 1120px wide with 36px gutters.
- Phones (760px and below): no sidebar, a three-tab bar fixed at the bottom, 16px gutters, horizontal swipe rows for shelves.
- Shelves are separated by a hairline rule and 34px of space; a heading sits closer to its content than to the shelf above.
- Rows: 64px icon, title (up to two lines), one plain line, a meta line (kind, stars, last update) and an optional green tag, with Get on the right.

## Elevation & Depth

Flat, like the stores. Depth only for things that float: the install sheet and dialogs (`0 10px 40px` soft shadow over a scrim) and the selected segment in Browse's kind filter (`0 1px 3px`).

## Shapes

Squircle icons (22.5% radius). Pills for buttons and chips. 10px controls, 14 to 20px panels.

## Components

### Buttons
- **Get**: grey pill, blue text. **Get primary**: blue pill, white text, used once per screen (the product page's Get, Copy for Claude).
- **Pill links**: Save, Share, GitHub.

### Chips
- Idea chips under the home search and job chips (job name plus a count) in grey pills.

### Cards / Containers
- Grouped grey panels for the Skillshelf bar card, the free-alternative cards and the install options. Never a card inside a card, except the drawing of the Claude Code bar, which is a picture of an app.

### Inputs / Fields
- Grey search fields with a leading magnifier. One query is shared by the sidebar, home and Browse search boxes.

### Navigation
- Sidebar with three items on desktop; bottom tab bar with the same three on phones. Listing, job and kit pages light up Browse.

### Free alternative card (signature)
- "Instead of" with the paid product's name struck through in red, then the project's icon, name and plain line, and a green Free tag. Only for listings whose `alt.paid` is true.

## Do's and Don'ts

### Do:
- Lead every listing with what it does in plain words, then what it replaces, how Claude sets it up, and what Claude checks before installing.
- Use the maker's real GitHub picture for every icon.
- Cite the project's own words for every "Free alternative to X".
- Keep everything older (scans, scores, discussions) under Technical details.

### Don't:
- Don't put safety labels or scores on cards.
- Don't add tabs: new collections become a shelf on Home or a filter in Browse.
- Don't invent alternatives, counts, ratings or reviews.
- Don't use the tertiary grey for readable text.
