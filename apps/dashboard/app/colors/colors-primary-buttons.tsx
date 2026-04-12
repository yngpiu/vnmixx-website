'use client';

import { CreateColorDialog } from '@/components/colors/create-color-dialog';
import { Button } from '@repo/ui/components/ui/button';
import { PaletteIcon } from 'lucide-react';
import { useState } from 'react';

export function ColorsPrimaryButtons() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" className="gap-1.5" onClick={() => setOpen(true)}>
        <span>Thêm màu</span>
        <PaletteIcon className="size-4" />
      </Button>
      <CreateColorDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
