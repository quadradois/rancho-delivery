import React from 'react';
import Skeleton from './Skeleton';

/**
 * Skeleton screen para um item do carrinho.
 */
const CartItemSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm flex gap-4" aria-hidden="true">
      {/* Image */}
      <Skeleton className="w-20 h-20 flex-shrink-0" rounded="xl" />

      {/* Content */}
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-3/4" rounded="md" />
        <Skeleton className="h-4 w-1/2" rounded="md" />
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-6 w-20" rounded="md" />
          <Skeleton className="h-8 w-24" rounded="full" />
        </div>
      </div>
    </div>
  );
};

export default CartItemSkeleton;
