import { useCallback, useEffect, useReducer } from 'react';
import { sendMessage, type Credentials, type Notification } from '../api/greenApi';
import { useMarkRead } from '../hooks/useMarkRead';
import { useNotifications } from '../hooks/useNotifications';
import { chatReducer, initialState, notificationToAction, type Message } from '../model/chatStore';
import { loadChats, saveChats } from '../utils/storage';
import { ChatWindow } from './ChatWindow';
import { Sidebar } from './Sidebar';
import './MessengerScreen.css';

/** Основной экран: список чатов слева, переписка справа. Владеет состоянием чатов. */
export function MessengerScreen({ creds, onLogout }: { creds: Credentials; onLogout: () => void }) {
  const [state, dispatch] = useReducer(
    chatReducer,
    creds.idInstance,
    (id) => loadChats(id) ?? initialState,
  );

  // сохраняем переписку локально, чтобы она не пропадала после перезагрузки
  useEffect(() => saveChats(creds.idInstance, state), [creds.idInstance, state]);

  const handleNotification = useCallback((n: Notification) => {
    const action = notificationToAction(n);
    if (action) dispatch(action);
  }, []);

  const connection = useNotifications(creds, handleNotification);

  const activeChat = state.chats.find((c) => c.chatId === state.activeChatId) ?? null;

  useMarkRead(creds, activeChat);

  const deliver = useCallback(
    async (chatId: string, tempId: string, text: string) => {
      try {
        const { idMessage } = await sendMessage(creds, chatId, text);
        dispatch({ type: 'sendSucceeded', tempId, idMessage });
      } catch {
        dispatch({ type: 'sendFailed', tempId });
      }
    },
    [creds],
  );

  function handleSend(text: string) {
    if (!activeChat) return;
    const tempId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    dispatch({
      type: 'addLocal',
      chatId: activeChat.chatId,
      message: { id: tempId, text, direction: 'out', timestamp: Date.now(), status: 'sending' },
    });
    void deliver(activeChat.chatId, tempId, text);
  }

  function handleRetry(m: Message) {
    if (!activeChat) return;
    dispatch({ type: 'resend', tempId: m.id });
    void deliver(activeChat.chatId, m.id, m.text);
  }

  return (
    <div className={`app ${activeChat ? 'has-active' : ''}`}>
      <Sidebar
        creds={creds}
        chats={state.chats}
        activeChatId={state.activeChatId}
        connection={connection}
        onOpen={(chatId) => dispatch({ type: 'openChat', chatId })}
        onCreate={(chatId, phone, name) => dispatch({ type: 'createChat', chatId, phone, name })}
        onLogout={onLogout}
      />
      <ChatWindow
        chat={activeChat}
        messenger={creds.messenger}
        onSend={handleSend}
        onRetry={handleRetry}
        onBack={() => dispatch({ type: 'closeChat' })}
      />
    </div>
  );
}
