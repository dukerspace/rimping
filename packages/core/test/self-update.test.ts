import { describe, expect, it } from 'bun:test'
import {
  compareVersions,
  detectInstallSource,
  NPM_PACKAGE_NAME,
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

describe('detectInstallSource', () => {
  it('detects monorepo source installs', () => {
    expect(
      detectInstallSource('/Users/dev/rimping/packages/cli/src/index.ts'),
    ).toBe('source')
    expect(
      detectInstallSource('/app/node_modules/@rimping/cli/dist/index.js'),
    ).toBe('source')
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

describe('NPM_PACKAGE_NAME', () => {
  it('matches the published CLI package name', () => {
    expect(NPM_PACKAGE_NAME).toBe('rimping')
  })
})
