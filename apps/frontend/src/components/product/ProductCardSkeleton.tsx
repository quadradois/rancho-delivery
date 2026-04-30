import React from 'react';
import Skeleton from '@/components/ui/Skeleton';

/**
 * Skeleton que espelha o layout do ProductCard.
 * Exibido enquanto os produtos carregam da API.
 */
const ProductCardSkeleton: React.FC = () => {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: '#251208', border: '1px solid #3E2214' }}
      aria-hidden="true"
    >
      {/* Imagem */}
      <Skeleton className="w-full aspect-[4/3]" rounded="sm" />

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Categoria */}
        <Skeleton className="h-3 w-1/4" rounded="md" />

        {/* Título */}
        <Skeleton className="h-5 w-2/3" rounded="md" />

        {/* Descrição — 2 linhas */}
        <Skeleton className="h-3 w-full" rounded="md" />
        <Skeleton className="h-3 w-3/4" rounded="md" />

        {/* Footer: preço + botão */}
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-6 w-1/4" rounded="md" />
          <Skeleton className="w-10 h-10" rounded="full" />
        </div>
      </div>
    </div>
  );
};

export default ProductCardSkeleton;
