import React from 'react';
import Skeleton from '@/components/ui/Skeleton';

/**
 * Skeleton que espelha o layout do OrderCard.
 * Útil para estados de carregamento futuros do carrinho.
 */
const CartItemSkeleton: React.FC = () => {
  return (
    <div
      className="rounded-2xl p-5 flex items-center gap-4"
      style={{ background: '#251208', border: '1px solid #3E2214' }}
      aria-hidden="true"
    >
      {/* Ícone */}
      <Skeleton className="w-12 h-12 flex-shrink-0" rounded="lg" />

      {/* Info */}
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3" rounded="md" />
        <Skeleton className="h-3 w-1/2" rounded="md" />
      </div>

      {/* Preço + Stepper */}
      <div className="flex flex-col items-end gap-2">
        <Skeleton className="h-5 w-16" rounded="md" />
        <Skeleton className="h-8 w-24" rounded="full" />
      </div>
    </div>
  );
};

export default CartItemSkeleton;
