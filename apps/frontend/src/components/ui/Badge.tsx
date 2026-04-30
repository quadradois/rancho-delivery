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
      brand:   'bg-[#D4601C] text-white',
      red:     'bg-[#D4601C]/20 text-[#E87830]',
      gold:    'bg-[#E8A040]/20 text-[#E8A040]',
      dark:    'bg-[#1A0D06] text-[#F4E8CC]',
      green:   'bg-[#4A7840]/20 text-[#4A7840]',
      outline: 'bg-transparent border-[1.5px] border-[#D4601C] text-[#D4601C]',
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
