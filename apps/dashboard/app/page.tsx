export default function OverviewPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
      <div>
        <h1 className="text-lg font-medium tracking-tight">Tổng quan</h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Chọn module ở thanh bên — mỗi mục tương ứng với một phần của API quản trị trong{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">apps/api</code> (ví dụ{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">admin/orders</code>,{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">admin/products</code>).
        </p>
      </div>
      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        <div className="aspect-video rounded-xl border border-dashed border-border/80 bg-muted/40" />
        <div className="aspect-video rounded-xl border border-dashed border-border/80 bg-muted/40" />
        <div className="aspect-video rounded-xl border border-dashed border-border/80 bg-muted/40" />
      </div>
      <div className="min-h-[40vh] flex-1 rounded-xl border border-dashed border-border/80 bg-muted/30 md:min-h-min" />
    </div>
  );
}
