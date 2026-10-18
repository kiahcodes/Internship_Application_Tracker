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
