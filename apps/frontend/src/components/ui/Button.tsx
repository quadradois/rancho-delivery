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
        bg-[#D4601C] text-white
        shadow-[0_4px_14px_rgba(212,96,28,0.45)]
        hover:bg-[#E87830] hover:shadow-[0_6px_20px_rgba(212,96,28,0.55)]
        hover:-translate-y-0.5
        active:translate-y-0
      `,
      gold: `
        bg-[#E8A040] text-[#1A0D06]
        shadow-[0_4px_14px_rgba(232,160,64,0.40)]
        hover:bg-[#D49030] hover:shadow-[0_6px_20px_rgba(232,160,64,0.50)]
        hover:-translate-y-0.5
        active:translate-y-0
      `,
      outline: `
        bg-transparent border-2 border-[#D4601C] text-[#D4601C]
        hover:bg-[#D4601C]/10 hover:-translate-y-0.5
        active:translate-y-0
      `,
      ghost: `
        bg-transparent text-[#D4601C]
        hover:bg-[#D4601C]/10
      `,
      dark: `
        bg-[#1A0D06] text-[#F4E8CC]
        hover:bg-[#251208] hover:-translate-y-0.5
        active:translate-y-0
      `,
      white: `
        bg-[#F4E8CC] text-[#D4601C] shadow-md
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
