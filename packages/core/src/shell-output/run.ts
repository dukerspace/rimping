import type { ShellCompressOptions, ShellCompressResult } from '../shell-output/index.js'
import { compressShellOutput } from '../shell-output/index.js'
import { mergeHooksConfig, mergeShellConfig, resolveShellOptions } from '../resolve-options.js'
import { loadConfig } from '../config.js'
import type { RimpingConfig, ShellConfig } from '../config.js'
import { findProjectRoot } from '../agent-skills-init.js'
import { appendHookLog, buildShellRunLogEntry } from '../hooks/log.js'

export interface ShellRunOptions extends ShellCompressOptions {
  cwd?: string
  config?: RimpingConfig | null
  shell?: Partial<ShellConfig>
}

export interface ShellRunResult extends ShellCompressResult {
  exitCode: number
  command: string
  optimized: boolean
  skipped?: 'disabled' | 'low-savings' | 'error'
}

async function maybeLogShellRun(options: {
  cwd: string
  config: RimpingConfig | null
  command: string
  exitCode: number
  result: Pick<ShellRunResult, 'optimized' | 'skipped' | 'originalTokens' | 'compressedTokens' | 'savingsPercent' | 'strategiesApplied'>
  error?: string
}): Promise<void> {
  const hooks = mergeHooksConfig(options.config)
  if (!hooks.logStats) return

  const entry = buildShellRunLogEntry({
    cwd: options.cwd,
    hooks,
    config: options.config,
    command: options.command,
    exitCode: options.exitCode,
    result: {
      optimized: options.result.optimized,
      skipped: options.result.skipped,
      stats:
        options.result.originalTokens > 0
          ? {
              originalTokens: options.result.originalTokens,
              compressedTokens: options.result.compressedTokens,
              savingsPercent: options.result.savingsPercent,
              strategiesApplied: options.result.strategiesApplied,
            }
          : undefined,
    },
    error: options.error,
  })

  await appendHookLog(options.cwd, entry)
}

export async function runShellCommand(
  command: string,
  options: ShellRunOptions = {},
): Promise<ShellRunResult> {
  const cwd = options.cwd ?? findProjectRoot(process.cwd())
  const config = options.config !== undefined ? options.config : await loadConfig(cwd)
  const shell = { ...mergeShellConfig(config), ...options.shell }
  const resolved = resolveShellOptions(cwd, config, options)

  const proc = Bun.spawn(['sh', '-c', command], {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
    env: process.env,
  })

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])

  const raw = [stdout, stderr].filter(Boolean).join(stdout && stderr ? '\n' : '')

  if (!shell.enabled) {
    const result: ShellRunResult = {
      text: raw,
      exitCode,
      command,
      optimized: false,
      skipped: 'disabled',
      strategiesApplied: [],
      originalTokens: 0,
      compressedTokens: 0,
      savingsPercent: 0,
    }
    await maybeLogShellRun({ cwd, config, command, exitCode, result })
    return result
  }

  try {
    const compressed = compressShellOutput(command, raw, {
      maxTokens: resolved.maxTokens,
    })

    if (compressed.savingsPercent < shell.minSavingsPercent) {
      const result: ShellRunResult = {
        ...compressed,
        text: raw,
        exitCode,
        command,
        optimized: false,
        skipped: 'low-savings',
        originalTokens: compressed.originalTokens,
        compressedTokens: compressed.originalTokens,
        savingsPercent: 0,
      }
      await maybeLogShellRun({ cwd, config, command, exitCode, result })
      return result
    }

    const result: ShellRunResult = {
      ...compressed,
      exitCode,
      command,
      optimized: true,
    }
    await maybeLogShellRun({ cwd, config, command, exitCode, result })
    return result
  } catch {
    const result: ShellRunResult = {
      text: raw,
      exitCode,
      command,
      optimized: false,
      skipped: 'error',
      strategiesApplied: [],
      originalTokens: 0,
      compressedTokens: 0,
      savingsPercent: 0,
    }
    await maybeLogShellRun({ cwd, config, command, exitCode, result, error: 'compression failed' })
    return result
  }
}
