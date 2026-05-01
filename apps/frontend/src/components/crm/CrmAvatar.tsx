import React from 'react';
import { cn } from '@/lib/utils';

interface CrmAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-12 w-12 text-base',
};

export default function CrmAvatar({ name, size = 'md', className, ...props }: CrmAvatarProps) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-raised)] font-semibold text-[var(--color-text-primary)]',
        sizes[size],
        className
      )}
      title={name}
      {...props}
    >
      {initial}
    </div>
  );
}
