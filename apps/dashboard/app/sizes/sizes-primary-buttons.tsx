'use client';

import { CreateSizeDialog } from '@/components/sizes/create-size-dialog';
import { Button } from '@repo/ui/components/ui/button';
import { RulerIcon } from 'lucide-react';
import { useState } from 'react';

export function SizesPrimaryButtons() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" className="gap-1.5" onClick={() => setOpen(true)}>
        <span>Thêm kích cỡ</span>
        <RulerIcon className="size-4" />
      </Button>
      <CreateSizeDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
