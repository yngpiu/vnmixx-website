'use client';

import { CreateEmployeeDialog } from '@/components/employees/create-employee-dialog';
import { Button } from '@repo/ui/components/ui/button';
import { UserPlusIcon } from 'lucide-react';
import { useState } from 'react';

export function EmployeesPrimaryButtons() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button type="button" className="gap-1.5" onClick={() => setCreateOpen(true)}>
          <span>Thêm nhân viên</span>
          <UserPlusIcon className="size-4" />
        </Button>
      </div>
      <CreateEmployeeDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
