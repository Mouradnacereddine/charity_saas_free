import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.origin.startsWith('http://localhost') ? 'http://localhost:3001/api' : '/api');

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach JWT access token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');
        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.hash = 'login';
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: (data: { associationName?: string; associationNameAr?: string; email: string; password: string; adminName?: string; adminNameAr?: string; inviteToken?: string; logoUrl?: string }) =>
    api.post('/auth/register', data),
  googleLogin: (data: { credential: string; inviteToken?: string; mode?: string }) =>
    api.post('/auth/google', data),
  updateLogo: (logoUrl: string) =>
    api.put('/auth/association/logo', { logoUrl }),
  updateName: (data: { name: string; nameAr: string }) =>
    api.put('/auth/association/name', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  users: () => api.get('/auth/users'),
  updateUser: (id: string, data: { status?: string; role?: string }) => api.put(`/auth/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/auth/users/${id}`),
  createUser: (data: { email: string; password: string; name?: string; nameAr: string; role?: string }) =>
    api.post('/auth/users/create', data),
  invite: (data: { email: string; role?: string; name?: string; nameAr?: string }) =>
    api.post('/auth/invite', data),
  invites: () =>
    api.get('/auth/invites'),
  deleteInvite: (id: string) =>
    api.delete(`/auth/invites/${id}`),
  inviteDetails: (token: string) =>
    api.get(`/auth/invite/${token}`),
};

// Resource APIs
export const beneficiariesApi = {
  list: (params?: Record<string, string>) => api.get('/beneficiaries', { params }),
  get: (id: string) => api.get(`/beneficiaries/${id}`),
  create: (data: any) => api.post('/beneficiaries', data),
  update: (id: string, data: any) => api.put(`/beneficiaries/${id}`, data),
  delete: (id: string) => api.delete(`/beneficiaries/${id}`),
  widowsMostChildren: (maxAge?: number) => api.get('/beneficiaries/widows/most-children', { params: maxAge ? { maxAge } : {} }),
};

export const donorsApi = {
  list: (params?: Record<string, string>) => api.get('/donors', { params }),
  get: (id: string) => api.get(`/donors/${id}`),
  create: (data: any) => api.post('/donors', data),
  update: (id: string, data: any) => api.put(`/donors/${id}`, data),
  delete: (id: string) => api.delete(`/donors/${id}`),
  receipts: (id: string) => api.get(`/donors/${id}/receipts`),
};

export const caissesApi = {
  list: () => api.get('/caisses'),
  get: (id: string) => api.get(`/caisses/${id}`),
  create: (data: any) => api.post('/caisses', data),
  update: (id: string, data: any) => api.put(`/caisses/${id}`, data),
  delete: (id: string) => api.delete(`/caisses/${id}`),
};

export const financeApi = {
  transactions: (params?: Record<string, string>) => api.get('/finance/transactions', { params }),
  createTransaction: (data: any) => api.post('/finance/transactions', data),
  getTransaction: (id: string) => api.get(`/finance/transactions/${id}`),
  bankAccounts: () => api.get('/finance/bank-accounts'),
  createBankAccount: (data: any) => api.post('/finance/bank-accounts', data),
  updateBankAccount: (id: string, data: any) => api.put(`/finance/bank-accounts/${id}`, data),
  deleteBankAccount: (id: string) => api.delete(`/finance/bank-accounts/${id}`),
  stats: () => api.get('/finance/stats'),
  allocations: (params?: Record<string, string>) => api.get('/finance/allocations', { params }),
  distributeAllocation: (id: string, data: { debitTransactionId?: string; amount?: number }) => api.put(`/finance/allocations/${id}/distribute`, data),
  confirmTransaction: (id: string) => api.put(`/finance/transactions/${id}/confirm`),
  cancelTransaction: (id: string) => api.put(`/finance/transactions/${id}/cancel`),
};

export const inventoryApi = {
  articles: (params?: Record<string, string>) => api.get('/inventory/articles', { params }),
  createArticle: (data: any) => api.post('/inventory/articles', data),
  updateArticle: (id: string, data: any) => api.put(`/inventory/articles/${id}`, data),
  deleteArticle: (id: string) => api.delete(`/inventory/articles/${id}`),
  categories: () => api.get('/inventory/article-categories'),
  createCategory: (data: any) => api.post('/inventory/article-categories', data),
  updateCategory: (id: string, data: any) => api.put(`/inventory/article-categories/${id}`, data),
  deleteCategory: (id: string) => api.delete(`/inventory/article-categories/${id}`),
  locations: () => api.get('/inventory/storage-locations'),
  createLocation: (data: any) => api.post('/inventory/storage-locations', data),
  updateLocation: (id: string, data: any) => api.put(`/inventory/storage-locations/${id}`, data),
  deleteLocation: (id: string) => api.delete(`/inventory/storage-locations/${id}`),
  schoolGrades: () => api.get('/inventory/school-grades'),
  createSchoolGrade: (data: any) => api.post('/inventory/school-grades', data),
  updateSchoolGrade: (id: string, data: any) => api.put(`/inventory/school-grades/${id}`, data),
  deleteSchoolGrade: (id: string) => api.delete(`/inventory/school-grades/${id}`),
  statuses: () => api.get('/inventory/article-statuses'),
  createStatus: (data: any) => api.post('/inventory/article-statuses', data),
  updateStatus: (id: string, data: any) => api.put(`/inventory/article-statuses/${id}`, data),
  deleteStatus: (id: string) => api.delete(`/inventory/article-statuses/${id}`),
};

export const loansApi = {
  list: (params?: Record<string, string>) => api.get('/loans', { params }),
  get: (id: string) => api.get(`/loans/${id}`),
  create: (data: any) => api.post('/loans', data),
  returnItems: (id: string, items: any[]) => api.post(`/loans/${id}/return`, { items }),
  addItem: (id: string, data: any) => api.post(`/loans/${id}/add-item`, data),
  removeItem: (id: string, articleId: string) => api.delete(`/loans/${id}/remove-item/${articleId}`),
  markDefinitive: (id: string) => api.put(`/loans/${id}/mark-definitive`),
};

export const medicalApi = {
  referrals: (params?: Record<string, string>) => api.get('/medical/referrals', { params }),
  createReferral: (data: any) => api.post('/medical/referrals', data),
  deleteReferral: (id: string) => api.delete(`/medical/referrals/${id}`),
  analysisTypes: () => api.get('/medical/analysis-types'),
  createAnalysisType: (data: any) => api.post('/medical/analysis-types', data),
  updateAnalysisType: (id: string, data: any) => api.put(`/medical/analysis-types/${id}`, data),
  deleteAnalysisType: (id: string) => api.delete(`/medical/analysis-types/${id}`),
  hospitals: () => api.get('/medical/hospitals'),
  createHospital: (data: any) => api.post('/medical/hospitals', data),
  updateHospital: (id: string, data: any) => api.put(`/medical/hospitals/${id}`, data),
  deleteHospital: (id: string) => api.delete(`/medical/hospitals/${id}`),
};

export const doctorsApi = {
  list: (params?: Record<string, string>) => api.get('/doctors', { params }),
  get: (id: string) => api.get(`/doctors/${id}`),
  create: (data: any) => api.post('/doctors', data),
  update: (id: string, data: any) => api.put(`/doctors/${id}`, data),
  delete: (id: string) => api.delete(`/doctors/${id}`),
  stats: (id: string) => api.get(`/doctors/${id}/stats`),
  specialties: () => api.get('/doctors/specialties/list'),
  createSpecialty: (data: any) => api.post('/doctors/specialties', data),
  updateSpecialty: (id: string, data: any) => api.put(`/doctors/specialties/${id}`, data),
  deleteSpecialty: (id: string) => api.delete(`/doctors/specialties/${id}`),
};

export const attributsApi = {
  list: () => api.get('/beneficiary-attributs'),
  create: (data: any) => api.post('/beneficiary-attributs', data),
  delete: (attribut: string) => api.delete(`/beneficiary-attributs/${attribut}`),
};

export const dashboardApi = {
  stats: () => api.get('/dashboard'),
};

export const notificationsApi = {
  list: (params?: Record<string, string>) => api.get('/notifications', { params }),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
};
