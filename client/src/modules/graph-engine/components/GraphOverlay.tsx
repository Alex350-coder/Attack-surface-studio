'use client'

import { useGraphStore } from '../store/graphStore'
import { nodeTypeRegistry } from './nodes/nodeTypeRegistry'

const LEGEND_ENTRIES: Array<{ label: string; type: keyof typeof nodeTypeRegistry }> = [
  { label: 'Infrastructure', type: 'host' },
  { label: 'Finding', type: 'finding' },
  { label: 'Critical', type: 'criticalFinding' },
  { label: 'Intelligence', type: 'aiInsight' },
]

export function GraphOverlay() {
  const status = useGraphStore((s) => s.status)

  if (status === 'idle') return null

  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-20 hidden gap-3 rounded-full border border-white/10 bg-zinc-950/60 px-4 py-2 backdrop-blur-md md:flex">
      {LEGEND_ENTRIES.map((entry) => {
        const config = nodeTypeRegistry[entry.type]
        return (
          <span key={entry.type} className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: `var(${config.colorToken})` }} />
            {entry.label}
          </span>
        )
      })}
    </div>
  )
}
