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
          <label className="text-sm font-semibold text-[#E8D4B0]">
            {label}
          </label>
        )}

        <div className="relative">
          {icon && (
            <span className="absolute left-[14px] top-1/2 -translate-y-1/2 text-[#9A7B5C] pointer-events-none flex items-center">
              {icon}
            </span>
          )}

          <input
            ref={ref}
            className={cn(
              'w-full h-11 px-4 font-body text-[15px] text-[#F4E8CC]',
              'bg-[#251208] border-[1.5px] border-[#3E2214] rounded-lg',
              'transition-all duration-[120ms] ease-out outline-none',
              'placeholder:text-[#5C3418]',
              'focus:border-[#D4601C] focus:shadow-[0_0_0_3px_rgba(212,96,28,0.25)]',
              error && 'border-[#D4601C]',
              icon && 'pl-[42px]',
              className
            )}
            {...props}
          />
        </div>

        {hint && !error && (
          <span className="text-xs text-[#9A7B5C]">{hint}</span>
        )}

        {error && (
          <span className="text-xs text-[#E87830] font-semibold">{error}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
