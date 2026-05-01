import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'gold' | 'outline' | 'ghost' | 'dark' | 'white';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  icon?: React.ReactNode;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant = 'primary',
    size = 'md',
    children,
    icon,
    loading = false,
    disabled,
    ...props
  }, ref) => {
    const baseStyles = `
      inline-flex items-center justify-center gap-2
      font-body font-extrabold uppercase tracking-wider
      border-none cursor-pointer rounded-full
      transition-all duration-200 ease-out
      relative overflow-hidden
      disabled:opacity-40 disabled:cursor-not-allowed
      disabled:transform-none disabled:shadow-none
    `;

    const variants = {
      primary: `
        bg-[var(--color-accent)] text-[var(--color-text-on-accent)]
        shadow-[0_4px_14px_var(--color-accent-muted)]
        hover:bg-[var(--color-accent-hover)] hover:shadow-[0_6px_20px_var(--color-accent-muted)]
        hover:-translate-y-0.5
        active:translate-y-0
      `,
      gold: `
        bg-[var(--color-warning)] text-[var(--color-text-on-accent)]
        shadow-[0_4px_14px_var(--color-warning-muted)]
        hover:bg-[var(--color-warning-hover)] hover:shadow-[0_6px_20px_var(--color-warning-muted)]
        hover:-translate-y-0.5
        active:translate-y-0
      `,
      outline: `
        bg-transparent border-2 border-[var(--color-accent)] text-[var(--color-accent)]
        hover:bg-[var(--color-accent-subtle)] hover:-translate-y-0.5
        active:translate-y-0
      `,
      ghost: `
        bg-transparent text-[var(--color-accent)]
        hover:bg-[var(--color-accent-subtle)]
      `,
      dark: `
        bg-[var(--color-surface-overlay)] text-[var(--color-text-primary)]
        hover:bg-[var(--color-surface-hover)] hover:-translate-y-0.5
        active:translate-y-0
      `,
      white: `
        bg-[var(--color-surface)] text-[var(--color-accent)] shadow-md
        hover:-translate-y-0.5 hover:shadow-lg
        active:translate-y-0
      `,
    };

    const sizes = {
      sm: 'text-[13px] px-[18px] h-9',
      md: 'text-[15px] px-6 h-11',
      lg: 'text-[20px] px-8 h-[54px]',
      xl: 'text-[24px] px-10 h-16',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="animate-pulse">...</span>
        ) : (
          <>
            {icon && <span className="inline-flex">{icon}</span>}
            {children}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
