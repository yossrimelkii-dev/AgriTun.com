import { cn } from '@/lib/utils';
import { useI18n } from '@/components/providers/locale-provider';

interface StockBadgeProps {
  qty: number;
}

export function StockBadge({ qty }: StockBadgeProps) {
  const { t } = useI18n();
  const config = qty === 0
    ? { label: t('stockBadge.outOfStock'), color: 'bg-red-100 text-red-700' }
    : qty <= 10
      ? { label: `${qty} ${t('stockBadge.inStock')}`, color: 'bg-orange-100 text-orange-700' }
      : { label: t('stockBadge.inStock'), color: 'bg-green-100 text-green-700' };

  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full', config.color)}>
      {config.label}
    </span>
  );
}
