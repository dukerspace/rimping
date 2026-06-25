import { defineCommand } from 'citty'
import {
  checkForUpdate,
  CLI_VERSION,
  detectInstallSource,
  runSelfUpdate,
} from '@rimping/core'
import consola from 'consola'
import { label, title } from '../style.js'
import { fileURLToPath } from 'node:url'

export const updateCommand = defineCommand({
  meta: {
    description:
      'Check for updates and install the latest rimping CLI from GitHub or npm (use --check to only compare versions)',
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
    const versionCheck = await checkForUpdate({ executablePath })

    if (args.check) {
      const payload = {
        current: versionCheck.current,
        latest: versionCheck.latest,
        updateAvailable: versionCheck.updateAvailable,
        channel: versionCheck.channel,
        currentRef: versionCheck.currentRef,
        latestRef: versionCheck.latestRef,
        installSource,
        error: versionCheck.error,
      }

      if (args.json) {
        console.log(JSON.stringify(payload, null, 2))
        return
      }

      consola.log('')
      consola.log(title(`rimping ${CLI_VERSION}`))
      consola.log(label('Install:', String(installSource)))
      consola.log(label('Channel:', versionCheck.channel))
      if (versionCheck.latest) {
        consola.log(label('Latest:', versionCheck.latest))
      }
      if (versionCheck.latestRef) {
        consola.log(label('Latest ref:', versionCheck.latestRef))
      }
      if (versionCheck.currentRef) {
        consola.log(label('Current ref:', versionCheck.currentRef))
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
    consola.log(title('Rimping Update'))
    consola.log('')
    consola.log(label('Current:', result.previousVersion))
    if (result.newVersion) consola.log(label('Latest:', result.newVersion))
    consola.log(label('Install:', String(result.installSource)))
    consola.log(label('Channel:', result.channel))
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
