import type { EdgeType } from '../../types/edge.types'

export interface EdgeTypeConfig {
  type: EdgeType
  label: string
  colorToken: string
  dashed: boolean
  defaultAnimated?: boolean
}

export const edgeTypeRegistry: Record<EdgeType, EdgeTypeConfig> = {
  discovery: { type: 'discovery', label: 'Discovery', colorToken: '--edge-discovery', dashed: false, defaultAnimated: true },
  relationship: { type: 'relationship', label: 'Relationship', colorToken: '--edge-relationship', dashed: false },
  evidence: { type: 'evidence', label: 'Evidence', colorToken: '--edge-evidence', dashed: true },
  risk: { type: 'risk', label: 'Risk', colorToken: '--edge-risk', dashed: false },
  ai: { type: 'ai', label: 'AI Insight', colorToken: '--edge-ai', dashed: true, defaultAnimated: true },
}
