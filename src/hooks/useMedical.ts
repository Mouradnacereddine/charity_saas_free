import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { medicalApi } from '../lib/api';

export function useMedicalReferrals(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['medical-referrals', params],
    queryFn: async () => {
      const res = await medicalApi.referrals(params);
      return res.data;
    },
  });
}

export function useCreateMedicalReferral() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: medicalApi.createReferral,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medical-referrals'] });
      qc.invalidateQueries({ queryKey: ['caisses'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteMedicalReferral() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: medicalApi.deleteReferral,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medical-referrals'] });
      qc.invalidateQueries({ queryKey: ['caisses'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useAnalysisTypes() {
  return useQuery({
    queryKey: ['analysis-types'],
    queryFn: async () => {
      const res = await medicalApi.analysisTypes();
      return res.data;
    },
  });
}

export function useCreateAnalysisType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: medicalApi.createAnalysisType,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['analysis-types'] }),
  });
}

export function useUpdateAnalysisType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => medicalApi.updateAnalysisType(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['analysis-types'] }),
  });
}

export function useDeleteAnalysisType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: medicalApi.deleteAnalysisType,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['analysis-types'] }),
  });
}

export function useHospitals() {
  return useQuery({
    queryKey: ['hospitals'],
    queryFn: async () => {
      const res = await medicalApi.hospitals();
      return res.data;
    },
  });
}

export function useCreateHospital() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: medicalApi.createHospital,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hospitals'] }),
  });
}

export function useUpdateHospital() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => medicalApi.updateHospital(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hospitals'] }),
  });
}

export function useDeleteHospital() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: medicalApi.deleteHospital,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hospitals'] }),
  });
}
