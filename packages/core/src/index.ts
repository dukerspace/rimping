export { CLI_NAME } from './types.js'
export { CLI_VERSION } from './version.js'
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
export { getCacheStats, getCacheStatsByDate, getCacheDir, getCacheDirSize } from './cache.js'
export type { CacheStats, DailyCacheStats } from './cache.js'
export { getAdapter, OpenAIAdapter, ClaudeAdapter, GeminiAdapter, MockAdapter } from './adapters/index.js'
export { defaultMemoryStore, MockMemoryStore } from './memory/mock-store.js'
export { enrichGitDiff } from './git-diff/index.js'
export { compressShellOutput, compressGeneric, compressGitStatus, compressTestOutput, compressRgGrep, isCompressibleShellCommand, resolveShellFilter } from './shell-output/index.js'
export type { ShellCompressOptions, ShellCompressResult } from './shell-output/index.js'
export { initAgentSkills, findProjectRoot, findGitRoot, resolveInitCwd } from './agent-skills-init.js'
export type { AgentSkillsInitOptions, AgentSkillsInitResult } from './agent-skills-init.js'
export { initAgentHooks, initCursorHooks, checkCursorHooks } from './hooks-init.js'
export type { HooksInitOptions, HooksInitResult } from './hooks-init.js'
export {
  AGENT_HOOK_IDS,
  AGENT_HOOK_SPECS,
  getAgentHookSpec,
  resolveAgentHookPath,
  isAgentHookId,
} from './agent-hook-specs.js'
export type { AgentHookId, AgentHookSpec, AgentHookMergeStrategy } from './agent-hook-specs.js'
export {
  CONFIG_DIR,
  CONFIG_FILE,
  getConfigPath,
  getGlobalConfigPath,
  GLOBAL_CONFIG_DIR,
  readConfigFile,
  loadProjectConfig,
  loadConfig,
  mergeConfigs,
  defaultConfig,
  validateConfig,
} from './config.js'
export type { RimpingConfig, AgentId, AgentConfig, HooksConfig, ShellConfig, ReadConfig } from './config.js'
export {
  initConfig,
  buildInitConfig,
  buildAgentsConfig,
  buildDetectedAgentsConfig,
  buildAgentHooksConfig,
  mergeAgentsConfig,
  mergeAgentsConfigAdditive,
  mergeInitConfig,
  mergeInitConfigAdditive,
  resolveInitTarget,
  formatConfigStatus,
  formatAgentHooksStatus,
  formatAgentHookStatusLine,
  formatHooksBrief,
} from './config-init.js'
export type { ConfigInitOptions, ConfigInitResult } from './config-init.js'
export {
  mergeHooksConfig,
  mergeShellConfig,
  mergeReadConfig,
  resolveOptimizeOptions,
  resolveOptimizeCwd,
  resolveShellOptions,
  resolveReadOptions,
  DEFAULT_HOOKS,
  DEFAULT_SHELL,
  DEFAULT_READ,
} from './resolve-options.js'
export { runShellCommand } from './shell-output/run.js'
export type { ShellRunOptions, ShellRunResult } from './shell-output/run.js'
export {
  compressReadContent,
  extractReadPath,
  extractReadLimit,
  extractReadContent,
  resolvePreRead,
  resolvePostRead,
} from './file-read/index.js'
export type {
  ReadCompressOptions,
  ReadCompressResult,
  PreReadInput,
  PreReadResult,
  PostReadInput,
  PostReadResult,
  PostReadSkipReason,
} from './file-read/index.js'
export { preSend } from './hooks/pre-send.js'
export type { PreSendResult, PreSendSkipReason, PreSendOptions } from './hooks/pre-send.js'
export {
  HOOKS_LOG_FILE,
  getHooksLogPath,
  previewPrompt,
  buildHookLogEntry,
  buildShellRunLogEntry,
  buildPreReadLogEntry,
  buildPostReadLogEntry,
  appendHookLog,
  readHookLogs,
  clearHookLogs,
  formatHookLogSummary,
  aggregateHookStatsByDate,
  aggregateHookStatsByDateAndEvent,
  countHookEventsByType,
  getEntryTokenStats,
} from './hooks/log.js'
export type {
  HookLogEntry,
  HookLogInput,
  HookLogResult,
  DailyHookStats,
  DailyHookStatsByEvent,
  HookLogEvent,
  TokenHookStats,
  PreSendHookLogEntry,
  ShellRunHookLogEntry,
  PreReadHookLogEntry,
  PostReadHookLogEntry,
} from './hooks/log.js'
export { inferHookAgent, inferProviderFromAgent, isPopularAiAgent } from './hooks/agent.js'
export type { HookAgentId, HookAgentInfo } from './hooks/agent.js'
export {
  detectAgents,
  runDoctor,
  getDetectedAgentIds,
  getAgentName,
  KNOWN_AGENT_IDS,
  POPULAR_AI_AGENT_IDS,
  POPULAR_AI_AGENTS,
} from './agent-detect.js'
export type { AgentStatus, AgentProbeResult, DoctorResult } from './agent-detect.js'
export {
  NPM_PACKAGE_NAME,
  NPM_REGISTRY,
  GITHUB_OWNER,
  GITHUB_REPO,
  GITHUB_INSTALL_SPEC,
  compareVersions,
  detectInstallSource,
  detectUpdateChannel,
  fetchLatestVersion,
  fetchLatestFromGitHub,
  findPackageRoot,
  parseCliVersionFromPackageJson,
  readInstalledGitRef,
  checkForUpdate,
  runSelfUpdate,
} from './self-update.js'
export type {
  InstallSource,
  UpdateChannel,
  VersionCheckResult,
  SelfUpdateResult,
} from './self-update.js'
