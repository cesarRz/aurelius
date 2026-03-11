import matter from 'gray-matter'
import { v4 as uuidv4 } from 'uuid'

export interface AureliusNode {
  id: string
  title: string
  content: string
  created: string
  updated: string
  links: string[] // IDs of linked nodes
  backlinks: string[] // populated at runtime
  filename: string
}

export function parseNodeFromFile(filename: string, raw: string): AureliusNode {
  const { data, content } = matter(raw)
  return {
    id: data.id || uuidv4(),
    title: data.title || filename.replace('.md', ''),
    content: content.trim(),
    created: data.created || new Date().toISOString(),
    updated: data.updated || new Date().toISOString(),
    links: data.links || [],
    backlinks: [],
    filename,
  }
}

export function serializeNode(node: AureliusNode): string {
  const frontmatter = {
    id: node.id,
    title: node.title,
    created: node.created,
    updated: new Date().toISOString(),
    links: node.links,
  }
  return matter.stringify(node.content, frontmatter)
}

export function createNewNode(title: string): AureliusNode {
  const id = uuidv4()
  const now = new Date().toISOString()
  return {
    id,
    title,
    content: '',
    created: now,
    updated: now,
    links: [],
    backlinks: [],
    filename: `${id}.md`,
  }
}

// Extract [[Node Title]] links from content
export function extractWikiLinks(content: string): string[] {
  const regex = /\[\[([^\]]+)\]\]/g
  const links: string[] = []
  let match
  while ((match = regex.exec(content)) !== null) {
    links.push(match[1])
  }
  return links
}

// Replace [[Node Title]] with [[Node Title]]{id} for internal resolution
export function resolveWikiLinks(
  content: string,
  nodesByTitle: Map<string, AureliusNode>
): { content: string; resolvedIds: string[] } {
  const resolvedIds: string[] = []
  const resolved = content.replace(/\[\[([^\]]+)\]\]/g, (_match, title) => {
    const node = nodesByTitle.get(title.toLowerCase())
    if (node) {
      resolvedIds.push(node.id)
      return `[[${title}]]`
    }
    return `[[${title}]]`
  })
  return { content: resolved, resolvedIds }
}

// Build backlinks index from all nodes
export function buildBacklinks(nodes: AureliusNode[]): Map<string, string[]> {
  const backlinks = new Map<string, string[]>()
  for (const node of nodes) {
    for (const linkedId of node.links) {
      const existing = backlinks.get(linkedId) || []
      backlinks.set(linkedId, [...existing, node.id])
    }
  }
  return backlinks
}
