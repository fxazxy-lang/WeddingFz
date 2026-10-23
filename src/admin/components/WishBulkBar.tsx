import { useEffect } from 'react';
import { useAdminI18n } from '../i18n';
import { Icon } from './ui';

interface Props {
  count: number;
  busy: boolean;
  onPublic: () => void;
  onHide: () => void;
  onDelete: () => void;
  onClear: () => void;
}

/** Floating glass pill shown while guestbook wishes are selected. */
export function WishBulkBar({ count, busy, onPublic, onHide, onDelete, onClear }: Props) {
  const { t } = useAdminI18n();
  const b = t.wishBulk;

  // Esc clears the selection (unless a dialog is open and should get the key instead).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('dialog[open]')) onClear();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClear]);

  return (
    <div className="bulk-bar bulk-bar--pill" role="toolbar" aria-label={b.toolbar}>
      <p className="bulk-bar__count" aria-live="polite">
        <span className="bulk-bar__dot" aria-hidden="true" />
        {b.selected(count)}
      </p>

      <div className="bulk-bar__actions">
        <button type="button" className="bulk-bar__btn bulk-bar__btn--public" disabled={busy} onClick={onPublic}>
          <Icon name="eye" /> {b.setPublic}
        </button>
        <button type="button" className="bulk-bar__btn" disabled={busy} onClick={onHide}>
          <Icon name="eye-off" /> {b.hide}
        </button>
        <button type="button" className="bulk-bar__btn bulk-bar__btn--danger" disabled={busy} onClick={onDelete}>
          <Icon name="trash" /> {b.delete}
        </button>
      </div>

      <button type="button" className="bulk-bar__close" onClick={onClear} aria-label={b.clear} title={b.clear}>
        <Icon name="x" />
      </button>
    </div>
  );
}
