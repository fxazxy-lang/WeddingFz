import { useEffect, useSyncExternalStore } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { music } from '../../lib/music';

/**
 * Floating music button. While music plays, the note turns slowly and soft gold rings
 * pulse outward; when paused, the turning stops where it is and a slash crosses the note.
 */
export function MusicToggle() {
  const { t } = useI18n();
  const playing = useSyncExternalStore(music.subscribe, music.isPlaying, () => false);

  // Preload the sounds, and resume music the guest left on earlier in this visit.
  useEffect(() => music.init(), []);

  const label = playing ? t.music.pause : t.music.play;

  return (
    <button
      type="button"
      className={`music-toggle ${playing ? 'is-playing' : 'is-paused'}`}
      onClick={() => void music.toggle()}
      aria-pressed={playing}
      aria-label={label}
      title={label}
    >
      <span className="music-toggle__waves" aria-hidden="true">
        <span />
        <span />
      </span>
      <span className="music-toggle__disc" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="25" height="25" fill="none">
          <path d="M9.5 17.2V6.6l9-2v10.3" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
          <path d="M9.5 9.2l9-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <ellipse cx="7.1" cy="17.4" rx="2.8" ry="2.2" fill="currentColor" />
          <ellipse cx="16.1" cy="15.1" rx="2.8" ry="2.2" fill="currentColor" />
        </svg>
      </span>
      <svg className="music-toggle__slash" viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
        <line className="music-toggle__slash-gap" x1="4.5" y1="4.5" x2="19.5" y2="19.5" />
        <line className="music-toggle__slash-line" x1="4.5" y1="4.5" x2="19.5" y2="19.5" />
      </svg>
    </button>
  );
}
