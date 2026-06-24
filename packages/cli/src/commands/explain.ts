import { defineCommand } from 'citty'
import { getLastResult, loadLastResult } from '@rimping/core'
import consola from 'consola'

export const explainCommand = defineCommand({
  meta: {
    description: 'Show pipeline explain steps from the last optimization',
  },
  async run() {
    const last = (await loadLastResult()) ?? getLastResult()

    if (!last) {
      consola.warn('No optimization run in this session. Run `rimping optimize` first.')
      process.exit(1)
    }

    consola.log('Pipeline Explain')
    consola.log('─'.repeat(50))

    for (const [i, step] of last.explain.entries()) {
      const saved = step.tokensBefore - step.tokensAfter
      consola.log(
        `${i + 1}. [${step.stage}${step.strategy ? ` → ${step.strategy}` : ''}]`,
      )
      consola.log(`   Tokens: ${step.tokensBefore} → ${step.tokensAfter} (${saved >= 0 ? 'saved' : 'added'} ${Math.abs(saved)})`)
      if (step.detail) consola.log(`   Detail: ${step.detail}`)
    }

    consola.log('')
    consola.log('Summary')
    consola.log(`  Skills:     ${last.stats.skillsUsed.join(', ') || 'none'}`)
    consola.log(`  Strategies: ${last.stats.strategiesApplied.join(', ') || 'none'}`)
    consola.log(`  Total:      ${last.stats.originalTokens} → ${last.stats.optimizedTokens} tokens`)
    consola.log(`  Savings:    ${last.stats.savingsPercent}%`)
    consola.log(`  Duration:   ${last.stats.durationMs}ms`)
  },
})
