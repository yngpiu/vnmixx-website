'use client';

import { dashboardRoutes } from '@/config/routes';
import { Button } from '@repo/ui/components/ui/button';
import { ShieldXIcon } from 'lucide-react';
import Link from 'next/link';

export function ForbiddenView() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 text-center">
        <ShieldXIcon className="mx-auto mb-3 size-10 text-destructive" />
        <h1 className="text-xl font-semibold">403 - Khong co quyen truy cap</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tai khoan cua ban khong co quyen xem trang nay.
        </p>
        <Button asChild className="mt-5">
          <Link href={dashboardRoutes.overview}>Ve trang tong quan</Link>
        </Button>
      </div>
    </div>
  );
}
