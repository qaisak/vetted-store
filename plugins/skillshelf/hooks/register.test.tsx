import { expect, test } from 'claude-code/testing'

const BAND = {
  plugin: 'skillshelf',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isCollapsed: false, isWorking: false, rows: 12 },
} as const

const SKILLS = [
  { name: 'acme-docs:docx', source: 'plugin', pluginName: 'acme-docs', tokens: 10 },
  { name: 'adhd-mode', source: 'userSettings', tokens: 10 },
  { name: 'no-slop-writing', source: 'userSettings', tokens: 10 },
  // What comes with Claude: the desktop app's Anthropic-managed set, an Anthropic account plugin, Claude Code's own
  { name: 'anthropic-skills:pdf', source: 'plugin', pluginName: 'anthropic-skills', tokens: 10 },
  { name: 'bio-research:scvi-tools', source: 'plugin', tokens: 10 },
  { name: 'update-config', source: 'built-in', tokens: 10 },
]
const PANE = { plugin: 'skillshelf', component: 'Pane', requestId: 'skillshelf-skills', surface: 'desktop', props: { title: 'Skillshelf', isFocused: false, bodyColumns: 40, placement: 'dock', scroll: { offset: 0, bodyRows: 20 }, view: {} } } as const

// What reached the engine beside each message (prompt.submit context), in order
const CONTEXT: string[][] = []
// Nothing sits beneath the plugin: each hook here stands for the engine
function engine(on: Parameters<Parameters<typeof test>[1]>[1], filled: string[], sent: string[]) {
  on('command.register', () => ({ value: { command: 'skills-bar' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { breakdown: { skills: { totalSkills: 6, includedSkills: 6, tokens: 60, skillFrontmatter: SKILLS } } } } }))
  on('tool.call', () => ({ result: {} }))
  on('prompt.compose', () => ({ sections: [{ id: 'intro', text: 'You are Claude.', scope: 'shared' as const }] }))
  on('prompt.fill', (_, e) => { filled.push(e.text); return { isFilled: true, text: e.text, cursor: e.text.length } })
  on('prompt.submit', (_, e) => { sent.push(e.text); CONTEXT.push([...(e.context ?? [])]); return { text: e.text } })
  on('ui.toast', () => ({ value: {} }))
}

test('the bar lists skills, the person\'s own first, on every surface that draws it', async ($, on) => {
  engine(on, [], [])
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect((await ui.find({ key: 'skill-adhd-mode' }))?.text).toBe('adhd-mode: ON')
    expect((await ui.find({ key: 'skill-acme-docs:docx' }))?.text).toBe('docx: ON')
    expect(await ui.find({ key: 'add' })).toBeDefined()
    await ui.unmount()
  }
})

test('switching a skill off refuses it and tells Claude up front', async ($, on) => {
  engine(on, [], [])
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await ui.press({ key: 'skill-acme-docs:docx' })
  expect((await ui.find({ key: 'skill-acme-docs:docx' }))?.text).toBe('docx: OFF')
  await ui.unmount()

  // Claude may name it without the plugin prefix
  const refused = await $.tool.call({ tool: 'Skill', skill: 'docx' })
  const why = String((refused as { deny?: string }).deny ?? (refused as { text?: string }).text ?? '')
  expect(why).toMatch(/switched the docx skill off/)

  const allowed = await $.tool.call({ tool: 'Skill', skill: 'adhd-mode' })
  expect((allowed as { deny?: string }).deny).toBeUndefined()

  const composed = await $.prompt.compose({ model: 'claude-opus-5-5', promptModel: 'claude-opus-5-5', surfaces: ['desktop'], tools: ['Skill'], outputStyle: { name: 'default', isKeepingCodingInstructions: true }, traits: [] })
  expect(composed.sections.some(s => s.id === 'skillshelf:off' && /docx/.test(s.text))).toBe(true)
})

const COMPOSE = { model: 'claude-opus-5-5', promptModel: 'claude-opus-5-5', surfaces: ['desktop'] as const, tools: ['Skill'], outputStyle: { name: 'default', isKeepingCodingInstructions: true }, traits: [] }

test('Add skill takes any skill, and Claude checks it before installing', async ($, on) => {
  const sent: string[] = []
  engine(on, [], sent)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  for (const surface of ['terminal', 'desktop'] as const) {
    sent.length = 0
    const ui = await $.ui.mount({ ...BAND, surface })
    await ui.press({ key: 'add' })
    expect(await ui.find({ key: 'addskill' })).toBeDefined()
    // While the box is open, the action row steps aside
    expect(await ui.find({ key: 'flag' })).toBeUndefined()
    await ui.input({ key: 'addskill', text: '  ' })
    expect(sent.length).toBe(0)
    await ui.press({ key: 'cancel-add' })
    expect(await ui.find({ key: 'addskill' })).toBeUndefined()

    await ui.press({ key: 'add' })
    await ui.input({ key: 'addskill', text: 'https://github.com/someone/not-on-skillshelf' })
    expect(sent.length).toBe(1)
    expect(sent[0]).toMatch(/github\.com\/someone\/not-on-skillshelf/)
    expect(sent[0]).toMatch(/Skillshelf hasn't checked it, read its SKILL\.md/)
    expect(sent[0]).toMatch(/Ask me before installing/)
    expect(sent[0]).toMatch(/without me typing a slash command.*~\/\.claude\/CLAUDE\.md/)
    expect(await ui.find({ key: 'addskill' })).toBeUndefined()
    await ui.unmount()
  }
})

test('Flag slop bans a phrase for good', async ($, on) => {
  const filled: string[] = [], sent: string[] = []
  engine(on, filled, sent)
  // The store stands for what the engine keeps across sessions
  const kept = new Map<string, unknown>()
  on('store.get', (_, e) => ({ value: kept.get(e.key) }))
  on('store.set', (_, e) => { kept.set(e.key, e.value); return { value: {} } })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ key: 'check' })).toBeUndefined()

    // Flag slop opens a box; an empty one bans nothing; Cancel closes it
    await ui.press({ key: 'flag' })
    await ui.input({ key: 'slop', text: '   ' })
    expect(await ui.find({ key: 'banned' })).toBeUndefined()
    await ui.press({ key: 'cancel' })
    expect(await ui.find({ key: 'slop' })).toBeUndefined()
    await ui.unmount()
  }

  // One phrase per line; quotes and repeats are dropped; nothing is sent to Claude as a message
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await ui.press({ key: 'flag' })
  await ui.input({ key: 'slop', text: '"Glance"\ndelve into\nglance' })
  expect(sent.length).toBe(0)
  expect(await ui.find({ key: 'slop' })).toBeUndefined()
  expect((await ui.find({ key: 'banned' }))?.text).toBe('Banned (2)')
  await ui.unmount()
  expect(kept.get('banned')).toEqual(['Glance', 'delve into'])

  // Claude is told never to write them
  const composed = await $.prompt.compose(COMPOSE)
  const rule = composed.sections.find(s => s.id === 'skillshelf:banned')
  expect(rule?.text).toMatch(/"Glance", "delve into"/)
})

test('the bar and its list show the person\'s skills, not what comes with Claude, grouped by where they came from', async ($, on) => {
  engine(on, [], [])
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  // The bar: their own skills and the plugin they installed; nothing that comes with Claude
  const bar = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await bar.find({ key: 'skill-adhd-mode' })).toBeDefined()
  expect(await bar.find({ key: 'skill-acme-docs:docx' })).toBeDefined()
  for (const k of ['skill-anthropic-skills:pdf', 'skill-bio-research:scvi-tools', 'skill-update-config']) expect(await bar.find({ key: k })).toBeUndefined()
  expect(await bar.find({ key: 'all' })).toBeUndefined()
  await bar.unmount()

  const pane = await $.ui.mount(PANE)
  expect((await pane.find({ key: 'fold-yours' }))?.text).toBe('▾ Your skills (2)')
  expect(await pane.find({ key: 'pane-adhd-mode' })).toBeDefined()
  expect((await pane.find({ key: 'fold-plugin:acme-docs' }))?.text).toBe('▸ From the acme-docs plugin (1)')
  for (const k of ['fold-plugin:anthropic-skills', 'fold-plugin:bio-research', 'fold-built-in', 'pane-anthropic-skills:pdf', 'pane-update-config']) expect(await pane.find({ key: k })).toBeUndefined()
  expect((await pane.find({ type: 'Text', text: /^Not listed:/ }))?.text).toMatch(/^Not listed: 3 skills that come with Claude/)

  // Opening a group shows its switches; one switched off shows in the group's count
  await pane.press({ key: 'fold-plugin:acme-docs' })
  await pane.press({ key: 'pane-acme-docs:docx' })
  expect((await pane.find({ key: 'fold-plugin:acme-docs' }))?.text).toBe('▾ From the acme-docs plugin (1, 0 on)')
  await pane.press({ key: 'fold-yours' })
  expect(await pane.find({ key: 'pane-adhd-mode' })).toBeUndefined()
  await pane.unmount()
})

test('a skill that only starts with a slash command still shows, and one a CLAUDE.md loads says always on', async ($, on) => {
  engine(on, [], [])
  const dir = (name: string) => ({ name, kind: 'dir' as const, size: 0, mtimeMs: 0, isLink: false })
  const front = (name: string) => `---\nname: ${name}\ndescription: 'Start with /${name}'\ndisable-model-invocation: true\n---\n\n# ${name}\n`
  const files: Record<string, string> = {
    'C:/Users/me/.claude/CLAUDE.md': '# Always on\n\n@~/.claude/skills/i-have-adhd/SKILL.md\n',
    'C:/Users/me/.claude/skills/i-have-adhd/SKILL.md': front('i-have-adhd'),
    'C:/Users/me/.claude/skills/standup/SKILL.md': front('standup'),
    // Already in the listing: not listed twice
    'C:/Users/me/.claude/skills/adhd-mode/SKILL.md': '---\nname: adhd-mode\ndescription: x\n---\n',
  }
  on('env.get', (_, e) => ({ value: e.name === 'USERPROFILE' ? 'C:\\Users\\me' : undefined }))
  const p = (path: string) => path.replace(/\\/g, '/')
  on('fs.list', (_, e) => p(e.path) === 'C:/Users/me/.claude/skills' ? { value: [dir('i-have-adhd'), dir('standup'), dir('adhd-mode')] } : { deny: 'ENOENT' })
  on('fs.read', (_, e) => p(e.path) in files ? { value: files[p(e.path)] } : { deny: 'ENOENT' })
  await $.session.start({ cwd: 'C:\\work\\app', surface: 'desktop', isInteractive: true })

  const pane = await $.ui.mount(PANE)
  expect((await pane.find({ key: 'fold-yours' }))?.text).toBe('▾ Your skills (4)')
  expect(await pane.find({ type: 'Text', text: 'i-have-adhd (always on)' })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: 'standup (starts with /standup)' })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: 'adhd-mode' })).toBeDefined()

  // Switching an always-on one off tells Claude to stop following it
  await pane.press({ key: 'pane-i-have-adhd' })
  await pane.unmount()
  const composed = await $.prompt.compose(COMPOSE)
  expect(composed.sections.find(s => s.id === 'skillshelf:off')?.text).toMatch(/i-have-adhd.*follow their instructions if a CLAUDE\.md file loads them/)
})

test('a banned phrase is still banned in a new session, until it is allowed again', async ($, on) => {
  engine(on, [], [])
  const kept = new Map<string, unknown>([['banned', ['Glance']]])
  on('store.get', (_, e) => ({ value: kept.get(e.key) }))
  on('store.set', (_, e) => { kept.set(e.key, e.value); return { value: {} } })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  expect((await $.prompt.compose(COMPOSE)).sections.some(s => s.id === 'skillshelf:banned' && /Glance/.test(s.text))).toBe(true)

  const pane = await $.ui.mount({ plugin: 'skillshelf', component: 'Pane', requestId: 'skillshelf-skills', surface: 'desktop', props: { title: 'Skillshelf', isFocused: false, bodyColumns: 40, placement: 'dock', scroll: { offset: 0, bodyRows: 20 }, view: {} } })
  await pane.press({ key: 'unban-Glance' })
  await pane.unmount()
  expect(kept.get('banned')).toEqual([])
  expect((await $.prompt.compose(COMPOSE)).sections.some(s => s.id === 'skillshelf:banned')).toBe(false)
})

test('the rules also ride beside a message, for sessions that keep plugins out of the system prompt', async ($, on) => {
  engine(on, [], [])
  const kept = new Map<string, unknown>([['banned', ['delve']]])
  on('store.get', (_, e) => ({ value: kept.get(e.key) }))
  on('store.set', (_, e) => { kept.set(e.key, e.value); return { value: {} } })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  CONTEXT.length = 0

  // The first message carries them; the next one doesn't repeat them
  await $.prompt.submit({ text: 'hello' })
  await $.prompt.submit({ text: 'and another' })
  expect(CONTEXT[0].some(c => /^Skillshelf bar: .*banned these as slop.*delve/s.test(c))).toBe(true)
  expect(CONTEXT[1].some(c => c.startsWith('Skillshelf bar:'))).toBe(false)

  // A change rides along with the next message
  const bar = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await bar.press({ key: 'skill-acme-docs:docx' })
  await bar.unmount()
  await $.prompt.submit({ text: 'third' })
  expect(CONTEXT[2].some(c => /switched these skills off.*docx/s.test(c) && /delve/.test(c))).toBe(true)

  // Lifted: Claude is told once that they no longer apply
  const pane = await $.ui.mount(PANE)
  await pane.press({ key: 'unban-delve' })
  await pane.unmount()
  const bar2 = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await bar2.press({ key: 'skill-acme-docs:docx' })
  await bar2.unmount()
  await $.prompt.submit({ text: 'fourth' })
  await $.prompt.submit({ text: 'fifth' })
  expect(CONTEXT[3].some(c => /no longer apply/.test(c))).toBe(true)
  expect(CONTEXT[4].some(c => c.startsWith('Skillshelf bar:'))).toBe(false)
})
