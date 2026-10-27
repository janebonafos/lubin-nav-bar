import { useState } from 'react';
import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, startOfMonth } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { bookingDate, useFollowUps } from '@/lib/appointments/followUp';

export function ProviderFollowUpCalendar() {
  const bookings = useFollowUps();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState('');
  const days = eachDayOfInterval({ start: month, end: endOfMonth(month) });
  const prefix = format(month, 'yyyy-MM');
  const visible = bookings.filter(b => b.date.startsWith(prefix) && (!selected || b.date === selected))
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
  const navigate = (offset: number) => { setMonth(addMonths(month, offset)); setSelected(''); };

  return <section className="space-y-5 border-y border-border py-6 font-body text-foreground" aria-label="Provider follow-up calendar">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-lg font-semibold text-brand-purple-dark">Your follow-up calendar</h2><p className="mt-1 text-sm text-muted-foreground">Manila (GMT+8) · Demo calendar only · No external calendar sync</p></div>
      <div className="flex items-center gap-2"><Button variant="outline" size="icon" aria-label="Previous month" onClick={() => navigate(-1)}><ChevronLeft /></Button><span className="w-36 text-center text-sm font-semibold">{format(month, 'MMMM yyyy')}</span><Button variant="outline" size="icon" aria-label="Next month" onClick={() => navigate(1)}><ChevronRight /></Button></div>
    </div>
    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground"><span>Confirmed · Client is booked</span><span>Awaiting payment · Time reserved in demo</span></div>
    <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-border">
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="bg-muted py-2 text-center text-xs font-semibold">{day}</div>)}
      {Array.from({ length: getDay(month) }, (_, i) => <div key={`blank-${i}`} className="min-h-20 border-t border-border bg-muted/30" />)}
      {days.map(day => {
        const date = format(day, 'yyyy-MM-dd');
        const entries = bookings.filter(b => b.date === date);
        return <Button key={date} variant="ghost" aria-label={`${format(day, 'MMMM d, yyyy')}, ${entries.length} follow-ups`} aria-pressed={selected === date} onClick={() => setSelected(selected === date ? '' : date)} className={`h-20 min-w-0 flex-col items-start justify-start gap-1 rounded-none border-t border-border px-2 py-2 sm:h-24 ${selected === date ? 'bg-brand-lavender text-brand-purple-dark' : ''}`}>
          <span className="text-sm">{format(day, 'd')}</span>
          {entries.length > 0 && <span className="w-full truncate text-left text-xs font-semibold text-brand-purple-dark">{entries.length} visit{entries.length === 1 ? '' : 's'}</span>}
        </Button>;
      })}
    </div>
    <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">{selected ? format(new Date(`${selected}T00:00:00`), 'MMMM d') : 'This month'} · {visible.length} follow-ups</h3>{selected && <Button variant="link" size="sm" onClick={() => setSelected('')}>Show month</Button>}</div>
    {visible.length ? <div className="max-h-80 overflow-y-auto divide-y divide-border">{visible.map(b => <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div><p className="text-sm font-semibold">{b.client} · {b.service}</p><p className="mt-1 text-sm text-muted-foreground">{bookingDate(b)} · {b.duration} min</p>{b.seriesId && <p className="mt-1 text-xs text-muted-foreground">Recurring visit {b.occurrence} of {b.seriesCount}</p>}</div>
      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${b.status === 'confirmed' ? 'bg-brand-lavender text-brand-purple-dark' : 'bg-secondary text-foreground'}`}>{b.status === 'confirmed' ? 'Confirmed' : 'Reserved · Awaiting payment'}</span>
    </div>)}</div> : <p className="py-3 text-sm text-muted-foreground">No follow-ups scheduled {selected ? 'on this date' : 'this month'}.</p>}
  </section>;
}