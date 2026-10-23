import { useEffect, useRef, useState } from 'react';
import { GUEST_STATUSES, type GuestStatus } from '../../../shared/constants';
import type { Guest } from '../../../shared/types';
import { useAdminI18n } from '../i18n';
import { Icon } from './ui';

export type SortKey = 'name' | 'side' | 'pax' | 'status' | 'tableNumber';
export interface SortState {
  key: SortKey;
  dir: 'asc' | 'desc';
}

const STATUS_ORDER: Record<GuestStatus, number> = { confirmed: 0, pending: 1, declined: 2 };

export function sortGuests(guests: Guest[], sort: SortState): Guest[] {
  const factor = sort.dir === 'asc' ? 1 : -1;
  return [...guests].sort((a, b) => {
    let result = 0;
    switch (sort.key) {
      case 'pax':
        result = a.pax - b.pax;
        break;
      case 'status':
        result = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        break;
      case 'tableNumber':
        // Unassigned tables always sort last.
        if (!a.tableNumber || !b.tableNumber) return (a.tableNumber ? -1 : 1) - (b.tableNumber ? -1 : 1);
        result = a.tableNumber.localeCompare(b.tableNumber, undefined, { numeric: true });
        break;
      case 'side':
        result = a.side.localeCompare(b.side);
        break;
      default:
        result = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    }
    return result * factor || a.name.localeCompare(b.name);
  });
}

/** Click-to-edit table number; saves on Enter or blur. */
function TableCell({ guest, onSave }: { guest: Guest; onSave: (value: string) => Promise<void> }) {
  const { t } = useAdminI18n();
  const [value, setValue] = useState(guest.tableNumber);
  const [saving, setSaving] = useState(false);
  useEffect(() => setValue(guest.tableNumber), [guest.tableNumber]);

  const commit = async () => {
    const next = value.trim();
    if (next === guest.tableNumber) return;
    setSaving(true);
    try {
      await onSave(next);
    } catch {
      setValue(guest.tableNumber);
    } finally {
      setSaving(false);
    }
  };

  return (
    <input
      className={`table-input ${saving ? 'is-saving' : ''}`}
      value={value}
      maxLength={20}
      placeholder="—"
      aria-label={t.guests.tableFor(guest.name)}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') {
          setValue(guest.tableNumber);
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
}

function SelectAllBox({ total, selected, onToggleAll, label }: { total: number; selected: number; onToggleAll: () => void; label: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const all = total > 0 && selected === total;
  const some = selected > 0 && !all;
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = some;
  }, [some]);
  return (
    <input ref={ref} type="checkbox" className="checkbox" checked={all} onChange={onToggleAll} aria-label={label} disabled={!total} />
  );
}

interface Props {
  guests: Guest[];
  sort: SortState;
  onSort: (key: SortKey) => void;
  onEdit: (guest: Guest) => void;
  onDelete: (guest: Guest) => void;
  onPatch: (guest: Guest, patch: Partial<Pick<Guest, 'status' | 'tableNumber'>>) => Promise<void>;
  selected: Set<string>;
  /** shiftKey selects the range from the last clicked row. */
  onToggle: (id: string, shiftKey: boolean) => void;
  onToggleAll: () => void;
}

function SortHeader({ label, k, sort, onSort, className }: { label: string; k: SortKey; sort: SortState; onSort: (k: SortKey) => void; className?: string }) {
  const active = sort.key === k;
  return (
    <th className={className} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className={`th-sort ${active ? 'is-active' : ''}`} onClick={() => onSort(k)}>
        {label}
        <span className="th-sort__arrow" aria-hidden="true">
          {active ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </button>
    </th>
  );
}

export function GuestTable({ guests, sort, onSort, onEdit, onDelete, onPatch, selected, onToggle, onToggleAll }: Props) {
  const { t } = useAdminI18n();
  const c = t.guests.columns;
  const selectedVisible = guests.filter((g) => selected.has(g.id)).length;

  return (
    <div className="table-wrap">
      <label className="mobile-select-all">
        <SelectAllBox total={guests.length} selected={selectedVisible} onToggleAll={onToggleAll} label={t.guests.selectAll} />
        <span>{t.guests.selectAllShort}</span>
      </label>
      <table className="guest-table">
        <thead>
          <tr>
            <th className="select-col">
              <SelectAllBox total={guests.length} selected={selectedVisible} onToggleAll={onToggleAll} label={t.guests.selectAll} />
            </th>
            <SortHeader label={c.name} k="name" sort={sort} onSort={onSort} />
            <SortHeader label={c.side} k="side" sort={sort} onSort={onSort} />
            <th>{c.contact}</th>
            <SortHeader label={c.pax} k="pax" sort={sort} onSort={onSort} className="num" />
            <SortHeader label={c.status} k="status" sort={sort} onSort={onSort} />
            <SortHeader label={c.table} k="tableNumber" sort={sort} onSort={onSort} />
            <th className="actions-col">
              <span className="visually-hidden">{t.common.actions}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {guests.map((guest) => {
            const isSelected = selected.has(guest.id);
            return (
              <tr key={guest.id} className={isSelected ? 'is-selected' : undefined}>
                <td className="select-col">
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={isSelected}
                    aria-label={t.guests.select(guest.name)}
                    onClick={(e) => onToggle(guest.id, e.shiftKey)}
                    onChange={() => {}}
                  />
                </td>
                <td data-label={t.guests.mobileGuest} className="cell-name">
                  <span className="cell-name__name">{guest.name}</span>
                  {guest.dietary !== 'none' ? (
                    <span className="cell-name__meta">
                      {t.dietary[guest.dietary]}
                      {guest.dietaryNote ? `: ${guest.dietaryNote}` : ''}
                    </span>
                  ) : null}
                  {guest.notes ? <span className="cell-name__meta cell-name__meta--note">{guest.notes}</span> : null}
                </td>
                <td data-label={c.side}>
                  <span className={`side side--${guest.side}`}>{t.side[guest.side]}</span>
                </td>
                <td data-label={c.contact} className="cell-contact">
                  {guest.phone ? (
                    <a href={`tel:${guest.phone.replace(/[^\d+]/g, '')}`}>{guest.phone}</a>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td data-label={c.pax} className="num">
                  {guest.pax}
                </td>
                <td data-label={c.status}>
                  <select
                    className={`status-select status-select--${guest.status}`}
                    value={guest.status}
                    aria-label={t.guests.statusFor(guest.name)}
                    onChange={(e) => onPatch(guest, { status: e.target.value as GuestStatus }).catch(() => {})}
                  >
                    {GUEST_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {t.status[s]}
                      </option>
                    ))}
                  </select>
                </td>
                <td data-label={c.table}>
                  <TableCell guest={guest} onSave={(tableNumber) => onPatch(guest, { tableNumber })} />
                </td>
                <td className="actions-col">
                  <div className="row-actions">
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => onEdit(guest)}
                      aria-label={t.guests.editGuest(guest.name)}
                      title={t.common.edit}
                    >
                      <Icon name="edit" />
                    </button>
                    <button
                      type="button"
                      className="icon-button icon-button--danger"
                      onClick={() => onDelete(guest)}
                      aria-label={t.guests.deleteGuest(guest.name)}
                      title={t.common.delete}
                    >
                      <Icon name="trash" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
