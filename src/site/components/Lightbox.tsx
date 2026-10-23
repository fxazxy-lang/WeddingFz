import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { Photo } from '../../config/wedding';
import { useI18n } from '../../i18n/I18nProvider';

interface GalleryState {
  photos: Photo[];
  index: number;
}

const GalleryContext = createContext<(photos: Photo[], index?: number) => void>(() => {});

/** Open the full-screen viewer from anywhere: `const open = useLightbox(); open([photo])`. */
export const useLightbox = () => useContext(GalleryContext);

export function LightboxProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GalleryState | null>(null);
  const open = useCallback((photos: Photo[], index = 0) => setState({ photos, index }), []);
  return (
    <GalleryContext.Provider value={open}>
      {children}
      <Lightbox state={state} onChange={setState} />
    </GalleryContext.Provider>
  );
}

function Lightbox({ state, onChange }: { state: GalleryState | null; onChange: (s: GalleryState | null) => void }) {
  const { t, pick, n } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const swipeStart = useRef<number | null>(null);
  const count = state?.photos.length ?? 0;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (state && !dialog.open) dialog.showModal();
    if (!state && dialog.open) dialog.close();
  }, [state]);

  const go = useCallback(
    (step: number) => {
      if (!state || count < 2) return;
      onChange({ ...state, index: (state.index + step + count) % count });
    },
    [state, count, onChange],
  );

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, go]);

  const photo = state?.photos[state.index];

  return (
    <dialog
      ref={ref}
      className="lightbox"
      aria-label={photo ? pick(photo.alt) : undefined}
      onClose={() => onChange(null)}
      onClick={(e) => {
        if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('lightbox__stage')) onChange(null);
      }}
      onPointerDown={(e) => (swipeStart.current = e.clientX)}
      onPointerUp={(e) => {
        if (swipeStart.current === null) return;
        const dx = e.clientX - swipeStart.current;
        swipeStart.current = null;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
      }}
    >
      {photo ? (
        <>
          <div className="lightbox__stage">
            <img key={photo.src} className="lightbox__image" src={photo.src} alt={pick(photo.alt)} />
          </div>
          <div className="lightbox__bar">
            <p className="lightbox__caption">{pick(photo.alt)}</p>
            {count > 1 ? (
              <p className="lightbox__count" aria-live="polite">
                {n(state!.index + 1)} / {n(count)}
              </p>
            ) : null}
          </div>
          {count > 1 ? (
            <>
              <button type="button" className="lightbox__nav lightbox__nav--prev" onClick={() => go(-1)} aria-label={t.gallery.previous}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                  <path d="M13.5 4.5 7 11l6.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button type="button" className="lightbox__nav lightbox__nav--next" onClick={() => go(1)} aria-label={t.gallery.next}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                  <path d="M8.5 4.5 15 11l-6.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </>
          ) : null}
          <button type="button" className="lightbox__close" onClick={() => onChange(null)} aria-label={t.gallery.close} autoFocus>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M5 5l10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </>
      ) : null}
    </dialog>
  );
}

/** A photo that opens the lightbox when clicked or activated with the keyboard. */
export function ZoomablePhoto({
  photo,
  gallery,
  className,
  sizes,
  priority = false,
}: {
  photo: Photo;
  gallery: Photo[];
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const { t, pick } = useI18n();
  const open = useLightbox();
  const index = Math.max(0, gallery.findIndex((p) => p.src === photo.src));
  return (
    <button type="button" className={`zoomable ${className ?? ''}`} onClick={() => open(gallery, index)} aria-label={`${t.gallery.view}: ${pick(photo.alt)}`}>
      <img
        src={photo.src}
        alt={pick(photo.alt)}
        sizes={sizes}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
      />
      <span className="zoomable__hint" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M9.5 2.5h4v4M13.5 2.5 9 7M6.5 13.5h-4v-4M2.5 13.5 7 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </button>
  );
}
