import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { donorsApi } from '../lib/api';

export function useDonors(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['donors', params],
    queryFn: async () => {
      const res = await donorsApi.list(params);
      return res.data;
    },
  });
}

export function useCreateDonor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: donorsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['donors'] }),
  });
}

export function useUpdateDonor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => donorsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['donors'] }),
  });
}

export function useDeleteDonor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: donorsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['donors'] }),
  });
}

export function useDonorReceipts(id: string) {
  return useQuery({
    queryKey: ['donor-receipts', id],
    queryFn: async () => {
      const res = await donorsApi.receipts(id);
      return res.data;
    },
    enabled: !!id,
  });
}
