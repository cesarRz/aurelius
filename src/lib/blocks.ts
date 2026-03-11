import { v4 as uuidv4 } from 'uuid'

export interface Block {
  id: string
  raw: string
  type: 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 'list-item' | 'quote' | 'code' | 'blank'
  depth: number
  childNodeId?: string
}

const BID_REGEX = /\s*<!--\s*bid:([a-zA-Z0-9-]+)\s*-->/

export function blockType(raw: string): Block['type'] {
  const trimmed = raw.trim()
  if (!trimmed) return 'blank'
  if (trimmed.startsWith('### ')) return 'heading3'
  if (trimmed.startsWith('## ')) return 'heading2'
  if (trimmed.startsWith('# ')) return 'heading1'
  if (trimmed.startsWith('> ')) return 'quote'
  if (trimmed.startsWith('```')) return 'code'
  if (/^[-*+]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed)) return 'list-item'
  return 'paragraph'
}

function indentDepth(raw: string): number {
  const match = raw.match(/^(\s+)/)
  if (!match) return 0
  return Math.floor(match[1].length / 2)
}

export function parseBlocks(content: string): Block[] {
  if (!content.trim()) return []
  const lines = content.split('\n')
  return lines.map(line => {
    const bidMatch = line.match(BID_REGEX)
    const id = bidMatch ? bidMatch[1] : uuidv4()
    const raw = line.replace(BID_REGEX, '').trimEnd()
    return {
      id,
      raw,
      type: blockType(raw),
      depth: indentDepth(raw),
    }
  })
}

export function serializeBlocks(blocks: Block[]): string {
  return blocks.map(block => {
    if (block.type === 'blank' || !block.raw.trim()) return ''
    return `${block.raw} <!-- bid:${block.id} -->`
  }).join('\n')
}

export function assignBlockId(block: Block): Block {
  if (block.id) return block
  return { ...block, id: uuidv4() }
}

export function newBlock(raw = ''): Block {
  return {
    id: uuidv4(),
    raw,
    type: blockType(raw),
    depth: 0,
  }
}
