import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// Mock all stores before importing the component
vi.mock('../stores/financeStore', () => ({
  useFinanceStore: () => ({
    transactions: [],
    totalCash: 0,
    loadTransactions: vi.fn().mockResolvedValue(undefined),
    loadBankAccounts: vi.fn().mockResolvedValue(undefined),
    calculateTotalCash: vi.fn().mockResolvedValue(undefined),
    getTotalBankBalance: () => 0,
  }),
}))

vi.mock('../stores/caisseStore', () => ({
  useCaisseStore: () => ({
    caisses: [],
    loadCaisses: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('../stores/beneficiaryStore', () => ({
  useBeneficiaryStore: () => ({
    beneficiaries: [],
    loadBeneficiaries: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('../stores/donorStore', () => ({
  useDonorStore: () => ({
    donors: [],
    loadDonors: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('../stores/inventoryStore', () => ({
  useInventoryStore: () => ({
    articles: [],
    loans: [],
    loadArticles: vi.fn().mockResolvedValue(undefined),
    loadLoans: vi.fn().mockResolvedValue(undefined),
  }),
}))

// Mock helpers so formatCurrency/formatDate don't depend on Intl internals
vi.mock('../utils/helpers', () => ({
  formatCurrency: (v: number) => `${v} DA`,
  formatDate: (d: string) => d,
  generateId: () => 'mock-id',
  numberToArabicWords: () => '',
  numberToFrenchWords: () => '',
  generateReceiptNumber: () => 'R-001',
  calculateAge: () => ({ years: 0, months: 0, display: '0', displayAr: '0' }),
}))

import DashboardPage from './DashboardPage'

describe('DashboardPage', () => {
  it('renders without crashing', async () => {
    render(<DashboardPage />)
    // After loading resolves, the page should render the title
    expect(await screen.findByText('لوحة التحكم')).toBeInTheDocument()
  })

  it('displays stat card titles in Arabic', async () => {
    render(<DashboardPage />)

    // Wait for loading to finish then check stat card titles
    expect(await screen.findByText('رصيد البنك الإجمالي')).toBeInTheDocument()
    expect(screen.getByText('إجمالي المستفيدين')).toBeInTheDocument()
    expect(screen.getByText('إجمالي المتبرعين')).toBeInTheDocument()
  })
})
