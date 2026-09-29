const pad = (n: number) => String(n).padStart(2, '0');

export function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isYesterday(d: Date, now: Date) {
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  return sameDay(d, yesterday);
}

/** Время для списка чатов: сегодня — ЧЧ:ММ, иначе — дата. */
export function formatListTime(ts: number, now = new Date()): string {
  const d = new Date(ts);
  if (sameDay(d, now)) return formatTime(ts);
  if (isYesterday(d, now)) return 'вчера';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '');
}

/** Разделитель дней в ленте сообщений. */
export function formatDayLabel(ts: number, now = new Date()): string {
  const d = new Date(ts);
  if (sameDay(d, now)) return 'Сегодня';
  if (isYesterday(d, now)) return 'Вчера';
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  });
}

export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
