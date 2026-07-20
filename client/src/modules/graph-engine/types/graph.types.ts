import type { NodeModel } from './node.types'
import type { EdgeModel } from './edge.types'

export interface GraphModel {
  nodes: NodeModel[]
  edges: EdgeModel[]
  /** Node to radiate the computed layout outward from. Defaults to the first node. */
  rootNodeId?: string
}
