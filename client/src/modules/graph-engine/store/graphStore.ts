'use client'

import { createContext, useContext } from 'react'
import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'
import type { NodeModel } from '../types/node.types'
import type { EdgeModel } from '../types/edge.types'

export type TimelineStatus = 'idle' | 'playing' | 'completed' | 'interactive'

interface GraphDataSlice {
  nodes: NodeModel[]
  edges: EdgeModel[]
  rootNodeId: string | null
  visibleNodeIds: Set<string>
  visibleEdgeIds: Set<string>
  setGraphData: (nodes: NodeModel[], edges: EdgeModel[], rootNodeId?: string | null) => void
  revealNode: (nodeId: string) => void
  revealEdge: (edgeId: string) => void
  revealAll: () => void
}

interface SelectionSlice {
  selectedNodeId: string | null
  hoveredNodeId: string | null
  highlightedNodeIds: Set<string>
  highlightedEdgeIds: Set<string>
  pulseCounters: Record<string, number>
  selectNode: (nodeId: string | null) => void
  hoverNode: (nodeId: string | null) => void
  pulseNode: (nodeId: string) => void
}

interface CameraSlice {
  focusTargetId: string | null
  focusNode: (nodeId: string | null) => void
}

interface TimelineSlice {
  status: TimelineStatus
  currentStepIndex: number
  elapsedMs: number
  setStatus: (status: TimelineStatus) => void
  setProgress: (stepIndex: number, elapsedMs: number) => void
}

interface UiSlice {
  inspectorOpen: boolean
  activeScenarioId: string | null
  openInspector: () => void
  closeInspector: () => void
  setActiveScenario: (id: string) => void
}

export type GraphStoreState = GraphDataSlice & SelectionSlice & CameraSlice & TimelineSlice & UiSlice

function computeHighlights(nodeId: string | null, edges: EdgeModel[]) {
  if (!nodeId) {
    return { highlightedNodeIds: new Set<string>(), highlightedEdgeIds: new Set<string>() }
  }

  const highlightedEdgeIds = new Set<string>()
  const highlightedNodeIds = new Set<string>([nodeId])

  for (const edge of edges) {
    if (edge.source === nodeId || edge.target === nodeId) {
      highlightedEdgeIds.add(edge.id)
      highlightedNodeIds.add(edge.source)
      highlightedNodeIds.add(edge.target)
    }
  }

  return { highlightedNodeIds, highlightedEdgeIds }
}

export function createGraphStore() {
  return createStore<GraphStoreState>()((set, get) => ({
    nodes: [],
    edges: [],
    rootNodeId: null,
    visibleNodeIds: new Set(),
    visibleEdgeIds: new Set(),
    setGraphData: (nodes, edges, rootNodeId) =>
      set({ nodes, edges, rootNodeId: rootNodeId ?? null, visibleNodeIds: new Set(), visibleEdgeIds: new Set() }),
    revealNode: (nodeId) => set((state) => ({ visibleNodeIds: new Set(state.visibleNodeIds).add(nodeId) })),
    revealEdge: (edgeId) => set((state) => ({ visibleEdgeIds: new Set(state.visibleEdgeIds).add(edgeId) })),
    revealAll: () =>
      set((state) => ({
        visibleNodeIds: new Set(state.nodes.map((n) => n.id)),
        visibleEdgeIds: new Set(state.edges.map((e) => e.id)),
      })),

    selectedNodeId: null,
    hoveredNodeId: null,
    highlightedNodeIds: new Set(),
    highlightedEdgeIds: new Set(),
    pulseCounters: {},
    selectNode: (nodeId) => {
      const { highlightedNodeIds, highlightedEdgeIds } = computeHighlights(nodeId, get().edges)
      set({ selectedNodeId: nodeId, highlightedNodeIds, highlightedEdgeIds })
    },
    hoverNode: (nodeId) => {
      const { selectedNodeId, edges } = get()
      set({ hoveredNodeId: nodeId })
      if (!selectedNodeId) {
        const { highlightedNodeIds, highlightedEdgeIds } = computeHighlights(nodeId, edges)
        set({ highlightedNodeIds, highlightedEdgeIds })
      }
    },
    pulseNode: (nodeId) =>
      set((state) => ({
        pulseCounters: { ...state.pulseCounters, [nodeId]: (state.pulseCounters[nodeId] ?? 0) + 1 },
      })),

    focusTargetId: null,
    focusNode: (nodeId) => set({ focusTargetId: nodeId }),

    status: 'idle',
    currentStepIndex: 0,
    elapsedMs: 0,
    setStatus: (status) => set({ status }),
    setProgress: (currentStepIndex, elapsedMs) => set({ currentStepIndex, elapsedMs }),

    inspectorOpen: false,
    activeScenarioId: null,
    openInspector: () => set({ inspectorOpen: true }),
    closeInspector: () => set({ inspectorOpen: false }),
    setActiveScenario: (id) => set({ activeScenarioId: id }),
  }))
}

export type GraphStoreApi = ReturnType<typeof createGraphStore>

export const GraphStoreContext = createContext<GraphStoreApi | null>(null)

export function useGraphStore<T>(selector: (state: GraphStoreState) => T): T {
  const store = useContext(GraphStoreContext)
  if (!store) {
    throw new Error('useGraphStore must be used within a GraphProvider')
  }
  return useStore(store, selector)
}
