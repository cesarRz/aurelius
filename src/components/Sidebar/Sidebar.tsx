import { useState } from 'react'
import { useStore } from '../../store'

export function Sidebar() {
  const { nodes, sidebarOpen, navigateTo, currentNodeId, deleteNode, createNode, tagIndex, activeTag, setActiveTag } = useStore()
  const [search, setSearch] = useState('')

  if (!sidebarOpen) return null

  const handleNewNode = async () => {
    const node = await createNode('Untitled')
    navigateTo(node.id)
  }

  const allNodes = [...nodes.values()]

  const nodeList = allNodes
    .filter(n => {
      const isTopLevel = !n.parentNodeId
      const matchSearch = n.title.toLowerCase().includes(search.toLowerCase())
      const matchTag = activeTag ? n.tags.includes(activeTag) : true
      return isTopLevel && matchSearch && matchTag
    })
    .sort((a, b) => b.updated.localeCompare(a.updated))

  const tags = [...tagIndex.keys()].sort()

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <input
          type="text"
          placeholder="Search nodes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sidebar-search-input"
        />
        <button className="sidebar-new-btn" onClick={handleNewNode} title="New note">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
      <div className="sidebar-list">
        {nodeList.map(node => (
          <div
            key={node.id}
            className={`sidebar-item ${node.id === currentNodeId ? 'active' : ''}`}
            onClick={() => navigateTo(node.id)}
          >
            <span className="sidebar-item-title">{node.title}</span>
            <button
              className="sidebar-item-delete"
              onClick={(e) => {
                e.stopPropagation()
                deleteNode(node.id)
              }}
              title="Delete node"
            >
              ×
            </button>
          </div>
        ))}
        {nodeList.length === 0 && (
          <div className="sidebar-empty">No nodes found</div>
        )}
      </div>

      {tags.length > 0 && (
        <div className="tag-section">
          <div className="tag-section-label">Tags</div>
          <div className="tag-list">
            {tags.map(tag => (
              <span
                key={tag}
                className={`tag-pill ${activeTag === tag ? 'active' : ''}`}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
