import { gallery, wedding } from '../../config/wedding';
import { useI18n } from '../../i18n/I18nProvider';
import { weddingDateLabel } from '../../lib/format';
import { Countdown } from './Countdown';
import { ZoomablePhoto } from './Lightbox';
import { Finial } from './Ornament';

export function Hero() {
  const { t, lang, pick } = useI18n();
  const { groom, bride } = wedding.couple;
  const secondary = lang === 'km' ? 'en' : 'km';

  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      <div className="hero__inner">
        {/* The temple-doorway arch is now a window onto the couple's photo. */}
        <figure className="hero__arch">
          <span className="hero__arch-line hero__arch-line--outer" aria-hidden="true" />
          <Finial className="hero__finial" size={64} />
          <ZoomablePhoto photo={wedding.photos.hero} gallery={gallery} className="hero__photo" priority sizes="(max-width: 860px) 80vw, 460px" />
        </figure>

        <div className="hero__content">
          <p className="hero__invite">{t.hero.invitation}</p>

          <h1 id="hero-title" className={`hero__names hero__names--${lang}`}>
            <span lang={lang}>{groom[lang]}</span>
            <span className="hero__and">{t.hero.and}</span>
            <span lang={lang}>{bride[lang]}</span>
          </h1>

          <p className={`hero__names-alt hero__names-alt--${secondary}`} lang={secondary}>
            {groom[secondary]} <span aria-hidden="true">{secondary === 'km' ? 'និង' : '&'}</span> {bride[secondary]}
          </p>

          <div className="hero__details">
            <p className="hero__date">{weddingDateLabel(lang)}</p>
            <p className="hero__venue">
              {pick(wedding.venues.reception.name)}, {pick(wedding.venues.reception.address)}
            </p>
          </div>

          {wedding.heroBanner === 'countdown' ? (
            <Countdown target={wedding.countdownTarget} />
          ) : (
            <p className="save-the-date">
              <span className="save-the-date__label">{t.hero.saveTheDate}</span>
              <span className="save-the-date__dot" aria-hidden="true">
                •
              </span>
              <span className="save-the-date__date">{weddingDateLabel(lang, 'short')}</span>
            </p>
          )}

          <a className="button button--primary hero__cta" href="#rsvp">
            {t.hero.rsvpCta}
          </a>
        </div>
      </div>
    </section>
  );
}
