'use client';

import { CreateAttributeDialog } from '@/components/attributes/create-attribute-dialog';
import type { Attribute } from '@/lib/types/attribute';
import { Button } from '@repo/ui/components/ui/button';
import { TagsIcon } from 'lucide-react';
import { useState } from 'react';

type AttributesPrimaryButtonsProps = {
  onAttributeCreated?: (attribute: Attribute) => void;
};

export function AttributesPrimaryButtons({ onAttributeCreated }: AttributesPrimaryButtonsProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" className="gap-1.5" onClick={() => setOpen(true)}>
        <span>Thêm thuộc tính</span>
        <TagsIcon className="size-4" />
      </Button>
      <CreateAttributeDialog open={open} onOpenChange={setOpen} onCreated={onAttributeCreated} />
    </>
  );
}
