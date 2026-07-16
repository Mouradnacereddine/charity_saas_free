import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doctorsApi } from '../lib/api';

export function useDoctors(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['doctors', params],
    queryFn: async () => {
      const res = await doctorsApi.list(params);
      return res.data;
    },
  });
}

export function useDoctor(id: string) {
  return useQuery({
    queryKey: ['doctor', id],
    queryFn: async () => {
      const res = await doctorsApi.get(id);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useDoctorStats(id: string) {
  return useQuery({
    queryKey: ['doctor-stats', id],
    queryFn: async () => {
      const res = await doctorsApi.stats(id);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateDoctor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: doctorsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doctors'] }),
  });
}

export function useUpdateDoctor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => doctorsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doctors'] }),
  });
}

export function useDeleteDoctor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: doctorsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doctors'] }),
  });
}

// Specialties
export function useDoctorSpecialties() {
  return useQuery({
    queryKey: ['doctor-specialties'],
    queryFn: async () => {
      const res = await doctorsApi.specialties();
      return res.data;
    },
  });
}

export function useCreateDoctorSpecialty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: doctorsApi.createSpecialty,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doctor-specialties'] }),
  });
}

export function useUpdateDoctorSpecialty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => doctorsApi.updateSpecialty(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doctor-specialties'] }),
  });
}

export function useDeleteDoctorSpecialty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: doctorsApi.deleteSpecialty,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doctor-specialties'] }),
  });
}
