'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui/components/ui/tabs';
import { ReactNode } from 'react';

type RoleFormTabsProps = {
  tab: 'meta' | 'perms';
  onTabChange: (tab: 'meta' | 'perms') => void;
  metaContent: ReactNode;
  permissionsContent: ReactNode;
};

export function RoleFormTabs({
  tab,
  onTabChange,
  metaContent,
  permissionsContent,
}: RoleFormTabsProps) {
  return (
    <Tabs
      value={tab}
      onValueChange={(value) => onTabChange(value as 'meta' | 'perms')}
      className="flex min-h-0 flex-1 flex-col gap-0"
    >
      <div className="shrink-0 px-6 pt-4">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="meta" className="flex-1 sm:flex-none">
            Thông tin
          </TabsTrigger>
          <TabsTrigger value="perms" className="flex-1 sm:flex-none">
            Quyền
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent
        value="meta"
        className="mt-0 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4"
      >
        {metaContent}
      </TabsContent>

      <TabsContent
        value="perms"
        className="mt-0 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4"
      >
        {permissionsContent}
      </TabsContent>
    </Tabs>
  );
}
