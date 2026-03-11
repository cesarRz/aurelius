import { useStore } from '../../store'

export function Breadcrumb() {
  const { navigationStack, nodes, navigateToIndex, navigateBack } = useStore()

  return (
    <div className="breadcrumb">
      <button
        className="breadcrumb-back"
        onClick={navigateBack}
        disabled={navigationStack.length <= 1}
        title="Go back (⌘[)"
      >
        ‹
      </button>
      {navigationStack.map((nodeId, index) => {
        const node = nodes.get(nodeId)
        if (!node) return null
        const isLast = index === navigationStack.length - 1
        return (
          <span key={nodeId} className="breadcrumb-segment">
            {index > 0 && <span className="breadcrumb-separator">/</span>}
            <button
              className={`breadcrumb-item ${isLast ? 'active' : ''}`}
              onClick={() => navigateToIndex(index)}
            >
              {node.title}
            </button>
          </span>
        )
      })}
    </div>
  )
}
