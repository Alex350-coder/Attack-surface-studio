'use client'

import { useMemo } from 'react'
import { useGraphTheme } from '../theme/graphTheme'
import { useGraphStore } from '../store/graphStore'

export interface DriftSeed {
  driftX: number
  driftY: number
  duration: number
  delay: number
}

const ROOT_AMPLITUDE_SCALE = 0.12

export function useDriftSeed(id: string): DriftSeed {
  const theme = useGraphTheme()
  const isRoot = useGraphStore((s) => s.rootNodeId === id)

  return useMemo(() => {
    const idleDrift = theme.motion.idleDrift
    const [minAmplitude, maxAmplitude] = idleDrift?.amplitudeRange ?? [4, 9]
    const [minDuration, maxDuration] = idleDrift?.durationRange ?? [6000, 12000]

    const angle = hashToUnitFloat(id, 'angle') * Math.PI * 2
    const amplitude =
      (minAmplitude + hashToUnitFloat(id, 'amplitude') * (maxAmplitude - minAmplitude)) *
      (isRoot ? ROOT_AMPLITUDE_SCALE : 1)
    const duration = minDuration + hashToUnitFloat(id, 'duration') * (maxDuration - minDuration)
    const delay = hashToUnitFloat(id, 'delay') * duration

    return {
      driftX: Math.cos(angle) * amplitude,
      driftY: Math.sin(angle) * amplitude,
      duration,
      delay,
    }
  }, [id, isRoot, theme.motion.idleDrift])
}

/** Deterministic seed per (id, salt) pair — avoids Math.random() so drift is stable across renders. */
function hashToUnitFloat(id: string, salt: string): number {
  const input = `${id}:${salt}`
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0
  }
  return (hash >>> 0) / 0xffffffff
}
