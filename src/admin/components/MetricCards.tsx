import type { DashboardStats } from '../../../shared/types';
import type { AdminPage } from '../hooks';
import { useAdminI18n } from '../i18n';
import { Icon, type IconName } from './ui';

interface Metric {
  key: string;
  label: string;
  value: number;
  detail: string;
  /** 0–100, drawn as the bar under the number. */
  progress: number;
  icon: IconName;
  tone: 'pax' | 'invited' | 'confirmed' | 'pending' | 'declined' | 'wishes';
  open: () => void;
}

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

/** Clickable stat widgets: icon, number, progress bar; each opens the matching list. */
export function MetricCards({ stats, onOpen }: { stats: DashboardStats; onOpen: (page: AdminPage, query?: string) => void }) {
  const { t } = useAdminI18n();
  const m = t.overview.metrics;
  const { guests, wishes } = stats;
  const replied = guests.invited - guests.pending;
  const expectedPax = guests.confirmedPax + guests.pendingPax;

  const metrics: Metric[] = [
    {
      key: 'pax',
      label: m.pax,
      value: guests.confirmedPax,
      detail: guests.pendingPax ? m.paxExpected(expectedPax) : m.paxNone,
      progress: pct(guests.confirmedPax, expectedPax),
      icon: 'seat',
      tone: 'pax',
      open: () => onOpen('guests', 'status=confirmed'),
    },
    {
      key: 'invited',
      label: m.guestsTotal,
      value: guests.invited,
      detail: m.replied(pct(replied, guests.invited)),
      progress: pct(replied, guests.invited),
      icon: 'users',
      tone: 'invited',
      open: () => onOpen('guests'),
    },
    {
      key: 'confirmed',
      label: m.confirmed,
      value: guests.confirmed,
      detail: m.ofInvitations(pct(guests.confirmed, guests.invited)),
      progress: pct(guests.confirmed, guests.invited),
      icon: 'status',
      tone: 'confirmed',
      open: () => onOpen('guests', 'status=confirmed'),
    },
    {
      key: 'pending',
      label: m.pending,
      value: guests.pending,
      detail: m.ofInvitations(pct(guests.pending, guests.invited)),
      progress: pct(guests.pending, guests.invited),
      icon: 'clock',
      tone: 'pending',
      open: () => onOpen('guests', 'status=pending'),
    },
    {
      key: 'declined',
      label: m.declined,
      value: guests.declined,
      detail: m.ofInvitations(pct(guests.declined, guests.invited)),
      progress: pct(guests.declined, guests.invited),
      icon: 'x-circle',
      tone: 'declined',
      open: () => onOpen('guests', 'status=declined'),
    },
    {
      key: 'wishes',
      label: m.wishes,
      value: wishes.total,
      detail: wishes.pending ? m.wishesPending(wishes.pending) : m.wishesDone,
      progress: pct(wishes.total - wishes.pending, wishes.total),
      icon: 'heart',
      tone: 'wishes',
      open: () => onOpen('wishes'),
    },
  ];

  return (
    <section className="metrics" aria-label={m.ariaLabel}>
      {metrics.map((metric) => (
        <button
          key={metric.key}
          type="button"
          className={`metric metric--${metric.tone}`}
          onClick={metric.open}
          aria-label={`${m.open(metric.label)}. ${metric.value}. ${metric.detail}`}
        >
          <span className="metric__top">
            <span className="metric__icon" aria-hidden="true">
              <Icon name={metric.icon} />
            </span>
            <span className="metric__go" aria-hidden="true">
              <Icon name="chevron" />
            </span>
          </span>
          <span className="metric__label">{metric.label}</span>
          <span className="metric__value">{metric.value.toLocaleString('en-US')}</span>
          <span className="metric__bar" aria-hidden="true">
            <span className="metric__bar-fill" style={{ width: `${metric.progress}%` }} />
          </span>
          <span className="metric__detail">{metric.detail}</span>
        </button>
      ))}
    </section>
  );
}

/** Confirmed pax split between the two families, plus how many invitations have been answered. */
export function SideSplit({ stats }: { stats: DashboardStats }) {
  const { t } = useAdminI18n();
  const { groomPax, bridePax, invited, pending } = stats.guests;
  const total = groomPax + bridePax;
  const groomShare = total ? (groomPax / total) * 100 : 50;
  const answered = invited - pending;
  return (
    <section className="panel">
      <h2 className="panel__title">{t.overview.byFamily}</h2>
      <div
        className="split"
        role="img"
        aria-label={`${t.side.groomSide} ${t.common.pax(groomPax)}, ${t.side.brideSide} ${t.common.pax(bridePax)}`}
      >
        <span className="split__bar split__bar--groom" style={{ width: `${groomShare}%` }} />
        <span className="split__bar split__bar--bride" style={{ width: `${100 - groomShare}%` }} />
      </div>
      <dl className="split__legend">
        <div>
          <dt>
            <span className="dot dot--groom" /> {t.side.groomSide}
          </dt>
          <dd>{t.common.pax(groomPax)}</dd>
        </div>
        <div>
          <dt>
            <span className="dot dot--bride" /> {t.side.brideSide}
          </dt>
          <dd>{t.common.pax(bridePax)}</dd>
        </div>
      </dl>
      <div className="progress">
        <div className="progress__label">
          <span>{t.overview.repliesReceived}</span>
          <span>{t.overview.of(answered, invited)}</span>
        </div>
        <div className="progress__track">
          <span className="progress__fill" style={{ width: `${pct(answered, invited)}%` }} />
        </div>
      </div>
    </section>
  );
}
