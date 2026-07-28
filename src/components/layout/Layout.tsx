import { useState, useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
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
  Globe,
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
  associationName,
  associationLocale,
  associationLogoUrl,
  userName,
  userRole,
  isAdmin,
  onLogout,
}: {
  children: ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
  breadcrumbs?: { label: string; page: string }[];
  associationName?: string;
  associationLocale?: 'ar' | 'fr' | 'en';
  associationLogoUrl?: string;
  userName?: string;
  userRole?: string;
  isAdmin?: boolean;
  onLogout?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsName, setSettingsName] = useState(associationName || '');
  const [settingsLocale, setSettingsLocale] = useState(associationLocale || 'ar');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    setSettingsName(associationName || '');
    setSettingsLocale(associationLocale || 'ar');
  }, [associationName, associationLocale]);

  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
  }, [i18n.language]);

  const handleUpdateName = async () => {
    if (!settingsName.trim()) return;
    setSavingName(true);
    setNameError('');
    try {
      await authApi.updateName(settingsName);
      if (settingsLocale !== associationLocale) {
        await authApi.updateLocale(settingsLocale);
        i18n.changeLanguage(settingsLocale);
      }
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      setShowSettingsModal(false);
    } catch (err: any) {
      setNameError(err.response?.data?.error || t('settings.error'));
    } finally {
      setSavingName(false);
    }
  };

  const roleLabel = userRole === 'admin' ? t('userMenu.systemAdmin') : userRole === 'treasurer' ? t('userMenu.treasurer') : t('userMenu.volunteer');
  const isRtl = i18n.language === 'ar';
  const sidebarDir = isRtl ? 'right' : 'left';
  const headerDir = isRtl ? 'rtl' : 'ltr';

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`bg-sidebar text-sidebar-foreground border-sidebar-border ${
          isRtl ? 'border-l' : 'border-r'
        } flex flex-col transition-all duration-300 ${
          sidebarOpen ? 'fixed inset-y-0 z-50 w-64' : 'hidden'
        } lg:flex lg:relative lg:z-auto ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
          {(!sidebarCollapsed || sidebarOpen) && (
            <div className="flex items-center gap-2 min-w-0">
              {associationLogoUrl ? (
                <img
                  src={associationLogoUrl}
                  alt={associationName || ''}
                  className="w-8 h-8 rounded-lg object-cover"
                />
              ) : (
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">
                  {(associationName || 'A').charAt(0).toUpperCase()}
                </div>
              )}
              <span className="font-semibold text-sm truncate">
                {associationName || t('app.title')}
              </span>
            </div>
          )}
          <button
            onClick={() => {
              setSidebarOpen(false);
              toggleSidebar();
            }}
            className="p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            aria-label={sidebarCollapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : sidebarCollapsed ? (isRtl ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />) : (isRtl ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />)}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {(!sidebarCollapsed || sidebarOpen) && <span className="truncate">{t(item.labelKey)}</span>}
              </button>
            );
          })}
        </nav>

        {/* User menu (footer of sidebar) */}
        <div className="border-t border-sidebar-border p-3">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full flex items-center gap-2 p-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
              <div className="w-8 h-8 bg-sidebar-accent rounded-full flex items-center justify-center text-sidebar-accent-foreground font-semibold shrink-0">
                {(userName || '?').charAt(0).toUpperCase()}
              </div>
              {(!sidebarCollapsed || sidebarOpen) && (
                <div className="flex-1 text-start min-w-0">
                  <p className="text-sm font-medium truncate">{userName || t('userMenu.defaultName')}</p>
                  <p className="text-xs text-sidebar-foreground/60 truncate">{roleLabel}</p>
                </div>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="end"
              sideOffset={8}
              className="min-w-[240px]"
              dir={isRtl ? 'rtl' : 'ltr'}
            >
              <div className="p-3 border-b border-border">
                <p className="text-sm font-medium text-foreground">{userName || t('userMenu.defaultName')}</p>
                <p className="text-xs text-muted-foreground">{roleLabel}</p>
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
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky header */}
        <header className="sticky top-0 z-30 bg-background shadow-sm border-b border-border px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0 no-print">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted active:bg-muted/70"
              aria-label={t('nav.toggleOpen')}
            >
              <Menu className="w-6 h-6" />
            </button>
            {breadcrumbs && (
              <nav className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground" dir={headerDir}>
                {breadcrumbs.map((crumb, i) => (
                  <span key={`bc-${i}`} className="flex items-center gap-1.5">
                    {i > 0 && <ChevronLeft className="w-3 h-3 text-border" />}
                    {i < breadcrumbs.length - 1 ? (
                      <button onClick={() => onNavigate(crumb.page)} className="hover:text-primary transition-colors">
                        {crumb.label}
                      </button>
                    ) : (
                      <span className="text-foreground font-medium">{crumb.label}</span>
                    )}
                  </span>
                ))}
              </nav>
            )}
          </div>
          <div className="text-center flex-1">
            <span className="text-sm text-[var(--success)] font-arabic">{t('app.bismillah')}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Sélecteur de langue — change la langue de l'UI (préférence navigateur, pas la langue de l'association) */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-sm"
                  aria-label={t('language.label')}>
                <Globe className="w-4 h-4" />
                <span className="font-medium uppercase">{i18n.language}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="bottom" align="end" sideOffset={6} className="min-w-[140px]">
                {LANGUAGES.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => i18n.changeLanguage(lang.code)}
                    className={`gap-2 ${i18n.language === lang.code ? 'bg-primary/10 text-primary font-medium' : ''}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${i18n.language === lang.code ? 'bg-primary' : 'bg-border'}`} />
                    <span>{lang.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="text-xs sm:text-sm text-muted-foreground">
              {new Date().toLocaleDateString(i18n.language === 'ar' ? 'ar-DZ' : i18n.language === 'fr' ? 'fr-DZ' : 'en-DZ', {
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

      {/* Settings modal — un seul champ nom + sélecteur de langue persistante de l'association */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setShowSettingsModal(false)}>
          <div className="bg-card text-card-foreground rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground mb-4">{t('settings.title')}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">{t('settings.name')}</label>
                <input
                  type="text"
                  value={settingsName}
                  onChange={(e) => setSettingsName(e.target.value)}
                  placeholder={t('settings.namePlaceholder')}
                  className="w-full px-3 py-2 text-sm border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                  dir={settingsLocale === 'ar' ? 'rtl' : 'ltr'}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">{t('settings.locale')}</label>
                <select
                  value={settingsLocale}
                  onChange={(e) => setSettingsLocale(e.target.value as 'ar' | 'fr' | 'en')}
                  className="w-full px-3 py-2 text-sm border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                >
                  <option value="ar">{t('settings.localeAr')}</option>
                  <option value="fr">{t('settings.localeFr')}</option>
                  <option value="en">{t('settings.localeEn')}</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">{t('settings.localeHint')}</p>
              </div>
              {nameError && (
                <p className="text-xs text-destructive">{nameError}</p>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 py-2.5 text-sm text-secondary-foreground bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleUpdateName}
                  disabled={savingName || !settingsName.trim()}
                  className="flex-1 py-2.5 text-sm text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
