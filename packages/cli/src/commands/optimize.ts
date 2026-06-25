import { defineCommand } from 'citty'
import {
  optimize,
  loadConfig,
  resolveOptimizeOptions,
  resolveOptimizeCwd,
  type ProviderName,
} from '@rimping/core'
import consola from 'consola'
import { dimText, highlight, label, muted, section, title } from '../style.js'

export const optimizeCommand = defineCommand({
  meta: {
    description: 'Optimize a prompt for token efficiency',
  },
  args: {
    prompt: {
      type: 'positional',
      description: 'Prompt text to optimize',
      required: false,
    },
    diff: {
      type: 'boolean',
      description: 'Include git diff context',
    },
    skills: {
      type: 'string',
      description: 'Comma-separated skill IDs',
    },
    maxTokens: {
      type: 'string',
      description: 'Maximum token budget',
    },
    provider: {
      type: 'string',
      description: 'Provider adapter (openai, claude, gemini, copilot, mock)',
    },
    stdin: {
      type: 'boolean',
      description: 'Read prompt from stdin',
      default: false,
    },
    json: {
      type: 'boolean',
      description: 'Output JSON result',
      default: false,
    },
    'no-cache': {
      type: 'boolean',
      description: 'Bypass cache',
      default: false,
    },
    explain: {
      type: 'boolean',
      description: 'Print explain steps to stderr',
      default: false,
    },
    cwd: {
      type: 'string',
      description: 'Working directory (default: project root)',
    },
  },
  async run({ args }) {
    let prompt = typeof args.prompt === 'string' ? args.prompt : ''

    if (args.stdin) {
      prompt = await Bun.stdin.text()
    }

    if (!prompt.trim()) {
      consola.error('No prompt provided. Pass as argument or use --stdin')
      process.exit(1)
    }

    const cwd = resolveOptimizeCwd(args.cwd)
    const config = await loadConfig(cwd)
    const skills = args.skills ? String(args.skills).split(',').map((s) => s.trim()) : undefined
    const maxTokens = args.maxTokens ? Number(args.maxTokens) : undefined
    const provider = args.provider as ProviderName | undefined

    const resolved = resolveOptimizeOptions(cwd, config, {
      prompt: prompt.trim(),
      skills,
      diff: args.diff,
      maxTokens: maxTokens && !Number.isNaN(maxTokens) ? maxTokens : undefined,
      provider,
      useCache: !args['no-cache'],
      cwd,
    })

    const result = await optimize(resolved)

    if (args.explain) {
      consola.log(title('Pipeline Explain'))
      for (const [i, step] of result.explain.entries()) {
        const saved = step.tokensBefore - step.tokensAfter
        consola.log(
          `${highlight(String(i + 1))}. ${section(`${step.stage}${step.strategy ? ` → ${step.strategy}` : ''}`)}`,
        )
        consola.log(
          dimText(
            `   ${step.tokensBefore} → ${step.tokensAfter} (${saved >= 0 ? '-' : '+'}${Math.abs(saved)} tokens)${step.detail ? ` — ${step.detail}` : ''}`,
          ),
        )
      }
      consola.log('')
      consola.log(
        label(
          'Total:',
          `${result.stats.originalTokens} → ${result.stats.optimizedTokens} tokens (${result.stats.savingsPercent}% saved, ${result.stats.durationMs}ms)`,
        ),
      )
    }

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(result.optimized)
      if (!args.explain) {
        consola.log(
          muted(
            `Saved ${result.stats.savingsPercent}% tokens (${result.stats.originalTokens} → ${result.stats.optimizedTokens}, ${result.stats.durationMs}ms)`,
          ),
        )
      }
    }
  },
})
