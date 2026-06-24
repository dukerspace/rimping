import type { ProviderName } from '../types.js'
import type { AgentId } from '../config.js'
import { getAgentName, POPULAR_AI_AGENT_IDS } from '../agent-detect.js'

export type HookAgentId = AgentId | 'unknown'

export interface HookAgentInfo {
  id: HookAgentId
  name: string
  model?: string
  version?: string
}

interface AgentHookSignature {
  id: AgentId
  keys: string[]
}

const HOOK_SIGNATURES: AgentHookSignature[] = [
  { id: 'cursor', keys: ['cursor_version', 'composer_mode', 'transcript_path'] },
  { id: 'claude', keys: ['claude_session_id', 'claude_code_session', 'anthropic_version'] },
  { id: 'copilot', keys: ['copilot_session', 'github_copilot', 'copilot_version'] },
  { id: 'gemini', keys: ['gemini_session', 'gemini_version'] },
  { id: 'chatgpt', keys: ['chatgpt_session', 'openai_session'] },
  { id: 'windsurf', keys: ['windsurf_version', 'codeium_session'] },
  { id: 'codex', keys: ['codex_session'] },
  { id: 'continue', keys: ['continue_session'] },
  { id: 'cline', keys: ['cline_session'] },
  { id: 'aider', keys: ['aider_session'] },
  { id: 'antigravity', keys: ['antigravity_version'] },
]

const VERSION_KEYS: Partial<Record<AgentId, string>> = {
  cursor: 'cursor_version',
  claude: 'anthropic_version',
  copilot: 'copilot_version',
  gemini: 'gemini_version',
  windsurf: 'windsurf_version',
  antigravity: 'antigravity_version',
}

function readString(input: Record<string, unknown>, key: string): string | undefined {
  const value = input[key]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function matchHookSignature(input: Record<string, unknown>): AgentId | undefined {
  for (const signature of HOOK_SIGNATURES) {
    if (signature.keys.some((key) => key in input)) {
      return signature.id
    }
  }

  const eventName = readString(input, 'hook_event_name')?.toLowerCase()
  if (eventName?.includes('cursor')) return 'cursor'
  if (eventName?.includes('claude')) return 'claude'
  if (eventName?.includes('copilot')) return 'copilot'
  if (eventName?.includes('gemini')) return 'gemini'
  if (eventName?.includes('chatgpt')) return 'chatgpt'

  return undefined
}

const AGENT_PROVIDERS: Partial<Record<AgentId, ProviderName>> = {
  claude: 'claude',
  codex: 'openai',
  chatgpt: 'openai',
  gemini: 'gemini',
  copilot: 'copilot',
}

/** Map a detected agent to an LLM provider adapter (CLI only — hooks use plain text). */
export function inferProviderFromAgent(agentId: AgentId): ProviderName | undefined {
  return AGENT_PROVIDERS[agentId]
}

export function inferHookAgent(input: Record<string, unknown> = {}): HookAgentInfo {
  const matched = matchHookSignature(input)

  if (!matched) {
    return { id: 'unknown', name: 'Unknown' }
  }

  const versionKey = VERSION_KEYS[matched]
  const model = readString(input, 'model') ?? readString(input, 'model_id')

  return {
    id: matched,
    name: getAgentName(matched),
    model,
    version: versionKey ? readString(input, versionKey) : undefined,
  }
}

export function isPopularAiAgent(id: HookAgentId): boolean {
  return id !== 'unknown' && (POPULAR_AI_AGENT_IDS as readonly string[]).includes(id)
}
