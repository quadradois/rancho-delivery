import React from 'react';
import { cn } from '@/lib/utils';

interface CrmInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

interface CrmSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
}

function FieldMeta({ hint, error }: { hint?: string; error?: string }) {
  if (error) {
    return <p className="text-xs text-[var(--color-danger-text)]">{error}</p>;
  }
  if (hint) {
    return <p className="text-xs text-[var(--color-text-tertiary)]">{hint}</p>;
  }
  return null;
}

export function CrmInput({ label, hint, error, className, ...props }: CrmInputProps) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && <span className="text-sm font-medium text-[var(--color-text-secondary)]">{label}</span>}
      <input
        className={cn(
          'h-10 rounded-md border bg-[var(--color-surface-input)] px-3 text-sm text-[var(--color-text-primary)]',
          'border-[var(--color-border)] placeholder:text-[var(--color-text-tertiary)]',
          'focus:outline-none focus:border-[var(--color-border-focus)] focus:ring-2 focus:ring-[var(--color-border-focus)]/30',
          error && 'border-[var(--color-danger)]',
          className
        )}
        {...props}
      />
      <FieldMeta hint={hint} error={error} />
    </label>
  );
}

export function CrmSelect({ label, hint, error, className, children, ...props }: CrmSelectProps) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && <span className="text-sm font-medium text-[var(--color-text-secondary)]">{label}</span>}
      <select
        className={cn(
          'h-10 rounded-md border bg-[var(--color-surface-input)] px-3 text-sm text-[var(--color-text-primary)]',
          'border-[var(--color-border)]',
          'focus:outline-none focus:border-[var(--color-border-focus)] focus:ring-2 focus:ring-[var(--color-border-focus)]/30',
          error && 'border-[var(--color-danger)]',
          className
        )}
        {...props}
      >
        {children}
      </select>
      <FieldMeta hint={hint} error={error} />
    </label>
  );
}
