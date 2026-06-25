import { describe, expect, it } from 'bun:test'
import { normalizeCliArgs } from '../../src/argv.js'

describe('normalizeCliArgs', () => {
  it('maps -v to --version', () => {
    expect(normalizeCliArgs(['-v'])).toEqual(['--version'])
  })

  it('passes through other args unchanged', () => {
    expect(normalizeCliArgs(['doctor'])).toEqual(['doctor'])
    expect(normalizeCliArgs(['--version'])).toEqual(['--version'])
    expect(normalizeCliArgs(['optimize', 'hello'])).toEqual(['optimize', 'hello'])
  })
})
