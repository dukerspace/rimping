import { defineCommand } from 'citty'
import {
  loadConfig,
  resolveOptimizeCwd,
  resolveShellOptions,
  runShellCommand,
  mergeShellConfig,
  compressShellOutput,
} from '@rimping/core'
import consola from 'consola'

export const shellRunCommand = defineCommand({
  meta: {
    description: 'Run a shell command and print compressed output',
  },
  args: {
    command: {
      type: 'positional',
      description: 'Shell command to run',
      required: true,
    },
    json: {
      type: 'boolean',
      description: 'Output JSON result',
      default: false,
    },
    explain: {
      type: 'boolean',
      description: 'Print compression stats to stderr',
      default: false,
    },
    maxTokens: {
      type: 'string',
      description: 'Maximum token budget for compressed output',
    },
    cwd: {
      type: 'string',
      description: 'Working directory',
    },
    stdin: {
      type: 'boolean',
      description: 'Read raw output from stdin instead of running command',
      default: false,
    },
  },
  async run({ args }) {
    const command = String(args.command)
    const cwd = resolveOptimizeCwd(args.cwd)
    const config = await loadConfig(cwd)
    const maxTokens = args.maxTokens ? Number(args.maxTokens) : undefined
    const shellOpts = resolveShellOptions(cwd, config, {
      maxTokens: maxTokens && !Number.isNaN(maxTokens) ? maxTokens : undefined,
    })

    if (args.stdin) {
      const raw = await Bun.stdin.text()
      const result = compressShellOutput(command, raw, shellOpts)
      if (args.json) {
        console.log(JSON.stringify(result, null, 2))
      } else {
        console.log(result.text)
      }
      if (args.explain) {
        consola.info(
          `${result.originalTokens}→${result.compressedTokens} (-${result.savingsPercent}%) [${result.strategiesApplied.join(', ')}]`,
        )
      }
      return
    }

    const result = await runShellCommand(command, {
      cwd,
      config,
      ...shellOpts,
    })

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      process.stdout.write(result.text)
      if (result.text && !result.text.endsWith('\n')) process.stdout.write('\n')
    }

    if (args.explain) {
      const shell = mergeShellConfig(config)
      if (result.skipped) {
        consola.info(`[rimping] shell skipped: ${result.skipped}`)
      } else {
        consola.info(
          `[rimping] ${result.originalTokens}→${result.compressedTokens} (-${result.savingsPercent}%) exit=${result.exitCode}`,
        )
      }
      if (!shell.enabled) consola.warn('shell.enabled is false in config')
    }

    process.exit(result.exitCode)
  },
})

export const shellCommand = defineCommand({
  meta: {
    description: 'Shell output compression commands',
  },
  subCommands: {
    run: shellRunCommand,
  },
})
