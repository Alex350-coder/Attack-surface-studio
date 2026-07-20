'use client'

import { useCallback, useEffect } from 'react'
import { useGraphStore } from '../store/graphStore'

export function useGraphInteraction() {
  const selectNode = useGraphStore((s) => s.selectNode)
  const focusNode = useGraphStore((s) => s.focusNode)
  const closeInspector = useGraphStore((s) => s.closeInspector)

  const deselect = useCallback(() => {
    selectNode(null)
    focusNode(null)
    closeInspector()
  }, [selectNode, focusNode, closeInspector])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') deselect()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [deselect])

  return { handlePaneClick: deselect }
}
