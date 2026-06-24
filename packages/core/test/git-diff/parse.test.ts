import { describe, expect, it } from 'bun:test'
import { parseUnifiedDiff } from '../../src/git-diff/parse.js'

const SAMPLE_DIFF = `diff --git a/src/foo.ts b/src/foo.ts
index 123..456 100644
--- a/src/foo.ts
+++ b/src/foo.ts
@@ -1,3 +1,3 @@
 export function foo() {
-  return 1
+  return 2
 }
`

describe('parseUnifiedDiff', () => {
  it('parses file and hunks', () => {
    const result = parseUnifiedDiff(SAMPLE_DIFF)
    expect(result.hunks).toHaveLength(1)
    expect(result.hunks[0].file).toBe('src/foo.ts')
    expect(result.hunks[0].newStart).toBe(1)
    expect(result.hunks[0].lines.some((l) => l.startsWith('-'))).toBe(true)
    expect(result.hunks[0].lines.some((l) => l.startsWith('+'))).toBe(true)
  })
})
