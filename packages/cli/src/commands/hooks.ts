import { defineCommand } from 'citty'
import { hooksInitCommand } from './hooks-init.js'
import { hooksLogCommand } from './hooks-log.js'
import { hooksPreSendCommand } from './hooks-pre-send.js'
import { hooksPreShellCommand } from './hooks-pre-shell.js'
import { hooksPreReadCommand } from './hooks-pre-read.js'
import { hooksPostReadCommand } from './hooks-post-read.js'

export const hooksCommand = defineCommand({
  meta: {
    description: 'Manage Cursor hooks for token optimization',
  },
  subCommands: {
    init: hooksInitCommand,
    log: hooksLogCommand,
    'pre-send': hooksPreSendCommand,
    'pre-shell': hooksPreShellCommand,
    'pre-read': hooksPreReadCommand,
    'post-read': hooksPostReadCommand,
  },
})
