import { CLI_VERSION } from './types.js'

export const NPM_PACKAGE_NAME = 'rimping'
export const NPM_REGISTRY = 'https://registry.npmjs.org'

export type InstallSource = 'global' | 'local' | 'source'

export interface VersionCheckResult {
  current: string
  latest: string | null
  updateAvailable: boolean
  error?: string
}

export interface SelfUpdateResult {
  success: boolean
  previousVersion: string
  newVersion?: string
  message: string
  installSource: InstallSource
  updateAvailable: boolean
}

export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const parse = (version: string) =>
    version
      .replace(/^v/, '')
      .split(/[.-]/)
      .map((part) => {
        const n = Number(part)
        return Number.isFinite(n) ? n : part
      })

  const left = parse(a)
  const right = parse(b)
  const len = Math.max(left.length, right.length)

  for (let i = 0; i < len; i++) {
    const l = left[i] ?? 0
    const r = right[i] ?? 0
    if (l === r) continue
    if (typeof l === 'number' && typeof r === 'number') {
      return l < r ? -1 : 1
    }
    return String(l) < String(r) ? -1 : 1
  }

  return 0
}

export function detectInstallSource(executablePath: string): InstallSource {
  const normalized = executablePath.replace(/\\/g, '/')

  if (
    normalized.includes('/packages/cli/') ||
    normalized.includes('/@rimping/cli/')
  ) {
    return 'source'
  }

  if (
    normalized.includes('/.bun/install/global/') ||
    normalized.includes('/.npm-global/') ||
    /\/lib\/node_modules\/rimping\//.test(normalized)
  ) {
    return 'global'
  }

  if (normalized.includes('/node_modules/')) {
    return 'local'
  }

  return 'global'
}

export async function fetchLatestVersion(
  packageName = NPM_PACKAGE_NAME,
  registry = NPM_REGISTRY,
): Promise<string | null> {
  const url = `${registry}/${packageName}/latest`
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`Registry returned ${response.status} for ${packageName}`)
  }

  const data = (await response.json()) as { version?: string }
  return data.version ?? null
}

export async function checkForUpdate(
  currentVersion = CLI_VERSION,
): Promise<VersionCheckResult> {
  try {
    const latest = await fetchLatestVersion()
    if (!latest) {
      return {
        current: currentVersion,
        latest: null,
        updateAvailable: false,
        error: `${NPM_PACKAGE_NAME} is not published on npm yet`,
      }
    }

    return {
      current: currentVersion,
      latest,
      updateAvailable: compareVersions(currentVersion, latest) < 0,
    }
  } catch (error) {
    return {
      current: currentVersion,
      latest: null,
      updateAvailable: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

function updateCommandForSource(source: InstallSource): string {
  switch (source) {
    case 'source':
      return 'git pull && bun install && bun run build'
    case 'local':
      return `bun update ${NPM_PACKAGE_NAME}`
    case 'global':
      return `bun install -g ${NPM_PACKAGE_NAME}@latest`
  }
}

export async function runSelfUpdate(options: {
  executablePath: string
  dryRun?: boolean
}): Promise<SelfUpdateResult> {
  const installSource = detectInstallSource(options.executablePath)
  const check = await checkForUpdate()

  if (installSource === 'source') {
    return {
      success: false,
      previousVersion: check.current,
      newVersion: check.latest ?? undefined,
      updateAvailable: check.updateAvailable,
      installSource,
      message:
        'Running from source. Update with: git pull && bun install && bun run build',
    }
  }

  if (!check.latest) {
    return {
      success: false,
      previousVersion: check.current,
      updateAvailable: false,
      installSource,
      message: check.error ?? 'Could not determine latest version',
    }
  }

  if (!check.updateAvailable) {
    return {
      success: true,
      previousVersion: check.current,
      newVersion: check.latest,
      updateAvailable: false,
      installSource,
      message: `Already on latest version (${check.current})`,
    }
  }

  const command =
    installSource === 'local'
      ? ['bun', 'update', NPM_PACKAGE_NAME]
      : ['bun', 'install', '-g', `${NPM_PACKAGE_NAME}@latest`]

  if (options.dryRun) {
    return {
      success: true,
      previousVersion: check.current,
      newVersion: check.latest,
      updateAvailable: true,
      installSource,
      message: `Would run: ${command.join(' ')}`,
    }
  }

  const proc = Bun.spawn(command, {
    stdout: 'inherit',
    stderr: 'inherit',
    stdin: 'inherit',
  })
  const exitCode = await proc.exited

  if (exitCode !== 0) {
    return {
      success: false,
      previousVersion: check.current,
      newVersion: check.latest,
      updateAvailable: true,
      installSource,
      message: `Update failed (exit ${exitCode}). Try manually: ${updateCommandForSource(installSource)}`,
    }
  }

  const after = await checkForUpdate()
  const installedVersion =
    after.updateAvailable && after.latest ? after.latest : after.current

  return {
    success: true,
    previousVersion: check.current,
    newVersion: installedVersion,
    updateAvailable: false,
    installSource,
    message: `Updated ${check.current} → ${installedVersion}`,
  }
}
