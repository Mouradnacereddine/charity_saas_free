import { screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Wholesale API mock: the page loads donors, caisses and beneficiaries on mount,
// so nothing here may touch the network. Existing specs (DonationPage) use the
// same idiom.
vi.mock('../lib/api', () => ({
  donorsApi: {
    list: vi.fn().mockResolvedValue({ data: [] }),
    create: vi.fn().mockResolvedValue({ data: {} }),
    update: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn(),
    receipts: vi.fn(),
    sponsoredBeneficiaries: vi.fn(),
    addSponsoredBeneficiary: vi.fn(),
    removeSponsoredBeneficiary: vi.fn(),
  },
  caissesApi: { list: vi.fn().mockResolvedValue({ data: [] }) },
  financeApi: { transactions: vi.fn() },
  beneficiariesApi: { list: vi.fn().mockResolvedValue({ data: [] }) },
}))

// useAuth reads localStorage, which this test environment does not provide;
// mocking it matches DashboardPage.test.tsx.
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ association: { name: 'جمعية الخير' }, user: { id: 'u1' }, isAdmin: true }),
}))

import DonorsPage from './DonorsPage'
import { donorsApi, beneficiariesApi } from '../lib/api'
import { renderWithProviders } from '../test/utils'

const BENEFICIARY = {
  id: 'b1',
  reference: 'BEN-001',
  firstName: 'فاطمة',
  lastName: 'زهراء',
  gender: 'female',
  associationId: 'assoc-1',
}

/** Opens the "add donor" modal from the donors list page. */
async function openAddDonorModal() {
  renderWithProviders(<DonorsPage />)
  fireEvent.click(await screen.findByRole('button', { name: /إضافة متبرع/ }))
}

/** Fills the minimum required fields, picks a gender, and saves. */
async function fillAndSave(genderLabel: string) {
  fireEvent.change(screen.getByPlaceholderText('مثال: بن عيسى'), { target: { value: 'بوزيد' } })
  fireEvent.change(screen.getByPlaceholderText('مثال: محمد'), { target: { value: 'سليم' } })
  fireEvent.change(screen.getByPlaceholderText('05XX XX XX XX'), { target: { value: '0555555555' } })

  // The gender selector is a SearchableSelect: its current value is shown on the
  // trigger button, its choices only render once the trigger is opened.
  fireEvent.click(screen.getByText('ذكر').closest('button')!)
  fireEvent.click(await screen.findByRole('button', { name: genderLabel }))

  fireEvent.click(screen.getByRole('button', { name: 'إضافة' }))
}

describe('DonorsPage — formulaire donateur', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(donorsApi.list).mockResolvedValue({ data: [] } as any)
    vi.mocked(donorsApi.create).mockResolvedValue({ data: {} } as any)
    vi.mocked(beneficiariesApi.list).mockResolvedValue({ data: [] } as any)
  })

  it("affiche le sélecteur de sexe dans le formulaire d'ajout", async () => {
    await openAddDonorModal()

    expect(await screen.findByText('الجنس')).toBeInTheDocument()

    // Defaults to male, and the list offers both options.
    fireEvent.click(screen.getByText('ذكر').closest('button')!)
    expect(await screen.findByRole('button', { name: 'أنثى' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ذكر' })).toBeInTheDocument()
  })

  it('permet de choisir « أنثى » et remonte le choix dans le formulaire', async () => {
    await openAddDonorModal()

    fireEvent.click(screen.getByText('ذكر').closest('button')!)
    fireEvent.click(await screen.findByRole('button', { name: 'أنثى' }))

    // The trigger now shows the selected label.
    const trigger = screen.getByText('أنثى').closest('button')!
    expect(trigger).toBeInTheDocument()
    expect(trigger.textContent).toContain('أنثى')
  })

  it('enregistre le sexe choisi dans le payload de création', async () => {
    await openAddDonorModal()
    await fillAndSave('أنثى')

    await waitFor(() => expect(donorsApi.create).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(donorsApi.create).mock.calls[0][0] as any
    expect(payload.gender).toBe('female')
    expect(payload.lastName).toBe('بوزيد')
    expect(payload.firstName).toBe('سليم')
    expect(payload.phone).toBe('0555555555')
  })

  it('enregistre la valeur par défaut « male » si le sexe n\'est pas touché', async () => {
    await openAddDonorModal()
    fireEvent.change(screen.getByPlaceholderText('مثال: بن عيسى'), { target: { value: 'بوزيد' } })
    fireEvent.change(screen.getByPlaceholderText('05XX XX XX XX'), { target: { value: '0555555555' } })
    fireEvent.click(screen.getByRole('button', { name: 'إضافة' }))

    await waitFor(() => expect(donorsApi.create).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(donorsApi.create).mock.calls[0][0] as any
    expect(payload.gender).toBe('male')
  })

  it('transmet les bénéficiaires pris en charge à la création', async () => {
    vi.mocked(beneficiariesApi.list).mockResolvedValue({ data: [BENEFICIARY] } as any)
    await openAddDonorModal()

    // Pick the beneficiary through the sponsored-beneficiaries picker.
    fireEvent.click(screen.getByText(/أضف مستفيدًا يتكفل به/).closest('button')!)
    fireEvent.click(await screen.findByRole('button', { name: /زهراء فاطمة/ }))

    await fillAndSave('أنثى')

    await waitFor(() => expect(donorsApi.create).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(donorsApi.create).mock.calls[0][0] as any
    expect(payload.sponsoredBeneficiaryIds).toEqual(['b1'])
  })
})