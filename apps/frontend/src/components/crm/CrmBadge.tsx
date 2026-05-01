import React from 'react';
import { cn } from '@/lib/utils';

export type CrmBadgeVariant =
  | 'pending'
  | 'preparing'
  | 'waiting'
  | 'on-route'
  | 'delivered'
  | 'cancelled'
  | 'paid'
  | 'unpaid'
  | 'expired';

interface CrmBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: CrmBadgeVariant;
  children: React.ReactNode;
}

const variantClass: Record<CrmBadgeVariant, string> = {
  pending: 'bg-[var(--color-warning-muted)] text-[var(--color-warning-text)] border-[var(--color-warning-subtle)]',
  preparing: 'bg-[var(--color-info-muted)] text-[var(--color-info-text)] border-[var(--color-info-subtle)]',
  waiting: 'bg-[var(--color-warning-subtle)] text-[var(--color-warning-text)] border-[var(--color-warning-muted)]',
  'on-route': 'bg-[var(--color-success-muted)] text-[var(--color-success-text)] border-[var(--color-success-subtle)]',
  delivered: 'bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] border-[var(--color-border)]',
  cancelled: 'bg-[var(--color-danger-muted)] text-[var(--color-danger-text)] border-[var(--color-danger-subtle)]',
  paid: 'bg-[var(--color-success-muted)] text-[var(--color-success-text)] border-[var(--color-success-subtle)]',
  unpaid: 'bg-[var(--color-surface-raised)] text-[var(--color-text-tertiary)] border-[var(--color-border)]',
  expired: 'bg-[var(--color-danger-muted)] text-[var(--color-danger-text)] border-[var(--color-danger-subtle)]',
};

export default function CrmBadge({ variant = 'pending', children, className, ...props }: CrmBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
        variantClass[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
