import { v4 as uuidv4 } from 'uuid'
import { Block, parseBlocks, serializeBlocks } from './blocks'

// Lightweight frontmatter parser (gray-matter uses Node Buffer which breaks in renderer)
function parseFrontmatter(raw: string): { data: Record<string, unknown>; content: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return { data: {}, content: raw }

  const yamlBlock = match[1]
  const content = match[2]
  const data: Record<string, unknown> = {}

  for (const line of yamlBlock.split('\n')) {
    // Handle YAML array items like "- value"
    const kvMatch = line.match(/^(\w[\w-]*):\s*(.*)$/)
    if (kvMatch) {
      const key = kvMatch[1]
      let val: unknown = kvMatch[2]

      // Unquote strings
      if (typeof val === 'string' && val.startsWith("'") && val.endsWith("'")) {
        val = (val as string).slice(1, -1)
      } else if (typeof val === 'string' && val.startsWith('"') && val.endsWith('"')) {
        val = (val as string).slice(1, -1)
      }

      // Inline array like [item1, item2] or []
      if (typeof val === 'string' && val.startsWith('[')) {
        try {
          val = JSON.parse(val as string)
        } catch {
          val = []
        }
      }

      // Empty value means next lines might be array items — handled below
      if (val === '') val = undefined

      data[key] = val
    } else {
      // Array item: "- value"
      const arrMatch = line.match(/^-\s+(.+)$/)
      if (arrMatch) {
        // Find the last key with undefined value and make it an array
        const keys = Object.keys(data)
        const lastKey = keys[keys.length - 1]
        if (lastKey && (data[lastKey] === undefined || Array.isArray(data[lastKey]))) {
          if (!Array.isArray(data[lastKey])) data[lastKey] = []
          ;(data[lastKey] as unknown[]).push(arrMatch[1])
        }
      }
    }
  }

  return { data, content }
}

function stringifyFrontmatter(content: string, data: Record<string, unknown>): string {
  let yaml = ''
  for (const [key, val] of Object.entries(data)) {
    if (Array.isArray(val)) {
      yaml += `${key}: ${JSON.stringify(val)}\n`
    } else if (typeof val === 'string' && (val.includes(':') || val.includes("'") || val.includes('"'))) {
      yaml += `${key}: '${val}'\n`
    } else {
      yaml += `${key}: ${val}\n`
    }
  }
  return `---\n${yaml}---\n${content}`
}

export type { Block }

export interface AureliusNode {
  id: string
  title: string
  content: string
  blocks: Block[]
  created: string
  updated: string
  links: string[]
  backlinks: string[]
  filename: string
  parentBlockId?: string
  parentNodeId?: string
  tags: string[]
}

export function parseNodeFromFile(filename: string, raw: string): AureliusNode {
  const { data, content } = parseFrontmatter(raw)
  const bodyContent = content.trim()
  const blocks = parseBlocks(bodyContent)
  return {
    id: (data.id as string) || uuidv4(),
    title: (data.title as string) || filename.replace('.md', ''),
    content: bodyContent,
    blocks,
    created: (data.created as string) || new Date().toISOString(),
    updated: (data.updated as string) || new Date().toISOString(),
    links: (data.links as string[]) || [],
    backlinks: [],
    filename,
    parentBlockId: data.parentBlockId as string | undefined,
    parentNodeId: data.parentNodeId as string | undefined,
    tags: extractTags(bodyContent),
  }
}

export function serializeNode(node: AureliusNode): string {
  const content = node.blocks.length > 0 ? serializeBlocks(node.blocks) : node.content
  const frontmatter: Record<string, unknown> = {
    id: node.id,
    title: node.title,
    created: node.created,
    updated: new Date().toISOString(),
    links: node.links,
  }
  if (node.parentBlockId) frontmatter.parentBlockId = node.parentBlockId
  if (node.parentNodeId) frontmatter.parentNodeId = node.parentNodeId
  return stringifyFrontmatter(content, frontmatter)
}

export function createNewNode(title: string): AureliusNode {
  const id = uuidv4()
  const now = new Date().toISOString()
  return {
    id,
    title,
    content: '',
    blocks: [],
    created: now,
    updated: now,
    links: [],
    backlinks: [],
    filename: `${id}.md`,
    tags: [],
  }
}

export function extractTags(content: string): string[] {
  const regex = /(?:^|\s)#([a-zA-Z][a-zA-Z0-9_-]*)/g
  const tags: string[] = []
  let match
  while ((match = regex.exec(content)) !== null) {
    if (!tags.includes(match[1])) tags.push(match[1])
  }
  return tags
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

// Replace [[Node Title]] with resolved IDs in links array
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
