import { create } from 'zustand';

// Theme sombre retiré : interface clean et unique, palette unique (claire).
// On purge toute classe .dark résiduelle et la valeur localStorage.

if (typeof document !== 'undefined') {
  document.documentElement.classList.remove('dark');
}
if (typeof window !== 'undefined') {
  try { window.localStorage.removeItem('theme'); } catch {}
}

interface UIStore {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
}));
