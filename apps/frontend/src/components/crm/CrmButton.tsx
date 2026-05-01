import React from 'react';
import { cn } from '@/lib/utils';

type CrmButtonVariant = 'primary' | 'ghost' | 'danger' | 'success';
type CrmButtonSize = 'sm' | 'md' | 'lg';

interface CrmButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: CrmButtonVariant;
  size?: CrmButtonSize;
}

const variants: Record<CrmButtonVariant, string> = {
  primary: 'bg-[var(--color-accent)] text-[var(--color-text-on-accent)] hover:bg-[var(--color-accent-hover)]',
  ghost: 'bg-transparent text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]',
  danger: 'bg-[var(--color-danger)] text-white hover:bg-[var(--color-danger-hover)]',
  success: 'bg-[var(--color-success)] text-white hover:bg-[var(--color-success-hover)]',
};

const sizes: Record<CrmButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
};

export default function CrmButton({
  variant = 'primary',
  size = 'md',
  className,
  disabled,
  ...props
}: CrmButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md font-semibold transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)]/40',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled}
      {...props}
    />
  );
}
