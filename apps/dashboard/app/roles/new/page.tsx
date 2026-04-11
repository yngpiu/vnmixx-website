import { adminModulePath } from '@/lib/admin-modules';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { title: 'Vai trò · Vnmixx' };

/** Tạo vai trò qua dialog trên trang danh sách. */
export default function RolesNewRedirectPage() {
  redirect(adminModulePath('roles'));
}
