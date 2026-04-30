import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface ToastProps {
  variant?: 'success' | 'error' | 'info' | 'gold';
  title: string;
  description?: string;
  icon?: React.ReactNode;
  duration?: number;
  onClose?: () => void;
  className?: string;
}

const Toast: React.FC<ToastProps> = ({
  variant = 'info',
  title,
  description,
  icon,
  duration = 5000,
  onClose,
  className,
}) => {
  useEffect(() => {
    if (duration && onClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const variants = {
    success: {
      container: 'bg-[#251208] border-l-4 border-[#4A7840]',
      icon: 'bg-[#4A7840]/20 text-[#4A7840]',
      defaultIcon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ),
    },
    error: {
      container: 'bg-[#251208] border-l-4 border-[#D4601C]',
      icon: 'bg-[#D4601C]/20 text-[#D4601C]',
      defaultIcon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ),
    },
    info: {
      container: 'bg-[#D4601C] text-white',
      icon: 'bg-white/15',
      defaultIcon: (
        <svg width="18" height="18" viewBox="0 0 52 64" fill="none">
          <path d="M26 4C26 4 14 20 14 34C14 41.7 19.5 48 26 50C32.5 48 38 41.7 38 34C38 20 26 4 26 4Z" fill="rgba(232,160,64,0.9)" />
          <path d="M18 28C18 28 10 38 12 46C13.5 52 19 56 26 58C33 56 38.5 52 40 46C42 38 34 28 34 28C34 28 32 36 26 40C20 36 18 28 18 28Z" fill="rgba(232,160,64,0.7)" />
        </svg>
      ),
    },
    gold: {
      container: 'bg-[#E8A040] text-[#1A0D06]',
      icon: 'bg-black/10',
      defaultIcon: <span className="text-lg">★</span>,
    },
  };

  const variantStyles = variants[variant];

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-5 py-4 rounded-2xl shadow-lg max-w-[380px]',
        'animate-slide-up',
        variantStyles.container,
        className
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
          variantStyles.icon
        )}
      >
        {icon || variantStyles.defaultIcon}
      </div>

      {/* Content */}
      <div className="flex-1">
        <div className="font-bold text-sm mb-0.5">{title}</div>
        {description && (
          <div className="text-xs opacity-70 leading-snug">{description}</div>
        )}
      </div>

      {/* Close Button */}
      {onClose && (
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default Toast;
