'use client'

import { useCallback, useMemo } from 'react'
import { ReactFlow, Background, BackgroundVariant, type Node, type Edge } from '@xyflow/react'
import { useGraphStore } from '../store/graphStore'
import { useGraphInteraction } from '../hooks/useGraphInteraction'
import { BaseNode } from './nodes/BaseNode'
import { BaseEdge } from './edges/BaseEdge'

const nodeTypes = { base: BaseNode }
const edgeTypes = { base: BaseEdge }

export function GraphRenderer() {
  const nodes = useGraphStore((s) => s.nodes)
  const edges = useGraphStore((s) => s.edges)
  const visibleNodeIds = useGraphStore((s) => s.visibleNodeIds)
  const visibleEdgeIds = useGraphStore((s) => s.visibleEdgeIds)
  const status = useGraphStore((s) => s.status)
  const selectNode = useGraphStore((s) => s.selectNode)
  const focusNode = useGraphStore((s) => s.focusNode)
  const openInspector = useGraphStore((s) => s.openInspector)
  const hoverNode = useGraphStore((s) => s.hoverNode)
  const { handlePaneClick } = useGraphInteraction()

  const flowNodes = useMemo<Node[]>(
    () =>
      nodes
        .filter((n) => visibleNodeIds.has(n.id))
        .map((n) => ({
          id: n.id,
          type: 'base',
          position: n.position ?? { x: 0, y: 0 },
          data: { ...n.data, type: n.type },
          draggable: false,
        })),
    [nodes, visibleNodeIds],
  )

  const flowEdges = useMemo<Edge[]>(
    () =>
      edges
        .filter((e) => visibleEdgeIds.has(e.id) && visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target))
        .map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          type: 'base',
          data: { type: e.type, animated: e.animated },
        })),
    [edges, visibleEdgeIds, visibleNodeIds],
  )

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (status !== 'interactive') return
      selectNode(node.id)
      focusNode(node.id)
      openInspector()
    },
    [status, selectNode, focusNode, openInspector],
  )

  const handleNodeMouseEnter = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (status === 'interactive') hoverNode(node.id)
    },
    [status, hoverNode],
  )

  const handleNodeMouseLeave = useCallback(() => {
    if (status === 'interactive') hoverNode(null)
  }, [status, hoverNode])

  return (
    <ReactFlow
      nodes={flowNodes}
      edges={flowEdges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodeClick={handleNodeClick}
      onNodeMouseEnter={handleNodeMouseEnter}
      onNodeMouseLeave={handleNodeMouseLeave}
      onPaneClick={handlePaneClick}
      fitView
      proOptions={{ hideAttribution: true }}
      nodesDraggable={false}
      nodesConnectable={false}
      panOnScroll
      zoomOnDoubleClick={false}
      minZoom={0.3}
      maxZoom={2}
    >
      <Background variant={BackgroundVariant.Dots} gap={28} size={1} className="opacity-[0.15]" />
    </ReactFlow>
  )
}
