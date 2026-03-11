import { useState, useCallback, useRef, useImperativeHandle, forwardRef } from 'react'
import { Block, newBlock, blockType } from '../../lib/blocks'
import { useStore } from '../../store'
import { BlockRow } from './BlockRow'

export interface BlockEditorHandle {
  focusFirst: () => void
}

interface BlockEditorProps {
  blocks: Block[]
  nodeId: string
}

export const BlockEditor = forwardRef<BlockEditorHandle, BlockEditorProps>(function BlockEditor({ blocks: initialBlocks, nodeId }, ref) {
  const { updateNodeBlocks, nodes } = useStore()
  const [blocks, setBlocks] = useState<Block[]>(() =>
    initialBlocks.length > 0 ? initialBlocks : [newBlock()]
  )
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()

  // Sync external blocks changes (e.g. node navigation)
  const prevNodeId = useRef(nodeId)
  if (prevNodeId.current !== nodeId) {
    prevNodeId.current = nodeId
    const fresh = initialBlocks.length > 0 ? initialBlocks : [newBlock()]
    setBlocks(fresh)
    setFocusedBlockId(null)
  }

  useImperativeHandle(ref, () => ({
    focusFirst: () => {
      if (blocks.length > 0) {
        setFocusedBlockId(blocks[0].id)
      }
    }
  }), [blocks])

  const persistBlocks = useCallback((updated: Block[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      updateNodeBlocks(nodeId, updated)
    }, 500)
  }, [nodeId, updateNodeBlocks])

  const handleRawChange = useCallback((blockId: string, raw: string) => {
    setBlocks(prev => {
      const updated = prev.map(b =>
        b.id === blockId ? { ...b, raw, type: blockType(raw) } : b
      )
      persistBlocks(updated)
      return updated
    })
  }, [persistBlocks])

  const handleEnter = useCallback((blockId: string, caretPos: number, currentRaw: string) => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === blockId)
      if (idx === -1) return prev

      const before = currentRaw.slice(0, caretPos)
      const after = currentRaw.slice(caretPos)

      const updatedCurrent = { ...prev[idx], raw: before, type: blockType(before) }
      const newB = newBlock(after)

      const updated = [
        ...prev.slice(0, idx),
        updatedCurrent,
        newB,
        ...prev.slice(idx + 1),
      ]
      persistBlocks(updated)
      setFocusedBlockId(newB.id)
      return updated
    })
  }, [persistBlocks])

  const handleBackspace = useCallback((blockId: string) => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === blockId)
      if (idx <= 0) return prev

      const current = prev[idx]
      const prevBlock = prev[idx - 1]

      // Merge current block text into previous
      const mergedRaw = prevBlock.raw + current.raw
      const mergedBlock = { ...prevBlock, raw: mergedRaw, type: blockType(mergedRaw) }

      const updated = [
        ...prev.slice(0, idx - 1),
        mergedBlock,
        ...prev.slice(idx + 1),
      ]
      persistBlocks(updated)
      setFocusedBlockId(prevBlock.id)
      return updated
    })
  }, [persistBlocks])

  const handleTab = useCallback((blockId: string, shift: boolean) => {
    setBlocks(prev => {
      const updated = prev.map(b => {
        if (b.id !== blockId) return b
        const newDepth = shift ? Math.max(0, b.depth - 1) : b.depth + 1
        return { ...b, depth: newDepth }
      })
      persistBlocks(updated)
      return updated
    })
  }, [persistBlocks])

  const handleFocus = useCallback((blockId: string) => {
    setFocusedBlockId(blockId)
  }, [])

  const handleBlur = useCallback(() => {
    setFocusedBlockId(null)
  }, [])

  const handleNavigate = useCallback((blockId: string, direction: 'up' | 'down') => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === blockId)
      const targetIdx = direction === 'down' ? idx + 1 : idx - 1
      if (targetIdx >= 0 && targetIdx < prev.length) {
        setFocusedBlockId(prev[targetIdx].id)
      }
      return prev
    })
  }, [])

  return (
    <div className="block-editor">
      {blocks.map((block, i) => (
        <BlockRow
          key={block.id}
          block={block}
          nodeId={nodeId}
          isFirst={i === 0}
          onEnter={handleEnter}
          onBackspace={handleBackspace}
          onTab={handleTab}
          onRawChange={handleRawChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onNavigate={handleNavigate}
          focusedBlockId={focusedBlockId}
          allNodes={nodes}
        />
      ))}
    </div>
  )
})
