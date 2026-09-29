import type { Notification } from '../api/greenApi';
import { formatPhone } from '../utils/phone';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Message {
  id: string;
  text: string;
  direction: 'in' | 'out';
  timestamp: number; // ms
  status?: MessageStatus;
}

export interface Chat {
  /** chatId, используемый для отправки (из CheckAccount или phone@c.us) */
  chatId: string;
  /** номер телефона, только цифры (может быть пустым, если собеседник неизвестен) */
  phone: string;
  name: string;
  messages: Message[];
  unread: number;
}

export interface ChatState {
  chats: Chat[];
  activeChatId: string | null;
}

export type ChatAction =
  | { type: 'createChat'; chatId: string; phone: string; name: string }
  | { type: 'openChat'; chatId: string }
  | { type: 'closeChat' }
  | { type: 'addLocal'; chatId: string; message: Message }
  // сообщение ищется по tempId: пока шёл запрос, chatId чата мог смениться на настоящий
  | { type: 'sendSucceeded'; tempId: string; idMessage: string }
  | { type: 'sendFailed'; tempId: string }
  | { type: 'resend'; tempId: string }
  | {
      type: 'messageReceived';
      chatId: string;
      phone: string;
      name: string;
      message: Message;
    }
  | { type: 'statusChanged'; idMessage: string; status: MessageStatus };

export const initialState: ChatState = { chats: [], activeChatId: null };

/** Название чата для интерфейса: имя, иначе номер, иначе chatId. */
export function chatTitle(c: Chat): string {
  return c.name || formatPhone(c.phone) || c.chatId;
}

/* ---------- Разбор уведомлений GREEN-API ---------- */

/** Превращает уведомление из очереди в действие для редьюсера (или null, если оно нам не нужно). */
export function notificationToAction(n: Notification): ChatAction | null {
  const b = n.body;
  if (!b) return null;

  if (
    b.typeWebhook === 'incomingMessageReceived' ||
    b.typeWebhook === 'outgoingMessageReceived' ||
    b.typeWebhook === 'outgoingAPIMessageReceived'
  ) {
    const text =
      b.messageData?.textMessageData?.textMessage ?? b.messageData?.extendedTextMessageData?.text;
    // по заданию поддерживаем только текстовые сообщения
    if (text == null || !b.senderData?.chatId) return null;

    const incoming = b.typeWebhook === 'incomingMessageReceived';
    // в группе senderPhoneNumber — номер участника, а не чата: по нему нельзя искать личный чат
    const isPrivate = b.senderData.chatType
      ? b.senderData.chatType === 'user'
      : !b.senderData.chatId.startsWith('-');
    const phone = incoming && isPrivate && b.senderData.senderPhoneNumber
      ? String(b.senderData.senderPhoneNumber)
      : '';
    return {
      type: 'messageReceived',
      chatId: b.senderData.chatId,
      phone,
      name: b.senderData.chatName || b.senderData.senderContactName || b.senderData.senderName || '',
      message: {
        id: b.idMessage ?? `n-${n.receiptId}`,
        text,
        direction: incoming ? 'in' : 'out',
        timestamp: b.timestamp * 1000,
        status: incoming ? undefined : 'sent',
      },
    };
  }

  if (b.typeWebhook === 'outgoingMessageStatus' && b.idMessage && b.status) {
    const status = b.status as MessageStatus;
    if (['sent', 'delivered', 'read', 'failed'].includes(status)) {
      return { type: 'statusChanged', idMessage: b.idMessage, status };
    }
  }

  return null;
}

/* ---------- Редьюсер ---------- */

const STATUS_RANK: Record<MessageStatus, number> = {
  failed: -1,
  sending: 0,
  sent: 1,
  delivered: 2,
  read: 3,
};

function lastTs(c: Chat) {
  return c.messages.length ? c.messages[c.messages.length - 1].timestamp : 0;
}

function sortChats(chats: Chat[]) {
  return [...chats].sort((a, b) => lastTs(b) - lastTs(a));
}

function updateChat(state: ChatState, chatId: string, fn: (c: Chat) => Chat): ChatState {
  return {
    ...state,
    chats: state.chats.map((c) => (c.chatId === chatId ? fn(c) : c)),
  };
}

/** Обновить чат, содержащий сообщение (chatId мог смениться, пока шёл запрос). */
function updateChatWithMessage(state: ChatState, messageId: string, fn: (c: Chat) => Chat): ChatState {
  return {
    ...state,
    chats: state.chats.map((c) => (c.messages.some((m) => m.id === messageId) ? fn(c) : c)),
  };
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'createChat': {
      const exists = state.chats.find(
        (c) => c.chatId === action.chatId || (action.phone && c.phone === action.phone),
      );
      if (exists) return { ...state, activeChatId: exists.chatId };
      const chat: Chat = {
        chatId: action.chatId,
        phone: action.phone,
        name: action.name,
        messages: [],
        unread: 0,
      };
      return { chats: [chat, ...state.chats], activeChatId: chat.chatId };
    }

    case 'openChat':
      return {
        ...updateChat(state, action.chatId, (c) => ({ ...c, unread: 0 })),
        activeChatId: action.chatId,
      };

    case 'closeChat':
      return { ...state, activeChatId: null };

    case 'addLocal': {
      const next = updateChat(state, action.chatId, (c) => ({
        ...c,
        messages: [...c.messages, action.message],
      }));
      return { ...next, chats: sortChats(next.chats) };
    }

    case 'sendSucceeded':
      return updateChatWithMessage(state, action.tempId, (c) => {
        // уведомление outgoingAPIMessageReceived могло прийти раньше ответа sendMessage
        const dup = c.messages.some((m) => m.id === action.idMessage);
        return {
          ...c,
          messages: dup
            ? c.messages.filter((m) => m.id !== action.tempId)
            : c.messages.map((m) =>
                m.id === action.tempId ? { ...m, id: action.idMessage, status: 'sent' as const } : m,
              ),
        };
      });

    case 'sendFailed':
      return updateChatWithMessage(state, action.tempId, (c) => ({
        ...c,
        messages: c.messages.map((m) => (m.id === action.tempId ? { ...m, status: 'failed' as const } : m)),
      }));

    case 'resend':
      return updateChatWithMessage(state, action.tempId, (c) => ({
        ...c,
        messages: c.messages.map((m) => (m.id === action.tempId ? { ...m, status: 'sending' as const } : m)),
      }));

    case 'messageReceived': {
      const { message } = action;
      let chats = state.chats;
      let chat = chats.find(
        (c) => c.chatId === action.chatId || (action.phone !== '' && c.phone === action.phone),
      );

      if (!chat) {
        chat = {
          chatId: action.chatId,
          phone: action.phone,
          name: action.name,
          messages: [],
          unread: 0,
        };
        chats = [chat, ...chats];
      }
      if (chat.messages.some((m) => m.id === message.id)) return state; // дубликат

      const oldId = chat.chatId;
      const isActive = state.activeChatId === oldId;
      const updated: Chat = {
        ...chat,
        // если чат был создан по номеру (79...@c.us), запоминаем настоящий chatId мессенджера
        chatId: action.chatId,
        phone: chat.phone || action.phone,
        name: chat.name || action.name,
        messages: [...chat.messages, message].sort((a, b) => a.timestamp - b.timestamp),
        unread: message.direction === 'in' && !isActive ? chat.unread + 1 : chat.unread,
      };

      return {
        chats: sortChats(chats.map((c) => (c.chatId === oldId ? updated : c))),
        activeChatId: isActive ? updated.chatId : state.activeChatId,
      };
    }

    case 'statusChanged':
      return {
        ...state,
        chats: state.chats.map((c) =>
          c.messages.some((m) => m.id === action.idMessage)
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === action.idMessage &&
                  (action.status === 'failed' ||
                    STATUS_RANK[action.status] > STATUS_RANK[m.status ?? 'sending'])
                    ? { ...m, status: action.status }
                    : m,
                ),
              }
            : c,
        ),
      };

    default:
      return state;
  }
}
