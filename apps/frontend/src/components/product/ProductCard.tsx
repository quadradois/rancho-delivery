import React, { useState } from 'react';
import Image from 'next/image';
import { cn, formatCurrency } from '@/lib/utils';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

export interface ProductCardProps {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: string;
  imageUrl?: string;
  rating?: number;
  reviewCount?: number;
  tempoPreparo?: number;
  tempoEntrega?: number;
  taxaEntrega?: number;
  badge?: {
    text: string;
    variant?: 'brand' | 'gold' | 'green';
  };
  onAddToCart?: (id: string) => void;
  onFavoriteToggle?: (id: string, isFavorite: boolean) => void;
  disabled?: boolean;
  className?: string;
}

const ProductCard: React.FC<ProductCardProps> = ({
  id,
  name,
  description,
  price,
  originalPrice,
  category,
  imageUrl,
  rating = 0,
  reviewCount = 0,
  tempoPreparo,
  tempoEntrega,
  taxaEntrega,
  badge,
  onAddToCart,
  onFavoriteToggle,
  disabled = false,
  className,
}) => {
  const [isFavorite, setIsFavorite] = useState(false);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newFavoriteState = !isFavorite;
    setIsFavorite(newFavoriteState);
    onFavoriteToggle?.(id, newFavoriteState);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onAddToCart?.(id);
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span
          key={i}
          className={cn('text-base', i <= rating ? 'text-[var(--mel-campo)]' : 'text-[var(--madeira-clara)]')}
        >
          ★
        </span>
      );
    }
    return stars;
  };

  return (
    <Card className={cn('group w-full', className)}>
      {/* Image */}
      <div className="relative w-full aspect-[4/3] bg-[var(--madeira-fundo)] overflow-hidden rounded-t-2xl">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
            priority={false}
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2"
            style={{ background: 'repeating-linear-gradient(45deg,var(--madeira-media) 0px,var(--madeira-media) 8px,var(--madeira-fundo) 8px,var(--madeira-fundo) 16px)' }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--couro-escuro)] opacity-60">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span className="text-[10px] text-[var(--couro-escuro)] font-mono">foto do produto</span>
          </div>
        )}

        {/* Badge */}
        {badge && (
          <div className="absolute top-3 left-3">
            <Badge variant={badge.variant || 'brand'} size="md">{badge.text}</Badge>
          </div>
        )}

        {/* Favorite Button */}
        <button
          onClick={handleFavoriteClick}
          aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          className={cn(
            'absolute top-3 right-3 w-8 h-8',
            'bg-[#1A0D06]/80 rounded-full shadow-sm',
            'flex items-center justify-center',
            'transition-all duration-200 hover:scale-110',
            isFavorite ? 'text-[var(--brasa-viva)]' : 'text-[var(--cinza-couro)]'
          )}
        >
          {isFavorite ? '♥' : '♡'}
        </button>
      </div>

      {/* Body */}
      <div className="p-4">
        {/* Category */}
        <div className="text-xs font-bold uppercase tracking-wider text-[var(--mel-campo)] mb-1">
          {category}
        </div>

        {/* Name */}
        <h3 className="font-produto text-xl text-[var(--bege-claro)] leading-tight mb-1">
          {name}
        </h3>

        {/* Description */}
        <p className="text-sm text-[var(--cinza-couro)] leading-relaxed mb-3 line-clamp-2">
          {description}
        </p>

        {/* Tempo de preparo e entrega */}
        <div className="flex flex-col gap-1 mb-3">
          {tempoPreparo !== undefined && (
            <div className="flex items-center gap-1.5 text-xs text-[var(--cinza-couro)]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>Preparo: <strong className="text-[var(--bege-fumaca)]">{tempoPreparo} min</strong></span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-[var(--cinza-couro)]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3" />
              <rect x="9" y="11" width="14" height="10" rx="2" />
              <circle cx="12" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
            </svg>
            {tempoEntrega !== undefined ? (
              <span>Entrega: <strong className="text-[var(--bege-fumaca)]">{tempoEntrega} min</strong>
                {taxaEntrega !== undefined && taxaEntrega > 0 && (
                  <span className="text-[var(--brasa-quente)] ml-1">· {formatCurrency(taxaEntrega)}</span>
                )}
                {taxaEntrega === 0 && (
                  <span className="text-[var(--verde-campo)] ml-1 font-bold">· Grátis</span>
                )}
              </span>
            ) : (
              <span className="text-[var(--couro-escuro)] italic">Digite seu CEP para calcular o tempo de entrega</span>
            )}
          </div>
        </div>

        {/* Rating */}
        {reviewCount > 0 && (
          <div className="flex items-center gap-1 mb-3">
            <div className="flex items-center gap-0.5">{renderStars()}</div>
            <span className="text-xs text-[var(--cinza-couro)] ml-0.5">
              {rating.toFixed(1)} ({reviewCount})
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2">
          {/* Price */}
          <div className="flex flex-col gap-0.5">
            {originalPrice && originalPrice > price && (
              <span className="text-xs text-[var(--couro-escuro)] line-through">
                {formatCurrency(originalPrice)}
              </span>
            )}
            <span className="font-produto text-xl text-[var(--brasa-quente)] leading-none">
              {formatCurrency(price)}
            </span>
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            aria-label="Adicionar ao carrinho"
            disabled={disabled}
            className={cn(
              'w-10 h-10 bg-[var(--brasa-viva)] rounded-full flex-shrink-0',
              'flex items-center justify-center',
              'transition-all duration-200',
              disabled
                ? 'opacity-45 cursor-not-allowed'
                : 'hover:bg-[var(--brasa-quente)] hover:scale-110 hover:shadow-[0_4px_12px_rgba(212,96,28,0.55)] active:scale-95'
            )}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </Card>
  );
};

export default ProductCard;
