import { stripAnsi } from '../ansi.js'
import { dedupeLines } from '../dedupe.js'

export function compressGeneric(raw: string): string {
  let text = stripAnsi(raw)
  text = text.replace(/\r\n/g, '\n')
  text = text.replace(/[ \t]+$/gm, '')
  text = text.replace(/\n{3,}/g, '\n\n')
  text = dedupeLines(text)
  return text.trim()
}
