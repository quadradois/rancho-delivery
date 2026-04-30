import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hover?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, hover = true, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-[#251208] rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.7)] overflow-hidden',
          'border border-[#3E2214]',
          'transition-all duration-200 ease-out',
          hover && 'hover:shadow-[0_8px_40px_rgba(212,96,28,0.25)] hover:-translate-y-1 cursor-pointer',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
