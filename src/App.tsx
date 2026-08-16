import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/layout/Layout';
import { useAuth } from './hooks/useAuth';
import { usePermissions } from './hooks/usePermissions';
import { useSocketSync } from './hooks/useSocketSync';
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
import AnalyticsPage from './pages/AnalyticsPage';
import AuditLogPage from './pages/AuditLogPage';
import DonationPage from './pages/DonationPage';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true,
      staleTime: 0,
      refetchOnMount: 'always',
    },
  },
});

const PAGE_NAMES: Record<string, string> = {
  login: 'nav.login',
  register: 'nav.register',
  dashboard: 'nav.dashboard',
  finance: 'nav.finance',
  caisses: 'nav.caisses',
  beneficiaries: 'nav.beneficiaries',
  donors: 'nav.donors',
  inventory: 'nav.inventory',
  medical: 'nav.medical',
  doctors: 'nav.doctors',
  users: 'nav.users',
  analytics: 'nav.analytics',
  audit: 'nav.audit',
  donation: 'nav.donation',
};

function AppContent() {
  const [activePage, setActivePage] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    // Extract page name from hash (strip query params like register?invite=X)
    const pageName = hash.split('?')[0].split('&')[0];
    return pageName && PAGE_NAMES[pageName] ? pageName : (localStorage.getItem('accessToken') ? 'dashboard' : 'login');
  });
  const { user, association, isAuthenticated, isAdmin, isLoading, logout } = useAuth();
  const { can } = usePermissions();
  const { t, i18n } = useTranslation();

  // Set html dir/lang based on selected language
  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  // Real-time sync across browser tabs and other users
  useSocketSync();

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
          <p className="text-gray-500 text-sm">{t('app.loading')}</p>
        </div>
      </div>
    );
  }

  // Auth pages (no layout) — unified page for login and register
  if (activePage === 'login' || activePage === 'register') return <AuthPage onSuccess={() => navigate('dashboard')} />;

  // Protected pages
  if (!isAuthenticated) return null;

  const breadcrumbs = [
    { label: t('app.home'), page: 'dashboard' },
    { label: t(PAGE_NAMES[activePage] || 'nav.dashboard'), page: activePage },
  ];

  const renderPage = () => {
    const canView = (resource: 'users' | 'analytics') => can(resource, 'read');
    switch (activePage) {
      case 'dashboard': return <DashboardPage />;
      case 'finance': return can('transactions', 'read') ? <FinancePage /> : <DashboardPage />;
      case 'caisses': return can('caisses', 'read') ? <CaissesPage /> : <DashboardPage />;
      case 'beneficiaries': return can('beneficiaries', 'read') ? <BeneficiariesPage /> : <DashboardPage />;
      case 'donors': return can('donors', 'read') ? <DonorsPage /> : <DashboardPage />;
      case 'inventory': return can('articles', 'read') ? <InventoryPage /> : <DashboardPage />;
      case 'medical': return can('medical_referrals', 'read') ? <MedicalPage /> : <DashboardPage />;
      case 'doctors': return can('doctors', 'read') ? <DoctorsPage /> : <DashboardPage />;
      case 'users': return canView('users') ? <UsersPage /> : <DashboardPage />;
      case 'analytics': return canView('analytics') ? <AnalyticsPage /> : <DashboardPage />;
      case 'audit': return can('audit', 'read') ? <AuditLogPage /> : <DashboardPage />;
      case 'donation': return <DonationPage />;
      default: return <DashboardPage />;
    }
  };

  return (
    <Layout
      activePage={activePage}
      onNavigate={navigate}
      breadcrumbs={breadcrumbs}
      associationName={association?.name}
      associationLocale={association?.locale}
      associationLogoUrl={association?.logoUrl}
      userName={user?.name}
      userRole={user?.role}
      isAdmin={isAdmin}
      onLogout={logout}
      canAny={(resource) => can(resource as any, 'read') || can(resource as any, 'create')}
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
