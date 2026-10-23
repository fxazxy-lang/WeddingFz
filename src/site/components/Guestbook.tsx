import { type FormEvent, type PointerEvent as ReactPointerEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { PublicWish } from '../../../shared/types';
import { useI18n } from '../../i18n/I18nProvider';
import { request, RequestError } from '../../lib/api';
import { formatRelative } from '../../lib/format';
import { Field } from './form/fields';
import { SectionHeading } from './SectionHeading';

interface Page {
  items: PublicWish[];
  nextCursor: string | null;
}

/** Wishes fetched per request (the server's maximum). */
const FETCH_SIZE = 50;
/** Stop after this many, so a very busy guestbook can't make the page heavy. */
const MAX_WISHES = 300;
/** Marquee speed in pixels per second (about 35 s per loop for 6 cards on a desktop). */
const SPEED = 60;
/** With at least this many wishes, show two rows moving in opposite directions. */
const TWO_ROWS_FROM = 6;
/** After a touch, keep the cards still this long so the wish can be read. */
const TOUCH_HOLD_MS = 2500;

/* ---------- "Leave a Wish" dialog ---------- */

function WishDialog({ open, onClose, onPosted }: { open: boolean; onClose: () => void; onPosted: (wish: PublicWish | null) => void }) {
  const { t, n } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<{ name?: string; message?: string }>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'posted' | 'pending' | 'error'>('idle');
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setStatus('idle');
      setErrors({});
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const next: typeof errors = {};
    if (name.trim().length < 2) next.name = t.wishes.errors.name;
    if (message.trim().length < 3) next.message = t.wishes.errors.message;
    setErrors(next);
    if (Object.keys(next).length) return;

    setStatus('sending');
    try {
      const response = await request<{ status: 'pending' | 'approved'; wish: PublicWish | null }>('/api/wishes', {
        method: 'POST',
        json: { name, message, website },
      });
      setMessage('');
      setStatus(response.status === 'approved' ? 'posted' : 'pending');
      onPosted(response.wish);
    } catch (error) {
      setStatus('error');
      if (error instanceof RequestError && error.status === 429) setErrorText(t.rsvp.errors.rateLimited);
      else if (error instanceof RequestError && error.status === 0) setErrorText(t.rsvp.errors.network);
      else setErrorText(t.rsvp.errors.generic);
    }
  };

  const done = status === 'posted' || status === 'pending';

  return (
    <dialog
      ref={ref}
      className="wish-dialog"
      aria-labelledby="wish-dialog-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(); // click on the backdrop
      }}
    >
      <div className="wish-dialog__panel">
        <button type="button" className="wish-dialog__close" onClick={onClose} aria-label={t.wishes.close}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M4.5 4.5l9 9M13.5 4.5l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        {done ? (
          <div className="wish-dialog__done" role="status">
            <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden="true">
              <circle cx="26" cy="26" r="24.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M26 36s-9-5.4-9-11.9A5 5 0 0 1 26 21a5 5 0 0 1 9 3.1C35 30.6 26 36 26 36z" stroke="currentColor" strokeWidth="1.3" />
            </svg>
            <p className="wish-dialog__done-text">{status === 'posted' ? t.wishes.posted : t.wishes.pending}</p>
            <button type="button" className="button button--primary" onClick={onClose}>
              {t.wishes.done}
            </button>
          </div>
        ) : (
          <form className="wish-dialog__form" onSubmit={onSubmit} noValidate>
            <h3 id="wish-dialog-title" className="wish-dialog__title">
              {t.wishes.dialogTitle}
            </h3>
            <p className="wish-dialog__intro">{t.wishes.intro}</p>
            <Field label={t.wishes.name} error={errors.name}>
              {({ id, describedBy, invalid }) => (
                <input
                  id={id}
                  className="input"
                  type="text"
                  autoComplete="name"
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-invalid={invalid}
                  aria-describedby={describedBy}
                  autoFocus
                />
              )}
            </Field>
            <Field label={t.wishes.message} error={errors.message}>
              {({ id, describedBy, invalid }) => (
                <div className="textarea-wrap">
                  <textarea
                    id={id}
                    className="input input--textarea"
                    rows={4}
                    maxLength={500}
                    placeholder={t.wishes.messagePlaceholder}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    aria-invalid={invalid}
                    aria-describedby={describedBy}
                  />
                  <span className="textarea-wrap__count" aria-hidden="true">
                    {n(message.length)}/{n(500)}
                  </span>
                </div>
              )}
            </Field>
            {/* Honeypot for bots */}
            <div className="visually-hidden" aria-hidden="true">
              <input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </div>
            {status === 'error' ? (
              <p className="form__error" role="alert">
                {errorText}
              </p>
            ) : null}
            <button type="submit" className="button button--primary button--block" disabled={status === 'sending'}>
              {status === 'sending' ? t.wishes.submitting : t.wishes.submit}
            </button>
          </form>
        )}
      </div>
    </dialog>
  );
}

/* ---------- Section ---------- */

function WishCard({ wish, lang }: { wish: PublicWish; lang: 'km' | 'en' }) {
  return (
    <>
      <blockquote className="wish__message">{wish.message}</blockquote>
      <p className="wish__meta">
        <span className="wish__name">{wish.name}</span>
        <time className="wish__time" dateTime={wish.createdAt}>
          {formatRelative(lang, wish.createdAt)}
        </time>
      </p>
    </>
  );
}

/**
 * One endlessly scrolling row. The wishes are repeated until one copy is wider than the
 * screen, then that copy is rendered twice; the track slides left by exactly one copy and
 * starts again, so the loop has no visible jump.
 */
function MarqueeRow({ wishes, width, slot, reverse, lang }: { wishes: PublicWish[]; width: number; slot: number; reverse: boolean; lang: 'km' | 'en' }) {
  const repeats = Math.max(1, Math.ceil(width / Math.max(1, wishes.length * slot)));
  const copy = Array.from({ length: repeats }, () => wishes).flat();
  const copyWidth = copy.length * slot;
  const duration = (copyWidth / SPEED) * (reverse ? 1.12 : 1);

  return (
    <div className="marquee__row">
      <ul
        className={`marquee__track ${reverse ? 'marquee__track--reverse' : ''}`}
        style={{ animationDuration: `${duration.toFixed(1)}s` }}
      >
        {[0, 1].map((half) =>
          copy.map((wish, i) => {
            // Only the first appearance of each wish is announced to screen readers.
            const duplicate = half === 1 || i >= wishes.length;
            return (
              <li className="wish marquee__card" key={`${half}-${i}-${wish.id}`} aria-hidden={duplicate || undefined}>
                <WishCard wish={wish} lang={lang} />
              </li>
            );
          }),
        )}
      </ul>
    </div>
  );
}

/** Lower-case, accent-tolerant text for matching names and messages. */
const fold = (text: string) => text.normalize('NFKC').toLocaleLowerCase();
const matchesQuery = (wish: PublicWish, query: string) => {
  const q = fold(query.trim());
  return !q || fold(wish.name).includes(q) || fold(wish.message).includes(q);
};

function SearchBox({ value, onChange, autoFocus }: { value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  const { t } = useI18n();
  return (
    <div className="wish-search" role="search">
      <svg className="wish-search__icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="7" cy="7" r="4.6" stroke="currentColor" strokeWidth="1.4" />
        <path d="m10.6 10.6 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        className="wish-search__input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t.wishes.searchPlaceholder}
        aria-label={t.wishes.searchLabel}
        autoFocus={autoFocus}
        enterKeyHint="search"
      />
      {value ? (
        <button type="button" className="wish-search__clear" onClick={() => onChange('')} aria-label={t.wishes.clearSearch}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M3 3l6 6M9 3 3 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}

const PAGE_SIZE = 9;
type Sort = 'newest' | 'oldest' | 'name';

/** "View All Wishes": every wish in a paginated grid, with its own search and sort. */
function AllWishesDialog({ open, onClose, wishes, initialQuery }: { open: boolean; onClose: () => void; wishes: PublicWish[]; initialQuery: string }) {
  const { t, lang, n } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('newest');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setQuery(initialQuery);
      setPage(1);
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
  }, [open, initialQuery]);

  const list = useMemo(() => {
    const found = wishes.filter((w) => matchesQuery(w, query));
    if (sort === 'oldest') return [...found].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    if (sort === 'name') return [...found].sort((a, b) => a.name.localeCompare(b.name, lang === 'km' ? 'km' : 'en'));
    return [...found].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [wishes, query, sort, lang]);

  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const shown = list.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const goTo = (p: number) => {
    setPage(p);
    bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <dialog
      ref={ref}
      className="wish-dialog all-wishes"
      aria-labelledby="all-wishes-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="all-wishes__panel">
        <header className="all-wishes__head">
          <div>
            <h3 id="all-wishes-title" className="all-wishes__title">
              {t.wishes.allTitle}
            </h3>
            <p className="all-wishes__count">{query.trim() ? t.wishes.matches(list.length) : t.wishes.allCount(wishes.length)}</p>
          </div>
          <button type="button" className="wish-dialog__close" onClick={onClose} aria-label={t.wishes.close}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M4.5 4.5l9 9M13.5 4.5l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <div className="all-wishes__controls">
            <SearchBox
              value={query}
              onChange={(v) => {
                setQuery(v);
                setPage(1);
              }}
            />
            <label className="all-wishes__sort">
              <span className="visually-hidden">{t.wishes.sortLabel}</span>
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as Sort);
                  setPage(1);
                }}
              >
                <option value="newest">{t.wishes.sortNewest}</option>
                <option value="oldest">{t.wishes.sortOldest}</option>
                <option value="name">{t.wishes.sortName}</option>
              </select>
            </label>
          </div>
        </header>

        <div className="all-wishes__body" ref={bodyRef}>
          {shown.length ? (
            <ul className="all-wishes__grid" key={`${current}-${sort}`}>
              {shown.map((wish, i) => (
                <li className="wish all-wishes__card" key={wish.id} style={{ animationDelay: `${i * 30}ms` }}>
                  <WishCard wish={wish} lang={lang} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="wish-feed__state">{query.trim() ? t.wishes.noMatches(query.trim()) : t.wishes.empty}</p>
          )}
        </div>

        {pages > 1 ? (
          <nav className="all-wishes__pager" aria-label={t.wishes.pagination}>
            <button type="button" className="pager__arrow" onClick={() => goTo(current - 1)} disabled={current === 1} aria-label={t.wishes.previous}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M8.5 3.5 5 7l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <ol className="pager__pages">
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <li key={p}>
                  <button
                    type="button"
                    className={`pager__page ${p === current ? 'is-current' : ''}`}
                    aria-current={p === current ? 'page' : undefined}
                    aria-label={t.wishes.pageOf(p, pages)}
                    onClick={() => goTo(p)}
                  >
                    {n(p)}
                  </button>
                </li>
              ))}
            </ol>
            <button type="button" className="pager__arrow" onClick={() => goTo(current + 1)} disabled={current === pages} aria-label={t.wishes.next}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M5.5 3.5 9 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </nav>
        ) : null}
      </div>
    </dialog>
  );
}

export function Guestbook() {
  const { t, lang, n } = useI18n();
  const [wishes, setWishes] = useState<PublicWish[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [query, setQuery] = useState('');
  const [allOpen, setAllOpen] = useState(false);
  const [size, setSize] = useState({ width: 0, slot: 340 });
  const marqueeRef = useRef<HTMLDivElement>(null);
  const resumeTimer = useRef<number | null>(null);

  const loadAll = useCallback(() => {
    setState('loading');
    (async () => {
      let all: PublicWish[] = [];
      let cursor: string | null | undefined;
      do {
        const params = new URLSearchParams({ limit: String(FETCH_SIZE) });
        if (cursor) params.set('before', cursor);
        const page = await request<Page>(`/api/wishes?${params}`);
        all = all.concat(page.items);
        cursor = page.nextCursor;
      } while (cursor && all.length < MAX_WISHES);
      setWishes(all);
      setState('ready');
    })().catch(() => setState('error'));
  }, []);

  useEffect(loadAll, [loadAll]);

  // Track the marquee width and the card slot (card width + gap, set in CSS) to size the loop.
  useLayoutEffect(() => {
    const el = marqueeRef.current;
    if (!el) return;
    const measure = () => {
      const slot = parseFloat(getComputedStyle(el).getPropertyValue('--marquee-slot')) || 340;
      setSize((prev) => (prev.width === el.clientWidth && prev.slot === slot ? prev : { width: el.clientWidth, slot }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [wishes.length > 0]);

  useEffect(() => () => void (resumeTimer.current && window.clearTimeout(resumeTimer.current)), []);

  // Touch screens: hold still while a finger is down, and a little after, so the wish can be read.
  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.pointerType === 'mouse') return;
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    setPaused(true);
  };
  const onPointerUp = (e: ReactPointerEvent) => {
    if (e.pointerType === 'mouse') return;
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => setPaused(false), TOUCH_HOLD_MS);
  };

  const filtered = useMemo(() => wishes.filter((w) => matchesQuery(w, query)), [wishes, query]);
  const searching = query.trim().length > 0;
  // A handful of results that fit on screen sit still in a centred row; more keep scrolling.
  const fitsStatic = size.width > 0 && filtered.length * size.slot <= size.width;
  const rows =
    filtered.length >= TWO_ROWS_FROM ? [filtered.filter((_, i) => i % 2 === 0), filtered.filter((_, i) => i % 2 === 1)] : [filtered];

  return (
    <section className="section guestbook" id="wishes" aria-labelledby="wishes-title">
      <div className="container">
        <SectionHeading id="wishes-title" title={t.wishes.title} intro={t.wishes.intro} />

        <div className="guestbook__cta">
          {wishes.length ? <SearchBox value={query} onChange={setQuery} /> : null}
          <button type="button" className="button button--primary guestbook__leave" onClick={() => setDialogOpen(true)}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M2.5 13.5 3.3 10.4 10.6 3.1a1.6 1.6 0 0 1 2.3 2.3L5.6 12.7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            </svg>
            {t.wishes.leaveWish}
          </button>
        </div>

        <div className="wish-feed" aria-live="polite" aria-busy={state === 'loading'}>
          {state === 'loading' ? <p className="wish-feed__state">{t.wishes.loading}</p> : null}
          {state === 'error' ? (
            <p className="wish-feed__state">
              {t.wishes.loadError}{' '}
              <button type="button" className="link-button" onClick={loadAll}>
                {t.wishes.retry}
              </button>
            </p>
          ) : null}
          {state === 'ready' && wishes.length === 0 ? <p className="wish-feed__state">{t.wishes.empty}</p> : null}
        </div>
      </div>

      {wishes.length ? (
        <div ref={marqueeRef} className="wish-stage">
          {searching ? (
            <p className="wish-stage__status" aria-live="polite">
              {filtered.length ? t.wishes.matches(filtered.length) : t.wishes.noMatches(query.trim())}
            </p>
          ) : null}
          {size.width && filtered.length ? (
            fitsStatic ? (
              <ul className="wish-static">
                {filtered.map((wish) => (
                  <li className="wish marquee__card" key={wish.id}>
                    <WishCard wish={wish} lang={lang} />
                  </li>
                ))}
              </ul>
            ) : (
              <div
                className={`marquee ${paused ? 'is-paused' : ''}`}
                onPointerDown={onPointerDown}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              >
                {rows.map((row, r) => (
                  <MarqueeRow key={`${r}-${query}`} wishes={row} width={size.width} slot={size.slot} reverse={r === 1} lang={lang} />
                ))}
              </div>
            )
          ) : null}

          <div className="wish-stage__more">
            <button type="button" className="view-all" onClick={() => setAllOpen(true)}>
              {t.wishes.viewAll}
              <span className="view-all__count">{n(wishes.length)}</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8h9.5M9 4.5 12.5 8 9 11.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      ) : null}

      <AllWishesDialog open={allOpen} onClose={() => setAllOpen(false)} wishes={wishes} initialQuery={query} />
      <WishDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onPosted={(wish) => wish && setWishes((current) => [wish, ...current])}
      />
    </section>
  );
}
