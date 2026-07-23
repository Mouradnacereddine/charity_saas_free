import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Wallet,
  Users,
  HeartHandshake,
  Package,
  FolderOpen,
  Stethoscope,
  TrendingUp,
  LogOut,
  UserCog,
  Settings,
} from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LanguageSwitcher } from '@/components/language/LanguageSwitcher';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const navItems = [
  { id: 'dashboard', key: 'nav.dashboard', icon: LayoutDashboard },
  { id: 'analytics', key: 'nav.analytics', icon: TrendingUp },
  { id: 'finance', key: 'nav.finance', icon: Wallet },
  { id: 'caisses', key: 'nav.caisses', icon: FolderOpen },
  { id: 'beneficiaries', key: 'nav.beneficiaries', icon: Users },
  { id: 'donors', key: 'nav.donors', icon: HeartHandshake },
  { id: 'inventory', key: 'nav.inventory', icon: Package },
  { id: 'medical', key: 'nav.medical', icon: Stethoscope },
  { id: 'doctors', key: 'nav.doctors', icon: Stethoscope },
];

export function AppLayout({
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
  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar side="right" collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border p-4">
          <div className="flex items-center gap-2 min-w-0">
            {associationLogoUrl ? (
              <img src={associationLogoUrl} alt="logo" className="w-8 h-8 rounded-lg object-cover shrink-0" />
            ) : (
              <span className="text-lg shrink-0 group-data-[collapsible=icon]:mx-auto">🕌</span>
            )}
            <span className="truncate text-sm font-semibold group-data-[collapsible=icon]:hidden">
              {associationNameAr || 'جمعية خيرية'}
            </span>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems
                  .filter((item) => item.id !== 'analytics' || isAdmin || userRole === 'treasurer')
                  .map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        isActive={activePage === item.id}
                        tooltip={t(item.key)}
                        onClick={() => onNavigate(item.id)}
                      >
                        <item.icon />
                        <span>{t(item.key)}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border p-3">
          <div className="flex items-center justify-between">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton tooltip={userNameAr || t('user.menu')}>
                  <div className="flex items-center gap-2 size-full">
                    <Avatar className="size-6">
                      <AvatarFallback className="text-xs bg-sidebar-primary text-sidebar-primary-foreground">
                        {userNameAr?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="group-data-[collapsible=icon]:hidden text-sm">
                      {userNameAr || t('user.menu')}
                    </span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm font-medium text-foreground">
                  {userNameAr || t('user.menu')}
                </div>
                <div className="px-2 pb-1.5 text-xs text-muted-foreground">
                  {userRole === 'admin' ? t('user.role_admin') : userRole === 'treasurer' ? t('user.role_treasurer') : t('user.role_user')}
                </div>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <DropdownMenuItem onClick={() => onNavigate('users')}>
                    <UserCog className="size-4" />
                    <span>{t('nav.users')}</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onLogout?.()}>
                  <LogOut className="size-4" />
                  <span>{t('nav.logout')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <LanguageSwitcher />
          </div>
        </SidebarFooter>
      </Sidebar>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-background border-b border-border px-4 sm:px-6 py-3 flex items-center gap-3 no-print">
          <SidebarTrigger />
          {breadcrumbs && (
            <nav className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground" dir="rtl">
              {breadcrumbs.map((crumb, i) => (
                <span key={`bc-${i}`} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-muted-foreground/40">{'<'}</span>}
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
          <div className="flex-1 text-center">
            <span className="text-sm text-green-700 font-arabic">{t('common.bismillah')}</span>
          </div>
          <div className="text-xs sm:text-sm text-muted-foreground">
            {new Date().toLocaleDateString(i18n.language === 'ar' ? 'ar-DZ' : i18n.language, {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </SidebarProvider>
  );
}
