import {
  MailIcon,
  MessageCircleIcon,
  MessageSquareIcon,
  PackageSearchIcon,
  PhoneCallIcon,
} from 'lucide-react';

export const MOBILE_SUPPORT_MENU_ITEMS = [
  { label: 'Hotline', icon: PhoneCallIcon },
  { label: 'Live Chat', icon: MessageCircleIcon },
  { label: 'Messenger', icon: MessageSquareIcon },
  { label: 'Email', icon: MailIcon },
  { label: 'Tra cứu đơn hàng', icon: PackageSearchIcon },
  { label: 'Liên hệ', icon: MessageCircleIcon },
] as const;
