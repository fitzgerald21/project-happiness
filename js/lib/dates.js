// Dates are stored as local "YYYY-MM-DD" keys so a day means your day, wherever you are.
export function dayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
export function parseKey(k) {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(k, n) {
  const d = parseKey(k);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}
export function diffDays(a, b) {
  return Math.round((parseKey(b) - parseKey(a)) / 86400000);
}
export function lastNDays(n, end = dayKey()) {
  return Array.from({ length: n }, (_, i) => addDays(end, i - (n - 1)));
}
export const keyOfTs = (ts) => dayKey(new Date(ts));

export function fmtLong(k = dayKey()) {
  return parseKey(k).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}
export function fmtShort(k) {
  return parseKey(k).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
export function fmtWeekday(k) {
  return parseKey(k).toLocaleDateString(undefined, { weekday: 'narrow' });
}
export function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
export function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 5) return 'Still up';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Winding down';
}
