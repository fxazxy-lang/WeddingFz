import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { WishStatus } from '../../../shared/constants';
import type { Wish } from '../../../shared/types';
import { adminApi } from '../api';
import { PageHeader } from '../components/Shell';
import { ConfirmDialog, EmptyState, Icon, WishBadge } from '../components/ui';
import { WishBulkBar } from '../components/WishBulkBar';
import { useResource, useToast } from '../hooks';
import { useAdminI18n } from '../i18n';

type Tab = WishStatus | 'all';
const TABS: Tab[] = ['pending', 'approved', 'hidden', 'all'];

/** How long a card takes to fold away when it's deleted or leaves the current tab. */
const LEAVE_MS = 320;

const formatDate = (iso: string, lang: string) =>
  new Date(iso).toLocaleString(lang === 'km' ? 'km-KH' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    numberingSystem: 'latn',
  });

/** Header checkbox: checked when every visible wish is selected, dash when only some are. */
function SelectAllBox({ total, selected, onToggle, label }: { total: number; selected: number; onToggle: () => void; label: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const all = total > 0 && selected === total;
  const some = selected > 0 && !all;
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = some;
  }, [some]);
  return (
    <label className="wish-select-all">
      <input ref={ref} type="checkbox" className="checkbox" checked={all} onChange={onToggle} disabled={!total} />
      <span>{label}</span>
    </label>
  );
}

export function WishesPage({ onChanged }: { onChanged: () => void }) {
  const { t, lang } = useAdminI18n();
  const w = t.wishes;
  const b = t.wishBulk;
  const toast = useToast();
  const { data, setData, error, loading, reload } = useResource(adminApi.wishes);
  const [tab, setTab] = useState<Tab>('pending');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [leaving, setLeaving] = useState<Set<string>>(new Set());
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [deleting, setDeleting] = useState<Wish | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const lastClicked = useRef<string | null>(null);

  const wishes = data ?? [];
  const counts = useMemo(
    () => ({
      all: wishes.length,
      pending: wishes.filter((x) => x.status === 'pending').length,
      approved: wishes.filter((x) => x.status === 'approved').length,
      hidden: wishes.filter((x) => x.status === 'hidden').length,
    }),
    [wishes],
  );
  const visible = useMemo(() => (tab === 'all' ? wishes : wishes.filter((x) => x.status === tab)), [wishes, tab]);
  const visibleSelected = visible.filter((x) => selected.has(x.id));

  // Keep the selection to what's on screen when switching tabs or after changes.
  useEffect(() => {
    setSelected((current) => {
      const ids = new Set(visible.map((x) => x.id));
      const next = new Set([...current].filter((id) => ids.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [visible]);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const toggle = (id: string, shiftKey: boolean) => {
    // Read the anchor now: the state updater below runs later, after lastClicked has moved on.
    const anchor = shiftKey ? lastClicked.current : null;
    setSelected((current) => {
      const next = new Set(current);
      const turnOn = !next.has(id);
      // Shift-click selects (or clears) the whole range from the last clicked card.
      const from = anchor ? visible.findIndex((x) => x.id === anchor) : -1;
      const to = visible.findIndex((x) => x.id === id);
      if (from >= 0 && to >= 0) {
        const [a, z] = from < to ? [from, to] : [to, from];
        for (const x of visible.slice(a, z + 1)) turnOn ? next.add(x.id) : next.delete(x.id);
      } else if (turnOn) next.add(id);
      else next.delete(id);
      return next;
    });
    lastClicked.current = id;
  };

  const toggleAll = () =>
    setSelected(visibleSelected.length === visible.length ? new Set() : new Set(visible.map((x) => x.id)));

  const setBusy = (ids: string[], on: boolean) =>
    setBusyIds((s) => {
      const next = new Set(s);
      for (const id of ids) on ? next.add(id) : next.delete(id);
      return next;
    });

  /** Fold cards away, then apply the change to the list. */
  const removeAnimated = (ids: string[], apply: () => void) => {
    if (!ids.length) return apply();
    setLeaving((s) => new Set([...s, ...ids]));
    window.setTimeout(() => {
      apply();
      setLeaving((s) => {
        const next = new Set(s);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    }, LEAVE_MS);
  };

  /** Merge saved wishes into the list; ones that no longer belong in this tab fold away first. */
  const applySaved = (saved: Wish[]) => {
    const byId = new Map(saved.map((x) => [x.id, x]));
    const merge = () => setData((list) => (list ?? []).map((x) => byId.get(x.id) ?? x));
    const leavingTab = tab === 'all' ? [] : saved.filter((x) => x.status !== tab).map((x) => x.id);
    removeAnimated(leavingTab, merge);
  };

  const changeStatus = async (wish: Wish, status: WishStatus) => {
    setBusy([wish.id], true);
    try {
      const saved = await adminApi.setWishStatus(wish.id, status);
      applySaved([saved]);
      toast(status === 'approved' ? w.nowPublic(wish.name) : w.nowHidden(wish.name));
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : w.updateFailed, 'error');
    } finally {
      setBusy([wish.id], false);
    }
  };

  const bulkStatus = async (status: WishStatus) => {
    const ids = visibleSelected.map((x) => x.id);
    if (!ids.length) return;
    setBulkBusy(true);
    try {
      const saved = await adminApi.setWishStatusMany(ids, status);
      applySaved(saved);
      toast(status === 'approved' ? b.madePublic(saved.length) : b.madeHidden(saved.length));
      clearSelection();
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : b.failed, 'error');
      void reload();
    } finally {
      setBulkBusy(false);
    }
  };

  const bulkDelete = async () => {
    const ids = visibleSelected.map((x) => x.id);
    setBulkBusy(true);
    try {
      const count = await adminApi.deleteWishes(ids);
      setConfirmBulkDelete(false);
      clearSelection();
      removeAnimated(ids, () => setData((list) => (list ?? []).filter((x) => !ids.includes(x.id))));
      toast(b.deleted(count));
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : b.failed, 'error');
    } finally {
      setBulkBusy(false);
    }
  };

  const approveAll = async () => {
    const ids = wishes.filter((x) => x.status === 'pending').map((x) => x.id);
    setBulkBusy(true);
    try {
      const saved = await adminApi.setWishStatusMany(ids, 'approved');
      applySaved(saved);
      toast(w.published(saved.length));
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : w.publishFailed, 'error');
      void reload();
    } finally {
      setBulkBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const target = deleting;
    setBusy([target.id], true);
    try {
      await adminApi.deleteWish(target.id);
      setDeleting(null);
      removeAnimated([target.id], () => setData((list) => (list ?? []).filter((x) => x.id !== target.id)));
      toast(w.deleted);
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : w.deleteFailed, 'error');
    } finally {
      setBusy([target.id], false);
    }
  };

  return (
    <>
      <PageHeader
        title={w.title}
        subtitle={w.subtitle}
        actions={
          counts.pending > 1 ? (
            <button type="button" className="btn btn--primary" onClick={approveAll} disabled={bulkBusy}>
              <Icon name="check" /> {bulkBusy ? w.publishing : w.publishAll(counts.pending)}
            </button>
          ) : null
        }
      />

      <div className="tabs" role="tablist" aria-label={w.tabs}>
        {TABS.map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            className={`tab ${tab === value ? 'is-active' : ''}`}
            onClick={() => setTab(value)}
          >
            {value === 'all' ? w.all : t.wishStatus[value]} <span className="chip__count">{counts[value]}</span>
          </button>
        ))}
      </div>

      <section className={`wish-board ${visibleSelected.length ? 'has-bulk-bar' : ''}`}>
        {loading && !data ? <p className="panel__state">{w.loading}</p> : null}
        {error ? (
          <p className="panel__state">
            {w.loadError}{' '}
            <button type="button" className="link-button" onClick={() => void reload()}>
              {t.common.tryAgain}
            </button>
          </p>
        ) : null}
        {data && visible.length === 0 ? (
          <div className="panel">
            <EmptyState title={tab === 'pending' ? w.emptyPending : w.empty} body={tab === 'pending' ? w.emptyPendingBody : undefined} />
          </div>
        ) : null}

        {visible.length ? (
          <>
            <div className="wish-board__bar">
              <SelectAllBox total={visible.length} selected={visibleSelected.length} onToggle={toggleAll} label={w.selectAll} />
              <span className="wish-board__count">{w.count(visible.length)}</span>
            </div>

            <ul className="wish-cards">
              {visible.map((wish, index) => {
                const busy = busyIds.has(wish.id) || bulkBusy;
                const isSelected = selected.has(wish.id);
                const isPublic = wish.status === 'approved';
                return (
                  <li
                    key={wish.id}
                    className={`wish-card-row ${leaving.has(wish.id) ? 'is-leaving' : ''}`}
                    style={{ '--i': Math.min(index, 12) } as CSSProperties}
                  >
                    <article className={`wish-card wish-card--${wish.status} ${isSelected ? 'is-selected' : ''}`}>
                      <input
                        type="checkbox"
                        className="checkbox wish-card__check"
                        checked={isSelected}
                        onChange={() => undefined}
                        onClick={(e) => toggle(wish.id, e.shiftKey)}
                        aria-label={w.selectWish(wish.name)}
                      />
                      <div className="wish-card__body">
                        <header className="wish-card__head">
                          <span className="wish-card__name">{wish.name}</span>
                          <WishBadge status={wish.status} />
                          {wish.guestId ? <span className="badge badge--rsvp">{w.withRsvp}</span> : null}
                          <time className="wish-card__time" dateTime={wish.createdAt}>
                            {formatDate(wish.createdAt, lang)}
                          </time>
                        </header>
                        <p className="wish-card__message">{wish.message}</p>
                      </div>
                      <div className="wish-card__actions">
                        <button
                          type="button"
                          className={`ghost-circle ${isPublic ? '' : 'ghost-circle--public'}`}
                          disabled={busy}
                          onClick={() => changeStatus(wish, isPublic ? 'hidden' : 'approved')}
                          aria-label={`${isPublic ? w.hide : w.makePublic}: ${wish.name}`}
                          title={isPublic ? w.hide : w.show}
                        >
                          <Icon name={isPublic ? 'eye-off' : 'eye'} />
                        </button>
                        <button
                          type="button"
                          className="ghost-circle ghost-circle--danger"
                          disabled={busy}
                          onClick={() => setDeleting(wish)}
                          aria-label={w.deleteFrom(wish.name)}
                          title={t.common.delete}
                        >
                          <Icon name="trash" />
                        </button>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          </>
        ) : null}
      </section>

      {visibleSelected.length ? (
        <WishBulkBar
          count={visibleSelected.length}
          busy={bulkBusy}
          onPublic={() => void bulkStatus('approved')}
          onHide={() => void bulkStatus('hidden')}
          onDelete={() => setConfirmBulkDelete(true)}
          onClear={clearSelection}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        title={w.deleteTitle}
        message={w.deleteBody(deleting?.name ?? '')}
        confirmLabel={w.deleteConfirm}
        busy={deleting ? busyIds.has(deleting.id) : false}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
      <ConfirmDialog
        open={confirmBulkDelete}
        title={b.deleteTitle(visibleSelected.length)}
        message={b.deleteBody}
        confirmLabel={b.deleteConfirm(visibleSelected.length)}
        busy={bulkBusy}
        onConfirm={bulkDelete}
        onCancel={() => setConfirmBulkDelete(false)}
      />
    </>
  );
}
