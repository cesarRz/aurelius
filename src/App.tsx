import { useEffect } from 'react'
import { useStore } from './store'
import { Sidebar } from './components/Sidebar/Sidebar'
import { WelcomeScreen } from './components/Sidebar/WelcomeScreen'
import { Editor } from './components/Editor/Editor'
import { GraphView } from './components/Graph/GraphView'
import { Breadcrumb } from './components/Breadcrumb/Breadcrumb'
import { SearchModal } from './components/Search/SearchModal'
import './styles/global.css'

export default function App() {
  const {
    vaultPath, setVaultPath, loadNodes,
    activeView, setActiveView,
    sidebarOpen, setSidebarOpen,
    searchOpen, setSearchOpen,
  } = useStore()

  // On mount, check for stored vault path
  useEffect(() => {
    const init = async () => {
      console.log('[App] init: calling getPath...')
      const stored = await window.electronAPI.vault.getPath()
      console.log('[App] stored vaultPath:', stored)
      if (stored) {
        setVaultPath(stored)
        console.log('[App] calling loadNodes...')
        await loadNodes(stored)
        console.log('[App] loadNodes complete')
      } else {
        console.log('[App] no stored path, showing WelcomeScreen')
      }
    }
    init().catch(err => console.error('[App] init error:', err))
  }, [])

  // Global keyboard shortcut: ⌘K for search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setSearchOpen])

  if (!vaultPath) {
    return <WelcomeScreen />
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

        {/* Search button */}
        <button
          className="search-btn titlebar-no-drag"
          onClick={() => setSearchOpen(true)}
          title="Search (⌘K)"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M9 9L12 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          Search
        </button>

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

      </div>

      {/* Main area */}
      <div className="main-area">
        <Sidebar />
        <div className="content-area">
          {activeView === 'editor' ? <Editor /> : <GraphView />}
        </div>
      </div>

      {/* Search modal */}
      {searchOpen && <SearchModal />}
    </div>
  )
}
