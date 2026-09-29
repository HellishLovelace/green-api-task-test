import type { Messenger } from '../model/messenger';

/** Максимум цифр в номере: РФ — 11, РБ — 12, остальные — 15 (E.164). */
function maxDigits(d: string): number {
  if (d.startsWith('7')) return 11;
  if (d.startsWith('375')) return 12;
  return 15;
}

/**
 * Превращает ввод пользователя в цифры номера: убирает всё лишнее,
 * «8…» по российской привычке заменяет на «7…» и обрезает лишние цифры.
 * В MAX любые номера РФ/РБ, поэтому 8 → 7 сразу; в Telegram — только «89…»
 * (кодов стран на 89 нет, а 81, 86 и другие — реальные коды).
 */
export function sanitizePhoneInput(raw: string, messenger: Messenger = 'max'): string {
  let d = raw.replace(/\D/g, '');
  if (messenger === 'max' ? d.startsWith('8') : d.startsWith('89')) d = '7' + d.slice(1);
  return d.slice(0, maxDigits(d));
}

/** Может ли номер MAX начинаться так (7… или 375…). Пустая строка — да. */
export function isMaxPhonePrefix(d: string): boolean {
  return d === '' || /^(?:7|3(?:7(?:5|$)|$))/.test(d);
}

/**
 * MAX через GREEN-API поддерживает номера РФ (7, 11 цифр) и РБ (375, 12 цифр),
 * Telegram — любые международные номера.
 */
export function isValidPhone(digits: string, messenger: Messenger = 'max'): boolean {
  if (messenger === 'telegram') return /^[1-9]\d{9,14}$/.test(digits);
  return /^7\d{10}$/.test(digits) || /^375\d{9}$/.test(digits);
}

function withMask(code: string, rest: string, sizes: number[]): string {
  const groups: string[] = [];
  for (let i = 0, k = 0; i < rest.length && k < sizes.length; i += sizes[k++]) {
    groups.push(rest.slice(i, i + sizes[k]));
  }
  if (groups.length === 0) return code;
  let s = `${code} (${groups[0]}`;
  if (groups.length > 1) s += `) ${groups[1]}`;
  for (const g of groups.slice(2)) s += `-${g}`;
  return s;
}

/**
 * Форматирует номер (в том числе недописанный — для поля ввода):
 * 79991234567 -> +7 (999) 123-45-67, 375291234567 -> +375 (29) 123-45-67,
 * остальные страны -> +4915112345678.
 */
export function formatPhone(digits: string): string {
  if (!digits) return '';
  if (digits.startsWith('7')) return withMask('+7', digits.slice(1), [3, 3, 2, 2]);
  if (digits.startsWith('375')) return withMask('+375', digits.slice(3), [2, 3, 2, 2]);
  return `+${digits}`;
}

/** Позиция в отформатированной строке сразу после n-й цифры (для каретки). */
export function caretAfterDigits(formatted: string, n: number): number {
  if (n <= 0) {
    const first = formatted.search(/\d/);
    return first === -1 ? formatted.length : first;
  }
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i]) && ++seen === n) return i + 1;
  }
  return formatted.length;
}
