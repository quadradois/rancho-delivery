import React from 'react';
import { cn } from '@/lib/utils';

export interface StatusStep {
  id: string;
  label: string;
  icon: React.ReactNode;
  status: 'done' | 'active' | 'pending';
}

export interface StatusTrackerProps {
  steps: StatusStep[];
  className?: string;
}

const StatusTracker: React.FC<StatusTrackerProps> = ({ steps, className }) => {
  return (
    <div className={cn('flex items-center w-full', className)}>
      {steps.map((step, index) => {
        const isDone = step.status === 'done';
        const isActive = step.status === 'active';
        const isLast = index === steps.length - 1;

        return (
          <div key={step.id} className="flex-1 flex flex-col items-center gap-2 relative">
            {/* Connector Line */}
            {!isLast && (
              <div
                className={cn(
                  'absolute top-4 left-[calc(50%+16px)] right-[calc(-50%+16px)] h-0.5 z-0',
                  isDone ? 'bg-[#D4601C]' : 'bg-[#3E2214]'
                )}
              />
            )}

            {/* Step Dot */}
            <div
              className={cn(
                'w-8 h-8 rounded-full border-2 z-10 flex items-center justify-center text-[13px]',
                'transition-all duration-200',
                isDone && 'bg-[#D4601C] border-[#D4601C] text-white',
                isActive && 'border-[#D4601C] text-[#D4601C] bg-[#251208] shadow-[0_0_0_3px_rgba(212,96,28,0.25)]',
                !isDone && !isActive && 'border-[#3E2214] bg-[#251208] text-[#5C3418]'
              )}
            >
              {step.icon}
            </div>

            {/* Label */}
            <span
              className={cn(
                'text-[10px] font-bold uppercase tracking-wider text-center',
                (isDone || isActive) ? 'text-[#D4601C]' : 'text-[#9A7B5C]'
              )}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default StatusTracker;
