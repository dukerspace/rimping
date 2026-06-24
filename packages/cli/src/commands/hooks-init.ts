import { defineCommand } from 'citty'
import { initCursorHooks, resolveInitCwd } from '@rimping/core'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import consola from 'consola'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function loadHooksJsonTemplate(): Promise<string> {
  const templatePath = join(__dirname, '..', '..', 'templates', 'cursor-hooks', 'hooks.json')
  return readFile(templatePath, 'utf-8')
}

export const hooksInitCommand = defineCommand({
  meta: {
    description: 'Initialize Cursor beforeSubmitPrompt hook for token optimization',
  },
  args: {
    force: {
      type: 'boolean',
      description: 'Overwrite existing hook files',
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
    const hooksJsonTemplate = await loadHooksJsonTemplate()
    const result = await initCursorHooks({
      cwd,
      force: args.force,
      dryRun: args.dryRun,
      hooksJsonTemplate,
    })

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
      return
    }

    if (args.dryRun) {
      consola.info('Dry run — no files written')
    }

    consola.log('')
    consola.log('Rimping Cursor Hooks')
    consola.log('')

    if (result.created.length > 0) {
      for (const file of result.created) {
        consola.success(`Created ${file}`)
      }
      consola.log('')
      consola.log('Restart Cursor to load the new hook.')
    }

    if (result.skipped.length > 0) {
      for (const file of result.skipped) {
        consola.warn(`Skipped ${file} (already exists, use --force to overwrite)`)
      }
    }

    if (result.created.length === 0 && result.skipped.length === 0) {
      consola.log('Nothing to do.')
    }

    consola.log('')
  },
})
