import { dashboardRoutes } from '@/lib/routes';
import { redirect } from 'next/navigation';

export default function RootRedirectPage(): never {
  redirect(dashboardRoutes.overview);
}
