import { useState, useRef, useEffect, type ReactNode, type ButtonHTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export function Button({ variant = 'primary', size = 'md', children, className = '', ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border focus:ring-ring',
    danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-destructive',
    success: 'bg-success text-white hover:bg-success/90 focus:ring-success',
    ghost: 'text-foreground hover:bg-muted focus:ring-ring',
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
    <div className={`bg-card text-card-foreground rounded-xl shadow-sm border border-border ${className}`}>
      {(title || titleAr || action) && (
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-foreground">{titleAr || title}</h3>
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
        <label className="block text-sm font-medium text-foreground">{labelAr || label}</label>
      )}
      <input
        className={`w-full px-3 py-2 border rounded-lg text-sm min-h-[44px] bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring ${
          error ? 'border-destructive' : 'border-input'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  labelAr?: string;
  options: { value: string; label: string }[];
  error?: string;
}

export function Select({ label, labelAr, options, error, className = '', placeholder: placeholderProp, ...props }: SelectProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-1">
      {(label || labelAr) && (
        <label className="block text-sm font-medium text-foreground">{labelAr || label}</label>
      )}
      <select
        className={`w-full px-3 py-2 border rounded-lg text-sm min-h-[44px] bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring ${
          error ? 'border-destructive' : 'border-input'
        } ${className}`}
        {...props}
      >
        <option value="">{placeholderProp || t('common.select')}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-destructive">{error}</p>}
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
  placeholder,
  error,
  required,
}: SearchableSelectProps) {
  const { t } = useTranslation();
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
        <label className="block text-sm font-medium text-foreground">
          {labelAr || label}
          {required && <span className="text-destructive mr-1">*</span>}
        </label>
      )}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch('');
        }}
        className={`w-full px-3 py-2 border rounded-lg text-sm min-h-[44px] bg-background flex items-center justify-between text-right focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring ${
          error ? 'border-destructive' : 'border-input'
        }`}
      >
        <span className={selectedOption ? 'text-foreground' : 'text-muted-foreground'}>
          {selectedOption ? selectedOption.label : placeholder || t('common.select')}
        </span>
        <span className="text-muted-foreground text-xs">▼</span>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border border-border rounded-lg shadow-lg max-h-60 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-border bg-muted flex items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('common.search')}
              className="w-full px-2.5 py-1.5 text-xs border border-input bg-background text-foreground rounded focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
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
              className="w-full text-right px-3 py-2 text-xs text-muted-foreground hover:bg-muted border-b border-border"
            >
              {t('common.clear')}
            </button>
            {filteredOptions.length === 0 ? (
              <p className="p-3 text-xs text-muted-foreground text-center">{t('common.noResults')}</p>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-right px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors border-b border-border last:border-0 ${
                    opt.value === value ? 'bg-primary/10 text-primary font-medium' : 'text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
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
        <label className="block text-sm font-medium text-foreground">{labelAr || label}</label>
      )}
      <textarea
        className={`w-full px-3 py-2 border rounded-lg text-sm min-h-[44px] bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring ${
          error ? 'border-destructive' : 'border-input'
        } ${className}`}
        rows={3}
        {...props}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
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

/** Mapping couleur de fond -> couleur d'icone pour un contraste garanti.
 *  Sans cette map, certaines couleurs claires (bg-muted) sont invisibles avec text-white.
 */
const STAT_ICON_TEXT: Record<string, string> = {
  'bg-primary': 'text-primary-foreground',
  'bg-success': 'text-primary-foreground',   // vert doux -> blanc OK
  'bg-destructive': 'text-primary-foreground',
  'bg-warning': 'text-warning-foreground',   // ambre clair -> brun fonce
  'bg-muted': 'text-foreground',             // gris clair -> texte fonce
  'bg-secondary': 'text-foreground',
};
function pickIconText(color: string): string {
  return STAT_ICON_TEXT[color] ?? 'text-primary-foreground';
}

export function StatCard({ title, value, subtitle, icon, color = 'bg-primary' }: StatCardProps) {
  const iconText = pickIconText(color);
  return (
    <div className="bg-card text-card-foreground rounded-xl shadow-sm border border-border p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-foreground mt-1 truncate">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        {/* Conteneur d'icone : taille fixe, couleur adaptée pour contraste garanti */}
        <div
          aria-hidden="true"
          className={`shrink-0 flex-none w-14 h-14 min-w-[3.5rem] min-h-[3.5rem] ${color} rounded-xl flex items-center justify-center ${iconText}`}
        >
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
      <div className={`relative bg-card text-card-foreground rounded-none sm:rounded-xl shadow-xl ${sizes[size]} w-full mx-0 sm:mx-4 h-full sm:h-auto max-h-full sm:max-h-[90vh] overflow-auto`}>
        <div className="px-4 sm:px-6 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-card sm:rounded-t-xl">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <button onClick={onClose} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted">
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
    default: 'bg-secondary text-secondary-foreground',
    success: 'bg-success/15 text-success',
    warning: 'bg-warning/15 text-warning',
    danger: 'bg-destructive/15 text-destructive',
    info: 'bg-primary/15 text-primary',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
}

export function EmptyState({ message, icon }: { message: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      {icon && <div className="mb-4 text-muted-foreground/60">{icon}</div>}
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );
}
