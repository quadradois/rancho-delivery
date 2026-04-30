import React from 'react';
import { cn } from '@/lib/utils';

export interface StepperProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  className?: string;
}

const Stepper: React.FC<StepperProps> = ({
  value,
  min = 0,
  max = 99,
  onChange,
  className,
}) => {
  const handleDecrement = () => {
    if (value > min) onChange(value - 1);
  };

  const handleIncrement = () => {
    if (value < max) onChange(value + 1);
  };

  return (
    <div className={cn('flex items-center gap-0 bg-[#1A0D06] rounded-full p-1 w-fit', className)}>
      <button
        onClick={handleDecrement}
        disabled={value <= min}
        className={cn(
          'w-8 h-8 bg-[#3E2214] rounded-full',
          'flex items-center justify-center',
          'text-lg font-bold text-[#D4601C] leading-none',
          'transition-all duration-[120ms]',
          'hover:bg-[#D4601C] hover:text-white',
          'active:scale-95',
          'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#3E2214] disabled:hover:text-[#D4601C]'
        )}
      >
        −
      </button>

      <span className="font-body text-md font-black text-[#F4E8CC] min-w-8 text-center">
        {value}
      </span>

      <button
        onClick={handleIncrement}
        disabled={value >= max}
        className={cn(
          'w-8 h-8 bg-[#3E2214] rounded-full',
          'flex items-center justify-center',
          'text-lg font-bold text-[#D4601C] leading-none',
          'transition-all duration-[120ms]',
          'hover:bg-[#D4601C] hover:text-white',
          'active:scale-95',
          'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#3E2214] disabled:hover:text-[#D4601C]'
        )}
      >
        +
      </button>
    </div>
  );
};

export default Stepper;
