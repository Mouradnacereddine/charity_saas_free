import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Layout } from './Layout'

describe('Layout', () => {
  const defaultProps = {
    activePage: 'dashboard',
    onNavigate: vi.fn(),
  }

  it('renders all navigation items in Arabic', () => {
    render(<Layout {...defaultProps}>Content</Layout>)

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
    render(<Layout {...defaultProps}><p>Page Content</p></Layout>)
    expect(screen.getByText('Page Content')).toBeInTheDocument()
  })

  it('highlights the active page', () => {
    render(<Layout {...defaultProps} activePage="finance">Content</Layout>)
    // "المالية" appears in both the sidebar nav button and the top header h2
    const financeElements = screen.getAllByText('المالية')
    // The sidebar nav button for the active page gets bg-primary-700
    const activeNavButton = financeElements.find(el =>
      el.closest('button')?.className.includes('bg-primary-700')
    )
    expect(activeNavButton).toBeDefined()
  })

  it('calls onNavigate when a nav item is clicked', () => {
    const onNavigate = vi.fn()
    render(<Layout {...defaultProps} onNavigate={onNavigate}>Content</Layout>)

    // Click on the sidebar nav button for "المالية"
    const navButtons = screen.getAllByRole('button')
    const financeButton = navButtons.find(btn => btn.textContent?.includes('المالية'))
    expect(financeButton).toBeDefined()
    fireEvent.click(financeButton!)
    expect(onNavigate).toHaveBeenCalledWith('finance')
  })

  it('has a mobile menu button', () => {
    render(<Layout {...defaultProps}>Content</Layout>)
    // The mobile menu button is in the header, it is an lg:hidden button
    const allButtons = screen.getAllByRole('button')
    const mobileMenuButton = allButtons.find(btn =>
      btn.className.includes('lg:hidden')
    )
    expect(mobileMenuButton).toBeDefined()
  })

  it('shows current date in Arabic format', () => {
    render(<Layout {...defaultProps}>Content</Layout>)
    // The layout renders the date using ar-DZ locale with weekday, year, month, day
    // We verify the date container exists with Arabic text (day names / month names)
    const today = new Date()
    const expectedDate = today.toLocaleDateString('ar-DZ', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    expect(screen.getByText(expectedDate)).toBeInTheDocument()
  })
})
