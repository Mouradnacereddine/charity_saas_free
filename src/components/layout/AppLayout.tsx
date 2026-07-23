import { type ReactNode } from 'react';
import {
  LayoutDashboard,
  Wallet,
  Users,
  HeartHandshake,
  Package,
  FolderOpen,
  Stethoscope,
  TrendingUp,
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
  SidebarSeparator,
} from '@/components/ui/sidebar';

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
                        tooltip={item.label}
                        onClick={() => onNavigate(item.id)}
                      >
                        <item.icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border p-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip={userNameAr || 'مستخدم'}
              >
                <div className="flex items-center gap-2 size-full">
                  <div className="size-6 rounded-full bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                    {userNameAr?.charAt(0) || '?'}
                  </div>
                  <span className="group-data-[collapsible=icon]:hidden text-sm">
                    {userNameAr || 'مستخدم'}
                  </span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
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
            <span className="text-sm text-green-700 font-arabic">بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</span>
          </div>
          <div className="text-xs sm:text-sm text-muted-foreground">
            {new Date().toLocaleDateString('ar-DZ', {
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
