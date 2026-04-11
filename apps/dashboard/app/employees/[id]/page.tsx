import type { Metadata } from 'next';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: `Nhân viên #${id} · Vnmixx` };
}

export default async function EmployeeDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
      <h1 className="text-lg font-medium tracking-tight">Nhân viên #{id}</h1>
      <p className="max-w-xl text-sm text-muted-foreground">
        Trang chi tiết (placeholder). Dữ liệu sẽ được nối với API{' '}
        <code className="text-xs">GET /admin/employees/:id</code> trong bước tiếp theo.
      </p>
    </div>
  );
}
