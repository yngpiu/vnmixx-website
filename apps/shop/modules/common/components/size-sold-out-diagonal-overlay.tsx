import { cn } from '@repo/ui/lib/utils';

type SizeSoldOutDiagonalOverlayProps = {
  roundedClass?: string;
};

/** Diagonal slash across entire size chip (reference UX), not text-only line-through. */
export function SizeSoldOutDiagonalOverlay({
  roundedClass = 'rounded-[inherit]',
}: SizeSoldOutDiagonalOverlayProps): React.JSX.Element {
  return (
    <span
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 z-20 overflow-hidden', roundedClass)}
    >
      <span className="absolute left-1/2 top-1/2 block h-[1.5px] w-[calc(141%+12px)] -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-muted-foreground/50" />
    </span>
  );
}
