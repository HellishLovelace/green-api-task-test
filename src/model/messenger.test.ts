import { describe, expect, it } from 'vitest';
import { messengerOfInstance } from './messenger';

describe('messengerOfInstance', () => {
  it('определяет мессенджер по typeInstance из GetSettings', () => {
    expect(messengerOfInstance('v3')).toBe('max');
    expect(messengerOfInstance('telegram')).toBe('telegram');
    expect(messengerOfInstance('whatsapp')).toBeNull();
    expect(messengerOfInstance(undefined)).toBeNull();
  });
});
