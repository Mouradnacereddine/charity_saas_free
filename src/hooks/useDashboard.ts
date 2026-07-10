import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../lib/api';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const res = await dashboardApi.stats();
      return res.data;
    },
    refetchInterval: 30000,
  });
}
