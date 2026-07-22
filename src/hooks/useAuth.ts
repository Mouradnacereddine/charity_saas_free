import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../lib/api';

// Simple JWT expiry check (checks payload exp without verifying signature)
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true; // Malformed token → treat as expired
  }
}

export function useAuth() {
  const queryClient = useQueryClient();
  const token = localStorage.getItem('accessToken');
  const tokenExpired = token ? isTokenExpired(token) : true;

  // If token is locally expired, don't even bother sending it
  if (token && tokenExpired) {
    // Attempt silent refresh via the interceptor — just don't pass stale token
    // The interceptor on the /me response will handle it
  }

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await authApi.me();
      return res.data;
    },
    enabled: !!token && !tokenExpired, // Don't fetch if token is already expired
    retry: false,
    staleTime: 0, // Always refetch when component mounts — avoids stale user data
  });

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (res) => {
      localStorage.setItem('accessToken', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      // Force refetch user data immediately — prevents showing previous user
      queryClient.resetQueries({ queryKey: ['auth', 'me'] });
    },
  });

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (res) => {
      localStorage.setItem('accessToken', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      // Force refetch user data immediately
      queryClient.resetQueries({ queryKey: ['auth', 'me'] });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: authApi.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: authApi.invite,
  });

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    queryClient.removeQueries({ queryKey: ['auth', 'me'] });
    window.location.hash = 'login';
  };

  return {
    user: data?.user ?? null,
    association: data?.association ?? null,
    isAuthenticated: !!token && !!data,
    isAdmin: data?.user?.role === 'admin',
    isTreasurer: data?.user?.role === 'treasurer',
    isLoading,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    createUser: createUserMutation.mutateAsync,
    invite: inviteMutation.mutateAsync,
    logout,
    loginError: loginMutation.error,
    registerError: registerMutation.error,
    createUserError: createUserMutation.error,
    inviteError: inviteMutation.error,
    isLoginLoading: loginMutation.isPending,
    isRegisterLoading: registerMutation.isPending,
    isCreateUserLoading: createUserMutation.isPending,
    isInviteLoading: inviteMutation.isPending,
    refetch,
  };
}
