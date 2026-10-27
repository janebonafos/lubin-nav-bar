import { useState } from 'react';
import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, startOfMonth } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatTime12, type WeekAvail } from '@/lib/availability-store';
import type { FollowUpBooking } from '@/lib/appointments/followUp';
import { FOLLOW_UP_TIMES, followUpSlotState } from '@/lib/appointments/followUpAvailability';

const DURATIONS = [30, 50, 60];
const selectedClasses = 'border-brand-purple-dark bg-brand-purple-dark text-primary-foreground hover:border-brand-purple-deep hover:bg-brand-purple-deep hover:text-primary-foreground active:bg-brand-purple-deep';

export function FollowUpAvailabilityPicker({ date, time, duration, week, bookings, provider, onSelect, onDuration }: { date: string; time: string; duration: number; week: WeekAvail; bookings: FollowUpBooking[]; provider: string; onSelect: (date: string, time: string) => void; onDuration: (duration: number) => void }) {
  const [month, setMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const start = startOfMonth(new Date(`${month}-01T12:00:00`));
  const selectedMonth = date ? date.slice(0, 7) : month;
  const shown = selectedMonth === month ? start : startOfMonth(new Date(`${selectedMonth}-01T12:00:00`));
  const days = eachDayOfInterval({ start: shown, end: endOfMonth(shown) });
  const state = (d: string, t: string, dur: number) => followUpSlotState(d, t, dur, week, bookings, provider);
  const slots = date ? FOLLOW_UP_TIMES.filter(t => state(date, t, duration) !== 'outside-hours' && state(date, t, duration) !== 'past') : [];
  function move(offset: number) {
    const next = addMonths(shown, offset);
    setMonth(format(next, 'yyyy-MM'));
    onSelect('', time);
  }
  return <section className="space-y-3 rounded-xl border border-border bg-background p-4" aria-label="Provider availability">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-semibold text-brand-purple-dark">Provider availability</h3><p className="mt-1 text-xs text-muted-foreground">Demo · Weekly hours and saved follow-ups · Manila</p></div><div className="flex items-center gap-1"><Button type="button" variant="ghost" size="icon" aria-label="Previous availability month" onClick={() => move(-1)}><ChevronLeft /></Button><span className="w-32 text-center text-sm font-semibold">{format(shown, 'MMMM yyyy')}</span><Button type="button" variant="ghost" size="icon" aria-label="Next availability month" onClick={() => move(1)}><ChevronRight /></Button></div></div>
    <div className="flex flex-wrap gap-4 text-xs"><span className="font-semibold text-brand-purple-dark">Available</span><span className="text-muted-foreground">Unavailable / past</span></div>
    <div className="grid grid-cols-7 gap-1">
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <span key={d} className="py-1 text-center text-xs text-muted-foreground">{d}</span>)}
      {Array.from({ length: getDay(shown) }, (_, i) => <span key={`empty-${i}`} />)}
      {days.map(d => { const value = format(d, 'yyyy-MM-dd'); const available = FOLLOW_UP_TIMES.some(t => state(value, t, duration) === 'available'); return <Button type="button" key={value} disabled={!available} aria-label={`${format(d, 'MMMM d, yyyy')} · ${available ? 'Available' : 'Unavailable'}`} aria-pressed={date === value} variant={available ? 'outline' : 'ghost'} className={`h-11 min-w-0 px-0 ${date === value ? selectedClasses : available ? 'text-brand-purple-dark' : ''}`} onClick={() => onSelect(value, FOLLOW_UP_TIMES.find(t => state(value, t, duration) === 'available') ?? time)}>{format(d, 'd')}</Button>; })}
    </div>
    {date ? <><p className="text-sm font-semibold">{format(new Date(`${date}T12:00:00`), 'EEE, MMM d')} · {duration}-minute visits</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{slots.map(t => { const booked = state(date, t, duration) === 'booked'; return <Button type="button" key={t} disabled={booked} aria-pressed={time === t} variant="outline" className={`h-12 flex-col gap-0 text-xs ${time === t ? selectedClasses : 'text-brand-purple-dark'}`} onClick={() => onSelect(date, t)}>{formatTime12(t)}{booked && <span className="text-xs">Booked</span>}</Button>; })}</div>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-sm font-semibold text-brand-purple-dark">Visit length</span>
        {DURATIONS.map(d => { const fits = state(date, time, d) === 'available'; return <Button type="button" key={d} variant="outline" disabled={date ? !fits : false} aria-pressed={duration === d} title={fits ? undefined : 'Doesn’t fit the provider’s available hours for this time'} className={`h-9 px-3 text-xs ${duration === d ? selectedClasses : 'text-brand-purple-dark'}`} onClick={() => onDuration(d)}>{d} minutes{!fits ? ' · not available' : ''}</Button>; })}
      </div>
      {!slots.length && <p className="text-xs text-muted-foreground">No available times on this date.</p>}</> : <p className="text-xs text-muted-foreground">Choose an available date.</p>}
  </section>;
}
