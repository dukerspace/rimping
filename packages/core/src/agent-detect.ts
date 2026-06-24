import { access, readdir } from 'node:fs/promises'
import { constants, existsSync } from 'node:fs'
import { homedir, platform } from 'node:os'
import { join } from 'node:path'
import { getConfigPath, loadConfig, type AgentId } from './config.js'
import { checkCursorHooks } from './hooks-init.js'
import { loadLastResult } from './pipeline.js'
import { mergeHooksConfig, mergeReadConfig, mergeShellConfig } from './resolve-options.js'

export type AgentStatus = 'detected' | 'not_found' | 'unknown'

export interface AgentProbeResult {
  id: AgentId
  name: string
  status: AgentStatus
  evidence: string[]
  notes?: string
}

export interface DoctorResult {
  agents: AgentProbeResult[]
  config: { found: boolean; path?: string; valid?: boolean; error?: string }
  skills: { projectSkills: number; agentSkillInstalled: boolean }
  hooks: {
    hooksJson: boolean
    preSend: boolean
    preShell: boolean
    preRead: boolean
    postRead: boolean
    beforeSubmitRegistered: boolean
    preToolUseRegistered: boolean
    postToolUseRegistered: boolean
    enabled: boolean
    shellEnabled: boolean
    readEnabled: boolean
    logStats: boolean
    lastRun?: { originalTokens: number; optimizedTokens: number; savingsPercent: number; durationMs: number }
  }
  summary: { detectedCount: number; issues: string[] }
}

interface AgentProbe {
  id: AgentId
  name: string
  projectPaths?: (cwd: string) => string[]
  globalPaths?: () => string[]
  cli?: { bin: string; versionArgs?: string[] }
  alwaysUnknown?: { notes: string }
}

function expandHome(path: string): string {
  if (path.startsWith('~/')) return join(homedir(), path.slice(2))
  return path
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(expandHome(path), constants.F_OK)
    return true
  } catch {
    return false
  }
}

async function checkPaths(paths: string[]): Promise<string[]> {
  const found: string[] = []
  for (const p of paths) {
    if (await pathExists(p)) found.push(p)
  }
  return found
}

function cliAvailable(bin: string, versionArgs: string[] = ['--version']): boolean {
  const which = Bun.spawnSync(['which', bin], { stdout: 'pipe', stderr: 'pipe' })
  if (which.exitCode !== 0) return false

  const version = Bun.spawnSync([bin, ...versionArgs], { stdout: 'pipe', stderr: 'pipe' })
  return version.exitCode === 0
}

const AGENT_PROBES: AgentProbe[] = [
  {
    id: 'cursor',
    name: 'Cursor',
    projectPaths: (cwd) => ['.cursor/', '.cursor/hooks.json'].map((p) => join(cwd, p)),
    globalPaths: () => ['~/.cursor/', '~/.cursor/hooks.json'],
  },
  {
    id: 'claude',
    name: 'Claude Code',
    projectPaths: (cwd) =>
      ['.claude/', '.claude/settings.local.json', 'CLAUDE.md', '.agents/'].map((p) => join(cwd, p)),
    globalPaths: () => ['~/.claude/', '~/.claude/settings.json'],
    cli: { bin: 'claude' },
  },
  {
    id: 'codex',
    name: 'OpenAI Codex',
    projectPaths: (cwd) => [join(cwd, '.codex/hooks.json')],
    globalPaths: () => ['~/.codex/', '~/.codex/hooks.json'],
    cli: { bin: 'codex' },
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    alwaysUnknown: { notes: 'No reliable local install marker' },
  },
  {
    id: 'gemini',
    name: 'Gemini CLI',
    projectPaths: (cwd) => [join(cwd, '.gemini/'), join(cwd, '.gemini/settings.json')],
    globalPaths: () => ['~/.gemini/', '~/.gemini/settings.json'],
    cli: { bin: 'gemini' },
  },
  {
    id: 'antigravity',
    name: 'Antigravity',
    projectPaths: (cwd) => [join(cwd, '.agents/hooks.json')],
    globalPaths: () => {
      const paths = ['~/.antigravity/', '~/.antigravity-ide/']
      if (platform() === 'darwin') {
        paths.push(
          '~/Library/Application Support/Antigravity',
          '~/Library/Application Support/Antigravity IDE',
        )
      }
      return paths
    },
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    projectPaths: (cwd) => [join(cwd, '.windsurf/'), join(cwd, '.windsurf/hooks.json')],
    globalPaths: () => ['~/.codeium/windsurf/'],
  },
  {
    id: 'copilot',
    name: 'GitHub Copilot',
    projectPaths: (cwd) =>
      [
        '.copilot/',
        '.github/copilot-instructions.md',
        '.github/copilot/',
        '.github/hooks/lek-optimize.json',
      ].map((p) => join(cwd, p)),
    globalPaths: () => ['~/.copilot/'],
    cli: { bin: 'gh', versionArgs: ['copilot', '--version'] },
  },
  {
    id: 'continue',
    name: 'Continue',
    projectPaths: (cwd) => [join(cwd, '.continue/')],
    globalPaths: () => ['~/.continue/'],
  },
  {
    id: 'cline',
    name: 'Cline',
    projectPaths: (cwd) => [join(cwd, '.cline/')],
  },
  {
    id: 'aider',
    name: 'Aider',
    projectPaths: (cwd) => [
      join(cwd, '.aider.conf.yml'),
      join(cwd, '.aider.chat.history.md'),
    ],
    globalPaths: () => ['~/.aider/'],
    cli: { bin: 'aider' },
  },
]

export const KNOWN_AGENT_IDS: AgentId[] = AGENT_PROBES.map((probe) => probe.id)

const AGENT_NAME_BY_ID = Object.fromEntries(AGENT_PROBES.map((probe) => [probe.id, probe.name])) as Record<
  AgentId,
  string
>

/** Popular AI coding agents surfaced in hook logs and doctor output. */
export const POPULAR_AI_AGENT_IDS = [
  'cursor',
  'copilot',
  'claude',
  'chatgpt',
  'gemini',
] as const satisfies readonly AgentId[]

export const POPULAR_AI_AGENTS = POPULAR_AI_AGENT_IDS.map((id) => ({
  id,
  name: AGENT_NAME_BY_ID[id],
}))

export function getAgentName(id: AgentId): string {
  return AGENT_NAME_BY_ID[id]
}

function formatEvidence(paths: string[], cwd: string): string[] {
  return paths.map((p) => {
    if (p.startsWith(cwd)) {
      const rel = p.slice(cwd.length).replace(/^\//, '')
      return rel || '.'
    }
    const home = homedir()
    if (p.startsWith(home)) return '~' + p.slice(home.length)
    return p
  })
}

async function probeAgent(probe: AgentProbe, cwd: string): Promise<AgentProbeResult> {
  if (probe.alwaysUnknown) {
    return {
      id: probe.id,
      name: probe.name,
      status: 'unknown',
      evidence: [],
      notes: probe.alwaysUnknown.notes,
    }
  }

  const evidence: string[] = []

  if (probe.projectPaths) {
    const projectPaths = probe.projectPaths(cwd)
    const found = await checkPaths(projectPaths)
    evidence.push(...formatEvidence(found, cwd))
  }

  if (probe.globalPaths) {
    const globalPaths = probe.globalPaths()
    const found = await checkPaths(globalPaths)
    evidence.push(...found.filter((p) => !evidence.includes(p)))
  }

  if (probe.cli) {
    const args = probe.cli.versionArgs ?? ['--version']
    if (cliAvailable(probe.cli.bin, args)) {
      evidence.push(`${probe.cli.bin} CLI`)
    }
  }

  return {
    id: probe.id,
    name: probe.name,
    status: evidence.length > 0 ? 'detected' : 'not_found',
    evidence,
  }
}

export async function detectAgents(cwd: string): Promise<AgentProbeResult[]> {
  const results: AgentProbeResult[] = []
  for (const probe of AGENT_PROBES) {
    results.push(await probeAgent(probe, cwd))
  }
  return results
}

async function countProjectSkills(cwd: string): Promise<number> {
  const skillsDir = join(cwd, '.agents', 'skills')
  if (!existsSync(skillsDir)) return 0

  try {
    const entries = await readdir(skillsDir, { withFileTypes: true })
    let count = 0
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      if (existsSync(join(skillsDir, entry.name, 'SKILL.md'))) count++
    }
    return count
  } catch {
    return 0
  }
}

async function hasAgentSkill(cwd: string): Promise<boolean> {
  const skillPath = join(cwd, '.agents/skills/rimping-guidelines/SKILL.md')
  return pathExists(skillPath)
}

export async function runDoctor(cwd: string): Promise<DoctorResult> {
  const agents = await detectAgents(cwd)
  const issues: string[] = []

  const configPath = getConfigPath(cwd)
  const configFound = existsSync(configPath)
  let configValid: boolean | undefined
  let configError: string | undefined

  if (configFound) {
    try {
      await loadConfig(cwd)
      configValid = true
    } catch (err) {
      configValid = false
      configError = err instanceof Error ? err.message : String(err)
      issues.push(`Invalid config: ${configError}`)
    }
  } else {
    issues.push('Missing .rimping/config.json (run: rimping init)')
  }

  const projectSkills = await countProjectSkills(cwd)
  const agentSkillInstalled = await hasAgentSkill(cwd)
  const hookStatus = await checkCursorHooks(cwd)
  const loadedConfig = configFound && configValid ? await loadConfig(cwd) : null
  const hooksConfig = mergeHooksConfig(loadedConfig, 'cursor')
  const shellConfig = mergeShellConfig(loadedConfig)
  const readConfig = mergeReadConfig(loadedConfig)
  const lastRun = await loadLastResult()

  if (!agentSkillInstalled) {
    issues.push('rimping-guidelines agent skill missing (run: rimping skills init)')
  }

  const cursorDetected = agents.some((a) => a.id === 'cursor' && a.status === 'detected')
  if (cursorDetected) {
    if (!hookStatus.beforeSubmitRegistered) {
      issues.push('Cursor detected but beforeSubmitPrompt hook missing (run: rimping hooks init)')
    }
    if (hooksConfig.enabled && !hookStatus.preSend) {
      issues.push('hooks.enabled is true but pre-send hook is missing (run: rimping hooks init)')
    }
    if (shellConfig.enabled && !hookStatus.preShell) {
      issues.push('shell.enabled is true but pre-shell hook is missing (run: rimping hooks init --force)')
    }
    if (readConfig.enabled && readConfig.autoLimit && !hookStatus.preRead) {
      issues.push('read.autoLimit is true but pre-read hook is missing (run: rimping hooks init --force)')
    }
    if (readConfig.enabled && readConfig.compressOutput && !hookStatus.postRead) {
      issues.push('read.compressOutput is true but post-read hook is missing (run: rimping hooks init --force)')
    }
  }

  const detectedCount = agents.filter((a) => a.status === 'detected').length

  return {
    agents,
    config: {
      found: configFound,
      path: configFound ? configPath : undefined,
      valid: configValid,
      error: configError,
    },
    skills: { projectSkills, agentSkillInstalled },
    hooks: {
      ...hookStatus,
      enabled: hooksConfig.enabled,
      shellEnabled: shellConfig.enabled,
      readEnabled: readConfig.enabled,
      logStats: hooksConfig.logStats,
      lastRun: lastRun
        ? {
            originalTokens: lastRun.stats.originalTokens,
            optimizedTokens: lastRun.stats.optimizedTokens,
            savingsPercent: lastRun.stats.savingsPercent,
            durationMs: lastRun.stats.durationMs,
          }
        : undefined,
    },
    summary: { detectedCount, issues },
  }
}

export function getDetectedAgentIds(agents: AgentProbeResult[]): AgentId[] {
  return agents.filter((a) => a.status === 'detected').map((a) => a.id)
}
