'use client'

import { useEffect } from 'react'
import { useGraphStore } from '../store/graphStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import type { TimelineScript } from '../types/timeline.types'

const COMPLETION_HOLD_MS = 400

export function useGraphTimeline(script: TimelineScript | undefined) {
  const revealNode = useGraphStore((s) => s.revealNode)
  const revealEdge = useGraphStore((s) => s.revealEdge)
  const focusNode = useGraphStore((s) => s.focusNode)
  const pulseNode = useGraphStore((s) => s.pulseNode)
  const revealAll = useGraphStore((s) => s.revealAll)
  const setStatus = useGraphStore((s) => s.setStatus)
  const setProgress = useGraphStore((s) => s.setProgress)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (!script || script.length === 0 || prefersReducedMotion) {
      revealAll()
      setStatus('interactive')
      return
    }

    let rafId = 0
    let timeoutId = 0
    let startTime: number | null = null
    let stepIndex = 0

    setStatus('playing')

    function tick(timestamp: number) {
      if (startTime === null) startTime = timestamp
      const elapsed = timestamp - startTime

      while (script && stepIndex < script.length && script[stepIndex].at <= elapsed) {
        const step = script[stepIndex]
        if (step.action === 'addNode') revealNode(step.nodeId)
        if (step.action === 'addEdge') revealEdge(step.edgeId)
        if (step.action === 'focusNode') focusNode(step.nodeId)
        if (step.action === 'pulse') pulseNode(step.nodeId)
        stepIndex += 1
      }

      setProgress(stepIndex, elapsed)

      if (script && stepIndex < script.length) {
        rafId = requestAnimationFrame(tick)
      } else {
        setStatus('completed')
        timeoutId = window.setTimeout(() => setStatus('interactive'), COMPLETION_HOLD_MS)
      }
    }

    rafId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafId)
      window.clearTimeout(timeoutId)
    }
  }, [script, prefersReducedMotion, revealNode, revealEdge, focusNode, pulseNode, revealAll, setStatus, setProgress])
}
