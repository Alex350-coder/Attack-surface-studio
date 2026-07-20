'use client'

import { useState } from 'react'
import { GraphEngine } from '@/modules/graph-engine'
import { getRandomScenario } from '@/data/demo-scenarios'

export default function GraphPreview() {
  const [scenario] = useState(() => getRandomScenario())

  return <GraphEngine data={scenario.graph} timeline={scenario.timeline} className="h-full w-full" />
}
