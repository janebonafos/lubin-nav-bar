import { useState } from 'react';
import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, startOfMonth } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { bookingDate, useFollowUps } from '@/lib/appointments/followUp';

type Sortable = { date: string; time: string };
const byTime = (a: Sortable, b: Sortable) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`);

export function ProviderFollowUpCalendar() {
  const bookings = useFollowUps();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState('');
  const days = eachDayOfInterval({ start: month, end: endOfMonth(month) });
  const prefix = format(month, 'yyyy-MM');

  const monthBookings = bookings.filter(b => b.date.startsWith(prefix)).sort(byTime);
  // Focus day: the picked day, else the first day this month with visits, else today.
  const focusDate = selected || monthBookings[0]?.date || format(new Date(), 'yyyy-MM-dd');
  const focusEntries = bookings.filter(b => b.date === focusDate).sort(byTime);
  const navigate = (offset: number) => { setMonth(addMonths(month, offset)); setSelected(''); };

  return (
    <section className="space-y-4 font-body text-foreground" aria-label="Provider follow-up calendar">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-brand-purple-dark">Your follow-up calendar</h2>
          <p className="mt-1 text-sm text-muted-foreground">Manila (GMT+8) · Demo calendar only · No external calendar sync</p>
        </div>
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        {/* Left — month grid */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex items-center justify-between px-1">
            <h3 className="text-base font-semibold text-brand-purple-dark">{format(month, 'MMMM yyyy')}</h3>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" aria-label="Previous month" onClick={() => navigate(-1)}><ChevronLeft /></Button>
              <Button variant="outline" size="icon" aria-label="Next month" onClick={() => navigate(1)}><ChevronRight /></Button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="pb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{day}</div>
            ))}
            {Array.from({ length: getDay(month) }, (_, i) => <div key={`blank-${i}`} />)}
            {days.map(day => {
              const date = format(day, 'yyyy-MM-dd');
              const entries = bookings.filter(b => b.date === date);
              const isFocus = date === focusDate;
              return (
                <button
                  key={date}
                  onClick={() => setSelected(isFocus ? '' : date)}
                  aria-label={`${format(day, 'MMMM d, yyyy')}, ${entries.length} follow-ups`}
                  aria-pressed={isFocus}
                  className={`flex h-16 min-w-0 flex-col items-start gap-1 rounded-lg border p-1.5 text-left transition-colors sm:h-20 ${isFocus ? 'border-brand-purple-dark bg-brand-lavender' : 'border-transparent hover:bg-muted'}`}
                >
                  <span className={`text-xs font-semibold ${isFocus ? 'text-brand-purple-dark' : 'text-foreground'}`}>{format(day, 'd')}</span>
                  <div className="flex w-full flex-col gap-0.5">
                    {entries.slice(0, 2).map(b => (
                      <span key={b.id} className={`w-full truncate rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${b.status === 'confirmed' ? 'bg-brand-purple-dark text-primary-foreground' : 'bg-brand-lavender text-brand-purple-dark'}`}>
                        {b.time}
                      </span>
                    ))}
                    {entries.length > 2 && (
                      <span className="px-1 text-[10px] font-medium text-muted-foreground">+{entries.length - 2} more</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        {/* Right — selected day detail */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-lg font-semibold text-brand-purple-dark">{format(new Date(`${focusDate}T00:00:00`), 'MMMM d')}</h3>
            <span className="text-xs text-muted-foreground">{format(new Date(`${focusDate}T00:00:00`), 'EEEE, MMMM d, yyyy')}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-lavender px-2.5 py-1 text-[11px] font-medium text-brand-purple-dark">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-purple-dark" /> Confirmed · Client is booked
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" /> Awaiting payment · Time reserved in demo
            </span>
          </div>
          <div className="mt-4 space-y-2.5">
            {focusEntries.length ? focusEntries.map(b => (
              <div key={b.id} className="rounded-xl border border-border bg-background p-3.5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{b.client} · {b.service}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{bookingDate(b)} · {b.duration} min</p>
                    {b.seriesId && <p className="mt-1 text-xs text-muted-foreground">Recurring visit {b.occurrence} of {b.seriesCount}</p>}
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${b.status === 'confirmed' ? 'bg-brand-lavender text-brand-purple-dark' : 'bg-secondary text-foreground'}`}>
                    {b.status === 'confirmed' ? 'Confirmed' : 'Reserved · Awaiting payment'}
                  </span>
                </div>
              </div>
            )) : (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                No follow-ups on this day.
              </p>
            )}
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
            <p className="text-xs text-muted-foreground">
              {selected ? format(new Date(`${selected}T00:00:00`), 'MMMM d') : 'This month'} · {monthBookings.length} follow-up{monthBookings.length === 1 ? '' : 's'}
            </p>
            {selected && (
              <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setSelected('')}>Show whole month</Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
