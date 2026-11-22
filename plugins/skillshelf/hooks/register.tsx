// Skillshelf: a Skills bar above the chat box in every session.
// - Each chip switches one skill on or off for this session; a switched-off skill is refused when Claude reaches for
//   it, and Claude is told up front which ones are off.
// - "Flag slop" bans a word or phrase for good: the person types what Claude wrote, and from then on every session
//   tells Claude never to write it. The list is kept across sessions and can be copied into the Claude app's
//   Instructions, which covers claude.ai chats the mod can't reach.
// - "+ Add skill" hands the search to the Skillshelf connector, bundled in this plugin's .mcp.json.
import { atom, read, update } from 'claude-code'
import type { Engine, Register } from 'claude-code'

import type { BandSkill } from '../types'

const PLUGIN = 'skillshelf'
const PANE = 'skillshelf-skills'
// The banned list is kept here across sessions; the state atom below is this session's copy that the bar draws from
const STORE_BANNED = 'banned'
// Change a tag when that value's fields change: it declines what an earlier version stored, which outlives a reload
const skills = atom({ plugin: 'skillshelf', key: 'skills' } as const, [] as BandSkill[], { shape: 'skills-1' })
const off = atom({ plugin: 'skillshelf', key: 'off' } as const, [] as string[])
const banned = atom({ plugin: 'skillshelf', key: 'banned' } as const, [] as string[])
const isOpen = atom({ plugin: 'skillshelf', key: 'isOpen' } as const, true)
const isFlagging = atom({ plugin: 'skillshelf', key: 'isFlagging' } as const, false)
const isAdding = atom({ plugin: 'skillshelf', key: 'isAdding' } as const, false)

// How many chips the bar shows before "All skills (N)" takes over
const CHIPS = 5
// The person's own skills come first: those are the ones they think of switching
const RANK: Record<string, number> = { userSettings: 0, projectSettings: 1, syncedSkills: 2, plugin: 3, mcp: 4, 'built-in': 5 }
// A banned entry is a word or phrase, not an essay: long pastes are cut, and the list has a ceiling
const MAX_PHRASE = 120
const MAX_BANNED = 300

const shortName = (name: string) => name.split(':').pop() || name
// The Skill tool may name a skill with or without its plugin prefix
const sameSkill = (a: string, b: string) => a === b || shortName(a) === shortName(b)
const quoted = (list: string[]) => list.map(p => `"${p}"`).join(', ')
// The rule as Claude reads it, and as the person pastes it into the Claude app's Instructions
const banRule = (list: string[]) => `Never write these words or phrases, in any form, in anything you write for me: ${quoted(list)}. If one would fit, say it another way.`

// Reads the session's skills from the context listing (estimated locally, so it costs nothing)
async function refresh($: Engine) {
  const usage = await $.session.usage({ breakdown: 'summary' })
  const listed = usage.context.breakdown?.skills?.skillFrontmatter ?? []
  const list: BandSkill[] = listed
    .map(s => ({ name: s.name, label: shortName(s.name), source: String(s.source) }))
    .sort((a, b) => (RANK[a.source] ?? 9) - (RANK[b.source] ?? 9) || a.label.localeCompare(b.label))
  await update($, skills, () => list)
}

async function toggle($: Engine, name: string) {
  let nowOff = false
  await update($, off, list => {
    nowOff = !list.includes(name)
    return nowOff ? [...list, name] : list.filter(n => n !== name)
  })
  $.ui.toast(`${shortName(name)} is ${nowOff ? 'off' : 'on'} for this session`)
}

// Loads the banned list kept from earlier sessions
async function loadBanned($: Engine) {
  const saved = await $.store.get(STORE_BANNED)
  const list = Array.isArray(saved) ? saved.filter((p): p is string => typeof p === 'string' && p.trim() !== '') : []
  await update($, banned, () => list.slice(0, MAX_BANNED))
}

async function saveBanned($: Engine, list: string[]) {
  await update($, banned, () => list)
  await $.store.set(STORE_BANNED, list)
}

// Each line of what the person typed is one entry; repeats (any case) are skipped
async function banPhrases($: Engine, typed: string) {
  const phrases = typed.split(/\r?\n/).map(p => p.trim().replace(/^["“”']+|["“”']+$/g, '').trim().slice(0, MAX_PHRASE)).filter(Boolean)
  if (!phrases.length) { $.ui.toast('Type the word or phrase first'); return }
  const list = await read($, banned)
  const seen = new Set(list.map(p => p.toLowerCase()))
  const added = phrases.filter(p => !seen.has(p.toLowerCase()) && (seen.add(p.toLowerCase()), true))
  await saveBanned($, [...list, ...added].slice(0, MAX_BANNED))
  await update($, isFlagging, () => false)
  $.ui.toast(added.length ? `Banned ${quoted(added)}. Claude won't write ${added.length > 1 ? 'them' : 'it'} again.` : 'Already banned.')
}

async function unban($: Engine, phrase: string) {
  await saveBanned($, (await read($, banned)).filter(p => p !== phrase))
  $.ui.toast(`"${phrase}" is allowed again`)
}

async function copyForClaudeApp($: Engine, surface: string) {
  const list = await read($, banned)
  const copied = await $.ui.copy({ text: banRule(list), surface: surface as never })
  $.ui.toast(copied.isCopied
    ? 'Copied. In the Claude app, paste it into Settings, Your Claude, Instructions to ban these in every chat there too.'
    : 'Couldn\'t copy here. Open /skills-bar on the desktop app to copy it.')
}

// Any skill can be added, on Skillshelf or not. One that Skillshelf hasn't checked gets its code read first, and the
// person hears what it can do before Claude installs anything.
async function addSkill($: Engine, typed: string) {
  const what = typed.trim().slice(0, 500)
  if (!what) { $.ui.toast('Paste a link, a name, or what you need first'); return }
  await update($, isAdding, () => false)
  await $.prompt.submit({ text: `Add this skill to Claude Code for me: ${what}

- If it's a link or a name, check it with Skillshelf first. If Skillshelf hasn't checked it, read its SKILL.md and any scripts it runs, and tell me in plain words what it does, what it can reach, and anything risky.
- If it's a description of what I need, find the best fits with Skillshelf (and elsewhere if Skillshelf has none) and let me pick one.
- Ask me before installing anything, then install it and tell me how to use it.` })
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const ran = await next(e)
    await $.command.register({ name: 'skills-bar', description: 'Open Skillshelf: your skills with on/off switches, and the phrases you banned' })
    await loadBanned($).catch(() => {})
    await refresh($).catch(() => {})
    return ran
  })

  // Skills can change mid-session (a plugin installed, a skill added), so look again after each turn
  on('turn.complete', async ($, e, next) => {
    const ran = await next(e)
    await refresh($).catch(() => {})
    return ran
  })

  on('command.run', { command: 'skills-bar' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Skillshelf' })
    return { text: 'Skillshelf opened.' }
  })

  // A switched-off skill is refused when Claude reaches for it
  on('tool.call', { tool: 'Skill' }, async ($, e, next) => {
    const wanted = String((e as { skill?: unknown }).skill ?? '')
    const isOff = (await read($, off)).some(name => sameSkill(name, wanted))
    if (isOff) {
      return { deny: `The user switched the ${shortName(wanted)} skill off for this session in the Skillshelf bar. Do the task without it, and don't try it again unless they switch it back on.` }
    }
    return next(e)
  })

  // Claude is told up front: which skills are off, and which words and phrases it must never write
  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    const names = (await read($, off)).map(shortName)
    const phrases = await read($, banned)
    const added = [
      ...(names.length ? [{ id: `${PLUGIN}:off`, scope: 'session' as const, text: `The user switched these skills off for this session with the Skillshelf bar: ${names.join(', ')}. Don't use them unless the user switches them back on or asks for one by name.` }] : []),
      ...(phrases.length ? [{ id: `${PLUGIN}:banned`, scope: 'session' as const, text: `The user banned these as slop with the Skillshelf bar. ${banRule(phrases)} This applies to every reply, file, commit message and document you write.` }] : []),
    ]
    return added.length ? { sections: [...composed.sections, ...added] } : composed
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const { Box, Button, Text, Input } = $.ui.resolve(e)
    const list = await read($, skills)
    const offList = await read($, off)
    const bannedList = await read($, banned)
    const open = await read($, isOpen)
    const flagging = await read($, isFlagging)
    const adding = await read($, isAdding)
    // Switched-off skills always show, so nobody loses track of one; then the person's own, up to the chip limit
    const shown = [...list.filter(s => offList.includes(s.name)), ...list.filter(s => !offList.includes(s.name))].slice(0, Math.max(CHIPS, offList.length))

    return (
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="row" flexWrap="wrap" columnGap={1} rowGap={1} alignItems="center">
          <Button key="toggle" plain label={open ? '▾ Skills' : '▸ Skills'} onPress={() => update($, isOpen, v => !v)} />
          {open && shown.map(s => {
            const isOn = !offList.includes(s.name)
            return (
              <Button key={`skill-${s.name}`} variant={isOn ? 'primary' : 'secondary'} label={`${s.label}: ${isOn ? 'ON' : 'OFF'}`} onPress={() => toggle($, s.name)} />
            )
          })}
          {open && list.length > shown.length && (
            <Button key="all" variant="secondary" label={`All skills (${list.length})`} onPress={() => $.ui.open({ id: PANE, title: 'Skillshelf' })} />
          )}
          {open && list.length === 0 && <Text dimColor>No skills in this session yet</Text>}
        </Box>
        {open && adding && (
          <Box flexDirection="column" gap={1}>
            <Input key="addskill" rows={2} autoFocus placeholder="Paste a GitHub link or skill name, or say what you need (e.g. “write better emails”)" submitLabel="Add" onSubmit={value => addSkill($, value)} />
            <Box flexDirection="row" columnGap={2} alignItems="center">
              <Text dimColor>Any skill works. Claude checks it first and asks before installing.</Text>
              <Button key="cancel-add" plain dimColor label="Cancel" onPress={() => update($, isAdding, () => false)} />
            </Box>
          </Box>
        )}
        {open && !flagging && !adding && (
          <Box flexDirection="row" flexWrap="wrap" columnGap={2} alignItems="center">
            <Button key="add" plain dimColor label="+ Add skill" onPress={() => update($, isAdding, () => true)} />
            <Button key="flag" plain dimColor label="⚑ Flag slop" onPress={() => update($, isFlagging, () => true)} />
            {bannedList.length > 0 && <Button key="banned" plain dimColor label={`Banned (${bannedList.length})`} onPress={() => $.ui.open({ id: PANE, title: 'Skillshelf' })} />}
          </Box>
        )}
        {open && flagging && (
          <Box flexDirection="column" gap={1}>
            <Input key="slop" rows={2} autoFocus placeholder="Type the word or phrase Claude should never write again (one per line)" submitLabel="Ban it" onSubmit={value => banPhrases($, value)} />
            <Box flexDirection="row" columnGap={2} alignItems="center">
              <Text dimColor>Claude won't write it again, in this session or any new one.</Text>
              <Button key="cancel" plain dimColor label="Cancel" onPress={() => update($, isFlagging, () => false)} />
            </Box>
          </Box>
        )}
      </Box>
    )
  })

  // The bar keeps to a few chips; here is every skill with its switch, and every banned phrase
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const list = await read($, skills)
    const offList = await read($, off)
    const bannedList = await read($, banned)
    const onCount = list.length - list.filter(s => offList.includes(s.name)).length

    return (
      <Box flexDirection="column" gap={1}>
        <Text bold>Banned phrases</Text>
        {bannedList.length === 0 && <Text dimColor>None yet. Use ⚑ Flag slop in the bar to ban a word or phrase.</Text>}
        {bannedList.map(p => (
          <Box key={`ban-${p}`} flexDirection="row" justifyContent="space-between" alignItems="center" columnGap={2}>
            <Text>{p}</Text>
            <Button key={`unban-${p}`} plain dimColor label="Allow again" onPress={() => unban($, p)} />
          </Box>
        ))}
        {bannedList.length > 0 && <Button key="copy" variant="secondary" label="Copy for the Claude app" onPress={() => copyForClaudeApp($, e.surface)} />}
        <Text bold>Skills</Text>
        <Text dimColor>{list.length ? `${onCount} of ${list.length} on. Switches apply to this session.` : 'No skills in this session yet.'}</Text>
        {list.map(s => {
          const isOn = !offList.includes(s.name)
          return (
            <Box key={`row-${s.name}`} flexDirection="row" justifyContent="space-between" alignItems="center" columnGap={2}>
              <Text>{s.label}</Text>
              <Button key={`pane-${s.name}`} variant={isOn ? 'primary' : 'secondary'} label={isOn ? 'ON' : 'OFF'} onPress={() => toggle($, s.name)} />
            </Box>
          )
        })}
        <Button key="pane-add" plain label="+ Add a skill" onPress={() => update($, isAdding, () => true)} />
      </Box>
    )
  })
}
