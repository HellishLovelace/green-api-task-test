import { useState } from 'react';
import type { Credentials } from '../api/greenApi';
import type { ConnectionStatus } from '../hooks/useNotifications';
import { chatTitle, type Chat } from '../model/chatStore';
import { formatListTime } from '../utils/time';
import { Avatar } from './Avatar';
import { LogoutIcon, PlusIcon } from './Icons';
import { NewChatForm } from './NewChatForm';
import { SettingsCheck } from './SettingsCheck';
import './Sidebar.css';

interface Props {
  creds: Credentials;
  chats: Chat[];
  activeChatId: string | null;
  connection: ConnectionStatus;
  onOpen: (chatId: string) => void;
  onCreate: (chatId: string, phone: string, name: string) => void;
  onLogout: () => void;
}

const CONNECTION_LABEL: Record<ConnectionStatus, string> = {
  connecting: 'Подключение…',
  online: 'В сети',
  error: 'Нет связи, переподключение…',
};

export function Sidebar({ creds, chats, activeChatId, connection, onOpen, onCreate, onLogout }: Props) {
  const [creating, setCreating] = useState(false);

  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <div className="sidebar-title">
          <h2>Чаты</h2>
          <span className={`conn conn-${connection}`} title={`Инстанс ${creds.idInstance}`}>
            <i />
            {CONNECTION_LABEL[connection]}
          </span>
        </div>
        <button className="icon-btn" onClick={onLogout} aria-label="Выйти" title="Выйти">
          <LogoutIcon />
        </button>
        {/* как в MAX: синяя круглая кнопка «+», в открытом состоянии поворачивается в «×» */}
        <button
          className={`new-chat-btn ${creating ? 'open' : ''}`}
          onClick={() => setCreating((v) => !v)}
          aria-label={creating ? 'Отменить' : 'Новый чат'}
          aria-expanded={creating}
          title={creating ? 'Отменить' : 'Новый чат'}
        >
          <PlusIcon />
        </button>
      </header>

      <SettingsCheck creds={creds} />

      {creating && (
        <NewChatForm
          creds={creds}
          onCreated={(chatId, phone, name) => {
            onCreate(chatId, phone, name);
            setCreating(false);
          }}
        />
      )}

      <ul className="chat-list">
        {chats.length === 0 && !creating && (
          <li className="chat-list-empty">
            Пока нет чатов.
            <button className="link-btn" onClick={() => setCreating(true)}>
              Начать переписку
            </button>
          </li>
        )}
        {chats.map((c) => {
          const last = c.messages[c.messages.length - 1];
          return (
            <li key={c.chatId}>
              <button
                className={`chat-item ${c.chatId === activeChatId ? 'active' : ''}`}
                onClick={() => onOpen(c.chatId)}
              >
                <Avatar name={chatTitle(c)} seed={c.phone || c.chatId} />
                <div className="chat-item-body">
                  <div className="chat-item-top">
                    <span className="chat-item-name">{chatTitle(c)}</span>
                    {last && <span className="chat-item-time">{formatListTime(last.timestamp)}</span>}
                  </div>
                  <div className="chat-item-bottom">
                    <span className="chat-item-preview">
                      {last ? (
                        <>
                          {last.direction === 'out' && <span className="you">Вы: </span>}
                          {last.text}
                        </>
                      ) : (
                        <span className="muted">Нет сообщений</span>
                      )}
                    </span>
                    {c.unread > 0 && <span className="badge">{c.unread}</span>}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
