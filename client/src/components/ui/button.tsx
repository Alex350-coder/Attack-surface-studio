import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--color-foreground)] text-[var(--color-background)] hover:opacity-90 shadow-[0_0_24px_-8px_var(--glow-primary)]',
        secondary:
          'border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-foreground)] hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-border-strong)]',
        ghost: 'text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface)]',
      },
      size: {
        sm: 'h-8 px-3.5 text-xs',
        md: 'h-10 px-5',
        lg: 'h-12 px-7 text-base',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

type ButtonProps = React.ComponentProps<'button'> & VariantProps<typeof buttonVariants>

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
