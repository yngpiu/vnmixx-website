import type { LucideIcon } from 'lucide-react';
import { MailIcon, MessageCircleIcon, PackageSearchIcon } from 'lucide-react';

export type MobileSupportMenuItem = {
  readonly label: string;
  readonly icon: LucideIcon;
  readonly href?: string;
};

/** Items for «Trợ giúp» sheet / dropdown — optional `href` opens as link. */
export const MOBILE_SUPPORT_MENU_ITEMS: MobileSupportMenuItem[] = [
  { label: 'Liên hệ', icon: MessageCircleIcon },
  { label: 'Email', icon: MailIcon },
  { label: 'Tra cứu đơn hàng', icon: PackageSearchIcon },
];
