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
        <Button type="button" size="lg" onClick={() => setCreateOpen(true)}>
          <UserPlusIcon className="size-4" />
          <span>Thêm nhân viên</span>
        </Button>
      </div>
      <CreateEmployeeDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
