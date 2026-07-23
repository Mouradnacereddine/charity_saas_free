import { type ReactNode } from 'react';

import {
  SidebarProvider,
  SidebarInset,
} from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/blocks/app-sidebar';
import { SiteHeader } from '@/components/blocks/site-header';

export function AppLayout({
  children,
  activePage,
  onNavigate,
  breadcrumbs,
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
    <SidebarProvider
      style={{ '--sidebar-width': '16rem', '--header-height': '3.5rem' } as React.CSSProperties}
    >
      <AppSidebar />
      <SidebarInset>
        <SiteHeader breadcrumbs={breadcrumbs} onNavigate={onNavigate} />
        <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
