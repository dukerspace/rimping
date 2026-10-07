import { describe, expect, test } from 'bun:test'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const leanstackRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const templatesRoot = join(leanstackRoot, 'templates')

const principles = [
  'minimal-change',
  'understand-before-change',
  'root-cause',
  'verify',
  'behavior-over-implementation',
  'context-budget',
  'no-premature-abstraction',
]

const skills = ['implement', 'debug', 'refactor', 'architect', 'review']
const agents = ['general', 'debugger', 'architect', 'reviewer']
const adapters = ['cursor', 'claude', 'codex', 'chatgpt']
const commands = [
  'rimping-init',
  'rimping-run',
  'rimping-plan',
  'rimping-debug',
  'rimping-architect',
  'rimping-review',
  'rimping-status',
  'rimping-doctor',
]

function parseBudgetField(yaml: string, field: string): Record<string, number> {
  const caps: Record<string, number> = {}
  let current: string | null = null
  const fieldRe = new RegExp(`^ {4}${field}:\\s*(\\d+)\\s*$`)
  for (const line of yaml.split('\n')) {
    const classMatch = line.match(/^ {2}(tiny|normal|hard):\s*$/)
    if (classMatch) {
      current = classMatch[1]
      continue
    }
    const match = line.match(fieldRe)
    if (match && current) caps[current] = Number(match[1])
  }
  return caps
}

describe('leanstack templates', () => {
  test('required core files exist', () => {
    for (const relative of [
      'AGENTS.md',
      'budgets.yaml',
      'core/router.md',
      'core/context.md',
      'core/stop.md',
    ]) {
      expect(existsSync(join(templatesRoot, relative)), relative).toBe(true)
    }
  })

  test('principles, skills, agents, and adapters exist', () => {
    for (const name of principles) {
      expect(existsSync(join(templatesRoot, 'principles', `${name}.md`)), name).toBe(true)
    }
    for (const name of skills) {
      expect(existsSync(join(templatesRoot, 'skills', name, 'SKILL.md')), name).toBe(true)
    }
    for (const name of agents) {
      expect(existsSync(join(templatesRoot, 'agents', `${name}.md`)), name).toBe(true)
    }
    for (const name of adapters) {
      expect(existsSync(join(templatesRoot, 'adapters', `${name}.md`)), name).toBe(true)
    }
  })

  test('command set stays at eight and mentions context loading where required', () => {
    const files = readdirSync(join(templatesRoot, 'commands')).filter((f) => f.endsWith('.md'))
    expect(files.sort()).toEqual(commands.map((name) => `${name}.md`).sort())

    const doctor = readFileSync(join(templatesRoot, 'commands', 'rimping-doctor.md'), 'utf-8')
    const status = readFileSync(join(templatesRoot, 'commands', 'rimping-status.md'), 'utf-8')
    const run = readFileSync(join(templatesRoot, 'commands', 'rimping-run.md'), 'utf-8')
    expect(doctor).toContain('core/context.md')
    expect(status).toContain('core/context.md')
    expect(run).toContain('core/context.md')
  })

  test('budgets.yaml has version, token caps, and principle caps', () => {
    const yaml = readFileSync(join(templatesRoot, 'budgets.yaml'), 'utf-8')
    expect(yaml).toMatch(/^version:\s*1\s*$/m)
    expect(parseBudgetField(yaml, 'max_tokens')).toEqual({
      tiny: 5000,
      normal: 20000,
      hard: 50000,
    })
    expect(parseBudgetField(yaml, 'max_principles')).toEqual({
      tiny: 2,
      normal: 3,
      hard: 5,
    })
  })

  test('AGENTS.md budget line matches budgets.yaml tokens', () => {
    const agentsMd = readFileSync(join(templatesRoot, 'AGENTS.md'), 'utf-8')
    const match = agentsMd.match(
      /tiny\s*≤\s*(\d+)\s*,\s*normal\s*≤\s*(\d+)\s*,\s*hard\s*≤\s*(\d+)/i,
    )
    expect(match).toBeTruthy()
    expect({
      tiny: Number(match![1]),
      normal: Number(match![2]),
      hard: Number(match![3]),
    }).toEqual({ tiny: 5000, normal: 20000, hard: 50000 })
  })
})
