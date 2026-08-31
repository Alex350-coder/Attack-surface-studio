"use client";

import { cn } from "@/lib/utils";

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string | null;
  rows?: number;
  className?: string;
  disabled?: boolean;
};

/**
 * Multiline sibling of `TextField` (same label/error/token-driven-style contract) -- needed for
 * the Assistant's question input, which is the first free-text field in the app long enough to
 * warrant a `<textarea>` instead of an `<input>`.
 */
export function Textarea({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
  rows = 4,
  className,
  disabled,
}: Props) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-[var(--color-foreground-muted)]">
        {label}
      </label>
      <textarea
        id={id}
        name={id}
        rows={rows}
        placeholder={placeholder}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className="resize-y rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-foreground)] outline-none transition-colors focus-visible:border-[var(--color-accent)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50"
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-[var(--node-critical)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
