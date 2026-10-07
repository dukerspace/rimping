/**
 * Validate the leanstack Cursor plugin sources and assemble
 * ~/.cursor/plugins/local/rimping from the manifest, template skills, and commands.
 * Cursor does not load a local plugin through a symlink that leaves that directory.
 */
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

const repoRoot = resolve(import.meta.dir, '..')
const leanstackRoot = join(repoRoot, 'packages', 'leanstack')
const manifestPath = join(leanstackRoot, '.cursor-plugin', 'plugin.json')
const skillsRoot = join(leanstackRoot, 'templates', 'skills')
const commandsRoot = join(leanstackRoot, 'templates', 'commands')
const installRoot = join(homedir(), '.cursor', 'plugins', 'local', 'rimping')

const skillNames = ['implement', 'debug', 'refactor', 'architect', 'review']

const commandNames = [
  'rimping-init',
  'rimping-run',
  'rimping-plan',
  'rimping-debug',
  'rimping-architect',
  'rimping-review',
  'rimping-status',
  'rimping-doctor',
]

const requiredInstallPaths = [
  '.cursor-plugin/plugin.json',
  ...skillNames.map((name) => `skills/${name}/SKILL.md`),
  ...commandNames.map((name) => `commands/${name}.md`),
]

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

function frontmatter(text: string, file: string): string {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) fail(`${file}: missing frontmatter`)
  return match[1]
}

function requireKey(block: string, key: string, file: string): void {
  const pattern = new RegExp(`^${key}:`, 'm')
  if (!pattern.test(block)) fail(`${file}: frontmatter missing ${key}`)
}

async function readCommandText(fileName: string): Promise<string> {
  return readFile(join(commandsRoot, fileName), 'utf8')
}

async function readSkillText(name: string): Promise<string> {
  return readFile(join(skillsRoot, name, 'SKILL.md'), 'utf8')
}

async function pathExists(root: string, relativePath: string): Promise<boolean> {
  const info = await stat(join(root, relativePath)).catch(() => null)
  return Boolean(info)
}

async function validateCommands(): Promise<void> {
  const commandFiles = (await readdir(commandsRoot).catch(() => null))?.filter((name) =>
    /\.(md|mdc|markdown|txt)$/.test(name),
  )
  if (!commandFiles) fail(`missing ${commandsRoot}`)
  if (commandFiles.length !== commandNames.length) {
    fail(`commands/: expected ${commandNames.length} files, found ${commandFiles.length}`)
  }
  for (const name of commandFiles) {
    const file = join('commands', name)
    const block = frontmatter(await readCommandText(name), file)
    requireKey(block, 'name', file)
    requireKey(block, 'description', file)
    const commandName = name.replace(/\.(md|mdc|markdown|txt)$/, '')
    if (!commandNames.includes(commandName)) fail(`unexpected command file: ${name}`)
    if (!new RegExp(`^name:\\s*${commandName}\\s*$`, 'm').test(block)) {
      fail(`${file}: name must be ${commandName}`)
    }
  }
}

async function validateSkills(): Promise<void> {
  for (const name of skillNames) {
    const file = join('skills', name, 'SKILL.md')
    const info = await stat(join(skillsRoot, name, 'SKILL.md')).catch(() => null)
    if (!info?.isFile()) fail(`missing templates/${file}`)
    const block = frontmatter(await readSkillText(name), file)
    requireKey(block, 'name', file)
    requireKey(block, 'description', file)
  }
}

async function validateManifest(): Promise<string> {
  const info = await stat(manifestPath).catch(() => null)
  if (!info?.isFile()) fail(`missing packages/leanstack/.cursor-plugin/plugin.json`)

  const text = await readFile(manifestPath, 'utf8')
  const manifest = JSON.parse(text) as {
    name?: string
    skills?: string
    commands?: string
  }
  if (manifest.name !== 'rimping') fail('plugin.json name must be rimping')
  if (!/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(manifest.name)) {
    fail('plugin.json name is not a valid plugin identifier')
  }
  if (manifest.skills !== './skills/') fail('plugin.json skills must be ./skills/')
  if (manifest.commands !== './commands/') fail('plugin.json commands must be ./commands/')

  return text
}

async function validate(): Promise<void> {
  await validateManifest()
  await validateSkills()
  await validateCommands()
  console.log('plugin ok')
}

async function copyCommands(destination: string): Promise<void> {
  const commandsDir = join(destination, 'commands')
  await mkdir(commandsDir, { recursive: true })
  for (const name of commandNames) {
    const fileName = `${name}.md`
    const text = await readCommandText(fileName)
    await writeFile(join(commandsDir, fileName), text)
  }
}

async function copySkills(destination: string): Promise<void> {
  for (const name of skillNames) {
    const skillDir = join(destination, 'skills', name)
    await mkdir(skillDir, { recursive: true })
    await writeFile(join(skillDir, 'SKILL.md'), await readSkillText(name))
  }
}

async function install(): Promise<void> {
  const manifestText = await validateManifest()
  await validateSkills()
  await validateCommands()

  const destination = resolve(installRoot)
  const expected = resolve(join(homedir(), '.cursor', 'plugins', 'local', 'rimping'))
  if (destination !== expected) fail(`refusing to install outside ${expected}`)

  await mkdir(dirname(destination), { recursive: true })
  await rm(destination, { recursive: true, force: true })
  await mkdir(join(destination, '.cursor-plugin'), { recursive: true })
  await writeFile(join(destination, '.cursor-plugin', 'plugin.json'), manifestText)
  await copySkills(destination)
  await copyCommands(destination)

  for (const relativePath of requiredInstallPaths) {
    const info = await stat(join(destination, relativePath)).catch(() => null)
    if (!info?.isFile()) fail(`install missing ${relativePath}`)
  }
  if (await pathExists(destination, 'hooks/hooks.json')) {
    fail('token hooks must not ship: hooks/hooks.json')
  }

  console.log(destination)
}

const action = process.argv[2]
if (action === 'validate') {
  await validate()
} else if (action === 'install') {
  await install()
} else {
  fail('usage: bun run scripts/cursor-plugin.ts <validate|install>')
}
