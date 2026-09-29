import { useEffect, useRef, useState } from 'react';
import { readChat, type Credentials } from '../api/greenApi';
import type { Chat } from '../model/chatStore';

function usePageVisible() {
  const [visible, setVisible] = useState(() => document.visibilityState === 'visible');
  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);
  return visible;
}

/**
 * Отмечает открытый чат прочитанным (ReadChat), когда пользователь действительно видит
 * новые входящие: чат открыт и вкладка активна. Для каждого сообщения — не больше одного вызова.
 */
export function useMarkRead(creds: Credentials, chat: Chat | null) {
  const visible = usePageVisible();
  // chatId -> id последнего входящего, для которого уже вызвали ReadChat
  const marked = useRef(new Map<string, string>());

  const chatId = chat?.chatId;
  const lastIncomingId = chat && [...chat.messages].reverse().find((m) => m.direction === 'in')?.id;

  useEffect(() => {
    if (!chatId || !lastIncomingId || !visible) return;
    if (marked.current.get(chatId) === lastIncomingId) return;
    marked.current.set(chatId, lastIncomingId);
    readChat(creds, chatId).catch(() => {
      // не получилось — попробуем снова при следующем сообщении или открытии чата
      marked.current.delete(chatId);
    });
  }, [creds, chatId, lastIncomingId, visible]);
}
