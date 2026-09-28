import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Filter,
  Info,
  Package,
  RotateCcw,
  Search,
  UserCheck,
  X,
  XCircle,
} from 'lucide-react';
import {
  BorrowStatus,
  LendingType,
  ModerationStatus,
  Resource,
  ResourceType,
  TaxonomyData,
} from '../../types';
import { formatBytes, formatDateShort } from '../../api';

// 1. BUTTON
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center gap-1.5 font-medium rounded transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1F5E46] disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-[#1F5E46] hover:bg-[#174936] text-white border border-transparent',
    secondary: 'bg-white hover:bg-[#F7F7F5] text-[#171717] border border-[#E4E4E0]',
    danger: 'bg-[#B42318] hover:bg-[#911B12] text-white border border-transparent',
    ghost: 'bg-transparent hover:bg-[#F0EFEA] text-[#171717] border border-transparent',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs min-h-[32px]',
    md: 'px-4 py-2 text-xs sm:text-sm min-h-[38px]',
    lg: 'px-5 py-2.5 text-sm min-h-[42px]',
  };

  return (
    <button
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && (
        <span
          className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
};

// 2. INPUT
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  id,
  className = '',
  ...props
}) => {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-[#171717]">
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={Boolean(error)}
        className={`w-full px-3 py-2 text-xs sm:text-sm bg-white border rounded text-[#171717] placeholder:text-[#666666] focus:outline-none focus:border-[#1F5E46] focus-visible:ring-1 focus-visible:ring-[#1F5E46] ${
          error ? 'border-[#B42318]' : 'border-[#E4E4E0]'
        } ${className}`}
        {...props}
      />
      {error && (
        <p role="alert" className="text-[11px] text-[#B42318] flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{error}</span>
        </p>
      )}
      {!error && helperText && <p className="text-[11px] text-[#666666]">{helperText}</p>}
    </div>
  );
};

// 3. SELECT
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options?: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  id,
  children,
  className = '',
  ...props
}) => {
  const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-semibold text-[#171717]">
          {label}
        </label>
      )}
      <select
        id={selectId}
        aria-invalid={Boolean(error)}
        className={`w-full px-2.5 py-2 text-xs bg-white border rounded text-[#171717] focus:outline-none focus:border-[#1F5E46] focus-visible:ring-1 focus-visible:ring-[#1F5E46] ${
          error ? 'border-[#B42318]' : 'border-[#E4E4E0]'
        } ${className}`}
        {...props}
      >
        {options
          ? options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))
          : children}
      </select>
      {error && (
        <p role="alert" className="text-[11px] text-[#B42318]">
          {error}
        </p>
      )}
    </div>
  );
};

// 4. MODAL
export interface ModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidthClass?: string;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  title,
  subtitle,
  onClose,
  children,
  maxWidthClass = 'max-w-lg',
}) => {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={`bg-white border border-[#E4E4E0] rounded-md w-full ${maxWidthClass} overflow-hidden transition-opacity duration-150`}
      >
        <div className="px-5 py-4 border-b border-[#E4E4E0] flex items-center justify-between bg-[#F7F7F5]">
          <div>
            <h2 id="modal-title" className="text-base font-semibold text-[#171717]">
              {title}
            </h2>
            {subtitle && <p className="text-xs text-[#666666] mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-[#666666] hover:text-[#171717] rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

// 5. TOAST
export interface ToastProps {
  message: string;
  variant?: 'success' | 'error' | 'info';
  onDismiss?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, variant = 'info', onDismiss }) => {
  if (!message) return null;
  const styles = {
    success: 'bg-[#EBF5F0] border-[#B8DFCA] text-[#16794A]',
    error: 'bg-[#FDF2F2] border-[#F5C2C0] text-[#B42318]',
    info: 'bg-[#F7F7F5] border-[#E4E4E0] text-[#171717]',
  };
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center justify-between gap-3 px-4 py-2.5 border rounded text-xs font-medium ${styles[variant]}`}
    >
      <div className="flex items-center gap-2">
        {variant === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
        {variant === 'error' && <AlertCircle className="w-4 h-4 shrink-0" />}
        {variant === 'info' && <Info className="w-4 h-4 shrink-0" />}
        <span>{message}</span>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="p-0.5 hover:opacity-75 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

// 6. CARD
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  interactive = false,
  className = '',
  children,
  ...props
}) => (
  <div
    className={`bg-white border border-[#E4E4E0] rounded-md p-4 ${
      interactive ? 'hover:border-[#1F5E46] transition-colors cursor-pointer' : ''
    } ${className}`}
    {...props}
  >
    {children}
  </div>
);

// 7. BADGE
export interface BadgeProps {
  children: React.ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
}

export const Badge: React.FC<BadgeProps> = ({ children, tone = 'neutral' }) => {
  const tones = {
    neutral: 'text-[#666666]',
    success: 'text-[#16794A]',
    warning: 'text-[#A16207]',
    danger: 'text-[#B42318]',
  };
  return (
    <span className={`font-mono text-[11px] font-medium tabular-nums ${tones[tone]}`}>
      {children}
    </span>
  );
};

// 8. DROPDOWN
export interface DropdownItem {
  id: string;
  label: string;
  onClick: () => void;
}

export const Dropdown: React.FC<{ label: string; items: DropdownItem[] }> = ({
  label,
  items,
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-[#E4E4E0] rounded text-[#171717] hover:bg-[#F7F7F5] cursor-pointer"
      >
        <span>{label}</span>
        <ChevronDown className="w-3.5 h-3.5 text-[#666666]" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-44 bg-white border border-[#E4E4E0] rounded-md py-1 z-30">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              className="w-full text-left px-3 py-1.5 text-xs text-[#171717] hover:bg-[#F7F7F5] cursor-pointer"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// 9. PAGINATION
export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <nav
      aria-label="Catalog pagination"
      className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-[#E4E4E0] rounded-md px-4 py-3 text-xs"
    >
      <span className="text-[#666666] font-mono tabular-nums">
        Showing {startItem}–{endItem} of {totalItems} resources
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-[#E4E4E0] rounded text-[#171717] hover:bg-[#F7F7F5] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Previous</span>
        </button>
        <span className="px-3 py-1.5 font-mono text-[#171717] tabular-nums">
          Page {currentPage} of {totalPages}
        </span>
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-[#E4E4E0] rounded text-[#171717] hover:bg-[#F7F7F5] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </nav>
  );
};

// 10. SEARCHBAR
export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search by title, subject (e.g. math, operating systems), course code, or category...',
}) => (
  <div className="relative">
    <label htmlFor="catalog-search-input" className="sr-only">
      Search campus resources
    </label>
    <Search className="w-4 h-4 text-[#666666] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
    <input
      id="catalog-search-input"
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={120}
      className="w-full pl-10 pr-20 py-2.5 text-sm bg-[#F7F7F5] border border-[#E4E4E0] rounded text-[#171717] placeholder:text-[#666666] focus:outline-none focus:bg-white focus:border-[#1F5E46]"
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange('')}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[#666666] hover:text-[#171717] cursor-pointer"
      >
        Clear
      </button>
    )}
  </div>
);

// 11. RESOURCE STATUS (Never uses color alone; always pairs semantic icon + explicit label)
export const ResourceStatus: React.FC<{ status: BorrowStatus }> = ({ status }) => {
  switch (status) {
    case BorrowStatus.AVAILABLE:
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-[#16794A]">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>AVAILABLE</span>
        </span>
      );
    case BorrowStatus.REQUESTED:
    case BorrowStatus.APPROVED:
    case BorrowStatus.RETURN_REQUESTED:
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-[#A16207]">
          <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{status}</span>
        </span>
      );
    case BorrowStatus.BORROWED:
    case BorrowStatus.OVERDUE:
    case BorrowStatus.UNAVAILABLE:
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-[#B42318]">
          <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{status}</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#666666]">
          <span>{status}</span>
        </span>
      );
  }
};

// 12. RESOURCE CARD (Zero-pill metadata discipline, mobile-friendly, keyboard accessible)
export const ResourceCard: React.FC<{
  resource: Resource;
  onSelect: (resource: Resource) => void;
}> = ({ resource, onSelect }) => (
  <article
    role="button"
    tabIndex={0}
    onClick={() => onSelect(resource)}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(resource);
      }
    }}
    aria-label={`${resource.title} (${resource.courseCode}) - ${resource.availability}`}
    className="bg-white border border-[#E4E4E0] hover:border-[#1F5E46] focus-visible:outline-2 focus-visible:outline-[#1F5E46] rounded-md p-4 flex flex-col justify-between transition-colors duration-150 cursor-pointer"
  >
    <div>
      {/* Top Kicker Row: Unboxed typographic metadata + accessible status */}
      <div className="flex items-center justify-between gap-2 mb-2 text-xs">
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#666666] truncate">
          <span className="tabular-nums">{resource.code}</span>
          <span aria-hidden="true">·</span>
          <span className="font-semibold text-[#1F5E46]">{resource.courseCode}</span>
          {resource.moderationStatus !== ModerationStatus.APPROVED && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-[#A16207] font-semibold">{resource.moderationStatus}</span>
            </>
          )}
        </div>
        <ResourceStatus status={resource.availability} />
      </div>

      <h3 className="text-sm sm:text-base font-semibold text-[#171717] leading-snug mb-1.5">
        {resource.title}
      </h3>
      <p className="text-xs text-[#666666] line-clamp-2 leading-relaxed mb-3">
        {resource.description}
      </p>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#666666] pt-2 border-t border-[#E4E4E0]">
        <span className="font-medium text-[#171717]">{resource.category}</span>
        <span aria-hidden="true">·</span>
        <span className="font-mono tabular-nums">Sem {resource.semester}</span>
        <span aria-hidden="true">·</span>
        <span className="truncate max-w-[200px]">{resource.subject}</span>
      </div>
    </div>

    <div className="mt-3 pt-2.5 border-t border-[#E4E4E0] flex items-center justify-between gap-2 text-xs">
      <div className="flex items-center gap-1.5 text-[#666666] truncate">
        <UserCheck className="w-3.5 h-3.5 text-[#1F5E46] shrink-0" aria-hidden="true" />
        <span className="truncate">{resource.ownerName}</span>
        <span aria-hidden="true">·</span>
        <span className="font-mono text-[11px] tabular-nums">
          {formatDateShort(resource.createdAt)}
        </span>
      </div>

      <div className="flex items-center gap-1 shrink-0 font-mono text-[11px] font-medium text-[#1F5E46] tabular-nums">
        {resource.resourceType === ResourceType.DIGITAL ? (
          <>
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>DIGITAL ({formatBytes(resource.fileSize)})</span>
          </>
        ) : (
          <>
            <Package className="w-3.5 h-3.5" aria-hidden="true" />
            <span>
              {resource.lendingType} · {resource.condition}
            </span>
          </>
        )}
      </div>
    </div>
  </article>
);

// 13. FILTER PANEL
export interface FilterPanelState {
  q: string;
  department: string;
  semester: string;
  subject: string;
  category: string;
  resourceType: string;
  lendingType: string;
  availableOnly: boolean;
}

export const FilterPanel: React.FC<{
  filters: FilterPanelState;
  taxonomy: TaxonomyData;
  hasActiveFilters: boolean;
  onUpdateFilter: <K extends keyof FilterPanelState>(key: K, value: FilterPanelState[K]) => void;
  onClearFilters: () => void;
}> = ({ filters, taxonomy, hasActiveFilters, onUpdateFilter, onClearFilters }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between pb-2.5 border-b border-[#E4E4E0]">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#171717]">
        <Filter className="w-3.5 h-3.5 text-[#1F5E46]" aria-hidden="true" />
        <span>Catalog Filters</span>
      </div>
      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="inline-flex items-center gap-1 text-xs font-medium text-[#B42318] hover:underline cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" aria-hidden="true" />
          Reset
        </button>
      )}
    </div>

    <label className="flex items-center justify-between p-2.5 bg-[#F7F7F5] border border-[#E4E4E0] rounded cursor-pointer">
      <span className="text-xs font-medium text-[#171717]">Available resources only</span>
      <input
        type="checkbox"
        checked={filters.availableOnly}
        onChange={(e) => onUpdateFilter('availableOnly', e.target.checked)}
        className="w-4 h-4 accent-[#1F5E46] rounded cursor-pointer"
      />
    </label>

    <Select
      label="Resource Format"
      value={filters.resourceType}
      onChange={(e) => onUpdateFilter('resourceType', e.target.value)}
    >
      <option value="">All formats (Physical & Digital)</option>
      <option value={ResourceType.PHYSICAL}>Physical Equipment / Books</option>
      <option value={ResourceType.DIGITAL}>Digital Files / Notes</option>
    </Select>

    <Select
      label="Exchange Type"
      value={filters.lendingType}
      onChange={(e) => onUpdateFilter('lendingType', e.target.value)}
    >
      <option value="">All exchange types</option>
      <option value={LendingType.BORROW}>Temporary Borrow</option>
      <option value={LendingType.GIVEAWAY}>Free Giveaway / Transfer</option>
      <option value={LendingType.DIGITAL_DOWNLOAD}>Digital Download</option>
    </Select>

    <Select
      label="Category"
      value={filters.category}
      onChange={(e) => onUpdateFilter('category', e.target.value)}
    >
      <option value="">All categories</option>
      {taxonomy.categories.map((c) => (
        <option key={c.id} value={c.name}>
          {c.name}
        </option>
      ))}
    </Select>

    <Select
      label="Department"
      value={filters.department}
      onChange={(e) => onUpdateFilter('department', e.target.value)}
    >
      <option value="">All departments</option>
      {taxonomy.departments.map((d) => (
        <option key={d.id} value={d.name}>
          {d.code} - {d.name}
        </option>
      ))}
    </Select>

    <Select
      label="Semester"
      value={filters.semester}
      onChange={(e) => onUpdateFilter('semester', e.target.value)}
    >
      <option value="">All semesters (1 to 8)</option>
      {taxonomy.semesters.map((s) => (
        <option key={s.id} value={String(s.id)}>
          {s.label}
        </option>
      ))}
    </Select>

    <Select
      label="Subject"
      value={filters.subject}
      onChange={(e) => onUpdateFilter('subject', e.target.value)}
    >
      <option value="">All subjects</option>
      {taxonomy.subjects.map((sub) => (
        <option key={sub.id} value={sub.name}>
          {sub.courseCode} - {sub.name}
        </option>
      ))}
    </Select>
  </div>
);

// 14. EMPTY STATE (Section 70 - "No resources found" / "Try another search or list a resource for others.")
export interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No resources found',
  description = 'Try another search or list a resource for others.',
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}) => (
  <div className="bg-white border border-[#E4E4E0] rounded-md p-10 text-center space-y-3">
    <p className="text-sm font-semibold text-[#171717]">{title}</p>
    <p className="text-xs text-[#666666] max-w-md mx-auto leading-relaxed">{description}</p>
    {(actionLabel || secondaryActionLabel) && (
      <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
        {actionLabel && onAction && (
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <Button variant="secondary" size="sm" onClick={onSecondaryAction}>
            {secondaryActionLabel}
          </Button>
        )}
      </div>
    )}
  </div>
);

// 15. ERROR STATE (Section 71 - Handles network failure, unauthorized, forbidden, not found, validation, server error, file upload, timeout, rate limit)
export interface ErrorStateProps {
  code?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  code = 'ERROR',
  message = 'Unable to complete the request. Please verify your connection and try again.',
  onRetry,
}) => (
  <div
    role="alert"
    className="bg-[#FDF2F2] border border-[#F5C2C0] rounded-md p-6 text-center space-y-3"
  >
    <div className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[#B42318]">
      <AlertCircle className="w-4 h-4" aria-hidden="true" />
      <span>{code}</span>
    </div>
    <p className="text-xs text-[#171717] max-w-md mx-auto leading-relaxed">{message}</p>
    {onRetry && (
      <div>
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </div>
    )}
  </div>
);

// 16. LOADING STATE (Section 72 - Subtle skeleton placeholders)
export const LoadingState: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div
    aria-busy="true"
    aria-label="Loading resources"
    className="grid grid-cols-1 md:grid-cols-2 gap-4"
  >
    {Array.from({ length: count }).map((_, idx) => (
      <div
        key={idx}
        className="bg-white border border-[#E4E4E0] rounded-md p-4 space-y-3 animate-pulse"
      >
        <div className="flex items-center justify-between">
          <div className="h-3.5 w-28 bg-[#E4E4E0] rounded" />
          <div className="h-3.5 w-20 bg-[#E4E4E0] rounded" />
        </div>
        <div className="h-4 w-3/4 bg-[#E4E4E0] rounded" />
        <div className="h-3 w-full bg-[#F0EFEA] rounded" />
        <div className="h-3 w-2/3 bg-[#F0EFEA] rounded" />
        <div className="pt-3 border-t border-[#E4E4E0] flex justify-between">
          <div className="h-3 w-24 bg-[#F0EFEA] rounded" />
          <div className="h-3 w-16 bg-[#F0EFEA] rounded" />
        </div>
      </div>
    ))}
  </div>
);

// 17. CONFIRM DIALOG
export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}) => (
  <Modal open={open} title={title} onClose={onCancel} maxWidthClass="max-w-md">
    <div className="space-y-4">
      <p className="text-xs text-[#666666] leading-relaxed">{description}</p>
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E4E4E0]">
        <Button variant="secondary" size="sm" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} size="sm" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  </Modal>
);
