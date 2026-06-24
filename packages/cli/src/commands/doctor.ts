import { defineCommand } from 'citty'
import { runDoctor, resolveInitCwd, type AgentProbeResult } from '@rimping/core'
import consola from 'consola'

export function formatAgentLine(agent: AgentProbeResult): string {
  const icon =
    agent.status === 'detected' ? '✓' : agent.status === 'unknown' ? '?' : '✗'
  const detail =
    agent.status === 'detected'
      ? agent.evidence.join(', ')
      : agent.status === 'unknown'
        ? (agent.notes ?? 'unknown')
        : 'not found'
  return `  ${icon} ${agent.name.padEnd(16)} ${detail}`
}

export const doctorCommand = defineCommand({
  meta: {
    description: 'Check AI agent setup and rimping project health',
  },
  args: {
    json: {
      type: 'boolean',
      description: 'Output result as JSON',
      default: false,
    },
    cwd: {
      type: 'string',
      description: 'Working directory (default: directory where rimping was invoked)',
    },
  },
  async run({ args }) {
    const cwd = resolveInitCwd(args.cwd)
    const result = await runDoctor(cwd)

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
      if (result.summary.issues.length > 0) process.exit(1)
      return
    }

    consola.log('')
    consola.log('Rimping Doctor')
    consola.log('')
    consola.log('AI Agents')
    for (const agent of result.agents) {
      consola.log(formatAgentLine(agent))
    }

    consola.log('')
    consola.log('Project')

    if (result.config.found && result.config.valid) {
      consola.log(`  ✓ .rimping/config.json`)
    } else if (result.config.found && result.config.valid === false) {
      consola.log(`  ✗ .rimping/config.json — ${result.config.error}`)
    } else {
      consola.log(`  ✗ .rimping/config.json — missing (run: rimping init)`)
    }

    if (result.skills.projectSkills > 0) {
      consola.log(`  ✓ ${result.skills.projectSkills} agent skill(s) in ./.agents/skills/`)
    } else {
      consola.log(`  · No agent skills in ./.agents/skills/`)
    }

    if (result.skills.agentSkillInstalled) {
      consola.log(`  ✓ rimping-guidelines agent skill installed`)
    } else {
      consola.log(`  ✗ rimping-guidelines agent skill missing (run: rimping skills init)`)
    }

    if (result.hooks.hooksJson) {
      consola.log(`  ✓ .cursor/hooks.json`)
    } else {
      consola.log(`  · .cursor/hooks.json — not installed`)
    }

    if (result.hooks.beforeSubmitRegistered) {
      consola.log(`  ✓ beforeSubmitPrompt hook registered`)
    } else {
      consola.log(`  ✗ beforeSubmitPrompt hook missing (run: rimping hooks init)`)
    }

    if (result.hooks.preSend) {
      consola.log(`  ✓ pre-send hook configured (rimping hooks pre-send)`)
    }

    if (result.hooks.enabled) {
      consola.log(`  ✓ hooks.enabled in config`)
    }

    if (result.hooks.lastRun) {
      const lr = result.hooks.lastRun
      consola.log(
        `  · last run: ${lr.originalTokens}→${lr.optimizedTokens} tokens (-${lr.savingsPercent}%, ${lr.durationMs}ms)`,
      )
    }

    if (result.hooks.logStats) {
      consola.log(`  ✓ hooks.logStats enabled (run: rimping hooks log)`)
    }

    consola.log('')
    consola.log(
      `${result.summary.detectedCount} agent(s) detected` +
        (result.summary.issues.length > 0
          ? `, ${result.summary.issues.length} issue(s)`
          : ''),
    )
    consola.log('')

    if (result.summary.issues.length > 0) {
      process.exit(1)
    }
  },
})
