import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import DonationPage from './DonationPage'
import { lemonSqueezyApi } from '../lib/api'

vi.mock('../lib/api', () => ({
  lemonSqueezyApi: {
    getConfig: vi.fn(),
    createCheckout: vi.fn(),
  },
}))

const mockedGetConfig = vi.mocked(lemonSqueezyApi.getConfig)
const mockedCreateCheckout = vi.mocked(lemonSqueezyApi.createCheckout)

describe('DonationPage', () => {
  const assignMock = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'location', {
      value: { assign: assignMock },
      writable: true,
    })
    mockedGetConfig.mockResolvedValue({
      data: { enabled: true, currency: 'DZD', minAmount: 67 },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    } as any)
    mockedCreateCheckout.mockResolvedValue({
      data: { checkoutUrl: 'https://checkout.lemonsqueezy.com/abc' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    } as any)
  })

  it('renders the title and the quick amount buttons in DZD', async () => {
    render(<DonationPage />)
    expect(await screen.findByText('ادعم المطوّر')).toBeInTheDocument()
    expect(screen.getByText('500 دج')).toBeInTheDocument()
    expect(screen.getByText('1000 دج')).toBeInTheDocument()
    expect(screen.getByText('2000 دج')).toBeInTheDocument()
    expect(screen.getByText('5000 دج')).toBeInTheDocument()
  })

  it('creates a checkout and redirects on submit with the default DZD amount', async () => {
    render(<DonationPage />)
    const submit = await screen.findByRole('button', { name: /تبرع/ })
    fireEvent.click(submit)

    await waitFor(() => expect(mockedCreateCheckout).toHaveBeenCalledWith({ amount: 1000 }))
    await waitFor(() =>
      expect(assignMock).toHaveBeenCalledWith('https://checkout.lemonsqueezy.com/abc')
    )
  })

  it('shows an inline error when the checkout fails', async () => {
    mockedCreateCheckout.mockRejectedValue(new Error('boom'))
    render(<DonationPage />)
    const submit = await screen.findByRole('button', { name: /تبرع/ })
    fireEvent.click(submit)

    expect(await screen.findByText('حدث خطأ. يرجى المحاولة مرة أخرى.')).toBeInTheDocument()
    expect(assignMock).not.toHaveBeenCalled()
  })

  it('affiche la VRAIE raison retournée par le backend quand le checkout échoue (503 produit non configuré)', async () => {
    mockedCreateCheckout.mockRejectedValue({
      response: { data: { error: 'Le produit de don (store/variant) n’est pas encore configuré' } },
    })
    render(<DonationPage />)
    const submit = await screen.findByRole('button', { name: /تبرع/ })
    fireEvent.click(submit)

    expect(
      await screen.findByText('Le produit de don (store/variant) n’est pas encore configuré')
    ).toBeInTheDocument()
    expect(assignMock).not.toHaveBeenCalled()
  })

  it('affiche la vraie raison backend même pour une erreur 4xx (montant invalide)', async () => {
    mockedCreateCheckout.mockRejectedValue({
      response: { data: { error: 'Le montant minimal est de 67 DZD' } },
    })
    render(<DonationPage />)
    const submit = await screen.findByRole('button', { name: /تبرع/ })
    fireEvent.click(submit)

    expect(await screen.findByText('Le montant minimal est de 67 DZD')).toBeInTheDocument()
    expect(assignMock).not.toHaveBeenCalled()
  })
})