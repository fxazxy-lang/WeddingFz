import type { DashboardStats } from '../../../shared/types';
import { ExportMenu } from '../components/ExportMenu';
import { MetricCards, SideSplit } from '../components/MetricCards';
import { PageHeader } from '../components/Shell';
import { EmptyState, StatusBadge } from '../components/ui';
import type { AdminPage } from '../hooks';
import { useAdminI18n, useTimeAgo } from '../i18n';

interface Props {
  stats: DashboardStats | null;
  error: Error | null;
  onRetry: () => void;
  onNavigate: (page: AdminPage, query?: string) => void;
}

export function OverviewPage({ stats, error, onRetry, onNavigate }: Props) {
  const { t } = useAdminI18n();
  const timeAgo = useTimeAgo();
  const o = t.overview;

  return (
    <>
      <PageHeader title={o.title} subtitle={o.subtitle} actions={<ExportMenu full />} />

      {error && !stats ? (
        <p className="panel__state">
          {o.loadError}{' '}
          <button type="button" className="link-button" onClick={onRetry}>
            {t.common.tryAgain}
          </button>
        </p>
      ) : null}
      {!stats && !error ? <p className="panel__state">{t.common.loading}</p> : null}

      {stats ? (
        <>
          <MetricCards stats={stats} onOpen={onNavigate} />
          <div className="overview-grid">
            <section className="panel">
              <div className="panel__head">
                <h2 className="panel__title">{o.latest}</h2>
                <button type="button" className="link-button" onClick={() => onNavigate('guests')}>
                  {o.openGuests}
                </button>
              </div>
              {stats.recentResponses.length ? (
                <ul className="activity">
                  {stats.recentResponses.map((r) => (
                    <li key={r.id} className="activity__item">
                      <div>
                        <p className="activity__name">{r.name}</p>
                        <p className="activity__meta">
                          {r.side === 'groom' ? t.side.groomSide : t.side.brideSide}
                          {r.status === 'confirmed' ? `, ${t.common.pax(r.pax)}` : ''}
                        </p>
                      </div>
                      <div className="activity__right">
                        <StatusBadge status={r.status} />
                        <span className="activity__time">{timeAgo(r.respondedAt)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title={o.noReplies} body={o.noRepliesBody} />
              )}
            </section>

            <div className="overview-side">
              <SideSplit stats={stats} />
              <section className="panel">
                <h2 className="panel__title">{o.guestbook}</h2>
                <p className="panel__text">
                  {stats.wishes.pending
                    ? o.wishesWaiting(stats.wishes.pending)
                    : o.wishesReviewed(stats.wishes.total, stats.wishes.approved)}
                </p>
                <button type="button" className="btn btn--secondary" onClick={() => onNavigate('wishes')}>
                  {stats.wishes.pending ? o.reviewWishes : o.openGuestbook}
                </button>
              </section>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
