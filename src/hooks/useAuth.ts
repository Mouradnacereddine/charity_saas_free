import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../lib/api';

export function useAuth() {
  const queryClient = useQueryClient();
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
