'use client'

import { memo } from 'react'
import { BaseEdge as FlowBaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react'
import { cn } from '@/lib/utils'
import { useGraphStore } from '../../store/graphStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { edgeTypeRegistry } from './edgeTypeRegistry'
import type { EdgeType } from '../../types/edge.types'

interface BaseEdgeData {
  type: EdgeType
  animated?: boolean
}

function BaseEdgeComponent({
  id,
  source,
  target,
  data,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
}: EdgeProps) {
  const edgeData = data as unknown as BaseEdgeData
  const config = edgeTypeRegistry[edgeData.type]
  const isHighlighted = useGraphStore((s) => s.highlightedEdgeIds.has(id))
  const isEndpointActive = useGraphStore(
    (s) =>
      s.hoveredNodeId === source ||
      s.hoveredNodeId === target ||
      s.selectedNodeId === source ||
      s.selectedNodeId === target,
  )
  const prefersReducedMotion = useReducedMotion()

  const [edgePath] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })
  const isActive = isHighlighted || isEndpointActive
  const isFlowing = (edgeData.animated ?? config.defaultAnimated ?? false) || isActive
  // Grow-in reveal relies on pathLength normalization, which would corrupt the
  // real-unit dasharray used by flowing/dashed edges — so it's scoped to plain idle edges.
  const usesGrowReveal = !isFlowing && !config.dashed
  const showPacket = isActive && !prefersReducedMotion
  const motionPathId = `${id}-motion-path`

  return (
    <>
      <FlowBaseEdge
        id={id}
        path={edgePath}
        pathLength={usesGrowReveal ? 1 : undefined}
        style={{
          stroke: `var(${config.colorToken})`,
          strokeWidth: isActive ? 2 : 1.25,
          strokeDasharray: config.dashed ? '6 4' : undefined,
          opacity: isActive ? 0.95 : 0.4,
          transition: 'opacity 200ms ease-out, stroke-width 200ms ease-out',
        }}
        className={cn(isFlowing && 'graph-edge-flow', usesGrowReveal && 'edge-grow')}
      />
      {showPacket ? (
        <>
          <path id={motionPathId} d={edgePath} fill="none" stroke="none" />
          <circle
            r={2.5}
            className="graph-edge-packet"
            style={{ fill: `var(${config.colorToken})`, color: `var(${config.colorToken})` }}
          >
            <animateMotion dur="1.1s" repeatCount="indefinite" rotate="auto">
              <mpath href={`#${motionPathId}`} />
            </animateMotion>
          </circle>
        </>
      ) : null}
    </>
  )
}

export const BaseEdge = memo(BaseEdgeComponent)
