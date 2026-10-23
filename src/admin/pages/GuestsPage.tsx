import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import type { GuestStatus, Side } from '../../../shared/constants';
import type { Guest } from '../../../shared/types';
import { adminApi } from '../api';
import { BulkActionBar } from '../components/BulkActionBar';
import { ExportMenu } from '../components/ExportMenu';
import { GuestDialog } from '../components/GuestDialog';
import { GuestTable, type SortKey, type SortState, sortGuests } from '../components/GuestTable';
import { PageHeader } from '../components/Shell';
import { ConfirmDialog, EmptyState, Icon } from '../components/ui';
import { useResource, useToast } from '../hooks';
import { useAdminI18n } from '../i18n';

const STATUS_FILTERS: (GuestStatus | '')[] = ['', 'confirmed', 'pending', 'declined'];

export function GuestsPage({ onChanged }: { onChanged: () => void }) {
  const { t } = useAdminI18n();
  const toast = useToast();
  const { data, setData, error, loading, reload } = useResource(adminApi.guests);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [side, setSide] = useState<Side | ''>('');
  // A metric card on the overview can open this page pre-filtered, e.g. /admin/guests?status=pending
  const [status, setStatus] = useState<GuestStatus | ''>(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('status');
    return fromUrl === 'confirmed' || fromUrl === 'pending' || fromUrl === 'declined' ? fromUrl : '';
  });
  const [sort, setSort] = useState<SortState>({ key: 'name', dir: 'asc' });
  const [editing, setEditing] = useState<Guest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<Guest | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // Multi-select
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const lastClicked = useRef<string | null>(null);

  const guests = data ?? [];

  const counts = useMemo(() => {
    const scoped = guests.filter((g) => !side || g.side === side);
    return {
      '': scoped.length,
      confirmed: scoped.filter((g) => g.status === 'confirmed').length,
      pending: scoped.filter((g) => g.status === 'pending').length,
      declined: scoped.filter((g) => g.status === 'declined').length,
    } as Record<GuestStatus | '', number>;
  }, [guests, side]);

  const visible = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    const filtered = guests.filter(
      (g) =>
        (!side || g.side === side) &&
        (!status || g.status === status) &&
        (!q ||
          g.name.toLowerCase().includes(q) ||
          g.tableNumber.toLowerCase() === q ||
          (digits.length >= 3 && g.phone.replace(/\D/g, '').includes(digits))),
    );
    return sortGuests(filtered, sort);
  }, [guests, deferredSearch, side, status, sort]);

  // Selection only ever covers rows you can see, so bulk actions never touch hidden guests.
  useEffect(() => {
    setSelected((current) => {
      if (!current.size) return current;
      const visibleIds = new Set(visible.map((g) => g.id));
      const next = new Set([...current].filter((id) => visibleIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [visible]);

  const toggle = (id: string, shiftKey: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      const turnOn = !current.has(id);
      const from = shiftKey && lastClicked.current ? visible.findIndex((g) => g.id === lastClicked.current) : -1;
      const to = visible.findIndex((g) => g.id === id);
      if (from !== -1 && to !== -1) {
        const [a, b] = from < to ? [from, to] : [to, from];
        for (const g of visible.slice(a, b + 1)) turnOn ? next.add(g.id) : next.delete(g.id);
      } else if (turnOn) next.add(id);
      else next.delete(id);
      return next;
    });
    lastClicked.current = id;
  };

  const toggleAll = () =>
    setSelected((current) =>
      visible.length && visible.every((g) => current.has(g.id)) ? new Set() : new Set(visible.map((g) => g.id)),
    );

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const visiblePax = visible.reduce((sum, g) => sum + g.pax, 0);

  const onSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'pax' ? 'desc' : 'asc' }));

  const refresh = () => {
    void reload();
    onChanged();
  };

  const patch = async (guest: Guest, change: Partial<Pick<Guest, 'status' | 'tableNumber'>>) => {
    const previous = guests;
    setData(guests.map((g) => (g.id === guest.id ? { ...g, ...change } : g))); // optimistic
    try {
      const saved = await adminApi.updateGuest(guest.id, change);
      setData((list) => (list ?? []).map((g) => (g.id === saved.id ? saved : g)));
      onChanged();
    } catch (e) {
      setData(previous);
      toast(e instanceof Error ? e.message : t.guests.saveFailed, 'error');
      throw e;
    }
  };

  const bulkUpdate = async (change: { status?: GuestStatus; tableNumber?: string }, message: string) => {
    const ids = [...selected];
    setBulkBusy(true);
    try {
      await adminApi.updateGuests(ids, change);
      await reload();
      onChanged();
      toast(message);
    } catch {
      toast(t.bulk.failed, 'error');
    } finally {
      setBulkBusy(false);
    }
  };

  const assignTable = (table: string) =>
    bulkUpdate({ tableNumber: table }, table ? t.bulk.tableAssigned(table, selected.size) : t.bulk.tableCleared(selected.size));

  const updateStatus = (next: GuestStatus) =>
    bulkUpdate({ status: next }, t.bulk.statusChanged(selected.size, t.status[next]));

  const confirmBulkDelete = async () => {
    const ids = [...selected];
    setBulkBusy(true);
    try {
      const { deleted } = await adminApi.deleteGuests(ids);
      setData(guests.filter((g) => !selected.has(g.id)));
      setSelected(new Set());
      setBulkDeleteOpen(false);
      onChanged();
      toast(t.bulk.deleted(deleted));
    } catch {
      toast(t.bulk.failed, 'error');
    } finally {
      setBulkBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await adminApi.deleteGuest(deleting.id);
      toast(t.guests.deleted(deleting.name));
      setData(guests.filter((g) => g.id !== deleting.id));
      onChanged();
      setDeleting(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : t.guests.deleteFailed, 'error');
    } finally {
      setDeleteBusy(false);
    }
  };

  const filtersActive = Boolean(search || side || status);
  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  return (
    <>
      <PageHeader
        title={t.guests.title}
        subtitle={t.guests.subtitle}
        actions={
          <>
            <ExportMenu filter={{ search, side, status }} />
            <button type="button" className="btn btn--primary" onClick={openAdd}>
              <Icon name="plus" /> {t.guests.add}
            </button>
          </>
        }
      />

      <div className="toolbar">
        <label className="search">
          <Icon name="search" />
          <span className="visually-hidden">{t.guests.searchLabel}</span>
          <input type="search" placeholder={t.guests.search} value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <select
          className="a-input toolbar__select"
          value={side}
          onChange={(e) => setSide(e.target.value as Side | '')}
          aria-label={t.guests.sideFilter}
        >
          <option value="">{t.side.both}</option>
          <option value="groom">{t.side.groomSide}</option>
          <option value="bride">{t.side.brideSide}</option>
        </select>
        <div className="chips" role="group" aria-label={t.guests.statusFilter}>
          {STATUS_FILTERS.map((value) => (
            <button
              key={value || 'all'}
              type="button"
              className={`chip ${status === value ? 'is-active' : ''}`}
              aria-pressed={status === value}
              onClick={() => setStatus(value)}
            >
              {value ? t.status[value] : t.guests.all} <span className="chip__count">{counts[value]}</span>
            </button>
          ))}
        </div>
      </div>

      <section className={`panel panel--flush ${selected.size ? 'has-bulk-bar' : ''}`}>
        {loading && !data ? <p className="panel__state">{t.guests.loading}</p> : null}
        {error ? (
          <p className="panel__state">
            {t.guests.loadError}{' '}
            <button type="button" className="link-button" onClick={() => void reload()}>
              {t.common.tryAgain}
            </button>
          </p>
        ) : null}
        {data && guests.length === 0 ? (
          <EmptyState
            title={t.guests.emptyTitle}
            body={t.guests.emptyBody}
            action={
              <button type="button" className="btn btn--primary" onClick={openAdd}>
                <Icon name="plus" /> {t.guests.add}
              </button>
            }
          />
        ) : null}
        {data && guests.length > 0 && visible.length === 0 ? (
          <EmptyState
            title={t.guests.noMatch}
            action={
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => {
                  setSearch('');
                  setSide('');
                  setStatus('');
                }}
              >
                {t.guests.clearFilters}
              </button>
            }
          />
        ) : null}
        {visible.length ? (
          <>
            <GuestTable
              guests={visible}
              sort={sort}
              onSort={onSort}
              onEdit={(g) => {
                setEditing(g);
                setDialogOpen(true);
              }}
              onDelete={setDeleting}
              onPatch={patch}
              selected={selected}
              onToggle={toggle}
              onToggleAll={toggleAll}
            />
            <p className="table-summary">{t.guests.summary(visible.length, visiblePax, filtersActive ? guests.length : null)}</p>
          </>
        ) : null}
      </section>

      {selected.size ? (
        <BulkActionBar
          count={selected.size}
          busy={bulkBusy}
          onAssignTable={assignTable}
          onUpdateStatus={updateStatus}
          onDelete={() => setBulkDeleteOpen(true)}
          onClear={clearSelection}
        />
      ) : null}

      <GuestDialog open={dialogOpen} guest={editing} onClose={() => setDialogOpen(false)} onSaved={refresh} />
      <ConfirmDialog
        open={Boolean(deleting)}
        title={t.guests.deleteTitle}
        message={
          <>
            <strong>{deleting?.name}</strong> {t.guests.deleteBody}
          </>
        }
        confirmLabel={t.guests.deleteConfirm}
        busy={deleteBusy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
      <ConfirmDialog
        open={bulkDeleteOpen}
        title={t.bulk.deleteTitle(selected.size)}
        message={t.bulk.deleteBody}
        confirmLabel={t.bulk.deleteConfirm(selected.size)}
        busy={bulkBusy}
        onConfirm={confirmBulkDelete}
        onCancel={() => setBulkDeleteOpen(false)}
      />
    </>
  );
}
