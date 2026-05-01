import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, icon, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-sm font-semibold text-[var(--color-text-primary)]">
            {label}
          </label>
        )}

        <div className="relative">
          {icon && (
            <span className="pointer-events-none absolute left-[14px] top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] flex items-center">
              {icon}
            </span>
          )}

          <input
            ref={ref}
            className={cn(
              'w-full h-11 px-4 font-body text-[15px] text-[var(--color-text-primary)]',
              'bg-[var(--color-surface-input)] border-[1.5px] border-[var(--color-border)] rounded-lg',
              'transition-all duration-[120ms] ease-out outline-none',
              'placeholder:text-[var(--color-text-tertiary)]',
              'focus:border-[var(--color-border-focus)] focus:shadow-[0_0_0_3px_var(--color-accent-subtle)]',
              error && 'border-[var(--color-danger)]',
              icon && 'pl-[42px]',
              className
            )}
            {...props}
          />
        </div>

        {hint && !error && (
          <span className="text-xs text-[var(--color-text-tertiary)]">{hint}</span>
        )}

        {error && (
          <span className="text-xs text-[var(--color-danger-text)] font-semibold">{error}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
