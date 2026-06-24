import { defineCommand } from 'citty'
import {
  checkForUpdate,
  CLI_VERSION,
  detectInstallSource,
  runSelfUpdate,
} from '@rimping/core'
import consola from 'consola'
import { fileURLToPath } from 'node:url'

export const updateCommand = defineCommand({
  meta: {
    description:
      'Check for updates and install the latest rimping CLI from npm (use --check to only compare versions)',
  },
  args: {
    check: {
      type: 'boolean',
      alias: 'c',
      description: 'Only check whether a newer version is available',
      default: false,
    },
    dryRun: {
      type: 'boolean',
      description: 'Show the update command without running it',
      default: false,
    },
    json: {
      type: 'boolean',
      description: 'Output result as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const executablePath = process.argv[1] ?? fileURLToPath(import.meta.url)
    const installSource = detectInstallSource(executablePath)
    const versionCheck = await checkForUpdate()

    if (args.check) {
      const payload = {
        current: versionCheck.current,
        latest: versionCheck.latest,
        updateAvailable: versionCheck.updateAvailable,
        installSource,
        error: versionCheck.error,
      }

      if (args.json) {
        console.log(JSON.stringify(payload, null, 2))
        return
      }

      consola.log('')
      consola.log(`rimping ${CLI_VERSION}`)
      consola.log(`Install:  ${installSource}`)
      if (versionCheck.latest) {
        consola.log(`Latest:   ${versionCheck.latest}`)
      }
      if (versionCheck.updateAvailable) {
        consola.log('')
        consola.info(`Update available: ${versionCheck.current} → ${versionCheck.latest}`)
        consola.log('Run `rimping update` to install the latest version.')
      } else if (versionCheck.error) {
        consola.log('')
        consola.warn(versionCheck.error)
      } else {
        consola.log('')
        consola.success('You are on the latest version.')
      }
      consola.log('')
      return
    }

    const result = await runSelfUpdate({
      executablePath,
      dryRun: args.dryRun,
    })

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
      if (!result.success) process.exit(1)
      return
    }

    consola.log('')
    consola.log('Rimping Update')
    consola.log('')
    consola.log(`  Current:  ${result.previousVersion}`)
    if (result.newVersion) consola.log(`  Latest:   ${result.newVersion}`)
    consola.log(`  Install:  ${result.installSource}`)
    consola.log('')

    if (result.success) {
      consola.success(result.message)
    } else {
      consola.warn(result.message)
      process.exit(1)
    }

    consola.log('')
  },
})
