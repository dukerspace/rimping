import { describe, expect, it } from 'bun:test'
import { cacheKey, sha256 } from '../../src/utils/hash.js'

describe('sha256', () => {
  it('returns a stable hex digest', async () => {
    const hash = await sha256('hello')
    expect(hash).toHaveLength(64)
    expect(await sha256('hello')).toBe(hash)
    expect(await sha256('world')).not.toBe(hash)
  })
})

describe('cacheKey', () => {
  it('sorts keys deterministically', () => {
    const a = cacheKey({ b: '2', a: '1' })
    const b = cacheKey({ a: '1', b: '2' })
    expect(a).toBe(b)
    expect(a).toBe('a=1|b=2')
  })

  it('uses empty string for undefined values', () => {
    expect(cacheKey({ prompt: undefined })).toBe('prompt=')
  })
})
