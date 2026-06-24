import { defineCommand } from 'citty'
import { initAgentSkills, resolveInitCwd } from '@rimping/core'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import consola from 'consola'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function loadTemplate(): Promise<string> {
  const templatePath = join(
    __dirname,
    '..',
    '..',
    'templates',
    'agents-skills',
    'rimping-guidelines',
    'SKILL.md',
  )
  return readFile(templatePath, 'utf-8')
}

export const skillsInitCommand = defineCommand({
  meta: {
    description: 'Initialize rimping-guidelines agent skill in .agents/skills/',
  },
  args: {
    force: {
      type: 'boolean',
      description: 'Overwrite existing SKILL.md',
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
    const templateContent = await loadTemplate()
    const result = await initAgentSkills({
      cwd,
      force: args.force,
      dryRun: args.dryRun,
      templateContent,
    })

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
      return
    }

    if (args.dryRun) {
      consola.info('Dry run — no files written')
    }

    consola.log('')
    consola.log('Rimping Agent Skills')
    consola.log('')

    if (result.created.length > 0) {
      for (const file of result.created) {
        consola.success(`Created ${file}`)
      }
      consola.log('')
      consola.log('Customize it for your project domain terms and conventions.')
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
