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
  ChevronDown,
} from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarRail,
  SidebarInset,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
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

const userRoles: Record<string, string> = {
  admin: 'user.role_admin',
  treasurer: 'user.role_treasurer',
  user: 'user.role_user',
};

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
    <SidebarProvider>
      <Sidebar side="right" collapsible="icon" variant="sidebar">
        {/* ── Sidebar Header: Logo + Association Name ── */}
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  {associationLogoUrl ? (
                    <img src={associationLogoUrl} alt="logo" className="size-6 rounded" />
                  ) : (
                    <span className="text-sm">🕌</span>
                  )}
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-semibold">{associationNameAr || 'جمعية خيرية'}</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        {/* ── Sidebar Content: Navigation ── */}
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">{t('nav.dashboard')}</SidebarGroupLabel>
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

        {/* ── Sidebar Footer: User Avatar + Langue ── */}
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton size="lg" className="flex-1 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                      <Avatar className="size-6 rounded-lg">
                        <AvatarFallback className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                          {userNameAr?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                        <span className="truncate font-semibold">{userNameAr || t('user.menu')}</span>
                        <span className="truncate text-xs">{t(userRoles[userRole || 'user'])}</span>
                      </div>
                      <ChevronDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="top" align="end" className="w-56">
                    <div className="px-2 py-1.5 text-sm font-medium">{userNameAr || t('user.menu')}</div>
                    <div className="px-2 pb-1.5 text-xs text-muted-foreground">{t(userRoles[userRole || 'user'])}</div>
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
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        {/* ── Sidebar Rail (resize handle) ── */}
        <SidebarRail />
      </Sidebar>

      {/* ── Main Content Area ── */}
      <SidebarInset>
        {/* Header with breadcrumb and trigger */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background px-4 no-print">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            {breadcrumbs && breadcrumbs.length > 0 && (
              <Breadcrumb dir="rtl">
                <BreadcrumbList>
                  {breadcrumbs.map((crumb, i) => (
                    <BreadcrumbItem key={crumb.page}>
                      {i < breadcrumbs.length - 1 ? (
                        <>
                          <BreadcrumbLink asChild>
                            <button onClick={() => onNavigate(crumb.page)} className="hover:text-primary">
                              {crumb.label}
                            </button>
                          </BreadcrumbLink>
                          <BreadcrumbSeparator />
                        </>
                      ) : (
                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            )}
          </div>
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
        <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
