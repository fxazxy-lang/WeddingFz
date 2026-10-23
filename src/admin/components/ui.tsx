import { type ReactNode, useEffect, useRef } from 'react';
import type { GuestStatus, WishStatus } from '../../../shared/constants';
import { useAdminI18n } from '../i18n';

/* ---------- Status badges ---------- */

export function StatusBadge({ status }: { status: GuestStatus }) {
  const { t } = useAdminI18n();
  return <span className={`badge badge--${status}`}>{t.status[status]}</span>;
}

export function WishBadge({ status }: { status: WishStatus }) {
  const { t } = useAdminI18n();
  return <span className={`badge badge--${status}`}>{t.wishStatus[status]}</span>;
}

/* ---------- Modal dialog built on <dialog> (focus trap + Esc for free) ---------- */

interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg';
}

export function Dialog({ open, title, onClose, children, footer, size = 'md' }: DialogProps) {
  const { t } = useAdminI18n();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`dialog dialog--${size}`}
      aria-labelledby="dialog-title"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // click on backdrop
      }}
    >
      {open ? (
        <div className="dialog__panel">
          <header className="dialog__header">
            <h2 id="dialog-title">{title}</h2>
            <button type="button" className="icon-button" onClick={onClose} aria-label={t.common.close}>
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </header>
          <div className="dialog__body">{children}</div>
          {footer ? <footer className="dialog__footer">{footer}</footer> : null}
        </div>
      ) : null}
    </dialog>
  );
}

interface ConfirmProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}

export function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onCancel, busy }: ConfirmProps) {
  const { t } = useAdminI18n();
  return (
    <Dialog
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={onCancel}>
            {t.common.cancel}
          </button>
          <button type="button" className="btn btn--danger" onClick={onConfirm} disabled={busy}>
            {busy ? t.common.deleting : confirmLabel}
          </button>
        </>
      }
    >
      <p className="dialog__message">{message}</p>
    </Dialog>
  );
}

/* ---------- Small pieces ---------- */

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <p className="empty__title">{title}</p>
      {body ? <p className="empty__body">{body}</p> : null}
      {action}
    </div>
  );
}

export type IconName = 'plus' | 'download' | 'search' | 'edit' | 'trash' | 'check' | 'eye-off' | 'eye' | 'logout' | 'external' | 'table' | 'status' | 'x' | 'users' | 'clock' | 'x-circle' | 'heart' | 'seat' | 'chevron';

export function Icon({ name }: { name: IconName }) {
  const paths: Record<typeof name, ReactNode> = {
    plus: <path d="M8 3v10M3 8h10" />,
    download: <path d="M8 2.5v8M4.5 7 8 10.5 11.5 7M3 13.5h10" />,
    search: (
      <>
        <circle cx="7" cy="7" r="4.5" />
        <path d="m10.5 10.5 3 3" />
      </>
    ),
    edit: <path d="M10.5 2.5l3 3L6 13H3v-3z" />,
    trash: <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.7 9h5.6l.7-9" />,
    check: <path d="M3 8.5 6.5 12 13 4.5" />,
    'eye-off': <path d="M2 2l12 12M6.6 6.6a2 2 0 0 0 2.8 2.8M4.2 4.4C2.8 5.4 2 6.8 1.5 8c1.2 2.8 3.6 4.5 6.5 4.5 1.3 0 2.4-.3 3.4-.9M7 3.6c.3 0 .7-.1 1-.1 2.9 0 5.3 1.7 6.5 4.5-.4.9-.9 1.7-1.6 2.4" />,
    eye: (
      <>
        <path d="M1.5 8C2.7 5.2 5.1 3.5 8 3.5s5.3 1.7 6.5 4.5c-1.2 2.8-3.6 4.5-6.5 4.5S2.7 10.8 1.5 8z" />
        <circle cx="8" cy="8" r="2" />
      </>
    ),
    logout: <path d="M6 13.5H3.5v-11H6M10 5l3 3-3 3M13 8H6" />,
    external: <path d="M9 2.5h4.5V7M13.5 2.5 7 9M11.5 9.5v4h-9v-9h4" />,
    table: (
      <>
        <ellipse cx="8" cy="6" rx="5.5" ry="2.5" />
        <path d="M8 8.5v5M5.5 13.5h5" />
      </>
    ),
    status: (
      <>
        <circle cx="8" cy="8" r="5.5" />
        <path d="M5.8 8.2 7.3 9.7 10.4 6.4" />
      </>
    ),
    x: <path d="M4 4l8 8M12 4l-8 8" />,
    users: (
      <>
        <circle cx="6" cy="5.5" r="2.3" />
        <path d="M1.8 13.5c.4-2.4 2.1-3.8 4.2-3.8s3.8 1.4 4.2 3.8" />
        <circle cx="11.3" cy="6.2" r="1.8" />
        <path d="M11 9.8c1.7 0 3 1.1 3.3 3" />
      </>
    ),
    clock: (
      <>
        <circle cx="8" cy="8" r="5.8" />
        <path d="M8 4.8V8l2.2 1.4" />
      </>
    ),
    'x-circle': (
      <>
        <circle cx="8" cy="8" r="5.8" />
        <path d="M6 6l4 4M10 6l-4 4" />
      </>
    ),
    heart: <path d="M8 13.3S2.5 10 2.5 6.1A2.9 2.9 0 0 1 8 4.8a2.9 2.9 0 0 1 5.5 1.3C13.5 10 8 13.3 8 13.3z" />,
    seat: (
      <>
        <path d="M4.5 8V3.5a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1V8" />
        <path d="M3 8h10v2.5H3zM4 10.5V14M12 10.5V14" />
      </>
    ),
    chevron: <path d="M6 4l4 4-4 4" />,
  };
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
