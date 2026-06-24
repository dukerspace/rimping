export { CLI_NAME, CLI_VERSION } from './types.js'
export type {
  Skill,
  ExplainStep,
  BudgetGuard,
  OptimizationStats,
  OptimizeOptions,
  OptimizeResult,
  LLMProvider,
  MemoryEntry,
  MemoryStore,
  ProviderName,
} from './types.js'

export { estimateTokens, tokenSavingsPercent } from './tokenizer.js'
export { loadSkills, selectSkills, composeSkills, autoDetectSkills, clearSkillCache } from './skill-engine.js'
export { buildContext } from './context-builder.js'
export { optimizeText, strategies, truncateTail } from './optimizer.js'
export { applyBudget } from './budget-planner.js'
export { optimize, getLastResult, loadLastResult, setLastResult } from './pipeline.js'
export { getCacheStats, getCacheDir, getCacheDirSize } from './cache.js'
export { getAdapter, OpenAIAdapter, ClaudeAdapter, GeminiAdapter, MockAdapter } from './adapters/index.js'
export { defaultMemoryStore, MockMemoryStore } from './memory/mock-store.js'
export { enrichGitDiff } from './git-diff/index.js'
export { initAgentSkills, findProjectRoot, findGitRoot, resolveInitCwd } from './agent-skills-init.js'
export type { AgentSkillsInitOptions, AgentSkillsInitResult } from './agent-skills-init.js'
export { initCursorHooks, checkCursorHooks } from './hooks-init.js'
export type { HooksInitOptions, HooksInitResult } from './hooks-init.js'
export {
  CONFIG_DIR,
  CONFIG_FILE,
  getConfigPath,
  loadConfig,
  defaultConfig,
  validateConfig,
} from './config.js'
export type { RimpingConfig, AgentId, AgentConfig, HooksConfig } from './config.js'
export { initConfig, buildInitConfig, buildAgentsConfig } from './config-init.js'
export type { ConfigInitOptions, ConfigInitResult } from './config-init.js'
export {
  mergeHooksConfig,
  resolveOptimizeOptions,
  resolveOptimizeCwd,
  DEFAULT_HOOKS,
} from './resolve-options.js'
export { preSend } from './hooks/pre-send.js'
export type { PreSendResult, PreSendSkipReason, PreSendOptions } from './hooks/pre-send.js'
export {
  HOOKS_LOG_FILE,
  getHooksLogPath,
  previewPrompt,
  buildHookLogEntry,
  appendHookLog,
  readHookLogs,
  clearHookLogs,
  formatHookLogSummary,
} from './hooks/log.js'
export type { HookLogEntry, HookLogInput, HookLogResult } from './hooks/log.js'
export { detectAgents, runDoctor, getDetectedAgentIds, KNOWN_AGENT_IDS } from './agent-detect.js'
export type { AgentStatus, AgentProbeResult, DoctorResult } from './agent-detect.js'
export {
  NPM_PACKAGE_NAME,
  NPM_REGISTRY,
  compareVersions,
  detectInstallSource,
  fetchLatestVersion,
  checkForUpdate,
  runSelfUpdate,
} from './self-update.js'
export type {
  InstallSource,
  VersionCheckResult,
  SelfUpdateResult,
} from './self-update.js'
