'use server';

import {
  ACCESS_TOKEN_MAX_AGE,
  COOKIE_ACCESS_TOKEN,
  COOKIE_REFRESH_TOKEN,
  REFRESH_TOKEN_MAX_AGE,
} from '@/config/constants';
import { serverApi, ServerApiError } from '@/lib/server-api';
import type { AuthResponse, UserProfile } from '@/modules/auth/types/auth';
import { cookies } from 'next/headers';

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

export type AuthFormState = {
  success: boolean;
  error?: string;
  message?: string;
};

type CustomerRegisterResponse = {
  message: string;
  email?: string;
  otpExpiresIn?: number;
  resendAfter?: number;
};

function createCookieOptions(maxAge: number, isHttpOnly: boolean) {
  return {
    httpOnly: isHttpOnly,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

function extractErrorMessage(err: unknown): string {
  if (err instanceof ServerApiError) {
    return err.message;
  }
  return err instanceof Error ? err.message : 'Unknown error';
}

export async function loginAction(
  email: string,
  password: string,
): Promise<ActionResult<{ accessToken: string; user: UserProfile }>> {
  try {
    const authData = await serverApi.post<AuthResponse>(
      '/auth/login',
      { email, password },
      { skipAuth: true },
    );
    const user = await serverApi.get<UserProfile>('/me/profile', {
      headers: { Authorization: `Bearer ${authData.accessToken}` },
      skipAuth: true,
    });
    const cookieStore = await cookies();
    cookieStore.set(
      COOKIE_ACCESS_TOKEN,
      authData.accessToken,
      createCookieOptions(ACCESS_TOKEN_MAX_AGE, true),
    );
    cookieStore.set(
      COOKIE_REFRESH_TOKEN,
      authData.refreshToken,
      createCookieOptions(REFRESH_TOKEN_MAX_AGE, true),
    );
    return { success: true, data: { accessToken: authData.accessToken, user } };
  } catch (err) {
    return { success: false, error: extractErrorMessage(err) };
  }
}

export async function registerAction(data: {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  dob?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
}): Promise<ActionResult<CustomerRegisterResponse>> {
  try {
    const result = await serverApi.post<CustomerRegisterResponse>('/auth/register', data, {
      skipAuth: true,
    });
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: extractErrorMessage(err) };
  }
}

export async function loginActionForm(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { success: false, error: 'Vui lòng nhập đầy đủ email/SDT và mật khẩu.' };
  }

  const result = await loginAction(email, password);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true };
}

export async function registerActionForm(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const fullName = String(formData.get('fullName') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const phoneNumber = String(formData.get('phoneNumber') ?? '').trim();
  const dob = String(formData.get('dob') ?? '').trim();
  const genderRaw = String(formData.get('gender') ?? '').trim();
  const gender =
    genderRaw === 'MALE' || genderRaw === 'FEMALE' || genderRaw === 'OTHER' ? genderRaw : undefined;

  const password = String(formData.get('password') ?? '');
  const confirmPassword = String(formData.get('confirmPassword') ?? '');
  const termsAcceptedRaw = String(formData.get('termsAccepted') ?? '');
  const termsAccepted =
    termsAcceptedRaw === 'on' || termsAcceptedRaw === 'true' || termsAcceptedRaw === '1';

  if (!fullName) return { success: false, error: 'Họ và tên không được để trống.' };
  if (!email) return { success: false, error: 'Email không được để trống.' };
  if (!phoneNumber) return { success: false, error: 'Điện thoại không được để trống.' };
  if (!password) return { success: false, error: 'Mật khẩu không được để trống.' };
  if (password !== confirmPassword)
    return { success: false, error: 'Mật khẩu nhập lại không khớp.' };
  if (!termsAccepted)
    return { success: false, error: 'Bạn cần đồng ý với các điều khoản của IVY.' };

  const result = await registerAction({
    fullName,
    email,
    phoneNumber,
    password,
    ...(dob ? { dob } : {}),
    ...(gender ? { gender } : {}),
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, message: result.data.message };
}

export async function logoutAction(): Promise<ActionResult<null>> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(COOKIE_ACCESS_TOKEN)?.value;
    const refreshToken = cookieStore.get(COOKIE_REFRESH_TOKEN)?.value;
    if (accessToken) {
      await serverApi
        .post('/auth/logout', undefined, {
          headers: {
            ...(refreshToken ? { 'x-refresh-token': refreshToken } : {}),
          },
        })
        .catch(() => {
          // Ignore API errors and continue clearing cookies.
        });
    }
    cookieStore.delete(COOKIE_ACCESS_TOKEN);
    cookieStore.delete(COOKIE_REFRESH_TOKEN);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: extractErrorMessage(err) };
  }
}

export async function verifyOtpAction(data: {
  email: string;
  otp: string;
}): Promise<ActionResult<null>> {
  try {
    await serverApi.post<unknown>('/auth/verify-otp', data, { skipAuth: true });
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: extractErrorMessage(err) };
  }
}

export async function resendOtpAction(data: {
  email: string;
}): Promise<ActionResult<CustomerRegisterResponse>> {
  try {
    const result = await serverApi.post<CustomerRegisterResponse>('/auth/resend-otp', data, {
      skipAuth: true,
    });
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: extractErrorMessage(err) };
  }
}
