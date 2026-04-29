import {
  loginAction,
  logoutAction,
  registerAction,
  resendOtpAction,
  verifyOtpAction,
} from '@/modules/auth/actions/auth';
import { useAuthStore } from '@/modules/auth/stores/auth-store';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

type LoginVariables = {
  email: string;
  password: string;
};

type RegisterVariables = {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  dob?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
};

type CustomerRegisterResponse = {
  message: string;
  email?: string;
  otpExpiresIn?: number;
  resendAfter?: number;
};

export class AuthActionError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly meta?: unknown,
  ) {
    super(message);
    this.name = 'AuthActionError';
  }
}

/**
 * Login mutation using Server Action.
 * On success: stores session in Zustand and redirects to home.
 */
export function useLogin() {
  const { setSession } = useAuthStore();
  const router = useRouter();
  return useMutation({
    mutationFn: async ({ email, password }: LoginVariables) => {
      const result = await loginAction(email, password);
      if (!result.success) {
        throw new AuthActionError(result.error, result.code, result.meta);
      }
      return result.data;
    },
    onSuccess: ({ accessToken, user }) => {
      setSession(accessToken, user);
      router.refresh();
      router.push('/');
    },
  });
}

/**
 * Register mutation using Server Action.
 * On success: returns backend message (OTP step info).
 */
export function useRegister() {
  return useMutation({
    mutationFn: async (variables: RegisterVariables) => {
      const result = await registerAction(variables);
      if (!result.success) {
        throw new AuthActionError(result.error, result.code, result.meta);
      }
      return result.data as CustomerRegisterResponse;
    },
  });
}

type VerifyOtpVariables = {
  email: string;
  otp: string;
};

export function useVerifyOtp() {
  return useMutation({
    mutationFn: async (variables: VerifyOtpVariables) => {
      const result = await verifyOtpAction(variables);
      if (!result.success) {
        throw new AuthActionError(result.error, result.code, result.meta);
      }
      return true;
    },
  });
}

export function useResendOtp() {
  return useMutation({
    mutationFn: async (variables: { email: string }) => {
      const result = await resendOtpAction(variables);
      if (!result.success) {
        throw new AuthActionError(result.error, result.code, result.meta);
      }
      return result.data as CustomerRegisterResponse;
    },
  });
}

export function useLogout() {
  const { clearSession } = useAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: async () => {
      await logoutAction();
    },
    onSettled: () => {
      clearSession();
      queryClient.clear();
      router.push('/login');
    },
  });
}
