import React from 'react';
import { cn } from '@/lib/utils';

interface CrmCardProps extends React.HTMLAttributes<HTMLDivElement> {
  raised?: boolean;
}

export default function CrmCard({ raised = false, className, ...props }: CrmCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]',
        raised && 'bg-[var(--color-surface-raised)] shadow-lg',
        className
      )}
      {...props}
    />
  );
}
