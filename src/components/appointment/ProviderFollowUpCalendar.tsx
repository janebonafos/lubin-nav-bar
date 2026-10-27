import { useState } from 'react';
import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, startOfMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatTime12 } from '@/lib/availability-store';
import { useFollowUps, type FollowUpBooking } from '@/lib/appointments/followUp';

type Sortable = { date: string; time: string };
const byTime = (a: Sortable, b: Sortable) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`);

// The day rail spans the provider's working day; it widens if a visit falls outside.
const RAIL_START = 8;
const RAIL_END = 17;
const hourOf = (time: string) => Number(time.slice(0, 2));

function railHours(entries: Sortable[]) {
  const hours = entries.map(b => hourOf(b.time));
  const start = hours.length ? Math.min(RAIL_START, ...hours) : RAIL_START;
  const end = hours.length ? Math.max(RAIL_END, ...hours) : RAIL_END;
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}
const hourLabel = (h: number) => formatTime12(`${String(h).padStart(2, '0')}:00`);

export function ProviderFollowUpCalendar() {
  const bookings = useFollowUps();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState('');
  const days = eachDayOfInterval({ start: month, end: endOfMonth(month) });
  const prefix = format(month, 'yyyy-MM');
  const rows = Math.ceil((getDay(month) + days.length) / 7);

  const monthBookings = bookings.filter(b => b.date.startsWith(prefix)).sort(byTime);
  // Focus day: the picked day, else the first day this month with visits, else today.
  const focusDate = selected || monthBookings[0]?.date || format(new Date(), 'yyyy-MM-dd');
  const focusEntries = bookings.filter(b => b.date === focusDate).sort(byTime);
  const hours = railHours(focusEntries);
  const [openId, setOpenId] = useState('');
  const [inCall, setInCall] = useState('');
  const openBooking = bookings.find(b => b.id === openId);
  const navigate = (offset: number) => { setMonth(addMonths(month, offset)); setSelected(''); setOpenId(''); };
  const jumpToday = () => { setMonth(startOfMonth(new Date())); setSelected(format(new Date(), 'yyyy-MM-dd')); };

  return (
    <section className="space-y-4 font-body text-foreground" aria-label="Provider follow-up calendar">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-brand-purple-dark">Your follow-up calendar</h2>
          <p className="mt-1 text-sm text-[#6B6480]">Manila (GMT+8) · Demo calendar only · No external calendar sync</p>
        </div>
      </div>
      <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        {/* Left — month grid */}
        <div className="flex h-full flex-col rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2 px-1">
            <h3 className="text-base font-semibold text-brand-purple-dark">{format(month, 'MMMM yyyy')}</h3>
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="sm" className="h-8 px-3 text-xs text-brand-purple-dark" onClick={jumpToday}>Today</Button>
              <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Previous month" onClick={() => navigate(-1)}><ChevronLeft /></Button>
              <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Next month" onClick={() => navigate(1)}><ChevronRight /></Button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="pb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-brand-purple-dark/70">{day}</div>
            ))}
          </div>
          <div
            className="grid min-h-0 flex-1 grid-cols-7 gap-1"
            style={{ gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: getDay(month) }, (_, i) => <div key={`blank-${i}`} />)}
            {days.map(day => {
              const date = format(day, 'yyyy-MM-dd');
              const entries = bookings.filter(b => b.date === date).sort(byTime);
              const isFocus = date === focusDate;
              const isToday = date === format(new Date(), 'yyyy-MM-dd');
              return (
                <button
                  key={date}
                  onClick={() => setSelected(isFocus ? '' : date)}
                  aria-label={`${format(day, 'MMMM d, yyyy')}, ${entries.length} follow-ups`}
                  aria-pressed={isFocus}
                  className={`flex min-h-[56px] min-w-0 flex-col items-start gap-1 rounded-lg border p-1.5 text-left transition-colors ${
                    isFocus
                      ? 'border-brand-purple-dark bg-brand-lavender'
                      : isToday
                        ? 'border-brand-purple-accent bg-card hover:bg-muted'
                        : 'border-transparent hover:bg-muted'
                  }`}
                >
                  <span className={`text-xs font-semibold ${isFocus ? 'text-brand-purple-dark' : 'text-foreground'}`}>{format(day, 'd')}</span>
                  <div className="flex w-full flex-col gap-0.5">
                    {entries.slice(0, 2).map(b => (
                      <span key={b.id} className={`w-full truncate rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${b.status === 'confirmed' ? 'bg-brand-purple-dark text-primary-foreground' : 'bg-brand-purple-accent/35 text-brand-purple-dark'}`}>
                        {formatTime12(b.time)}
                      </span>
                    ))}
                    {entries.length > 2 && (
                      <span className="px-1 text-[10px] font-medium text-[#5B5470]">+{entries.length - 2} more</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        {/* Right — day rail */}
        {openBooking ? (
          <VisitDetails booking={openBooking} inCall={inCall === openBooking.id} onJoin={() => setInCall(openBooking.id)} onLeave={() => setInCall('')} onBack={() => { setOpenId(''); setInCall(''); }} />
        ) : (
        <div className="flex h-full flex-col rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-lg font-semibold text-brand-purple-dark">{format(new Date(`${focusDate}T00:00:00`), 'EEEE, MMMM d')}</h3>
            <span className="text-xs font-medium text-[#5B5470]">{focusEntries.length} follow-up{focusEntries.length === 1 ? '' : 's'}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-lavender px-2.5 py-1 text-[11px] font-medium text-brand-purple-dark">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-purple-dark" /> Confirmed · Client is booked
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-[#6B6480]">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-purple-accent" /> Awaiting payment · Time reserved in demo
            </span>
          </div>
          {!focusEntries.length && (
            <p className="mt-4 rounded-xl border border-dashed border-border px-4 py-3 text-center text-sm text-[#5B5470]">
              No follow-ups on this day.
            </p>
          )}
          <div className="mt-4 flex min-h-0 flex-1 flex-col">
            {hours.map(h => {
              const bucket = focusEntries.filter(b => hourOf(b.time) === h);
              return (
                <div key={h} className={`flex min-h-10 gap-3 ${bucket.length ? '' : 'flex-1'}`}>
                  <span className="w-16 shrink-0 pt-1 text-right text-[11px] font-semibold tabular-nums text-brand-purple-dark/70">{hourLabel(h)}</span>
                  <div className="flex-1 space-y-2 border-t border-dashed border-border px-0 pb-2 pt-1.5">
                    {bucket.map(b => (
                      <button type="button" onClick={() => setOpenId(b.id)} aria-label={`Open details for ${b.client} at ${formatTime12(b.time)}`} key={b.id} className={`block w-full rounded-lg border px-3 py-2 text-left transition hover:border-brand-purple-dark/50 hover:shadow-sm ${b.status === 'confirmed' ? 'border-brand-purple-dark/25 bg-brand-lavender' : 'border-border bg-background'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold leading-snug text-brand-purple-dark">{b.client} · {b.service}</p>
                            <p className="mt-0.5 text-[11px] text-[#5B5470]">
                              {formatTime12(b.time)} · {b.duration} min{b.seriesId ? ` · visit ${b.occurrence} of ${b.seriesCount}` : ''}
                            </p>
                          </div>
                          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${b.status === 'confirmed' ? 'bg-brand-purple-dark text-primary-foreground' : 'bg-secondary text-foreground'}`}>
                            {b.status === 'confirmed' ? 'Confirmed' : 'Awaiting payment'}
                          </span>
                        </div>
                        {joinState(b) === 'open' && <span className="mt-1.5 inline-block rounded-full bg-brand-purple-dark px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">Call open · Join now</span>}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
            <p className="text-xs font-medium text-[#6B6480]">
              {selected ? format(new Date(`${selected}T00:00:00`), 'MMMM d') : 'This month'} · {monthBookings.length} follow-up{monthBookings.length === 1 ? '' : 's'}
            </p>
            {selected && (
              <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setSelected('')}>Show whole month</Button>
            )}
          </div>
        </div>
        )}
      </div>
    </section>
  );
}

// Call opens 10 minutes before start and closes when the visit ends (Manila time).
function joinState(b: FollowUpBooking, now = Date.now()): 'unpaid' | 'early' | 'open' | 'ended' {
  if (b.status !== 'confirmed') return 'unpaid';
  const start = new Date(`${b.date}T${b.time}:00+08:00`).getTime();
  if (now < start - 10 * 60_000) return 'early';
  if (now > start + b.duration * 60_000) return 'ended';
  return 'open';
}

function VisitDetails({ booking: b, inCall, onJoin, onLeave, onBack }: { booking: FollowUpBooking; inCall: boolean; onJoin: () => void; onLeave: () => void; onBack: () => void }) {
  const state = joinState(b);
  const rows: [string, string][] = [
    ['Client', b.client],
    ['Service', b.service],
    ['When', `${format(new Date(`${b.date}T00:00:00`), 'EEEE, MMMM d')} · ${formatTime12(b.time)} (Manila)`],
    ['Length', `${b.duration} min`],
    ['Fee', b.fee ? `₱${b.fee.toLocaleString()}` : 'Free'],
    ...(b.seriesId ? [['Series', `Visit ${b.occurrence} of ${b.seriesCount}`] as [string, string]] : []),
  ];
  const hint = {
    unpaid: 'The call unlocks once the client pays for this visit.',
    early: 'You can join from 10 minutes before the start time.',
    open: 'The call is open. Your client can join from their Passport.',
    ended: 'This visit has ended.',
  }[state];
  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <button type="button" onClick={onBack} className="inline-flex w-fit items-center gap-1 text-xs font-semibold text-brand-purple-dark hover:underline">
        <ChevronLeft className="h-3.5 w-3.5" /> Back to day
      </button>
      <div className="mt-3 flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold text-brand-purple-dark">{b.client}</h3>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${b.status === 'confirmed' ? 'bg-brand-purple-dark text-primary-foreground' : 'bg-secondary text-foreground'}`}>
          {b.status === 'confirmed' ? 'Confirmed' : 'Awaiting payment'}
        </span>
      </div>
      <dl className="mt-4 divide-y divide-border rounded-lg border border-border">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 px-3 py-2.5 text-sm">
            <dt className="text-[#5B5470]">{k}</dt><dd className="text-right font-medium text-brand-purple-dark">{v}</dd>
          </div>
        ))}
      </dl>
      {b.note && <p className="mt-3 rounded-lg bg-brand-lavender px-3 py-2 text-sm text-brand-purple-dark"><span className="font-semibold">Note: </span>{b.note}</p>}
      <div className="mt-auto pt-5">
        {inCall ? (
          <div className="rounded-xl bg-brand-purple-dark p-4 text-primary-foreground">
            <p className="text-sm font-semibold">You're in the call with {b.client}</p>
            <p className="mt-1 text-xs opacity-80">Demo call only · no audio or video is connected.</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={onLeave}>Leave call</Button>
          </div>
        ) : (
          <>
            <Button className="w-full" disabled={state !== 'open'} onClick={onJoin}>
              <Video className="mr-1.5 h-4 w-4" /> Join call
            </Button>
            <p className="mt-2 text-center text-xs text-[#5B5470]">{hint}</p>
          </>
        )}
      </div>
    </div>
  );
}
