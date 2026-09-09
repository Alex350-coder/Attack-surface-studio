'use client'

import { useEffect } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  opacity: number
}

interface ParticleTier {
  radius: number
  opacity: number
  speed: number
  weight: number
}

interface FocusRect {
  x: number
  y: number
  width: number
  height: number
}

interface UseParticleFieldOptions {
  focusRef?: React.RefObject<HTMLElement | null>
}

const PARTICLE_COUNT = 90
const LINK_DISTANCE = 120
const FOCUS_PADDING = 80
const FOCUS_BIAS_RATIO = 0.45

const PARTICLE_TIERS: ParticleTier[] = [
  { radius: 1, opacity: 0.3, speed: 0.22, weight: 0.5 },
  { radius: 1.6, opacity: 0.48, speed: 0.14, weight: 0.35 },
  { radius: 2.4, opacity: 0.65, speed: 0.08, weight: 0.15 },
]

function pickTier(): ParticleTier {
  const roll = Math.random()
  let cumulative = 0
  for (const tier of PARTICLE_TIERS) {
    cumulative += tier.weight
    if (roll <= cumulative) return tier
  }
  return PARTICLE_TIERS[PARTICLE_TIERS.length - 1]
}

export function useParticleField(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  options: UseParticleFieldOptions = {},
): void {
  const prefersReducedMotion = useReducedMotion()
  const { focusRef } = options

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rootStyles = getComputedStyle(document.documentElement)
    const dotColor = rootStyles.getPropertyValue('--color-foreground-subtle').trim() || '#94a3b8'
    const lineColor = rootStyles.getPropertyValue('--color-foreground-subtle').trim() || '#94a3b8'

    let width = 0
    let height = 0
    let particles: Particle[] = []
    let animationFrameId = 0
    let focusRect: FocusRect | null = null

    function resize() {
      const parent = canvas!.parentElement
      width = parent ? parent.clientWidth : window.innerWidth
      height = parent ? parent.clientHeight : window.innerHeight
      const dpr = window.devicePixelRatio || 1
      canvas!.width = width * dpr
      canvas!.height = height * dpr
      canvas!.style.width = `${width}px`
      canvas!.style.height = `${height}px`
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)

      const focusEl = focusRef?.current
      if (focusEl) {
        const focusBounds = focusEl.getBoundingClientRect()
        const canvasBounds = canvas!.getBoundingClientRect()
        focusRect = {
          x: focusBounds.left - canvasBounds.left - FOCUS_PADDING,
          y: focusBounds.top - canvasBounds.top - FOCUS_PADDING,
          width: focusBounds.width + FOCUS_PADDING * 2,
          height: focusBounds.height + FOCUS_PADDING * 2,
        }
      } else {
        focusRect = null
      }
    }

    function samplePosition(): { x: number; y: number } {
      if (focusRect && Math.random() < FOCUS_BIAS_RATIO) {
        return {
          x: focusRect.x + Math.random() * focusRect.width,
          y: focusRect.y + Math.random() * focusRect.height,
        }
      }
      return { x: Math.random() * width, y: Math.random() * height }
    }

    function createParticles() {
      particles = Array.from({ length: PARTICLE_COUNT }, () => {
        const tier = pickTier()
        const { x, y } = samplePosition()
        return {
          x,
          y,
          vx: (Math.random() - 0.5) * tier.speed,
          vy: (Math.random() - 0.5) * tier.speed,
          radius: tier.radius,
          opacity: tier.opacity,
        }
      })
    }

    function draw() {
      ctx!.clearRect(0, 0, width, height)

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i]
          const b = particles[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          if (distance < LINK_DISTANCE) {
            ctx!.beginPath()
            ctx!.moveTo(a.x, a.y)
            ctx!.lineTo(b.x, b.y)
            ctx!.strokeStyle = lineColor
            ctx!.globalAlpha = 0.14 * (1 - distance / LINK_DISTANCE)
            ctx!.lineWidth = 1
            ctx!.stroke()
          }
        }
      }

      ctx!.fillStyle = dotColor
      for (const particle of particles) {
        ctx!.globalAlpha = particle.opacity
        ctx!.beginPath()
        ctx!.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
        ctx!.fill()
      }
      ctx!.globalAlpha = 1
    }

    function step() {
      for (const particle of particles) {
        particle.x += particle.vx
        particle.y += particle.vy

        if (particle.x < 0 || particle.x > width) particle.vx *= -1
        if (particle.y < 0 || particle.y > height) particle.vy *= -1
      }
      draw()
      animationFrameId = requestAnimationFrame(step)
    }

    function handleResize() {
      resize()
      createParticles()
      draw()
    }

    resize()
    createParticles()
    draw()

    if (!prefersReducedMotion) {
      animationFrameId = requestAnimationFrame(step)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [canvasRef, focusRef, prefersReducedMotion])
}
