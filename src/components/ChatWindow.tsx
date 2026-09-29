import { Fragment, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { chatTitle, type Chat, type Message } from '../model/chatStore';
import { formatPhone } from '../utils/phone';
import { dayKey, formatDayLabel, formatTime } from '../utils/time';
import { Avatar } from './Avatar';
import { MESSENGERS, type Messenger } from '../model/messenger';
import { AlertIcon, BackIcon, ChatBubblesIcon, ClockIcon, SendIcon, TicksIcon } from './Icons';

interface Props {
  chat: Chat | null;
  messenger: Messenger;
  onSend: (text: string) => void;
  onRetry: (message: Message) => void;
  onBack: () => void;
}

export function ChatWindow({ chat, messenger, onSend, onRetry, onBack }: Props) {
  const { name, maxLength } = MESSENGERS[messenger];
  if (!chat) {
    return (
      <main className="chat chat-empty">
        <ChatBubblesIcon className="chat-empty-icon" />
        <p>Выберите чат или создайте новый, чтобы начать общение</p>
      </main>
    );
  }

  const title = chatTitle(chat);
  const subtitle = chat.name && chat.phone ? formatPhone(chat.phone) : name;

  return (
    <main className="chat">
      <header className="chat-header">
        <button className="icon-btn back-btn" onClick={onBack} aria-label="Назад к чатам">
          <BackIcon />
        </button>
        <Avatar name={title} seed={chat.phone || chat.chatId} size={40} />
        <div className="chat-header-text">
          <h3>{title}</h3>
          <span>{subtitle}</span>
        </div>
      </header>

      <MessageList messages={chat.messages} messengerName={name} onRetry={onRetry} key={chat.chatId} />
      <Composer onSend={onSend} maxLength={maxLength} key={`c-${chat.chatId}`} />
    </main>
  );
}

function MessageList({
  messages,
  messengerName,
  onRetry,
}: {
  messages: Message[];
  messengerName: string;
  onRetry: (m: Message) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  return (
    <div
      className="messages"
      ref={ref}
      onScroll={(e) => {
        const el = e.currentTarget;
        stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      }}
    >
      {messages.length === 0 && (
        <div className="messages-hint">Напишите первое сообщение — получатель увидит его в {messengerName}</div>
      )}
      {messages.map((m, i) => {
        const prev = messages[i - 1];
        const newDay = !prev || dayKey(prev.timestamp) !== dayKey(m.timestamp);
        const grouped = !newDay && prev?.direction === m.direction;
        return (
          <Fragment key={m.id}>
            {newDay && (
              <div className="day-sep">
                <span>{formatDayLabel(m.timestamp)}</span>
              </div>
            )}
            <div className={`bubble-row ${m.direction} ${grouped ? 'grouped' : ''}`}>
              <div className={`bubble ${m.status === 'failed' ? 'failed' : ''}`}>
                <span className="bubble-text">{m.text}</span>
                <span className="bubble-meta">
                  {formatTime(m.timestamp)}
                  {m.direction === 'out' && <StatusMark status={m.status} />}
                </span>
              </div>
              {m.status === 'failed' && (
                <button className="retry-btn" onClick={() => onRetry(m)}>
                  <AlertIcon /> Не отправлено. Повторить
                </button>
              )}
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

function StatusMark({ status }: { status?: Message['status'] }) {
  switch (status) {
    case 'sending':
      return <ClockIcon className="status" aria-label="Отправляется" />;
    case 'sent':
      return <TicksIcon className="status" aria-label="Отправлено" />;
    case 'delivered':
      return <TicksIcon double className="status" aria-label="Доставлено" />;
    case 'read':
      return <TicksIcon double className="status read" aria-label="Прочитано" />;
    default:
      return null;
  }
}

function Composer({ onSend, maxLength }: { onSend: (text: string) => void; maxLength: number }) {
  const [text, setText] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  // авто-высота поля ввода
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  useEffect(() => ref.current?.focus(), []);

  const trimmed = text.trim();
  const tooLong = text.length > maxLength;

  function send() {
    if (!trimmed || tooLong) return;
    onSend(trimmed);
    setText('');
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="composer">
      <div className="composer-field">
        <textarea
          ref={ref}
          rows={1}
          placeholder="Сообщение"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          aria-label="Текст сообщения"
        />
        {tooLong && (
          <span className="composer-limit">
            {text.length}/{maxLength}
          </span>
        )}
      </div>
      <button
        className="send-btn"
        onClick={send}
        disabled={!trimmed || tooLong}
        aria-label="Отправить"
        title="Отправить (Enter)"
      >
        <SendIcon />
      </button>
    </div>
  );
}
