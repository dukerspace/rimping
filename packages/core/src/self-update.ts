import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { CLI_VERSION } from './types.js'

export const NPM_PACKAGE_NAME = 'rimping'
export const NPM_REGISTRY = 'https://registry.npmjs.org'
export const GITHUB_OWNER = 'dukerspace'
export const GITHUB_REPO = 'rimping'
export const GITHUB_INSTALL_SPEC = `github:${GITHUB_OWNER}/${GITHUB_REPO}`
export const GITHUB_DEFAULT_BRANCH = 'main'

export type InstallSource = 'global' | 'local' | 'source'
export type UpdateChannel = 'npm' | 'github'

export interface VersionCheckResult {
  current: string
  latest: string | null
  updateAvailable: boolean
  channel: UpdateChannel
  currentRef?: string
  latestRef?: string
  error?: string
}

export interface SelfUpdateResult {
  success: boolean
  previousVersion: string
  newVersion?: string
  message: string
  installSource: InstallSource
  updateAvailable: boolean
  channel: UpdateChannel
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

export function findPackageRoot(executablePath: string): string | null {
  let dir = dirname(executablePath)

  for (let i = 0; i < 12; i++) {
    const packageJsonPath = join(dir, 'package.json')
    if (existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
          name?: string
        }
        if (pkg.name === NPM_PACKAGE_NAME || pkg.name === '@rimping/cli') {
          return dir
        }
      } catch {
        // ignore invalid package.json
      }
    }

    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }

  return null
}

export function readInstalledGitRef(packageRoot: string): string | null {
  const bunTagPath = join(packageRoot, '.bun-tag')
  if (!existsSync(bunTagPath)) return null

  try {
    const tag = readFileSync(bunTagPath, 'utf8').trim()
    const match = tag.match(/-([a-f0-9]{7,40})$/i)
    return match?.[1]?.slice(0, 7) ?? null
  } catch {
    return null
  }
}

export function parseCliVersionFromTypesSource(source: string): string | null {
  const match = source.match(
    /export const CLI_VERSION = ['"]([^'"]+)['"]/,
  )
  return match?.[1] ?? null
}

export function detectInstallSource(executablePath: string): InstallSource {
  const normalized = executablePath.replace(/\\/g, '/')

  if (normalized.includes('/node_modules/')) {
    if (
      normalized.includes('/.bun/install/global/') ||
      normalized.includes('/.npm-global/') ||
      /\/lib\/node_modules\/rimping\//.test(normalized)
    ) {
      return 'global'
    }
    return 'local'
  }

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

  return 'global'
}

export function detectUpdateChannel(
  executablePath: string,
  npmAvailable: boolean,
): UpdateChannel {
  const packageRoot = findPackageRoot(executablePath)
  if (packageRoot && readInstalledGitRef(packageRoot)) {
    return 'github'
  }

  return npmAvailable ? 'npm' : 'github'
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

export async function fetchLatestFromGitHub(
  owner = GITHUB_OWNER,
  repo = GITHUB_REPO,
  branch = GITHUB_DEFAULT_BRANCH,
): Promise<{ version: string; ref: string } | null> {
  const typesUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/packages/core/src/types.ts`
  const commitUrl = `https://api.github.com/repos/${owner}/${repo}/commits/${branch}`

  const [typesResponse, commitResponse] = await Promise.all([
    fetch(typesUrl, { signal: AbortSignal.timeout(10_000) }),
    fetch(commitUrl, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(10_000),
    }),
  ])

  if (!typesResponse.ok || !commitResponse.ok) {
    return null
  }

  const version = parseCliVersionFromTypesSource(await typesResponse.text())
  const commit = (await commitResponse.json()) as { sha?: string }
  if (!version || !commit.sha) {
    return null
  }

  return { version, ref: commit.sha.slice(0, 7) }
}

function isUpdateAvailable(
  currentVersion: string,
  latestVersion: string,
  currentRef?: string,
  latestRef?: string,
): boolean {
  const versionCmp = compareVersions(currentVersion, latestVersion)
  if (versionCmp < 0) return true
  if (versionCmp > 0) return false
  if (currentRef && latestRef && currentRef !== latestRef) return true
  return false
}

export async function checkForUpdate(options?: {
  currentVersion?: string
  executablePath?: string
}): Promise<VersionCheckResult> {
  const currentVersion = options?.currentVersion ?? CLI_VERSION
  const packageRoot = options?.executablePath
    ? findPackageRoot(options.executablePath)
    : null
  const currentRef = packageRoot ? readInstalledGitRef(packageRoot) ?? undefined : undefined

  let npmLatest: string | null = null
  let npmError: string | undefined

  try {
    npmLatest = await fetchLatestVersion()
  } catch (error) {
    npmError = error instanceof Error ? error.message : String(error)
  }

  const channel = detectUpdateChannel(
    options?.executablePath ?? '',
    npmLatest !== null,
  )

  if (channel === 'npm' && npmLatest) {
    return {
      current: currentVersion,
      latest: npmLatest,
      updateAvailable: isUpdateAvailable(currentVersion, npmLatest, currentRef),
      channel,
      currentRef,
    }
  }

  try {
    const githubLatest = await fetchLatestFromGitHub()
    if (!githubLatest) {
      return {
        current: currentVersion,
        latest: npmLatest,
        updateAvailable: false,
        channel: 'github',
        currentRef,
        error:
          npmError ??
          (npmLatest
            ? undefined
            : `Could not resolve latest version from GitHub (${GITHUB_INSTALL_SPEC})`),
      }
    }

    return {
      current: currentVersion,
      latest: githubLatest.version,
      latestRef: githubLatest.ref,
      updateAvailable: isUpdateAvailable(
        currentVersion,
        githubLatest.version,
        currentRef,
        githubLatest.ref,
      ),
      channel: 'github',
      currentRef,
    }
  } catch (error) {
    return {
      current: currentVersion,
      latest: npmLatest,
      updateAvailable: false,
      channel: 'github',
      currentRef,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

function updateSpecForChannel(channel: UpdateChannel): string {
  return channel === 'github'
    ? GITHUB_INSTALL_SPEC
    : `${NPM_PACKAGE_NAME}@latest`
}

function updateCommandForSource(
  source: InstallSource,
  channel: UpdateChannel,
): string {
  const spec = updateSpecForChannel(channel)
  switch (source) {
    case 'source':
      return 'git pull && bun install && bun run build'
    case 'local':
      return `bun update ${NPM_PACKAGE_NAME}`
    case 'global':
      return `bun install -g ${spec}`
  }
}

function updateSpawnArgs(
  source: InstallSource,
  channel: UpdateChannel,
): string[] {
  const spec = updateSpecForChannel(channel)
  if (source === 'local') {
    return ['bun', 'update', NPM_PACKAGE_NAME]
  }
  return ['bun', 'install', '-g', spec]
}

export async function runSelfUpdate(options: {
  executablePath: string
  dryRun?: boolean
}): Promise<SelfUpdateResult> {
  const installSource = detectInstallSource(options.executablePath)
  const check = await checkForUpdate({ executablePath: options.executablePath })

  if (installSource === 'source') {
    return {
      success: false,
      previousVersion: check.current,
      newVersion: check.latest ?? undefined,
      updateAvailable: check.updateAvailable,
      installSource,
      channel: check.channel,
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
      channel: check.channel,
      message: check.error ?? 'Could not determine latest version',
    }
  }

  if (!check.updateAvailable) {
    const refNote =
      check.currentRef && check.latestRef && check.currentRef === check.latestRef
        ? ` (${check.currentRef})`
        : ''
    return {
      success: true,
      previousVersion: check.current,
      newVersion: check.latest,
      updateAvailable: false,
      installSource,
      channel: check.channel,
      message: `Already on latest version (${check.current})${refNote}`,
    }
  }

  const command = updateSpawnArgs(installSource, check.channel)

  if (options.dryRun) {
    return {
      success: true,
      previousVersion: check.current,
      newVersion: check.latest,
      updateAvailable: true,
      installSource,
      channel: check.channel,
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
      channel: check.channel,
      message: `Update failed (exit ${exitCode}). Try manually: ${updateCommandForSource(installSource, check.channel)}`,
    }
  }

  const after = await checkForUpdate({ executablePath: options.executablePath })
  const installedVersion = after.latest ?? after.current
  const refNote =
    after.latestRef && after.latestRef !== check.currentRef
      ? ` (${check.currentRef ?? '?'} → ${after.latestRef})`
      : after.latestRef
        ? ` (${after.latestRef})`
        : ''

  return {
    success: true,
    previousVersion: check.current,
    newVersion: installedVersion,
    updateAvailable: false,
    installSource,
    channel: check.channel,
    message:
      check.current === installedVersion
        ? `Updated to latest ${installedVersion}${refNote}`
        : `Updated ${check.current} → ${installedVersion}${refNote}`,
  }
}
