/**
 * Различия мессенджеров. API GREEN-API для MAX и Telegram одинаковое
 * (sendMessage, receiveNotification, checkAccount, формат chatId),
 * отличаются только поддерживаемые номера, лимит длины сообщения и тексты.
 */

export type Messenger = 'max' | 'telegram';

/**
 * Мессенджер инстанса по полю typeInstance из GetSettings:
 * 'v3' — MAX, 'telegram' — Telegram; остальные (например, 'whatsapp') не поддерживаются.
 */
export function messengerOfInstance(typeInstance: string | undefined): Messenger | null {
  if (typeInstance === 'v3') return 'max';
  if (typeInstance === 'telegram') return 'telegram';
  return null;
}

interface MessengerConfig {
  name: string;
  /** максимальная длина текста в SendMessage */
  maxLength: number;
  /** подсказка, если номер не прошёл проверку */
  phoneHint: string;
  /** CheckAccount ответил, что аккаунта нет */
  accountNotFound: string;
}

export const MESSENGERS: Record<Messenger, MessengerConfig> = {
  max: {
    name: 'MAX',
    maxLength: 4000,
    phoneHint: 'Введите номер РФ (+7, 11 цифр) или РБ (+375, 12 цифр)',
    accountNotFound: 'На этом номере нет аккаунта MAX',
  },
  telegram: {
    name: 'Telegram',
    maxLength: 4096,
    phoneHint: 'Введите номер в международном формате, например +7 999 123-45-67',
    accountNotFound: 'Аккаунт Telegram не найден: номера нет в Telegram или он скрыт настройками приватности',
  },
};
