import { useState, useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../ui/dropdown-menu';
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
  Settings,
  TrendingUp,
  ChevronRight,
  Languages,
} from 'lucide-react';
import { authApi } from '../../lib/api';
import { useUIStore } from '../../stores/uiStore';

const LANGUAGES = [
  { code: 'ar', label: 'العربية' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
];

const navItems = [
  { id: 'dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { id: 'analytics', labelKey: 'nav.analytics', icon: TrendingUp },
  { id: 'finance', labelKey: 'nav.finance', icon: Wallet },
  { id: 'caisses', labelKey: 'nav.caisses', icon: FolderOpen },
  { id: 'beneficiaries', labelKey: 'nav.beneficiaries', icon: Users },
  { id: 'donors', labelKey: 'nav.donors', icon: HeartHandshake },
  { id: 'inventory', labelKey: 'nav.inventory', icon: Package },
  { id: 'medical', labelKey: 'nav.medical', icon: Stethoscope },
  { id: 'doctors', labelKey: 'nav.doctors', icon: Stethoscope },
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
  const { t, i18n } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

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
      setNameError(err.response?.data?.error || t('settings.error'));
    } finally {
      setSavingName(false);
    }
  };

  const roleLabel = userRole === 'admin' ? t('userMenu.systemAdmin') : userRole === 'treasurer' ? t('userMenu.treasurer') : t('userMenu.volunteer');

  return (
    <div className="flex h-dvh overflow-hidden">
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
          fixed top-0 right-0 z-50 h-dvh bg-primary-900 text-white
          transform transition-all duration-200 ease-in-out
          w-64 flex flex-col
          lg:translate-x-0 lg:sticky lg:z-auto
          ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'}
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
            <h1 className={`text-lg font-bold truncate transition-opacity duration-200 ${sidebarCollapsed ? 'lg:opacity-0 lg:w-0 lg:overflow-hidden' : ''}`}>
              {associationNameAr || t('app.title')}
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleSidebar}
              className="hidden lg:flex p-1.5 rounded-lg text-primary-300 hover:text-white hover:bg-primary-800 transition-colors"
              aria-label={sidebarCollapsed ? t('nav.toggleExpand') : t('nav.toggleCollapse')}
              title={sidebarCollapsed ? t('nav.toggleExpand') : t('nav.toggleCollapse')}
            >
              <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${sidebarCollapsed ? '' : 'rotate-180'}`} />
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 text-primary-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-none">
          {navItems
            .filter((item) => item.id !== 'analytics' || isAdmin || userRole === 'treasurer')
            .map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setSidebarOpen(false);
                }}
                title={sidebarCollapsed ? t(item.labelKey) : undefined}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''
                } ${
                  activePage === item.id
                    ? 'bg-primary-700 text-white shadow-sm'
                    : 'text-primary-200 hover:bg-primary-800 hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span className={`truncate transition-opacity duration-200 ${sidebarCollapsed ? 'lg:opacity-0 lg:w-0 lg:overflow-hidden' : ''}`}>
                  {t(item.labelKey)}
                </span>
              </button>
            ))}
        </nav>

        {/* User section — avatar as dropdown trigger */}
        <div className="border-t border-primary-700 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center justify-center gap-3 px-3 py-3 hover:bg-primary-800 transition-colors"
                title={userNameAr || t('userMenu.defaultName')}>
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-sm shrink-0">
                  {userNameAr?.charAt(0) || '?'}
                </div>
                <span className={`truncate text-sm text-primary-200 transition-opacity duration-200 ${sidebarCollapsed ? 'lg:opacity-0 lg:w-0 lg:overflow-hidden' : ''}`}>
                  {userNameAr || t('userMenu.defaultName')}
                </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="end"
              sideOffset={8}
              className="min-w-[240px]"
              dir="rtl"
            >
              <div className="p-3 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">{userNameAr || t('userMenu.defaultName')}</p>
                <p className="text-xs text-gray-500">{roleLabel}</p>
              </div>
              <div className="p-1">
                {isAdmin && (
                  <DropdownMenuItem onClick={() => { onNavigate('users'); }}>
                    <UserCog className="w-4 h-4" />
                    {t('userMenu.userManagement')}
                  </DropdownMenuItem>
                )}
                {isAdmin && (
                  <DropdownMenuItem onClick={() => { setShowSettingsModal(true); }}>
                    <Settings className="w-4 h-4" />
                    {t('userMenu.associationSettings')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => { onLogout?.(); }}>
                  <LogOut className="w-4 h-4" />
                  {t('userMenu.logout')}
                </DropdownMenuItem>
                <div className="border-t border-gray-100 my-1" />
                <div className="px-3 py-1.5">
                  <p className="text-xs text-gray-400 mb-1 flex items-center gap-1.5">
                    <Languages className="w-3.5 h-3.5" />
                    {i18n.language === 'ar' ? 'اللغة' : i18n.language === 'fr' ? 'Langue' : 'Language'}
                  </p>
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => i18n.changeLanguage(lang.code)}
                      className={`w-full text-right px-2 py-1 text-sm rounded-lg transition-colors ${
                        i18n.language === lang.code
                          ? 'bg-primary-50 text-primary-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky header */}
        <header className="sticky top-0 z-30 bg-white shadow-sm border-b border-gray-200 px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0 no-print">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200"
              aria-label={t('nav.toggleOpen')}
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
          <div className="text-center flex-1">
            <span className="text-sm text-green-800 font-arabic">{t('app.bismillah')}</span>
          </div>
          <div className="text-xs sm:text-sm text-gray-500">
            {new Date().toLocaleDateString(i18n.language === 'ar' ? 'ar-DZ' : i18n.language === 'fr' ? 'fr-DZ' : 'en-DZ', {
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

      {/* Settings modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setShowSettingsModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.title')}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('settings.nameAr')}</label>
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
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('settings.nameLatin')}</label>
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
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleUpdateName}
                  disabled={savingName || !settingsNameAr.trim()}
                  className="flex-1 py-2.5 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {savingName ? t('common.saving') : t('common.save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
