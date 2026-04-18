'use client';

import { CreateColorDialog } from '@/components/colors/create-color-dialog';
import { Button } from '@repo/ui/components/ui/button';
import { PaletteIcon } from 'lucide-react';
import { useState } from 'react';

export function ColorsPrimaryButtons() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" size="lg" onClick={() => setOpen(true)}>
        <PaletteIcon className="size-4" />
        <span>Thêm màu</span>
      </Button>
      <CreateColorDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
