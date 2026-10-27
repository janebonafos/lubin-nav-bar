import type { WeekAvail } from '@/lib/availability-store';
import type { FollowUpBooking } from './followUp';

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const minutes = (value: string) => { const [h, m] = value.split(':').map(Number); return h * 60 + m; };
export function followUpSlotState(date: string, time: string, duration: number, week: WeekAvail, bookings: FollowUpBooking[], provider: string, now = Date.now()): 'available' | 'outside-hours' | 'booked' | 'past' {
  if (new Date(`${date}T${time}:00+08:00`).getTime() <= now) return 'past';
  const day = week[weekdays[new Date(`${date}T12:00:00`).getDay()] ?? ''];
  const start = minutes(time);
  const end = start + duration;
  if (!day?.enabled || !day.intervals.some(i => start >= minutes(i.start) && end <= minutes(i.end))) return 'outside-hours';
  if (bookings.some(b => b.provider === provider && b.date === date && start < minutes(b.time) + b.duration && end > minutes(b.time))) return 'booked';
  return 'available';
}
export const FOLLOW_UP_TIMES = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`);