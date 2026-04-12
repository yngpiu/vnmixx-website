'use client';

import { uploadImageToCloudinary } from '@/lib/cloudinary-client-upload';
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
import { GripVerticalIcon, ImagePlusIcon, Loader2Icon, Trash2Icon } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

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
  uploading: boolean;
  onRemove: () => void;
};

function SortableImageRow({
  id,
  url,
  index,
  disabled,
  uploading,
  onRemove,
}: SortableImageRowProps) {
  const {
    attributes,
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
            disabled={disabled || uploading}
            aria-label="Kéo để đổi thứ tự"
            {...attributes}
            {...listeners}
          >
            <GripVerticalIcon className="size-4" />
          </button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-destructive hover:text-destructive size-9"
            disabled={disabled || uploading}
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const itemIds = useMemo(() => urls.map((_, i) => sortableId(colorId, i)), [urls, colorId]);

  const addFromFiles = async (files: FileList | null) => {
    if (!files?.length || disabled || uploading) return;
    const remaining = maxFiles - urls.length;
    if (remaining <= 0) return;
    const picked = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      const next = [...urls];
      for (const file of picked) {
        const { secureUrl } = await uploadImageToCloudinary(file);
        next.push(secureUrl);
      }
      onUrlsChange(next);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload thất bại');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

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
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="sr-only"
        disabled={disabled || uploading || urls.length >= maxFiles}
        onChange={(e) => void addFromFiles(e.target.files)}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full gap-1"
        disabled={disabled || uploading || urls.length >= maxFiles}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : (
          <ImagePlusIcon className="size-4" />
        )}
        {uploading ? 'Đang tải…' : 'Thêm ảnh'}
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
                  uploading={uploading}
                  onRemove={() => onUrlsChange(urls.filter((_, i) => i !== index))}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
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
