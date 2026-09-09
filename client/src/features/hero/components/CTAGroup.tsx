import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

interface CTAGroupProps {
  isAuthenticated: boolean
}

export function CTAGroup({ isAuthenticated }: CTAGroupProps) {
  const ctaHref = isAuthenticated ? '/app' : '/register'
  const ctaLabel = isAuthenticated ? 'Go to app' : 'Request access'

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <Link href={ctaHref} className={buttonVariants({ size: 'lg' })}>
        {ctaLabel}
        <ArrowRight size={16} />
      </Link>
      <Link href="#graph-preview" className={buttonVariants({ variant: 'ghost', size: 'lg' })}>
        Explore the graph engine
      </Link>
    </div>
  )
}
