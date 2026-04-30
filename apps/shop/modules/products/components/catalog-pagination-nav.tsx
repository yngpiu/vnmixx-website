'use client';

import { PrimaryCtaButton } from '@/modules/common/components/primary-cta-button';
import { buildCatalogVisiblePageNumbers } from '@/modules/products/utils/catalog-url-parsers';

type CatalogPaginationNavProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function CatalogPaginationNav({
  page,
  totalPages,
  onPageChange,
}: CatalogPaginationNavProps): React.JSX.Element | null {
  if (totalPages <= 1) {
    return null;
  }
  return (
    <nav
      className="mt-10 flex flex-wrap items-center justify-center gap-2"
      aria-label="Phân trang danh mục"
    >
      <PrimaryCtaButton
        type="button"
        pagination
        aria-label="Trang đầu"
        disabled={page <= 1}
        className="px-3!"
        onClick={() => onPageChange(1)}
      >
        Trang đầu
      </PrimaryCtaButton>
      <PrimaryCtaButton
        type="button"
        pagination
        aria-label="Trang trước"
        disabled={page <= 1}
        className="min-w-8! w-8 max-w-8 px-0! font-normal tabular-nums"
        onClick={() => onPageChange(page - 1)}
      >
        «
      </PrimaryCtaButton>
      {buildCatalogVisiblePageNumbers(page, totalPages).map((pageNum) => (
        <PrimaryCtaButton
          key={pageNum}
          type="button"
          pagination
          paginationActive={pageNum === page}
          aria-current={pageNum === page ? 'page' : undefined}
          className="min-w-8! w-8 max-w-8 px-0! tabular-nums"
          onClick={() => onPageChange(pageNum)}
        >
          {pageNum}
        </PrimaryCtaButton>
      ))}
      <PrimaryCtaButton
        type="button"
        pagination
        aria-label="Trang sau"
        disabled={page >= totalPages}
        className="min-w-8! w-8 max-w-8 px-0! font-normal tabular-nums"
        onClick={() => onPageChange(page + 1)}
      >
        »
      </PrimaryCtaButton>
      <PrimaryCtaButton
        type="button"
        pagination
        aria-label="Trang cuối"
        disabled={page >= totalPages}
        className="px-3!"
        onClick={() => onPageChange(totalPages)}
      >
        Trang cuối
      </PrimaryCtaButton>
    </nav>
  );
}
