'use client';

import { useTheme } from '@/providers/theme-provider';
import { cn } from '@repo/ui/lib/utils';
import { useEffect, useState } from 'react';

type JsonHighlightedBlockProps = {
  /** Chuỗi JSON đã format (rỗng / ký tự "—" sẽ hiển thị text thuần). */
  code: string;
  className?: string;
};

/**
 * JSON có màu theo theme (Shiki: light-plus / dark-plus — gần VS Code).
 */
export function JsonHighlightedBlock({ code, className }: JsonHighlightedBlockProps) {
  const { resolvedTheme } = useTheme();
  const [html, setHtml] = useState<string | null>(null);

  const skipHighlight = code === '' || code === '—';

  useEffect(() => {
    if (skipHighlight) {
      setHtml(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { codeToHtml } = await import('shiki/bundle/web');
      const out = await codeToHtml(code, {
        lang: 'json',
        theme: resolvedTheme === 'dark' ? 'dark-plus' : 'light-plus',
      });
      if (!cancelled) {
        setHtml(out);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, resolvedTheme, skipHighlight]);

  if (skipHighlight) {
    return (
      <span className={cn('text-foreground font-mono text-xs', className)}>{code || '—'}</span>
    );
  }

  if (html === null) {
    return (
      <pre
        className={cn(
          'text-foreground font-mono text-xs leading-relaxed whitespace-pre-wrap break-all',
          className,
        )}
      >
        {code}
      </pre>
    );
  }

  return (
    <div
      className={cn(
        'json-shiki text-xs leading-relaxed [&_pre.shiki]:!bg-transparent',
        '[&_pre.shiki]:overflow-visible [&_pre.shiki]:p-0',
        '[&_pre.shiki]:whitespace-pre-wrap [&_pre.shiki]:break-all [&_code]:font-mono',
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
