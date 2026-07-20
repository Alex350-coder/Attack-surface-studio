import type { LucideIcon } from 'lucide-react'

interface InfoSectionItem {
  icon: LucideIcon
  title: string
  description: string
}

interface InfoSectionProps {
  eyebrow: string
  title: string
  description: string
  items: InfoSectionItem[]
}

export function InfoSection({ eyebrow, title, description, items }: InfoSectionProps) {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-[var(--space-section)] sm:px-10">
      <div className="max-w-2xl">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent-strong)]">
          {eyebrow}
        </span>
        <h2 className="mt-4 text-[length:var(--text-2xl)] font-semibold tracking-tight text-[var(--color-foreground)]">
          {title}
        </h2>
        <p className="mt-4 text-[length:var(--text-base)] text-[var(--color-foreground-muted)]">{description}</p>
      </div>
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.title}
            className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-6 transition-colors duration-200 hover:border-[var(--color-border-strong)]"
          >
            <item.icon size={20} strokeWidth={1.75} className="text-[var(--color-accent-strong)]" />
            <h3 className="mt-4 text-sm font-semibold text-[var(--color-foreground)]">{item.title}</h3>
            <p className="mt-2 text-sm text-[var(--color-foreground-muted)]">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
