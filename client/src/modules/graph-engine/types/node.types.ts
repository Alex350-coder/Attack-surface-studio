export type NodeCategory = 'infrastructure' | 'security' | 'artifact' | 'intelligence'

export type NodeType =
  | 'domain'
  | 'subdomain'
  | 'ip'
  | 'host'
  | 'port'
  | 'service'
  | 'technology'
  | 'os'
  | 'container'
  | 'cloud'
  | 'asset'
  | 'finding'
  | 'criticalFinding'
  | 'evidence'
  | 'screenshot'
  | 'request'
  | 'response'
  | 'report'
  | 'note'
  | 'aiInsight'

export type Severity = 'info' | 'warning' | 'critical'

export interface NodeProperty {
  label: string
  value: string
}

export interface NodeRelationship {
  nodeId: string
  label: string
}

export interface NodeFinding {
  title: string
  severity: Severity
  description: string
}

export interface NodeEvidenceItem {
  title: string
  description: string
}

export interface NodeTimelineEntry {
  label: string
  timestamp: string
}

export interface NodeModelData {
  label: string
  subtitle?: string
  description?: string
  severity?: Severity
  properties?: NodeProperty[]
  relationships?: NodeRelationship[]
  findings?: NodeFinding[]
  evidence?: NodeEvidenceItem[]
  notes?: string[]
  timeline?: NodeTimelineEntry[]
}

export interface NodeModel {
  id: string
  type: NodeType
  /** Omit to let the engine compute a layout position via force simulation. */
  position?: { x: number; y: number }
  data: NodeModelData
}
