import { useEffect, useState } from 'react';
import { addDays, addMonths, format, parseISO } from 'date-fns';

export type RepeatFrequency = 'once' | 'weekly' | 'fortnightly' | 'monthly';
export const REPEAT_LABELS: Record<RepeatFrequency, string> = { once: 'Does not repeat', weekly: 'Every week', fortnightly: 'Every 2 weeks', monthly: 'Every month' };
export function followUpDates(date: string, frequency: RepeatFrequency, count: number) {
  if (!date) return [];
  const start = parseISO(date);
  if (Number.isNaN(start.getTime())) return [];
  const visits = frequency === 'once' ? 1 : Math.min(12, Math.max(2, Math.floor(count) || 2));
  return Array.from({ length: visits }, (_, index) => format(frequency === 'monthly' ? addMonths(start, index) : addDays(start, index * (frequency === 'fortnightly' ? 14 : 7)), 'yyyy-MM-dd'));
}

export type FollowUpBooking = {
  id: string; sourceId: string; client: string; provider: string;
  date: string; time: string; duration: number; service: string;
  fee: number; status: 'awaiting-payment' | 'confirmed'; note: string;
  paidAmount?: number; promo?: string;
  seriesId?: string; occurrence?: number; seriesCount?: number; repeat?: RepeatFrequency;
};
export const FOLLOW_UP_PROMOS = [
  { code: 'FOLLOWUP20', label: '20% off your follow-up', discount: 0.2 },
  { code: 'CARE100', label: 'Complimentary follow-up', discount: 1 },
];
export function followUpTotal(fee: number, code = '') {
  const promo = FOLLOW_UP_PROMOS.find(p => p.code === code.trim().toUpperCase());
  return Math.max(0, Math.round(fee * (1 - (promo?.discount ?? 0))));
}
export function followUpStatus(fee: number): FollowUpBooking['status'] {
  return fee === 0 ? 'confirmed' : 'awaiting-payment';
}
const KEY = 'lubin.follow-up-design.v1';
const EVENT = 'lubin:follow-up-design';
function read(): FollowUpBooking[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
export function saveFollowUp(booking: FollowUpBooking) {
  saveFollowUpSeries([booking]);
}
export function saveFollowUpSeries(bookings: FollowUpBooking[]) {
  const ids = new Set(bookings.map(b => b.id));
  localStorage.setItem(KEY, JSON.stringify([...bookings, ...read().filter(b => !ids.has(b.id))]));
  window.dispatchEvent(new Event(EVENT));
}
// Fictional examples are added once, without replacing existing local bookings.
export function demoCalendarBookings(existing: FollowUpBooking[], today: string): FollowUpBooking[] {
  const names = ['Miguel Cruz', 'Sofia Lim', 'Daniel Garcia', 'Isabel Tan', 'Paolo Rivera', 'Camille Flores'];
  const slots = [['10:00', '13:00', '15:30'], ['10:30', '14:00'], ['09:30', '11:00', '14:30', '16:00'], ['10:00', '15:00'], ['09:00', '13:30']];
  const dates: string[] = [];
  for (let offset = 1; dates.length < slots.length; offset++) {
    const day = addDays(parseISO(today), offset);
    if (day.getDay() !== 0 && day.getDay() !== 6) dates.push(format(day, 'yyyy-MM-dd'));
  }
  const samples: FollowUpBooking[] = [];
  dates.forEach((date, dayIndex) => slots[dayIndex].forEach((time, index) => {
    const start = Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
    const duration = index % 2 === 0 ? 30 : 50;
    const overlap = existing.some(b => {
      const other = Number(b.time.slice(0, 2)) * 60 + Number(b.time.slice(3));
      return b.date === date && start < other + b.duration && other < start + duration;
    });
    if (overlap) return;
    const confirmed = (dayIndex + index) % 3 !== 0;
    samples.push({
      id: `demo-calendar-${date}-${time}`, sourceId: 'demo-calendar',
      client: names[(dayIndex + index) % names.length], provider: 'Maria Santos',
      date, time, duration, service: 'Follow-up', fee: 1500,
      status: confirmed ? 'confirmed' : 'awaiting-payment',
      ...(confirmed ? { paidAmount: 1500 } : {}),
      note: 'Fictional appointment for the local calendar preview.',
    });
  }));
  return samples;
}
export function seedDemoCalendarBookings() {
  const marker = 'lubin.follow-up-calendar-samples.v1';
  if (localStorage.getItem(marker)) return;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  saveFollowUpSeries(demoCalendarBookings(read(), today));
  localStorage.setItem(marker, 'added');
}
export function useFollowUps() {
  const [bookings, setBookings] = useState<FollowUpBooking[]>([]);
  useEffect(() => {
    const update = () => setBookings(read());
    const storage = (event: StorageEvent) => { if (event.key === KEY) update(); };
    update(); window.addEventListener(EVENT, update); window.addEventListener('storage', storage);
    return () => { window.removeEventListener(EVENT, update); window.removeEventListener('storage', storage); };
  }, []);
  return bookings;
}
export function bookingDate(b: FollowUpBooking) {
  return new Date(`${b.date}T${b.time}:00+08:00`).toLocaleString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila',
  });
}
export function calendarFile(b: FollowUpBooking) {
  const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const start = new Date(`${b.date}T${b.time}:00+08:00`);
  const escape = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Lubin//Follow-up//EN', 'BEGIN:VEVENT',
    `UID:${b.id}@lubin.local`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(new Date(start.getTime() + b.duration * 60000))}`,
    `SUMMARY:${escape(`Lubin appointment with ${b.provider}`)}`, 'LOCATION:Lubin online appointment',
    'STATUS:CONFIRMED', 'END:VEVENT', 'END:VCALENDAR', ''].join('\r\n');
}