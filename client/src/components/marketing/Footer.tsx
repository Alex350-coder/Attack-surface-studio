import { Mail, Radar } from 'lucide-react'

type SocialIconProps = {
  className?: string
}

function GithubIcon({ className }: SocialIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.09 3.29 9.4 7.86 10.93.57.11.78-.25.78-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 2.9-.39c.98 0 1.97.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.64 1.59.24 2.76.12 3.05.74.8 1.19 1.83 1.19 3.08 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.08.78 2.17 0 1.57-.01 2.83-.01 3.22 0 .31.21.67.79.55A10.53 10.53 0 0 0 23.5 12c0-6.27-5.23-11.5-11.5-11.5Z" />
    </svg>
  )
}

function XIcon({ className }: SocialIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117Z" />
    </svg>
  )
}

function LinkedinIcon({ className }: SocialIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM7.114 20.452H3.558V9h3.556v11.452z" />
    </svg>
  )
}

const SOCIAL_LINKS = [
  { label: 'GitHub', href: '#', Icon: GithubIcon },
  { label: 'X (Twitter)', href: '#', Icon: XIcon },
  { label: 'LinkedIn', href: '#', Icon: LinkedinIcon },
]

export function Footer() {
  return (
    <footer className="mx-auto w-full max-w-6xl border-t border-[var(--color-border)] px-6 py-10 sm:px-10">
      <div className="flex flex-col gap-10 pb-8 sm:flex-row sm:justify-between">
        <div className="flex max-w-sm flex-col gap-3">
          <div className="flex items-center gap-2 text-[var(--color-foreground)]">
            <Radar size={20} strokeWidth={2} className="text-[var(--color-accent-strong)]" />
            <span className="text-sm font-semibold tracking-tight">Attack Surface Studio</span>
          </div>
          <p className="text-sm leading-relaxed text-[var(--color-foreground-subtle)]">
            We only collect the data required to map and monitor your attack surface, we never sell it to
            third parties, and you can request access or deletion at any time. See our full Privacy Policy
            for details.
          </p>
          <div className="flex gap-4 pt-1">
            {SOCIAL_LINKS.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className="text-[var(--color-foreground-subtle)] transition-colors duration-200 hover:text-[var(--color-accent-strong)]"
              >
                <Icon className="size-[18px]" />
              </a>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2 text-sm text-[var(--color-foreground-subtle)] sm:items-end">
          <span className="font-medium text-[var(--color-foreground-muted)]">Get in touch</span>
          <span className="flex items-center gap-2">
            <Mail size={16} strokeWidth={2} />
            hello@attacksurfacestudio.com
          </span>
          <span>Monday - Friday, 9am - 6pm UTC</span>
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-[var(--color-border)] pt-6 text-sm text-[var(--color-foreground-subtle)] sm:flex-row sm:items-center sm:justify-between">
        <span>© {new Date().getFullYear()} Attack Surface Studio.</span>
        <div className="flex gap-6">
          <a href="#" className="transition-colors duration-200 hover:text-[var(--color-foreground)]">
            Privacy
          </a>
          <a href="#" className="transition-colors duration-200 hover:text-[var(--color-foreground)]">
            Terms
          </a>
          <a href="#" className="transition-colors duration-200 hover:text-[var(--color-foreground)]">
            Contact
          </a>
        </div>
      </div>
    </footer>
  )
}
