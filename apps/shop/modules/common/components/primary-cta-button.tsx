'use client';

import { Button } from '@repo/ui/components/ui/button';
import { cn } from '@repo/ui/lib/utils';

export type PrimaryCtaButtonVariant = 'filled' | 'outline';

export type PrimaryCtaButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  'className' | 'color' | 'variant'
> & {
  ctaVariant?: PrimaryCtaButtonVariant;
  isIconOnly?: boolean;
  /** Dense sizing for filters, toolbars, or inline actions. */
  ctaSize?: 'default' | 'compact';
  /**
   * Product listing pagination: white + light border when inactive, solid dark when active.
   * Leaf corners match other CTAs; use `paginationActive` for the current page.
   */
  pagination?: boolean;
  paginationActive?: boolean;
  className?: string;
};

/**
 * Shared primary CTA button used across the website.
 * - `filled`: dark background, white text (like button 1)
 * - `outline`: black border + text, hover becomes `filled` (like button 2)
 * - `ctaSize="compact"`: shorter height and smaller type (e.g. filter bar)
 * - `pagination` / `paginationActive`: listing pager (white bordered vs filled current page).
 */
export function PrimaryCtaButton({
  ctaVariant = 'filled',
  isIconOnly = false,
  ctaSize = 'default',
  pagination = false,
  paginationActive = false,
  className,
  ...buttonProps
}: PrimaryCtaButtonProps): React.JSX.Element {
  const baseRadius = 'rounded-tl-[16px]! rounded-tr-[0px]! rounded-bl-[0px]! rounded-br-[16px]!';
  const compactBaseRadius =
    'rounded-tl-[12px]! rounded-tr-[0px]! rounded-bl-[0px]! rounded-br-[12px]!';
  const iconOnlyStyles =
    'h-8! w-8! md:h-9! md:w-9! rounded-tl-[12px]! rounded-tr-[0px]! rounded-bl-[0px]! rounded-br-[12px]! px-0! text-[0px]!';
  const paginationRadius =
    'rounded-tl-[12px]! rounded-tr-[0px]! rounded-bl-[0px]! rounded-br-[12px]!';
  const paginationShell =
    'inline-flex h-8 min-h-8! w-auto! shrink-0 items-center justify-center px-2.5! py-0! normal-case font-medium text-[12px]! leading-none!';
  const paginationColors = paginationActive
    ? 'bg-primary text-primary-foreground border border-primary hover:bg-primary hover:text-primary-foreground'
    : 'bg-background text-muted-foreground border border-[#E7E8E9] hover:bg-muted/40 hover:text-foreground hover:border-muted-foreground/30';
  const paginationDisabled = 'disabled:pointer-events-none disabled:opacity-40';
  const defaultStyles =
    'w-full h-10! md:h-12! uppercase font-semibold px-[18px]! md:px-[24px]! text-[14px]! md:text-[16px]! leading-[20px]! md:leading-[24px]! text-center';
  const compactStyles =
    'w-full h-8! md:h-8! uppercase font-semibold px-[10px]! md:px-[14px]! text-[11px]! md:text-[12px]! leading-4 md:leading-[16px]! text-center';

  const styles =
    ctaVariant === 'filled'
      ? // Default: filled (black). Hover: outline-only (border + black text).
        'bg-primary text-primary-foreground border border-primary hover:bg-transparent! hover:text-primary! hover:border-primary!'
      : // Default: outline-only (border + black text). Hover: filled (black).
        'bg-transparent text-primary border border-primary hover:bg-primary! hover:text-primary-foreground! hover:border-primary! ';

  return (
    <Button
      type={buttonProps.type ?? 'button'}
      variant="default"
      size={buttonProps.size ?? (pagination ? 'default' : isIconOnly ? 'icon' : 'default')}
      className={cn(
        pagination
          ? cn(paginationShell, paginationRadius, paginationColors, paginationDisabled)
          : cn(
              isIconOnly ? iconOnlyStyles : ctaSize === 'compact' ? compactStyles : defaultStyles,
              !isIconOnly && (ctaSize === 'compact' ? compactBaseRadius : baseRadius),
              styles,
            ),
        'transition-colors duration-150 ease-in-out',
        className,
      )}
      {...buttonProps}
    />
  );
}
