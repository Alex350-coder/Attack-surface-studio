export type TimelineStep =
  | { at: number; action: 'addNode'; nodeId: string }
  | { at: number; action: 'addEdge'; edgeId: string }
  | { at: number; action: 'focusNode'; nodeId: string }
  | { at: number; action: 'pulse'; nodeId: string }

export type TimelineScript = TimelineStep[]
