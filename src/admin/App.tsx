import { useCallback, useEffect, useState } from 'react';
import type { DashboardStats } from '../../shared/types';
import { RequestError } from '../lib/api';
import { adminApi } from './api';
import { Login } from './components/Login';
import { Shell } from './components/Shell';
import { useAdminRoute } from './hooks';
import { GuestsPage } from './pages/GuestsPage';
import { OverviewPage } from './pages/OverviewPage';
import { WishesPage } from './pages/WishesPage';

type Auth = 'checking' | 'signed-in' | 'signed-out';

export function App() {
  const [auth, setAuth] = useState<Auth>('checking');
  const [page, navigate] = useAdminRoute();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsError, setStatsError] = useState<Error | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setStats(await adminApi.stats());
      setStatsError(null);
    } catch (e) {
      if (e instanceof RequestError && e.status === 401) setAuth('signed-out');
      else setStatsError(e as Error);
    }
  }, []);

  useEffect(() => {
    adminApi
      .session()
      .then((s) => setAuth(s.authenticated ? 'signed-in' : 'signed-out'))
      .catch(() => setAuth('signed-out'));
  }, []);

  useEffect(() => {
    if (auth === 'signed-in') void loadStats();
  }, [auth, loadStats]);

  // Keep the numbers fresh while the dashboard is open (replies arrive in real time).
  useEffect(() => {
    if (auth !== 'signed-in') return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadStats();
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [auth, loadStats]);

  const logout = async () => {
    await adminApi.logout().catch(() => {});
    setStats(null);
    setAuth('signed-out');
  };

  if (auth === 'checking') return <div className="boot" aria-busy="true" />;
  if (auth === 'signed-out') return <Login onSuccess={() => setAuth('signed-in')} />;

  return (
    <Shell page={page} onNavigate={navigate} onLogout={logout} pendingWishes={stats?.wishes.pending ?? 0}>
      {page === 'overview' ? (
        <OverviewPage stats={stats} error={statsError} onRetry={loadStats} onNavigate={navigate} />
      ) : null}
      {page === 'guests' ? <GuestsPage onChanged={loadStats} /> : null}
      {page === 'wishes' ? <WishesPage onChanged={loadStats} /> : null}
    </Shell>
  );
}
