import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveChatId, withRetry, GreenApiError, type Credentials } from './greenApi';

const creds: Credentials = {
  messenger: 'max',
  apiUrl: 'https://3100.api.green-api.com',
  idInstance: '3100123456',
  apiTokenInstance: 'token',
};

const reply = (status: number, body: unknown = null) =>
  vi.fn(async () => new Response(body == null ? '' : JSON.stringify(body), { status }));

afterEach(() => vi.unstubAllGlobals());

describe('resolveChatId', () => {
  it('возвращает chatId из CheckAccount', async () => {
    vi.stubGlobal('fetch', reply(200, { exist: true, chatId: '10000000' }));
    expect(await resolveChatId(creds, '79991234567')).toBe('10000000');
  });

  it('возвращает null, если аккаунта нет', async () => {
    vi.stubGlobal('fetch', reply(200, { exist: false, chatId: '' }));
    expect(await resolveChatId(creds, '79991234567')).toBeNull();
  });

  it('после 469 два часа не вызывает CheckAccount и создаёт чат по номеру', async () => {
    const limited = reply(469, 'User get contact info limit reached');
    vi.stubGlobal('fetch', limited);
    expect(await resolveChatId(creds, '79991234567')).toBe('79991234567@c.us');

    const next = reply(200, { exist: true, chatId: '10000000' });
    vi.stubGlobal('fetch', next);
    expect(await resolveChatId(creds, '79001112233')).toBe('79001112233@c.us');
    expect(next).not.toHaveBeenCalled();
  });
});

describe('withRetry', () => {
  it('повторяет запрос при 429 и не повторяет при других ошибках', async () => {
    vi.useFakeTimers();
    const flaky = vi.fn().mockRejectedValueOnce(new GreenApiError('limit', 429)).mockResolvedValueOnce('ok');
    const done = withRetry(flaky);
    await vi.runAllTimersAsync();
    expect(await done).toBe('ok');
    expect(flaky).toHaveBeenCalledTimes(2);

    const broken = vi.fn().mockRejectedValue(new GreenApiError('bad token', 401));
    await expect(withRetry(broken)).rejects.toThrow('bad token');
    expect(broken).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
