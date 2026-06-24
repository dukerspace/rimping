import { defineCommand } from 'citty'
import { findProjectRoot, loadLastResult } from '@rimping/core'
import consola from 'consola'
import { accent, divider, highlight, label, section, title } from '../style.js'

export const explainCommand = defineCommand({
  meta: {
    description: 'Show pipeline explain steps from the last optimization',
  },
  async run() {
    const cwd = findProjectRoot(process.cwd())
    const last = await loadLastResult(cwd)

    if (!last) {
      consola.warn('No optimization run in this session. Run `rimping optimize` first.')
      process.exit(1)
    }

    consola.log(title('Pipeline Explain'))
    consola.log(divider(50))

    for (const [i, step] of last.explain.entries()) {
      const saved = step.tokensBefore - step.tokensAfter
      consola.log(
        `${highlight(String(i + 1))}. ${accent(`[${step.stage}${step.strategy ? ` → ${step.strategy}` : ''}]`)}`,
      )
      consola.log(
        `   ${label('Tokens:', `${step.tokensBefore} → ${step.tokensAfter} (${saved >= 0 ? 'saved' : 'added'} ${Math.abs(saved)})`)}`,
      )
      if (step.detail) consola.log(`   ${label('Detail:', step.detail)}`)
    }

    consola.log('')
    consola.log(section('Summary'))
    consola.log(label('Skills:', last.stats.skillsUsed.join(', ') || 'none'))
    consola.log(label('Strategies:', last.stats.strategiesApplied.join(', ') || 'none'))
    consola.log(label('Total:', `${last.stats.originalTokens} → ${last.stats.optimizedTokens} tokens`))
    consola.log(label('Savings:', `${last.stats.savingsPercent}%`))
    consola.log(label('Duration:', `${last.stats.durationMs}ms`))
  },
})
