import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'brand' | 'red' | 'gold' | 'dark' | 'green' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  icon?: React.ReactNode;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'brand', size = 'md', children, icon, ...props }, ref) => {
    const baseStyles = `
      inline-flex items-center gap-1
      font-body font-extrabold uppercase tracking-wider
      rounded-full whitespace-nowrap
    `;

    const variants = {
      brand:   'bg-[var(--color-accent)] text-[var(--color-text-on-accent)]',
      red:     'bg-[var(--color-danger-subtle)] text-[var(--color-danger-text)]',
      gold:    'bg-[var(--color-warning-subtle)] text-[var(--color-warning-text)]',
      dark:    'bg-[var(--color-surface-overlay)] text-[var(--color-text-primary)]',
      green:   'bg-[var(--color-success-subtle)] text-[var(--color-success-text)]',
      outline: 'bg-transparent border-[1.5px] border-[var(--color-accent)] text-[var(--color-accent)]',
    };

    const sizes = {
      sm: 'text-[10px] px-[9px] py-[3px]',
      md: 'text-[11px] px-3 py-[5px]',
      lg: 'text-[13px] px-[14px] py-[6px]',
    };

    return (
      <span
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {icon && <span className="inline-flex">{icon}</span>}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;
