import { defineCommand } from 'citty'
import {
  clearHookLogs,
  findProjectRoot,
  formatHookLogSummary,
  getHooksLogPath,
  loadConfig,
  mergeHooksConfig,
  readHookLogs,
} from '@rimping/core'
import consola from 'consola'
import { divider, dimText, fail, label, muted, section, title } from '../style.js'

export const hooksLogCommand = defineCommand({
  meta: {
    description: 'View detailed hook run logs from .rimping/hooks.log',
  },
  args: {
    last: {
      type: 'string',
      description: 'Number of recent entries to show (default: 10)',
      default: '10',
    },
    json: {
      type: 'boolean',
      description: 'Print raw JSON log entries',
      default: false,
    },
    clear: {
      type: 'boolean',
      description: 'Clear the hook log file',
      default: false,
    },
  },
  async run({ args }) {
    const cwd = findProjectRoot(process.cwd())
    const config = await loadConfig(cwd)
    const hooks = mergeHooksConfig(config)
    const logPath = getHooksLogPath(cwd)

    if (args.clear) {
      await clearHookLogs(cwd)
      consola.success(`Cleared ${logPath}`)
      return
    }

    const last = Number.parseInt(String(args.last), 10)
    const limit = Number.isFinite(last) && last > 0 ? last : 10
    const entries = await readHookLogs(cwd, { last: limit })

    if (entries.length === 0) {
      consola.log(title('Rimping Hook Log'))
      consola.log(divider())
      consola.log(label('Log file:', logPath))
      if (!hooks.logStats) {
        consola.log(
          muted('hooks.logStats is false — enable it in .rimping/config.json to record hook runs'),
        )
      } else {
        consola.log(muted('No hook runs logged yet. Submit a prompt in Cursor to generate entries.'))
      }
      return
    }

    if (args.json) {
      for (const entry of entries) {
        console.log(JSON.stringify(entry))
      }
      return
    }

    consola.log(title('Rimping Hook Log'))
    consola.log(divider())
    consola.log(label('Log file:', logPath))
    consola.log(
      muted(`Showing last ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}`),
    )
    consola.log('')

    for (const entry of entries) {
      consola.log(section(formatHookLogSummary(entry)))

      if (entry.event === 'pre-send' && entry.result.explain && entry.result.explain.length > 0) {
        for (const step of entry.result.explain) {
          const detail = step.detail ? ` — ${step.detail}` : ''
          consola.log(
            dimText(
              `  ${step.stage}${step.strategy ? `/${step.strategy}` : ''}: ${step.tokensBefore}→${step.tokensAfter}${detail}`,
            ),
          )
        }
      }

      if (entry.event === 'pre-send') {
        if (entry.input.extraKeys.length > 0) {
          consola.log(dimText(`  input keys: ${entry.input.extraKeys.join(', ')}`))
        }
        if (entry.input.promptPreview) {
          consola.log(dimText(`  preview: ${entry.input.promptPreview}`))
        }
      }

      if (entry.event === 'shell-run' && entry.result.stats?.strategiesApplied?.length) {
        consola.log(dimText(`  strategies: ${entry.result.stats.strategiesApplied.join(', ')}`))
      }

      if (entry.event === 'post-read' && entry.result.stats?.strategiesApplied?.length) {
        consola.log(dimText(`  strategies: ${entry.result.stats.strategiesApplied.join(', ')}`))
      }

      if (entry.error) {
        consola.log(fail(`  error: ${entry.error}`))
      }

      consola.log('')
    }
  },
})
