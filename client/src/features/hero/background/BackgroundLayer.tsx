'use client'

import { useRef } from 'react'
import { useParticleField } from './useParticleField'

interface BackgroundLayerProps {
  focusRef?: React.RefObject<HTMLElement | null>
}

export function BackgroundLayer({ focusRef }: BackgroundLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useParticleField(canvasRef, { focusRef })

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(60% 50% at 50% 0%, var(--glow-primary), transparent 70%)' }}
      />
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(50% 45% at 20% 65%, var(--glow-secondary), transparent 70%)' }}
      />
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(55% 45% at 82% 60%, var(--glow-tertiary), transparent 70%)' }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />
    </div>
  )
}
