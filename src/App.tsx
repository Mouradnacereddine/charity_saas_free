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
import DoctorsPage from './pages/DoctorsPage';
import UsersPage from './pages/UsersPage';
import AuthPage from './pages/AuthPage';
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
  doctors: 'الأطباء',
  users: 'إدارة المستخدمين',
};

function AppContent() {
  const [activePage, setActivePage] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    // Extract page name from hash (strip query params like register?invite=X)
    const pageName = hash.split('?')[0].split('&')[0];
    return pageName && PAGE_NAMES[pageName] ? pageName : (localStorage.getItem('accessToken') ? 'dashboard' : 'login');
  });
  const { user, association, isAuthenticated, isAdmin, isLoading, logout } = useAuth();

  const navigate = (page: string) => {
    setActivePage(page);
    window.location.hash = page;
  };

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      const pageName = hash.split('?')[0].split('&')[0];
      if (pageName && PAGE_NAMES[pageName]) setActivePage(pageName);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Detect ?invite=TOKEN in hash → navigate to register
  useEffect(() => {
    const hash = window.location.hash;
    const hasInvite = hash.includes('invite=');
    if (hasInvite && activePage !== 'register') {
      setActivePage('register');
    }
  }, []);

  // Auth guard
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

  // Auth pages (no layout) — unified page for login and register
  if (activePage === 'login' || activePage === 'register') return <AuthPage onSuccess={() => navigate('dashboard')} />;

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
      case 'doctors': return <DoctorsPage />;
      case 'users': return isAdmin ? <UsersPage /> : <DashboardPage />;
      default: return <DashboardPage />;
    }
  };

  return (
    <Layout
      activePage={activePage}
      onNavigate={navigate}
      breadcrumbs={breadcrumbs}
      associationNameAr={association?.nameAr}
      associationLogoUrl={association?.logoUrl}
      userNameAr={user?.nameAr}
      userRole={user?.role}
      isAdmin={isAdmin}
      onLogout={logout}
    >
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
