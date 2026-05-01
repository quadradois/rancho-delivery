'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

interface CrmTimerProps extends React.HTMLAttributes<HTMLSpanElement> {
  elapsedSeconds: number;
  warningAt?: number;
  dangerAt?: number;
  blinkOnDanger?: boolean;
}

function formatMMss(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function CrmTimer({
  elapsedSeconds,
  warningAt = 180,
  dangerAt = 300,
  blinkOnDanger = true,
  className,
  ...props
}: CrmTimerProps) {
  const [seconds, setSeconds] = useState(elapsedSeconds);

  useEffect(() => {
    setSeconds(elapsedSeconds);
  }, [elapsedSeconds]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => window.clearInterval(id);
  }, []);

  const tone = useMemo(() => {
    if (seconds >= dangerAt) return 'danger';
    if (seconds >= warningAt) return 'warning';
    return 'normal';
  }, [seconds, warningAt, dangerAt]);

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-1 font-mono-crm text-xs font-semibold',
        tone === 'normal' && 'bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)]',
        tone === 'warning' && 'bg-[var(--color-warning-muted)] text-[var(--color-warning-text)]',
        tone === 'danger' && 'bg-[var(--color-danger-muted)] text-[var(--color-danger-text)]',
        tone === 'danger' && blinkOnDanger && 'animate-pulse',
        className
      )}
      {...props}
    >
      {formatMMss(seconds)}
    </span>
  );
}
