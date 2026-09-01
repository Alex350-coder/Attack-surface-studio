"use client";

import { cn } from "@/lib/utils";

type Props = {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
};

/** Token-styled boolean control, used by adapter option forms (e.g. nmap's detectServices/detectOs). */
export function Checkbox({ id, label, checked, onChange, className, disabled }: Props) {
  return (
    <label htmlFor={id} className={cn("flex items-center gap-2.5 text-sm text-[var(--color-foreground)]", className)}>
      <input
        id={id}
        name={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] accent-[var(--color-accent)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50"
      />
      {label}
    </label>
  );
}
