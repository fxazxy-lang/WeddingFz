import { type FormEvent, useState } from 'react';
import { DIETARY_OPTIONS, type Dietary, MAX_PAX_PER_RSVP, type Side } from '../../../shared/constants';
import { PHONE_PATTERN } from '../../../shared/phone';
import { wedding } from '../../config/wedding';
import { useI18n } from '../../i18n/I18nProvider';
import { request, RequestError } from '../../lib/api';
import { formatLongDate } from '../../lib/format';
import { readStored, writeStored } from '../../lib/storage';
import { ChoiceGroup, Field, Stepper } from './form/fields';
import { SectionHeading } from './SectionHeading';

interface FormState {
  name: string;
  phone: string;
  side: Side | null;
  attending: 'yes' | 'no' | null;
  pax: number;
  dietary: Dietary;
  dietaryNote: string;
  message: string;
  website: string; // honeypot
}

type ErrorKey = 'name' | 'phone' | 'side' | 'attending' | 'pax';
type Errors = Partial<Record<ErrorKey, string>>;

interface RsvpResponse {
  ok: boolean;
  updated: boolean;
  wishStatus: 'pending' | 'approved' | null;
}

const STORAGE_KEY = 'rsvp-draft';
const EMPTY: FormState = {
  name: '',
  phone: '',
  side: null,
  attending: null,
  pax: 1,
  dietary: 'none',
  dietaryNote: '',
  message: '',
  website: '',
};

export function RsvpForm() {
  const { t, lang, n } = useI18n();
  const [form, setForm] = useState<FormState>(() => ({ ...EMPTY, ...readStored<Partial<FormState>>(STORAGE_KEY), website: '' }));
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<RsvpResponse | null>(null);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = (): Errors => {
    const next: Errors = {};
    if (form.name.trim().length < 2) next.name = t.rsvp.errors.name;
    if (!PHONE_PATTERN.test(form.phone.trim())) next.phone = t.rsvp.errors.phone;
    if (!form.side) next.side = t.rsvp.errors.side;
    if (!form.attending) next.attending = t.rsvp.errors.attending;
    if (form.attending === 'yes' && (form.pax < 1 || form.pax > MAX_PAX_PER_RSVP)) next.pax = t.rsvp.errors.pax;
    return next;
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) {
      const first = Object.keys(found)[0];
      document.querySelector<HTMLElement>(`[data-field="${first}"] input, [data-field="${first}"] button`)?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const response = await request<RsvpResponse>('/api/rsvp', {
        method: 'POST',
        json: {
          name: form.name,
          phone: form.phone,
          side: form.side,
          attending: form.attending === 'yes',
          pax: form.attending === 'yes' ? form.pax : 0,
          dietary: form.dietary,
          dietaryNote: form.dietary === 'none' ? '' : form.dietaryNote,
          message: form.message,
          website: form.website,
        },
      });
      // Keep contact details for "change my reply"; the blessing was already sent.
      writeStored(STORAGE_KEY, { ...form, message: '', website: '' });
      setResult(response);
    } catch (error) {
      if (error instanceof RequestError) {
        if (error.status === 0) setFormError(t.rsvp.errors.network);
        else if (error.status === 429) setFormError(t.rsvp.errors.rateLimited);
        else if (error.fieldErrors) {
          const mapped: Errors = {};
          for (const key of Object.keys(error.fieldErrors)) {
            if (key in t.rsvp.errors) mapped[key as ErrorKey] = t.rsvp.errors[key as ErrorKey];
          }
          setErrors(mapped);
          setFormError(t.rsvp.errors.generic);
        } else setFormError(t.rsvp.errors.generic);
      } else setFormError(t.rsvp.errors.generic);
    } finally {
      setSubmitting(false);
    }
  };

  const deadline = formatLongDate(lang, wedding.rsvpDeadline, false);
  const firstName = form.name.trim();

  return (
    <section className="section rsvp" id="rsvp" aria-labelledby="rsvp-title">
      <div className="container rsvp__layout">
        <div className="rsvp__intro">
          <SectionHeading id="rsvp-title" title={t.rsvp.title} intro={t.rsvp.intro(deadline)} />
        </div>

        <div className="rsvp__card">
          {result ? (
            <div className="rsvp__success" role="status">
              <svg className="rsvp__success-mark" width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
                <circle cx="28" cy="28" r="26.5" stroke="currentColor" strokeWidth="1.2" />
                <path d="M18 29l7 7 13-15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="rsvp__success-title">
                {form.attending === 'yes' ? t.rsvp.successYes(firstName) : t.rsvp.successNo(firstName)}
              </p>
              {result.updated ? <p className="rsvp__success-note">{t.rsvp.updatedNote}</p> : null}
              {result.wishStatus === 'pending' ? <p className="rsvp__success-note">{t.rsvp.wishPending}</p> : null}
              <button type="button" className="button button--ghost" onClick={() => setResult(null)}>
                {t.rsvp.editAnswer}
              </button>
            </div>
          ) : (
            <form className="form" onSubmit={onSubmit} noValidate>
              <div className="form__row form__row--2">
                <div data-field="name">
                  <Field label={t.rsvp.name} error={errors.name}>
                    {({ id, describedBy, invalid }) => (
                      <input
                        id={id}
                        className="input"
                        type="text"
                        autoComplete="name"
                        maxLength={80}
                        placeholder={t.rsvp.namePlaceholder}
                        value={form.name}
                        onChange={(e) => update('name', e.target.value)}
                        aria-invalid={invalid}
                        aria-describedby={describedBy}
                      />
                    )}
                  </Field>
                </div>
                <div data-field="phone">
                  <Field label={t.rsvp.phone} hint={t.rsvp.phoneHint} error={errors.phone}>
                    {({ id, describedBy, invalid }) => (
                      <input
                        id={id}
                        className="input"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        maxLength={20}
                        placeholder="012 345 678"
                        value={form.phone}
                        onChange={(e) => update('phone', e.target.value)}
                        aria-invalid={invalid}
                        aria-describedby={describedBy}
                      />
                    )}
                  </Field>
                </div>
              </div>

              <div data-field="side">
                <ChoiceGroup<Side>
                  legend={t.rsvp.side}
                  name="side"
                  value={form.side}
                  onChange={(v) => update('side', v)}
                  error={errors.side}
                  options={[
                    { value: 'groom', label: t.rsvp.groomSide },
                    { value: 'bride', label: t.rsvp.brideSide },
                  ]}
                />
              </div>

              <div data-field="attending">
                <ChoiceGroup<'yes' | 'no'>
                  legend={t.rsvp.attending}
                  name="attending"
                  variant="card"
                  value={form.attending}
                  onChange={(v) => update('attending', v)}
                  error={errors.attending}
                  options={[
                    {
                      value: 'yes',
                      label: t.rsvp.yes,
                      icon: (
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                          <path
                            d="M10 17s-6.5-3.9-6.5-8.6A3.6 3.6 0 0 1 10 6.2a3.6 3.6 0 0 1 6.5 2.2C16.5 13.1 10 17 10 17z"
                            stroke="currentColor"
                            strokeWidth="1.3"
                          />
                        </svg>
                      ),
                    },
                    {
                      value: 'no',
                      label: t.rsvp.no,
                      icon: (
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                          <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.3" />
                          <path d="M7 13c1.6-1.4 4.4-1.4 6 0M7.5 8h.01M12.5 8h.01" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                        </svg>
                      ),
                    },
                  ]}
                />
              </div>

              {form.attending === 'yes' ? (
                <div className="form__reveal">
                  <div className="form__row form__row--2">
                    <div data-field="pax">
                      <Field label={t.rsvp.pax} hint={t.rsvp.paxHint} error={errors.pax}>
                        {({ id, describedBy }) => (
                          <Stepper
                            id={id}
                            value={form.pax}
                            min={1}
                            max={MAX_PAX_PER_RSVP}
                            onChange={(v) => update('pax', v)}
                            format={(v) => n(v)}
                            decreaseLabel={t.rsvp.decrease}
                            increaseLabel={t.rsvp.increase}
                            describedBy={describedBy}
                          />
                        )}
                      </Field>
                    </div>
                    <Field label={t.rsvp.dietary}>
                      {({ id }) => (
                        <div className="select">
                          <select
                            id={id}
                            className="input"
                            value={form.dietary}
                            onChange={(e) => update('dietary', e.target.value as Dietary)}
                          >
                            {DIETARY_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {t.rsvp.dietaryOptions[option]}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </Field>
                  </div>
                  {form.dietary !== 'none' ? (
                    <Field label={t.rsvp.dietaryNote} optionalLabel={t.rsvp.optional}>
                      {({ id }) => (
                        <input
                          id={id}
                          className="input"
                          type="text"
                          maxLength={200}
                          placeholder={t.rsvp.dietaryNotePlaceholder}
                          value={form.dietaryNote}
                          onChange={(e) => update('dietaryNote', e.target.value)}
                        />
                      )}
                    </Field>
                  ) : null}
                </div>
              ) : null}

              <Field label={t.rsvp.message} optionalLabel={t.rsvp.optional}>
                {({ id }) => (
                  <div className="textarea-wrap">
                    <textarea
                      id={id}
                      className="input input--textarea"
                      rows={4}
                      maxLength={500}
                      placeholder={t.rsvp.messagePlaceholder}
                      value={form.message}
                      onChange={(e) => update('message', e.target.value)}
                    />
                    <span className="textarea-wrap__count" aria-hidden="true">
                      {n(form.message.length)}/{n(500)}
                    </span>
                  </div>
                )}
              </Field>

              {/* Honeypot for bots: hidden from people and assistive tech. */}
              <div className="visually-hidden" aria-hidden="true">
                <label>
                  Website
                  <input
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.website}
                    onChange={(e) => update('website', e.target.value)}
                  />
                </label>
              </div>

              {formError ? (
                <p className="form__error" role="alert">
                  {formError}
                </p>
              ) : null}

              <button type="submit" className="button button--primary button--block" disabled={submitting}>
                {submitting ? t.rsvp.submitting : t.rsvp.submit}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
