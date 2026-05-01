'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface CrmModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export default function CrmModal({ open, onClose, title, children, className }: CrmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar modal"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative z-[510] w-full max-w-lg rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-2xl',
          className
        )}
      >
        {title && <h3 className="mb-4 font-sora text-lg font-semibold text-[var(--color-text-primary)]">{title}</h3>}
        {children}
      </div>
    </div>
  );
}
