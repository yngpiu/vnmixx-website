'use client';

import { formatVnd } from '@/modules/common/utils/format-vnd';
import type { DashboardKpiCard } from '@/modules/dashboard/types/dashboard';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/ui/card';
import { cn } from '@repo/ui/lib/utils';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CircleAlertIcon,
  CreditCardIcon,
  PackageCheckIcon,
  ShoppingCartIcon,
  StarIcon,
  UserRoundPlusIcon,
  WalletIcon,
} from 'lucide-react';
import { formatDelta } from './dashboard-overview.utils';

type CardIconConfig = {
  icon: LucideIcon;
  iconWrapClassName: string;
  iconClassName: string;
};

const KPI_ICON_MAP: Record<string, CardIconConfig> = {
  revenue: {
    icon: WalletIcon,
    iconWrapClassName: 'bg-violet-100 dark:bg-violet-950/60',
    iconClassName: 'text-violet-600 dark:text-violet-300',
  },
  orders: {
    icon: ShoppingCartIcon,
    iconWrapClassName: 'bg-emerald-100 dark:bg-emerald-950/60',
    iconClassName: 'text-emerald-600 dark:text-emerald-300',
  },
  newCustomers: {
    icon: UserRoundPlusIcon,
    iconWrapClassName: 'bg-amber-100 dark:bg-amber-950/60',
    iconClassName: 'text-amber-600 dark:text-amber-300',
  },
  averageRating: {
    icon: StarIcon,
    iconWrapClassName: 'bg-amber-100 dark:bg-amber-950/60',
    iconClassName: 'text-amber-600 dark:text-amber-300',
  },
  aov: {
    icon: CreditCardIcon,
    iconWrapClassName: 'bg-sky-100 dark:bg-sky-950/60',
    iconClassName: 'text-sky-600 dark:text-sky-300',
  },
};

function renderTrendIcon(trend: 'up' | 'down' | 'flat') {
  if (trend === 'up') {
    return <ArrowUpIcon className="size-3.5 text-emerald-600" />;
  }
  if (trend === 'down') {
    return <ArrowDownIcon className="size-3.5 text-rose-600" />;
  }
  return <CircleAlertIcon className="size-3.5 text-muted-foreground" />;
}

export function KpiCard({ card }: { card: DashboardKpiCard }) {
  const value =
    card.key === 'revenue'
      ? formatVnd(card.value)
      : card.key === 'averageRating'
        ? `${card.value.toFixed(1)} / 5`
        : card.value.toLocaleString('vi-VN');
  const iconConfig = KPI_ICON_MAP[card.key] ?? {
    icon: PackageCheckIcon,
    iconWrapClassName: 'bg-muted',
    iconClassName: 'text-muted-foreground',
  };
  const Icon = iconConfig.icon;

  return (
    <Card size="sm" className="gap-2 border">
      <CardHeader className="pb-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardDescription>{card.label}</CardDescription>
            <CardTitle className="text-xl">{value}</CardTitle>
          </div>
          <span
            className={cn(
              'inline-flex size-10 items-center justify-center rounded-xl',
              iconConfig.iconWrapClassName,
            )}
          >
            <Icon className={cn('size-5', iconConfig.iconClassName)} />
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex items-center gap-1 text-xs text-muted-foreground">
        {renderTrendIcon(card.trend)}
        <span>{formatDelta(card.deltaPercent)}</span>
      </CardContent>
    </Card>
  );
}
