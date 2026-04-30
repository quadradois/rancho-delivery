import React from 'react';
import { cn } from '@/lib/utils';

export interface AppBarProps {
  title: string;
  onBack?: () => void;
  onSearch?: () => void;
  cartCount?: number;
  onCartClick?: () => void;
  variant?: 'primary' | 'white';
  className?: string;
}

const AppBar: React.FC<AppBarProps> = ({
  title,
  onBack,
  onSearch,
  cartCount = 0,
  onCartClick,
  variant = 'primary',
  className,
}) => {
  const isPrimary = variant === 'primary';

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-5 py-4',
        isPrimary
          ? 'bg-[#251208] border-b border-[#3E2214] text-[#F4E8CC]'
          : 'bg-[#1A0D06] border-b border-[#3E2214] text-[#F4E8CC]',
        className
      )}
    >
      {/* Back Button */}
      {onBack && (
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-white/10 hover:bg-white/20 transition-colors duration-[120ms]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
      )}

      {/* Logo / Title */}
      <h1 className="flex-1 font-display text-xl text-[#F4E8CC] tracking-wide">
        {title === 'Cardápio' ? (
          <span>
            <span className="text-[#D4601C]">Rancho</span>{' '}
            <span className="text-[#E8A040]">Comida Caseira</span>
          </span>
        ) : (
          title
        )}
      </h1>

      {/* Search Button */}
      {onSearch && (
        <button
          onClick={onSearch}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-white/10 hover:bg-white/20 transition-colors duration-[120ms]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </button>
      )}

      {/* Cart Button */}
      {onCartClick && (
        <button
          onClick={onCartClick}
          className="relative w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-white/10 hover:bg-white/20 transition-colors duration-[120ms]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>

          {cartCount > 0 && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#E8A040] text-[#1A0D06] rounded-full flex items-center justify-center text-[9px] font-extrabold">
              {cartCount > 9 ? '9+' : cartCount}
            </div>
          )}
        </button>
      )}
    </div>
  );
};

export default AppBar;
