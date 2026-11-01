// Purpose-relative safety check for every listing that has code to read.
// (1) keep only production code, (2) detect what it can actually do, (3) compare with what it says it's for,
// (4) for MCP servers, extract tool definitions and check descriptions for tool poisoning,
// (5) where a SkillSpector report exists, split its findings by where they live and compare with peers.
// Usage: node purpose_analyze.mjs <data.json> <scan-root> <out.json>
// If <out.json> exists, listings whose source isn't under <scan-root> keep their earlier result, so you can
// check new listings without downloading every repository again.
import fs from 'node:fs';
import path from 'node:path';
import { NONPROD, CODE, NONPROD_SKILL, fileKind, CAT_CAP, OTHER_NOTES, capOfFinding } from './filekind.mjs';

const [, , DATA, ROOT, OUT] = process.argv;
const d = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const REVIEW_DATE = '2026-10-31';   // a profile's own `date` wins (listings added later)

const S = 'modelcontextprotocol__servers/servers-main/src/';
// Hand-written profiles: purpose from each project's README, plus the access that purpose needs.
const PROFILES = {
  // Trusted-organization MCP servers (kept for "scan anyway")
  'mcp-everything': { dir: S + 'everything', purpose: 'A test server that exercises every MCP feature so client developers can check their apps. Not meant for real work.', expect: { files: 'Serves sample file resources', network: 'A demo tool fetches a URL and returns it gzipped', env: 'A demo tool lists environment variables, with secret-looking values masked' } },
  'mcp-fetch': { dir: S + 'fetch', purpose: 'Fetches a web page and converts it to markdown for the model.', expect: { network: 'Fetching URLs is its job' } },
  'mcp-filesystem': { dir: S + 'filesystem', purpose: 'Reads, writes and searches files inside folders you allow.', expect: { files: 'File access is its job', env: 'Reads standard settings like HOME' } },
  'mcp-git': { dir: S + 'git', purpose: 'Reads and changes a local Git repository: status, diff, log, commit, branches.', expect: { files: 'Works on a repo on disk', shell: 'Drives the git program' } },
  'mcp-memory': { dir: S + 'memory', purpose: 'Stores a knowledge graph of facts in a local file so the model can remember things.', expect: { files: 'Saves memory to a JSON file', env: 'File location is set by an environment variable' } },
  'mcp-sequentialthinking': { dir: S + 'sequentialthinking', purpose: 'A thinking scratchpad: records step-by-step reasoning. Touches nothing outside itself.', expect: { env: 'Reads a logging setting' } },
  'mcp-time': { dir: S + 'time', purpose: 'Tells the current time and converts between time zones.', expect: { env: 'Can read the local time zone setting' } },
  'mcp-github-mcp-server': { purpose: 'Lets the model work with GitHub: repos, issues, pull requests, Actions, code search.', expect: { network: 'Calls the GitHub API', credentials: 'Needs your GitHub token', env: 'Token and settings come from environment variables', files: 'Reads its config and toolset files' } },
  'mcp-playwright-mcp': { purpose: 'Controls a real browser with Playwright so the model can navigate, click and fill forms.', expect: { browser: 'Browser control is its job', network: 'Browsing the web', files: 'Saves screenshots, traces and downloads', shell: 'Launches the browser process', env: 'Browser and proxy settings' },
    note: 'This repository is a thin wrapper. Most of Playwright MCP\'s code ships inside the playwright package, which this check did not cover.' },
  'mcp-context7': { purpose: 'Fetches up-to-date library documentation from the Context7 service. Its setup CLI writes agent config files.', expect: { network: 'Calls the Context7 API', credentials: 'Uses a Context7 API key and OAuth sign-in', env: 'API key and settings from environment variables', files: 'Setup CLI writes agent config and skill files' } },
  'mcp-chrome-devtools-mcp': { purpose: 'Controls and inspects a live Chrome browser through DevTools: performance traces, network, console.', expect: { browser: 'Browser control is its job', network: 'Browsing and DevTools connections', files: 'Saves traces, screenshots and its Chrome profile', shell: 'Launches Chrome', env: 'Chrome and runtime settings' } },

  // Community MCP servers
  'mcp-n8n-mcp': { purpose: 'Helps the model build n8n automation workflows. Knows n8n\'s nodes and, if you connect it, manages workflows on your n8n instance.', expect: { network: 'Calls your n8n instance\'s API', credentials: 'Uses your n8n API key', env: 'API URL and key come from environment variables', files: 'Ships a local database of n8n node documentation' } },
  'mcp-mcp-for-blender': { purpose: 'Lets the model control Blender 3D: create and change objects, materials and scenes through a Blender add-on.', expect: { network: 'Talks to its Blender add-on over a local socket', env: 'Connection settings' } },
  'mcp-zotero-mcp': { purpose: 'Connects the model to your Zotero research library to search papers, read notes and annotations, and analyze citations.', expect: { network: 'Uses Zotero\'s local or web API', files: 'Reads your local Zotero library', credentials: 'Optional Zotero web API key', env: 'Library ID and key from environment variables' } },
  'mcp-excel-mcp-server': { purpose: 'Creates and edits Excel files (charts, PivotTables, formulas) without Excel installed.', expect: { files: 'Reads and writes workbooks', env: 'Settings such as the allowed folder' } },
  'mcp-arxiv-mcp-server': { purpose: 'Searches arXiv, downloads papers and reads them for literature work. Papers are stored on disk.', expect: { network: 'Searches and downloads from arXiv', files: 'Stores downloaded papers', env: 'Storage location and settings' } },
  'mcp-markdownify-mcp': { purpose: 'Converts almost anything to Markdown: PDFs, Office files, images, audio, web pages and YouTube transcripts.', expect: { network: 'Fetches web pages and transcripts', files: 'Reads the files you convert', shell: 'Runs converter tools', env: 'Converter settings' } },
  'mcp-mcp-searxng': { purpose: 'Private web search through a SearXNG instance, and reads result pages.', expect: { network: 'Queries SearXNG and fetches pages', env: 'SearXNG URL and settings' } },
  'mcp-codebase-memory-mcp': { purpose: 'Indexes your codebase locally into a graph so agents can look up code, docs and structure.', expect: { files: 'Reads your code and stores its index', env: 'Index location and settings' } },
  // Added November 1, 2026
  'mcp-figma-context-mcp': { date: '2026-11-01', purpose: 'Gives coding agents the layout and styling data of your Figma designs so they can build them. Reads your files through the Figma API.',
    expect: { network: 'Calls the Figma API', credentials: 'Needs your Figma access token', env: 'Token and port can come from environment variables', files: 'Downloads images from your Figma file into your project' } },
  'mcp-ida-pro-mcp': { date: '2026-11-01', purpose: 'Lets the model reverse engineer programs in IDA Pro: read decompiled code and disassembly, rename and comment, and run IDAPython scripts.',
    expect: { network: 'The MCP server talks to IDA over a local HTTP port', files: 'Opens the binaries and IDA databases you analyze', env: 'Connection and IDA settings' },
    note: 'The author now recommends Hex-Rays\' official IDA MCP Server instead (README, October 2026). Needs a licensed IDA Pro 8.3 or newer; IDA Free isn\'t supported.' },
  'mcp-mcp-chrome': { date: '2026-11-01', purpose: 'Lets the model drive your everyday Chrome, with your logins, through a browser extension: navigate, click, fill forms, take screenshots, read pages, history and bookmarks.',
    expect: { browser: 'Controlling Chrome is its job', network: 'Serves MCP on a local port and has network tools for the pages you browse', files: 'Saves screenshots and its bridge settings', env: 'Runtime settings' } },
  'mcp-desktopcommandermcp': { date: '2026-11-01', purpose: 'Gives the model a terminal and your files: run and manage commands and processes, and read, write, search and edit files, including Excel, PDF and Word.',
    expect: { shell: 'Running your commands is its job', files: 'Reading and editing your files is its job', env: 'Passes your environment to the commands it runs', network: 'Its optional Remote MCP mode connects to its own relay service' } },
  'mcp-google-workspace-mcp': { date: '2026-11-01', purpose: 'Connects the model to your Google Workspace: Gmail, Drive, Calendar, Docs, Sheets, Slides, Forms, Tasks, Contacts and Chat, signed in with OAuth.',
    expect: { network: 'Calls Google\'s APIs', credentials: 'Signs in to your Google account with OAuth and keeps the tokens', files: 'Stores OAuth tokens and moves files to and from Drive', env: 'OAuth client and server settings come from environment variables' } },
  'mcp-slack-mcp-server': { date: '2026-11-01', purpose: 'Reads and searches your Slack workspace (channels, threads, DMs, unread messages) and, only if you turn it on, posts messages.',
    expect: { network: 'Calls Slack\'s API', credentials: 'Uses a Slack token you provide', env: 'Tokens and settings come from environment variables', files: 'Caches users and channels on disk' },
    note: 'Its "stealth mode" signs in with session tokens (xoxc and the d cookie) that you copy out of your browser, and can mimic a browser\'s TLS handshake. Those tokens act as you, with everything your Slack account can see; check your workspace\'s policy first. Bot (xoxb) or user OAuth (xoxp) tokens are the safer options it also supports.' },
  'mcp-duckduckgo-mcp-server': { date: '2026-11-01', purpose: 'Searches the web through DuckDuckGo and fetches result pages as clean text.',
    expect: { network: 'Searching and fetching pages is its job', env: 'Proxy and backend settings' } },
  'mcp-mcp-obsidian': { date: '2026-11-01', purpose: 'Lets the model list, read, search, edit and delete notes in your Obsidian vault through Obsidian\'s Local REST API plugin.',
    expect: { network: 'Talks to the Local REST API plugin on your computer', credentials: 'Uses the plugin\'s API key', env: 'API key, host and port come from environment variables' } },
  'mcp-shadcn-ui-mcp-server': { date: '2026-11-01', purpose: 'Gives coding agents the source, demos and docs of shadcn/ui components and blocks, fetched from GitHub.',
    expect: { network: 'Fetches components from GitHub', credentials: 'Optional GitHub token for higher rate limits', env: 'Token and settings', files: 'Caches what it fetches' } },
  'mcp-mcp-notion-server': { date: '2026-11-01', purpose: 'Lets the model find, read, query and update pages and databases in your Notion workspace through the Notion API.',
    expect: { network: 'Calls the Notion API', credentials: 'Uses your Notion integration token', env: 'The token comes from an environment variable' } },
  'mcp-mcp-server-youtube-transcript': { date: '2026-11-01', purpose: 'Gets the transcript of a YouTube video. Optionally sends a video URL to TwelveLabs for analysis if you add their API key.',
    expect: { network: 'Fetches captions from YouTube, and TwelveLabs if enabled', credentials: 'Optional TwelveLabs API key', env: 'The API key comes from an environment variable' } },
  'mcp-mcp-pandoc': { date: '2026-11-01', purpose: 'Converts documents between formats (Markdown, Word, HTML, PDF and more) with pandoc, reading and writing the files you name.',
    expect: { files: 'Reads and writes the documents it converts', shell: 'Runs pandoc', env: 'Settings' } },
  'mcp-spec-workflow-mcp': { date: '2026-11-01', purpose: 'Guides spec-driven development: requirements, design and tasks as files in your project, with a web dashboard and VS Code extension for approvals.',
    expect: { files: 'Writes specs and tasks into your project', network: 'Serves its dashboard on your computer', env: 'Settings' },
    note: 'In its README the author says they\'re taking a break from the project for personal reasons (checked November 1, 2026).' },
  'mcp-fetcher-mcp': { date: '2026-11-01', purpose: 'Fetches web pages with a headless browser and returns their main content, so pages that need JavaScript work too.',
    expect: { browser: 'Uses a headless browser to load pages', network: 'Fetching pages is its job', files: 'Caches the browser it downloads', shell: 'Installs and starts the browser', env: 'Settings' } },
  'mcp-whatsapp-mcp': { date: '2026-11-01', purpose: 'Lets the model search and read your personal WhatsApp messages and media, and send messages, through a local bridge linked to your account like WhatsApp Web.',
    expect: { network: 'Connects to WhatsApp, and its two parts talk over a local port', files: 'Stores your messages and media in a local database', env: 'Settings', shell: 'Converts audio with ffmpeg to send voice messages' },
    note: 'Its own README warns that, like many MCP servers, it is open to the "lethal trifecta": a message someone sends you could carry instructions that make your assistant leak private data. Last updated July 2025.' },
  'mcp-telegram-mcp': { date: '2026-11-01', purpose: 'Lets the model read and manage your Telegram account (chats, messages, contacts, media, folders and admin actions), signed in as you with a session string.',
    expect: { network: 'Connects to Telegram', credentials: 'Uses your Telegram API ID, hash and session string', env: 'Those credentials come from environment variables', files: 'Uploads and downloads media you choose' } },
  'mcp-airtable-mcp-server': { date: '2026-11-01', purpose: 'Lets the model read your Airtable bases\' structure and read and write their records.',
    expect: { network: 'Calls the Airtable API', credentials: 'Uses your Airtable personal access token', env: 'The token comes from an environment variable' } },
  'mcp-spotify-mcp-server': { date: '2026-11-01', purpose: 'Lets the model control Spotify playback and search, and manage your playlists, with your Spotify account.',
    expect: { network: 'Calls the Spotify API', credentials: 'Signs in to Spotify with OAuth and keeps the tokens', files: 'Stores its settings and tokens in a config file', env: 'Settings', shell: 'Opens your browser to sign in' } },
  'mcp-rea': { date: '2026-11-01', purpose: 'Reverse engineers software with your agent: inspects apps, web bundles and native binaries, drives disassemblers like Ghidra or Hopper, and observes programs as they run.',
    expect: { files: 'Reads the apps and binaries you point it at and writes its reports', shell: 'Starts Ghidra, Hopper, Java and other analysis tools', network: 'Observes the network traffic of apps you analyze, and its setup can download tools', browser: 'Drives a browser to watch web apps at runtime', env: 'Tool paths and settings' } },
  'mcp-google-calendar-mcp': { date: '2026-11-01', purpose: 'Manages your Google Calendar: list, search, create, change and delete events, and check free/busy times across accounts.',
    expect: { network: 'Calls the Google Calendar API', credentials: 'Signs in to your Google account with OAuth', files: 'Reads your OAuth client file and stores tokens', env: 'The credentials path comes from an environment variable' } },

  // Community command-line tools
  'ripgrep': { purpose: 'Searches the contents of files for a pattern, very fast.', expect: { files: 'Reads the files it searches', env: 'Config file location (RIPGREP_CONFIG_PATH)', shell: 'Can run decompression tools and --pre preprocessors' } },
  'fd': { purpose: 'Finds files by name, a faster alternative to find.', expect: { files: 'Walks your folders', env: 'Color and config settings', shell: 'Runs a command per result with -x / -X' } },
  'fzf': { purpose: 'Interactive fuzzy finder for any list: files, history, processes.', expect: { files: 'Reads lists and files', env: 'Default options from FZF_* variables', shell: 'Runs preview and execute commands you configure' } },
  'jq': { purpose: 'Command-line JSON processor: filter, map and transform JSON.', expect: { files: 'Reads JSON files', env: 'Reads environment variables via $ENV and module paths' } },
  'bat': { purpose: 'Shows files with syntax highlighting and Git changes, like cat with wings.', expect: { files: 'Reads the files it shows', env: 'Theme and pager settings', shell: 'Starts your pager (less)' } },
  'lazygit': { purpose: 'A terminal UI for Git: stage, commit, branch, rebase and push.', expect: { shell: 'Runs git and your editor', files: 'Works on your repo and config', env: 'Editor and config settings', credentials: 'Prompts for Git credentials when pushing', network: 'Git operations reach your remote' } },
  'gitleaks': { purpose: 'Scans Git repos and files for leaked secrets like API keys and passwords.', expect: { files: 'Reads the code it scans', shell: 'Runs git log to scan history', env: 'Config from environment variables', credentials: 'Its rules describe token and key formats to detect', secretFiles: 'Detecting private keys is its job' } },
  'zoxide': { purpose: 'A smarter cd that remembers the folders you use most.', expect: { files: 'Keeps a database of visited folders', env: 'Data location and options', shell: 'Starts fzf for interactive selection' } },
  'btop': { purpose: 'Terminal resource monitor for CPU, memory, disks, network and processes.', expect: { files: 'Reads system stats and its config', env: 'Config and terminal settings', shell: 'Runs helper commands to read some system info' } },
  'delta': { purpose: 'A syntax-highlighting pager for git diff, grep and blame output.', expect: { shell: 'Starts your pager and queries git', files: 'Reads git config and themes', env: 'Pager and git settings' } },
  'dust': { purpose: 'Shows disk usage as a tree, a friendlier du.', expect: { files: 'Walks your folders', env: 'Config settings' } },
  'hyperfine': { purpose: 'Benchmarks shell commands with statistics.', expect: { shell: 'Runs the commands you benchmark', files: 'Exports results to files', env: 'Shell and settings' } },
  'just': { purpose: 'A command runner: saves and runs your project\'s commands from a justfile.', expect: { shell: 'Running your recipes is its job', files: 'Reads justfiles', env: 'Loads .env files and exports variables to recipes' } },
  'yazi': { purpose: 'A fast terminal file manager with previews and plugins.', expect: { files: 'Managing files is its job', shell: 'Opens files with your apps and runs plugins', env: 'Config and editor settings', network: 'Its package manager fetches plugins' } },
  'gitui': { purpose: 'A fast terminal UI for Git.', expect: { files: 'Works on your repo', env: 'Config and editor settings', shell: 'Opens your editor and runs git hooks', network: 'Fetch and push reach your remote', credentials: 'Handles Git credentials for push and fetch' } },
  'mise': { purpose: 'Installs and switches developer tools and runtimes per project, and runs tasks.', expect: { network: 'Downloads tools', files: 'Installs tools and reads project config', shell: 'Runs installers and tasks', env: 'Manages environment variables per project', credentials: 'Can use a GitHub token to avoid rate limits' } },
  'lazydocker': { purpose: 'A terminal UI for Docker and Docker Compose.', expect: { network: 'Talks to the Docker API', shell: 'Runs docker and docker compose commands', files: 'Reads compose files and config', env: 'Docker and editor settings' } },
  'tokei': { purpose: 'Counts lines of code by language.', expect: { files: 'Reads the code it counts', env: 'Config settings' } },
  // Added November 1, 2026
  'yt-dlp': { date: '2026-11-01', purpose: 'Downloads video and audio from YouTube and thousands of other sites, and can sign in to sites when you give it an account.',
    expect: { network: 'Downloading from sites is its job', files: 'Saves downloads and its cache', shell: 'Runs ffmpeg to merge and convert media', env: 'Config and proxy settings', credentials: 'Uses a login or cookies you provide for sites that need one' } },
  'difftastic': { date: '2026-11-01', purpose: 'Compares files by their structure instead of line by line, to show what really changed in code.',
    expect: { files: 'Reads the files it compares', env: 'Display and Git settings' } },
  'duf': { date: '2026-11-01', purpose: 'Shows disk usage and free space for every drive, as a readable table.',
    expect: { files: 'Reads the system\'s list of mounted drives', env: 'Color and theme settings' } },
  'bottom': { date: '2026-11-01', purpose: 'A terminal system monitor: CPU, memory, disks, network, temperatures and processes.',
    expect: { files: 'Reads system stats and its config', env: 'Config settings', shell: 'Can stop a process you pick' } },
  'xh': { date: '2026-11-01', purpose: 'Sends HTTP requests from the terminal, a friendlier curl for testing APIs.',
    expect: { network: 'Sending requests is its job', files: 'Saves downloads and sessions', env: 'Proxy and config settings', credentials: 'Sends the auth headers and tokens you give it', secretFiles: 'Can read logins from your .netrc file, like curl' } },
  'croc': { date: '2026-11-01', purpose: 'Sends files and folders between two computers, end-to-end encrypted, using a short code phrase.',
    expect: { network: 'Sending files over the internet through a relay is its job', files: 'Reads what you send and saves what you receive', env: 'Relay and config settings', credentials: 'Uses a code phrase and an optional relay password' } },
  'age': { date: '2026-11-01', purpose: 'Encrypts and decrypts files with small keys or passphrases. A simple, modern alternative to GPG.',
    expect: { files: 'Reads and writes the files you encrypt', credentials: 'Handles your encryption keys and passphrases', secretFiles: 'Can use your SSH keys to encrypt and decrypt, as documented', env: 'Settings', shell: 'Can call age plugins you install' } },
  'visidata': { date: '2026-11-01', purpose: 'Explore, clean and summarize tabular data (CSV, Excel, JSON, databases) in a fast terminal spreadsheet.',
    expect: { files: 'Opens and saves your data files', network: 'Can open data from URLs and databases you name', env: 'Config settings', shell: 'Can run commands you type and open your editor' } },
  'k9s': { date: '2026-11-01', purpose: 'A terminal UI to watch and manage Kubernetes clusters.',
    expect: { network: 'Talks to your Kubernetes cluster', files: 'Reads your kubeconfig and its own config', env: 'Kubernetes and config settings', shell: 'Runs kubectl and shells into containers when you ask', credentials: 'Uses your cluster credentials from kubeconfig', secretFiles: 'Reads your kubeconfig, which holds cluster credentials' } },
  'glances': { date: '2026-11-01', purpose: 'A system monitor for your computer or servers, in the terminal or a web page, with optional exports to databases.',
    expect: { files: 'Reads system stats and its config', network: 'Optional web interface, server mode and exports', env: 'Config settings', credentials: 'Optional passwords for its web and server modes', shell: 'Runs helper commands to read system info' } },
  'superfile': { date: '2026-11-01', purpose: 'A modern terminal file manager with previews and plugins.',
    expect: { files: 'Managing files is its job', shell: 'Opens files with your apps and editor', env: 'Config and editor settings' } },
  'posting': { date: '2026-11-01', purpose: 'A terminal app for building and sending HTTP, GraphQL and gRPC requests and saving them in collections.',
    expect: { network: 'Sending requests is its job', files: 'Saves your request collections', env: 'Variables you use in requests', credentials: 'Sends the auth headers and tokens you set' } },
  'harlequin': { date: '2026-11-01', purpose: 'A SQL editor in the terminal for DuckDB, SQLite, Postgres and other databases.',
    expect: { files: 'Opens database files and saves queries', network: 'Connects to the database servers you name', env: 'Config settings', credentials: 'Uses the database passwords you provide' } },
  'navi': { date: '2026-11-01', purpose: 'An interactive cheat sheet for the command line: find a command, fill in the blanks, run it.',
    expect: { shell: 'Runs the command you pick', files: 'Reads cheat sheet files', network: 'Downloads community cheat sheets when you ask', env: 'Shell and config settings' } },
  'cleanyourtv': { date: '2026-11-01', purpose: 'Debloats an Android or Google TV over Wi-Fi: backs up its settings, disables ad and telemetry apps (nothing uninstalled), and installs a clean home screen. Meant to be run by your coding assistant.',
    expect: { shell: 'Runs adb and Android build tools against your TV', network: 'Connects to your TV over your Wi-Fi', files: 'Saves the backup and restore record, and builds the launcher', env: 'Tool paths and settings' } },
  'photocraft': { date: '2026-11-01', purpose: 'A desktop photo editor, like a free Photoshop alternative, for macOS, Windows, Linux and the web.',
    expect: { files: 'Opens and saves your images', env: 'Settings', network: 'Checks for updates and loads optional resources' } },
  'pdfcraft': { date: '2026-11-01', purpose: 'A desktop app to read, edit, sign and annotate PDF files.',
    expect: { files: 'Opens and saves your PDFs', env: 'Settings', network: 'Checks for updates and loads optional resources' } },
  'filee': { date: '2026-11-01', purpose: 'A desktop file converter for 263 formats (images, PDF, Word, Excel, PowerPoint, audio, video) that works offline by drag and drop.',
    expect: { files: 'Reads and writes the files you convert', shell: 'Runs converter tools like ffmpeg', env: 'Settings', network: 'Checks for updates' } },
  'compositor': { date: '2026-11-01', purpose: 'An image editor for Mac, a Photoshop alternative.',
    expect: { files: 'Opens and saves your images', network: 'Checks for updates', env: 'Settings' } },
  'concat': { date: '2026-11-01', purpose: 'A free video editor that runs on your computer, a CapCut alternative, with optional AI captions, voices and cutouts whose models download once.',
    expect: { files: 'Opens your footage and saves projects and exports', network: 'Downloads its AI models once and checks for updates', shell: 'Runs ffmpeg and its local AI helpers', env: 'Settings' } },
  // GitHub's monthly trending list; purposes from each README, November 1, 2026
  'mcp-context-mode': { date: '2026-11-01', purpose: 'Keeps an AI coding agent\'s context small: runs commands and code in a separate process, indexes the output and web pages into a local search database, and keeps session memory. Its README says nothing leaves your machine.',
    expect: { shell: 'Runs commands and code for your assistant in a separate process', files: 'Indexes files you point it at into a local database in your home folder', network: 'Fetches the web pages you ask it to index', env: 'Settings' } },
  'voicestudio': { date: '2026-11-01', purpose: 'A desktop app for voice cloning, dubbing, dictation, transcription and audiobooks, with the speech models running on your own computer.',
    expect: { network: 'Downloads the speech models you choose, and checks for updates', files: 'Reads your recordings and text and saves the audio it makes', shell: 'Runs its local speech engines and tools such as ffmpeg', env: 'Settings' } },
  'lightcraft': { date: '2026-11-01', purpose: 'A non-destructive photo editor for RAW photos, written in Rust, for Windows, macOS and Linux, with a browser version.',
    expect: { files: 'Reads your photos and library and writes edits and exports', network: 'Downloads optional AI models you install', env: 'Settings', shell: 'Opens files and folders in your system apps' } },
  // Filling thin job categories; purposes from each README, November 1, 2026
  'localsend': { date: '2026-11-01', purpose: 'Sends files and messages between nearby devices on the same local network, without an internet connection or account.',
    expect: { network: 'Finds nearby devices and sends files over your local network', files: 'Reads the files you send and saves the ones you receive', env: 'Settings', shell: 'Opens received files and folders' } },
  'upscayl': { date: '2026-11-01', purpose: 'A desktop app that enlarges and sharpens images with AI models that run on your own computer.',
    expect: { files: 'Reads your images and saves the enlarged copies', shell: 'Runs its bundled upscaling engine', network: 'Checks for updates', env: 'Settings' } },
  'krokiet-czkawka': { date: '2026-11-01', purpose: 'Finds duplicate files, similar images and videos, empty folders, big files and broken files, and helps you remove them.',
    expect: { files: 'Scans the folders you choose and deletes or moves files you select', shell: 'Opens files and folders, and can call tools like ffmpeg for video checks', env: 'Settings' } },
  'flameshot': { date: '2026-11-01', purpose: 'Takes screenshots and lets you annotate them, then save, copy or upload them.',
    expect: { files: 'Saves screenshots and its settings', network: 'Uploads a screenshot to Imgur only when you choose to', shell: 'Opens screenshots in other apps', env: 'Settings' } },
  'keepassxc': { date: '2026-11-01', purpose: 'A password manager that keeps your passwords in an encrypted database file on your computer, with optional browser integration.',
    expect: { files: 'Reads and writes your encrypted password database', credentials: 'Stores and fills your passwords', secretFiles: 'Can import from or work with SSH keys and key files', browser: 'Fills logins in your browser through its extension', network: 'Downloads website icons when you ask, and checks for updates', shell: 'Runs auto-type and opens links', env: 'Settings' } },
  'syncthing': { date: '2026-11-01', purpose: 'Keeps folders in sync between your own devices over the network, peer to peer and encrypted, without a cloud account.',
    expect: { network: 'Connects to your other devices, and uses discovery and relay servers to find them', files: 'Reads and writes the folders you choose to sync', env: 'Settings', credentials: 'Keeps its device keys and web interface login', shell: 'Can run a versioning command you configure' } },
  'trufflehog': { date: '2026-11-01', purpose: 'Finds leaked credentials in Git repositories, files, cloud storage and other sources, and checks whether they still work.',
    expect: { network: 'Clones repositories and checks found keys against the services they belong to', files: 'Reads the code and files you scan', credentials: 'Uses keys it finds to test whether they still work, and the access tokens you give it for sources', env: 'Settings and tokens', shell: 'Runs git' } },
  'ublock-origin': { date: '2026-11-01', purpose: 'A browser extension that blocks ads, trackers, popups and malware sites using filter lists.',
    expect: { network: 'Downloads and updates its filter lists', browser: 'Runs inside your browser and filters the pages you visit', files: 'Stores its settings and filter lists in the browser', env: 'Build settings' } },
  'pi-hole': { date: '2026-11-01', purpose: 'Blocks ads and trackers for every device on your home network by answering their DNS lookups, on a small Linux computer or Raspberry Pi.',
    expect: { network: 'Answers DNS for your network and downloads block lists', shell: 'Installs and manages system services and packages', files: 'Writes its settings, block lists and logs', env: 'Settings', credentials: 'Keeps the web interface password' } },
  'rustdesk': { date: '2026-11-01', purpose: 'Remote desktop: see and control another computer, or let someone help you on yours, through RustDesk servers or your own.',
    expect: { network: 'Connects to the other computer, through RustDesk\'s public servers or your own', credentials: 'Keeps your device ID, password and session keys', files: 'Transfers the files you send and stores its settings', shell: 'Runs services and helpers to control the screen and input', env: 'Settings', secretFiles: 'Stores its own keys and password in its config folder' } },
  'spotifast': { date: '2026-11-01', purpose: 'A lightweight desktop app for your Spotify library: local playback and Spotify Connect.',
    expect: { network: 'Talks to Spotify', credentials: 'Signs in to your Spotify account', files: 'Caches music data and stores its settings', env: 'Settings', shell: 'Opens your browser to sign in' } },
  'sd': { date: '2026-11-01', purpose: 'Find and replace text in files, a simpler sed.',
    expect: { files: 'Reads and rewrites the files you name', env: 'Settings' } },
};

// For community skills: expected access inferred from the skill's own description
const SKILL_EXPECT = [
  ['network', /\b(web|search|fetch|url|http|api|research|browse|online|download|scrap|deploy|github|internet|seo|analytics|ads?)\b/i, 'Its description mentions web or API work'],
  ['files', /\b(file|document|pdf|docx|xlsx|pptx|write|save|read|plan|markdown|note|diagram|image|code|project|repo|report|svg|html|terraform)\b/i, 'Its description mentions files or documents'],
  ['shell', /\b(run|command|script|cli|terminal|test|build|deploy|git|install|execute|compile|terraform|lint)\b/i, 'Its description mentions running commands or tools'],
  ['env', /\b(api key|token|config|environment|credential)/i, 'Its description mentions configuration or keys'],
  ['credentials', /\b(api key|token|auth|login|oauth|credential)/i, 'Its description mentions keys or sign-in'],
  ['browser', /\b(browser|playwright|puppeteer|screenshot|web ?page)\b/i, 'Its description mentions a browser'],
];

const REVIEWED = {
  'mcp-fetch': { env: 'Reads standard proxy settings (HTTP_PROXY and similar) so fetching works behind a corporate proxy.' },
  'mcp-sequentialthinking': { files: 'Only resolves its own file path at startup (realpathSync). It doesn\'t read or write any data files.' },
  'mcp-github-mcp-server': { shell: 'Opens your web browser for OAuth sign-in (xdg-open / open). The other match is mcpcurl, a separate developer test command.' },
  'mcp-context7': { shell: 'The CLI\'s upgrade command runs your package manager to update Context7 itself.' },
  'mcp-chrome-devtools-mcp': { credentials: 'Lets you pass your own auth headers when connecting to a remote browser. It doesn\'t collect credentials.' },
  'mcp-everything': { credentials: 'False match: the word "authorization" appears in a demo message.',
    poisoning: 'The tool-poisoning rule matched a base64-encoded PNG of the MCP logo in get-tiny-image.ts. The tool\'s description is just "Returns a tiny MCP logo image."' },
};
const REVIEWS_FILE = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), 'reviews.json');
const REVIEWED_EXTRA = fs.existsSync(REVIEWS_FILE) ? JSON.parse(fs.readFileSync(REVIEWS_FILE, 'utf8')) : {};
for (const [id, v] of Object.entries(REVIEWED_EXTRA)) REVIEWED[id] = { ...(REVIEWED[id] || {}), ...v };

const CAPS = {
  network: { label: 'Network access', re: /\bfetch\(|\baxios\b|https?\.(request|get)\(|\bhttpx\b|\brequests\.(get|post|request|Session)\b|\burllib\.request\b|\burlopen\(|\baiohttp\b|"net\/http"|\bhttp\.(Get|Post|NewRequest|Client)\b|new WebSocket\(|\bundici\b|\breqwest\b|\bureq\b|\bhyper::|\bTcpStream\b|\btokio::net\b|\bcurl_easy|\bnet\.Dial|\bsocket\.(socket|create_connection)\(|\bHttpClient\b|\bWebClient\b|\bURLSession\b|\bURLRequest\(|\bNWConnection\b|\bOkHttpClient\b|\bHttpURLConnection\b|\bnew Socket\(/ },
  files: { label: 'Reads or writes files', re: /\bfs\.(read|write|append|mkdir|rm|unlink|copy|rename|open|createWriteStream|createReadStream)|from ['"](node:)?fs(\/promises)?['"]|\bopen\([^)]*['"][rwa]b?\+?['"]|\bPath\([^)]*\)\.(read|write)_|\bos\.(ReadFile|WriteFile|Open|OpenFile|Create|MkdirAll|Remove|RemoveAll|ReadDir)\(|\bshutil\.|\bstd::fs\b|\bfs::(read|write|File|create_dir|remove|read_dir)|\bFile::(open|create)\(|\btokio::fs\b|\bfopen\(|\bstd::(i|o)fstream\b|\bstd::filesystem\b|\bFile\.(Read|Write|Open|Create|Delete|Copy|Move|Append)\w*\(|\bDirectory\.(Create|Delete|Get|Enumerate|Move)\w*\(|\bnew FileStream\(|\bFileManager\.default\b|\.write\(to:|\bData\(contentsOf:|\bjava\.io\.File\b|\bFiles\.(read|write|copy|delete|move)\w*\(/ },
  shell: { label: 'Runs other programs', re: /from ['"](node:)?child_process['"]|require\(['"](node:)?child_process['"]\)|(?<![.\w:])spawn(Sync)?\(|\bexecFile(Sync)?\(|\bexecSync\(|\bsubprocess\.(run|call|Popen|check_output|check_call)\b|\bos\.system\(|\bexec\.Command(Context)?\(|\bPopen\(|^\s*import git\b|^\s*from git import|\bprocess::Command\b|\bpopen\(|\bexecvp?\(|(?<![.\w])system\(\s*["a-z]|\bProcess\.Start\(|\bProcessStartInfo\b|=\s*Process\(\)|\bNSTask\b|\bRuntime\.getRuntime\(\)\.exec\(|\bProcessBuilder\(/m },
  env: { label: 'Reads environment variables', re: /process\.env\b|os\.environ|os\.getenv\(|os\.Getenv\(|os\.LookupEnv\(|\bdotenv\b|\benv::var(_os)?\(|\bgetenv\(|\bEnvironment\.GetEnvironmentVariable\(|\bProcessInfo\.processInfo\.environment\b|\bSystem\.getenv\(/ },
  credentials: { label: 'Handles tokens or API keys', re: /\b(api[_-]?key|access[_-]?token|bearer|client[_-]?secret|personal[_-]?access[_-]?token|oauth)\b/i },
  secretFiles: { label: 'Touches secret files (SSH keys, cloud credentials)', re: /\.ssh\/|id_rsa|id_ed25519|\.aws\/credentials|\.netrc|\.npmrc|\.docker\/config|\.kube\/config|keychain|Login Data|Cookies\.sqlite/i },
  browser: { label: 'Controls a web browser', re: /\bplaywright\b|\bpuppeteer\b|chrome-remote-interface|devtools-protocol|\bCDPSession\b|launchPersistentContext|\bchromium\.launch/i },
};

const isCommentLine = ln => /^\s*(\/\/|#|\*|\/\*|""")/.test(ln || '');
const commentRe = /^\s*(\/\/|#(?!include|define|if|pragma|!)|\*|\/\*)/;

function walk(dir, out = [], base = dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'target'].includes(e.name)) continue;
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walk(f, out, base); else out.push(path.relative(base, f).split(path.sep).join('/'));
  }
  return out;
}

// Tool names written as constants (Go `ToolX = "x"`, TS `KEY: 'x'`), collected across a listing's production files
const CONST_RE = { go: /\b(\w+)\s*=\s*"([a-z][\w.-]*)"/g, ts: /\b(\w+):\s*['"`]([a-z][\w.-]*)['"`]/g };
function constantsOf(srcs) {
  const out = { go: {}, ts: {} };
  for (const [f, src] of srcs) {
    const k = /\.go$/.test(f) ? 'go' : /\.[cm]?[jt]sx?$/.test(f) ? 'ts' : null;
    if (!k) continue;
    let m; const re = new RegExp(CONST_RE[k]);
    while ((m = re.exec(src))) out[k][m[1]] ??= m[2];
  }
  return out;
}
const stripLineComments = src => src.replace(/^\s*\/\/.*$/gm, '');
function extractTools(src, file, consts = { go: {}, ts: {} }) {
  const tools = [];
  const add = (name, desc) => { if (name && !tools.some(t => t.name === name)) tools.push({ name, desc: (desc || '').replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400) }); };
  let m;
  if (/\.py$/.test(file)) {
    const py = /\bname\s*=\s*([\w."']+)\s*,[\s\S]{0,40}?description\s*=\s*\(?\s*(?:"""([\s\S]{0,600}?)"""|"([^"\n]{0,600})"|'([^'\n]{0,600})')/g;
    while ((m = py.exec(src))) add(m[1].replace(/["']/g, '').replace(/^.*\.(\w+)\.value$/, (_, k) => k.toLowerCase()), m[2] || m[3] || m[4]);
    const deco = /@(?:mcp|server|app)\.tool\([^)]*\)\s*\n\s*(?:async\s+)?def\s+(\w+)\([^)]*\)[^:]*:\s*\n\s*(?:"""([\s\S]{0,600}?)"""|"([^"\n]{0,600})")?/g;
    while ((m = deco.exec(src))) add(m[1], m[2] || m[3]);
    // @tool / @x.tool(...) followed by other decorators and a multi-line signature
    const deco2 = /^@(?:\w+\.)?tool\b(?:\([\s\S]{0,800}?\))?[ \t]*\n(?:[ \t]*@[^\n]*\n){0,6}[ \t]*(?:async\s+)?def\s+(\w+)\s*\([\s\S]{0,2000}?\)\s*(?:->[^:\n]*)?:[ \t]*\n\s*(?:"{3}([\s\S]{0,600}?)"{3}|"([^"\n]{0,600})")?/gm;
    while ((m = deco2.exec(src))) add(m[1], m[2] || m[3]);
    return tools;
  }
  if (/\.go$/.test(file)) {
    src = stripLineComments(src);
    const goC = /mcp\.NewTool\(\s*(\w+)\s*,[\s\S]{0,300}?mcp\.WithDescription\("((?:[^"\\]|\\.){0,600})"/g;
    while ((m = goC.exec(src))) if (consts.go[m[1]]) add(consts.go[m[1]], m[2]);
    const go1 = /mcp\.NewTool\(\s*"([\w.-]+)"[\s\S]{0,300}?mcp\.WithDescription\((?:t\(\s*"[^"]*"\s*,\s*)?"((?:[^"\\]|\\.){0,600})"/g;
    while ((m = go1.exec(src))) add(m[1], m[2]);
    const go2 = /\bName:\s*"([\w-]+)",\s*\n\s*Description:\s*(?:t\(\s*"[^"]*",\s*)?"((?:[^"\\]|\\.){0,600})"/g;
    while ((m = go2.exec(src))) add(m[1], m[2]);
    return tools;
  }
  if (!/\.[cm]?[jt]sx?$/.test(file)) return tools;
  src = stripLineComments(src);
  const tsC = /\bname:\s*(?:\w+\.)+(\w+)\s*,\s*\n?\s*description:\s*["'`]([\s\S]{0,600}?)["'`]\s*[,}]/g;
  while ((m = tsC.exec(src))) if (consts.ts[m[1]]) add(consts.ts[m[1]], m[2]);
  const ts1 = /\.(?:registerTool|tool)\(\s*["'`]([\w.-]+)["'`]\s*,\s*(?:\{[\s\S]{0,400}?description:\s*)?["'`]([\s\S]{0,600}?)["'`]/g;
  while ((m = ts1.exec(src))) add(m[1], m[2]);
  const ts2 = /\bname:\s*["'`]([\w.-]+)["'`]\s*,[\s\S]{0,160}?description:\s*["'`]([\s\S]{0,600}?)["'`]\s*[,}][\s\S]{0,800}?\b(inputSchema|input_schema|annotations|handler)\b/g;
  while ((m = ts2.exec(src))) add(m[1], m[2]);
  const ts3 = /defineTool\(\{[\s\S]{0,200}?name:\s*["'`]([\w.-]+)["'`][\s\S]{0,400}?description:\s*["'`]([\s\S]{0,600}?)["'`]/g;
  while ((m = ts3.exec(src))) add(m[1], m[2]);
  const ts4 = /const name\s*=\s*["'`]([\w.-]+)["'`];?[\s\S]{0,300}?description:\s*["'`]([\s\S]{0,600}?)["'`]/g;
  while ((m = ts4.exec(src))) add(m[1], m[2]);
  return tools;
}
const POISON = [
  [/ignore (all |any )?(previous|prior|above) (instructions|rules)/i, 'Tells the model to ignore its instructions'],
  [/\b(do not|don't|never) (tell|inform|mention|reveal)[^.]{0,40}\buser\b/i, 'Asks the model to hide something from the user'],
  [/<\s*(important|system|secret)\s*>/i, 'Hidden instruction tag'],
  [/before (using|calling) (any|other|this)[^.]{0,30}tool[^.]{0,60}(read|send|include|pass)/i, 'Tries to chain other tool calls'],
  [/\b(secretly|covertly|silently send)\b/i, 'Secrecy instruction'],
  [/~\/\.ssh|id_rsa|\.aws\/credentials/i, 'Mentions secret files'],
  [/[​-‏⁠﻿‪-‮]/, 'Hidden Unicode characters'],
];

const SEV_W = { CRITICAL: 10, HIGH: 5, MEDIUM: 2, LOW: 0.5, INFO: 0 };
// SkillSpector patterns that don't map to a capability, reviewed against the code that triggered them.
// A serious finding whose pattern isn't listed here counts as "needs a closer look".

const TRUSTED = new Set(['anthropics', 'openai', 'NVIDIA', 'microsoft', 'github', 'cli', 'modelcontextprotocol', 'ChromeDevTools', 'huggingface', 'vercel-labs', 'upstash', 'aquasecurity', 'semgrep', 'astral-sh', 'ollama']);
const NAME = { 'cli/cli': 'GitHub CLI', 'vercel-labs/skills': 'skills CLI', 'NVIDIA/SkillSpector': 'SkillSpector', 'qarmin/czkawka': 'Krokiet (Czkawka)', 'gorhill/uBlock': 'uBlock Origin' };
const idOf = (l, m) => (l.kind === 'skill' ? `${m.owner}-${l.slug}` : l.kind === 'mcp' ? `mcp-${l.slug}` : (NAME[m.full] || l.slug)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const PREV = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const results = {};
const kept = [];
const seenIds = new Set();
for (const l of d.listings) {
  const m = d.repos[l.repo] || Object.values(d.repos).find(x => x?.full === l.repo);
  if (!m || l.slug === 'template-skill') continue;
  const id = idOf(l, m);
  if (seenIds.has(id)) continue;   // same id listed twice (a skill shipped in several folders): the first wins, as in build.mjs
  seenIds.add(id);
  const trusted = TRUSTED.has(m.owner);
  let prof = PROFILES[id];
  if (!prof && (trusted || l.kind !== 'skill')) continue;   // trusted skills and unprofiled tools are not checked
  const repoDir = path.join(ROOT, 'src', m.full.replace('/', '__'));
  if (!fs.existsSync(repoDir)) { if (PREV[id] && !results[id]) { results[id] = PREV[id]; kept.push(id); } continue; }
  const top = fs.readdirSync(repoDir)[0];
  const base = prof?.dir ? path.join(ROOT, 'src', ...prof.dir.split('/')) : path.join(repoDir, top, ...(l.path ? l.path.split('/') : []));
  if (!fs.existsSync(base)) { console.error('NO DIR', id, base); continue; }
  if (!prof) {
    const desc = l.desc || '';
    const expect = {};
    for (const [k, re, why] of SKILL_EXPECT) if (re.test(desc)) expect[k] = why;
    prof = { purpose: desc.replace(/\s+/g, ' ').slice(0, 300), expect, auto: true };
  }
  const files = walk(base);
  const kinds = { production: [], docs: [], 'tests & tooling': [], other: [] };
  for (const f of files) kinds[fileKind(f, l.kind)].push(f);
  let loc = 0;
  const caps = {};
  let tools = [];
  const srcs = [];
  for (const f of kinds.production) {
    let text;
    try { text = fs.readFileSync(path.join(base, f), 'utf8'); } catch (e) { continue; }
    if (text.length > 2e6) continue;
    const lines = text.split(/\r?\n/);
    loc += lines.length;
    for (const [k, c] of Object.entries(CAPS)) {
      const hits = [];
      for (let i = 0; i < lines.length && hits.length < 3; i++) if (c.re.test(lines[i]) && !commentRe.test(lines[i])) hits.push([f, i + 1, lines[i].trim().slice(0, 120)]);
      if (hits.length) { caps[k] ??= { files: 0, ex: [] }; caps[k].files++; if (caps[k].ex.length < 3) caps[k].ex.push(...hits.slice(0, 3 - caps[k].ex.length)); }
    }
    if (l.kind === 'mcp') srcs.push([f, text]);
  }
  const consts = constantsOf(srcs);
  for (const [f, text] of srcs) tools = tools.concat(extractTools(text, f, consts).filter(t => !tools.some(x => x.name === t.name)));
  for (const t of tools) t.flags = POISON.filter(([re]) => re.test(t.desc) || re.test(t.name)).map(([, why]) => why);

  const repPath = path.join(ROOT, 'out', id + '.json');
  const rep = fs.existsSync(repPath) ? JSON.parse(fs.readFileSync(repPath, 'utf8')) : null;
  const scopePath = path.join(ROOT, 'out', id + '.scope.txt');
  if (rep && fs.existsSync(scopePath)) {
    const scope = fs.readFileSync(scopePath, 'utf8').trim();
    for (const i of rep.issues) if (i.location?.file) i.location.file = `${scope}/${i.location.file.replace(/\\/g, '/')}`;
  }
  const where = { production: 0, 'tests & tooling': 0, docs: 0, other: 0 };
  const prod = [];
  for (const i of rep?.issues || []) { const k = fileKind(i.location?.file || '', l.kind); where[k]++; if (k === 'production') prod.push(i); }
  const lineCache = {};
  const lineAt = (f, n) => { try { lineCache[f] ??= fs.readFileSync(path.join(base, f.replace(/\\/g, '/')), 'utf8').split(/\r?\n/); return lineCache[f][n - 1]; } catch (e) { return ''; } };
  const serious = prod.filter(i => i.severity === 'HIGH' || i.severity === 'CRITICAL').map(i => {
    const cap = capOfFinding(i);
    return { sev: i.severity, cat: i.category, pat: (i.pattern || '').slice(0, 110), file: i.location?.file, line: i.location?.start_line, snip: (i.finding || '').replace(/\s+/g, ' ').slice(0, 120),
      cap, comment: isCommentLine(lineAt(i.location?.file || '', i.location?.start_line || 0)), expected: cap === 'other' ? null : cap === 'poisoning' ? false : !!prof.expect[cap] };
  });
  const seriousCode = serious.filter(s => !s.comment);
  const rev = REVIEWED[id] || {};
  const capList = Object.keys(CAPS).map(k => ({ k, label: CAPS[k].label, found: !!caps[k], files: caps[k]?.files || 0, ex: caps[k]?.ex || [],
    expected: !!prof.expect[k], why: prof.expect[k] || null, reviewed: caps[k] && !prof.expect[k] && rev[k] ? rev[k] : null }));
  const unexpected = capList.filter(c => c.found && !c.expected && !c.reviewed).map(c => c.k);
  const poisoned = tools.filter(t => t.flags.length);
  const patKey = s => Object.keys(OTHER_NOTES).find(k => (s.pat || '').startsWith(k));
  const fr = rev._findings || [];   // individual findings a reviewer read: benign, or a notice worth showing
  // A review names a snippet to match, a file, or both (some findings come with an empty snippet)
  // A finding that a reviewer judged harmful ("concern") or couldn't read ("open") doesn't count as explained
  const reviewedFinding = s => fr.some(f => f.level !== 'concern' && f.level !== 'open' && (f.match || f.file) && (!f.match || (s.snip || '').includes(f.match)) && (!f.file || s.file === f.file));
  const unexpectedSerious = seriousCode.filter(s => !reviewedFinding(s) && ((s.expected === false && !rev[s.cap]) || (s.cap === 'other' && !patKey(s))));
  const notices = fr.filter(f => (f.level === 'notice' || f.level === 'warning') && f.match && seriousCode.some(s => (s.snip || '').includes(f.match))).map(({ title, note, where, level }) => ({ title, note, where, level }))
    .concat((rev._notices || []).map(({ title, note, where, level }) => ({ title, note, where, level })));   // reviewer notices that don't hinge on a scan finding
  const other = {};
  for (const s of seriousCode.filter(s => s.cap === 'other' && !reviewedFinding(s))) {
    const k = patKey(s) || s.pat || s.cat;
    other[k] ??= { n: 0, note: OTHER_NOTES[k] || null, ex: [] };
    other[k].n++;
    if (other[k].ex.length < 2) other[k].ex.push([s.file, s.line]);
  }
  results[id] = { kind: l.kind, purpose: prof.purpose, auto: !!prof.auto, note: prof.note || null, reviewNotes: rev, reviewDate: prof.date || REVIEW_DATE,
    files: { total: files.length, production: kinds.production.length, tests: kinds['tests & tooling'].length, docs: kinds.docs.length },
    loc, codeFree: kinds.production.length === 0, caps: capList, unexpected, reviewed: capList.filter(c => c.reviewed).map(c => c.k),
    tools: tools.slice(0, 80), toolCount: tools.length, poisoned: poisoned.length, hasScan: !!rep,
    findings: { total: rep?.issues.length || 0, where, density: loc ? +(seriousCode.reduce((a, s) => a + SEV_W[s.sev], 0) / (loc / 1000)).toFixed(2) : 0 },
    serious: [...seriousCode, ...serious.filter(s => s.comment)].slice(0, 20), seriousCode: seriousCode.length, seriousComment: serious.length - seriousCode.length,
    unexpectedSerious: unexpectedSerious.length, unexpectedSeriousList: unexpectedSerious.slice(0, 10), other, notices, raw: rep?.risk_assessment.score ?? null };
}

// Peers: same kind only
for (const kind of ['skill', 'mcp', 'tool']) {
  const group = Object.values(results).filter(r => r.kind === kind && !r.codeFree);
  const dens = group.map(r => r.findings.density).sort((a, b) => a - b);
  for (const r of group) r.peers = { n: dens.length, worse: dens.filter(x => x > r.findings.density).length, median: dens[Math.floor(dens.length / 2)] ?? 0 };
}
for (const r of Object.values(results)) {
  r.verdict = r.poisoned && !r.reviewNotes.poisoning || r.unexpected.includes('secretFiles') ? 'flag' : r.unexpected.length || r.unexpectedSerious ? 'review' : 'fits';
}
fs.writeFileSync(OUT, JSON.stringify(results));
const rows = Object.entries(results);
if (kept.length) console.error('kept', kept.length, 'earlier results (no source under scan root)');
console.error('checked', rows.length - kept.length, Object.fromEntries(['fits', 'review', 'flag'].map(v => [v, rows.filter(([, r]) => r.verdict === v).length])), 'code-free skills', rows.filter(([, r]) => r.codeFree).length);
for (const [id, r] of rows) if (r.verdict !== 'fits') console.log(id.padEnd(34), r.verdict.padEnd(7), r.kind.padEnd(6), '| unexpected', r.unexpected.join(',') || '-', '| unexp serious', r.unexpectedSerious, '| poison', r.poisoned);
