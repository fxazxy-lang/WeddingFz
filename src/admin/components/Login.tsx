import { type FormEvent, useState } from 'react';
import { RequestError } from '../../lib/api';
import { adminApi } from '../api';
import { LanguageToggle, useAdminI18n } from '../i18n';

export function Login({ onSuccess }: { onSuccess: () => void }) {
  const { t } = useAdminI18n();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!password) return setError(t.login.empty);
    setBusy(true);
    setError(null);
    try {
      await adminApi.login(password);
      onSuccess();
    } catch (e) {
      if (e instanceof RequestError && e.status === 0) setError(t.login.offline);
      else if (e instanceof RequestError && e.code === 'bad_password') setError(t.login.wrong);
      else setError(e instanceof Error ? e.message : t.login.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login">
      <form className="login__card" onSubmit={onSubmit}>
        <div className="login__top">
          <p className="login__monogram">T &amp; R</p>
          <LanguageToggle />
        </div>
        <h1 className="login__title">{t.login.title}</h1>
        <p className="login__subtitle">{t.login.subtitle}</p>
        <label className="a-field">
          <span className="a-field__label">{t.login.password}</span>
          <input
            className="a-input"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(error)}
          />
        </label>
        {error ? (
          <p className="a-error" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
          {busy ? t.login.submitting : t.login.submit}
        </button>
      </form>
    </main>
  );
}
