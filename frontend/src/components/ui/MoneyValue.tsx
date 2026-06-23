import React from 'react';
import { formatMoneyVND } from '../../shared/formatters';

interface MoneyValueProps {
  amount: number;
  className?: string;
  large?: boolean;
}

export function MoneyValue({ amount, className = '', large = false }: MoneyValueProps) {
  return (
    <span className={`font-mono font-bold text-white tracking-tight ${large ? 'text-lg sm:text-xl' : 'text-xs'} ${className}`}>
      {formatMoneyVND(amount)}
    </span>
  );
}
