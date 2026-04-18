import { sidebarSections } from '@/config/sidebar-menu';
import { dashboardRoutes } from '@/lib/routes';

export type DashboardSearchEntry = {
  readonly label: string;
  readonly href: string;
  readonly group: string;
};

/**
 * Flatten sidebar navigation into searchable entries for the header command menu.
 */
export function getDashboardSearchEntries(): DashboardSearchEntry[] {
  const entries: DashboardSearchEntry[] = [];
  for (const section of sidebarSections) {
    for (const item of section.items) {
      entries.push({
        label: item.title,
        href: item.url,
        group: section.groupLabel,
      });
      if (item.items) {
        for (const sub of item.items) {
          if (sub.url === item.url) continue;
          entries.push({
            label: `${item.title} — ${sub.title}`,
            href: sub.url,
            group: section.groupLabel,
          });
        }
      }
      if (item.groups) {
        for (const g of item.groups) {
          for (const sub of g.items) {
            entries.push({
              label: `${item.title} — ${g.title} — ${sub.title}`,
              href: sub.url,
              group: section.groupLabel,
            });
          }
        }
      }
    }
  }
  entries.push({
    label: 'Cài đặt cá nhân',
    href: dashboardRoutes.settings,
    group: 'Tài khoản',
  });
  return entries;
}
