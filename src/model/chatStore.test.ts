import { describe, expect, it } from 'vitest';
import type { Notification } from '../api/greenApi';
import { chatReducer, initialState, notificationToAction, type ChatState } from './chatStore';

const incoming = (text: string, id = '1', chatId = '10000000', phone = 79876543210): Notification => ({
  receiptId: 1,
  body: {
    typeWebhook: 'incomingMessageReceived',
    timestamp: 1763115112,
    idMessage: id,
    senderData: { chatId, chatName: 'Иван', senderPhoneNumber: phone },
    messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: text } },
  },
});

describe('notificationToAction', () => {
  it('разбирает входящее текстовое сообщение', () => {
    const a = notificationToAction(incoming('Привет'));
    expect(a).toMatchObject({
      type: 'messageReceived',
      chatId: '10000000',
      phone: '79876543210',
      message: { text: 'Привет', direction: 'in', timestamp: 1763115112000 },
    });
  });

  it('разбирает текст с URL (extendedTextMessage)', () => {
    const n = incoming('');
    n.body.messageData = { typeMessage: 'extendedTextMessage', extendedTextMessageData: { text: 'https://max.ru' } };
    expect(notificationToAction(n)).toMatchObject({ message: { text: 'https://max.ru' } });
  });

  it('игнорирует нетекстовые сообщения и сервисные уведомления', () => {
    const img = incoming('');
    img.body.messageData = { typeMessage: 'imageMessage' };
    expect(notificationToAction(img)).toBeNull();
    expect(notificationToAction({ receiptId: 2, body: { typeWebhook: 'stateInstanceChanged', timestamp: 1 } })).toBeNull();
  });

  it('разбирает статус исходящего', () => {
    const a = notificationToAction({
      receiptId: 3,
      body: { typeWebhook: 'outgoingMessageStatus', timestamp: 1, idMessage: 'm1', status: 'read' },
    });
    expect(a).toEqual({ type: 'statusChanged', idMessage: 'm1', status: 'read' });
  });
});

describe('chatReducer', () => {
  const created = chatReducer(initialState, {
    type: 'createChat',
    chatId: '79876543210@c.us',
    phone: '79876543210',
    name: '',
  });

  it('создаёт чат и делает его активным', () => {
    expect(created.chats).toHaveLength(1);
    expect(created.activeChatId).toBe('79876543210@c.us');
  });

  it('не дублирует чат с тем же номером', () => {
    const again = chatReducer(created, { type: 'createChat', chatId: 'x', phone: '79876543210', name: '' });
    expect(again.chats).toHaveLength(1);
  });

  it('привязывает ответ к чату по номеру и запоминает настоящий chatId', () => {
    const s = chatReducer(created, notificationToAction(incoming('Ответ'))!);
    expect(s.chats).toHaveLength(1);
    expect(s.chats[0].chatId).toBe('10000000');
    expect(s.activeChatId).toBe('10000000');
    expect(s.chats[0].messages[0].text).toBe('Ответ');
    expect(s.chats[0].unread).toBe(0); // чат открыт
  });

  it('создаёт новый чат для неизвестного отправителя и считает непрочитанные', () => {
    const s = chatReducer({ ...created, activeChatId: null }, notificationToAction(incoming('Hi', '2', '555', 79001112233))!);
    expect(s.chats).toHaveLength(2);
    expect(s.chats.find((c) => c.chatId === '555')!.unread).toBe(1);
  });

  it('не смешивает сообщение участника группы с личным чатом', () => {
    const personal = chatReducer(created, notificationToAction(incoming('Лично'))!);
    const group = incoming('В группе', 'g1', '-10000000000000');
    group.body.senderData!.chatType = 'group';
    const s = chatReducer(personal, notificationToAction(group)!);
    expect(s.chats).toHaveLength(2);
    expect(s.chats.find((c) => c.chatId === '10000000')!.messages.map((m) => m.text)).toEqual(['Лично']);
    expect(s.chats.find((c) => c.chatId === '-10000000000000')!.messages.map((m) => m.text)).toEqual(['В группе']);
  });

  it('игнорирует повторное уведомление', () => {
    const a = notificationToAction(incoming('Ответ'))!;
    const s1 = chatReducer(created, a);
    expect(chatReducer(s1, a)).toBe(s1);
  });

  it('проводит сообщение через sending -> sent -> read и не понижает статус', () => {
    let s: ChatState = chatReducer(created, {
      type: 'addLocal',
      chatId: created.activeChatId!,
      message: { id: 'tmp', text: 'Привет', direction: 'out', timestamp: 1, status: 'sending' },
    });
    s = chatReducer(s, { type: 'sendSucceeded', tempId: 'tmp', idMessage: 'm1' });
    expect(s.chats[0].messages[0]).toMatchObject({ id: 'm1', status: 'sent' });
    s = chatReducer(s, { type: 'statusChanged', idMessage: 'm1', status: 'read' });
    s = chatReducer(s, { type: 'statusChanged', idMessage: 'm1', status: 'delivered' });
    expect(s.chats[0].messages[0].status).toBe('read');
  });

  it('убирает временное сообщение, если уведомление об отправке пришло раньше ответа', () => {
    let s = chatReducer(created, {
      type: 'addLocal',
      chatId: created.activeChatId!,
      message: { id: 'tmp', text: 'Привет', direction: 'out', timestamp: 1, status: 'sending' },
    });
    s = chatReducer(s, {
      type: 'messageReceived',
      chatId: created.activeChatId!,
      phone: '',
      name: '',
      message: { id: 'm1', text: 'Привет', direction: 'out', timestamp: 2, status: 'sent' },
    });
    s = chatReducer(s, { type: 'sendSucceeded', tempId: 'tmp', idMessage: 'm1' });
    expect(s.chats[0].messages.map((m) => m.id)).toEqual(['m1']);
  });
});
