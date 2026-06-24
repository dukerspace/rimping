const PASS_RE = /^\s*(test\s+.+|\S+::\S+\s+).+\.\.\.\s+ok\s*$/i
const RUNNING_RE = /^running \d+ tests?$/i
const RESULT_RE = /^test result:/i

export function compressTestOutput(raw: string): string {
  const lines = raw.split('\n')
  const out: string[] = []
  let passed = 0
  let failed = 0
  let inFailure = false
  const failureBlocks: string[] = []
  let currentBlock: string[] = []

  for (const line of lines) {
    if (RUNNING_RE.test(line.trim())) continue
    if (PASS_RE.test(line)) {
      passed++
      continue
    }

    const failMatch = line.match(/FAILED|panicked|AssertionError|Error:/i)
    const isFailHeader = /\sFAILED\s*$/.test(line) || line.includes('failures:')

    if (failMatch || isFailHeader || inFailure) {
      inFailure = true
      if (line.trim() === '' && currentBlock.length > 0) {
        failureBlocks.push(currentBlock.join('\n'))
        currentBlock = []
        inFailure = false
      } else if (line.trim()) {
        currentBlock.push(line)
      }
      if (/\sFAILED\s*$/.test(line)) failed++
      continue
    }

    if (RESULT_RE.test(line)) {
      out.push(line.trim())
      continue
    }

    if (line.trim().startsWith('failures:')) continue
  }

  if (currentBlock.length > 0) failureBlocks.push(currentBlock.join('\n'))

  if (passed > 0) out.unshift(`${passed} tests passed`)
  if (failed > 0) out.push(`${failed} tests failed`)

  for (const block of failureBlocks) {
    out.push(block)
  }

  if (out.length === 0) return raw.trim()
  return out.join('\n\n')
}
