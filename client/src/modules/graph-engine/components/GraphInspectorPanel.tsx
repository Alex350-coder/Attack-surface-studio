'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useGraphStore } from '../store/graphStore'
import { nodeTypeRegistry } from './nodes/nodeTypeRegistry'
import type { NodeModel } from '../types/node.types'

export function GraphInspectorPanel() {
  const isOpen = useGraphStore((s) => s.inspectorOpen)
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId)
  const nodes = useGraphStore((s) => s.nodes)
  const closeInspector = useGraphStore((s) => s.closeInspector)
  const selectNode = useGraphStore((s) => s.selectNode)
  const focusNode = useGraphStore((s) => s.focusNode)

  const node = nodes.find((n) => n.id === selectedNodeId)

  function handleClose() {
    closeInspector()
    selectNode(null)
    focusNode(null)
  }

  return (
    <AnimatePresence>
      {isOpen && node ? (
        <motion.aside
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          className="absolute right-0 top-0 z-30 h-full w-full max-w-sm overflow-y-auto border-l border-white/10 bg-zinc-950/85 p-6 shadow-2xl backdrop-blur-xl"
        >
          <InspectorHeader node={node} onClose={handleClose} />
          <InspectorSections node={node} />
        </motion.aside>
      ) : null}
    </AnimatePresence>
  )
}

interface InspectorPartProps {
  node: NodeModel
}

function InspectorHeader({ node, onClose }: InspectorPartProps & { onClose: () => void }) {
  const config = nodeTypeRegistry[node.type]
  const Icon = config.icon

  return (
    <div className="mb-6 flex items-start justify-between">
      <div className="flex items-center gap-3">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10"
          style={{ backgroundColor: `color-mix(in oklch, var(${config.colorToken}) 18%, transparent)` }}
        >
          <Icon size={16} style={{ color: `var(${config.colorToken})` }} />
        </span>
        <div>
          <p className="text-sm font-semibold text-zinc-50">{node.data.label}</p>
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">{config.category}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close inspector panel"
        className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-200"
      >
        <X size={16} />
      </button>
    </div>
  )
}

function InspectorSections({ node }: InspectorPartProps) {
  const { data } = node

  return (
    <div className="flex flex-col gap-6">
      {data.description ? (
        <Section title="Description">
          <p className="text-sm text-zinc-400">{data.description}</p>
        </Section>
      ) : null}

      {data.properties?.length ? (
        <Section title="Properties">
          <dl className="flex flex-col gap-2">
            {data.properties.map((property) => (
              <div key={property.label} className="flex items-center justify-between text-sm">
                <dt className="text-zinc-500">{property.label}</dt>
                <dd className="font-medium text-zinc-200">{property.value}</dd>
              </div>
            ))}
          </dl>
        </Section>
      ) : null}

      {data.relationships?.length ? (
        <Section title="Relationships">
          <ul className="flex flex-col gap-1.5">
            {data.relationships.map((relationship) => (
              <li key={`${relationship.nodeId}-${relationship.label}`} className="text-sm text-zinc-400">
                {relationship.label}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {data.findings?.length ? (
        <Section title="Findings">
          <ul className="flex flex-col gap-2">
            {data.findings.map((finding) => (
              <li key={finding.title} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <p className="text-sm font-medium text-zinc-200">{finding.title}</p>
                <p className="mt-1 text-xs text-zinc-500">{finding.description}</p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {data.evidence?.length ? (
        <Section title="Evidence">
          <ul className="flex flex-col gap-2">
            {data.evidence.map((item) => (
              <li key={item.title} className="text-sm text-zinc-400">
                <span className="font-medium text-zinc-200">{item.title}</span> — {item.description}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {data.notes?.length ? (
        <Section title="Notes">
          <ul className="flex flex-col gap-1.5">
            {data.notes.map((note) => (
              <li key={note} className="text-sm text-zinc-400">
                {note}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {data.timeline?.length ? (
        <Section title="Timeline">
          <ul className="flex flex-col gap-2">
            {data.timeline.map((entry) => (
              <li key={`${entry.label}-${entry.timestamp}`} className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">{entry.label}</span>
                <span className="text-xs text-zinc-600">{entry.timestamp}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{title}</h3>
      {children}
    </section>
  )
}
