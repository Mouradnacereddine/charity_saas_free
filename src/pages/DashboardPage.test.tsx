import { screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// The dashboard is fed by TanStack Query hooks; mock them (no network in tests).
// NOTE: the zustand store mocks this file used to carry are obsolete — the app
// migrated to TanStack Query, so those stores are no longer read by the page.
vi.mock('../hooks/useDashboard', () => ({
  useDashboardStats: () => ({
    data: {
      totalBankBalance: 0,
      totalCashBalance: 0,
      totalBeneficiaries: 0,
      totalDonors: 0,
      totalArticles: 0,
      activeLoans: 0,
      caissesBalances: [],
      recentTransactions: [],
    },
    isLoading: false,
  }),
}))

vi.mock('../hooks/useInventory', () => ({
  useLoans: () => ({ data: [], isLoading: false }),
}))

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'admin-id', role: 'admin' },
    isAdmin: true,
    isTreasurer: false,
    isLoading: false,
  }),
}))

// Mock helpers so formatCurrency/formatDate don't depend on Intl internals
vi.mock('../utils/helpers', () => ({
  formatCurrency: (v: number) => `${v} DA`,
  formatDate: (d: string) => d,
  localizedDesc: (d: unknown) => String(d ?? ''),
  generateId: () => 'mock-id',
  numberToArabicWords: () => '',
  numberToFrenchWords: () => '',
  generateReceiptNumber: () => 'R-001',
  calculateAge: () => ({ years: 0, months: 0, display: '0', displayAr: '0' }),
}))

import DashboardPage from './DashboardPage'
import { renderWithProviders } from '../test/utils'

describe('DashboardPage', () => {
  it('renders without crashing', async () => {
    renderWithProviders(<DashboardPage />)
    // The page title should render once loading resolves
    expect(await screen.findByText('لوحة التحكم')).toBeInTheDocument()
  })

  it('displays stat card titles in Arabic', async () => {
    renderWithProviders(<DashboardPage />)

    // Wait for loading to finish then check stat card titles
    expect(await screen.findByText('رصيد البنك الإجمالي')).toBeInTheDocument()
    expect(screen.getByText('إجمالي المستفيدين')).toBeInTheDocument()
    expect(screen.getByText('إجمالي المتبرعين')).toBeInTheDocument()
  })

  it('shows the finance cards for an admin', async () => {
    renderWithProviders(<DashboardPage />)
    // isAdmin → canViewFinance → bank + cash balances are rendered
    expect(await screen.findByText('رصيد البنك الإجمالي')).toBeInTheDocument()
    expect(screen.getByText('رصيد الصندوق النقدي')).toBeInTheDocument()
  })
})