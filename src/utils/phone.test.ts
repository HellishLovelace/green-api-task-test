import { describe, expect, it } from 'vitest';
import { caretAfterDigits, formatPhone, isMaxPhonePrefix, isValidPhone, sanitizePhoneInput } from './phone';

describe('phone utils', () => {
  it('нормализует и проверяет номер', () => {
    expect(sanitizePhoneInput('8 (999) 123-45-67')).toBe('79991234567');
    expect(sanitizePhoneInput('+7 999 abc 123-45-67 доб. 89')).toBe('79991234567'); // буквы и лишние цифры отброшены
    expect(sanitizePhoneInput('8', 'telegram')).toBe('8'); // в Telegram 8 может быть кодом страны
    expect(sanitizePhoneInput('89', 'telegram')).toBe('79');
    expect(sanitizePhoneInput('8612345678901', 'telegram')).toBe('8612345678901');
    expect(isValidPhone('79991234567')).toBe(true);
    expect(isValidPhone('375291234567')).toBe(true);
    expect(isValidPhone('1234')).toBe(false);
    expect(isValidPhone('4915112345678')).toBe(false); // MAX — только РФ и РБ
    expect(isValidPhone('4915112345678', 'telegram')).toBe(true);
    expect(isValidPhone('1234', 'telegram')).toBe(false);
    expect(formatPhone('79991234567')).toBe('+7 (999) 123-45-67');
    expect(formatPhone('375291234567')).toBe('+375 (29) 123-45-67');
    expect(formatPhone('4915112345678')).toBe('+4915112345678');
  });

  it('оформляет недописанный номер и ставит каретку', () => {
    expect(formatPhone('7')).toBe('+7');
    expect(formatPhone('799')).toBe('+7 (99');
    expect(formatPhone('79991')).toBe('+7 (999) 1');
    expect(formatPhone('7999123456')).toBe('+7 (999) 123-45-6');
    expect(caretAfterDigits('+7 (999) 123-45-67', 0)).toBe(1);
    expect(caretAfterDigits('+7 (999) 123-45-67', 4)).toBe(7);
    expect(caretAfterDigits('+7 (999) 123-45-67', 5)).toBe(10);
  });

  it('в MAX пропускает только начало номеров РФ и РБ', () => {
    expect(['', '7', '3', '37', '375', '3752'].every(isMaxPhonePrefix)).toBe(true);
    expect(['4', '38', '376', '1'].some(isMaxPhonePrefix)).toBe(false);
  });
});
