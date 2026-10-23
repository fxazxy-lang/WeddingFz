import { wedding } from '../../config/wedding';
import { useI18n } from '../../i18n/I18nProvider';
import { formatLongDate, formatTime } from '../../lib/format';
import { AddToCalendar } from './AddToCalendar';
import { useLightbox } from './Lightbox';
import { SectionHeading } from './SectionHeading';

/** Reception venue: interactive Google Map, address and a direct "Open in Google Maps" link. */
export function Venue() {
  const { t, lang, pick } = useI18n();
  const openLightbox = useLightbox();
  const venue = wedding.venues.reception;
  // Times come from the reception session in the two-day schedule.
  const evening = wedding.schedule.flatMap((d) => d.sessions).find((s) => s.venue === 'reception')!.items;
  const first = evening[0];
  const last = evening[evening.length - 1];
  const other = lang === 'km' ? 'en' : 'km';

  const embedSrc = venue.coordinates
    ? `https://maps.google.com/maps?q=${venue.coordinates.lat},${venue.coordinates.lng}&z=16&hl=${lang}&output=embed`
    : null;

  const reception = {
    title: `${t.venue.reception} · ${wedding.couple.groom.firstName[lang]} & ${wedding.couple.bride.firstName[lang]}`,
    start: first.start,
    end: last.end,
    location: `${pick(venue.name)}, ${pick(venue.address)}`,
    description: venue.mapUrl,
  };

  return (
    <section className="section venue" id="venue" aria-labelledby="venue-title">
      <div className="container">
        <SectionHeading id="venue-title" title={t.venue.title} intro={t.venue.intro} />

        <div className="venue-card">
          <div className={`venue-card__map ${venue.mapImage ? 'venue-card__map--image' : ''}`}>
            {venue.mapImage ? (
              // Tapping the illustration opens it full-screen; the "Open in Google Maps" button handles directions.
              <button
                type="button"
                className="venue-map-image"
                onClick={() => openLightbox([{ src: venue.mapImage!.src, alt: venue.mapImage!.alt }])}
                aria-label={`${t.gallery.view}: ${pick(venue.mapImage.alt)}`}
              >
                <img
                  src={venue.mapImage.webSrc ?? venue.mapImage.src}
                  srcSet={venue.mapImage.webSrc ? `${venue.mapImage.webSrc} 1600w, ${venue.mapImage.src} ${venue.mapImage.width}w` : undefined}
                  sizes="(max-width: 860px) 92vw, 640px"
                  width={venue.mapImage.width}
                  height={venue.mapImage.height}
                  alt={pick(venue.mapImage.alt)}
                  loading="lazy"
                  decoding="async"
                />
                <span className="zoomable__hint venue-map-image__hint" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M9.5 2.5h4v4M13.5 2.5 9 7M6.5 13.5h-4v-4M2.5 13.5 7 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </button>
            ) : embedSrc ? (
              <iframe title={t.venue.mapTitle} src={embedSrc} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
            ) : null}
          </div>

          <div className="venue-card__details">
            <p className="venue-card__label">{t.venue.reception}</p>
            <h3 className="venue-card__name" lang={lang}>
              {pick(venue.name)}
            </h3>
            <p className="venue-card__name-alt" lang={other}>
              {venue.name[other]}
            </p>

            <dl className="venue-card__facts">
              <div>
                <dt>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                    <path d="M9 16s5.5-4.7 5.5-9A5.5 5.5 0 0 0 3.5 7c0 4.3 5.5 9 5.5 9z" stroke="currentColor" strokeWidth="1.3" />
                    <circle cx="9" cy="7" r="2" stroke="currentColor" strokeWidth="1.3" />
                  </svg>
                  <span className="visually-hidden">{t.venue.addressLabel}</span>
                </dt>
                <dd>{pick(venue.address)}</dd>
              </div>
              <div>
                <dt>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                    <rect x="2.5" y="3.5" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M2.5 7.5h13M6 2v3M12 2v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                  <span className="visually-hidden">{t.venue.dateLabel}</span>
                </dt>
                <dd>
                  {formatLongDate(lang, first.start)}
                  <br />
                  {formatTime(lang, first.start)}
                  {last.end ? ` – ${formatTime(lang, last.end)}` : ''}
                </dd>
              </div>
            </dl>

            <div className="venue-card__actions">
              <a className="button button--primary" href={venue.mapUrl} target="_blank" rel="noopener noreferrer">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M8 14.5s5-4.3 5-8.2A5 5 0 0 0 3 6.3c0 3.9 5 8.2 5 8.2z" stroke="currentColor" strokeWidth="1.4" />
                  <circle cx="8" cy="6.3" r="1.8" stroke="currentColor" strokeWidth="1.4" />
                </svg>
                {t.venue.openMap}
              </a>
              <AddToCalendar events={[{ uid: `reception-${wedding.date}@wedding`, ...reception }]} google={reception} fileName="wedding-reception.ics" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
