import type { ExplainStep } from './types.js'
import { enrichGitDiff } from './git-diff/index.js'
import { defaultMemoryStore } from './memory/mock-store.js'
import { estimateTokens } from './tokenizer.js'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

export interface ContextBuilderOptions {
  prompt: string
  diff?: boolean
  diffMaxTokens?: number
  files?: string[]
  cwd?: string
}

export interface ContextBuilderResult {
  text: string
  explain: ExplainStep[]
}

const MAX_FILE_LINES = 200

async function readFileContext(files: string[], cwd: string): Promise<string> {
  const sections: string[] = []
  for (const file of files) {
    const path = join(cwd, file)
    if (!existsSync(path)) continue
    const content = await readFile(path, 'utf-8')
    const lines = content.split('\n')
    const truncated = lines.length > MAX_FILE_LINES
    const body = (truncated ? lines.slice(0, MAX_FILE_LINES) : lines).join('\n')
    sections.push(`### ${file}${truncated ? ' (truncated)' : ''}\n\`\`\`\n${body}\n\`\`\``)
  }
  return sections.join('\n\n')
}

export async function buildContext(options: ContextBuilderOptions): Promise<ContextBuilderResult> {
  const cwd = options.cwd ?? process.cwd()
  const explain: ExplainStep[] = []
  const parts: string[] = [options.prompt]
  let tokensBefore = estimateTokens(options.prompt)

  if (options.diff) {
    try {
      const enriched = await enrichGitDiff(cwd, { maxTokens: options.diffMaxTokens })
      if (enriched.text.trim()) {
        const section = `## Changes\n${enriched.text}`
        parts.push(section)
        const tokensAfter = estimateTokens(parts.join('\n\n'))
        explain.push({
          stage: 'context-builder',
          strategy: 'git-diff',
          tokensBefore,
          tokensAfter,
          detail: enriched.explain[0]?.detail ?? `Injected git diff`,
        })
        tokensBefore = tokensAfter
      }
    } catch (err) {
      explain.push({
        stage: 'context-builder',
        strategy: 'git-diff',
        tokensBefore,
        tokensAfter: tokensBefore,
        detail: `Git diff skipped: ${err instanceof Error ? err.message : 'unknown error'}`,
      })
    }
  }

  if (options.files?.length) {
    const fileContext = await readFileContext(options.files, cwd)
    if (fileContext) {
      parts.push(`## Files\n${fileContext}`)
      const tokensAfter = estimateTokens(parts.join('\n\n'))
      explain.push({
        stage: 'context-builder',
        strategy: 'file-injection',
        tokensBefore,
        tokensAfter,
        detail: `Injected ${options.files.length} file(s)`,
      })
      tokensBefore = tokensAfter
    }
  }

  const memories = await defaultMemoryStore.getRelevant(options.prompt)
  if (memories.length) {
    const memSection = memories.map((m) => `- ${m.content}`).join('\n')
    parts.push(`## Memory\n${memSection}`)
    const tokensAfter = estimateTokens(parts.join('\n\n'))
    explain.push({
      stage: 'context-builder',
      strategy: 'memory',
      tokensBefore,
      tokensAfter,
      detail: `Injected ${memories.length} memory entries`,
    })
  }

  return { text: parts.join('\n\n'), explain }
}
