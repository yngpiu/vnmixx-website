'use client';

import { CreateRoleDialog } from '@/modules/rbac/components/roles/create-role-dialog';
import { Button } from '@repo/ui/components/ui/button';
import { ShieldPlusIcon } from 'lucide-react';
import { useState } from 'react';

export function RolesPrimaryButtons() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <Button type="button" size="lg" onClick={() => setCreateOpen(true)}>
        <ShieldPlusIcon className="size-4" />
        <span>Thêm vai trò</span>
      </Button>
      <CreateRoleDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
