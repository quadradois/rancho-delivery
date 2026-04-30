import React from 'react';
import { cn, formatCurrency } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

export interface PromoBannerProps {
  title: string;
  tagline?: string;
  badge?: string;
  price?: number;
  priceLabel?: string;
  buttonText: string;
  onButtonClick: () => void;
  variant?: 'primary' | 'gold' | 'dark';
  className?: string;
}

const PromoBanner: React.FC<PromoBannerProps> = ({
  title,
  tagline,
  badge,
  price,
  priceLabel,
  buttonText,
  onButtonClick,
  variant = 'primary',
  className,
}) => {
  const variants = {
    primary: 'bg-[#3E2214] text-[#F4E8CC]',
    gold:    'bg-[#251208] text-[#F4E8CC]',
    dark:    'bg-[#1A0D06] text-[#F4E8CC]',
  };

  const gradients = {
    primary: 'radial-gradient(ellipse at 80% 50%, rgba(212,96,28,0.25) 0%, transparent 60%)',
    gold:    'radial-gradient(ellipse at 20% 50%, rgba(232,160,64,0.20) 0%, transparent 60%)',
    dark:    'radial-gradient(ellipse at 80% 50%, rgba(212,96,28,0.15) 0%, transparent 60%)',
  };

  return (
    <div
      className={cn(
        'rounded-3xl p-5 md:p-8 relative overflow-hidden',
        'border border-[#5C3418]',
        variants[variant],
        className
      )}
    >
      {/* Background Gradient */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: gradients[variant] }} />

      {/* Layout: empilha no mobile, lado a lado no md+ */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Content */}
        <div>
          {badge && (
            <div className="mb-3">
              <Badge variant="gold" size="md">{badge}</Badge>
            </div>
          )}

          <h2 className="font-display text-2xl md:text-3xl text-[#F4E8CC] leading-tight mb-1">
            {title.split('\n').map((line, i, arr) => (
              <React.Fragment key={i}>
                {line}
                {i < arr.length - 1 && <br />}
              </React.Fragment>
            ))}
          </h2>

          {tagline && (
            <div className="font-body text-lg text-[#E8A040] mt-1">{tagline}</div>
          )}

          <div className="mt-4">
            <Button variant="primary" size="lg" onClick={onButtonClick}>
              {buttonText}
            </Button>
          </div>
        </div>

        {/* Price */}
        {price !== undefined && (
          <div className="md:text-right">
            <div className="font-display text-4xl md:text-5xl text-[#E8A040] leading-none drop-shadow-[2px_2px_0_rgba(0,0,0,0.4)]">
              {formatCurrency(price)}
            </div>
            {priceLabel && (
              <div className="text-sm mt-1 text-[#9A7B5C]">{priceLabel}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PromoBanner;
