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
  className?: string;
};

/**
 * Shared primary CTA button used across the website.
 * - `filled`: dark background, white text (like button 1)
 * - `outline`: black border + text, hover becomes `filled` (like button 2)
 */
export function PrimaryCtaButton({
  ctaVariant = 'filled',
  isIconOnly = false,
  className,
  ...buttonProps
}: PrimaryCtaButtonProps): React.JSX.Element {
  const baseRadius = 'rounded-tl-[16px]! rounded-tr-[0px]! rounded-bl-[0px]! rounded-br-[16px]!';
  const iconOnlyStyles =
    'h-8! w-8! md:h-9! md:w-9! rounded-tl-[12px]! rounded-tr-[0px]! rounded-bl-[0px]! rounded-br-[12px]! px-0! text-[0px]!';
  const defaultStyles =
    'w-full h-10! md:h-12! uppercase font-semibold px-[18px]! md:px-[24px]! text-[14px]! md:text-[16px]! leading-[20px]! md:leading-[24px]! text-center';

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
      size={buttonProps.size ?? (isIconOnly ? 'icon' : 'default')}
      className={cn(
        isIconOnly ? iconOnlyStyles : defaultStyles,
        !isIconOnly && baseRadius,
        styles,
        'transition-colors duration-150 ease-in-out',
        className,
      )}
      {...buttonProps}
    />
  );
}
