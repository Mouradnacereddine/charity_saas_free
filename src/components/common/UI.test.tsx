import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import {
  Button,
  Card,
  Input,
  Select,
  SearchableSelect,
  TextArea,
  StatCard,
  Modal,
  Badge,
  EmptyState,
  LoadingSpinner,
} from './UI'

// ─── Button ──────────────────────────────────────────────────────────────────

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('applies primary variant classes by default', () => {
    render(<Button>Primary</Button>)
    const btn = screen.getByRole('button', { name: 'Primary' })
    expect(btn).toHaveClass('bg-primary-600')
  })

  it('applies secondary variant classes', () => {
    render(<Button variant="secondary">Sec</Button>)
    const btn = screen.getByRole('button', { name: 'Sec' })
    expect(btn).toHaveClass('bg-gray-100')
    expect(btn).toHaveClass('text-gray-700')
  })

  it('applies danger variant classes', () => {
    render(<Button variant="danger">Del</Button>)
    expect(screen.getByRole('button', { name: 'Del' })).toHaveClass('bg-danger-500')
  })

  it('applies success variant classes', () => {
    render(<Button variant="success">OK</Button>)
    expect(screen.getByRole('button', { name: 'OK' })).toHaveClass('bg-success-500')
  })

  it('applies ghost variant classes', () => {
    render(<Button variant="ghost">Ghost</Button>)
    expect(screen.getByRole('button', { name: 'Ghost' })).toHaveClass('text-gray-600')
  })

  it('applies sm size classes', () => {
    render(<Button size="sm">Small</Button>)
    expect(screen.getByRole('button', { name: 'Small' })).toHaveClass('px-3', 'py-1.5', 'text-xs')
  })

  it('applies md size classes by default', () => {
    render(<Button>Medium</Button>)
    expect(screen.getByRole('button', { name: 'Medium' })).toHaveClass('px-4', 'py-2', 'text-sm')
  })

  it('applies lg size classes', () => {
    render(<Button size="lg">Large</Button>)
    expect(screen.getByRole('button', { name: 'Large' })).toHaveClass('px-6', 'py-3', 'text-base')
  })

  it('handles click events', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click</Button>)
    fireEvent.click(screen.getByRole('button', { name: 'Click' }))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('supports disabled state', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button', { name: 'Disabled' })).toBeDisabled()
  })
})

// ─── Card ────────────────────────────────────────────────────────────────────

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Card content</Card>)
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('renders title in header', () => {
    render(<Card title="My Card">Body</Card>)
    expect(screen.getByText('My Card')).toBeInTheDocument()
  })

  it('renders titleAr in header (overrides title)', () => {
    render(<Card title="English" titleAr="عربي">Body</Card>)
    expect(screen.getByText('عربي')).toBeInTheDocument()
  })

  it('renders action slot', () => {
    render(<Card action={<button>Action</button>}>Body</Card>)
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument()
  })
})

// ─── Input ───────────────────────────────────────────────────────────────────

describe('Input', () => {
  it('renders label', () => {
    render(<Input label="Email" />)
    expect(screen.getByText('Email')).toBeInTheDocument()
  })

  it('renders labelAr', () => {
    render(<Input labelAr="البريد" />)
    expect(screen.getByText('البريد')).toBeInTheDocument()
  })

  it('renders error message', () => {
    render(<Input error="Required field" />)
    expect(screen.getByText('Required field')).toBeInTheDocument()
  })

  it('forwards HTML attributes', () => {
    render(<Input placeholder="Enter email" type="email" />)
    const input = screen.getByPlaceholderText('Enter email')
    expect(input).toHaveAttribute('type', 'email')
  })
})

// ─── Select ──────────────────────────────────────────────────────────────────

describe('Select', () => {
  const options = [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' },
  ]

  it('renders options', () => {
    render(<Select options={options} />)
    expect(screen.getByText('Option A')).toBeInTheDocument()
    expect(screen.getByText('Option B')).toBeInTheDocument()
  })

  it('renders label', () => {
    render(<Select label="Category" options={options} />)
    expect(screen.getByText('Category')).toBeInTheDocument()
  })

  it('shows "اختر..." as first option', () => {
    render(<Select options={options} />)
    expect(screen.getByText('اختر...')).toBeInTheDocument()
    // Verify it is the first option
    const selectEl = screen.getByRole('combobox')
    const firstOption = selectEl.querySelector('option:first-child')
    expect(firstOption).toHaveTextContent('اختر...')
  })
})

// ─── TextArea ────────────────────────────────────────────────────────────────

describe('TextArea', () => {
  it('renders label', () => {
    render(<TextArea label="Notes" />)
    expect(screen.getByText('Notes')).toBeInTheDocument()
  })

  it('forwards props', () => {
    render(<TextArea placeholder="Write here..." rows={5} />)
    const textarea = screen.getByPlaceholderText('Write here...')
    expect(textarea).toHaveAttribute('rows', '5')
  })
})

// ─── StatCard ────────────────────────────────────────────────────────────────

describe('StatCard', () => {
  it('renders title, value, subtitle, and icon', () => {
    render(
      <StatCard
        title="Total"
        value={42}
        subtitle="This month"
        icon={<span data-testid="icon">IC</span>}
      />
    )
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('This month')).toBeInTheDocument()
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })
})

// ─── Modal ───────────────────────────────────────────────────────────────────

describe('Modal', () => {
  it('renders when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="My Modal">
        Modal content
      </Modal>
    )
    expect(screen.getByText('Modal content')).toBeInTheDocument()
  })

  it('does NOT render when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={() => {}} title="Hidden">
        Hidden content
      </Modal>
    )
    expect(screen.queryByText('Hidden content')).not.toBeInTheDocument()
  })

  it('renders title', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Title Test">
        Body
      </Modal>
    )
    expect(screen.getByText('Title Test')).toBeInTheDocument()
  })

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen={true} onClose={onClose} title="Close Test">
        Body
      </Modal>
    )
    // The backdrop is the div with bg-black/50 class
    const backdrop = document.querySelector('.bg-black\\/50')!
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

// ─── Badge ───────────────────────────────────────────────────────────────────

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Active</Badge>)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('applies default variant classes', () => {
    render(<Badge>Default</Badge>)
    expect(screen.getByText('Default')).toHaveClass('bg-gray-100', 'text-gray-700')
  })

  it('applies success variant classes', () => {
    render(<Badge variant="success">OK</Badge>)
    expect(screen.getByText('OK')).toHaveClass('bg-green-100', 'text-green-700')
  })

  it('applies warning variant classes', () => {
    render(<Badge variant="warning">Warn</Badge>)
    expect(screen.getByText('Warn')).toHaveClass('bg-yellow-100', 'text-yellow-700')
  })

  it('applies danger variant classes', () => {
    render(<Badge variant="danger">Err</Badge>)
    expect(screen.getByText('Err')).toHaveClass('bg-red-100', 'text-red-700')
  })

  it('applies info variant classes', () => {
    render(<Badge variant="info">Info</Badge>)
    expect(screen.getByText('Info')).toHaveClass('bg-blue-100', 'text-blue-700')
  })
})

// ─── EmptyState ──────────────────────────────────────────────────────────────

describe('EmptyState', () => {
  it('renders message', () => {
    render(<EmptyState message="No data available" />)
    expect(screen.getByText('No data available')).toBeInTheDocument()
  })
})

// ─── LoadingSpinner ──────────────────────────────────────────────────────────

describe('LoadingSpinner', () => {
  it('renders spinner element', () => {
    const { container } = render(<LoadingSpinner />)
    const spinner = container.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })
})

// ─── SearchableSelect ──────────────────────────────────────────────────────────

describe('SearchableSelect', () => {
  const options = [
    { value: '1', label: 'Option A' },
    { value: '2', label: 'Option B' },
  ]

  it('renders placeholder when no value is selected', () => {
    render(
      <SearchableSelect
        options={options}
        value=""
        onChange={() => {}}
        placeholder="Select option..."
      />
    )
    expect(screen.getByText('Select option...')).toBeInTheDocument()
  })

  it('renders selected label when value is provided', () => {
    render(
      <SearchableSelect
        options={options}
        value="2"
        onChange={() => {}}
        placeholder="Select option..."
      />
    )
    expect(screen.getByText('Option B')).toBeInTheDocument()
  })

  it('opens dropdown when clicked', () => {
    render(
      <SearchableSelect
        options={options}
        value=""
        onChange={() => {}}
        placeholder="Select option..."
      />
    )
    const button = screen.getByRole('button')
    fireEvent.click(button)
    expect(screen.getByPlaceholderText('بحث...')).toBeInTheDocument()
    expect(screen.getByText('Option A')).toBeInTheDocument()
  })
})

