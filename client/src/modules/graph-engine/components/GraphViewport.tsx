'use client'

import '@xyflow/react/dist/style.css'
import { ReactFlowProvider } from '@xyflow/react'
import { GraphRenderer } from './GraphRenderer'
import { useGraphTimeline } from '../hooks/useGraphTimeline'
import { useCameraFocus } from '../hooks/useCameraFocus'
import { useGraphStore } from '../store/graphStore'
import type { TimelineScript } from '../types/timeline.types'

interface GraphViewportProps {
  timeline?: TimelineScript
}

function GraphCamera() {
  const nodes = useGraphStore((s) => s.nodes)
  useCameraFocus(nodes)
  return null
}

export function GraphViewport({ timeline }: GraphViewportProps) {
  useGraphTimeline(timeline)

  return (
    <ReactFlowProvider>
      <GraphRenderer />
      <GraphCamera />
    </ReactFlowProvider>
  )
}
