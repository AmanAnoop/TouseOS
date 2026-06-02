import * as React from "react";
import { cn } from "@/lib/utils";

/* ── Button ─────────────────────────────────────────────── */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing/50 disabled:pointer-events-none disabled:opacity-50";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-racing text-white hover:bg-gold hover:text-navy active:bg-gold-700 shadow-sm",
  secondary: "bg-white text-navy hover:bg-parchment border border-border",
  ghost: "text-navy hover:bg-parchment/80",
  danger: "bg-[#8B2020] text-white hover:bg-[#6B1818]",
  outline: "border-2 border-navy text-navy bg-transparent hover:bg-navy hover:text-white",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-9 px-4 text-sm",
  lg: "h-10 px-6 text-base",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, icon, children, className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonBase, buttonVariants[variant], buttonSizes[size], className)}
      disabled={props.disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      ) : icon}
      {children}
    </button>
  ),
);
Button.displayName = "Button";

/* ── Badge ──────────────────────────────────────────────── */
type BadgeColor =
  | "green" | "red" | "yellow" | "blue" | "purple"
  | "orange" | "gray" | "emerald" | "pink" | "indigo" | "gold";

interface BadgeProps {
  label: string;
  color?: BadgeColor;
  dot?: boolean;
  className?: string;
}

const badgeColors: Record<BadgeColor, string> = {
  green: "bg-racing-50 text-racing border border-racing/20",
  red: "bg-red-50 text-[#8B2020] border border-red-200/80",
  yellow: "bg-gold-50 text-navy border border-gold/30",
  blue: "bg-navy-50 text-navy border border-navy/10",
  purple: "bg-purple-50 text-purple-900 border border-purple-200/60",
  orange: "bg-orange-50 text-orange-900 border border-orange-200/60",
  gray: "bg-parchment text-muted-foreground border border-border",
  emerald: "bg-racing-50 text-racing border border-racing/20",
  pink: "bg-pink-50 text-pink-900 border border-pink-200/60",
  indigo: "bg-indigo-50 text-indigo-900 border border-indigo-200/60",
  gold: "bg-gold text-navy font-semibold border border-gold-700/30",
};

export function Badge({ label, color = "gray", dot, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        badgeColors[color],
        className,
      )}
    >
      {dot && (
        <span className={cn("h-1.5 w-1.5 rounded-full", {
          "bg-green-500": color === "green" || color === "emerald",
          "bg-red-500": color === "red",
          "bg-yellow-500": color === "yellow",
          "bg-blue-500": color === "blue" || color === "indigo",
          "bg-purple-500": color === "purple",
          "bg-gray-400": color === "gray",
        })} />
      )}
      {label}
    </span>
  );
}

/* ── Card ───────────────────────────────────────────────── */
interface CardProps {
  className?: string;
  children: React.ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
  onClick?: () => void;
}

export function Card({ className, children, padding = "md", onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-lg border border-border bg-white shadow-regal",
        onClick && "cursor-pointer",
        padding === "none" ? "" :
        padding === "sm" ? "p-4" :
        padding === "md" ? "p-5" : "p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function CardHeader({ title, description, action, icon, className }: CardHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 mb-4", className)}>
      <div className="flex items-start gap-3">
        {icon && (
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-racing-50 flex items-center justify-center text-racing">
            {icon}
          </div>
        )}
        <div>
          <h3 className="font-display text-lg font-semibold text-navy">{title}</h3>
          {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

/* ── Input ──────────────────────────────────────────────── */
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, trailing, className, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-foreground">
          {label}
          {props.required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <span className="pointer-events-none absolute left-3 text-muted-foreground">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={cn(
            "flex h-9 w-full rounded-lg border border-border/80 bg-white px-3 py-2 text-sm text-navy",
            "placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-racing/40 focus:border-racing/30",
            "disabled:cursor-not-allowed disabled:opacity-50",
            icon && "pl-9",
            trailing && "pr-9",
            error && "border-destructive focus:ring-destructive/40",
            className,
          )}
          {...props}
        />
        {trailing && (
          <span className="absolute right-3 text-muted-foreground">{trailing}</span>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  ),
);
Input.displayName = "Input";

/* ── Textarea ───────────────────────────────────────────── */
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-foreground">
          {label}
          {props.required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-[80px] w-full rounded-lg border border-border/80 bg-white px-3 py-2 text-sm text-navy",
          "placeholder:text-muted-foreground resize-none",
          "focus:outline-none focus:ring-2 focus:ring-racing/40 focus:border-racing/30",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-red-500 focus:ring-red-500",
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  ),
);
Textarea.displayName = "Textarea";

/* ── Select ─────────────────────────────────────────────── */
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-foreground">{label}</label>
      )}
      <select
        ref={ref}
        className={cn(
          "flex h-9 w-full rounded-lg border border-border/80 bg-white px-3 py-2 text-sm text-navy",
          "focus:outline-none focus:ring-2 focus:ring-racing/40 focus:border-racing/30",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-destructive",
          className,
        )}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  ),
);
Select.displayName = "Select";

/* ── Avatar ─────────────────────────────────────────────── */
interface AvatarProps {
  name: string;
  src?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const avatarSizes = { xs: "w-6 h-6 text-xs", sm: "w-8 h-8 text-sm", md: "w-10 h-10 text-base", lg: "w-12 h-12 text-lg", xl: "w-16 h-16 text-xl" };

const avatarColors = [
  "bg-red-100 text-red-700", "bg-orange-100 text-orange-700",
  "bg-amber-100 text-amber-700", "bg-green-100 text-green-700",
  "bg-teal-100 text-teal-700", "bg-blue-100 text-blue-700",
  "bg-indigo-100 text-indigo-700", "bg-purple-100 text-purple-700",
  "bg-pink-100 text-pink-700",
];

function nameColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return avatarColors[Math.abs(h) % avatarColors.length];
}

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const initStr = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn("rounded-full object-cover flex-shrink-0", avatarSizes[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-semibold flex-shrink-0",
        avatarSizes[size],
        nameColor(name),
        className,
      )}
    >
      {initStr}
    </div>
  );
}

/* ── Skeleton ───────────────────────────────────────────── */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-surface-2", className)}
    />
  );
}

/* ── Stat Card ──────────────────────────────────────────── */
interface StatCardProps {
  title: string;
  value: string | number;
  delta?: string;
  deltaType?: "up" | "down" | "neutral";
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({ title, value, delta, deltaType = "neutral", icon, className }: StatCardProps) {
  return (
    <div className={cn("regal-stat-card flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between">
        <p className="stat-label">{title}</p>
        {icon && <div className="text-gold/80">{icon}</div>}
      </div>
      <p className="stat-value">{value}</p>
      {delta && (
        <p
          className={cn("text-xs font-medium", {
            "text-gold": deltaType === "up",
            "text-red-300": deltaType === "down",
            "text-white/50": deltaType === "neutral",
          })}
        >
          {delta}
        </p>
      )}
    </div>
  );
}

/* ── Table ──────────────────────────────────────────────── */
interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface TableProps<T extends Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  selectedRowIndex?: number;
  emptyMessage?: string;
  loading?: boolean;
}

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
  selectedRowIndex,
  emptyMessage = "No records found.",
  loading,
}: TableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-white shadow-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-navy text-white">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider first:rounded-tl-lg last:rounded-tr-lg",
                  col.className,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <tr key={i} className="border-b border-border bg-white">
                {columns.map((col) => (
                  <td key={col.key} className="py-3 px-4">
                    <Skeleton className="h-4 w-full" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center text-muted-foreground bg-white">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={i}
                className={cn(
                  "border-b border-border last:border-0 transition-colors bg-white",
                  selectedRowIndex === i && "border-l-4 border-l-gold bg-gold-50/40",
                  onRowClick && "cursor-pointer hover:bg-parchment",
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn("py-3 px-4", col.className)}>
                    {col.render ? col.render(row) : String(row[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ── Modal ──────────────────────────────────────────────── */
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

const modalSizes = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg", xl: "max-w-2xl" };

export function Modal({ open, onClose, title, description, children, footer, size = "md" }: ModalProps) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-navy/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 w-full bg-card border border-border rounded-xl shadow-card-lg",
          "animate-slide-up",
          modalSizes[size],
        )}
      >
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-display text-xl font-semibold text-navy">{title}</h2>
            {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground rounded-md p-1 -mr-1"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5 overflow-y-auto max-h-[70vh]">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Empty State ────────────────────────────────────────── */
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 text-center gap-3", className)}>
      {icon && (
        <div className="w-12 h-12 rounded-full bg-surface-1 flex items-center justify-center text-muted-foreground">
          {icon}
        </div>
      )}
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/* ── Progress Bar ───────────────────────────────────────── */
interface ProgressBarProps {
  value: number;
  max?: number;
  color?: "green" | "blue" | "yellow" | "red" | "purple";
  size?: "sm" | "md";
  label?: string;
  className?: string;
}

const progressColors = {
  green: "bg-racing",
  blue: "bg-navy",
  yellow: "bg-gold",
  red: "bg-[#8B2020]",
  purple: "bg-purple-600",
};

export function ProgressBar({ value, max = 100, color = "green", size = "sm", label, className }: ProgressBarProps) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{label}</span>
          <span>{pct}%</span>
        </div>
      )}
      <div className={cn("w-full rounded-full bg-surface-2", size === "sm" ? "h-1.5" : "h-2.5")}>
        <div
          className={cn("h-full rounded-full transition-all", progressColors[color])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ── Tabs ───────────────────────────────────────────────── */
interface TabsProps {
  tabs: Array<{ id: string; label: string; count?: number }>;
  active: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, active, onChange, className }: TabsProps) {
  return (
    <div className={cn("flex gap-1 border-b border-border", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors",
            "border-b-2 -mb-px",
            active === tab.id
              ? "border-racing text-racing"
              : "border-transparent text-muted-foreground hover:text-navy",
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={cn(
              "text-xs rounded-full px-1.5 py-0.5",
              active === tab.id ? "bg-racing-50 text-racing" : "bg-parchment text-muted-foreground",
            )}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ── Search Input ───────────────────────────────────────── */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full h-9 pl-9 pr-4 rounded-lg border border-border/80 bg-white text-sm text-navy",
          "placeholder:text-muted-foreground",
          "focus:outline-none focus:ring-2 focus:ring-racing/40 focus:border-racing/30",
        )}
      />
    </div>
  );
}

/* ── Page Header ────────────────────────────────────────── */
interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  breadcrumb?: string;
  className?: string;
}

export function PageHeader({ title, description, action, breadcrumb, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 pb-4", className)}>
      <div>
        {breadcrumb && (
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            {breadcrumb}
          </p>
        )}
        <h1 className="font-display text-2xl font-semibold text-navy tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

/* ── Loading Spinner ────────────────────────────────────── */
export function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  return (
    <svg
      className={cn("animate-spin text-racing", {
        "w-4 h-4": size === "sm",
        "w-6 h-6": size === "md",
        "w-8 h-8": size === "lg",
      })}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

/* ── Alert / Notice ─────────────────────────────────────── */
interface AlertProps {
  type?: "info" | "success" | "warning" | "error";
  title: string;
  description?: string;
  className?: string;
}

const alertStyles: Record<string, string> = {
  info: "bg-navy-50 border-navy/20 text-navy",
  success: "bg-racing-50 border-racing/25 text-racing",
  warning: "bg-gold-50 border-gold/40 text-navy",
  error: "bg-red-50 border-[#8B2020]/30 text-[#8B2020]",
};

export function Alert({ type = "info", title, description, className }: AlertProps) {
  return (
    <div className={cn("rounded-lg border p-4", alertStyles[type], className)}>
      <p className="font-medium text-sm">{title}</p>
      {description && <p className="text-sm mt-1 opacity-80">{description}</p>}
    </div>
  );
}
