'use client';

import { Button } from '@repo/ui/components/ui/button';
import { cn } from '@repo/ui/lib/utils';

export type PrimaryCtaButtonVariant = 'filled' | 'outline';

export type PrimaryCtaButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  'className' | 'color' | 'variant'
> & {
  ctaVariant?: PrimaryCtaButtonVariant;
  className?: string;
};

/**
 * Shared primary CTA button used across the website.
 * - `filled`: dark background, white text (like button 1)
 * - `outline`: black border + text, hover becomes `filled` (like button 2)
 */
export function PrimaryCtaButton({
  ctaVariant = 'filled',
  className,
  ...buttonProps
}: PrimaryCtaButtonProps): React.JSX.Element {
  const baseRadius = 'rounded-tl-[16px]! rounded-tr-[0px]! rounded-bl-[0px]! rounded-br-[16px]!';

  const styles =
    ctaVariant === 'filled'
      ? // Default: filled (black). Hover: outline-only (border + black text).
        'bg-primary text-primary-foreground border border-transparent hover:bg-transparent! hover:text-primary! hover:border-primary!'
      : // Default: outline-only (border + black text). Hover: filled (black).
        'bg-transparent text-primary border border-primary hover:bg-primary! hover:text-primary-foreground! hover:border-transparent! ';

  return (
    <Button
      type={buttonProps.type ?? 'button'}
      variant="default"
      size={buttonProps.size ?? 'default'}
      className={cn(
        'w-full h-auto! uppercase font-semibold px-[24px]! py-[12px]! text-[16px]! leading-[24px]! text-center',
        baseRadius,
        styles,
        'transition-colors duration-150 ease-in-out',
        className,
      )}
      {...buttonProps}
    />
  );
}
