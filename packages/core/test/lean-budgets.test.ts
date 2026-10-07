import { describe, expect, test } from 'bun:test'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { estimateTokens } from '../src/tokenizer.js'

function findRepoRoot(start: string): string {
  let dir = start
  while (true) {
    if (existsSync(join(dir, 'AGENTS.md')) && existsSync(join(dir, 'turbo.json'))) return dir
    const parent = dirname(dir)
    if (parent === dir) throw new Error('Could not find repo root with AGENTS.md')
    dir = parent
  }
}

const REPO_ROOT = findRepoRoot(dirname(fileURLToPath(import.meta.url)))

function parseBudgetCaps(yaml: string): Record<string, number> {
  const caps: Record<string, number> = {}
  let current: string | null = null
  for (const line of yaml.split('\n')) {
    const classMatch = line.match(/^ {2}(tiny|normal|hard):\s*$/)
    if (classMatch) {
      current = classMatch[1]
      continue
    }
    const tokenMatch = line.match(/^ {4}max_tokens:\s*(\d+)\s*$/)
    if (tokenMatch && current) caps[current] = Number(tokenMatch[1])
  }
  return caps
}

function agentsMdCaps(text: string): Record<string, number> {
  const match = text.match(
    /tiny\s*≤\s*(\d+)\s*,\s*normal\s*≤\s*(\d+)\s*,\s*hard\s*≤\s*(\d+)/i,
  )
  if (!match) throw new Error('AGENTS.md missing budget line: tiny ≤ N, normal ≤ N, hard ≤ N')
  return { tiny: Number(match[1]), normal: Number(match[2]), hard: Number(match[3]) }
}

describe('lean pstack budgets', () => {
  test('AGENTS.md stays under 500 tokens', () => {
    const text = readFileSync(join(REPO_ROOT, 'AGENTS.md'), 'utf-8')
    expect(estimateTokens(text)).toBeLessThanOrEqual(500)
  })

  test('each skill stays under 1000 tokens', () => {
    const skillsDir = join(REPO_ROOT, '.agents', 'skills')
    const skills = ['implement', 'debug', 'refactor', 'architect', 'review']
    for (const name of skills) {
      const text = readFileSync(join(skillsDir, name, 'SKILL.md'), 'utf-8')
      expect(estimateTokens(text), name).toBeLessThanOrEqual(1000)
    }
  })

  test('each principle stays under 250 tokens', () => {
    const dir = join(REPO_ROOT, '.agents', 'lean', 'principles')
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.md'))) {
      const text = readFileSync(join(dir, file), 'utf-8')
      expect(estimateTokens(text), file).toBeLessThanOrEqual(250)
    }
  })

  test('AGENTS.md workflow caps match budgets.yaml', () => {
    const agents = readFileSync(join(REPO_ROOT, 'AGENTS.md'), 'utf-8')
    const yaml = readFileSync(join(REPO_ROOT, '.agents', 'lean', 'budgets.yaml'), 'utf-8')
    const fromAgents = agentsMdCaps(agents)
    const fromYaml = parseBudgetCaps(yaml)
    expect(fromYaml).toEqual({ tiny: 5000, normal: 20000, hard: 50000 })
    expect(fromAgents).toEqual(fromYaml)
  })
})
