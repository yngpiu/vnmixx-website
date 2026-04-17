'use client';

import type { FolderNode } from '@/lib/types/media';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@repo/ui/components/ui/context-menu';
import { cn } from '@repo/ui/lib/utils';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  FolderIcon,
  FolderOpenIcon,
  FolderPlusIcon,
  Trash2Icon,
  UploadIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';

type FolderTreeProps = {
  folders: string[];
  currentFolder: string;
  onFolderSelect: (path: string) => void;
  onUpload: (folder: string) => void;
  onCreateFolder: (parentFolder: string) => void;
  onDeleteFolder: (folderPath: string) => void;
  enableContextMenu?: boolean;
};

/** Build a nested folder tree from flat folder paths. */
function buildFolderTree(paths: string[]): FolderNode[] {
  const root: FolderNode[] = [];
  for (const fullPath of paths) {
    const parts = fullPath.split('/');
    let current = root;
    let accumulated = '';
    for (const part of parts) {
      accumulated = accumulated ? `${accumulated}/${part}` : part;
      let node = current.find((n) => n.name === part);
      if (!node) {
        node = { name: part, path: accumulated, children: [] };
        current.push(node);
      }
      current = node.children;
    }
  }
  return root;
}

function FolderTreeNode({
  node,
  currentFolder,
  onSelect,
  onUpload,
  onCreateFolder,
  onDeleteFolder,
  enableContextMenu = true,
  depth = 0,
}: {
  node: FolderNode;
  currentFolder: string;
  onSelect: (path: string) => void;
  onUpload: (folder: string) => void;
  onCreateFolder: (parentFolder: string) => void;
  onDeleteFolder: (folderPath: string) => void;
  enableContextMenu?: boolean;
  depth?: number;
}) {
  const isActive = currentFolder === node.path;
  const isParentOfActive = currentFolder.startsWith(node.path + '/');
  const isInActiveBranch = isActive || isParentOfActive;
  const [isExpanded, setIsExpanded] = useState(isActive || isParentOfActive);
  const hasChildren = node.children.length > 0;

  const Icon = isExpanded && hasChildren ? FolderOpenIcon : FolderIcon;

  const nodeContent = (
    <div
      className={cn(
        'flex w-full items-center gap-1.5 rounded-md transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
      )}
      style={{ paddingLeft: `${depth * 16}px` }}
    >
      {hasChildren ? (
        <button
          type="button"
          className="flex shrink-0 cursor-pointer items-center justify-center rounded p-1.5 transition-colors hover:bg-accent"
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-label={isExpanded ? 'Thu gọn' : 'Mở rộng'}
        >
          {isExpanded ? (
            <ChevronDownIcon className="text-muted-foreground size-3.5" />
          ) : (
            <ChevronRightIcon className="text-muted-foreground size-3.5" />
          )}
        </button>
      ) : (
        <span className="w-7 shrink-0" />
      )}
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2 py-2 pr-2 text-left text-sm"
        onClick={() => onSelect(node.path)}
      >
        <Icon
          className={cn(
            'size-4 shrink-0',
            isInActiveBranch ? 'text-(--primary)' : 'text-muted-foreground',
          )}
        />
        <span className={cn('min-w-0 truncate', isActive && 'font-medium')}>{node.name}</span>
      </button>
    </div>
  );

  return (
    <div>
      {enableContextMenu ? (
        <ContextMenu>
          <ContextMenuTrigger asChild>{nodeContent}</ContextMenuTrigger>
          <ContextMenuContent className="w-48">
            <ContextMenuItem onClick={() => onUpload(node.path)}>
              <UploadIcon className="mr-2 size-4" />
              Tải tệp tin lên đây
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => onCreateFolder(node.path)}>
              <FolderPlusIcon className="mr-2 size-4" />
              Tạo thư mục con
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDeleteFolder(node.path)}
            >
              <Trash2Icon className="mr-2 size-4" />
              Xóa thư mục
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      ) : (
        nodeContent
      )}

      {isExpanded && hasChildren ? (
        <div>
          {node.children.map((child) => (
            <FolderTreeNode
              key={child.path}
              node={child}
              currentFolder={currentFolder}
              onSelect={onSelect}
              onUpload={onUpload}
              onCreateFolder={onCreateFolder}
              onDeleteFolder={onDeleteFolder}
              enableContextMenu={enableContextMenu}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function FolderTree({
  folders,
  currentFolder,
  onFolderSelect,
  onUpload,
  onCreateFolder,
  onDeleteFolder,
  enableContextMenu = true,
}: FolderTreeProps) {
  const tree = useMemo(() => buildFolderTree(folders), [folders]);

  const treeContent = (
    <div className="min-h-0 p-3">
      {tree.map((node) => (
        <FolderTreeNode
          key={node.path}
          node={node}
          currentFolder={currentFolder}
          onSelect={onFolderSelect}
          onUpload={onUpload}
          onCreateFolder={onCreateFolder}
          onDeleteFolder={onDeleteFolder}
          enableContextMenu={enableContextMenu}
        />
      ))}
    </div>
  );

  return enableContextMenu ? (
    <ContextMenu>
      <ContextMenuTrigger asChild>{treeContent}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={() => onUpload('')}>
          <UploadIcon className="mr-2 size-4" />
          Tải tệp tin lên thư mục gốc
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => onCreateFolder('')}>
          <FolderPlusIcon className="mr-2 size-4" />
          Tạo thư mục ở gốc
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ) : (
    treeContent
  );
}
