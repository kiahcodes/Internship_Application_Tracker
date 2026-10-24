import { useEffect, useId, useRef } from "react";

const cx = (...parts) => parts.filter(Boolean).join(" ");

export function Button({
  variant = "primary",
  size,
  block,
  loading,
  as: Tag = "button",
  className,
  children,
  disabled,
  ...rest
}) {
  const props = Tag === "button" ? { type: "button", disabled: disabled || loading } : {};
  return (
    <Tag
      className={cx(
        "btn-ui",
        `btn-ui--${variant}`,
        size && `btn-ui--${size}`,
        block && "btn-ui--block",
        className,
      )}
      aria-busy={loading || undefined}
      {...props}
      {...rest}
    >
      {loading && <span className="spinner" aria-hidden="true" />}
      {children}
    </Tag>
  );
}

export function Field({ label, id, className, hint, multiline, ...input }) {
  const Control = multiline ? "textarea" : "input";
  return (
    <div className={cx("field", className)}>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <Control
        id={id}
        className={cx("field-input", multiline && "field-input--area")}
        aria-describedby={hint ? `${id}-hint` : undefined}
        {...input}
      />
      {hint && (
        <span className="field-hint" id={`${id}-hint`}>
          {hint}
        </span>
      )}
    </div>
  );
}

/** A labelled <select>. `options` are strings, or { value, label }. */
export function Select({ label, id, className, hint, options, placeholder, ...input }) {
  return (
    <div className={cx("field", className)}>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <select id={id} className="field-input" aria-describedby={hint ? `${id}-hint` : undefined} {...input}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => {
          const { value, label: text } = typeof o === "string" ? { value: o, label: o } : o;
          return (
            <option key={value} value={value}>
              {text}
            </option>
          );
        })}
      </select>
      {hint && (
        <span className="field-hint" id={`${id}-hint`}>
          {hint}
        </span>
      )}
    </div>
  );
}

export function Alert({ children, onDismiss }) {
  if (!children) return null;
  return (
    <div className="alert-ui" role="alert">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v6M12 16.5v.5" />
      </svg>
      <span className="alert-ui-text">{children}</span>
      {onDismiss && (
        <button type="button" className="alert-ui-close" onClick={onDismiss} aria-label="Dismiss message">
          ×
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon, title, children, action }) {
  return (
    <div className="empty-ui">
      {icon && <div className="empty-ui-icon" aria-hidden="true">{icon}</div>}
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}

export function Skeleton({ width = "100%", height = "1rem", style }) {
  return <span className="skeleton" aria-hidden="true" style={{ width, height, ...style }} />;
}

/** Native <dialog>: focus trap, Esc to close and backdrop come for free. */
export function ConfirmDialog({ open, title, children, confirmLabel = "Confirm", busy, confirmDisabled, onConfirm, onCancel }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className="dialog-ui" aria-labelledby={titleId} onCancel={(e) => { e.preventDefault(); onCancel(); }}>
      <h2 id={titleId}>{title}</h2>
      <div className="dialog-ui-body">{children}</div>
      <div className="dialog-ui-actions">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button variant="danger" loading={busy} disabled={confirmDisabled} onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </dialog>
  );
}

/** A popup for reading or editing, not for confirming. Esc, the × button and a click outside all close it. */
export function Modal({ open, title, onClose, children }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog-ui modal-ui"
      aria-labelledby={titleId}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
    >
      <div className="modal-ui-inner">
        <header className="modal-ui-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="modal-ui-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        {open && children}
      </div>
    </dialog>
  );
}

/** Previous / numbered / next. Renders nothing when there is only one page. */
export function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  const shown = [...new Set([1, page - 1, page, page + 1, pages])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  return (
    <nav className="pager" aria-label="Pages">
      <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Previous
      </Button>
      <ul className="pager-list">
        {shown.map((n, i) => (
          <li key={n}>
            {i > 0 && n - shown[i - 1] > 1 && <span className="pager-gap" aria-hidden="true">…</span>}
            <button
              type="button"
              className="pager-num"
              aria-current={n === page ? "page" : undefined}
              aria-label={`Page ${n}`}
              onClick={() => onChange(n)}
            >
              {n}
            </button>
          </li>
        ))}
      </ul>
      <Button variant="ghost" size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        Next
      </Button>
    </nav>
  );
}
