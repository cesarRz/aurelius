import { useEffect } from 'react'
import { useStore } from './store'
import { Sidebar } from './components/Sidebar/Sidebar'
import { WelcomeScreen } from './components/Sidebar/WelcomeScreen'
import { Editor } from './components/Editor/Editor'
import { GraphView } from './components/Graph/GraphView'
import { Breadcrumb } from './components/Breadcrumb/Breadcrumb'
import './styles/global.css'

export default function App() {
  const {
    vaultPath, setVaultPath, loadNodes,
    activeView, setActiveView,
    sidebarOpen, setSidebarOpen,
    createNode, navigateTo,
  } = useStore()

  // On mount, check for stored vault path
  useEffect(() => {
    const init = async () => {
      const stored = await window.electronAPI.vault.getPath()
      if (stored) {
        setVaultPath(stored)
        await loadNodes(stored)
      }
    }
    init()
  }, [])

  if (!vaultPath) {
    return <WelcomeScreen />
  }

  const handleNewNode = async () => {
    const node = await createNode('Untitled')
    navigateTo(node.id)
  }

  return (
    <div className="app-layout">
      {/* Titlebar */}
      <div className="titlebar">
        {/* Sidebar toggle */}
        <button
          className={`toolbar-btn titlebar-no-drag ${sidebarOpen ? 'active' : ''}`}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          title="Toggle sidebar"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="2" width="4" height="10" rx="1" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M8 4h4M8 7h4M8 10h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Breadcrumb */}
        <div className="titlebar-no-drag" style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <Breadcrumb />
        </div>

        {/* View toggle */}
        <div className="view-toggle titlebar-no-drag">
          <button
            className={`view-toggle-btn ${activeView === 'editor' ? 'active' : ''}`}
            onClick={() => setActiveView('editor')}
          >
            Edit
          </button>
          <button
            className={`view-toggle-btn ${activeView === 'graph' ? 'active' : ''}`}
            onClick={() => setActiveView('graph')}
          >
            Graph
          </button>
        </div>

        {/* New node */}
        <button className="new-node-btn titlebar-no-drag" onClick={handleNewNode}>
          + New node
        </button>
      </div>

      {/* Main area */}
      <div className="main-area">
        <Sidebar />
        <div className="content-area">
          {activeView === 'editor' ? <Editor /> : <GraphView />}
        </div>
      </div>
    </div>
  )
}
