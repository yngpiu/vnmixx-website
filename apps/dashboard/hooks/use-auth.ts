import { loginAction, logoutAction } from '@/actions/auth';
import { useAuthStore } from '@/stores/auth-store';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

/**
 * Login mutation using Server Action.
 * On success: stores session in Zustand, redirects to home.
 */
export function useLogin() {
  const { setSession } = useAuthStore();
  const router = useRouter();
  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const result = await loginAction(email, password);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: ({ accessToken, user }) => {
      setSession(accessToken, user);
      router.push('/');
    },
  });
}

/**
 * Logout mutation using Server Action.
 * Clears Zustand state, resets query cache, redirects to login.
 */
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
