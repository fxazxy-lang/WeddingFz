import { useState } from 'react';
import { type GiftAccount, wedding } from '../../config/wedding';
import { useI18n } from '../../i18n/I18nProvider';
import { useLightbox } from './Lightbox';
import { SectionHeading } from './SectionHeading';

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers / non-secure contexts.
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

function CopyBadge({ currency, number }: { currency: string; number: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    if (await copyText(number.replace(/\s/g, ''))) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };
  return (
    <div className="account-row">
      <span className="account-row__currency">{currency}</span>
      <span className="account-row__number">{number}</span>
      <button
        type="button"
        className={`copy-badge ${copied ? 'is-copied' : ''}`}
        onClick={onCopy}
        aria-label={t.gifts.copyAccount(currency)}
      >
        {copied ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M2.5 7.5 5.5 10.5 11.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <rect x="4.5" y="4.5" width="7.5" height="7.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M9.5 2.5H3.5a1 1 0 0 0-1 1v6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        )}
        <span aria-live="polite">{copied ? t.gifts.copied : t.gifts.copy}</span>
      </button>
    </div>
  );
}

function GiftCard({ account }: { account: GiftAccount }) {
  const { t, pick } = useI18n();
  const openLightbox = useLightbox();
  const qrPhoto = account.qrImage
    ? { src: account.qrImage, alt: { en: `${account.title.en} · ${account.accountName}`, km: `${account.title.km} · ${account.accountName}` } }
    : null;
  const fileName = `Tango-Rothanakpanha-${account.id.toUpperCase()}${account.qrImage?.match(/\.\w+$/)?.[0] ?? '.jpg'}`;

  return (
    <article className="gift-card">
      <div className="gift-card__qr">
        {qrPhoto ? (
          <button type="button" className="gift-card__qr-button" onClick={() => openLightbox([qrPhoto])} aria-label={t.gifts.enlargeQr}>
            <img src={qrPhoto.src} alt={pick(qrPhoto.alt)} loading="lazy" decoding="async" />
          </button>
        ) : (
          <div className="qr-frame__placeholder">{t.gifts.qrPlaceholder}</div>
        )}
      </div>

      <div className="gift-card__body">
        <p className="gift-card__bank">{account.bank}</p>
        <h3 className="gift-card__title">{pick(account.title)}</h3>
        <p className="gift-card__hint">{t.gifts.scanHint}</p>

        <dl className="gift-card__details">
          <div>
            <dt>{t.gifts.accountName}</dt>
            <dd className="gift-card__name">{account.accountName}</dd>
          </div>
          <div>
            <dt>{t.gifts.accountNumber}</dt>
            <dd>
              {account.accounts.map((a) => (
                <CopyBadge key={a.currency} currency={a.currency} number={a.number} />
              ))}
            </dd>
          </div>
        </dl>

        {account.qrImage ? (
          <a className="button button--primary gift-card__save" href={account.qrImage} download={fileName}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 2.5v8M4.5 7 8 10.5 11.5 7M3 13.5h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t.gifts.saveQr}
          </a>
        ) : null}
      </div>
    </article>
  );
}

export function Gifts() {
  const { t } = useI18n();
  return (
    <section className="section gifts" id="gifts" aria-labelledby="gifts-title">
      <div className="container">
        <SectionHeading id="gifts-title" title={t.gifts.title} intro={t.gifts.intro} />
        <div className={`gifts__grid gifts__grid--${wedding.gifts.length === 1 ? 'single' : 'multi'}`}>
          {wedding.gifts.map((account) => (
            <GiftCard key={account.id} account={account} />
          ))}
        </div>
      </div>
    </section>
  );
}
