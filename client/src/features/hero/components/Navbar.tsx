import Link from 'next/link'
import { Radar } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

const NAV_LINKS = [
  { label: 'Platform', href: '#platform' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Docs', href: '#' },
]

interface NavbarProps {
  isAuthenticated: boolean
}

export function Navbar({ isAuthenticated }: NavbarProps) {
  const ctaHref = isAuthenticated ? '/app' : '/register'
  const ctaLabel = isAuthenticated ? 'Go to app' : 'Request access'

  return (
    <header className="relative z-20 flex items-center justify-between px-6 py-5 sm:px-10">
      <Link href="/" className="flex items-center gap-2 text-[var(--color-foreground)]">
        <Radar size={20} strokeWidth={2} className="text-[var(--color-accent-strong)]" />
        <span className="text-sm font-semibold tracking-tight">Attack Surface Studio</span>
      </Link>
      <nav className="hidden items-center gap-8 md:flex">
        {NAV_LINKS.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="text-sm text-[var(--color-foreground-muted)] transition-colors duration-200 hover:text-[var(--color-foreground)]"
          >
            {link.label}
          </a>
        ))}
      </nav>
      <Link href={ctaHref} className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
        {ctaLabel}
      </Link>
    </header>
  )
}
