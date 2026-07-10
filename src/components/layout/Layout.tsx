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
  X,
  ChevronLeft,
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
  breadcrumbs,
}: {
  children: ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
  breadcrumbs?: { label: string; page: string }[];
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
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — always full viewport height */}
      <aside
        className={`
          fixed top-0 right-0 z-50 h-screen w-64 bg-primary-900 text-white
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0 lg:sticky lg:z-auto
          ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex items-center justify-between p-5 border-b border-primary-700">
          <h1 className="text-lg font-bold">🕌 جمعية خيرية</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 text-primary-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="p-3 space-y-1 overflow-y-auto" style={{ height: 'calc(100vh - 65px)' }}>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activePage === item.id
                  ? 'bg-primary-700 text-white shadow-sm'
                  : 'text-primary-200 hover:bg-primary-800 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky header */}
        <header className="sticky top-0 z-30 bg-white shadow-sm border-b border-gray-200 px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0 no-print">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200"
              aria-label="فتح القائمة"
            >
              <Menu className="w-6 h-6" />
            </button>
            {breadcrumbs && (
              <nav className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-500" dir="rtl">
                {breadcrumbs.map((crumb, i) => (
                  <span key={`bc-${i}`} className="flex items-center gap-1.5">
                    {i > 0 && <ChevronLeft className="w-3 h-3 text-gray-300" />}
                    {i < breadcrumbs.length - 1 ? (
                      <button onClick={() => onNavigate(crumb.page)} className="hover:text-primary-600 transition-colors">
                        {crumb.label}
                      </button>
                    ) : (
                      <span className="text-gray-900 font-medium">{crumb.label}</span>
                    )}
                  </span>
                ))}
              </nav>
            )}
          </div>
          <div className="text-xs sm:text-sm text-gray-500">
            {new Date().toLocaleDateString('ar-DZ', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </div>
        </header>

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
