import {
  CircleHelpIcon,
  HeadsetIcon,
  HeartIcon,
  MapPinIcon,
  RefreshCwIcon,
  UserRoundIcon,
  WalletCardsIcon,
} from 'lucide-react';

export const ACCOUNT_MENU_ITEMS = [
  { label: 'Thông tin tài khoản', icon: UserRoundIcon, href: '/tai-khoan' },
  { label: 'Quản lý đơn hàng', icon: RefreshCwIcon, href: '/tai-khoan/don-hang' },
  { label: 'Sổ địa chỉ', icon: MapPinIcon, href: '/tai-khoan/dia-chi' },
  { label: 'Sản phẩm đã xem', icon: WalletCardsIcon, href: '/tai-khoan/da-xem' },
  { label: 'Sản phẩm yêu thích', icon: HeartIcon, href: '/tai-khoan/yeu-thich' },
  { label: 'Hỏi đáp sản phẩm', icon: CircleHelpIcon, href: '/tai-khoan/hoi-dap' },
  { label: 'Hỗ trợ - IVY', icon: HeadsetIcon, href: '/support' },
] as const;
