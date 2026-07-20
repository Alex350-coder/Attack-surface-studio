export function HeroContent() {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-1 text-xs font-medium text-[var(--color-foreground-muted)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent-strong)]" />
        Live attack surface intelligence
      </span>
      <h1 className="max-w-2xl text-[length:var(--text-hero)] font-semibold leading-[1.02] tracking-tight text-[var(--color-foreground)]">
        See your attack surface as it actually connects.
      </h1>
      <p className="max-w-lg text-[length:var(--text-lg)] leading-relaxed text-[var(--color-foreground-muted)]">
        Attack Surface Studio maps domains, hosts, services, and findings into a single living
        graph — so your team can trace exposure from discovery to evidence in seconds.
      </p>
    </div>
  )
}
