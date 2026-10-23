import { wedding } from '../config/wedding';

export type Lang = 'en' | 'km';

const KHMER_DIGITS = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
const KHMER_MONTHS = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'];
const KHMER_WEEKDAYS = ['អាទិត្យ', 'ចន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'];

export const toKhmerDigits = (value: string | number) =>
  String(value).replace(/\d/g, (d) => KHMER_DIGITS[Number(d)]);

/** Render digits in the reader's script. */
export const num = (lang: Lang, value: string | number) => (lang === 'km' ? toKhmerDigits(value) : String(value));

interface Parts {
  year: number;
  month: number; // 0-based
  day: number;
  weekday: number; // 0 = Sunday
  hour: number;
  minute: number;
}

/** Calendar parts of an instant in the wedding's time zone, independent of the viewer's zone. */
function partsInVenueZone(iso: string): Parts {
  const date = new Date(iso);
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: wedding.timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  });
  const map = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    year: Number(map.year),
    month: Number(map.month) - 1,
    day: Number(map.day),
    weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(map.weekday),
    hour: Number(map.hour) % 24,
    minute: Number(map.minute),
  };
}

const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const EN_WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "Sunday, 27 December 2026" / "ថ្ងៃអាទិត្យ ទី២៧ ខែធ្នូ ឆ្នាំ២០២៦" */
export function formatLongDate(lang: Lang, iso: string, withWeekday = true): string {
  const p = partsInVenueZone(iso);
  if (lang === 'km') {
    const day = `ទី${toKhmerDigits(p.day)} ខែ${KHMER_MONTHS[p.month]} ឆ្នាំ${toKhmerDigits(p.year)}`;
    return withWeekday ? `ថ្ងៃ${KHMER_WEEKDAYS[p.weekday]} ${day}` : day;
  }
  const day = `${p.day} ${EN_MONTHS[p.month]} ${p.year}`;
  return withWeekday ? `${EN_WEEKDAYS[p.weekday]}, ${day}` : day;
}

/** "7:00 AM" / "ម៉ោង ៧:០០ ព្រឹក" */
export function formatTime(lang: Lang, iso: string): string {
  const { hour, minute } = partsInVenueZone(iso);
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const mm = String(minute).padStart(2, '0');
  if (lang === 'km') {
    const period = hour < 12 ? 'ព្រឹក' : hour < 17 ? 'រសៀល' : hour < 19 ? 'ល្ងាច' : 'យប់';
    return `ម៉ោង ${toKhmerDigits(`${h12}:${mm}`)} ${period}`;
  }
  return `${h12}:${mm} ${hour < 12 ? 'AM' : 'PM'}`;
}

/** Short relative date for guestbook entries. */
export function formatRelative(lang: Lang, iso: string, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const minutes = Math.round(diff / 60_000);
  const hours = Math.round(diff / 3_600_000);
  const days = Math.round(diff / 86_400_000);
  if (lang === 'km') {
    if (minutes < 1) return 'មុននេះបន្តិច';
    if (minutes < 60) return `${toKhmerDigits(minutes)} នាទីមុន`;
    if (hours < 24) return `${toKhmerDigits(hours)} ម៉ោងមុន`;
    if (days < 30) return `${toKhmerDigits(days)} ថ្ងៃមុន`;
    return formatLongDate('km', iso, false);
  }
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hr ago`;
  if (days < 30) return days === 1 ? 'yesterday' : `${days} days ago`;
  return formatLongDate('en', iso, false);
}

const EN_WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const EN_MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Sat, 26 Dec" / "ថ្ងៃសៅរ៍ ២៦ ធ្នូ" — compact label for the day switcher. */
export function formatShortDate(lang: Lang, iso: string): string {
  const p = partsInVenueZone(iso);
  if (lang === 'km') return `ថ្ងៃ${KHMER_WEEKDAYS[p.weekday]} ${toKhmerDigits(p.day)} ${KHMER_MONTHS[p.month]}`;
  return `${EN_WEEKDAYS_SHORT[p.weekday]}, ${p.day} ${EN_MONTHS_SHORT[p.month]}`;
}

/** "November 3035" / "ខែវិច្ឆិកា ឆ្នាំ៣០៣៥" */
export function formatMonthYear(lang: Lang, month: number, year: number): string {
  if (lang === 'km') return `ខែ${KHMER_MONTHS[month - 1]} ឆ្នាំ${toKhmerDigits(year)}`;
  return `${EN_MONTHS[month - 1]} ${year}`;
}

/** The wedding date as the hero and footer show it (wedding.dateDisplay). */
export function weddingDateLabel(lang: Lang, variant: 'full' | 'short' = 'full'): string {
  return wedding.dateDisplay[variant][lang];
}
