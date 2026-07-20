import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCollide,
  forceRadial,
  forceX,
  forceY,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force'
import type { GraphModel } from '../types/graph.types'

interface LayoutSimNode extends SimulationNodeDatum {
  id: string
}

interface LayoutSimLink extends SimulationLinkDatum<LayoutSimNode> {
  source: string
  target: string
}

const CANVAS_WIDTH = 1400
const CANVAS_HEIGHT = 900
const RING_SPACING = 190
const LINK_DISTANCE = 150
const CHARGE_STRENGTH = -320
const COLLIDE_RADIUS = 72
const CENTERING_STRENGTH = 0.02
const RADIAL_STRENGTH = 0.85
const SIMULATION_TICKS = 300

export function computeForceLayout(data: GraphModel): Record<string, { x: number; y: number }> {
  if (data.nodes.length === 0) return {}

  const centerX = CANVAS_WIDTH / 2
  const centerY = CANVAS_HEIGHT / 2
  const ringByNodeId = computeBfsRings(data)

  const simNodes: LayoutSimNode[] = data.nodes.map((node) => {
    const ring = ringByNodeId.get(node.id) ?? 0
    const angle = hashToUnitFloat(node.id) * Math.PI * 2
    const seedRadius = ring * RING_SPACING
    return {
      id: node.id,
      x: centerX + Math.cos(angle) * seedRadius,
      y: centerY + Math.sin(angle) * seedRadius,
    }
  })

  const simLinks: LayoutSimLink[] = data.edges.map((edge) => ({
    source: edge.source,
    target: edge.target,
  }))

  const simulation = forceSimulation(simNodes)
    .force('charge', forceManyBody().strength(CHARGE_STRENGTH))
    .force(
      'link',
      forceLink<LayoutSimNode, LayoutSimLink>(simLinks)
        .id((node) => node.id)
        .distance(LINK_DISTANCE)
        .strength(0.5),
    )
    .force('collide', forceCollide(COLLIDE_RADIUS))
    .force(
      'radial',
      forceRadial<LayoutSimNode>((node) => (ringByNodeId.get(node.id) ?? 0) * RING_SPACING, centerX, centerY).strength(
        RADIAL_STRENGTH,
      ),
    )
    .force('x', forceX(centerX).strength(CENTERING_STRENGTH))
    .force('y', forceY(centerY).strength(CENTERING_STRENGTH))
    .stop()

  for (let tick = 0; tick < SIMULATION_TICKS; tick += 1) {
    simulation.tick()
  }

  const positions: Record<string, { x: number; y: number }> = {}
  for (const node of simNodes) {
    positions[node.id] = { x: node.x ?? centerX, y: node.y ?? centerY }
  }
  return positions
}

/** BFS ring distance from the root drives the radial force, so the graph radiates outward instead of clumping. */
function computeBfsRings(data: GraphModel): Map<string, number> {
  const rings = new Map<string, number>()
  const root = data.rootNodeId ?? data.nodes[0]?.id
  if (!root) return rings

  const adjacency = new Map<string, string[]>()
  for (const edge of data.edges) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, [])
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, [])
    adjacency.get(edge.source)!.push(edge.target)
    adjacency.get(edge.target)!.push(edge.source)
  }

  const queue: string[] = [root]
  rings.set(root, 0)
  while (queue.length > 0) {
    const current = queue.shift()!
    const currentRing = rings.get(current)!
    for (const neighbor of adjacency.get(current) ?? []) {
      if (!rings.has(neighbor)) {
        rings.set(neighbor, currentRing + 1)
        queue.push(neighbor)
      }
    }
  }

  return rings
}

/** Deterministic seed angle from a node id — avoids Math.random() so layout is stable across renders. */
function hashToUnitFloat(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash << 5) - hash + id.charCodeAt(i)
    hash |= 0
  }
  return (hash >>> 0) / 0xffffffff
}
