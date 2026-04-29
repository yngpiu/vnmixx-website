import { HeartIcon, MapPinIcon, RefreshCwIcon, UserRoundIcon } from 'lucide-react';

export const ACCOUNT_MENU_ITEMS = [
  { label: 'Thông tin tài khoản', icon: UserRoundIcon, href: '/tai-khoan' },
  { label: 'Quản lý đơn hàng', icon: RefreshCwIcon, href: '/tai-khoan/don-hang' },
  { label: 'Sổ địa chỉ', icon: MapPinIcon, href: '/tai-khoan/dia-chi' },
  { label: 'Sản phẩm yêu thích', icon: HeartIcon, href: '/tai-khoan/yeu-thich' },
] as const;
