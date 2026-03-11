import { useState } from 'react'
import { useStore } from '../../store'

export function Sidebar() {
  const { nodes, sidebarOpen, navigateTo, currentNodeId, deleteNode } = useStore()
  const [search, setSearch] = useState('')

  if (!sidebarOpen) return null

  const nodeList = [...nodes.values()]
    .filter(n => n.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.updated.localeCompare(a.updated))

  return (
    <div className="sidebar">
      <div className="sidebar-search">
        <input
          type="text"
          placeholder="Search nodes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sidebar-search-input"
        />
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
    </div>
  )
}
