import { defineCommand } from 'citty'
import {
  aggregateHookStatsByDate,
  aggregateHookStatsByDateAndEvent,
  countHookEventsByType,
  findProjectRoot,
  getCacheDir,
  getCacheStats,
  getCacheStatsByDate,
  loadLastResult,
  readHookLogs,
} from '@rimping/core'
import consola from 'consola'
import { divider, highlight, label, muted, padVisible, section, title } from '../style.js'

const ROW_LABEL_WIDTH = 14

function formatDailyRow(date: string, count: number, saved: number, avg: number, countLabel: string): string {
  const countText = `${count} ${countLabel}${count === 1 ? '' : 's'}`
  const dateCol = padVisible(muted(date), ROW_LABEL_WIDTH)
  const countCol = padVisible(highlight(countText), 14)
  return `  ${dateCol}${countCol}${highlight(String(saved))} saved  avg ${highlight(`${avg}%`)}`
}

export const statsCommand = defineCommand({
  meta: {
    description: 'Show optimization cache and last-run statistics',
  },
  async run() {
    const cwd = findProjectRoot(process.cwd())
    const cache = await getCacheStats()
    const cacheByDate = await getCacheStatsByDate()
    const last = await loadLastResult(cwd)
    const hookLogs = await readHookLogs(cwd)
    const hookByDate = aggregateHookStatsByDate(hookLogs)
    const hookByEvent = aggregateHookStatsByDateAndEvent(hookLogs)
    const eventCounts = countHookEventsByType(hookLogs)

    consola.log(title('Rimping Stats'))
    consola.log(divider())
    consola.log(label('Cache directory:', getCacheDir()))
    consola.log(label('Cache entries:', String(cache.totalEntries)))
    consola.log(label('Total savings:', `${cache.totalSavings} tokens`))
    consola.log(label('Avg savings:', `${cache.avgSavingsPercent}%`))

    if (cacheByDate.length > 0) {
      consola.log('')
      consola.log(section('Cache by date:'))
      for (const day of cacheByDate) {
        consola.log(formatDailyRow(day.date, day.entries, day.tokensSaved, day.avgSavingsPercent, 'entry'))
      }
    }

    if (hookByDate.length > 0) {
      consola.log('')
      consola.log(section('Hook runs by date (all events):'))
      for (const day of hookByDate) {
        consola.log(formatDailyRow(day.date, day.runs, day.tokensSaved, day.avgSavingsPercent, 'run'))
      }
    }

    const eventSummary = Object.entries(eventCounts)
      .map(([event, count]) => `${event}:${count}`)
      .join(', ')
    if (eventSummary) {
      consola.log('')
      consola.log(label('Hook events:', eventSummary))
    }

    if (hookByEvent.length > 0) {
      consola.log('')
      consola.log(section('Hook savings by event:'))
      for (const row of hookByEvent.slice(0, 12)) {
        consola.log(
          formatDailyRow(
            `${row.date} ${row.event}`,
            row.runs,
            row.tokensSaved,
            row.avgSavingsPercent,
            'run',
          ),
        )
      }
    }

    if (last) {
      consola.log('')
      consola.log(section('Last optimization:'))
      consola.log(label('Original:', `${last.stats.originalTokens} tokens`))
      consola.log(label('Optimized:', `${last.stats.optimizedTokens} tokens`))
      consola.log(label('Saved:', `${last.stats.savingsPercent}%`))
      consola.log(label('Skills:', last.stats.skillsUsed.join(', ') || 'none'))
      consola.log(label('Duration:', `${last.stats.durationMs}ms`))
      consola.log(label('Cache hit:', last.stats.cacheHit ? 'yes' : 'no'))
      if (last.stats.budgetGuard) {
        consola.log(
          label(
            'Budget:',
            `${last.stats.budgetGuard.final}/${last.stats.budgetGuard.limit}${last.stats.budgetGuard.truncated ? ' (truncated)' : ''}`,
          ),
        )
      }
    } else {
      consola.log('')
      consola.log(muted('No optimization run in this session yet.'))
    }
  },
})
