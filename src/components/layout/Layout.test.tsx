import { screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Layout } from './Layout'
import { renderWithProviders } from '../../test/utils'

describe('Layout', () => {
  const defaultProps = {
    activePage: 'dashboard',
    onNavigate: vi.fn(),
  }

  it('renders all navigation items in Arabic', () => {
    renderWithProviders(<Layout {...defaultProps}>Content</Layout>)

    // "لوحة التحكم" appears in both the sidebar nav and the top header h2
    const dashboardElements = screen.getAllByText('لوحة التحكم')
    expect(dashboardElements.length).toBeGreaterThanOrEqual(1)

    expect(screen.getByText('المالية')).toBeInTheDocument()
    expect(screen.getByText('الصناديق')).toBeInTheDocument()
    expect(screen.getByText('المستفيدون')).toBeInTheDocument()
    expect(screen.getByText('المتبرعون')).toBeInTheDocument()
    expect(screen.getByText('المخزون')).toBeInTheDocument()
    expect(screen.getByText('التوجيه الطبي')).toBeInTheDocument()
  })

  it('renders children in main content area', () => {
    renderWithProviders(<Layout {...defaultProps}><p>Page Content</p></Layout>)
    expect(screen.getByText('Page Content')).toBeInTheDocument()
  })

  it('highlights the active page', () => {
    renderWithProviders(<Layout {...defaultProps} activePage="finance">Content</Layout>)
    const financeElements = screen.getAllByText('المالية')
    // The active nav item carries the sidebar-primary background class
    const activeNavButton = financeElements.find(el =>
      el.closest('button')?.className.includes('bg-sidebar-primary')
    )
    expect(activeNavButton).toBeDefined()
  })

  it('does not highlight an inactive page', () => {
    renderWithProviders(<Layout {...defaultProps} activePage="dashboard">Content</Layout>)
    const financeElements = screen.getAllByText('المالية')
    const activeNavButton = financeElements.find(el =>
      el.closest('button')?.className.includes('bg-sidebar-primary')
    )
    expect(activeNavButton).toBeUndefined()
  })

  it('calls onNavigate when a nav item is clicked', () => {
    const onNavigate = vi.fn()
    renderWithProviders(<Layout {...defaultProps} onNavigate={onNavigate}>Content</Layout>)

    // Click on the sidebar nav button for "المالية"
    const navButtons = screen.getAllByRole('button')
    const financeButton = navButtons.find(btn => btn.textContent?.includes('المالية'))
    expect(financeButton).toBeDefined()
    fireEvent.click(financeButton!)
    expect(onNavigate).toHaveBeenCalledWith('finance')
  })

  it('has a mobile menu button', () => {
    renderWithProviders(<Layout {...defaultProps}>Content</Layout>)
    // The mobile menu button is in the header, it is an lg:hidden button
    const allButtons = screen.getAllByRole('button')
    const mobileMenuButton = allButtons.find(btn =>
      btn.className.includes('lg:hidden')
    )
    expect(mobileMenuButton).toBeDefined()
  })

  it('shows the current date in the header', () => {
    renderWithProviders(<Layout {...defaultProps}>Content</Layout>)
    // The header renders the date with fr-FR (Arabic UI falls back to fr-FR formatting)
    const today = new Date()
    const expectedDate = today.toLocaleDateString('fr-FR', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
    expect(screen.getByText(expectedDate)).toBeInTheDocument()
  })

  it('hides navigation items the user cannot access', () => {
    // canAny=false for every resource → no nav buttons rendered
    renderWithProviders(
      <Layout {...defaultProps} canAny={() => false}>Content</Layout>,
    )
    expect(screen.queryByText('المالية')).not.toBeInTheDocument()
    expect(screen.queryByText('المستفيدون')).not.toBeInTheDocument()
  })
})