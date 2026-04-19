import { adminModulePath } from '@/lib/admin-modules';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { title: 'Thêm mới vai trò' };

/** Tạo vai trò qua dialog trên trang danh sách. */
export default function RolesNewRedirectPage() {
  redirect(adminModulePath('roles'));
}
