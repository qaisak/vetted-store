---
name: Skillshelf
description: The app store for open source. Apps, skills and connectors from GitHub, explained in plain English, and set up for you by Claude.
colors:
  bg: "#FAF8F5"
  bg-grouped: "#F2EEE8"
  card: "#FFFFFF"
  card-line: "#E6E1D9"
  sidebar: "#F3F0EA"
  fill: "#ECE8E1"
  label: "#1C1A17"
  label-secondary: "#5E5850"
  label-tertiary: "#8C857B"
  separator: "rgba(70, 50, 30, 0.14)"
  kind-app: "#2156D1"
  kind-skill: "#7A3BD6"
  kind-connector: "#0E7A6E"
  gold: "#B7791F"
  gold-ink: "#8A5300"
  gold-bg: "#FDF1D3"
  highlighter: "#FCDC6A"
  band-green: "#E6F3E9"
  band-blue: "#E7EFFB"
  band-violet: "#EFEAF9"
  accent: "#0062CC"
  button: "#0062CC"
  green: "#248A3D"
  green-ink: "#1B6B31"
  orange: "#C26A00"
  red: "#FF3B30"
  dark-bg: "#121110"
  dark-bg-grouped: "#1E1C1A"
  dark-fill: "#2C2925"
  dark-label: "#F5F2ED"
  dark-label-secondary: "#ADA69C"
  dark-kind-app: "#8DB2FF"
  dark-kind-skill: "#C3A6FF"
  dark-kind-connector: "#5FD4C2"
  dark-gold: "#F2C14E"
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

Four tabs: Home, Browse, Free alternatives, My list. Apps, Skills and Connectors are a filter inside Browse. Home is one page for everyone (no "new to AI" / "Claude Code" switch, owner's call 2026-11-22).

The owner found the pure Apple palette tiring ("a wall of grey boxes"), so since 2026-11-22 the store keeps the App Store grammar but is warmer and has more colour: a warm off-white page, white cards with a hairline edge, a colour per kind and per topic, and three tinted bands on Home. Colour always has a job (wayfinding, a kind, a state); it never decorates on its own.

## Colors

### Primary
- **Accent blue** (`#0062CC` light, `#4BA3FF` dark): links, Get text, active nav icons. Darker than Apple's system blue so it passes 4.5:1 as text.
- **Button blue** (`#0062CC` light, `#0A68D4` dark): filled primary buttons with white text.

### Secondary
- **Free green** (`--green-ink` `#1B6B31` light / `#4CD777` dark, on a 16% green tint): only for "Free alternative to X" and "Free" tags.

- **Kind colours**: App blue `#2156D1`, Skill violet `#7A3BD6`, Connector teal `#0E7A6E` (lighter in dark mode). Always a dot next to the word, never colour alone: on cards and in Browse's kind filter.
- **Topic and area colours**: each Browse topic (the `JOBS` list) and each Free alternatives area (`AREAS`) has a hue and an icon. Chips show the icon in that hue; the selected chip fills with it (darkened 18% so white text passes).
- **Gold** (`#B7791F`, ink `#8A5300` on `#FDF1D3`): GitHub stars and the "+N stars this week" pill.
- **Highlighter** (`#FCDC6A`): the marker stroke behind "open source" in the hero, and text selection.
- **Bands on Home**: Free alternatives on green `#E6F3E9`, the Skillshelf bar on blue `#E7EFFB`, Skills on violet `#EFEAF9`. Text on a band uses a secondary colour tinted from that band, not grey. Edge to edge on phones.

### Neutral
- Warm off-white page `#FAF8F5`, white cards with a `#E6E1D9` edge, `#F2EEE8` grouped panels, `#ECE8E1` fills for controls; near-black page `#121110` with `#1E1C1A` / `#2C2925` in dark mode.
- Text `#1C1A17`, not pure black. Secondary text `#5E5850` (light) and `#ADA69C` (dark); tertiary `#8C857B` / `#8F887E` for icons and decoration only, never for text a visitor must read.

### Named Rules
- **Green means free.** Green tags appear only where `data/alternatives.json` cites the project's own words.
- **Orange and red are for real risks.** As text or tags they appear only inside "Before you install" or Technical details, from a reviewer's written note. (A topic's icon hue is not a warning.)
- **Every colour has a job.** No gradients on text, no glows, no colour that isn't a kind, a topic, a state or one of the three bands.

## Typography

One family: the platform's system UI face (SF on Apple devices, Segoe UI on Windows), as the App Store does. Monospace only for commands people copy.

### Hierarchy
- Hero 40px/800 (32px on phones), home only.
- Large title 34px/700 for page titles; product name 26px/700.
- Section headings 22px/700 with a 15px secondary-text subtitle under them.
- Body 15px, row titles 16px, captions 13px, tags 11.5 to 13.5px. Nothing a visitor must read is under 11px.

## Layout

- Desktop: a 240px sidebar (wordmark, search, four tabs) and a content column up to 1120px wide with 36px gutters.
- Phones (760px and below): no sidebar, a four-tab bar fixed at the bottom, 16px gutters, horizontal swipe rows for Home's shelves.
- Shelves are separated by a hairline rule and 34px of space (no rule right after a band); a heading sits closer to its content than to the shelf above.
- Rows: 64px icon, title (up to two lines), one plain line, a meta line (kind, stars, last update) and an optional green tag, with Get on the right.

## Elevation & Depth

Mostly flat. Cards sit on the page with a hairline edge and a barely-there shadow, and lift 2px with a soft offset shadow (`0 12px 28px -14px`) on hover. Things that float get more: the install sheet and dialogs (`0 10px 40px` soft shadow over a scrim). The selected segment in Browse's kind filter and the selected sidebar item are white with `0 1px 3px`.

## Shapes

Squircle icons (22.5% radius). Pills for buttons and chips. 10px controls, 14 to 20px panels.

## Components

### Buttons
- **Get**: grey pill, blue text. **Get primary**: blue pill, white text, used once per screen (the product page's Get, Copy for Claude).
- **Pill links**: Save, Share, GitHub.

### Chips
- Idea chips under the home search, topic chips in Browse and area chips on Free alternatives: white pills with an edge, an icon in their own colour, and a count where it helps.

### Cards / Containers
- White cards (project cards, free-alternative cards, How it works steps) on the warm page or on a band. Grouped warm panels for install options on listing pages. The Skillshelf bar card is the blue band itself. Never a card inside a card, except the drawing of the Claude Code bar, which is a picture of an app.
- On phones, Home's shelves swipe sideways (one card and the edge of the next); Browse stays a single column.

### Inputs / Fields
- White search fields with an edge and a leading magnifier (the sidebar's sits in a fill). One query is shared by the sidebar, home and Browse search boxes.

### Navigation
- Sidebar with four items on desktop; bottom tab bar with the same four on phones. Each tab's icon has its own colour (Home blue, Browse violet, Free alternatives green, My list rose). Listing, job and kit pages light up Browse.

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
