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
  LogOut,
  UserCog,
  ChevronDown,
  Settings,
  TrendingUp,
} from 'lucide-react';
import { authApi } from '../../lib/api';

const navItems = [
  { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { id: 'analytics', label: 'التحليلات والتقارير', icon: TrendingUp },
  { id: 'finance', label: 'المالية', icon: Wallet },
  { id: 'caisses', label: 'الصناديق', icon: FolderOpen },
  { id: 'beneficiaries', label: 'المستفيدون', icon: Users },
  { id: 'donors', label: 'المتبرعون', icon: HeartHandshake },
  { id: 'inventory', label: 'المخزون', icon: Package },
  { id: 'medical', label: 'التوجيه الطبي', icon: Stethoscope },
  { id: 'doctors', label: 'الأطباء', icon: Stethoscope },
];

export function Layout({
  children,
  activePage,
  onNavigate,
  breadcrumbs,
  associationNameAr,
  associationLogoUrl,
  userNameAr,
  userRole,
  isAdmin,
  onLogout,
}: {
  children: ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
  breadcrumbs?: { label: string; page: string }[];
  associationNameAr?: string;
  associationLogoUrl?: string;
  userNameAr?: string;
  userRole?: string;
  isAdmin?: boolean;
  onLogout?: () => void;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsNameAr, setSettingsNameAr] = useState(associationNameAr || '');
  const [settingsName, setSettingsName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    setSettingsNameAr(associationNameAr || '');
  }, [associationNameAr]);

  const handleUpdateName = async () => {
    if (!settingsNameAr.trim()) return;
    setSavingName(true);
    setNameError('');
    try {
      await authApi.updateName({ name: settingsName || settingsNameAr, nameAr: settingsNameAr });
      setShowSettingsModal(false);
      window.location.reload();
    } catch (err: any) {
      setNameError(err.response?.data?.error || 'فشل تحديث الاسم');
    } finally {
      setSavingName(false);
    }
  };

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

  // Close user menu on outside click
  useEffect(() => {
    if (!userMenuOpen) return;
    const close = () => setUserMenuOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [userMenuOpen]);

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
          <div className="flex items-center gap-2 min-w-0">
            {associationLogoUrl ? (
              <img src={associationLogoUrl} alt="logo" className="w-8 h-8 rounded-lg object-cover shrink-0" />
            ) : (
              <span className="text-lg shrink-0">🕌</span>
            )}
            <h1 className="text-lg font-bold truncate">{associationNameAr || 'جمعية خيرية'}</h1>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 text-primary-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="p-3 space-y-1 overflow-y-auto" style={{ height: 'calc(100vh - 65px)' }}>
          {navItems
            .filter((item) => item.id !== 'analytics' || isAdmin || userRole === 'treasurer')
            .map((item) => (
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
          <div className="flex items-center gap-3">
            {/* User menu */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors text-sm"
              >
                <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-xs">
                  {userNameAr?.charAt(0) || '?'}
                </div>
                <div className="hidden sm:block text-right">
                  <p className="text-gray-900 font-medium leading-tight">{userNameAr || 'مستخدم'}</p>
                  <p className="text-xs text-gray-400">{userRole === 'admin' ? 'مدير' : userRole === 'treasurer' ? 'أمين المال' : 'متطوع'}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              {userMenuOpen && (
                <div className="absolute left-0 right-0 sm:left-auto sm:right-auto top-full mt-1 sm:w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 mx-0 sm:mx-0"
                     style={{ left: '0', right: '0', marginLeft: 'auto', marginRight: 'auto', width: '260px' }}>
                  <div className="p-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{userNameAr || 'مستخدم'}</p>
                    <p className="text-xs text-gray-500">
                      {userRole === 'admin' ? 'مدير النظام' : userRole === 'treasurer' ? 'أمين المال' : 'متطوع'}
                    </p>
                  </div>
                  <div className="p-1">
                    {isAdmin && (
                      <button
                        onClick={() => { onNavigate('users'); setUserMenuOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <UserCog className="w-4 h-4" />
                        إدارة المستخدمين
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => { setShowSettingsModal(true); setUserMenuOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        إعدادات الجمعية
                      </button>
                    )}
                    <button
                      onClick={() => { onLogout?.(); setUserMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors min-h-[44px]"
                    >
                      <LogOut className="w-4 h-4" />
                      تسجيل الخروج
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="text-xs sm:text-sm text-gray-500 hidden sm:block">
              {new Date().toLocaleDateString('ar-DZ', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </div>
          </div>
        </header>

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>

      {/* Settings modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setShowSettingsModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">إعدادات الجمعية</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">اسم الجمعية بالعربية *</label>
                <input
                  type="text"
                  value={settingsNameAr}
                  onChange={(e) => setSettingsNameAr(e.target.value)}
                  placeholder="مثال: جمعية البركة الخيرية"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-right"
                  dir="rtl"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">اسم الجمعية بالفرنسية</label>
                <input
                  type="text"
                  value={settingsName}
                  onChange={(e) => setSettingsName(e.target.value)}
                  placeholder="Ex: Association El-Baraka"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  dir="ltr"
                />
              </div>
              {nameError && (
                <p className="text-xs text-red-500">{nameError}</p>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 py-2.5 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleUpdateName}
                  disabled={savingName || !settingsNameAr.trim()}
                  className="flex-1 py-2.5 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {savingName ? 'جاري الحفظ...' : 'حفظ'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
