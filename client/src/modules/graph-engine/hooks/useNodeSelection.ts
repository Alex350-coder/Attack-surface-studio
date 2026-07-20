import { useGraphStore } from '../store/graphStore'

export function useNodeSelection(nodeId: string) {
  const isSelected = useGraphStore((s) => s.selectedNodeId === nodeId)
  const isHovered = useGraphStore((s) => s.hoveredNodeId === nodeId)
  const isHighlighted = useGraphStore((s) => s.highlightedNodeIds.has(nodeId))

  return { isSelected, isHovered, isHighlighted }
}
