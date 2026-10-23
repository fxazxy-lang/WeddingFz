import { useEffect, useRef, useState } from 'react';
import { wedding } from '../../config/wedding';
import { useI18n } from '../../i18n/I18nProvider';
import { buildIcs, type CalendarEvent, downloadFile, googleCalendarUrl } from '../../lib/ics';

interface Props {
  /** Events written to the .ics file (Apple Calendar, Outlook). */
  events: CalendarEvent[];
  /** Google Calendar takes a single event, so pass one that spans the whole block. */
  google: Omit<CalendarEvent, 'uid'>;
  fileName: string;
}

/** "Add to Calendar" button with a small menu: Google Calendar, or an .ics file for Apple Calendar / Outlook. */
export function AddToCalendar({ events, google, fileName }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const downloadIcs = () => {
    downloadFile(fileName, buildIcs(events), 'text/calendar;charset=utf-8');
    setOpen(false);
  };

  return (
    <div className="calendar-menu" ref={ref}>
      <button
        type="button"
        className="button button--ghost"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.3" />
          <path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        {t.schedule.addToCalendar}
      </button>
      {open ? (
        <div className="calendar-menu__panel" role="menu">
          <a
            role="menuitem"
            className="calendar-menu__item"
            href={googleCalendarUrl(google, wedding.timeZone)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
          >
            {t.schedule.googleCalendar}
          </a>
          <button type="button" role="menuitem" className="calendar-menu__item" onClick={downloadIcs}>
            {t.schedule.appleCalendar}
          </button>
        </div>
      ) : null}
    </div>
  );
}
