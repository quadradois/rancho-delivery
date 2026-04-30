import React from 'react';
import { cn } from '@/lib/utils';

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  variant?: 'default' | 'gold';
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  ({ className, active = false, variant = 'default', icon, children, ...props }, ref) => {
    const baseStyles = `
      inline-flex items-center gap-2 px-4 py-2
      rounded-full font-body font-bold text-sm uppercase tracking-wider
      cursor-pointer transition-all duration-[120ms] ease-out
      whitespace-nowrap border-[1.5px]
    `;

    const variants = {
      default: active
        ? 'bg-[#D4601C] text-white border-[#D4601C] shadow-[0_4px_16px_rgba(212,96,28,0.4)]'
        : 'bg-[#251208] border-[#3E2214] text-[#9A7B5C] hover:border-[#D4601C] hover:text-[#D4601C]',
      gold: 'bg-[#3E2214] text-[#E8A040] border-[#5C3418]',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], className)}
        {...props}
      >
        {icon && <span className="inline-flex">{icon}</span>}
        {children}
      </button>
    );
  }
);

Chip.displayName = 'Chip';

export default Chip;
