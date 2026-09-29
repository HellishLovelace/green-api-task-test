/**
 * Минимальный клиент GREEN-API для мессенджеров MAX и Telegram (v3).
 * Документация: https://green-api.com/v3/docs/api/
 *
 * Формат запросов: {{apiUrl}}/waInstance{{idInstance}}/{{method}}/{{apiTokenInstance}}
 */

import type { Messenger } from '../model/messenger';

export interface Credentials {
  messenger: Messenger;
  apiUrl: string;
  idInstance: string;
  apiTokenInstance: string;
}

export class GreenApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'GreenApiError';
  }
}

/* ---------- Типы ответов и уведомлений ---------- */

export type InstanceState =
  | 'authorized'
  | 'notAuthorized'
  | 'blocked'
  | 'starting'
  | 'yellowCard'
  | string;

/** Поля настроек инстанса, от которых зависит получение уведомлений. */
export interface InstanceSettings {
  /** 'v3' — MAX, 'telegram' — Telegram (только в ответе GetSettings) */
  typeInstance?: string;
  webhookUrl?: string;
  incomingWebhook?: 'yes' | 'no';
  outgoingWebhook?: 'yes' | 'no';
}

export interface SendMessageResponse {
  idMessage: string;
}

export interface CheckAccountResponse {
  exist?: boolean;
  chatId?: string;
  status?: boolean;
  reason?: string;
}

export interface SenderData {
  chatId: string;
  chatName?: string;
  /** 'user' — личный чат, 'group' — группа */
  chatType?: string;
  sender?: string;
  senderName?: string;
  senderContactName?: string;
  senderPhoneNumber?: number;
}

export interface MessageData {
  typeMessage: string;
  textMessageData?: { textMessage: string };
  extendedTextMessageData?: { text: string };
}

export interface NotificationBody {
  typeWebhook: string;
  timestamp: number;
  idMessage?: string;
  senderData?: SenderData;
  messageData?: MessageData;
  /** для outgoingMessageStatus */
  chatId?: string;
  status?: string;
}

export interface Notification {
  receiptId: number;
  body: NotificationBody;
}

/* ---------- Вспомогательное ---------- */

/** Хост API по умолчанию: первые 4 цифры idInstance (так его выдаёт личный кабинет). */
export function defaultApiUrl(idInstance: string): string {
  const prefix = idInstance.replace(/\D/g, '').slice(0, 4);
  return prefix.length === 4 ? `https://${prefix}.api.green-api.com` : '';
}

function buildUrl(c: Credentials, method: string, suffix = ''): string {
  const base = c.apiUrl.trim().replace(/\/+$/, '');
  return `${base}/waInstance${encodeURIComponent(c.idInstance.trim())}/${method}/${encodeURIComponent(
    c.apiTokenInstance.trim(),
  )}${suffix}`;
}

async function request<T>(
  url: string,
  init: RequestInit = {},
  signal?: AbortSignal,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      signal,
      headers: init.body ? { 'Content-Type': 'application/json' } : undefined,
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new GreenApiError('Нет соединения с GREEN-API. Проверьте apiUrl и интернет.');
  }

  const text = await res.text();

  // receiveNotification: сервер отвечает 408, если за receiveTimeout уведомлений не появилось
  if (res.status === 408 && url.includes('/receiveNotification/')) return null as T;

  if (!res.ok) {
    let message = text || res.statusText;
    if (res.status === 401 || res.status === 403) {
      message = 'Неверный idInstance или apiTokenInstance';
    } else if (res.status === 466) {
      message = 'Превышен лимит тарифа GREEN-API';
    } else if (res.status === 469) {
      message = 'Превышен лимит проверки номеров в мессенджере, подождите 2 часа';
    } else if (res.status === 429) {
      message = 'Слишком много запросов, попробуйте чуть позже';
    }
    throw new GreenApiError(message, res.status);
  }

  // receiveNotification возвращает пустое тело / "null", если очередь пуста
  if (!text || text === 'null') return null as T;
  return JSON.parse(text) as T;
}

/**
 * Повторяет запрос при 429 «слишком много запросов»: GREEN-API ограничивает частоту,
 * а при загрузке страницы несколько запросов уходят почти одновременно.
 */
export async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (!(e instanceof GreenApiError && e.status === 429) || i >= attempts) throw e;
      await new Promise((r) => setTimeout(r, 1500 * i));
    }
  }
}

/* ---------- Методы API ---------- */

/** GetStateInstance — используется для проверки учётных данных при входе. */
export async function getStateInstance(c: Credentials): Promise<InstanceState> {
  const data = await request<{ stateInstance: InstanceState }>(buildUrl(c, 'getStateInstance'));
  return data?.stateInstance ?? 'unknown';
}

/** GetSettings — текущие настройки инстанса. */
export function getSettings(c: Credentials): Promise<InstanceSettings> {
  return request<InstanceSettings>(buildUrl(c, 'getSettings'));
}

/** SetSettings — меняет только переданные поля; применяется в течение 5 минут. */
export function setSettings(c: Credentials, settings: InstanceSettings): Promise<{ saveSettings: boolean }> {
  return request<{ saveSettings: boolean }>(buildUrl(c, 'setSettings'), {
    method: 'POST',
    body: JSON.stringify(settings),
  });
}

/** CheckAccount — получить chatId пользователя мессенджера по номеру телефона. */
function checkAccount(c: Credentials, phoneNumber: string): Promise<CheckAccountResponse> {
  return request<CheckAccountResponse>(buildUrl(c, 'checkAccount'), {
    method: 'POST',
    body: JSON.stringify({ phoneNumber: Number(phoneNumber) }),
  });
}

const CHECK_ACCOUNT_PAUSE_MS = 2 * 60 * 60 * 1000;
let checkAccountPausedUntil = 0;

/**
 * chatId собеседника по номеру (через CheckAccount); null — аккаунта с таким номером нет.
 * Входящие приходят с внутренним chatId мессенджера, поэтому узнаём его заранее.
 * Если CheckAccount недоступен или сработал лимит 469 (после него GREEN-API советует
 * 2 часа не проверять номера), возвращаем «номер@c.us»: SendMessage принимает и такой формат,
 * а настоящий chatId подставится с первым ответом собеседника.
 */
export async function resolveChatId(c: Credentials, phone: string): Promise<string | null> {
  const byPhone = `${phone}@c.us`;
  if (Date.now() < checkAccountPausedUntil) return byPhone;
  try {
    const res = await checkAccount(c, phone);
    if (res.exist === false) return null;
    return res.exist && res.chatId ? res.chatId : byPhone;
  } catch (e) {
    if (e instanceof GreenApiError && e.status === 469) {
      checkAccountPausedUntil = Date.now() + CHECK_ACCOUNT_PAUSE_MS;
    }
    return byPhone;
  }
}

/** SendMessage — отправка текстового сообщения. */
export function sendMessage(
  c: Credentials,
  chatId: string,
  message: string,
): Promise<SendMessageResponse> {
  return request<SendMessageResponse>(buildUrl(c, 'sendMessage'), {
    method: 'POST',
    body: JSON.stringify({ chatId, message }),
  });
}

/** ReadChat — отметить входящие сообщения чата прочитанными (собеседник увидит «прочитано»). */
export function readChat(c: Credentials, chatId: string): Promise<{ setRead: boolean }> {
  return request<{ setRead: boolean }>(buildUrl(c, 'readChat'), {
    method: 'POST',
    body: JSON.stringify({ chatId }),
  });
}

/** ReceiveNotification — long-polling одного уведомления из очереди (HTTP API). */
export function receiveNotification(
  c: Credentials,
  receiveTimeout = 5,
  signal?: AbortSignal,
): Promise<Notification | null> {
  return request<Notification | null>(
    buildUrl(c, 'receiveNotification', `?receiveTimeout=${receiveTimeout}`),
    {},
    signal,
  );
}

/** DeleteNotification — подтверждение обработки уведомления. */
export function deleteNotification(c: Credentials, receiptId: number): Promise<{ result: boolean }> {
  return request<{ result: boolean }>(buildUrl(c, 'deleteNotification', `/${receiptId}`), {
    method: 'DELETE',
  });
}
