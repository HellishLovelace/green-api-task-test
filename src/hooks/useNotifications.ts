import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { deleteNotification, receiveNotification, type Credentials, type Notification } from '../api/greenApi';

export type ConnectionStatus = 'connecting' | 'online' | 'error';

const RECEIVE_TIMEOUT_SEC = 20; // long-polling: 5..60 секунд
const RETRY_DELAY_MS = 3000;
// сервер не всегда держит запрос receiveTimeout секунд — не опрашиваем чаще раза в секунду
const MIN_POLL_INTERVAL_MS = 1000;

/** Пауза, которая прерывается при отмене цикла. Обработчик отмены снимается после паузы. */
const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const onAbort = () => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal.addEventListener('abort', onAbort, { once: true });
  });

/**
 * Получение входящих уведомлений по технологии HTTP API:
 * ReceiveNotification (long-polling) -> обработка -> DeleteNotification.
 * Цикл работает, пока компонент смонтирован. Возвращает состояние соединения.
 */
export function useNotifications(creds: Credentials, onNotification: (n: Notification) => void): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');

  // держим актуальный обработчик, не перезапуская цикл
  const handlerRef = useRef(onNotification);
  useLayoutEffect(() => {
    handlerRef.current = onNotification;
  }, [onNotification]);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    (async () => {
      setStatus('connecting');
      while (!signal.aborted) {
        try {
          const startedAt = Date.now();
          const n = await receiveNotification(creds, RECEIVE_TIMEOUT_SEC, signal);
          if (signal.aborted) break;
          setStatus('online');
          if (!n) {
            // очередь пуста — ждём следующее, но без лавины запросов
            const elapsed = Date.now() - startedAt;
            if (elapsed < MIN_POLL_INTERVAL_MS) await sleep(MIN_POLL_INTERVAL_MS - elapsed, signal);
            continue;
          }

          try {
            handlerRef.current(n);
          } finally {
            // удаляем даже если уведомление нам не интересно — иначе очередь «застрянет»
            await deleteNotification(creds, n.receiptId);
          }
        } catch {
          if (signal.aborted) break;
          setStatus('error');
          await sleep(RETRY_DELAY_MS, signal);
        }
      }
    })();

    return () => controller.abort();
  }, [creds]);

  return status;
}
