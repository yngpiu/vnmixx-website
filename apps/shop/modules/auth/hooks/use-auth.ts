import {
  forgotPasswordAction,
  forgotPasswordVerifyOtpAction,
  loginAction,
  logoutAction,
  registerAction,
  resendOtpAction,
  resetPasswordAction,
  verifyOtpAction,
} from '@/modules/auth/actions/auth';
import { useAuthStore } from '@/modules/auth/stores/auth-store';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

type LoginVariables = {
  emailOrPhone: string;
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

/**
 * Login mutation using Server Action.
 * On success: stores session in Zustand and redirects to home.
 */
export function useLogin() {
  const { setSession } = useAuthStore();
  const router = useRouter();
  return useMutation({
    mutationFn: async ({ emailOrPhone, password }: LoginVariables) => {
      const result = await loginAction(emailOrPhone, password);
      if (!result.success) {
        throw new Error(result.error);
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
        throw new Error(result.error);
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
        throw new Error(result.error);
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
        throw new Error(result.error);
      }
      return result.data as CustomerRegisterResponse;
    },
  });
}

type ForgotPasswordVariables = {
  email: string;
};

type ForgotPasswordResponse = {
  message: string;
  email: string;
  otpExpiresIn: number;
  resendAfter: number;
};

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (variables: ForgotPasswordVariables) => {
      const result = await forgotPasswordAction(variables);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data as ForgotPasswordResponse;
    },
  });
}

type ForgotPasswordVerifyOtpVariables = {
  email: string;
  otp: string;
};

type ForgotPasswordVerifyOtpResponse = {
  resetToken: string;
};

export function useForgotPasswordVerifyOtp() {
  return useMutation({
    mutationFn: async (variables: ForgotPasswordVerifyOtpVariables) => {
      const result = await forgotPasswordVerifyOtpAction(variables);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data as ForgotPasswordVerifyOtpResponse;
    },
  });
}

type ResetPasswordVariables = {
  email: string;
  resetToken: string;
  newPassword: string;
};

export function useResetPassword() {
  return useMutation({
    mutationFn: async (variables: ResetPasswordVariables) => {
      const result = await resetPasswordAction(variables);
      if (!result.success) {
        throw new Error(result.error);
      }
      return true;
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
