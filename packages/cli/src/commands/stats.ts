import { defineCommand } from 'citty'
import { getCacheStats, getCacheDir, getLastResult, loadLastResult } from '@rimping/core'
import consola from 'consola'

export const statsCommand = defineCommand({
  meta: {
    description: 'Show optimization cache and last-run statistics',
  },
  async run() {
    const cache = await getCacheStats()
    const last = (await loadLastResult()) ?? getLastResult()

    consola.log('Rimping Stats')
    consola.log('─'.repeat(40))
    consola.log(`Cache directory: ${getCacheDir()}`)
    consola.log(`Cache entries:   ${cache.totalEntries}`)
    consola.log(`Total savings:   ${cache.totalSavings} tokens`)
    consola.log(`Avg savings:     ${cache.avgSavingsPercent}%`)

    if (last) {
      consola.log('')
      consola.log('Last optimization:')
      consola.log(`  Original:  ${last.stats.originalTokens} tokens`)
      consola.log(`  Optimized: ${last.stats.optimizedTokens} tokens`)
      consola.log(`  Saved:     ${last.stats.savingsPercent}%`)
      consola.log(`  Skills:    ${last.stats.skillsUsed.join(', ') || 'none'}`)
      consola.log(`  Duration:  ${last.stats.durationMs}ms`)
      consola.log(`  Cache hit: ${last.stats.cacheHit ? 'yes' : 'no'}`)
      if (last.stats.budgetGuard) {
        consola.log(
          `  Budget:    ${last.stats.budgetGuard.final}/${last.stats.budgetGuard.limit}${last.stats.budgetGuard.truncated ? ' (truncated)' : ''}`,
        )
      }
    } else {
      consola.log('')
      consola.log('No optimization run in this session yet.')
    }
  },
})
