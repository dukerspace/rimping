import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveAgentsPackSource } from '@rimping/core'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Resolve Leanstack templates for CLI install.
 * Prefer bundled `templates/leanstack`, else workspace `packages/leanstack/templates`.
 */
export function resolveLeanstackTemplatesRoot(): string {
  const bundled = join(__dirname, '..', 'templates', 'leanstack')
  const workspace = join(__dirname, '..', '..', 'leanstack', 'templates')
  const source = resolveAgentsPackSource(bundled, workspace)
  if (!source) {
    throw new Error(
      `Leanstack templates not found. Expected AGENTS.md under ${bundled} or ${workspace}`,
    )
  }
  return source
}
