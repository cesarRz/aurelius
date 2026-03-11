import { useState, useEffect, useRef } from 'react'
import { useStore } from '../../store'
import { searchNodes, highlightExcerpt } from '../../lib/search'

export function SearchModal() {
  const { nodes, navigateTo, setSearchOpen } = useStore()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = searchNodes(nodes, query)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const confirm = (nodeId: string) => {
    navigateTo(nodeId)
    setSearchOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const result = results[selectedIndex]
      if (result) confirm(result.nodeId)
    } else if (e.key === 'Escape') {
      setSearchOpen(false)
    }
  }

  return (
    <div className="search-modal-overlay" onClick={() => setSearchOpen(false)}>
      <div className="search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="search-input-wrap">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            ref={inputRef}
            className="search-input"
            placeholder="Search all nodes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="search-results">
          {results.length === 0 && query.trim() && (
            <div className="search-empty">No results for "{query}"</div>
          )}
          {results.length === 0 && !query.trim() && (
            <div className="search-empty">Start typing to search…</div>
          )}
          {results.map((result, i) => (
            <div
              key={result.nodeId}
              className={`search-result ${i === selectedIndex ? 'search-result-selected' : ''}`}
              onClick={() => confirm(result.nodeId)}
              onMouseEnter={() => setSelectedIndex(i)}
              style={i === selectedIndex ? { background: 'var(--bg-hover)' } : {}}
            >
              <div
                className="search-result-title"
                dangerouslySetInnerHTML={{
                  __html: highlightExcerpt(result.title, query)
                }}
              />
              {result.excerpt && result.excerpt !== result.title && (
                <div
                  className="search-result-excerpt"
                  dangerouslySetInnerHTML={{
                    __html: highlightExcerpt(result.excerpt, query)
                  }}
                />
              )}
            </div>
          ))}
        </div>

        <div className="search-hint">↑↓ navigate · Enter to open · Esc to close</div>
      </div>
    </div>
  )
}
