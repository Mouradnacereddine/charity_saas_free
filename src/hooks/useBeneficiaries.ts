import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { beneficiariesApi } from '../lib/api';

export function useBeneficiaries(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['beneficiaries', params],
    queryFn: async () => {
      const res = await beneficiariesApi.list(params);
      return res.data;
    },
  });
}

export function useBeneficiary(id: string) {
  return useQuery({
    queryKey: ['beneficiaries', id],
    queryFn: async () => {
      const res = await beneficiariesApi.get(id);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateBeneficiary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: beneficiariesApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['beneficiaries'] }),
  });
}

export function useUpdateBeneficiary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => beneficiariesApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['beneficiaries'] }),
  });
}

export function useDeleteBeneficiary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: beneficiariesApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['beneficiaries'] }),
  });
}

export function useWidowsMostChildren() {
  return useMutation({
    mutationFn: (maxAge?: number) => beneficiariesApi.widowsMostChildren(maxAge),
  });
}
