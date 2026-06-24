import type { Skill } from './types.js'
import { extractRules, extractSection, parseFrontmatter } from './utils/markdown.js'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { readdir, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
let skillCache: Skill[] | null = null

function getSkillDirs(cwd: string): string[] {
  return [join(cwd, 'skills'), join(homedir(), '.rimping', 'skills')]
}

function parseSkillFile(content: string, filePath: string): Skill {
  const { meta, body } = parseFrontmatter(content)
  const id = String(meta.id ?? filePath.replace(/\.md$/, '').split('/').pop())
  const tags = Array.isArray(meta.tags) ? meta.tags.map(String) : []
  const triggers = Array.isArray(meta.triggers) ? meta.triggers.map(String) : []

  return {
    id,
    name: String(meta.name ?? id),
    tags,
    priority: Number(meta.priority ?? 10),
    triggers,
    goal: extractSection(body, 'Goal'),
    rules: extractRules(extractSection(body, 'Rules')),
    transformation: extractSection(body, 'Transformation'),
    outputStyle: extractSection(body, 'Output Style'),
    filePath,
  }
}

export async function loadSkills(cwd = process.cwd()): Promise<Skill[]> {
  if (skillCache) return skillCache

  const byId = new Map<string, Skill>()
  for (const dir of getSkillDirs(cwd)) {
    if (!existsSync(dir)) continue
    const files = await readdir(dir)
    for (const file of files) {
      if (!file.endsWith('.md')) continue
      const filePath = join(dir, file)
      const content = await readFile(filePath, 'utf-8')
      const skill = parseSkillFile(content, filePath)
      if (!byId.has(skill.id)) byId.set(skill.id, skill)
    }
  }

  skillCache = [...byId.values()]
  return skillCache
}

export function clearSkillCache(): void {
  skillCache = null
}

function scoreSkill(skill: Skill, prompt: string): number {
  const lower = prompt.toLowerCase()
  const words = new Set(lower.split(/\W+/).filter(Boolean))
  let score = 0

  for (const trigger of skill.triggers) {
    if (lower.includes(trigger.toLowerCase())) score += 3
    if (words.has(trigger.toLowerCase())) score += 2
  }
  for (const tag of skill.tags) {
    if (lower.includes(tag.toLowerCase())) score += 1
  }

  return score
}

export function autoDetectSkills(prompt: string, allSkills: Skill[], threshold = 2): Skill[] {
  return allSkills
    .map((skill) => ({ skill, score: scoreSkill(skill, prompt) }))
    .filter(({ score }) => score >= threshold)
    .sort((a, b) => b.score - a.score || b.skill.priority - a.skill.priority)
    .map(({ skill }) => skill)
}

export function selectSkills(
  allSkills: Skill[],
  options: { ids?: string[]; prompt: string; autoDetect?: boolean },
): Skill[] {
  if (options.ids?.length) {
    const idSet = new Set(options.ids)
    return allSkills.filter((s) => idSet.has(s.id)).sort((a, b) => b.priority - a.priority)
  }
  if (options.autoDetect !== false) {
    const detected = autoDetectSkills(options.prompt, allSkills)
    if (detected.length) return detected
  }
  return []
}

const FILLER_IN_SKILL = [
  /\bI would like you to\b/gi,
  /\bI would like to\b/gi,
  /\bplease also\b/gi,
  /\bcould you also\b/gi,
  /\bplease\b/gi,
  /\bcould you\b/gi,
  /\bwould you\b/gi,
  /\bI would like\b/gi,
  /\bhelp me\b/gi,
  /\bkindly\b/gi,
]

function normalizeSkillText(text: string): string {
  return text.replace(/  +/g, ' ').replace(/^\s+|\s+$/g, '').trim()
}

function applySkillTransform(prompt: string, skill: Skill): string {
  let text = prompt
  const transformation = `${skill.transformation} ${skill.rules.join(' ')}`
  if (/imperative/i.test(transformation)) {
    text = text.replace(/\bI need to\b/gi, '').replace(/\bI want to\b/gi, '')
  }
  if (/drop pleasantries|filler/i.test(transformation)) {
    for (const pattern of FILLER_IN_SKILL) {
      text = text.replace(pattern, '')
    }
  }
  if (/terse|compress|trim/i.test(transformation)) {
    text = text.replace(/\bin order to\b/gi, 'to').replace(/\bfor the purpose of\b/gi, 'to')
  }
  return normalizeSkillText(text)
}

export function composeSkills(skills: Skill[], prompt: string): { text: string; skillIds: string[] } {
  if (!skills.length) return { text: prompt, skillIds: [] }

  const skillIds: string[] = []
  let text = prompt

  for (const skill of skills) {
    const before = text
    text = applySkillTransform(text, skill)
    if (text !== before) skillIds.push(skill.id)
  }

  return { text, skillIds }
}

export async function reconcileSkillsUsed(cwd: string, skillsUsed: string[]): Promise<string[]> {
  if (!skillsUsed.length) return skillsUsed
  const available = new Set((await loadSkills(cwd)).map((skill) => skill.id))
  return skillsUsed.filter((id) => available.has(id))
}
