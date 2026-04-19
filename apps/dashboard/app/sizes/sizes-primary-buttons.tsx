'use client';

import { CreateSizeDialog } from '@/modules/sizes/components/sizes/create-size-dialog';
import { Button } from '@repo/ui/components/ui/button';
import { RulerIcon } from 'lucide-react';
import { useState } from 'react';

export function SizesPrimaryButtons() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" size="lg" onClick={() => setOpen(true)}>
        <RulerIcon className="size-4" />
        <span>Thêm kích cỡ</span>
      </Button>
      <CreateSizeDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
