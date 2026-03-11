import { useRef, useState, useEffect, useCallback } from 'react'
import { Block } from '../../lib/blocks'
import { useStore } from '../../store'

interface BlockRowProps {
  block: Block
  nodeId: string
  isFirst: boolean
  onEnter: (blockId: string, caretPos: number, currentRaw: string) => void
  onBackspace: (blockId: string) => void
  onTab: (blockId: string, shift: boolean) => void
  onRawChange: (blockId: string, raw: string) => void
  onFocus: (blockId: string) => void
  onBlur: () => void
  onNavigate: (blockId: string, direction: 'up' | 'down') => void
  focusedBlockId: string | null
  allNodes: Map<string, import('../../lib/parser').AureliusNode>
}

// Render markdown inline: bold, italic, [[links]], #tags, headings stripped
function renderMarkdown(raw: string, onLinkClick: (title: string) => void, onTagClick: (tag: string) => void): React.ReactNode[] {
  // Split by tokens: **bold**, *italic*, [[link]], #tag
  const parts: React.ReactNode[] = []
  const regex = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(\[\[([^\]]+)\]\])|((?:^|\s)(#[a-zA-Z][a-zA-Z0-9_-]*))/g
  let last = 0
  let match

  while ((match = regex.exec(raw)) !== null) {
    if (match.index > last) {
      parts.push(raw.slice(last, match.index))
    }
    if (match[1]) {
      // **bold**
      parts.push(<strong key={match.index}>{match[2]}</strong>)
    } else if (match[3]) {
      // *italic*
      parts.push(<em key={match.index}>{match[4]}</em>)
    } else if (match[5]) {
      // [[link]]
      const title = match[6]
      parts.push(
        <span
          key={match.index}
          className="block-wiki-link"
          onClick={(e) => { e.stopPropagation(); onLinkClick(title) }}
        >
          {title}
        </span>
      )
    } else if (match[7]) {
      // #tag — might have leading space
      const full = match[7] // e.g. " #tag"
      const tagMatch = full.match(/#([a-zA-Z][a-zA-Z0-9_-]*)/)
      if (tagMatch) {
        const leading = full.slice(0, full.indexOf('#'))
        if (leading) parts.push(leading)
        parts.push(
          <span
            key={match.index}
            className="block-tag"
            onClick={(e) => { e.stopPropagation(); onTagClick(tagMatch[1]) }}
          >
            #{tagMatch[1]}
          </span>
        )
      } else {
        parts.push(full)
      }
    }
    last = match.index + match[0].length
  }
  if (last < raw.length) parts.push(raw.slice(last))
  return parts
}

function getDisplayRaw(raw: string): string {
  // Strip heading markers for display in rendered mode, keep them in edit mode
  return raw
}

export function BlockRow({
  block,
  nodeId,
  isFirst,
  onEnter,
  onBackspace,
  onTab,
  onRawChange,
  onFocus,
  onBlur: onBlurProp,
  onNavigate,
  focusedBlockId,
  allNodes,
}: BlockRowProps) {
  const { drillIntoBlock, navigateTo, setActiveTag } = useStore()
  const editRef = useRef<HTMLDivElement>(null)
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [autocompleteQuery, setAutocompleteQuery] = useState('')
  const [autocompletePos, setAutocompletePos] = useState({ top: 0, left: 0 })
  const [autocompleteIndex, setAutocompleteIndex] = useState(0)

  const isFocused = focusedBlockId === block.id

  // When this block becomes focused, sync its text content and move caret to end
  useEffect(() => {
    if (isFocused && editRef.current) {
      editRef.current.textContent = block.raw
      editRef.current.focus()
      const range = document.createRange()
      const sel = window.getSelection()
      range.selectNodeContents(editRef.current)
      range.collapse(false)
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
  }, [isFocused])

  const handleFocus = () => {
    onFocus(block.id)
  }

  const handleBlur = () => {
    setShowAutocomplete(false)
    const raw = editRef.current?.textContent ?? ''
    onRawChange(block.id, raw)
    onBlurProp()
  }

  const detectAutocomplete = useCallback(() => {
    const el = editRef.current
    if (!el) return
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const range = sel.getRangeAt(0)
    const text = el.textContent ?? ''
    const caretPos = range.startOffset

    // Find last [[ before caret
    const before = text.slice(0, caretPos)
    const openIdx = before.lastIndexOf('[[')
    const closeIdx = before.lastIndexOf(']]')

    if (openIdx !== -1 && openIdx > closeIdx) {
      const query = before.slice(openIdx + 2)
      setAutocompleteQuery(query)
      // Position below caret
      const rect = range.getBoundingClientRect()
      setAutocompletePos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX })
      setAutocompleteIndex(0)
      setShowAutocomplete(true)
    } else {
      setShowAutocomplete(false)
    }
  }, [])

  const handleInput = () => {
    detectAutocomplete()
  }

  const getAutocompleteResults = () => {
    const q = autocompleteQuery.toLowerCase()
    const results = [...allNodes.values()]
      .filter(n => n.id !== nodeId && n.title.toLowerCase().includes(q))
      .slice(0, 8)
    return results
  }

  const confirmAutocomplete = (title: string) => {
    const el = editRef.current
    if (!el) return
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const range = sel.getRangeAt(0)
    const text = el.textContent ?? ''
    const caretPos = range.startOffset
    const before = text.slice(0, caretPos)
    const openIdx = before.lastIndexOf('[[')
    // Replace [[query with [[title]]
    const newText = text.slice(0, openIdx) + `[[${title}]]` + text.slice(caretPos)
    el.textContent = newText
    // Move caret after ]]
    const newPos = openIdx + title.length + 4
    const newRange = document.createRange()
    const textNode = el.firstChild
    if (textNode) {
      newRange.setStart(textNode, Math.min(newPos, textNode.textContent?.length ?? 0))
      newRange.collapse(true)
      sel.removeAllRanges()
      sel.addRange(newRange)
    }
    setShowAutocomplete(false)
    onRawChange(block.id, newText)
  }

  const createAndConfirm = async (query: string) => {
    const { createNode } = useStore.getState()
    const node = await createNode(query)
    confirmAutocomplete(node.title)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (showAutocomplete) {
      const results = getAutocompleteResults()
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setAutocompleteIndex(i => Math.min(i + 1, results.length))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setAutocompleteIndex(i => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (autocompleteIndex < results.length) {
          confirmAutocomplete(results[autocompleteIndex].title)
        } else {
          createAndConfirm(autocompleteQuery)
        }
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setShowAutocomplete(false)
        return
      }
    }

    if (e.key === 'ArrowDown' && !e.shiftKey) {
      const el = editRef.current
      const sel = window.getSelection()
      const text = el?.textContent ?? ''
      const caretPos = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).startOffset : 0
      if (caretPos >= text.length) {
        e.preventDefault()
        onNavigate(block.id, 'down')
        return
      }
    }

    if (e.key === 'ArrowUp' && !e.shiftKey) {
      const el = editRef.current
      const sel = window.getSelection()
      const caretPos = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).startOffset : 0
      if (caretPos === 0) {
        e.preventDefault()
        onNavigate(block.id, 'up')
        return
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const el = editRef.current
      const sel = window.getSelection()
      const caretPos = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).startOffset : (el?.textContent?.length ?? 0)
      const raw = el?.textContent ?? ''
      onEnter(block.id, caretPos, raw)
      return
    }

    if (e.key === 'Backspace') {
      const el = editRef.current
      const text = el?.textContent ?? ''
      const sel = window.getSelection()
      const caretPos = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).startOffset : 0
      if (text === '' || (caretPos === 0 && text === '')) {
        e.preventDefault()
        onBackspace(block.id)
        return
      }
    }

    if (e.key === 'Tab') {
      e.preventDefault()
      onTab(block.id, e.shiftKey)
    }
  }

  const handleDrillDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    drillIntoBlock(block, nodeId)
  }

  const handleLinkClick = (title: string) => {
    const target = [...allNodes.values()].find(n => n.title.toLowerCase() === title.toLowerCase())
    if (target) navigateTo(target.id)
  }

  const handleTagClick = (tag: string) => {
    setActiveTag(tag)
  }

  const autocompleteResults = getAutocompleteResults()
  const hasChild = !!block.childNodeId

  // Determine CSS class for block type
  const typeClass = `block-type-${block.type}`

  return (
    <div className={`block-row ${hasChild ? 'block-has-child' : ''} ${typeClass} ${isFocused ? 'block-focused' : ''}`}>
      {/* Left gutter with drill-down icon */}
      <div className="block-gutter" onClick={handleDrillDown} title="Drill into this block">
        <span className="block-drill-icon">
          {hasChild ? '↗' : '⊕'}
        </span>
      </div>

      {/* Block content — edit div always in DOM but hidden when not focused */}
      <div
        ref={editRef}
        className="block-edit"
        contentEditable
        suppressContentEditableWarning
        onFocus={handleFocus}
        onBlur={handleBlur}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        data-block-id={block.id}
        data-placeholder={isFirst ? 'Write something…' : ''}
        style={{ display: isFocused ? 'block' : 'none' }}
      />
      {!isFocused && (
        <div
          className="block-render"
          onClick={handleFocus}
          data-block-id={block.id}
        >
          {block.raw
            ? renderMarkdown(block.raw, handleLinkClick, handleTagClick)
            : <span className="block-placeholder">{isFirst ? 'Write something…' : ''}</span>
          }
        </div>
      )}

      {/* Link autocomplete dropdown */}
      {showAutocomplete && (
        <div
          className="link-autocomplete"
          style={{ top: autocompletePos.top, left: autocompletePos.left }}
        >
          {autocompleteResults.map((node, i) => (
            <div
              key={node.id}
              className={`link-autocomplete-item ${i === autocompleteIndex ? 'selected' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); confirmAutocomplete(node.title) }}
            >
              {node.title}
            </div>
          ))}
          <div
            className={`link-autocomplete-item link-autocomplete-create ${autocompleteIndex === autocompleteResults.length ? 'selected' : ''}`}
            onMouseDown={(e) => { e.preventDefault(); createAndConfirm(autocompleteQuery) }}
          >
            + Create "{autocompleteQuery}"
          </div>
        </div>
      )}
    </div>
  )
}
