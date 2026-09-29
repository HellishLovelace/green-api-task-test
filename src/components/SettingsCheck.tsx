import { useEffect, useState } from 'react';
import { getSettings, setSettings, withRetry, type Credentials, type InstanceSettings } from '../api/greenApi';

/** Настройки, без которых HTTP API не получает входящие сообщения и статусы. */
const REQUIRED: InstanceSettings = { webhookUrl: '', incomingWebhook: 'yes', outgoingWebhook: 'yes' };

function problems(s: InstanceSettings): string[] {
  const list: string[] = [];
  if (s.webhookUrl) list.push(`задан webhookUrl (${s.webhookUrl}) — уведомления уходят туда, а не в очередь`);
  if (s.incomingWebhook !== 'yes') list.push('выключены уведомления о входящих сообщениях');
  if (s.outgoingWebhook !== 'yes') list.push('выключены уведомления о статусах отправленных сообщений');
  return list;
}

/**
 * Проверяет настройки инстанса после входа и предлагает исправить их,
 * если ответы собеседника не смогут прийти через HTTP API.
 */
export function SettingsCheck({ creds }: { creds: Credentials }) {
  const [issues, setIssues] = useState<string[]>([]);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    let cancelled = false;
    withRetry(() => getSettings(creds))
      .then((s) => !cancelled && setIssues(problems(s ?? {})))
      .catch(() => {
        /* не удалось проверить — не мешаем работе */
      });
    return () => {
      cancelled = true;
    };
  }, [creds]);

  if (issues.length === 0) return null;

  async function fix() {
    setState('saving');
    try {
      await setSettings(creds, REQUIRED);
      setState('saved');
    } catch {
      setState('error');
    }
  }

  if (state === 'saved') {
    return (
      <div className="settings-check ok" role="status">
        Настройки сохранены. GREEN-API применит их в течение 5 минут, после этого ответы начнут приходить.
      </div>
    );
  }

  return (
    <div className="settings-check" role="alert">
      <b>Ответы не будут приходить:</b>
      <ul>
        {issues.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
      {state === 'error' && <div>Не удалось сохранить настройки, попробуйте ещё раз.</div>}
      <button className="primary-btn" onClick={fix} disabled={state === 'saving'}>
        {state === 'saving' ? 'Сохраняем…' : 'Включить уведомления'}
      </button>
    </div>
  );
}
