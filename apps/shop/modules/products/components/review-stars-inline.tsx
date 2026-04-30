import { cn } from '@repo/ui/lib/utils';
import { Star } from 'lucide-react';
import type { JSX } from 'react';

type ReviewStarsInlineProps = {
  rating: number;
  /** When true, all five stars are filled (e.g. PDP header before any reviews). */
  decorativeFull?: boolean;
  className?: string;
  starClassName?: string;
};

/**
 * Five-star display for ratings (1–5), filled in amber.
 */
export function ReviewStarsInline({
  rating,
  decorativeFull = false,
  className,
  starClassName,
}: ReviewStarsInlineProps): JSX.Element {
  const filled: number = decorativeFull ? 5 : Math.min(5, Math.max(0, Math.round(rating)));
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} aria-hidden>
      {[1, 2, 3, 4, 5].map((index) => {
        const isFilled: boolean = index <= filled;
        return (
          <Star
            key={index}
            className={cn(
              'size-3.5 shrink-0 md:size-4',
              isFilled ? 'fill-amber-400 text-amber-400' : 'fill-none text-muted-foreground/45',
              starClassName,
            )}
            strokeWidth={isFilled ? 0 : 1.2}
          />
        );
      })}
    </span>
  );
}
