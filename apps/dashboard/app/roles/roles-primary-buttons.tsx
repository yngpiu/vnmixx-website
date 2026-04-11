'use client';

import { CreateRoleDialog } from '@/components/roles/create-role-dialog';
import { Button } from '@repo/ui/components/ui/button';
import { ShieldPlusIcon } from 'lucide-react';
import { useState } from 'react';

export function RolesPrimaryButtons() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <Button type="button" className="gap-1.5" onClick={() => setCreateOpen(true)}>
        <span>Thêm vai trò</span>
        <ShieldPlusIcon className="size-4" />
      </Button>
      <CreateRoleDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
