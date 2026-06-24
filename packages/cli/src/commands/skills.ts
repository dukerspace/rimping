import { defineCommand } from 'citty'
import { skillsInitCommand } from './skills-init.js'

export const skillsCommand = defineCommand({
  meta: {
    description: 'Manage agent skills for AI coding assistants',
  },
  subCommands: {
    init: skillsInitCommand,
  },
})
