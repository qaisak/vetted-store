/** One skill the session has, as the band shows it. */
export type BandSkill = {
  /** The name the Skill tool and /skills use, e.g. `anthropic-skills:docx` */
  name: string
  /** The short name shown on the chip, e.g. `docx` */
  label: string
  /** Where it came from: userSettings, projectSettings, plugin, built-in, ... */
  source: string
}

declare module 'claude-code' {
  interface PluginState {
    skillshelf: {
      /** Every skill the session has, refreshed at start and after each turn */
      skills: BandSkill[]
      /** Names of the skills switched off for this session */
      off: string[]
      /** Words and phrases the person banned with Flag slop (kept across sessions in $.store) */
      banned: string[]
      /** Whether the band shows its chips (the ▾ Skills toggle) */
      isOpen: boolean
      /** Whether the Flag slop paste box is open */
      isFlagging: boolean
      /** Whether the Add skill box is open */
      isAdding: boolean
    }
  }
}
