import { cn } from '@repo/ui/lib/utils';
import Image from 'next/image';

type DashboardLogoProps = {
  width: number;
  height: number;
  priority?: boolean;
  /** Wrapper (inline-flex) — layout ngoài hai ảnh. */
  className?: string;
  /** Class dùng chung cho cả hai ảnh. */
  imageClassName?: string;
  alt?: string;
};

/** `logo-light` khi theme sáng, `logo-dark` khi theme tối (`html.dark`). */
export function DashboardLogo({
  width,
  height,
  priority,
  className,
  imageClassName,
  alt = 'VNMIXX',
}: DashboardLogoProps) {
  const shared = cn('h-auto w-auto object-contain', imageClassName);

  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      <Image
        src="/images/logo-light.png"
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        unoptimized
        className={cn(shared, 'dark:hidden')}
      />
      <Image
        src="/images/logo-dark.png"
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        unoptimized
        className={cn(shared, 'hidden dark:block')}
      />
    </span>
  );
}
