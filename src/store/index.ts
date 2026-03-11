import { create } from 'zustand'
import { AureliusNode, parseNodeFromFile, serializeNode, createNewNode, buildBacklinks, extractTags } from '../lib/parser'
import { Block, newBlock } from '../lib/blocks'

export interface NavigationEntry {
  nodeId: string
  label: string
}

interface AppState {
  // Vault
  vaultPath: string | null
  setVaultPath: (path: string) => void

  // Nodes
  nodes: Map<string, AureliusNode>
  loadNodes: (vaultPath: string) => Promise<void>
  saveNode: (node: AureliusNode) => Promise<void>
  createNode: (title: string, options?: { parentBlockId?: string; parentNodeId?: string }) => Promise<AureliusNode>
  deleteNode: (id: string) => Promise<void>
  updateNodeContent: (id: string, content: string, links?: string[]) => void
  updateNodeBlocks: (id: string, blocks: Block[]) => void

  // Navigation (breadcrumb stack)
  navigationStack: NavigationEntry[]
  currentNodeId: string | null
  navigateTo: (nodeId: string, label?: string) => void
  navigateBack: () => void
  navigateToIndex: (index: number) => void

  // Block drill-down
  drillIntoBlock: (block: Block, parentNodeId: string) => Promise<void>

  // Tags
  tagIndex: Map<string, string[]>
  activeTag: string | null
  setActiveTag: (tag: string | null) => void
  rebuildTagIndex: () => void

  // Search
  searchOpen: boolean
  setSearchOpen: (open: boolean) => void

  // UI
  activeView: 'editor' | 'graph'
  setActiveView: (view: 'editor' | 'graph') => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

declare global {
  interface Window {
    electronAPI: {
      vault: {
        choose: () => Promise<string | null>
        readAll: (vaultPath: string) => Promise<{ file: string; content: string }[]>
        writeNode: (vaultPath: string, filename: string, content: string) => Promise<{ success: boolean }>
        deleteNode: (vaultPath: string, filename: string) => Promise<{ success: boolean }>
        getPath: () => Promise<string | null>
        setPath: (vaultPath: string) => Promise<{ success: boolean }>
      }
    }
  }
}

function buildTagIndex(nodes: Map<string, AureliusNode>): Map<string, string[]> {
  const index = new Map<string, string[]>()
  for (const node of nodes.values()) {
    for (const tag of node.tags) {
      const existing = index.get(tag) || []
      index.set(tag, [...existing, node.id])
    }
  }
  return index
}

export const useStore = create<AppState>((set, get) => ({
  vaultPath: null,
  nodes: new Map(),
  navigationStack: [],
  currentNodeId: null,
  activeView: 'editor',
  sidebarOpen: true,
  tagIndex: new Map(),
  activeTag: null,
  searchOpen: false,

  setVaultPath: (path) => set({ vaultPath: path }),

  loadNodes: async (vaultPath) => {
    console.log('[loadNodes] reading vault:', vaultPath)
    const files = await window.electronAPI.vault.readAll(vaultPath)
    console.log('[loadNodes] files returned:', files.length, files.map((f: { file: string }) => f.file))
    const nodes = new Map<string, AureliusNode>()

    for (const { file, content } of files) {
      try {
        const node = parseNodeFromFile(file, content)
        console.log('[loadNodes] parsed node:', node.id, node.title, 'blocks:', node.blocks.length)
        nodes.set(node.id, node)
      } catch (err) {
        console.error('[loadNodes] FAILED to parse:', file, err)
      }
    }

    console.log('[loadNodes] total nodes parsed:', nodes.size)

    // Build backlinks
    const backlinksMap = buildBacklinks([...nodes.values()])
    for (const [id, backlinks] of backlinksMap) {
      const node = nodes.get(id)
      if (node) node.backlinks = backlinks
    }

    const tagIndex = buildTagIndex(nodes)

    // If no nodes, create a welcome node
    if (nodes.size === 0) {
      console.log('[loadNodes] no nodes found, creating welcome node')
      const welcome = createNewNode('Welcome to Aurelius')
      welcome.content = 'This is your first node. Click any block to drill into it, or use [[Node Name]] to link nodes together.'
      nodes.set(welcome.id, welcome)
      const serialized = serializeNode(welcome)
      await window.electronAPI.vault.writeNode(vaultPath, welcome.filename, serialized)
      set({ nodes, tagIndex, currentNodeId: welcome.id, navigationStack: [{ nodeId: welcome.id, label: welcome.title }] })
    } else {
      // Open the most recently updated node
      const mostRecent = [...nodes.values()].sort((a, b) => b.updated.localeCompare(a.updated))[0]
      console.log('[loadNodes] setting state — nodes:', nodes.size, 'currentNodeId:', mostRecent.id, mostRecent.title)
      set({ nodes, tagIndex, currentNodeId: mostRecent.id, navigationStack: [{ nodeId: mostRecent.id, label: mostRecent.title }] })
    }
    console.log('[loadNodes] done')
  },

  saveNode: async (node) => {
    const { vaultPath } = get()
    if (!vaultPath) return
    const serialized = serializeNode(node)
    await window.electronAPI.vault.writeNode(vaultPath, node.filename, serialized)
  },

  createNode: async (title, options = {}) => {
    const { vaultPath, nodes, saveNode } = get()
    const node = createNewNode(title)
    if (options.parentBlockId) node.parentBlockId = options.parentBlockId
    if (options.parentNodeId) node.parentNodeId = options.parentNodeId
    const updatedNodes = new Map(nodes)
    updatedNodes.set(node.id, node)
    const tagIndex = buildTagIndex(updatedNodes)
    set({ nodes: updatedNodes, tagIndex })
    if (vaultPath) await saveNode(node)
    return node
  },

  deleteNode: async (id) => {
    const { vaultPath, nodes, currentNodeId, navigationStack } = get()
    const node = nodes.get(id)
    if (!node || !vaultPath) return
    await window.electronAPI.vault.deleteNode(vaultPath, node.filename)
    const updatedNodes = new Map(nodes)
    updatedNodes.delete(id)
    const tagIndex = buildTagIndex(updatedNodes)

    // If we deleted the current node, navigate to another one
    if (currentNodeId === id) {
      const remaining = [...updatedNodes.values()].filter(n => !n.parentNodeId)
      if (remaining.length > 0) {
        const next = remaining.sort((a, b) => b.updated.localeCompare(a.updated))[0]
        set({ nodes: updatedNodes, tagIndex, currentNodeId: next.id, navigationStack: [{ nodeId: next.id, label: next.title }] })
      } else {
        set({ nodes: updatedNodes, tagIndex, currentNodeId: null, navigationStack: [] })
      }
    } else {
      // Remove deleted node from breadcrumb stack if present
      const cleanedStack = navigationStack.filter(e => e.nodeId !== id)
      set({ nodes: updatedNodes, tagIndex, navigationStack: cleanedStack })
    }
  },

  updateNodeContent: (id, content, links) => {
    const { nodes } = get()
    const node = nodes.get(id)
    if (!node) return
    const tags = extractTags(content)
    const updated = { ...node, content, tags, links: links || node.links, updated: new Date().toISOString() }
    const updatedNodes = new Map(nodes)
    updatedNodes.set(id, updated)
    const tagIndex = buildTagIndex(updatedNodes)
    set({ nodes: updatedNodes, tagIndex })
  },

  updateNodeBlocks: (id, blocks) => {
    const { nodes, saveNode } = get()
    const node = nodes.get(id)
    if (!node) return
    // Extract tags and wiki links from blocks
    const rawContent = blocks.map(b => b.raw).join('\n')
    const tags = extractTags(rawContent)
    // Resolve wiki links to update links array
    const wikiLinkRegex = /\[\[([^\]]+)\]\]/g
    const nodesByTitle = new Map<string, AureliusNode>()
    for (const n of nodes.values()) nodesByTitle.set(n.title.toLowerCase(), n)
    const links: string[] = []
    let match
    while ((match = wikiLinkRegex.exec(rawContent)) !== null) {
      const target = nodesByTitle.get(match[1].toLowerCase())
      if (target && !links.includes(target.id)) links.push(target.id)
    }
    const updated = { ...node, blocks, tags, links, content: rawContent, updated: new Date().toISOString() }
    const updatedNodes = new Map(nodes)
    updatedNodes.set(id, updated)
    const tagIndex = buildTagIndex(updatedNodes)
    set({ nodes: updatedNodes, tagIndex })
    // Debounce handled in BlockEditor — trigger save immediately here
    saveNode(updated)
  },

  drillIntoBlock: async (block, parentNodeId) => {
    const { nodes, createNode, saveNode, navigateTo } = get()

    // Find existing child node for this block
    const existing = [...nodes.values()].find(n => n.parentBlockId === block.id)
    if (existing) {
      navigateTo(existing.id, block.raw.slice(0, 60) || 'Block')
      return
    }

    // Create new child node
    const label = block.raw.replace(/^[#>\-*+\d.]+\s*/, '').trim().slice(0, 60) || 'Block'
    const child = await createNode(label, { parentBlockId: block.id, parentNodeId })

    // Mark block in parent node as having a child
    const parentNode = nodes.get(parentNodeId)
    if (parentNode) {
      const updatedBlocks = parentNode.blocks.map(b =>
        b.id === block.id ? { ...b, childNodeId: child.id } : b
      )
      const updatedParent = { ...parentNode, blocks: updatedBlocks }
      const updatedNodes = new Map(get().nodes)
      updatedNodes.set(parentNodeId, updatedParent)
      set({ nodes: updatedNodes })
      await saveNode(updatedParent)
    }

    navigateTo(child.id, label)
  },

  navigateTo: (nodeId, label) => {
    const { navigationStack, currentNodeId, nodes } = get()
    if (currentNodeId === nodeId) return
    const resolvedLabel = label || nodes.get(nodeId)?.title || nodeId
    const existingIndex = navigationStack.findIndex(e => e.nodeId === nodeId)
    if (existingIndex >= 0) {
      set({
        navigationStack: navigationStack.slice(0, existingIndex + 1),
        currentNodeId: nodeId,
      })
    } else {
      set({
        navigationStack: [...navigationStack, { nodeId, label: resolvedLabel }],
        currentNodeId: nodeId,
      })
    }
  },

  navigateBack: () => {
    const { navigationStack } = get()
    if (navigationStack.length <= 1) return
    const newStack = navigationStack.slice(0, -1)
    set({ navigationStack: newStack, currentNodeId: newStack[newStack.length - 1].nodeId })
  },

  navigateToIndex: (index) => {
    const { navigationStack } = get()
    const newStack = navigationStack.slice(0, index + 1)
    set({ navigationStack: newStack, currentNodeId: newStack[index].nodeId })
  },

  rebuildTagIndex: () => {
    const { nodes } = get()
    set({ tagIndex: buildTagIndex(nodes) })
  },

  setActiveTag: (tag) => set({ activeTag: tag }),
  setSearchOpen: (open) => set({ searchOpen: open }),
  setActiveView: (view) => set({ activeView: view }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}))

// Re-export newBlock for convenience
export { newBlock }
