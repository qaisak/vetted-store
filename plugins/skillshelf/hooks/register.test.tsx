import { expect, test } from 'claude-code/testing'

const BAND = {
  plugin: 'skillshelf',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isCollapsed: false, isWorking: false, rows: 12 },
} as const

const SKILLS = [
  { name: 'anthropic-skills:docx', source: 'plugin', tokens: 10 },
  { name: 'adhd-mode', source: 'userSettings', tokens: 10 },
  { name: 'no-slop-writing', source: 'userSettings', tokens: 10 },
]

// Nothing sits beneath the plugin: each hook here stands for the engine
function engine(on: Parameters<Parameters<typeof test>[1]>[1], filled: string[], sent: string[]) {
  on('command.register', () => ({ value: { command: 'skills-bar' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { breakdown: { skills: { totalSkills: 3, includedSkills: 3, tokens: 30, skillFrontmatter: SKILLS } } } } }))
  on('tool.call', () => ({ result: {} }))
  on('prompt.compose', () => ({ sections: [{ id: 'intro', text: 'You are Claude.', scope: 'shared' as const }] }))
  on('prompt.fill', (_, e) => { filled.push(e.text); return { isFilled: true, text: e.text, cursor: e.text.length } })
  on('prompt.submit', (_, e) => { sent.push(e.text); return { text: e.text } })
  on('ui.toast', () => ({ value: {} }))
}

test('the bar lists skills, the person\'s own first, on every surface that draws it', async ($, on) => {
  engine(on, [], [])
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect((await ui.find({ key: 'skill-adhd-mode' }))?.text).toBe('adhd-mode: ON')
    expect((await ui.find({ key: 'skill-anthropic-skills:docx' }))?.text).toBe('docx: ON')
    expect(await ui.find({ key: 'add' })).toBeDefined()
    await ui.unmount()
  }
})

test('switching a skill off refuses it and tells Claude up front', async ($, on) => {
  engine(on, [], [])
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await ui.press({ key: 'skill-anthropic-skills:docx' })
  expect((await ui.find({ key: 'skill-anthropic-skills:docx' }))?.text).toBe('docx: OFF')
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
