'use client';

import { AttributesPrimaryButtons } from '@/app/attributes/attributes-primary-buttons';
import { AttributesTable } from '@/app/attributes/attributes-table';
import { EditAttributeNameDialog } from '@/components/attributes/edit-attribute-name-dialog';
import { EditAttributeValuesDialog } from '@/components/attributes/edit-attribute-values-dialog';
import { useState } from 'react';

export function AttributesView() {
  const [editNameAttributeId, setEditNameAttributeId] = useState<number | null>(null);
  const [editValuesAttributeId, setEditValuesAttributeId] = useState<number | null>(null);

  const highlightAttributeId = editNameAttributeId ?? editValuesAttributeId;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Thuộc tính</h2>
          <p className="text-muted-foreground">
            Menu ⋮ trên mỗi dòng: <span className="text-foreground font-medium">Sửa tên</span> hoặc{' '}
            <span className="text-foreground font-medium">Sửa giá trị</span>. Sau khi tạo mới,
            dialog <span className="text-foreground font-medium">Sửa giá trị</span> mở sẵn để thêm
            value.
          </p>
        </div>
        <AttributesPrimaryButtons onAttributeCreated={(a) => setEditValuesAttributeId(a.id)} />
      </div>
      <AttributesTable
        highlightAttributeId={highlightAttributeId}
        onEditName={setEditNameAttributeId}
        onEditValues={setEditValuesAttributeId}
      />

      <EditAttributeNameDialog
        attributeId={editNameAttributeId}
        open={editNameAttributeId != null}
        onOpenChange={(open) => {
          if (!open) setEditNameAttributeId(null);
        }}
      />

      <EditAttributeValuesDialog
        attributeId={editValuesAttributeId}
        open={editValuesAttributeId != null}
        onOpenChange={(open) => {
          if (!open) setEditValuesAttributeId(null);
        }}
      />
    </div>
  );
}
