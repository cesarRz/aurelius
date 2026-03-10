import { create } from 'zustand'
import { AureliusNode, parseNodeFromFile, serializeNode, createNewNode, buildBacklinks } from '../lib/parser'

interface AppState {
  // Vault
  vaultPath: string | null
  setVaultPath: (path: string) => void

  // Nodes
  nodes: Map<string, AureliusNode>
  loadNodes: (vaultPath: string) => Promise<void>
  saveNode: (node: AureliusNode) => Promise<void>
  createNode: (title: string, parentId?: string) => Promise<AureliusNode>
  deleteNode: (id: string) => Promise<void>
  updateNodeContent: (id: string, content: string, links?: string[]) => void

  // Navigation (breadcrumb stack)
  navigationStack: string[] // array of node IDs
  currentNodeId: string | null
  navigateTo: (nodeId: string) => void
  navigateBack: () => void
  navigateToIndex: (index: number) => void

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

export const useStore = create<AppState>((set, get) => ({
  vaultPath: null,
  nodes: new Map(),
  navigationStack: [],
  currentNodeId: null,
  activeView: 'editor',
  sidebarOpen: true,

  setVaultPath: (path) => set({ vaultPath: path }),

  loadNodes: async (vaultPath) => {
    const files = await window.electronAPI.vault.readAll(vaultPath)
    const nodes = new Map<string, AureliusNode>()

    for (const { file, content } of files) {
      const node = parseNodeFromFile(file, content)
      nodes.set(node.id, node)
    }

    // Build backlinks
    const backlinksMap = buildBacklinks([...nodes.values()])
    for (const [id, backlinks] of backlinksMap) {
      const node = nodes.get(id)
      if (node) node.backlinks = backlinks
    }

    // If no nodes, create a welcome node
    if (nodes.size === 0) {
      const welcome = createNewNode('Welcome to Aurelius')
      welcome.content = 'This is your first node. Click any block to drill into it, or use [[Node Name]] to link nodes together.'
      nodes.set(welcome.id, welcome)
      const serialized = serializeNode(welcome)
      await window.electronAPI.vault.writeNode(vaultPath, welcome.filename, serialized)
      set({ nodes, currentNodeId: welcome.id, navigationStack: [welcome.id] })
    } else {
      const firstId = [...nodes.keys()][0]
      set({ nodes, currentNodeId: firstId, navigationStack: [firstId] })
    }
  },

  saveNode: async (node) => {
    const { vaultPath } = get()
    if (!vaultPath) return
    const serialized = serializeNode(node)
    await window.electronAPI.vault.writeNode(vaultPath, node.filename, serialized)
  },

  createNode: async (title, _parentId) => {
    const { vaultPath, nodes, saveNode } = get()
    const node = createNewNode(title)
    const updatedNodes = new Map(nodes)
    updatedNodes.set(node.id, node)
    set({ nodes: updatedNodes })
    if (vaultPath) await saveNode(node)
    return node
  },

  deleteNode: async (id) => {
    const { vaultPath, nodes } = get()
    const node = nodes.get(id)
    if (!node || !vaultPath) return
    await window.electronAPI.vault.deleteNode(vaultPath, node.filename)
    const updatedNodes = new Map(nodes)
    updatedNodes.delete(id)
    set({ nodes: updatedNodes })
  },

  updateNodeContent: (id, content, links) => {
    const { nodes } = get()
    const node = nodes.get(id)
    if (!node) return
    const updated = { ...node, content, links: links || node.links, updated: new Date().toISOString() }
    const updatedNodes = new Map(nodes)
    updatedNodes.set(id, updated)
    set({ nodes: updatedNodes })
  },

  navigateTo: (nodeId) => {
    const { navigationStack, currentNodeId } = get()
    if (currentNodeId === nodeId) return
    // If navigating to something already in stack, trim to that point
    const existingIndex = navigationStack.indexOf(nodeId)
    if (existingIndex >= 0) {
      set({ navigationStack: navigationStack.slice(0, existingIndex + 1), currentNodeId: nodeId })
    } else {
      set({ navigationStack: [...navigationStack, nodeId], currentNodeId: nodeId })
    }
  },

  navigateBack: () => {
    const { navigationStack } = get()
    if (navigationStack.length <= 1) return
    const newStack = navigationStack.slice(0, -1)
    set({ navigationStack: newStack, currentNodeId: newStack[newStack.length - 1] })
  },

  navigateToIndex: (index) => {
    const { navigationStack } = get()
    const newStack = navigationStack.slice(0, index + 1)
    set({ navigationStack: newStack, currentNodeId: newStack[index] })
  },

  setActiveView: (view) => set({ activeView: view }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}))
