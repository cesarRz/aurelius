import { useRef } from 'react'
import { useStore } from '../../store'
import { BlockEditor, BlockEditorHandle } from './BlockEditor'

export function Editor() {
  const { nodes, currentNodeId, saveNode, updateNodeContent } = useStore()
  const blockEditorRef = useRef<BlockEditorHandle>(null)

  const currentNode = currentNodeId ? nodes.get(currentNodeId) : null

  if (!currentNode) {
    return (
      <div className="editor-empty">
        <p>Select a node from the sidebar or create a new one.</p>
      </div>
    )
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLHeadingElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.currentTarget.blur()
      blockEditorRef.current?.focusFirst()
    }
  }

  const handleTitleBlur = (e: React.FocusEvent<HTMLHeadingElement>) => {
    const title = e.currentTarget.textContent?.trim() || 'Untitled'
    if (title !== currentNode.title) {
      const updated = { ...currentNode, title, updated: new Date().toISOString() }
      const updatedNodes = new Map(nodes)
      updatedNodes.set(currentNode.id, updated)
      const { navigationStack } = useStore.getState()
      const updatedStack = navigationStack.map(entry =>
        entry.nodeId === currentNode.id ? { ...entry, label: title } : entry
      )
      useStore.setState({ nodes: updatedNodes, navigationStack: updatedStack })
      saveNode(updated)
    }
  }

  const backlinks = currentNode.backlinks
    .map(id => nodes.get(id))
    .filter(Boolean)

  return (
    <div className="editor">
      <div className="editor-header">
        <h1
          className="editor-title"
          contentEditable
          suppressContentEditableWarning
          onKeyDown={handleTitleKeyDown}
          onBlur={handleTitleBlur}
        >
          {currentNode.title}
        </h1>
      </div>

      <BlockEditor
        key={currentNode.id}
        ref={blockEditorRef}
        blocks={currentNode.blocks}
        nodeId={currentNode.id}
      />

      {backlinks.length > 0 && (
        <div className="backlinks-panel">
          <h3 className="backlinks-title">Backlinks</h3>
          {backlinks.map(node => node && (
            <div
              key={node.id}
              className="backlink-item"
              onClick={() => useStore.getState().navigateTo(node.id)}
            >
              {node.title}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
