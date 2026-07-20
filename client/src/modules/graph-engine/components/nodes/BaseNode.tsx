'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { cn } from '@/lib/utils'
import { useGraphStore } from '../../store/graphStore'
import { useNodeSelection } from '../../hooks/useNodeSelection'
import { useDriftSeed } from '../../hooks/useDriftSeed'
import { nodeTypeRegistry } from './nodeTypeRegistry'
import type { NodeModelData, NodeType } from '../../types/node.types'

type BaseNodeData = NodeModelData & { type: NodeType }

function BaseNodeComponent({ id, data }: NodeProps) {
  const nodeData = data as unknown as BaseNodeData
  const config = nodeTypeRegistry[nodeData.type]
  const isInteractive = useGraphStore((s) => s.status === 'interactive')
  const { isSelected, isHovered, isHighlighted } = useNodeSelection(id)
  const pulseCount = useGraphStore((s) => s.pulseCounters[id] ?? 0)
  const drift = useDriftSeed(id)
  const Icon = config.icon

  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <div
        style={
          {
            '--drift-x': `${drift.driftX}px`,
            '--drift-y': `${drift.driftY}px`,
            '--drift-duration': `${drift.duration}ms`,
            '--drift-delay': `${drift.delay}ms`,
          } as React.CSSProperties
        }
        className="node-drift"
      >
        <div
          style={{ '--glow-color': `var(${config.colorToken})` } as React.CSSProperties}
          className={cn(
            'node-materialize relative flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900/70 px-3 py-2 backdrop-blur-md transition-all duration-200 ease-out',
            isInteractive && 'cursor-pointer',
            isHovered && 'border-white/30 -translate-y-0.5',
            isSelected && 'border-[var(--glow-color)] ring-2 ring-[var(--glow-color)]/40',
            isHighlighted && !isSelected && 'border-white/25',
            !isHighlighted && !isSelected && !isHovered && 'opacity-90',
            config.glowIntensity === 'subtle' && 'shadow-[0_0_18px_-6px_var(--glow-color)]',
            config.glowIntensity === 'strong' && 'shadow-[0_0_28px_-4px_var(--glow-color)]',
          )}
        >
          {pulseCount > 0 ? (
            <span key={pulseCount} className="pointer-events-none absolute inset-0 rounded-xl animate-node-pulse" />
          ) : null}
          <Icon size={14} strokeWidth={2} style={{ color: `var(${config.colorToken})` }} />
          <span className="whitespace-nowrap text-xs font-medium text-zinc-100">{nodeData.label}</span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
    </div>
  )
}

export const BaseNode = memo(BaseNodeComponent)
