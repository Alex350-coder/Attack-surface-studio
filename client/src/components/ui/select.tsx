"use client";

import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly Option[];
  error?: string | null;
  className?: string;
  disabled?: boolean;
};

/** Native `<select>` wrapper, styled with the same tokens as `TextField` (adapter/mode pickers). */
export function Select({ id, label, value, onChange, options, error, className, disabled }: Props) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-[var(--color-foreground-muted)]">
        {label}
      </label>
      <select
        id={id}
        name={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        className="h-10 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-sm text-[var(--color-foreground)] outline-none transition-colors focus-visible:border-[var(--color-accent)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <p role="alert" className="text-xs text-[var(--node-critical)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
