import { describe, expect, it } from 'bun:test'
import { hooksCommand } from '../../src/commands/hooks.js'
import { skillsCommand } from '../../src/commands/skills.js'

describe('command registry', () => {
  it('registers hooks subcommands', () => {
    expect(hooksCommand.subCommands?.init).toBeDefined()
    expect(hooksCommand.subCommands?.log).toBeDefined()
    expect(hooksCommand.subCommands?.['pre-send']).toBeDefined()
    expect(hooksCommand.subCommands?.['pre-read']).toBeDefined()
    expect(hooksCommand.subCommands?.['post-read']).toBeDefined()
  })

  it('registers skills subcommands', () => {
    expect(skillsCommand.subCommands?.init).toBeDefined()
  })
})
