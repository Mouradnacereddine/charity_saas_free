import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi, loansApi } from '../lib/api';

// ---- Articles ----
export function useArticles(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['articles', params],
    queryFn: async () => {
      const res = await inventoryApi.articles(params);
      return res.data;
    },
  });
}

export function useCreateArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: inventoryApi.createArticle,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['articles'] }),
  });
}

export function useUpdateArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => inventoryApi.updateArticle(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['articles'] }),
  });
}

export function useDeleteArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: inventoryApi.deleteArticle,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['articles'] }),
  });
}

// ---- Categories ----
export function useArticleCategories() {
  return useQuery({
    queryKey: ['article-categories'],
    queryFn: async () => {
      const res = await inventoryApi.categories();
      return res.data;
    },
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: inventoryApi.createCategory,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['article-categories'] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => inventoryApi.updateCategory(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['article-categories'] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: inventoryApi.deleteCategory,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['article-categories'] }),
  });
}

// ---- Storage Locations ----
export function useStorageLocations() {
  return useQuery({
    queryKey: ['storage-locations'],
    queryFn: async () => {
      const res = await inventoryApi.locations();
      return res.data;
    },
  });
}

export function useCreateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: inventoryApi.createLocation,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['storage-locations'] }),
  });
}

export function useUpdateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => inventoryApi.updateLocation(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['storage-locations'] }),
  });
}

export function useDeleteLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: inventoryApi.deleteLocation,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['storage-locations'] }),
  });
}

// ---- Loans ----
export function useLoans(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['loans', params],
    queryFn: async () => {
      const res = await loansApi.list(params);
      return res.data;
    },
  });
}

export function useCreateLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: loansApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loans'] });
      qc.invalidateQueries({ queryKey: ['articles'] });
    },
  });
}

export function useReturnItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, items }: { id: string; items: any[] }) => loansApi.returnItems(id, items),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loans'] });
      qc.invalidateQueries({ queryKey: ['articles'] });
    },
  });
}

export function useAddItemToLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => loansApi.addItem(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loans'] });
      qc.invalidateQueries({ queryKey: ['articles'] });
    },
  });
}

export function useRemoveItemFromLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, articleId }: { id: string; articleId: string }) => loansApi.removeItem(id, articleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loans'] });
      qc.invalidateQueries({ queryKey: ['articles'] });
    },
  });
}

export function useMarkLoanDefinitive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: loansApi.markDefinitive,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loans'] }),
  });
}

// ---- School Grades ----
export function useSchoolGrades() {
  return useQuery({
    queryKey: ['school-grades'],
    queryFn: async () => {
      const res = await inventoryApi.schoolGrades();
      return res.data;
    },
  });
}

export function useCreateSchoolGrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: inventoryApi.createSchoolGrade,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['school-grades'] }),
  });
}

export function useUpdateSchoolGrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => inventoryApi.updateSchoolGrade(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['school-grades'] }),
  });
}

export function useDeleteSchoolGrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: inventoryApi.deleteSchoolGrade,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['school-grades'] }),
  });
}
