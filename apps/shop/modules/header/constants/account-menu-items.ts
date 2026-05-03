import { HeartIcon, MapPinIcon, RefreshCwIcon, UserRoundIcon } from 'lucide-react';

export const ACCOUNT_MENU_ITEMS = [
  { label: 'Thông tin tài khoản', icon: UserRoundIcon, href: '/me/profile' },
  { label: 'Quản lý đơn hàng', icon: RefreshCwIcon, href: '/me/order' },
  { label: 'Sổ địa chỉ', icon: MapPinIcon, href: '/me/address' },
  { label: 'Sản phẩm yêu thích', icon: HeartIcon, href: '/me/wishlist' },
] as const;
