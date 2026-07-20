export type EdgeType = 'discovery' | 'relationship' | 'evidence' | 'risk' | 'ai'

export interface EdgeModel {
  id: string
  source: string
  target: string
  type: EdgeType
  animated?: boolean
  label?: string
}
