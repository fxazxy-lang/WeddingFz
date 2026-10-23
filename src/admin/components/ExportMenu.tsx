import { useEffect, useRef, useState } from 'react';
import { adminApi, type ExportFilter } from '../api';
import { useAdminI18n } from '../i18n';
import { Icon } from './ui';

/** Download the guest list as Excel (3 sheets for catering & seating) or CSV. */
export function ExportMenu({ filter, full = false }: { filter?: ExportFilter; full?: boolean }) {
  const { t } = useAdminI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const filtered = Boolean(filter?.search || filter?.side || filter?.status);

  return (
    <div className="menu" ref={ref}>
      <button
        type="button"
        className="btn btn--secondary"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="download" />
        {full ? t.export.buttonFull : t.export.button}
      </button>
      {open ? (
        <div className="menu__panel" role="menu">
          <a role="menuitem" className="menu__item" href={adminApi.exportUrl('xlsx', filter)} onClick={() => setOpen(false)}>
            <span className="menu__item-title">{t.export.xlsx}</span>
            <span className="menu__item-hint">{t.export.xlsxHint}</span>
          </a>
          <a role="menuitem" className="menu__item" href={adminApi.exportUrl('csv', filter)} onClick={() => setOpen(false)}>
            <span className="menu__item-title">{t.export.csv}</span>
            <span className="menu__item-hint">{t.export.csvHint}</span>
          </a>
          {filtered ? <p className="menu__note">{t.export.filtered}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
