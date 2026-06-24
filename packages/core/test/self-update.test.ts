import { describe, expect, it } from 'bun:test'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  compareVersions,
  detectInstallSource,
  detectUpdateChannel,
  findPackageRoot,
  GITHUB_INSTALL_SPEC,
  NPM_PACKAGE_NAME,
  parseCliVersionFromTypesSource,
  readInstalledGitRef,
} from '../src/self-update.js'

describe('compareVersions', () => {
  it('orders semver releases', () => {
    expect(compareVersions('0.1.0', '0.2.0')).toBe(-1)
    expect(compareVersions('0.2.0', '0.1.0')).toBe(1)
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0)
  })

  it('orders patch releases', () => {
    expect(compareVersions('0.1.0', '0.1.1')).toBe(-1)
    expect(compareVersions('0.1.1', '0.1.0')).toBe(1)
  })
})

describe('parseCliVersionFromTypesSource', () => {
  it('reads CLI_VERSION from types.ts source', () => {
    const source = `export const CLI_NAME = 'rimping'\nexport const CLI_VERSION = '0.2.0'\n`
    expect(parseCliVersionFromTypesSource(source)).toBe('0.2.0')
  })
})

describe('detectInstallSource', () => {
  it('detects monorepo source installs', () => {
    expect(
      detectInstallSource('/Users/dev/rimping/packages/cli/src/index.ts'),
    ).toBe('source')
    expect(
      detectInstallSource('/app/node_modules/@rimping/cli/dist/index.js'),
    ).toBe('local')
  })

  it('detects github global installs inside packages/cli', () => {
    expect(
      detectInstallSource(
        '/Users/dev/.bun/install/global/node_modules/rimping/packages/cli/src/index.ts',
      ),
    ).toBe('global')
  })

  it('detects global installs', () => {
    expect(
      detectInstallSource('/Users/dev/.bun/install/global/node_modules/rimping/dist/index.js'),
    ).toBe('global')
  })

  it('detects local project installs', () => {
    expect(
      detectInstallSource('/project/node_modules/rimping/dist/index.js'),
    ).toBe('local')
  })
})

describe('findPackageRoot and readInstalledGitRef', () => {
  it('finds the rimping package root from an executable path', () => {
    const tempDir = join(tmpdir(), `rimping-root-${Date.now()}-${Math.random()}`)
    const packageRoot = join(tempDir, 'node_modules', 'rimping')
    mkdirSync(join(packageRoot, 'packages', 'cli', 'dist'), { recursive: true })
    writeFileSync(
      join(packageRoot, 'package.json'),
      JSON.stringify({ name: 'rimping' }),
    )
    writeFileSync(join(packageRoot, '.bun-tag'), 'dukerspace-rimping-091cc38\n')
    const executable = join(packageRoot, 'packages', 'cli', 'dist', 'index.js')
    writeFileSync(executable, '')

    expect(findPackageRoot(executable)).toBe(packageRoot)
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('reads the short git ref from .bun-tag', () => {
    const tempDir = join(tmpdir(), `rimping-ref-${Date.now()}-${Math.random()}`)
    const packageRoot = join(tempDir, 'node_modules', 'rimping')
    mkdirSync(packageRoot, { recursive: true })
    writeFileSync(join(packageRoot, '.bun-tag'), 'dukerspace-rimping-091cc38\n')

    expect(readInstalledGitRef(packageRoot)).toBe('091cc38')
    rmSync(tempDir, { recursive: true, force: true })
  })
})

describe('detectUpdateChannel', () => {
  it('prefers github when npm is unavailable', () => {
    expect(detectUpdateChannel('/usr/bin/rimping', false)).toBe('github')
  })

  it('prefers npm when available and not a github install', () => {
    expect(detectUpdateChannel('/usr/bin/rimping', true)).toBe('npm')
  })

  it('uses github for bun github installs', () => {
    const tempDir = join(tmpdir(), `rimping-channel-${Date.now()}-${Math.random()}`)
    const packageRoot = join(tempDir, 'node_modules', 'rimping')
    mkdirSync(join(packageRoot, 'dist'), { recursive: true })
    writeFileSync(
      join(packageRoot, 'package.json'),
      JSON.stringify({ name: 'rimping' }),
    )
    writeFileSync(join(packageRoot, '.bun-tag'), 'dukerspace-rimping-deadbeef\n')
    writeFileSync(join(packageRoot, 'dist', 'index.js'), '')

    expect(
      detectUpdateChannel(join(packageRoot, 'dist', 'index.js'), true),
    ).toBe('github')

    rmSync(tempDir, { recursive: true, force: true })
  })
})

describe('install constants', () => {
  it('matches the published CLI package name', () => {
    expect(NPM_PACKAGE_NAME).toBe('rimping')
  })

  it('uses the GitHub install spec', () => {
    expect(GITHUB_INSTALL_SPEC).toBe('github:dukerspace/rimping')
  })
})
