import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { SymbolInfo } from '../types.js'
import { findSymbolInDiffLines } from './fallback.js'
import { isTreeSitterSupported, languageFromPath } from './languages.js'

const SYMBOL_NODE_TYPES = new Set([
  'function_declaration',
  'method_definition',
  'class_declaration',
  'interface_declaration',
  'type_alias_declaration',
  'lexical_declaration',
  'variable_declaration',
  'arrow_function',
])

type ParserModule = {
  init(): Promise<void>
  Language: { load(path: string): Promise<unknown> }
  new (): {
    setLanguage(lang: unknown): void
    parse(source: string): { rootNode: TreeNode }
  }
}

let parserReady = false
let ParserClass: ParserModule | null = null
const grammarCache = new Map<string, unknown>()

async function ensureParser(): Promise<boolean> {
  if (parserReady) return ParserClass !== null
  parserReady = true
  try {
    const mod = await import('web-tree-sitter')
    const Parser = mod.default as ParserModule
    await Parser.init()
    ParserClass = Parser
    return true
  } catch {
    return false
  }
}

async function loadGrammar(lang: string): Promise<unknown | null> {
  if (grammarCache.has(lang)) return grammarCache.get(lang) ?? null
  try {
    const wasmPath = join(
      dirname(fileURLToPath(import.meta.url)),
      '..',
      '..',
      '..',
      'node_modules',
      'tree-sitter-typescript',
      'tree-sitter-typescript.wasm',
    )
    if (!existsSync(wasmPath)) return null
    const grammar = await ParserClass!.Language.load(wasmPath)
    grammarCache.set(lang, grammar)
    return grammar
  } catch {
    return null
  }
}

function nodeName(node: { childForFieldName: (n: string) => unknown; type: string }): string | null {
  const nameNode = node.childForFieldName('name') as { text?: string } | null
  if (nameNode?.text) return nameNode.text
  return null
}

function collectSymbols(tree: { rootNode: TreeNode }): SymbolInfo[] {
  const symbols: SymbolInfo[] = []

  function walk(node: TreeNode) {
    if (SYMBOL_NODE_TYPES.has(node.type)) {
      const name = nodeName(node)
      if (name) {
        const start = node.startPosition.row + 1
        symbols.push({ name, kind: node.type, line: start })
      }
    }
    for (let i = 0; i < node.childCount; i++) {
      walk(node.child(i))
    }
  }

  walk(tree.rootNode)
  return symbols
}

interface TreeNode {
  type: string
  startPosition: { row: number }
  childCount: number
  child: (i: number) => TreeNode
  childForFieldName: (n: string) => TreeNode | null
}

function findEnclosingSymbol(symbols: SymbolInfo[], line: number): string | null {
  let best: SymbolInfo | null = null
  for (const sym of symbols) {
    if (sym.line <= line && (!best || sym.line > best.line)) {
      best = sym
    }
  }
  return best?.name ?? null
}

export async function extractSymbolForHunk(
  filePath: string,
  cwd: string,
  hunkLines: string[],
  hunkStartLine: number,
): Promise<string | null> {
  const fallback = findSymbolInDiffLines(hunkLines)

  if (!isTreeSitterSupported(filePath)) return fallback

  const ready = await ensureParser()
  if (!ready || !ParserClass) return fallback

  const lang = languageFromPath(filePath)
  if (!lang) return fallback

  const grammar = await loadGrammar(lang)
  if (!grammar) return fallback

  const fullPath = join(cwd, filePath)
  if (!existsSync(fullPath)) return fallback

  try {
    const source = await readFile(fullPath, 'utf-8')
    const parser = new ParserClass()
    parser.setLanguage(grammar)
    const tree = parser.parse(source)
    const symbols = collectSymbols(tree)
    return findEnclosingSymbol(symbols, hunkStartLine) ?? fallback
  } catch {
    return fallback
  }
}
