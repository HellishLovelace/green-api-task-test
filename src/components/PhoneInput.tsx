import { useLayoutEffect, useRef, type ChangeEvent, type InputHTMLAttributes } from 'react';
import type { Messenger } from '../model/messenger';
import { caretAfterDigits, formatPhone, isMaxPhonePrefix, sanitizePhoneInput } from '../utils/phone';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  /** только цифры, например "79991234567" */
  value: string;
  onChange: (digits: string) => void;
  messenger: Messenger;
};

/**
 * Поле телефона с маской: принимает только цифры (буквы и прочее отбрасываются),
 * оформляет номер на лету и сохраняет положение каретки.
 */
export function PhoneInput({ value, onChange, messenger, ...rest }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  // сколько цифр должно оказаться слева от каретки после перерисовки
  const caretDigits = useRef<number | null>(null);
  const formatted = formatPhone(value);

  function placeCaret() {
    const el = ref.current;
    if (!el || caretDigits.current == null || document.activeElement !== el) return;
    const pos = caretAfterDigits(el.value, caretDigits.current);
    el.setSelectionRange(pos, pos);
    caretDigits.current = null;
  }

  useLayoutEffect(placeCaret, [formatted]);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const el = e.target;
    const raw = el.value;
    let before = raw.slice(0, el.selectionStart ?? raw.length).replace(/\D/g, '').length;
    let digits = raw.replace(/\D/g, '');

    // стёрли скобку, пробел или дефис — стираем соседнюю цифру, иначе Backspace «застревает»
    const inputType = (e.nativeEvent as InputEvent).inputType;
    if (digits === value && raw.length < formatted.length) {
      if (inputType === 'deleteContentBackward' && before > 0) {
        digits = digits.slice(0, before - 1) + digits.slice(before);
        before -= 1;
      } else if (inputType === 'deleteContentForward') {
        digits = digits.slice(0, before) + digits.slice(before + 1);
      }
    }

    let next = sanitizePhoneInput(digits, messenger);
    if (messenger === 'max' && !isMaxPhonePrefix(next)) next = value; // MAX — только +7 и +375
    caretDigits.current = Math.min(before, next.length);

    if (next === value) {
      // значение не изменилось (ввели букву) — React не перерисует поле, ставим каретку сами
      requestAnimationFrame(placeCaret);
    }
    onChange(next);
  }

  return (
    <input
      {...rest}
      ref={ref}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      value={formatted}
      onChange={handleChange}
    />
  );
}
