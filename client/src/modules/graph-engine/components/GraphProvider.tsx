'use client'

import { useEffect, useMemo, useState } from 'react'
import { createGraphStore, GraphStoreContext, type GraphStoreApi } from '../store/graphStore'
import { GraphThemeContext, defaultGraphTheme, type GraphTheme } from '../theme/graphTheme'
import { computeForceLayout } from '../layout/computeForceLayout'
import type { GraphModel } from '../types/graph.types'
import type { NodeModel } from '../types/node.types'

interface GraphProviderProps {
  data: GraphModel
  theme?: Partial<GraphTheme>
  onNodeSelect?: (node: NodeModel) => void
  children: React.ReactNode
}

export function GraphProvider({ data, theme, onNodeSelect, children }: GraphProviderProps) {
  const [store] = useState<GraphStoreApi>(() => createGraphStore())

  useEffect(() => {
    const needsLayout = data.nodes.some((node) => !node.position)
    const computedPositions = needsLayout ? computeForceLayout(data) : null
    const nodes: NodeModel[] = computedPositions
      ? data.nodes.map((node) => ({
          ...node,
          position: node.position ?? computedPositions[node.id] ?? { x: 0, y: 0 },
        }))
      : data.nodes
    store.getState().setGraphData(nodes, data.edges, data.rootNodeId ?? null)
  }, [store, data])

  useEffect(() => {
    if (!onNodeSelect) return undefined

    return store.subscribe((state, prevState) => {
      if (state.selectedNodeId && state.selectedNodeId !== prevState.selectedNodeId) {
        const node = state.nodes.find((n) => n.id === state.selectedNodeId)
        if (node) onNodeSelect(node)
      }
    })
  }, [store, onNodeSelect])

  const mergedTheme = useMemo<GraphTheme>(
    () => ({
      ...defaultGraphTheme,
      ...theme,
      motion: { ...defaultGraphTheme.motion, ...theme?.motion },
    }),
    [theme],
  )

  return (
    <GraphStoreContext.Provider value={store}>
      <GraphThemeContext.Provider value={mergedTheme}>{children}</GraphThemeContext.Provider>
    </GraphStoreContext.Provider>
  )
}
