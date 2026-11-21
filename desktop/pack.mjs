// Packs the Skillshelf desktop extension: copies the latest Skillshelf check data next to the server, then builds dist/skillshelf.mcpb
// with Anthropic's mcpb tool (which also validates the manifest). Usage: node desktop/pack.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
fs.copyFileSync(path.join(HERE, '..', 'checkup', 'skills', 'skillshelf-checkup', 'skillshelf-data.json'), path.join(HERE, 'server', 'skillshelf-data.json'));
fs.mkdirSync(path.join(HERE, 'dist'), { recursive: true });
const out = path.join(HERE, 'dist', 'skillshelf.mcpb');
execFileSync('npx', ['-y', '@anthropic-ai/mcpb@2.1.2', 'validate', path.join(HERE, 'manifest.json')], { stdio: 'inherit' });
execFileSync('npx', ['-y', '@anthropic-ai/mcpb@2.1.2', 'pack', HERE, out], { stdio: 'inherit' });
// The connector serves it for download at /skillshelf.mcpb
fs.copyFileSync(out, path.join(HERE, '..', 'connector', 'src', 'skillshelf-desktop.bin'));
console.log('Packed', out, Math.round(fs.statSync(out).size / 1024) + ' KB');
