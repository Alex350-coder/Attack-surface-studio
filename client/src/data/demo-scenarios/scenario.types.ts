import type { GraphModel, TimelineScript } from '@/modules/graph-engine'

export interface DemoScenario {
  id: string
  name: string
  graph: GraphModel
  timeline: TimelineScript
}
