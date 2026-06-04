import * as React from "react";
import NextImage from "next/image";
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

const btnVariantClass: Record<ButtonVariant, string> = {
  primary: "ds-btn-primary",
  secondary: "ds-btn-secondary",
  ghost: "ds-btn-ghost",
  danger: "ds-btn-danger",
  outline: "ds-btn-secondary",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, icon, children, className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "ds-btn",
        btnVariantClass[variant],
        size === "sm" && "h-8 text-xs",
        size === "lg" && "h-11 px-24",
        className,
      )}
      disabled={props.disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="ds-skeleton" style={{ width: 16, height: 16, borderRadius: "50%" }} aria-hidden />
      ) : (
        icon
      )}
      {children}
    </button>
  ),
);
Button.displayName = "Button";

/* ── Badge ──────────────────────────────────────────────── */
type BadgeColor =
  | "green" | "red" | "yellow" | "blue" | "purple"
  | "orange" | "gray" | "emerald" | "pink" | "indigo";

interface BadgeProps {
  label: string;
  color?: BadgeColor;
  dot?: boolean;
  className?: string;
}

const badgeClass: Record<BadgeColor, string> = {
  green: "ds-badge-paid",
  emerald: "ds-badge-paid",
  red: "ds-badge-error",
  yellow: "ds-badge-unpaid",
  orange: "ds-badge-unpaid",
  blue: "ds-badge-new",
  indigo: "ds-badge-new",
  purple: "ds-badge-active",
  pink: "ds-badge-neutral",
  gray: "ds-badge-inactive",
};

export function Badge({ label, color = "gray", dot, className }: BadgeProps) {
  return (
    <span className={cn("ds-badge", badgeClass[color], className)}>
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "currentColor",
            marginRight: 4,
          }}
          aria-hidden
        />
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
  const pad =
    padding === "none" ? { padding: 0 } :
    padding === "sm" ? { padding: "16px" } :
    padding === "lg" ? { padding: "24px 32px" } : undefined;

  return (
    <div
      onClick={onClick}
      className={cn("ds-card", onClick && "cursor-pointer", className)}
      style={pad}
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
    <div className={cn("flex items-start justify-between gap-16", className)} style={{ marginBottom: icon ? 12 : 0 }}>
      <div className="flex items-start gap-12" style={{ gap: 12 }}>
        {icon && (
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 6,
              background: "var(--color-bg-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-text-secondary)",
            }}
          >
            {icon}
          </div>
        )}
        <div>
          <div className="ds-card-header" style={{ marginBottom: description ? 4 : 0, paddingBottom: description ? 8 : 12 }}>
            {title}
          </div>
          {description && <p className="type-small" style={{ margin: 0 }}>{description}</p>}
        </div>
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
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
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && (
        <label className="ds-label">
          {label}
          {props.required && <span style={{ color: "var(--color-error)", marginLeft: 4 }}>*</span>}
        </label>
      )}
      <div style={{ position: "relative" }}>
        {icon && (
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-tertiary)" }}>
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={cn("ds-input", className)}
          style={{ paddingLeft: icon ? 36 : undefined, paddingRight: trailing ? 36 : undefined, minHeight: 44 }}
          {...props}
        />
        {trailing && (
          <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-tertiary)" }}>
            {trailing}
          </span>
        )}
      </div>
      {error && <p className="type-small" style={{ color: "var(--color-error)", margin: 0 }}>{error}</p>}
      {hint && !error && <p className="type-small" style={{ margin: 0 }}>{hint}</p>}
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
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && (
        <label className="ds-label">
          {label}
          {props.required && <span style={{ color: "var(--color-error)", marginLeft: 4 }}>*</span>}
        </label>
      )}
      <textarea ref={ref} className={cn("ds-input ds-textarea", className)} {...props} />
      {error && <p className="type-small" style={{ color: "var(--color-error)", margin: 0 }}>{error}</p>}
      {hint && !error && <p className="type-small" style={{ margin: 0 }}>{hint}</p>}
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
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <label className="ds-label">{label}</label>}
      <select ref={ref} className={cn("ds-input ds-select", className)} style={{ minHeight: 44 }} {...props}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="type-small" style={{ color: "var(--color-error)", margin: 0 }}>{error}</p>}
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

const avatarSizes = { xs: 24, sm: 32, md: 40, lg: 48, xl: 64 };

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const px = avatarSizes[size];
  const initStr = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  if (src) {
    return (
      <NextImage
        src={src}
        alt={name.trim() || "User avatar"}
        width={px}
        height={px}
        unoptimized
        className={cn(className)}
        style={{ width: px, height: px, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      />
    );
  }

  return (
    <div
      className={className}
      style={{
        width: px,
        height: px,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: px * 0.35,
        fontWeight: 600,
        flexShrink: 0,
        background: "color-mix(in srgb, var(--color-org-primary) 15%, var(--color-bg-subtle))",
        color: "var(--color-org-primary)",
      }}
    >
      {initStr}
    </div>
  );
}

/* ── Skeleton ───────────────────────────────────────────── */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("ds-skeleton", className)} aria-hidden />;
}

/* ── Stat Card ──────────────────────────────────────────── */
interface StatCardProps {
  title: string;
  value: string | number;
  delta?: string;
  deltaType?: "up" | "down" | "neutral";
  icon?: React.ReactNode;
  className?: string;
  accent?: boolean;
}

export function StatCard({ title, value, delta, deltaType = "neutral", icon, className, accent }: StatCardProps) {
  const trendColor =
    deltaType === "up" ? "var(--color-success)" :
    deltaType === "down" ? "var(--color-error)" :
    "var(--color-text-secondary";

  return (
    <div className={cn("ds-stat-card", accent && "ds-stat-card-accent", className)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <p className="ds-stat-label">{title}</p>
        {icon && <span style={{ color: "var(--color-text-tertiary)" }}>{icon}</span>}
      </div>
      <p className="ds-stat-value">{value}</p>
      {delta && (
        <span
          className="ds-badge"
          style={{
            marginTop: 8,
            background: "var(--color-bg-subtle)",
            color: trendColor,
          }}
        >
          {delta}
        </span>
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
  numeric?: boolean;
}

interface TableProps<T extends Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  loading?: boolean;
}

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
  emptyMessage = "No records found.",
  loading,
}: TableProps<T>) {
  return (
    <div className="ds-table-wrap">
      <table className="ds-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={col.numeric ? "text-right" : undefined} style={col.numeric ? { textAlign: "right" } : undefined}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <tr key={i}>
                {columns.map((col) => (
                  <td key={col.key}>
                    <Skeleton className="h-4 w-full" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: "center", padding: 48, color: "var(--color-text-secondary)" }}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={i}
                style={{ cursor: onRowClick ? "pointer" : undefined }}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td key={col.key} className={col.numeric ? "ds-td-num" : undefined}>
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

const modalMax: Record<string, string> = {
  sm: "400px",
  md: "520px",
  lg: "640px",
  xl: "720px",
};

export function Modal({ open, onClose, title, description, children, footer, size = "md" }: ModalProps) {
  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="ds-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={onClose}>
      <div className="ds-modal-panel" style={{ maxWidth: modalMax[size] }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", gap: 16 }}>
          <div>
            <h2 id="modal-title" className="type-h2" style={{ margin: 0 }}>{title}</h2>
            {description && <p className="type-small" style={{ margin: "8px 0 0" }}>{description}</p>}
          </div>
          <button type="button" className="ds-btn ds-btn-ghost ds-btn-icon" onClick={onClose} aria-label="Close dialog">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div style={{ padding: "20px 24px", maxHeight: "70vh", overflowY: "auto" }}>{children}</div>
        {footer && (
          <div style={{ padding: "16px 24px", borderTop: "1px solid var(--color-border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
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
    <div className={cn("ds-empty", className)}>
      {icon && <div className="ds-empty-icon">{icon}</div>}
      <h3 className="ds-empty-title">{title}</h3>
      {description && <p className="ds-empty-desc">{description}</p>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
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

export function ProgressBar({ value, max = 100, size = "sm", label, className }: ProgressBarProps) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && (
        <div className="type-small" style={{ display: "flex", justifyContent: "space-between" }}>
          <span>{label}</span>
          <span className="type-mono">{pct}%</span>
        </div>
      )}
      <div style={{ height: size === "sm" ? 6 : 10, borderRadius: 4, background: "var(--color-bg-subtle)", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: 4,
            background: "var(--color-org-primary)",
            transition: "width 120ms ease",
          }}
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
    <div className={className} style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--color-border)" }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 12px",
            marginBottom: -1,
            fontSize: 13,
            fontWeight: 500,
            background: "none",
            border: "none",
            borderBottom: active === tab.id ? "2px solid var(--color-org-primary)" : "2px solid transparent",
            color: active === tab.id ? "var(--color-org-primary)" : "var(--color-text-secondary)",
            cursor: "pointer",
            transition: "color 120ms ease, border-color 120ms ease",
          }}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="ds-badge ds-badge-inactive">{tab.count}</span>
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
    <div className={className} style={{ position: "relative" }}>
      <svg
        style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-tertiary)" }}
        width={16}
        height={16}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="ds-input"
        style={{ paddingLeft: 36, minHeight: 44 }}
        aria-label={placeholder}
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
  orgLabel?: string;
  className?: string;
}

export function PageHeader({ title, description, action, breadcrumb, orgLabel, className }: PageHeaderProps) {
  return (
    <header className={cn("ds-page-header", className)}>
      <div>
        {breadcrumb && <p className="type-small" style={{ margin: "0 0 8px" }}>{breadcrumb}</p>}
        {orgLabel && <p className="ds-page-header-org">{orgLabel}</p>}
        <h1 className="type-h1" style={{ margin: 0 }}>{title}</h1>
        {description && <p className="type-body" style={{ margin: "8px 0 0", color: "var(--color-text-secondary)" }}>{description}</p>}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </header>
  );
}

/** @deprecated Use Skeleton for loading states */
export function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const px = size === "sm" ? 16 : size === "lg" ? 32 : 24;
  return (
    <span
      className="ds-skeleton"
      style={{ width: px, height: px, borderRadius: "50%", display: "inline-block" }}
      role="status"
      aria-label="Loading"
    />
  );
}

/* ── Alert ──────────────────────────────────────────────── */
interface AlertProps {
  type?: "info" | "success" | "warning" | "error";
  title: string;
  description?: string;
  className?: string;
}

const alertTypeClass: Record<string, string> = {
  info: "ds-alert-info",
  success: "ds-alert-success",
  warning: "ds-alert-warning",
  error: "ds-alert-error",
};

export function Alert({ type = "info", title, description, className }: AlertProps) {
  return (
    <div className={cn("ds-alert", alertTypeClass[type], className)} role="alert">
      <p className="type-h2" style={{ margin: 0, fontSize: 14 }}>{title}</p>
      {description && <p className="type-small" style={{ margin: "8px 0 0" }}>{description}</p>}
    </div>
  );
}
