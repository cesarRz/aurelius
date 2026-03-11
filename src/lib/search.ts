import { AureliusNode } from './parser'

export interface SearchResult {
  nodeId: string
  title: string
  excerpt: string
  matchIndex: number
}

export function searchNodes(nodes: Map<string, AureliusNode>, query: string): SearchResult[] {
  if (!query.trim()) return []
  const q = query.toLowerCase()
  const results: SearchResult[] = []

  for (const node of nodes.values()) {
    const content = node.blocks.length > 0
      ? node.blocks.map(b => b.raw).join('\n')
      : node.content

    // Title match gets priority
    const titleIdx = node.title.toLowerCase().indexOf(q)
    const contentIdx = content.toLowerCase().indexOf(q)

    if (titleIdx === -1 && contentIdx === -1) continue

    let excerpt = ''
    let matchIndex = contentIdx

    if (contentIdx !== -1) {
      const start = Math.max(0, contentIdx - 40)
      const end = Math.min(content.length, contentIdx + query.length + 40)
      excerpt = (start > 0 ? '…' : '') + content.slice(start, end) + (end < content.length ? '…' : '')
    } else {
      excerpt = node.title
      matchIndex = titleIdx
    }

    results.push({ nodeId: node.id, title: node.title, excerpt, matchIndex })
  }

  // Sort: title matches first, then by match position
  results.sort((a, b) => {
    const aTitle = a.title.toLowerCase().includes(q)
    const bTitle = b.title.toLowerCase().includes(q)
    if (aTitle && !bTitle) return -1
    if (!aTitle && bTitle) return 1
    return a.matchIndex - b.matchIndex
  })

  return results.slice(0, 20)
}

export function highlightExcerpt(excerpt: string, query: string): string {
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return excerpt.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>')
}
