import { useEffect, useRef, useCallback } from 'react'
import { useStore } from '../../store'

export function Editor() {
  const { nodes, currentNodeId, updateNodeContent, saveNode } = useStore()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>()

  const currentNode = currentNodeId ? nodes.get(currentNodeId) : null

  const debouncedSave = useCallback((node: typeof currentNode) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      if (node) saveNode(node)
    }, 500)
  }, [saveNode])

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (textareaRef.current && currentNode) {
      textareaRef.current.value = currentNode.content
    }
  }, [currentNodeId])

  if (!currentNode) {
    return (
      <div className="editor-empty">
        <p>Select a node from the sidebar or create a new one.</p>
      </div>
    )
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const content = e.target.value
    updateNodeContent(currentNode.id, content)
    const updated = { ...currentNode, content, updated: new Date().toISOString() }
    debouncedSave(updated)
  }

  // Extract backlinks
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
          onBlur={(e) => {
            const title = e.currentTarget.textContent || 'Untitled'
            const updated = { ...currentNode, title, updated: new Date().toISOString() }
            updateNodeContent(currentNode.id, currentNode.content)
            saveNode({ ...updated, content: currentNode.content })
          }}
        >
          {currentNode.title}
        </h1>
      </div>
      <textarea
        ref={textareaRef}
        className="editor-content"
        defaultValue={currentNode.content}
        onChange={handleChange}
        placeholder="Start writing…"
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
