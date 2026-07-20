interface GraphStageProps {
  containerRef: React.Ref<HTMLDivElement>
  children: React.ReactNode
}

export function GraphStage({ containerRef, children }: GraphStageProps) {
  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-background-elevated)]/60 backdrop-blur-sm"
      style={{
        height: 'clamp(560px, 78vh, 900px)',
        boxShadow: '0 0 120px -20px var(--glow-primary), inset 0 -80px 100px -60px rgba(0, 0, 0, 0.6)',
      }}
    >
      {children}
    </div>
  )
}
