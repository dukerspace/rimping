import { defineCommand } from 'citty'
import { hooksInitCommand } from './hooks-init.js'
import { hooksLogCommand } from './hooks-log.js'
import { hooksPreSendCommand } from './hooks-pre-send.js'

export const hooksCommand = defineCommand({
  meta: {
    description: 'Manage Cursor hooks for token optimization',
  },
  subCommands: {
    init: hooksInitCommand,
    log: hooksLogCommand,
    'pre-send': hooksPreSendCommand,
  },
})
