import { useQuery, useMutation } from '@tanstack/react-query';
import { authApi } from '../lib/api';

export function useAuth() {
  const token = localStorage.getItem('accessToken');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await authApi.me();
      return res.data;
    },
    enabled: !!token,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (res) => {
      localStorage.setItem('accessToken', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
    },
  });

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (res) => {
      localStorage.setItem('accessToken', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
    },
  });

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.hash = 'login';
  };

  return {
    user: data?.user ?? null,
    association: data?.association ?? null,
    isAuthenticated: !!token && !!data,
    isAdmin: data?.user?.role === 'admin',
    isLoading,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout,
    loginError: loginMutation.error,
    registerError: registerMutation.error,
    isLoginLoading: loginMutation.isPending,
    isRegisterLoading: registerMutation.isPending,
    refetch,
  };
}
