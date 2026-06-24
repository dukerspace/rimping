import { colors, stripAnsi } from 'consola/utils'

const {
  bold,
  dim,
  cyan,
  greenBright,
  redBright,
  yellowBright,
  whiteBright,
  magentaBright,
} = colors

type ColorFn = (text: string) => string

/** Gemini CLI: soft blue labels, bold white headings, white values. */
const labelColor: ColorFn = cyan
const valueColor: ColorFn = whiteBright
const LABEL_WIDTH = 22

export const isColorEnabled =
  process.env.NO_COLOR === undefined &&
  process.env.FORCE_COLOR !== '0' &&
  (process.env.FORCE_COLOR !== undefined || process.stdout.isTTY)

function paint(fn: ColorFn, text: string): string {
  return isColorEnabled ? fn(text) : text
}

export function title(text: string): string {
  return paint(bold, paint(whiteBright, text))
}

export function section(text: string): string {
  return paint(bold, paint(whiteBright, text))
}

export function divider(width = 40): string {
  return paint(dim, '─'.repeat(width))
}

export function muted(text: string): string {
  return paint(cyan, text)
}

export function dimText(text: string): string {
  return paint(dim, paint(cyan, text))
}

export function label(key: string, value: string, width = LABEL_WIDTH): string {
  const padded = key.padEnd(width)
  return `${paint(labelColor, padded)}${paint(valueColor, value)}`
}

export function highlight(text: string): string {
  return paint(valueColor, text)
}

export function accent(text: string): string {
  return paint(magentaBright, text)
}

export function ok(text: string): string {
  return paint(greenBright, text)
}

export function fail(text: string): string {
  return paint(redBright, text)
}

export function warn(text: string): string {
  return paint(yellowBright, text)
}

export type StatusKind = 'ok' | 'fail' | 'unknown' | 'neutral'

export function statusIcon(kind: StatusKind): string {
  switch (kind) {
    case 'ok':
      return paint(greenBright, '✓')
    case 'fail':
      return paint(redBright, '✗')
    case 'unknown':
      return paint(yellowBright, '?')
    case 'neutral':
      return paint(cyan, '·')
  }
}

export function boldText(text: string): string {
  return paint(labelColor, text)
}

export function checkLine(kind: StatusKind, message: string): string {
  const text =
    kind === 'fail'
      ? fail(message)
      : kind === 'neutral'
        ? muted(message)
        : kind === 'ok'
          ? highlight(message)
          : highlight(message)
  return `  ${statusIcon(kind)} ${text}`
}

/** Color a `key: value` config line from core formatters. */
export function formatKeyValueLine(line: string): string {
  const colonIdx = line.indexOf(': ')
  if (colonIdx === -1) return `  ${line}`
  const key = `${line.slice(0, colonIdx)}:`
  const value = line.slice(colonIdx + 2)
  return `  ${label(key, value)}`
}

const STATUS_WORDS: Array<{ word: string; style: ColorFn }> = [
  { word: 'detected', style: ok },
  { word: 'unknown', style: warn },
  { word: 'not found', style: highlight },
  { word: 'agent on', style: ok },
  { word: 'agent off', style: muted },
]

/** Color agent hook status lines from core formatters. */
export function formatAgentHookLine(line: string): string {
  const match = line.match(/^(\S+)(\s+)(.*)$/)
  if (!match) return `  ${line}`

  const [, name, gap, rest] = match
  let styled = `${boldText(name)}${gap}${rest}`
  for (const { word, style } of STATUS_WORDS) {
    styled = styled.replace(word, style(word))
  }
  return `  ${styled}`
}

/** Pad visible text width (ignoring ANSI) for column alignment. */
export function padVisible(text: string, width: number): string {
  const visible = stripAnsi(text)
  return visible.length >= width ? text : text + ' '.repeat(width - visible.length)
}
