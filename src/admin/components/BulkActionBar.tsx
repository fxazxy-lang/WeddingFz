import { type FormEvent, useEffect, useRef, useState } from 'react';
import { GUEST_STATUSES, type GuestStatus } from '../../../shared/constants';
import { useAdminI18n } from '../i18n';
import { Icon } from './ui';

interface Props {
  count: number;
  busy: boolean;
  onAssignTable: (table: string) => Promise<void>;
  onUpdateStatus: (status: GuestStatus) => Promise<void>;
  onDelete: () => void;
  onClear: () => void;
}

/** Floating bar shown while guests are selected in the table. */
export function BulkActionBar({ count, busy, onAssignTable, onUpdateStatus, onDelete, onClear }: Props) {
  const { t } = useAdminI18n();
  const [open, setOpen] = useState<'table' | 'status' | null>(null);
  const [table, setTable] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (open) setOpen(null);
      else if (!document.querySelector('dialog[open]')) onClear();
    };
    const onDown = (e: MouseEvent) => {
      if (open && ref.current && !ref.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open, onClear]);

  const submitTable = async (event: FormEvent) => {
    event.preventDefault();
    await onAssignTable(table.trim());
    setOpen(null);
    setTable('');
  };

  const pickStatus = async (status: GuestStatus) => {
    await onUpdateStatus(status);
    setOpen(null);
  };

  return (
    <div className="bulk-bar" ref={ref} role="toolbar" aria-label={t.bulk.toolbar}>
      <p className="bulk-bar__count" aria-live="polite">
        {t.bulk.selected(count)}
      </p>

      <div className="bulk-bar__actions">
        <div className="bulk-bar__group">
          <button
            type="button"
            className="bulk-bar__btn"
            aria-expanded={open === 'table'}
            disabled={busy}
            onClick={() => setOpen(open === 'table' ? null : 'table')}
          >
            <Icon name="table" /> {t.bulk.assignTable}
          </button>
          {open === 'table' ? (
            <form className="bulk-pop" onSubmit={submitTable}>
              <label className="a-field">
                <span className="a-field__label">{t.bulk.tableLabel(count)}</span>
                <input
                  className="a-input"
                  value={table}
                  maxLength={20}
                  placeholder={t.bulk.tablePlaceholder}
                  autoFocus
                  onChange={(e) => setTable(e.target.value)}
                />
                <span className="a-field__hint">{t.bulk.tableHint}</span>
              </label>
              <button type="submit" className="btn btn--primary btn--small btn--block" disabled={busy}>
                {busy ? t.common.saving : t.common.apply}
              </button>
            </form>
          ) : null}
        </div>

        {/* Split button: one click to confirm, caret for the other statuses. */}
        <div className="bulk-bar__group bulk-bar__split">
          <button type="button" className="bulk-bar__btn bulk-bar__btn--confirm" disabled={busy} onClick={() => onUpdateStatus('confirmed')}>
            <Icon name="check" /> {t.bulk.markConfirmed}
          </button>
          <button
            type="button"
            className="bulk-bar__btn bulk-bar__caret"
            aria-expanded={open === 'status'}
            aria-haspopup="menu"
            aria-label={t.bulk.moreStatuses}
            title={t.bulk.moreStatuses}
            disabled={busy}
            onClick={() => setOpen(open === 'status' ? null : 'status')}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M3 4.5 6 7.5 9 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {open === 'status' ? (
            <div className="bulk-pop bulk-pop--menu" role="menu" aria-label={t.bulk.updateStatus}>
              {GUEST_STATUSES.map((status) => (
                <button key={status} type="button" role="menuitem" className="bulk-pop__item" onClick={() => pickStatus(status)}>
                  <span className={`dot dot--${status}`} /> {t.status[status]}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <button type="button" className="bulk-bar__btn bulk-bar__btn--danger" disabled={busy} onClick={onDelete}>
          <Icon name="trash" /> {t.bulk.delete}
        </button>
      </div>

      <button type="button" className="bulk-bar__close" onClick={onClear} aria-label={t.bulk.clear} title={t.bulk.clear}>
        <Icon name="x" />
      </button>
    </div>
  );
}
