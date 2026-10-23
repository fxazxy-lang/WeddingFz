import { wedding } from '../../config/wedding';
import { useI18n } from '../../i18n/I18nProvider';
import { weddingDateLabel } from '../../lib/format';
import { Finial } from './Ornament';

export function Footer() {
  const { t, lang } = useI18n();
  const { groom, bride } = wedding.couple;
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <Finial className="footer__mark" size={44} />
        <p className="footer__thanks">{t.footer.thanks}</p>
        <p className="footer__names" lang={lang}>
          {groom.firstName[lang]} {t.hero.and} {bride.firstName[lang]}
        </p>
        <p className="footer__date">{weddingDateLabel(lang)}</p>
        <p className="footer__note">{t.footer.madeWith}</p>
      </div>
    </footer>
  );
}
