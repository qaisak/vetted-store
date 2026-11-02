// Shared by purpose_analyze.mjs and build.mjs: which files run, and which capability a SkillSpector finding is about.
export const NONPROD = /(^|\/)(tests?|__tests__|e2e|specs?|fixtures?|testdata|test-data|tests-data|mocks?|__mocks__|examples?|demos?|playground|docs?|scripts|packaging|\.github|benchmarks?|benches|bench|dist|build|node_modules|coverage|third_party|vendor|vendored|xtask|fuzz|www)(\/|$)|\.(test|spec|vitest)\.[cm]?[jt]sx?$|_test\.go$|(^|\/)conftest\.py$|(^|\/)test_[^/]*\.py$|\.config\.[cm]?[jt]s$|(^|\/)(eslint|prettier|rollup|vitest|jest|playwright|puppeteer)\.config\.|\.d\.ts$|(^|\/)build\.rs$|(^|\/)[\w.-]+(Tests|UITests|Specs)(\/|$)|(^|\/)tests?\.rs$/i;
export const CODE = /\.(ts|tsx|js|mjs|cjs|py|go|rs|c|h|cc|cpp|hpp|sh|cs|swift|kt|kts|java)$/;
// In a skill, scripts/ (and bin/, tools/) hold the code the agent runs, so they count as production code there.
export const NONPROD_SKILL = new RegExp(NONPROD.source.replace('|scripts|', '|'), 'i');
export const fileKind = (f, kind) => (f = f.replace(/\\/g, '/'), !CODE.test(f)) ? (/\.(md|mdx|txt|rst)$/i.test(f) ? 'docs' : 'other') : (kind === 'skill' ? NONPROD_SKILL : NONPROD).test(f) ? (/(^|\/)(docs?|examples?)\//i.test(f) ? 'docs' : 'tests & tooling') : 'production';
export const CAT_CAP = [[/tainted flow.*credential/i, 'credentials'], [/credential access/i, 'credentials'], [/env variable/i, 'env'], [/server-side request|ssrf/i, 'network'], [/dangerous code|tool misuse|command/i, 'shell'],
  [/agent snooping|config (directory )?access/i, 'secretFiles'], [/tool poisoning|yara/i, 'poisoning'], [/file/i, 'files']];
// SkillSpector patterns that don't map to a capability. Each is a rule for AI instructions (prompt text); in an app's or
// a server's own code it matches ordinary words, so the note says what the rule is for and points at the matched text.
// Skills are text the assistant reads, so these never explain a skill's finding: a reviewer reads those.
const NOT_FOR_YOU = 'which isn\'t an instruction to your assistant';
export const OTHER_NOTES = {
  'Concealed Executable Artifact': 'A rule built for skill bundles, which normally ship no code. In a software project it flags every script and source file.',
  'Direct Prompt Extraction': `A rule for text that tries to pull out an AI's hidden instructions. Here it matched ordinary words in the code (shown above), ${NOT_FOR_YOU}.`,
  'Anti-Refusal Statement': `A rule for text that tells an AI to ignore its safety rules. Here it matched ordinary words like "ignore" or "no warning" in the code (shown above), ${NOT_FOR_YOU}.`,
  'Self-Modification': `A rule for AI instructions that rewrite their own setup. Here it matched ordinary words like "overwrite" or "self-update" in the code (shown above), ${NOT_FOR_YOU}.`,
  'Unvalidated Output Injection': 'A rule for AI output used without checks. Here it matched an ordinary message built from a result (shown above), like "Update failed: …".',
};
// MCP servers' tool descriptions are read by the assistant; those are checked separately for hidden instructions
const MCP_ADD = ' The descriptions of its tools, which your assistant does read, are checked separately for hidden instructions.';
export const otherNote = (pattern, kind) => {
  if (kind === 'skill') return null;
  const k = Object.keys(OTHER_NOTES).find(k => String(pattern || '').startsWith(k));
  return k ? OTHER_NOTES[k] + (kind === 'mcp' && k !== 'Concealed Executable Artifact' && k !== 'Unvalidated Output Injection' ? MCP_ADD : '') : null;
};
export const capOfFinding = i => (CAT_CAP.find(([re]) => re.test(`${i.category} ${i.pattern}`)) || [0, 'other'])[1];
