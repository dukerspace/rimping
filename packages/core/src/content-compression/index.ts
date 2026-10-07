import { estimateTokens, tokenSavingsPercent } from '../tokenizer.js'
import { compressGeneric } from '../shell-output/filters/generic.js'

export type ContentType = 'auto' | 'json' | 'logs' | 'code' | 'text'
export type DetectedContentType = Exclude<ContentType, 'auto'>

export interface CompressContentOptions {
  type?: ContentType
}

export interface CompressContentResult {
  text: string
  type: DetectedContentType
  strategiesApplied: string[]
  originalTokens: number
  compressedTokens: number
  savingsPercent: number
}

const TABLE_MARKER = '__rimping_row_table_v1__'
const LOG_MARKER = '__rimping_log_runs_v1__'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function resolveType(text: string, requested: ContentType): DetectedContentType {
  if (requested !== 'auto') return requested
  const trimmed = text.trimStart()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      JSON.parse(text)
      return 'json'
    } catch {
      // Continue with the textual detectors.
    }
  }

  const lines = text.split(/\r?\n/)
  if (lines.length >= 3) {
    const repeated = new Set<string>()
    let previous: string | undefined
    for (const line of lines) {
      if (line && line === previous) repeated.add(line)
      previous = line
    }
    if (repeated.size > 0) return 'logs'
  }

  return 'text'
}

function compressJson(text: string): { text: string; strategy?: string } {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return { text }
  }

  if (
    Array.isArray(value) &&
    value.length >= 2 &&
    value.every(isRecord)
  ) {
    const keys = Object.keys(value[0]!).sort()
    if (keys.length > 0 && value.every((row) => {
      const rowKeys = Object.keys(row).sort()
      return rowKeys.length === keys.length && rowKeys.every((key, index) => key === keys[index])
    })) {
      const columnValues = keys.map((key) => {
        const distinct: unknown[] = []
        const indexes = new Map<string, number>()
        const occurrences = new Map<string, number>()
        for (const row of value) {
          const cell = row[key]
          const encoded = JSON.stringify(cell)
          if (encoded === undefined) continue
          occurrences.set(encoded, (occurrences.get(encoded) ?? 0) + 1)
          if (!indexes.has(encoded)) {
            indexes.set(encoded, distinct.length)
            distinct.push(cell)
          }
        }
        if (!Array.from(occurrences.values()).some((count) => count > 1)) return null
        const rawCells = JSON.stringify(value.map((row) => row[key]))
        const indexedCells = JSON.stringify(value.map((row) => indexes.get(JSON.stringify(row[key])!)!))
        return estimateTokens(`${JSON.stringify(distinct)}${indexedCells}`) < estimateTokens(rawCells)
          ? { values: distinct, indexes }
          : null
      })
      const dictionaries = columnValues.map((column) => column?.values ?? null)
      const table = {
        [TABLE_MARKER]: {
          columns: keys,
          dictionaries,
          rows: value.map((row) => keys.map((key, column) => {
            const dictionary = columnValues[column]
            if (!dictionary) return row[key]
            return dictionary.indexes.get(JSON.stringify(row[key])!)!
          })),
        },
      }
      const encoded = JSON.stringify(table)
      const compact = JSON.stringify(value)
      if (estimateTokens(encoded) < estimateTokens(compact)) {
        return { text: encoded, strategy: 'json-row-table' }
      }
    }
  }

  const compact = JSON.stringify(value)
  return compact.length < text.length ? { text: compact, strategy: 'json-minify' } : { text }
}

function compressLogs(text: string): { text: string; strategy?: string } {
  const lines = text.split(/\r?\n/)
  const runs: Array<[string, number]> = []
  let i = 0
  while (i < lines.length) {
    let end = i + 1
    while (end < lines.length && lines[end] === lines[i]) end++
    runs.push([lines[i]!, end - i])
    i = end
  }
  const compressed = JSON.stringify({ [LOG_MARKER]: runs })
  return compressed !== text && estimateTokens(compressed) < estimateTokens(text)
    ? { text: compressed, strategy: 'log-run-length' }
    : { text }
}

function decodeRows(value: unknown): unknown {
  if (!isRecord(value) || Object.keys(value).length !== 1 || !isRecord(value[TABLE_MARKER])) return value
  const table = value[TABLE_MARKER]
  const columns = table.columns
  const dictionaries = table.dictionaries
  const rows = table.rows
  if (
    Object.keys(table).length !== 3 ||
    !Array.isArray(columns) ||
    !columns.every((key) => typeof key === 'string') ||
    !Array.isArray(dictionaries) ||
    dictionaries.length !== columns.length ||
    !dictionaries.every((dictionary) => dictionary === null || Array.isArray(dictionary)) ||
    !Array.isArray(rows) ||
    !rows.every((row) => Array.isArray(row) && row.length === columns.length && row.every((cell, index) => {
      const dictionary = dictionaries[index]
      return dictionary === null || (Number.isInteger(cell) && (cell as number) >= 0 && (cell as number) < dictionary.length)
    }))
  ) return value
  return rows.map((row) => Object.fromEntries(columns.map((key, index) => {
    const dictionary = dictionaries[index]
    const value = dictionary ? dictionary[row[index] as number] : row[index]
    return [key, value]
  })))
}

function decodeLogRuns(value: unknown): unknown {
  if (!isRecord(value) || Object.keys(value).length !== 1 || !Array.isArray(value[LOG_MARKER])) return value
  const runs = value[LOG_MARKER]
  if (!runs.every((run) => Array.isArray(run) && run.length === 2 && typeof run[0] === 'string' && Number.isSafeInteger(run[1]) && run[1] > 0)) return value
  return (runs as Array<[string, number]>).flatMap(([line, count]) => Array.from({ length: count }, () => line)).join('\n')
}

/** Expand reversible JSON row tables and log runs produced by compressContent. */
export function expandContent(text: string): string {
  try {
    const parsed: unknown = JSON.parse(text)
    const expanded = decodeRows(parsed)
    if (expanded === parsed) {
      const decodedLogs = decodeLogRuns(parsed)
      return typeof decodedLogs === 'string' ? decodedLogs : text
    }
    return JSON.stringify(expanded)
  } catch {
    return text
  }
}

/** Compress content using a type-specific, deterministic strategy. */
export function compressContent(
  text: string,
  options: CompressContentOptions = {},
): CompressContentResult {
  const type = resolveType(text, options.type ?? 'auto')
  let compressed = text
  let strategy: string | undefined

  if (type === 'json') {
    const result = compressJson(text)
    compressed = result.text
    strategy = result.strategy
  } else if (type === 'logs') {
    const result = compressLogs(text)
    compressed = result.text
    strategy = result.strategy
  } else if (type === 'text') {
    compressed = compressGeneric(text)
    if (compressed !== text) strategy = 'generic'
  } else if (type === 'code') {
    // Source whitespace can be meaningful (for example, in Python), so the
    // content router leaves code untouched. File-read compression retains its
    // established comment-stripping behavior separately.
  }

  const originalTokens = estimateTokens(text)
  const compressedTokens = estimateTokens(compressed)
  return {
    text: compressed,
    type,
    strategiesApplied: strategy ? [strategy] : [],
    originalTokens,
    compressedTokens,
    savingsPercent: tokenSavingsPercent(originalTokens, compressedTokens),
  }
}
