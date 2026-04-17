import { cn } from '@repo/ui/lib/utils';

type PageViewHeaderProps = Readonly<{
  title: string;
  description: string;
  className?: string;
  descriptionClassName?: string;
}>;

export function PageViewHeader({
  title,
  description,
  className,
  descriptionClassName,
}: PageViewHeaderProps) {
  return (
    <div className={cn('-mt-2', className)}>
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      <p className={cn('text-muted-foreground', descriptionClassName)}>{description}</p>
    </div>
  );
}
