import type { AgentId } from './config.js'

/** Agents with scaffoldable hook files (subset of AgentId). */
export type AgentHookId =
  | 'cursor'
  | 'claude'
  | 'codex'
  | 'gemini'
  | 'copilot'
  | 'windsurf'
  | 'antigravity'

export const AGENT_HOOK_IDS: AgentHookId[] = [
  'cursor',
  'claude',
  'codex',
  'gemini',
  'copilot',
  'windsurf',
  'antigravity',
]

export type AgentHookMergeStrategy = 'replace' | 'merge-hooks' | 'merge-named-hooks'

export interface AgentHookSpec {
  id: AgentHookId
  name: string
  /** Project-local path relative to repo root. */
  projectPath: string
  /** User-global path relative to home (undefined = project-only). */
  globalPath?: string
  /** Primary tool-intercept event name for this agent. */
  toolEvent: string
  mergeStrategy: AgentHookMergeStrategy
}

export const AGENT_HOOK_SPECS: AgentHookSpec[] = [
  {
    id: 'cursor',
    name: 'Cursor',
    projectPath: '.cursor/hooks.json',
    globalPath: '.cursor/hooks.json',
    toolEvent: 'preToolUse',
    mergeStrategy: 'replace',
  },
  {
    id: 'claude',
    name: 'Claude Code',
    projectPath: '.claude/settings.local.json',
    globalPath: '.claude/settings.json',
    toolEvent: 'PreToolUse',
    mergeStrategy: 'merge-hooks',
  },
  {
    id: 'codex',
    name: 'OpenAI Codex',
    projectPath: '.codex/hooks.json',
    globalPath: '.codex/hooks.json',
    toolEvent: 'PreToolUse',
    mergeStrategy: 'replace',
  },
  {
    id: 'gemini',
    name: 'Gemini CLI',
    projectPath: '.gemini/settings.json',
    globalPath: '.gemini/settings.json',
    toolEvent: 'BeforeTool',
    mergeStrategy: 'merge-hooks',
  },
  {
    id: 'copilot',
    name: 'GitHub Copilot',
    projectPath: '.github/hooks/lek-optimize.json',
    toolEvent: 'preToolUse',
    mergeStrategy: 'replace',
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    projectPath: '.windsurf/hooks.json',
    toolEvent: 'pre_tool_use',
    mergeStrategy: 'replace',
  },
  {
    id: 'antigravity',
    name: 'Antigravity',
    projectPath: '.agents/hooks.json',
    toolEvent: 'PreToolUse',
    mergeStrategy: 'merge-named-hooks',
  },
]

export function getAgentHookSpec(id: AgentHookId): AgentHookSpec {
  const spec = AGENT_HOOK_SPECS.find((entry) => entry.id === id)
  if (!spec) throw new Error(`Unknown agent hook id: ${id}`)
  return spec
}

export function resolveAgentHookPath(spec: AgentHookSpec, global: boolean): string | undefined {
  return global ? spec.globalPath : spec.projectPath
}

export function isAgentHookId(id: AgentId): id is AgentHookId {
  return (AGENT_HOOK_IDS as readonly string[]).includes(id)
}
