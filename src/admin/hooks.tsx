import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';

/* ---------- Path routing (three pages don't need a router library) ---------- */

export type AdminPage = 'overview' | 'guests' | 'wishes';

const pageFromPath = (pathname: string): AdminPage =>
  pathname.startsWith('/admin/guests') ? 'guests' : pathname.startsWith('/admin/wishes') ? 'wishes' : 'overview';

export const pathForPage = (page: AdminPage) => (page === 'overview' ? '/admin' : `/admin/${page}`);

export function useAdminRoute(): [AdminPage, (page: AdminPage, query?: string) => void] {
  const [page, setPage] = useState<AdminPage>(() => pageFromPath(window.location.pathname));
  useEffect(() => {
    const onPop = () => setPage(pageFromPath(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  /** `query` (e.g. "status=pending") pre-sets filters on the target page. */
  const navigate = useCallback((next: AdminPage, query?: string) => {
    window.history.pushState(null, '', pathForPage(next) + (query ? `?${query}` : ''));
    setPage(next);
    window.scrollTo({ top: 0 });
  }, []);
  return [page, navigate];
}

/* ---------- Toasts ---------- */

interface Toast {
  id: number;
  message: string;
  tone: 'success' | 'error';
}

const ToastContext = createContext<(message: string, tone?: Toast['tone']) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const push = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = nextId.current++;
    setToasts((list) => [...list, { id, message, tone }]);
    window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 3800);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.tone}`}>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

/* ---------- Async data ---------- */

export function useResource<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const loadRef = useRef(load);
  loadRef.current = load;

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await loadRef.current());
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, setData, error, loading, reload };
}
