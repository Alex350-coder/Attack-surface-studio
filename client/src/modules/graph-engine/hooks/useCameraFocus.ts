'use client'

import { useEffect } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useGraphStore } from '../store/graphStore'
import type { NodeModel } from '../types/node.types'

export function useCameraFocus(nodes: NodeModel[]) {
  const { setCenter, fitView } = useReactFlow()
  const focusTargetId = useGraphStore((s) => s.focusTargetId)
  const status = useGraphStore((s) => s.status)

  useEffect(() => {
    if (status === 'playing') return

    if (!focusTargetId) {
      fitView({ duration: 500, padding: 0.2 })
      return
    }

    const node = nodes.find((n) => n.id === focusTargetId)
    if (!node?.position) return

    setCenter(node.position.x + 60, node.position.y, { zoom: 1.3, duration: 700 })
  }, [focusTargetId, nodes, status, setCenter, fitView])
}
