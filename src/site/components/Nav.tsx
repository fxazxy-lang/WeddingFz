import { useEffect, useState } from 'react';
import { wedding } from '../../config/wedding';
import { useI18n } from '../../i18n/I18nProvider';

const LINKS = ['story', 'schedule', 'venue', 'rsvp', 'wishes', 'gifts'] as const;

export function Nav() {
  const { t, lang, setLang } = useI18n();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const toggleLang = () => setLang(lang === 'km' ? 'en' : 'km');

  return (
    <header className={`nav ${scrolled || open ? 'nav--solid' : ''}`}>
      <div className="nav__inner container">
        <a className="nav__monogram" href="#top" aria-label={t.meta.title}>
          {wedding.couple.monogram}
        </a>

        <nav className={`nav__links ${open ? 'is-open' : ''}`} aria-label="Sections">
          {LINKS.map((key) => (
            <a key={key} href={`#${key}`} onClick={() => setOpen(false)}>
              {t.nav[key]}
            </a>
          ))}
        </nav>

        <div className="nav__actions">
          <button
            type="button"
            className="nav__lang"
            onClick={toggleLang}
            aria-label={t.language.label}
            lang={lang === 'km' ? 'en' : 'km'}
          >
            {t.language.switchTo}
          </button>
          <button
            type="button"
            className="nav__menu"
            aria-expanded={open}
            aria-label={open ? t.nav.close : t.nav.menu}
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  );
}
