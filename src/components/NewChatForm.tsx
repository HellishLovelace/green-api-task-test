import { useState, type FormEvent } from 'react';
import { resolveChatId, type Credentials } from '../api/greenApi';
import { MESSENGERS } from '../model/messenger';
import { isValidPhone } from '../utils/phone';
import { PhoneInput } from './PhoneInput';

interface Props {
  creds: Credentials;
  onCreated: (chatId: string, phone: string, name: string) => void;
}

/** Создание чата по номеру телефона получателя. */
export function NewChatForm({ creds, onCreated }: Props) {
  const { messenger } = creds;
  const [phone, setPhone] = useState(''); // только цифры
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!isValidPhone(phone, messenger)) {
      setError(MESSENGERS[messenger].phoneHint);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const chatId = await resolveChatId(creds, phone);
      if (chatId) onCreated(chatId, phone, name.trim());
      else setError(MESSENGERS[messenger].accountNotFound);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="new-chat" onSubmit={submit} noValidate>
      <PhoneInput
        messenger={messenger}
        placeholder="+7 (999) 123-45-67"
        value={phone}
        onChange={(digits) => {
          setPhone(digits);
          setError(null);
        }}
        autoFocus
        aria-label="Номер телефона получателя"
      />
      <input
        placeholder="Имя (необязательно)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-label="Имя получателя"
      />
      {error && <div className="form-error">{error}</div>}
      <button className="primary-btn" type="submit" disabled={loading || !phone}>
        {loading ? <span className="spinner" aria-label="Проверка номера" /> : 'Создать чат'}
      </button>
    </form>
  );
}
