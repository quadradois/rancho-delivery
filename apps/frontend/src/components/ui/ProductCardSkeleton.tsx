import React from 'react';
import Skeleton from './Skeleton';

/**
 * Skeleton screen para o ProductCard.
 * Replica a estrutura visual do card enquanto os dados carregam.
 */
const ProductCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden" aria-hidden="true">
      {/* Image */}
      <Skeleton className="w-full aspect-[4/3]" rounded="sm" />

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Category */}
        <Skeleton className="h-3 w-1/4" rounded="full" />

        {/* Name */}
        <Skeleton className="h-6 w-2/3" rounded="md" />

        {/* Description */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" rounded="md" />
          <Skeleton className="h-4 w-3/4" rounded="md" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-7 w-24" rounded="md" />
          <Skeleton className="w-10 h-10" rounded="full" />
        </div>
      </div>
    </div>
  );
};

export default ProductCardSkeleton;
