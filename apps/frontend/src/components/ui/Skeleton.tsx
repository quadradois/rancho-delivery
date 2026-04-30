import React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps {
  className?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

/**
 * Bloco skeleton base com shimmer nas cores Rancho.
 * Use className para definir width e height.
 */
const Skeleton: React.FC<SkeletonProps> = ({ className, rounded = 'md' }) => {
  const radii = {
    sm:   'rounded-sm',
    md:   'rounded-md',
    lg:   'rounded-lg',
    xl:   'rounded-xl',
    full: 'rounded-full',
  };

  return (
    <div
      className={cn('skeleton-shimmer', radii[rounded], className)}
      aria-hidden="true"
    />
  );
};

export default Skeleton;
