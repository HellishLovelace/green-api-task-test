import type { Credentials } from '../api/greenApi';
import type { ChatState } from '../model/chatStore';

const CREDS_KEY = 'maxchat:credentials';
const chatsKey = (idInstance: string) => `maxchat:chats:${idInstance}`;

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* хранилище недоступно — работаем без сохранения */
  }
}

export function loadCredentials(): Credentials | null {
  const c = read<Credentials>(CREDS_KEY);
  // в данных, сохранённых до поддержки Telegram, поля messenger нет — это был MAX
  return c && { ...c, messenger: c.messenger ?? 'max' };
}
export const saveCredentials = (c: Credentials) => write(CREDS_KEY, c);
export const clearCredentials = () => {
  try {
    localStorage.removeItem(CREDS_KEY);
  } catch {
    /* ignore */
  }
};

export function loadChats(idInstance: string): ChatState | null {
  const s = read<ChatState>(chatsKey(idInstance));
  if (!s || !Array.isArray(s.chats)) return null;
  // «зависшие» отправки после перезагрузки страницы считаем неудачными
  return {
    activeChatId: null,
    chats: s.chats.map((c) => ({
      ...c,
      messages: c.messages.map((m) => (m.status === 'sending' ? { ...m, status: 'failed' as const } : m)),
    })),
  };
}

export const saveChats = (idInstance: string, s: ChatState) => write(chatsKey(idInstance), s);
