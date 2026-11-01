// Shared by purpose_analyze.mjs and build.mjs: which files run, and which capability a SkillSpector finding is about.
export const NONPROD = /(^|\/)(tests?|__tests__|e2e|specs?|fixtures?|testdata|test-data|tests-data|mocks?|__mocks__|examples?|demos?|playground|docs?|scripts|packaging|\.github|benchmarks?|benches|bench|dist|build|node_modules|coverage|third_party|vendor|vendored|xtask|fuzz|www)(\/|$)|\.(test|spec|vitest)\.[cm]?[jt]sx?$|_test\.go$|(^|\/)conftest\.py$|(^|\/)test_[^/]*\.py$|\.config\.[cm]?[jt]s$|(^|\/)(eslint|prettier|rollup|vitest|jest|playwright|puppeteer)\.config\.|\.d\.ts$|(^|\/)build\.rs$|(^|\/)[\w.-]+(Tests|UITests|Specs)(\/|$)|(^|\/)tests?\.rs$/i;
export const CODE = /\.(ts|tsx|js|mjs|cjs|py|go|rs|c|h|cc|cpp|hpp|sh|cs|swift|kt|kts|java)$/;
// In a skill, scripts/ (and bin/, tools/) hold the code the agent runs, so they count as production code there.
export const NONPROD_SKILL = new RegExp(NONPROD.source.replace('|scripts|', '|'), 'i');
export const fileKind = (f, kind) => (f = f.replace(/\\/g, '/'), !CODE.test(f)) ? (/\.(md|mdx|txt|rst)$/i.test(f) ? 'docs' : 'other') : (kind === 'skill' ? NONPROD_SKILL : NONPROD).test(f) ? (/(^|\/)(docs?|examples?)\//i.test(f) ? 'docs' : 'tests & tooling') : 'production';
export const CAT_CAP = [[/tainted flow.*credential/i, 'credentials'], [/credential access/i, 'credentials'], [/env variable/i, 'env'], [/server-side request|ssrf/i, 'network'], [/dangerous code|tool misuse|command/i, 'shell'],
  [/agent snooping|config (directory )?access/i, 'secretFiles'], [/tool poisoning|yara/i, 'poisoning'], [/file/i, 'files']];
// SkillSpector patterns that don't map to a capability, reviewed against the code that triggered them.
export const OTHER_NOTES = {
  'Concealed Executable Artifact': 'A rule built for skill bundles, which normally ship no code. In a software project it flags every script and source file.',
  'Direct Prompt Extraction': 'Matches code that returns the server\'s own usage instructions to the client, which MCP servers do by design.',
  'Anti-Refusal Statement': 'Matches tool descriptions such as "without warning" for overwriting a file you asked it to write.',
  'Self-Modification': 'Matches tool descriptions such as "overwrite existing file".',
  'Unvalidated Output Injection': 'Matches status messages built from results, such as "Update failed: …".',
};
export const capOfFinding = i => (CAT_CAP.find(([re]) => re.test(`${i.category} ${i.pattern}`)) || [0, 'other'])[1];
