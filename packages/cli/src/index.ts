#!/usr/bin/env bun
import { defineCommand, runMain } from 'citty'
import { CLI_NAME, CLI_VERSION } from '@rimping/core'
import { initCommand } from './commands/init.js'
import { doctorCommand } from './commands/doctor.js'
import { optimizeCommand } from './commands/optimize.js'
import { statsCommand } from './commands/stats.js'
import { explainCommand } from './commands/explain.js'
import { skillsCommand } from './commands/skills.js'

import { hooksCommand } from './commands/hooks.js'
import { updateCommand } from './commands/update.js'

const main = defineCommand({
  meta: {
    name: CLI_NAME,
    version: CLI_VERSION,
    description: 'Skill-based token optimization for LLM prompts',
  },
  subCommands: {
    init: initCommand,
    doctor: doctorCommand,
    optimize: optimizeCommand,
    stats: statsCommand,
    explain: explainCommand,
    skills: skillsCommand,
    hooks: hooksCommand,
    update: updateCommand,
  },
})

runMain(main)
