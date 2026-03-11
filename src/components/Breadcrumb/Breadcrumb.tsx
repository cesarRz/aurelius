import { useStore } from '../../store'

export function Breadcrumb() {
  const { navigationStack, navigateToIndex, navigateBack } = useStore()

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
      {navigationStack.map((entry, index) => {
        const isLast = index === navigationStack.length - 1
        return (
          <span key={`${entry.nodeId}-${index}`} className="breadcrumb-segment">
            {index > 0 && <span className="breadcrumb-separator">/</span>}
            <button
              className={`breadcrumb-item ${isLast ? 'active' : ''}`}
              onClick={() => navigateToIndex(index)}
            >
              {entry.label}
            </button>
          </span>
        )
      })}
    </div>
  )
}
