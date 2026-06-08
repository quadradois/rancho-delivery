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
    <div className={cn('flex items-center gap-0 bg-[var(--madeira-fundo)] rounded-full p-1 w-fit', className)}>
      <button
        onClick={handleDecrement}
        disabled={value <= min}
        className={cn(
          'w-8 h-8 bg-[var(--madeira-clara)] rounded-full',
          'flex items-center justify-center',
          'text-lg font-bold text-[var(--brasa-viva)] leading-none',
          'transition-all duration-[120ms]',
          'hover:bg-[var(--brasa-viva)] hover:text-white',
          'active:scale-95',
          'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[var(--madeira-clara)] disabled:hover:text-[var(--brasa-viva)]'
        )}
      >
        −
      </button>

      <span className="font-body text-md font-black text-[var(--bege-claro)] min-w-8 text-center">
        {value}
      </span>

      <button
        onClick={handleIncrement}
        disabled={value >= max}
        className={cn(
          'w-8 h-8 bg-[var(--madeira-clara)] rounded-full',
          'flex items-center justify-center',
          'text-lg font-bold text-[var(--brasa-viva)] leading-none',
          'transition-all duration-[120ms]',
          'hover:bg-[var(--brasa-viva)] hover:text-white',
          'active:scale-95',
          'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[var(--madeira-clara)] disabled:hover:text-[var(--brasa-viva)]'
        )}
      >
        +
      </button>
    </div>
  );
};

export default Stepper;
