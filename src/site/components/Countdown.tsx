import { useI18n } from '../../i18n/I18nProvider';
import { useCountdown } from '../../lib/useCountdown';

const DAY_MS = 86_400_000;

export function Countdown({ target }: { target: string }) {
  const { t, n } = useI18n();
  const remaining = useCountdown(target);

  if (remaining.totalMs <= 0) {
    const passedMs = -remaining.totalMs;
    return <p className="countdown__done">{passedMs < DAY_MS ? t.hero.today : t.hero.married}</p>;
  }

  const units = [
    { key: 'days', value: remaining.days, label: t.hero.units.days },
    { key: 'hours', value: remaining.hours, label: t.hero.units.hours },
    { key: 'minutes', value: remaining.minutes, label: t.hero.units.minutes },
    { key: 'seconds', value: remaining.seconds, label: t.hero.units.seconds },
  ];

  return (
    <div className="countdown">
      <p className="countdown__label">{t.hero.countdownLabel}</p>
      {/* role=timer is polite by default; avoid announcing every second. */}
      <div className="countdown__units" role="timer" aria-live="off">
        {units.map((unit) => (
          <div className="countdown__unit" key={unit.key}>
            <span className="countdown__value">{n(String(unit.value).padStart(2, '0'))}</span>
            <span className="countdown__name">{unit.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
