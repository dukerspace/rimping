export async function fetchGitDiff(cwd: string, staged = false): Promise<string> {
  const args = staged ? ['diff', '--staged', 'HEAD'] : ['diff', 'HEAD']
  const proc = Bun.spawn(['git', ...args], {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const output = await new Response(proc.stdout).text()
  const exitCode = await proc.exited
  if (exitCode !== 0) {
    const err = await new Response(proc.stderr).text()
    throw new Error(`git diff failed: ${err || 'not a git repository'}`)
  }
  return output
}

export function isGitRepo(cwd: string): boolean {
  try {
    const proc = Bun.spawnSync(['git', 'rev-parse', '--git-dir'], { cwd, stdout: 'pipe', stderr: 'pipe' })
    return proc.exitCode === 0
  } catch {
    return false
  }
}
