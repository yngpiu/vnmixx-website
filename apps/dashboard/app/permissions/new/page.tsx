import { adminModulePath } from '@/lib/admin-modules';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { title: 'Quyền · Vnmixx' };

/** API chỉ hỗ trợ đọc danh sách quyền; không có tạo qua dashboard. */
export default function PermissionsNewRedirectPage() {
  redirect(adminModulePath('permissions'));
}
