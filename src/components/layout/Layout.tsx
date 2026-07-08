import { useState, useEffect, type ReactNode } from 'react';
import {
  LayoutDashboard,
  Wallet,
  Users,
  HeartHandshake,
  Package,
  FolderOpen,
  Stethoscope,
  Menu,
} from 'lucide-react';

const navItems = [
  { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { id: 'finance', label: 'المالية', icon: Wallet },
  { id: 'caisses', label: 'الصناديق', icon: FolderOpen },
  { id: 'beneficiaries', label: 'المستفيدون', icon: Users },
  { id: 'donors', label: 'المتبرعون', icon: HeartHandshake },
  { id: 'inventory', label: 'المخزون', icon: Package },
  { id: 'medical', label: 'التوجيه الطبي', icon: Stethoscope },
];

export function Layout({
  children,
  activePage,
  onNavigate,
}: {
  children: ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-64 bg-primary-900 text-white transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-6 border-b border-primary-700">
          <h1 className="text-xl font-bold text-center">🕌 جمعية خيرية</h1>
          <p className="text-primary-300 text-sm text-center mt-1">نظام إدارة شامل</p>
        </div>
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activePage === item.id
                  ? 'bg-primary-700 text-white'
                  : 'text-primary-200 hover:bg-primary-800 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex items-center justify-between no-print">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h2 className="text-lg font-semibold text-gray-800">
            {navItems.find((n) => n.id === activePage)?.label || 'لوحة التحكم'}
          </h2>
          <div className="text-sm text-gray-500">
            {new Date().toLocaleDateString('ar-DZ', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
