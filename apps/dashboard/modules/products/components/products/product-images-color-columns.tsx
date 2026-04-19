'use client';

import { MediaPickerDialog } from '@/modules/products/components/products/media-picker-dialog';
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@repo/ui/components/ui/button';
import { GripVerticalIcon, ImagesIcon, Trash2Icon } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useMemo, useState } from 'react';

function sortableId(colorId: number, index: number): string {
  return `${colorId}::${index}`;
}

function parseSortableId(id: string): { colorId: number; index: number } | null {
  const parts = id.split('::');
  if (parts.length !== 2) return null;
  const colorId = Number.parseInt(parts[0]!, 10);
  const index = Number.parseInt(parts[1]!, 10);
  if (!Number.isFinite(colorId) || !Number.isFinite(index)) return null;
  return { colorId, index };
}

type SortableImageRowProps = {
  id: string;
  url: string;
  index: number;
  disabled: boolean;
  onRemove: () => void;
};

function SortableImageRow({ id, url, index, disabled, onRemove }: SortableImageRowProps) {
  const {
    attributes: dragHandleProps,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`bg-background touch-none ${isDragging ? 'z-10 opacity-90 shadow-lg ring-2 ring-primary/30' : ''}`}
    >
      <div className="relative flex w-max max-w-full gap-1.5 rounded-lg border bg-muted/20 p-1 shadow-sm">
        <div className="flex shrink-0 flex-col items-center gap-1">
          <button
            type="button"
            ref={setActivatorNodeRef}
            className="text-muted-foreground hover:bg-muted/80 flex size-9 cursor-grab items-center justify-center rounded-md border border-transparent active:cursor-grabbing"
            disabled={disabled}
            aria-label="Kéo để đổi thứ tự"
            {...dragHandleProps}
            {...listeners}
          >
            <GripVerticalIcon className="size-4" />
          </button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-destructive hover:text-destructive size-9"
            disabled={disabled}
            onClick={onRemove}
            aria-label="Xóa ảnh"
          >
            <Trash2Icon className="size-4" />
          </Button>
        </div>
        <div className="relative size-20 shrink-0 overflow-hidden rounded-md border">
          <Image src={url} alt="" fill className="object-cover" sizes="80px" unoptimized />
          <span className="bg-background/90 text-muted-foreground absolute bottom-0 left-0 rounded-tr px-1 py-px text-[10px] font-medium tabular-nums">
            #{index + 1}
          </span>
        </div>
      </div>
    </li>
  );
}

type ColorColumnProps = {
  colorId: number;
  colorName: string;
  urls: string[];
  onUrlsChange: (urls: string[]) => void;
  disabled: boolean;
  maxFiles: number;
};

function ColorImageColumn({
  colorId,
  colorName,
  urls,
  onUrlsChange,
  disabled,
  maxFiles,
}: ColorColumnProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const itemIds = useMemo(() => urls.map((_, i) => sortableId(colorId, i)), [urls, colorId]);

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const a = parseSortableId(String(active.id));
      const b = parseSortableId(String(over.id));
      if (!a || !b || a.colorId !== colorId || b.colorId !== colorId) return;
      if (a.index === b.index) return;
      onUrlsChange(arrayMove(urls, a.index, b.index));
    },
    [urls, onUrlsChange, colorId],
  );

  return (
    <div className="border-border/80 flex w-max min-w-0 shrink-0 flex-col gap-1.5 rounded-xl border bg-muted/10 px-2 py-2 shadow-sm">
      <p className="text-center text-sm font-semibold leading-tight tracking-tight">{colorName}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full gap-1"
        disabled={disabled || urls.length >= maxFiles}
        onClick={() => setPickerOpen(true)}
      >
        <ImagesIcon className="size-4" />
        Chọn ảnh
      </Button>
      {urls.length >= maxFiles ? (
        <p className="text-muted-foreground text-center text-[10px]">Đã đủ {maxFiles} ảnh.</p>
      ) : null}

      {urls.length === 0 ? (
        <p className="text-muted-foreground py-4 text-center text-xs leading-relaxed">
          Chưa có ảnh
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          autoScroll={false}
          onDragEnd={onDragEnd}
        >
          <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
            <ul className="flex w-max max-w-full flex-col gap-1.5">
              {urls.map((url, index) => (
                <SortableImageRow
                  key={`${colorId}-${url}`}
                  id={sortableId(colorId, index)}
                  url={url}
                  index={index}
                  disabled={disabled}
                  onRemove={() => onUrlsChange(urls.filter((_, i) => i !== index))}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
      <MediaPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        title={`Chọn ảnh màu: ${colorName}`}
        description={`Chọn tối đa ${maxFiles} ảnh cho màu này.`}
        multiple
        selectedUrls={urls}
        onConfirm={(picked) => {
          onUrlsChange(picked.slice(0, maxFiles));
        }}
      />
    </div>
  );
}

export type ProductImagesColorColumnsProps = {
  colorIds: number[];
  colorLabel: (colorId: number) => string;
  imagesByColorId: Record<number, string[]>;
  onUrlsChange: (colorId: number, urls: string[]) => void;
  disabled?: boolean;
  maxFilesPerColor?: number;
};

export function ProductImagesColorColumns({
  colorIds,
  colorLabel,
  imagesByColorId,
  onUrlsChange,
  disabled = false,
  maxFilesPerColor = 16,
}: ProductImagesColorColumnsProps) {
  if (colorIds.length === 0) {
    return (
      <p className="text-muted-foreground text-sm leading-relaxed">
        Thêm ít nhất một dòng biến thể để gán ảnh theo màu.
      </p>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto overflow-y-hidden overscroll-y-contain pb-1.5 [-ms-overflow-style:none] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent">
      {colorIds.map((colorId) => (
        <ColorImageColumn
          key={colorId}
          colorId={colorId}
          colorName={colorLabel(colorId)}
          urls={imagesByColorId[colorId] ?? []}
          onUrlsChange={(urls) => onUrlsChange(colorId, urls)}
          disabled={disabled}
          maxFiles={maxFilesPerColor}
        />
      ))}
    </div>
  );
}
