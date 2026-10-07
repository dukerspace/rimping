import { defineCommand } from 'citty'
import { initAgentSkills, resolveInitCwd } from '@rimping/core'
import consola from 'consola'
import { muted, title } from '../style.js'

export const skillsInitCommand = defineCommand({
  meta: {
    description: 'Copy rimping-guidelines from .skills/ into .agents/skills/',
  },
  args: {
    force: {
      type: 'boolean',
      description: 'Overwrite existing skill folder',
      default: false,
    },
    dryRun: {
      type: 'boolean',
      description: 'Show what would be created without writing files',
      default: false,
    },
    json: {
      type: 'boolean',
      description: 'Output result as JSON',
      default: false,
    },
    cwd: {
      type: 'string',
      description: 'Working directory (default: directory where rimping was invoked)',
    },
  },
  async run({ args }) {
    const cwd = resolveInitCwd(args.cwd)
    const result = await initAgentSkills({
      cwd,
      force: args.force,
      dryRun: args.dryRun,
    })

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
      return
    }

    if (args.dryRun) {
      consola.info('Dry run — no files written')
    }

    consola.log('')
    consola.log(title('Rimping Agent Skills'))
    consola.log('')

    if (result.created.length > 0) {
      for (const file of result.created) {
        consola.success(`Created ${file}`)
      }
      consola.log('')
      consola.log(muted('Customize it for your project domain terms and conventions.'))
    }

    if (result.skipped.length > 0) {
      for (const file of result.skipped) {
        consola.warn(`Skipped ${file} (already exists, use --force to overwrite)`)
      }
    }

    if (result.created.length === 0 && result.skipped.length === 0) {
      consola.log(muted('Nothing to do.'))
    }

    consola.log('')
  },
})
