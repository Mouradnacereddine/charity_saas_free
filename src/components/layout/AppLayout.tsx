import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { NavMain } from '@/components/blocks/nav-main';
import { NavUser } from '@/components/blocks/nav-user';
import { SiteHeader } from '@/components/blocks/site-header';

const languages = [
  { code: 'ar', label: 'العربية' },
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
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
    <SidebarProvider
      style={{ '--sidebar-width': '16rem', '--header-height': '3.5rem' } as React.CSSProperties}
    >
      <AppSidebar
        activePage={activePage}
        onNavigate={onNavigate}
        isAdmin={isAdmin}
        userRole={userRole}
        userNameAr={userNameAr}
        associationNameAr={associationNameAr}
        associationLogoUrl={associationLogoUrl}
        onLogout={onLogout}
        i18n={i18n}
        t={t}
      />
      <main className="flex flex-1 flex-col">
        <SiteHeader breadcrumbs={breadcrumbs} onNavigate={onNavigate} />
        <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          {children}
        </div>
      </main>
    </SidebarProvider>
  );
}

function AppSidebar({
  activePage,
  onNavigate,
  isAdmin,
  userRole,
  userNameAr,
  associationNameAr,
  associationLogoUrl,
  onLogout,
  i18n,
  t,
}: {
  activePage: string;
  onNavigate: (page: string) => void;
  isAdmin?: boolean;
  userRole?: string;
  userNameAr?: string;
  associationNameAr?: string;
  associationLogoUrl?: string;
  onLogout?: () => void;
  i18n: any;
  t: any;
}) {
  const currentLang = languages.find((l) => l.code === i18n.language) || languages[0];

  return (
    <Sidebar collapsible="icon" side="right">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                {associationLogoUrl ? (
                  <img src={associationLogoUrl} alt="logo" className="size-6 rounded" />
                ) : (
                  <span className="text-base">🕌</span>
                )}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{associationNameAr || t('common.home')}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain
          activePage={activePage}
          onNavigate={onNavigate}
          isAdmin={isAdmin}
          userRole={userRole}
        />
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-1 p-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="size-8 text-sidebar-foreground/60 hover:text-sidebar-foreground">
                <Languages className="size-4" />
                <span className="sr-only">{t('sidebar.toggle')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="min-w-32">
              {languages.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => i18n.changeLanguage(lang.code)}
                  className={currentLang.code === lang.code ? 'font-bold' : ''}
                >
                  {lang.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex-1" />
          <NavUser
            userNameAr={userNameAr}
            userRole={userRole}
            isAdmin={isAdmin}
            onNavigate={onNavigate}
            onLogout={onLogout}
          />
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
