import React from 'react';
import ProductCardSkeleton from './ProductCardSkeleton';

export interface ProductGridSkeletonProps {
  count?: number;
}

/**
 * Grid de N ProductCardSkeleton.
 * Usa o mesmo layout responsivo do grid de produtos real.
 */
const ProductGridSkeleton: React.FC<ProductGridSkeletonProps> = ({ count = 6 }) => {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      aria-label="Carregando produtos..."
      aria-busy="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
};

export default ProductGridSkeleton;
