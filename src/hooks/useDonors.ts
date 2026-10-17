import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { donorsApi } from '../lib/api';

export function useDonors(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['donors', params],
    queryFn: async () => {
      const res = await donorsApi.list(params);
      return res.data;
    },
    staleTime: 0,
  });
}

export function useCreateDonor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: donorsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['donors'] });
      qc.invalidateQueries({ queryKey: ['donor-sponsored-beneficiaries'] });
    },
  });
}

export function useUpdateDonor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => donorsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['donors'] });
      qc.invalidateQueries({ queryKey: ['donor-sponsored-beneficiaries'] });
    },
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

export function useDonorSponsoredBeneficiaries(id: string) {
  return useQuery({
    queryKey: ['donor-sponsored-beneficiaries', id],
    queryFn: async () => {
      const res = await donorsApi.sponsoredBeneficiaries(id);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useSponsorBeneficiary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, beneficiaryId }: { id: string; beneficiaryId: string }) =>
      donorsApi.addSponsoredBeneficiary(id, beneficiaryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['donors'] });
      qc.invalidateQueries({ queryKey: ['donor-sponsored-beneficiaries'] });
    },
  });
}

export function useUnsponsorBeneficiary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, beneficiaryId }: { id: string; beneficiaryId: string }) =>
      donorsApi.removeSponsoredBeneficiary(id, beneficiaryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['donors'] });
      qc.invalidateQueries({ queryKey: ['donor-sponsored-beneficiaries'] });
    },
  });
}
