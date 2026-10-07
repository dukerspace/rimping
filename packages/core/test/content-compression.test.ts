import { describe, expect, it } from 'bun:test'
import { compressContent, expandContent } from '../src/content-compression/index.js'

describe('compressContent', () => {
  it('encodes repeated JSON object keys in a reversible row table', () => {
    const input = Array.from({ length: 40 }, (_, index) => ({
      request_identifier: `req-${index}`,
      response_status_code: index === 39 ? 503 : 200,
      detail: { message: index === 39 ? 'upstream timeout' : 'ok', retryable: index === 39 },
    }))
    const raw = JSON.stringify(input, null, 2)
    const result = compressContent(raw)

    expect(result.type).toBe('json')
    expect(result.strategiesApplied).toContain('json-row-table')
    expect(result.compressedTokens).toBeLessThan(result.originalTokens)
    expect(JSON.parse(expandContent(result.text))).toEqual(input)
    expect(result.text).toContain('upstream timeout')
  })

  it('handles nested values, mixed value types, and empty arrays', () => {
    const input = [
      { id: 1, value: null, tags: ['a', 'b'] },
      { id: 2, value: { enabled: false }, tags: [] },
    ]
    const result = compressContent(JSON.stringify(input), { type: 'json' })
    expect(JSON.parse(expandContent(result.text))).toEqual(input)

    const empty = compressContent('[]', { type: 'json' })
    expect(empty.text).toBe('[]')
    expect(expandContent(empty.text)).toBe('[]')
  })

  it('leaves heterogeneous arrays unchanged when no safe table applies', () => {
    const raw = '[{"id":1},{"id":2,"extra":true}]'
    const result = compressContent(raw)
    expect(result.text).toBe(raw)
    expect(result.strategiesApplied).toEqual([])
  })

  it('compresses repeated log lines without losing their count or content', () => {
    const line = '2026-09-29T10:00:00Z WARN retrying request to upstream service after transient failure'
    const raw = Array.from({ length: 80 }, () => line).join('\n')
    const result = compressContent(raw, { type: 'logs' })

    expect(result.strategiesApplied).toContain('log-run-length')
    expect(result.compressedTokens).toBeLessThan(result.originalTokens)
    expect(expandContent(result.text)).toBe(raw)
  })

  it('routes JSON and repeated log content automatically', () => {
    expect(compressContent('{"ok": true}').type).toBe('json')
    const repeated = 'error: connection refused\nerror: connection refused\nerror: connection refused'
    expect(compressContent(repeated).type).toBe('logs')
  })
})
