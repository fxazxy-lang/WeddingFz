import { type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  DIETARY_OPTIONS,
  type Dietary,
  GUEST_STATUSES,
  type GuestStatus,
  type Side,
} from '../../../shared/constants';
import type { GuestCreateInput } from '../../../shared/schemas';
import type { Guest } from '../../../shared/types';
import { RequestError } from '../../lib/api';
import { adminApi } from '../api';
import { useToast } from '../hooks';
import { useAdminI18n } from '../i18n';
import { Dialog } from './ui';

interface Props {
  open: boolean;
  guest: Guest | null; // null = add
  onClose: () => void;
  onSaved: () => void;
}

const blank: GuestCreateInput = {
  name: '',
  phone: '',
  side: 'groom',
  status: 'pending',
  pax: 1,
  dietary: 'none',
  dietaryNote: '',
  tableNumber: '',
  notes: '',
};

/** Parse pasted rows: "Name, Phone, Side, Pax" (comma or tab separated, as copied from Excel). */
export function parseGuestList(text: string, defaultSide: Side): GuestCreateInput[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/\t|,/).map((cell) => cell.trim()))
    .filter(([name]) => name && !/^(name|guest name|ឈ្មោះ)$/i.test(name))
    .map(([name, phone = '', side = '', pax = '']) => ({
      ...blank,
      name: name.slice(0, 120),
      phone: /^[+\d][\d\s().-]{5,19}$/.test(phone) ? phone : '',
      side: /bride|ក្រមុំ|ស្រី/i.test(side) ? 'bride' : /groom|កំលោះ|ប្រុស/i.test(side) ? 'groom' : defaultSide,
      pax: Math.min(Math.max(parseInt(pax, 10) || 1, 0), 50),
    }));
}

export function GuestDialog({ open, guest, onClose, onSaved }: Props) {
  const { t } = useAdminI18n();
  const d = t.dialog;
  const toast = useToast();
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [form, setForm] = useState<GuestCreateInput>(blank);
  const [bulkText, setBulkText] = useState('');
  const [bulkSide, setBulkSide] = useState<Side>('groom');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode('single');
    setErrors({});
    setBulkText('');
    setForm(
      guest
        ? {
            name: guest.name,
            phone: guest.phone,
            side: guest.side,
            status: guest.status,
            pax: guest.pax,
            dietary: guest.dietary,
            dietaryNote: guest.dietaryNote,
            tableNumber: guest.tableNumber,
            notes: guest.notes,
          }
        : blank,
    );
  }, [open, guest]);

  const parsed = useMemo(() => parseGuestList(bulkText, bulkSide), [bulkText, bulkSide]);

  const set = <K extends keyof GuestCreateInput>(key: K, value: GuestCreateInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === 'bulk') {
        if (!parsed.length) {
          setErrors({ bulk: d.pasteEmpty });
          return;
        }
        const result = await adminApi.createGuests(parsed);
        toast(d.addedMany(result.created, result.skipped.length));
      } else {
        if (!form.name.trim()) {
          setErrors({ name: d.nameRequired });
          return;
        }
        if (guest) {
          await adminApi.updateGuest(guest.id, form);
          toast(d.saved(form.name));
        } else {
          await adminApi.createGuest(form);
          toast(d.added(form.name));
        }
      }
      onSaved();
      onClose();
    } catch (error) {
      if (error instanceof RequestError && error.fieldErrors) {
        setErrors(Object.fromEntries(Object.entries(error.fieldErrors).map(([k, v]) => [k, v[0]])));
      } else {
        toast(error instanceof Error ? error.message : d.saveFailed, 'error');
      }
    } finally {
      setBusy(false);
    }
  };

  const title = guest ? d.editTitle(guest.name) : d.addTitle;

  return (
    <Dialog
      open={open}
      title={title}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            {t.common.cancel}
          </button>
          <button type="submit" form="guest-form" className="btn btn--primary" disabled={busy}>
            {busy ? t.common.saving : guest ? d.save : mode === 'bulk' ? d.addMany(parsed.length) : d.addOne}
          </button>
        </>
      }
    >
      {!guest ? (
        <div className="segmented" role="tablist" aria-label={d.howToAdd}>
          <button type="button" role="tab" aria-selected={mode === 'single'} onClick={() => setMode('single')}>
            {d.one}
          </button>
          <button type="button" role="tab" aria-selected={mode === 'bulk'} onClick={() => setMode('bulk')}>
            {d.paste}
          </button>
        </div>
      ) : null}

      <form id="guest-form" onSubmit={submit} noValidate>
        {mode === 'bulk' && !guest ? (
          <div className="a-form">
            <label className="a-field">
              <span className="a-field__label">{d.pasteLabel}</span>
              <textarea
                className="a-input a-input--textarea"
                rows={8}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={'Sok Dara, 012 345 678, groom, 2\nLim Bopha, 093 111 222, bride, 4\nUncle Rithy & family'}
              />
              <span className="a-field__hint">{d.pasteHint}</span>
            </label>
            <label className="a-field a-field--inline">
              <span className="a-field__label">{d.pasteSide}</span>
              <select className="a-input" value={bulkSide} onChange={(e) => setBulkSide(e.target.value as Side)}>
                <option value="groom">{t.side.groomSide}</option>
                <option value="bride">{t.side.brideSide}</option>
              </select>
            </label>
            {errors.bulk ? <p className="a-error">{errors.bulk}</p> : null}
            {parsed.length ? (
              <p className="a-field__hint">{d.ready(parsed.length, parsed.reduce((sum, g) => sum + g.pax, 0))}</p>
            ) : null}
          </div>
        ) : (
          <div className="a-form a-form--grid">
            <label className="a-field a-field--wide">
              <span className="a-field__label">{d.name}</span>
              <input
                className="a-input"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                aria-invalid={Boolean(errors.name)}
                autoFocus
              />
              {errors.name ? <span className="a-error">{errors.name}</span> : null}
            </label>
            <label className="a-field">
              <span className="a-field__label">{d.phone}</span>
              <input
                className="a-input"
                type="tel"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                aria-invalid={Boolean(errors.phone)}
              />
              {errors.phone ? <span className="a-error">{errors.phone}</span> : null}
            </label>
            <label className="a-field">
              <span className="a-field__label">{d.side}</span>
              <select className="a-input" value={form.side} onChange={(e) => set('side', e.target.value as Side)}>
                <option value="groom">{t.side.groomSide}</option>
                <option value="bride">{t.side.brideSide}</option>
              </select>
            </label>
            <label className="a-field">
              <span className="a-field__label">{d.status}</span>
              <select
                className="a-input"
                value={form.status}
                onChange={(e) => set('status', e.target.value as GuestStatus)}
              >
                {GUEST_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t.status[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="a-field">
              <span className="a-field__label">{d.pax}</span>
              <input
                className="a-input"
                type="number"
                min={0}
                max={50}
                value={form.pax}
                onChange={(e) => set('pax', Math.max(0, Math.min(50, Number(e.target.value) || 0)))}
              />
            </label>
            <label className="a-field">
              <span className="a-field__label">{d.table}</span>
              <input
                className="a-input"
                value={form.tableNumber}
                maxLength={20}
                placeholder={d.tablePlaceholder}
                onChange={(e) => set('tableNumber', e.target.value)}
              />
            </label>
            <label className="a-field">
              <span className="a-field__label">{d.dietary}</span>
              <select
                className="a-input"
                value={form.dietary}
                onChange={(e) => set('dietary', e.target.value as Dietary)}
              >
                {DIETARY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {t.dietary[opt]}
                  </option>
                ))}
              </select>
            </label>
            {form.dietary !== 'none' ? (
              <label className="a-field a-field--wide">
                <span className="a-field__label">{d.dietaryNote}</span>
                <input
                  className="a-input"
                  value={form.dietaryNote}
                  maxLength={200}
                  onChange={(e) => set('dietaryNote', e.target.value)}
                />
              </label>
            ) : null}
            <label className="a-field a-field--wide">
              <span className="a-field__label">{d.notes}</span>
              <textarea
                className="a-input a-input--textarea"
                rows={2}
                maxLength={500}
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
              />
            </label>
          </div>
        )}
      </form>
    </Dialog>
  );
}
