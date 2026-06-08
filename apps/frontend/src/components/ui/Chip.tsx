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
        ? 'bg-[var(--brasa-viva)] text-white border-[var(--brasa-viva)] shadow-[0_4px_16px_rgba(212,96,28,0.4)]'
        : 'bg-[var(--madeira-media)] border-[var(--madeira-clara)] text-[var(--cinza-couro)] hover:border-[var(--brasa-viva)] hover:text-[var(--brasa-viva)]',
      gold: 'bg-[var(--madeira-clara)] text-[var(--mel-campo)] border-[var(--couro-escuro)]',
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
