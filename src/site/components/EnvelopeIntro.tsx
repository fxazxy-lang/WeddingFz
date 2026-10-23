import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react';
import { wedding } from '../../config/wedding';
import { useI18n } from '../../i18n/I18nProvider';
import { weddingDateLabel } from '../../lib/format';
import { music } from '../../lib/music';

/**
 * Timeline after the click, in ms (desktop). The CSS keyframes in envelope.css
 * use the same numbers; keep the two in step.
 *   0–400      seal dissolves with a soft glow
 *   300–800    flap folds open (3D rotateX)
 *   620–1700   card fades in, rises out of the pocket, glides to the centre and settles (scale 0.95 → 1)
 *   1300–3100  card content, one step every 0.2s: photo · tagline · names · date & venues · badge · RSVP
 *   3100+      RSVP breathes; a tap anywhere else on the screen continues to the page
 *   LEAVE_AT   overlay blurs and dissolves into the landing page on its own
 */
const REVEALED_AT = 3100;
const LEAVE_AT = 5000;
const DONE_AT = LEAVE_AT + 1000;
const SKIP_FADE = 550;

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

type Stage = 'closed' | 'opening' | 'leaving' | 'done';

/** Where the card sits inside the envelope, where it rises to, and where it settles (centre of the screen). */
function measureCard(envelope: HTMLElement, card: HTMLElement): CSSProperties {
  const env = envelope.getBoundingClientRect();
  const w = card.offsetWidth;
  const h = card.offsetHeight;
  if (!w || !h || !env.height) return {};
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Small enough to tuck fully inside the envelope.
  const s0 = Math.min((env.height * 0.84) / h, (env.width * 0.62) / w);
  const startY = env.height * 0.45 - (h * s0) / 2;
  // Rise until the card's bottom edge clears the pocket.
  const riseY = -env.height * 0.25 - (h * s0) / 2;
  // Settle at the centre of the viewport, as large as fits.
  const sf = Math.min(1, (vh * 0.92) / h, (vw * 0.92) / w);
  const toX = vw / 2 - (env.left + env.width / 2);
  const toY = vh / 2 - (env.top + env.height / 2);

  return {
    '--card-s0': s0.toFixed(4),
    '--card-start-y': `${startY.toFixed(1)}px`,
    '--card-rise-y': `${riseY.toFixed(1)}px`,
    '--card-to-x': `${toX.toFixed(1)}px`,
    '--card-to-y': `${toY.toFixed(1)}px`,
    '--card-sf': sf.toFixed(4),
  } as CSSProperties;
}

/**
 * Full-screen sealed envelope shown before the landing page.
 * One click/tap plays a staggered sequence: seal → flap → card → card content → page.
 * Shown on every page load and refresh (nothing is remembered); "Skip" bypasses it at any point.
 */
export function EnvelopeIntro() {
  const { t, lang, setLang } = useI18n();
  const [stage, setStage] = useState<Stage>(() => (wedding.envelopeIntro ? 'closed' : 'done'));
  const [opened, setOpened] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [cardVars, setCardVars] = useState<CSSProperties>({});
  const introRef = useRef<HTMLDivElement>(null);
  const envelopeRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  // Hold the page still (and its entrance animations paused) until the intro starts leaving.
  useEffect(() => {
    const root = document.documentElement;
    if (stage === 'closed' || stage === 'opening') root.classList.add('intro-pending');
    else root.classList.remove('intro-pending');
  }, [stage]);

  // Keep keyboard and screen-reader focus inside the intro: the page behind it is inert until it leaves.
  const blocking = stage === 'closed' || stage === 'opening';
  useEffect(() => {
    const intro = introRef.current;
    if (!blocking || !intro?.parentElement) return;
    const behind = Array.from(intro.parentElement.children).filter((el): el is HTMLElement => el !== intro && el instanceof HTMLElement);
    behind.forEach((el) => (el.inert = true));
    return () => behind.forEach((el) => (el.inert = false));
  }, [blocking]);

  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  // On refresh, start at the top of the page behind the envelope instead of the old scroll position.
  useEffect(() => {
    if (!wedding.envelopeIntro || !('scrollRestoration' in history)) return;
    history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
  }, []);

  // Keep the card's path in step with the layout while the envelope is still closed.
  const remeasure = useCallback(() => {
    if (envelopeRef.current && cardRef.current) setCardVars(measureCard(envelopeRef.current, cardRef.current));
  }, []);
  useLayoutEffect(() => {
    if (stage !== 'closed') return;
    remeasure();
    window.addEventListener('resize', remeasure);
    // Fonts change the card's height once they load.
    void document.fonts?.ready.then(remeasure);
    return () => window.removeEventListener('resize', remeasure);
  }, [stage, lang, remeasure]);

  if (stage === 'done') return null;

  const schedule = (leaveAt: number, doneAt: number) => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [window.setTimeout(() => setStage('leaving'), leaveAt), window.setTimeout(() => setStage('done'), doneAt)];
  };

  const open = () => {
    if (stage !== 'closed') return;
    remeasure();
    // Starting audio inside the click satisfies browsers' autoplay rules.
    // The chime rings as the seal breaks; the song then rises softly beneath it.
    music.playChime();
    if (music.preference() !== 'off') void music.play(0.6);
    window.scrollTo(0, 0);
    setOpened(true);
    setStage('opening');
    const quick = reducedMotion();
    if (quick) schedule(2400, 3000);
    else schedule(LEAVE_AT, DONE_AT);
    timers.current.push(window.setTimeout(() => setRevealed(true), quick ? 100 : REVEALED_AT));
  };

  // Once the card is fully shown, a tap anywhere (other than its buttons) continues to the page.
  const continueOnTap = (e: ReactMouseEvent) => {
    if (stage !== 'opening' || !revealed) return;
    if (e.target instanceof Element && e.target.closest('button, a')) return;
    skip();
  };

  const skip = (then?: () => void) => {
    setSkipping(true);
    setStage('leaving');
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [
      window.setTimeout(() => {
        setStage('done');
        then?.();
      }, SKIP_FADE),
    ];
  };

  const goToRsvp = () =>
    skip(() => document.getElementById('rsvp')?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' }));

  const { groom, bride } = wedding.couple;
  const secondary = lang === 'km' ? 'en' : 'km';
  const photo = wedding.photos.hero;

  return (
    <div
      ref={introRef}
      className={`intro intro--${stage}${opened ? ' intro--open' : ''}${revealed ? ' intro--revealed' : ''}${skipping ? ' intro--skipping' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={t.intro.aria}
      onClick={continueOnTap}
    >
      <div className="intro__controls">
        <button
          type="button"
          className="intro__pill"
          onClick={() => setLang(lang === 'km' ? 'en' : 'km')}
          aria-label={t.language.label}
          lang={lang === 'km' ? 'en' : 'km'}
          disabled={stage !== 'closed'}
        >
          {t.language.switchTo}
        </button>
        <button type="button" className="intro__pill intro__skip" onClick={() => skip()}>
          {t.intro.skip}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M3 3l4 4-4 4M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="intro__stage">
        <p className="intro__kicker">{t.intro.weddingOf}</p>

        <div className="envelope-float">
          <div ref={envelopeRef} className="envelope" style={cardVars}>
            <span className="envelope__back" aria-hidden="true" />

            {/* Top flap: two faces so the inside shows once it folds back */}
            <span className="envelope__flap" aria-hidden="true">
              <svg className="envelope__flap-face envelope__flap-face--front" viewBox="0 0 300 116" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="env-flap" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#f6eedf" />
                    <stop offset="1" stopColor="#ecdfc6" />
                  </linearGradient>
                  <linearGradient id="env-gold" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#e6cf9c" />
                    <stop offset="0.5" stopColor="#b8924f" />
                    <stop offset="1" stopColor="#e2c58c" />
                  </linearGradient>
                </defs>
                <path d="M0 0 L300 0 L150 116 Z" fill="url(#env-flap)" />
                <path d="M0 0 L150 116 L300 0" fill="none" stroke="url(#env-gold)" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
                <path d="M14 4 L150 108 L286 4" fill="none" stroke="url(#env-gold)" strokeWidth="0.7" vectorEffect="non-scaling-stroke" opacity="0.6" />
              </svg>
              <svg className="envelope__flap-face envelope__flap-face--back" viewBox="0 0 300 116" preserveAspectRatio="none">
                <path d="M0 0 L300 0 L150 116 Z" fill="#e9dcc2" />
                <path d="M0 0 L150 116 L300 0" fill="none" stroke="rgb(184 146 79 / 0.6)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              </svg>
            </span>

            {/* The invitation card: tucked inside, rises out, then settles at the centre of the screen */}
            <div ref={cardRef} className="invite-card" aria-hidden={stage === 'closed'}>
              {/* Shadow on its own layer so only its opacity animates (cheap on phones) */}
              <span className="invite-card__shadow" aria-hidden="true" />
              {/* 1 · arched photo */}
              <div className="invite-card__item invite-card__item--photo" style={{ '--i': 0 } as CSSProperties}>
                <div className="invite-card__photo">
                  <img src={photo.src} alt={photo.alt[lang]} decoding="async" />
                </div>
              </div>
              {/* 2 · tagline */}
              <p className="invite-card__item invite-card__item--float invite-card__invite" style={{ '--i': 1 } as CSSProperties}>
                {t.intro.together}
              </p>
              {/* 3 · names, with a warm-gold shimmer */}
              <div className="invite-card__item invite-card__item--names invite-card__names-wrap" style={{ '--i': 2 } as CSSProperties}>
                <p className={`invite-card__names invite-card__names--${lang}`}>
                  {groom[lang]} <span className="invite-card__and">{t.hero.and}</span> {bride[lang]}
                </p>
                <p className={`invite-card__alt invite-card__alt--${secondary}`}>
                  {groom[secondary]} {secondary === 'km' ? 'និង' : '&'} {bride[secondary]}
                </p>
              </div>
              {/* 4 · dates and both venues */}
              <div className="invite-card__item invite-card__item--fade invite-card__when" style={{ '--i': 3 } as CSSProperties}>
                <p className="invite-card__date">{weddingDateLabel(lang, 'short')}</p>
                <p className="invite-card__venue">{t.intro.venueLine}</p>
              </div>
              {/* 5 · Save The Date pill */}
              <div className="invite-card__item invite-card__item--pop" style={{ '--i': 4 } as CSSProperties}>
                <p className="invite-card__badge">{t.hero.saveTheDate}</p>
              </div>
              {/* 6 · RSVP, then a soft breathing pulse */}
              <div className="invite-card__item invite-card__item--glide" style={{ '--i': 5 } as CSSProperties}>
                <button type="button" className="invite-card__rsvp" onClick={goToRsvp} tabIndex={stage === 'opening' ? 0 : -1}>
                  {t.hero.rsvpCta}
                </button>
              </div>
            </div>

            {/* Front pocket with gold foil edges */}
            <span className="envelope__front" aria-hidden="true">
              <svg className="envelope__pocket" viewBox="0 0 300 200" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="env-front" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#fbf6ec" />
                    <stop offset="1" stopColor="#f1e6d2" />
                  </linearGradient>
                </defs>
                <path d="M0 0 L150 115 L300 0 L300 200 L0 200 Z" fill="url(#env-front)" />
                <path d="M0 0 L150 115 L300 0" fill="none" stroke="url(#env-gold)" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
                <path d="M0 200 L128 98 M300 200 L172 98" fill="none" stroke="rgb(150 120 70 / 0.12)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                <path d="M7 12 L7 193 L293 193 L293 12" fill="none" stroke="url(#env-gold)" strokeWidth="0.9" vectorEffect="non-scaling-stroke" opacity="0.7" />
              </svg>
              <span className={`envelope__names envelope__names--${lang}`}>
                {groom.firstName[lang]} {t.hero.and} {bride.firstName[lang]}
              </span>
            </span>

            {/* Wax seal */}
            <span className="seal" aria-hidden="true">
              <span className="seal__glow" />
              <span className="seal__wax">
                <span className="seal__ring">
                  <span className="seal__monogram">T&amp;R</span>
                </span>
              </span>
            </span>

            {/* The whole envelope is the click/tap target until it opens */}
            {stage === 'closed' && <button type="button" className="envelope__hit" onClick={open} aria-label={t.intro.aria} />}
          </div>
        </div>

        <p className="intro__hint" aria-hidden="true">
          <span className="intro__hint-mouse">{t.intro.open}</span>
          <span className="intro__hint-touch">{t.intro.openTouch}</span>
        </p>
      </div>
    </div>
  );
}
