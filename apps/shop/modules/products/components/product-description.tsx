import DOMPurify from 'isomorphic-dompurify';
import type { JSX } from 'react';
import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';

/** Class chung cho HTML (Quill) và Markdown — giữ bố cục PDP đồng nhất. */
const descBodyTypographyClass =
  '[&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5 [&_li]:leading-snug [&_strong]:font-semibold [&_strong]:text-foreground [&_b]:font-semibold [&_b]:text-foreground [&_em]:italic [&_i]:italic [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-2 [&_a]:hover:text-foreground [&_h1]:mb-2 [&_h1]:text-base [&_h1]:font-semibold [&_h1]:text-foreground [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:border-b [&_h2]:border-border [&_h2]:pb-1 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:uppercase [&_h2]:tracking-wide [&_h2]:text-foreground [&_h2]:first:mt-0 [&_h3]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-foreground [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_pre]:mb-3 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:border-border [&_pre]:bg-muted/40 [&_pre]:p-3 [&_pre]:text-[13px] [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px]';

function isProbablyRichHtml(raw: string): boolean {
  const t = raw.trimStart();
  if (t.length < 2 || t[0] !== '<') return false;
  const head = t.slice(0, Math.min(12000, t.length));
  return /<\/?(?:p|div|br|span|strong|em|b|i|u|s|del|sub|sup|ul|ol|li|blockquote|h[1-6]|a)\b/i.test(
    head,
  );
}

function sanitizeProductDescriptionHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty.trim(), {
    ALLOWED_TAGS: [
      'p',
      'br',
      'div',
      'span',
      'strong',
      'em',
      'b',
      'i',
      'u',
      's',
      'del',
      'sub',
      'sup',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'ul',
      'ol',
      'li',
      'blockquote',
      'a',
      'pre',
      'code',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    ALLOW_DATA_ATTR: false,
  });
}

const mdComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-3 whitespace-normal last:mb-0">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="mb-3 list-disc space-y-1.5 whitespace-normal pl-5 last:mb-0">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="mb-3 list-decimal space-y-1.5 whitespace-normal pl-5 last:mb-0">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="leading-snug">{children}</li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => <em className="italic">{children}</em>,
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => {
    const external = typeof href === 'string' && /^https?:\/\//iu.test(href);
    return (
      <a
        href={href}
        className="font-medium underline underline-offset-2 hover:text-foreground"
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {children}
      </a>
    );
  },
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="mb-2 text-base font-semibold text-foreground">{children}</h3>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h4 className="mb-2 mt-4 border-b border-border pb-1 text-sm font-semibold uppercase tracking-wide text-foreground first:mt-0">
      {children}
    </h4>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h5 className="mb-2 text-sm font-semibold text-foreground">{children}</h5>
  ),
  hr: () => <hr className="my-4 border-border" />,
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-2 border-border pl-3 text-muted-foreground italic">
      {children}
    </blockquote>
  ),
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="mb-3 overflow-x-auto rounded-md border border-border bg-muted/40 p-3 text-[13px] text-foreground">
      {children}
    </pre>
  ),
  code: ({
    inline,
    children,
  }: {
    inline?: boolean;
    className?: string;
    children?: React.ReactNode;
    node?: unknown;
  }): JSX.Element => {
    if (inline !== false && inline !== undefined) {
      return (
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-[13px] text-foreground">
          {children}
        </code>
      );
    }
    return <code className="block font-mono text-[13px] whitespace-pre">{children}</code>;
  },
} satisfies Components;

/**
 * Mô tả PDP: **HTML** (Quill trên dashboard) sau DOMPurify, hoặc **Markdown/plain** (crawl Ivy, v.v.).
 */
export function ProductDescription({ source }: Readonly<{ source: string }>): React.JSX.Element {
  if (isProbablyRichHtml(source)) {
    const html = sanitizeProductDescriptionHtml(source);
    if (html.length === 0) {
      return <p className="text-sm text-muted-foreground">—</p>;
    }
    return (
      <div
        className={descBodyTypographyClass}
        // Safe: đã qua DOMPurify, không cho script/style/on*
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  return (
    <div className={descBodyTypographyClass}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={mdComponents}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
