import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeApi } from '../lib/api';

export function useTransactions(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['transactions', params],
    queryFn: async () => {
      const res = await financeApi.transactions(params);
      return res.data;
    },
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: financeApi.createTransaction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['finance-allocations'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['caisses'] });
    },
  });
}

export function useBankAccounts() {
  return useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const res = await financeApi.bankAccounts();
      return res.data;
    },
  });
}

export function useCreateBankAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: financeApi.createBankAccount,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bank-accounts'] }),
  });
}

export function useUpdateBankAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => financeApi.updateBankAccount(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bank-accounts'] }),
  });
}

export function useConfirmTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { id: string; amount: number }) => financeApi.confirmTransaction(params.id, { amount: params.amount }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['finance-allocations'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['caisses'] });
    },
  });
}

export function useCancelTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeApi.cancelTransaction(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['finance-allocations'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['caisses'] });
    },
  });
}

export function useFinanceStats() {
  return useQuery({
    queryKey: ['finance-stats'],
    queryFn: async () => {
      const res = await financeApi.stats();
      return res.data;
    },
  });
}
