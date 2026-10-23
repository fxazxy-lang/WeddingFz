import { type KeyboardEvent, useId, useRef, useState } from 'react';
import { type ScheduleDay, type ScheduleSession, wedding } from '../../config/wedding';
import { useI18n } from '../../i18n/I18nProvider';
import { formatShortDate, formatTime } from '../../lib/format';
import { AddToCalendar } from './AddToCalendar';
import { ScheduleIcon } from './ScheduleIcon';
import { SectionHeading } from './SectionHeading';

/** Open on today's tab during the celebration (the first day before it, the last day after it). */
function initialDayIndex(days: ScheduleDay[]): number {
  const now = Date.now();
  const index = days.findIndex((d) => new Date(`${d.date.slice(0, 10)}T23:59:59+07:00`).getTime() >= now);
  return index === -1 ? days.length - 1 : index;
}

function SessionCard({ session }: { session: ScheduleSession }) {
  const { t, lang, pick } = useI18n();
  const venue = wedding.venues[session.venue];
  const title = t.schedule.sessions[session.id];
  const couple = `${wedding.couple.groom.firstName[lang]} & ${wedding.couple.bride.firstName[lang]}`;
  const location = `${pick(venue.name)}, ${pick(venue.address)}`;
  const first = session.items[0];
  const last = session.items[session.items.length - 1];

  const events = session.items.map((item) => ({
    uid: `${item.id}-${item.start}@wedding`,
    title: `${t.schedule.items[item.id].title} · ${couple}`,
    start: item.start,
    end: item.end,
    location,
    description: `${t.schedule.items[item.id].body}\n${venue.mapUrl}`,
  }));
  // Google Calendar takes one event, so it spans the whole session with the itinerary in its notes.
  const google = {
    title: `${title} · ${couple}`,
    start: first.start,
    end: last.end ?? last.start,
    location,
    description: [
      ...session.items.map((item) => `${formatTime(lang, item.start)}  ${t.schedule.items[item.id].title}`),
      '',
      venue.mapUrl,
    ].join('\n'),
  };

  return (
    <article className={`session-card session-card--${session.id}`}>
      <header className="session-card__header">
        <h4 className="session-card__title">{title}</h4>
        <p className="session-card__venue">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 14.5s5-4.3 5-8.2A5 5 0 0 0 3 6.3c0 3.9 5 8.2 5 8.2z" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="8" cy="6.3" r="1.8" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          <span>
            <span className="session-card__venue-name">{pick(venue.name)}</span>
            <span className="session-card__address">{pick(venue.address)}</span>
          </span>
        </p>
      </header>

      <ol className="session-list">
        {session.items.map((item) => (
          <li className="session-list__item" key={item.id}>
            <span className="session-list__icon">
              <ScheduleIcon id={item.id} />
            </span>
            <div className="session-list__content">
              <time className="time-badge" dateTime={item.start}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <circle cx="6" cy="6" r="4.75" stroke="currentColor" strokeWidth="1.1" />
                  <path d="M6 3.6V6l1.7 1.1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
                </svg>
                {formatTime(lang, item.start)}
              </time>
              <h5 className="session-list__title">{t.schedule.items[item.id].title}</h5>
              <p className="session-list__body">{t.schedule.items[item.id].body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="session-card__actions">
        <a className="button button--ghost" href={venue.mapUrl} target="_blank" rel="noopener noreferrer">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2 4.5 6 3l4 1.5L14 3v8.5L10 13l-4-1.5L2 13z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            <path d="M6 3v8.5M10 4.5V13" stroke="currentColor" strokeWidth="1.3" />
          </svg>
          {t.schedule.directions}
        </a>
        <AddToCalendar events={events} google={google} fileName={`wedding-${session.id}.ics`} />
      </div>
    </article>
  );
}

export function Schedule() {
  const { t, lang } = useI18n();
  const days = wedding.schedule;
  const [active, setActive] = useState(() => initialDayIndex(days));
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();

  const select = (index: number, focus = false) => {
    if (index === active) return;
    setDirection(index > active ? 'next' : 'prev');
    setActive(index);
    if (focus) tabRefs.current[index]?.focus();
  };

  // Arrow keys, Home and End move between tabs (WAI-ARIA tabs pattern).
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = days.length - 1;
    const keys: Record<string, number> = {
      ArrowRight: active === last ? 0 : active + 1,
      ArrowLeft: active === 0 ? last : active - 1,
      Home: 0,
      End: last,
    };
    if (event.key in keys) {
      event.preventDefault();
      select(keys[event.key], true);
    }
  };

  const day = days[active];

  return (
    <section className="section schedule" id="schedule" aria-labelledby="schedule-title">
      <div className="container">
        <SectionHeading id="schedule-title" title={t.schedule.title} intro={t.schedule.intro} />

        <div
          className="day-tabs"
          role="tablist"
          aria-label={t.schedule.tabsLabel}
          onKeyDown={onKeyDown}
          style={{ ['--tab-count' as string]: days.length, ['--tab-index' as string]: active }}
        >
          <span className="day-tabs__indicator" aria-hidden="true" />
          {days.map((d, index) => (
            <button
              key={d.id}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${d.id}`}
              aria-selected={index === active}
              aria-controls={`${baseId}-panel`}
              tabIndex={index === active ? 0 : -1}
              className={`day-tabs__tab ${index === active ? 'is-active' : ''}`}
              onClick={() => select(index)}
            >
              <span className="day-tabs__label">{t.schedule.days[d.id].tab}</span>
              <span className="day-tabs__date">{formatShortDate(lang, d.date)}</span>
            </button>
          ))}
        </div>

        <div
          key={day.id}
          id={`${baseId}-panel`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${day.id}`}
          className={`day-panel day-panel--${direction}`}
          tabIndex={0}
        >
          <h3 className="day-panel__title">{t.schedule.days[day.id].title}</h3>
          <div className={`day-panel__sessions day-panel__sessions--${day.sessions.length}`}>
            {day.sessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        </div>

        <p className="schedule__dress">{t.schedule.dressCode}</p>
      </div>
    </section>
  );
}
