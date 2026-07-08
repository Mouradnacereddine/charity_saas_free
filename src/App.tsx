import { useState, useEffect } from 'react';
import { Layout } from './components/layout/Layout';
import { seedDefaultData } from './lib/db';
import DashboardPage from './pages/DashboardPage';
import FinancePage from './pages/FinancePage';
import CaissesPage from './pages/CaissesPage';
import BeneficiariesPage from './pages/BeneficiariesPage';
import DonorsPage from './pages/DonorsPage';
import InventoryPage from './pages/InventoryPage';
import MedicalPage from './pages/MedicalPage';
import './index.css';

function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    seedDefaultData().then(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">جاري تحميل النظام...</p>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'finance':
        return <FinancePage />;
      case 'caisses':
        return <CaissesPage />;
      case 'beneficiaries':
        return <BeneficiariesPage />;
      case 'donors':
        return <DonorsPage />;
      case 'inventory':
        return <InventoryPage />;
      case 'medical':
        return <MedicalPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <Layout activePage={activePage} onNavigate={setActivePage}>
      {renderPage()}
    </Layout>
  );
}

export default App;
