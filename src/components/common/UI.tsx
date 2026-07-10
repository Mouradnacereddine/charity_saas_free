import { useState, useRef, useEffect, type ReactNode, type ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export function Button({ variant = 'primary', size = 'md', children, className = '', ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500 border border-gray-300',
    danger: 'bg-danger-500 text-white hover:bg-danger-600 focus:ring-danger-500',
    success: 'bg-success-500 text-white hover:bg-success-600 focus:ring-success-500',
    ghost: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-500',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs min-h-[36px] sm:min-h-0',
    md: 'px-4 py-2 text-sm min-h-[44px] sm:min-h-0',
    lg: 'px-6 py-3 text-base min-h-[44px]',
  };

  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
}

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  titleAr?: string;
  action?: ReactNode;
}

export function Card({ children, className = '', title, titleAr, action }: CardProps) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}>
      {(title || titleAr || action) && (
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">{titleAr || title}</h3>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  labelAr?: string;
  error?: string;
}

export function Input({ label, labelAr, error, className = '', ...props }: InputProps) {
  return (
    <div className="space-y-1">
      {(label || labelAr) && (
        <label className="block text-sm font-medium text-gray-700">{labelAr || label}</label>
      )}
      <input
        className={`w-full px-3 py-2 border rounded-lg text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
          error ? 'border-danger-500' : 'border-gray-300'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-danger-500">{error}</p>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  labelAr?: string;
  options: { value: string; label: string }[];
  error?: string;
}

export function Select({ label, labelAr, options, error, className = '', ...props }: SelectProps) {
  return (
    <div className="space-y-1">
      {(label || labelAr) && (
        <label className="block text-sm font-medium text-gray-700">{labelAr || label}</label>
      )}
      <select
        className={`w-full px-3 py-2 border rounded-lg text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
          error ? 'border-danger-500' : 'border-gray-300'
        } ${className}`}
        {...props}
      >
        <option value="">اختر...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-danger-500">{error}</p>}
    </div>
  );
}

interface SearchableSelectProps {
  label?: string;
  labelAr?: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
}

export function SearchableSelect({
  label,
  labelAr,
  options,
  value,
  onChange,
  placeholder = 'اختر...',
  error,
  required,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);
  const filteredOptions = options.filter((opt) =>
    (opt.label || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-1 relative" ref={containerRef}>
      {(label || labelAr) && (
        <label className="block text-sm font-medium text-gray-700">
          {labelAr || label}
          {required && <span className="text-red-500 mr-1">*</span>}
        </label>
      )}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch('');
        }}
        className={`w-full px-3 py-2 border rounded-lg text-sm min-h-[44px] bg-white flex items-center justify-between text-right focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
          error ? 'border-danger-500' : 'border-gray-300'
        }`}
      >
        <span className={selectedOption ? 'text-gray-900' : 'text-gray-400'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="text-gray-500 text-xs">▼</span>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث..."
              className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto flex-1">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className="w-full text-right px-3 py-2 text-xs text-gray-400 hover:bg-gray-50 border-b border-gray-50"
            >
              مسح الاختيار
            </button>
            {filteredOptions.length === 0 ? (
              <p className="p-3 text-xs text-gray-400 text-center">لا توجد نتائج</p>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-right px-3 py-2 text-sm hover:bg-primary-50 hover:text-primary-700 transition-colors border-b border-gray-50 last:border-0 ${
                    opt.value === value ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
      {error && <p className="text-xs text-danger-500">{error}</p>}
    </div>
  );
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  labelAr?: string;
  error?: string;
}

export function TextArea({ label, labelAr, error, className = '', ...props }: TextAreaProps) {
  return (
    <div className="space-y-1">
      {(label || labelAr) && (
        <label className="block text-sm font-medium text-gray-700">{labelAr || label}</label>
      )}
      <textarea
        className={`w-full px-3 py-2 border rounded-lg text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
          error ? 'border-danger-500' : 'border-gray-300'
        } ${className}`}
        rows={3}
        {...props}
      />
      {error && <p className="text-xs text-danger-500">{error}</p>}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  color?: string;
}

export function StatCard({ title, value, subtitle, icon, color = 'bg-primary-500' }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 truncate">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center text-white`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative bg-white rounded-none sm:rounded-xl shadow-xl ${sizes[size]} w-full mx-0 sm:mx-4 h-full sm:h-auto max-h-full sm:max-h-[90vh] overflow-auto`}>
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white sm:rounded-t-xl">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            ✕
          </button>
        </div>
        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
}

export function EmptyState({ message, icon }: { message: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
      {icon && <div className="mb-4 text-gray-300">{icon}</div>}
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
    </div>
  );
}
