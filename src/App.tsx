import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/layout/Layout';
import { useAuth } from './hooks/useAuth';
import DashboardPage from './pages/DashboardPage';
import FinancePage from './pages/FinancePage';
import CaissesPage from './pages/CaissesPage';
import BeneficiariesPage from './pages/BeneficiariesPage';
import DonorsPage from './pages/DonorsPage';
import InventoryPage from './pages/InventoryPage';
import MedicalPage from './pages/MedicalPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

const PAGE_NAMES: Record<string, string> = {
  login: 'تسجيل الدخول',
  register: 'إنشاء حساب',
  dashboard: 'لوحة التحكم',
  finance: 'المالية',
  caisses: 'الصناديق',
  beneficiaries: 'المستفيدون',
  donors: 'المتبرعون',
  inventory: 'المخزون والإعارات',
  medical: 'التوجيه الطبي',
};

function AppContent() {
  const [activePage, setActivePage] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    return hash && PAGE_NAMES[hash] ? hash : (localStorage.getItem('accessToken') ? 'dashboard' : 'login');
  });
  const { isAuthenticated, isLoading } = useAuth();

  const navigate = (page: string) => {
    setActivePage(page);
    window.location.hash = page;
  };

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && PAGE_NAMES[hash]) setActivePage(hash);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !['login', 'register'].includes(activePage)) {
      navigate('login');
    }
  }, [isAuthenticated, isLoading, activePage]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">جاري تحميل النظام...</p>
        </div>
      </div>
    );
  }

  // Auth pages (no layout)
  if (activePage === 'login') return <LoginPage onSuccess={() => navigate('dashboard')} />;
  if (activePage === 'register') return <RegisterPage onSuccess={() => navigate('dashboard')} />;

  // Protected pages
  if (!isAuthenticated) return null;

  const breadcrumbs = [
    { label: 'الرئيسية', page: 'dashboard' },
    { label: PAGE_NAMES[activePage] || 'لوحة التحكم', page: activePage },
  ];

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <DashboardPage />;
      case 'finance': return <FinancePage />;
      case 'caisses': return <CaissesPage />;
      case 'beneficiaries': return <BeneficiariesPage />;
      case 'donors': return <DonorsPage />;
      case 'inventory': return <InventoryPage />;
      case 'medical': return <MedicalPage />;
      default: return <DashboardPage />;
    }
  };

  return (
    <Layout activePage={activePage} onNavigate={navigate} breadcrumbs={breadcrumbs}>
      {renderPage()}
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
