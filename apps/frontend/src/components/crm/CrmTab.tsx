'use client';

import React, { createContext, useContext, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

interface TabsContextValue {
  value: string;
  setValue: (next: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

interface CrmTabRootProps {
  defaultValue: string;
  children: React.ReactNode;
  className?: string;
}

interface CrmTabTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

interface CrmTabPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export function CrmTab({ defaultValue, children, className }: CrmTabRootProps) {
  const [value, setValue] = useState(defaultValue);
  const context = useMemo(() => ({ value, setValue }), [value]);

  return (
    <TabsContext.Provider value={context}>
      <div className={cn('flex flex-col gap-4', className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function CrmTabList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'inline-flex h-10 items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-1',
        className
      )}
      {...props}
    />
  );
}

export function CrmTabTrigger({ value, className, ...props }: CrmTabTriggerProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('CrmTabTrigger must be used inside CrmTab');

  const active = context.value === value;
  return (
    <button
      type="button"
      onClick={() => context.setValue(value)}
      className={cn(
        'inline-flex h-8 items-center rounded px-3 text-sm font-semibold transition-colors',
        active
          ? 'bg-[var(--color-accent)] text-[var(--color-text-on-accent)]'
          : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
        className
      )}
      {...props}
    />
  );
}

export function CrmTabPanel({ value, className, children, ...props }: CrmTabPanelProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('CrmTabPanel must be used inside CrmTab');
  if (context.value !== value) return null;

  return (
    <div className={cn('rounded-md', className)} {...props}>
      {children}
    </div>
  );
}
