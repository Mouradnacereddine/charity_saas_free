"use client"

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
} from 'lucide-react';

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

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

export function NavMain({
  activePage,
  onNavigate,
  isAdmin,
  userRole,
}: {
  activePage: string;
  onNavigate: (page: string) => void;
  isAdmin?: boolean;
  userRole?: string;
}) {
  const { t } = useTranslation();

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
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
  );
}
