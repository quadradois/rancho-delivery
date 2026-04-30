import React from 'react';
import { cn, formatCurrency } from '@/lib/utils';
import Stepper from '@/components/ui/Stepper';

export interface OrderCardProps {
  id: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  icon?: string;
  onQuantityChange: (id: string, quantity: number) => void;
  className?: string;
}

const OrderCard: React.FC<OrderCardProps> = ({
  id,
  name,
  description,
  price,
  quantity,
  icon = '🍔',
  onQuantityChange,
  className,
}) => {
  return (
    <div
      className={cn(
        'bg-[#251208] rounded-2xl p-5 border border-[#3E2214]',
        'shadow-[0_8px_40px_rgba(0,0,0,0.7)]',
        'flex items-center gap-4',
        className
      )}
    >
      {/* Icon */}
      <div className="w-12 h-12 bg-[#3E2214] rounded-lg flex items-center justify-center flex-shrink-0 text-[22px]">
        {icon}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="font-body font-extrabold text-md uppercase text-[#F4E8CC] mb-0.5">
          {name}
        </div>
        {description && (
          <div className="text-xs text-[#9A7B5C]">{description}</div>
        )}
      </div>

      {/* Right Side */}
      <div className="flex flex-col items-end gap-1">
        <span className="font-display text-lg text-[#E87830]">
          {formatCurrency(price * quantity)}
        </span>
        <Stepper
          value={quantity}
          min={0}
          onChange={(newQuantity) => onQuantityChange(id, newQuantity)}
        />
      </div>
    </div>
  );
};

export default OrderCard;
