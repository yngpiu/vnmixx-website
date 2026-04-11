'use client';

import { adminModuleNewPath } from '@/lib/admin-modules';
import { Button } from '@repo/ui/components/ui/button';
import { MailPlusIcon, UserPlusIcon } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export function EmployeesPrimaryButtons() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        type="button"
        className="gap-1.5"
        onClick={() => toast.info('Mời nhân viên qua email — tính năng sắp ra mắt.')}
      >
        <span>Mời nhân viên</span>
        <MailPlusIcon className="size-4" />
      </Button>
      <Button asChild className="gap-1.5">
        <Link href={adminModuleNewPath('employees')}>
          <span>Thêm nhân viên</span>
          <UserPlusIcon className="size-4" />
        </Link>
      </Button>
    </div>
  );
}
