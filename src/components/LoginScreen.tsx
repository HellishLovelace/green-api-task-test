import { useState, type FormEvent } from 'react';
import { defaultApiUrl, getSettings, getStateInstance, withRetry, type Credentials } from '../api/greenApi';
import { MESSENGERS, messengerOfInstance, type Messenger } from '../model/messenger';
import { EyeIcon, LogoIcon } from './Icons';
import './LoginScreen.css';

const stateMessages = (name: string): Record<string, string> => ({
  notAuthorized: `Инстанс не авторизован в ${name}. Авторизуйте его в личном кабинете GREEN-API.`,
  blocked: `Аккаунт ${name} заблокирован.`,
  starting: 'Инстанс запускается, попробуйте через минуту.',
  yellowCard: 'На аккаунте временные ограничения отправки.',
});

export function LoginScreen({ onLogin }: { onLogin: (c: Credentials) => void }) {
  const [messenger, setMessenger] = useState<Messenger>('max');
  const [idInstance, setIdInstance] = useState('');
  const [apiTokenInstance, setToken] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [apiUrlTouched, setApiUrlTouched] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // выбран не тот мессенджер: предлагаем войти с правильным
  const [actualMessenger, setActualMessenger] = useState<Messenger | null>(null);

  const effectiveApiUrl = apiUrlTouched ? apiUrl : defaultApiUrl(idInstance);

  function selectMessenger(m: Messenger) {
    setMessenger(m);
    setError(null);
    setActualMessenger(null);
  }

  async function login(selected: Messenger) {
    const creds: Credentials = {
      messenger: selected,
      idInstance: idInstance.trim(),
      apiTokenInstance: apiTokenInstance.trim(),
      apiUrl: effectiveApiUrl.trim(),
    };
    if (!creds.idInstance || !creds.apiTokenInstance || !creds.apiUrl) {
      setError('Заполните все поля');
      return;
    }
    setLoading(true);
    setError(null);
    setActualMessenger(null);
    try {
      // сначала убеждаемся, что инстанс того мессенджера, который выбран
      const actual = messengerOfInstance((await withRetry(() => getSettings(creds)))?.typeInstance);
      if (!actual) {
        setError('Этот инстанс не MAX и не Telegram. Приложение работает только с ними.');
        return;
      }
      if (actual !== selected) {
        setError(`Это инстанс ${MESSENGERS[actual].name}, а выбран ${MESSENGERS[selected].name}.`);
        setActualMessenger(actual);
        return;
      }

      const state = await getStateInstance(creds);
      if (state === 'authorized') {
        onLogin(creds);
        return;
      }
      setError(stateMessages(MESSENGERS[selected].name)[state] ?? `Инстанс в состоянии «${state}»`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void login(messenger);
  }

  return (
    <div className="login">
      <form className="login-card" onSubmit={submit} noValidate>
        <LogoIcon className="login-logo" />
        <h1>Вход в {MESSENGERS[messenger].name}</h1>
        <p className="login-sub">
          Введите параметры инстанса из{' '}
          <a href="https://console.green-api.com" target="_blank" rel="noreferrer">
            личного кабинета GREEN-API
          </a>
        </p>

        <div className="segmented" role="radiogroup" aria-label="Мессенджер">
          {(Object.keys(MESSENGERS) as Messenger[]).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={messenger === m}
              className={messenger === m ? 'active' : ''}
              onClick={() => selectMessenger(m)}
            >
              {MESSENGERS[m].name}
            </button>
          ))}
        </div>

        <label className="field">
          <span>idInstance</span>
          <input
            className="text-input"
            inputMode="numeric"
            autoComplete="username"
            placeholder="3100123456"
            value={idInstance}
            onChange={(e) => setIdInstance(e.target.value.replace(/\D/g, ''))}
            autoFocus
          />
        </label>

        <label className="field">
          <span>apiTokenInstance</span>
          <div className="field-with-btn">
            <input
              className="text-input"
              type={showToken ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="d75b3a66374942c5b3c019c698abc2067e151558acbd..."
              value={apiTokenInstance}
              onChange={(e) => setToken(e.target.value)}
            />
            <button
              type="button"
              className="icon-btn"
              onClick={() => setShowToken((v) => !v)}
              aria-label={showToken ? 'Скрыть токен' : 'Показать токен'}
            >
              <EyeIcon off={showToken} width={20} height={20} />
            </button>
          </div>
        </label>

        <label className="field">
          <span>apiUrl</span>
          <input
            className="text-input"
            placeholder="https://3100.api.green-api.com"
            value={effectiveApiUrl}
            onChange={(e) => {
              setApiUrlTouched(true);
              setApiUrl(e.target.value);
            }}
          />
          <small>Подставляется автоматически — сверьте с личным кабинетом</small>
        </label>

        {error && (
          <div className="form-error" role="alert">
            {error}
            {actualMessenger && (
              <button
                type="button"
                className="link-btn form-error-action"
                onClick={() => {
                  selectMessenger(actualMessenger);
                  void login(actualMessenger);
                }}
              >
                Войти как {MESSENGERS[actualMessenger].name}
              </button>
            )}
          </div>
        )}

        <button className="primary-btn" type="submit" disabled={loading}>
          {loading ? <span className="spinner" aria-label="Проверка" /> : 'Войти'}
        </button>
      </form>
    </div>
  );
}
