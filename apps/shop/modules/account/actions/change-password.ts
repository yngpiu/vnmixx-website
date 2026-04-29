'use server';

import { COOKIE_REFRESH_TOKEN } from '@/config/constants';
import { serverApi, ServerApiError } from '@/lib/server-api';
import type { ChangeCustomerPasswordPayload } from '@/modules/account/types/profile';
import { cookies } from 'next/headers';

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

function extractErrorMessage(error: unknown): string {
  if (error instanceof ServerApiError) {
    return error.message;
  }
  return error instanceof Error ? error.message : 'Unknown error';
}

export async function changeMyCustomerPasswordAction(
  payload: ChangeCustomerPasswordPayload,
): Promise<ActionResult<null>> {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get(COOKIE_REFRESH_TOKEN)?.value;
    await serverApi.put(
      '/me/profile/change-password',
      {
        currentPassword: payload.currentPassword,
        newPassword: payload.newPassword,
      },
      {
        headers: {
          ...(refreshToken ? { 'x-refresh-token': refreshToken } : {}),
        },
      },
    );
    return { success: true, data: null };
  } catch (error) {
    return { success: false, error: extractErrorMessage(error) };
  }
}
