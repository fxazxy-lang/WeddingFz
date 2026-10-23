import type { ReactNode } from 'react';
import { type AdminPage, pathForPage } from '../hooks';
import { LanguageToggle, useAdminI18n } from '../i18n';
import { Icon } from './ui';

const PAGES: AdminPage[] = ['overview', 'guests', 'wishes'];

interface Props {
  page: AdminPage;
  onNavigate: (page: AdminPage, query?: string) => void;
  onLogout: () => void;
  pendingWishes: number;
  children: ReactNode;
}

export function Shell({ page, onNavigate, onLogout, pendingWishes, children }: Props) {
  const { t } = useAdminI18n();
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="sidebar__monogram">T &amp; R</span>
          <span className="sidebar__caption">{t.nav.caption}</span>
        </div>
        <nav className="sidebar__nav" aria-label={t.nav.caption}>
          {PAGES.map((item) => (
            <a
              key={item}
              href={pathForPage(item)}
              className={`sidebar__link ${page === item ? 'is-active' : ''}`}
              aria-current={page === item ? 'page' : undefined}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey) return;
                e.preventDefault();
                onNavigate(item);
              }}
            >
              {t.nav[item]}
              {item === 'wishes' && pendingWishes > 0 ? (
                <span className="sidebar__count" aria-label={t.nav.awaiting(pendingWishes)}>
                  {pendingWishes}
                </span>
              ) : null}
            </a>
          ))}
        </nav>
        <div className="sidebar__footer">
          <a className="sidebar__link sidebar__link--quiet" href="/" target="_blank" rel="noopener">
            <Icon name="external" /> <span>{t.nav.viewSite}</span>
          </a>
          <button type="button" className="sidebar__link sidebar__link--quiet" onClick={onLogout}>
            <Icon name="logout" /> <span>{t.nav.signOut}</span>
          </button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  // The language switch sits in every page header, next to the page's own actions.
  return (
    <header className="page-header">
      <div>
        <h1 className="page-header__title">{title}</h1>
        {subtitle ? <p className="page-header__subtitle">{subtitle}</p> : null}
      </div>
      <div className="page-header__actions">
        <LanguageToggle />
        {actions}
      </div>
    </header>
  );
}
