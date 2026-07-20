'use client'

import { cn } from '@/lib/utils'
import { GraphProvider } from './GraphProvider'
import { GraphViewport } from './GraphViewport'
import { GraphOverlay } from './GraphOverlay'
import { GraphInspectorPanel } from './GraphInspectorPanel'
import type { GraphModel } from '../types/graph.types'
import type { NodeModel } from '../types/node.types'
import type { TimelineScript } from '../types/timeline.types'
import type { GraphTheme } from '../theme/graphTheme'

interface GraphEngineProps {
  data: GraphModel
  timeline?: TimelineScript
  theme?: Partial<GraphTheme>
  onNodeSelect?: (node: NodeModel) => void
  className?: string
}

export function GraphEngine({ data, timeline, theme, onNodeSelect, className }: GraphEngineProps) {
  return (
    <GraphProvider data={data} theme={theme} onNodeSelect={onNodeSelect}>
      <div className={cn('relative h-full w-full overflow-hidden', className)}>
        <GraphViewport timeline={timeline} />
        <GraphOverlay />
        <GraphInspectorPanel />
      </div>
    </GraphProvider>
  )
}
