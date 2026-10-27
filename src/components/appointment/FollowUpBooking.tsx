import { useState } from 'react';
import { useAvailabilityStore } from '@/lib/availability-store';
import { followUpSlotState } from '@/lib/appointments/followUpAvailability';
import { FollowUpAvailabilityPicker } from './FollowUpAvailabilityPicker';
import { Link } from '@tanstack/react-router';
import { CalendarDays, Mail, ArrowRight, Check, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { bookingDate, calendarFile, FOLLOW_UP_PROMOS, REPEAT_LABELS, followUpDates, followUpStatus, followUpTotal, saveFollowUp, saveFollowUpSeries, useFollowUps, type FollowUpBooking, type RepeatFrequency } from '@/lib/appointments/followUp';

const money = (value: number) => `₱${value.toLocaleString('en-PH')}`;
const field = 'mt-2 w-full rounded-md border border-input bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-purple';
const cta = 'bg-brand-purple-dark text-primary-foreground hover:bg-brand-purple';

export function FollowUpBookingButton({ sourceId, client, provider = 'Maria Santos' }: { sourceId: string; client: string; provider?: string }) {
  const [open, setOpen] = useState(false);
  return <><Button variant="outline" className="font-body text-brand-purple-dark" onClick={() => setOpen(true)}><CalendarDays />Book follow-up</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[92dvh] w-[calc(100%-2rem)] max-w-5xl overflow-y-auto bg-card font-body sm:p-10">
      <BookingForm sourceId={sourceId} client={client} provider={provider} />
    </DialogContent></Dialog></>;
}

function BookingForm({ sourceId, client, provider }: { sourceId: string; client: string; provider: string }) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [duration, setDuration] = useState(30);
  const [service, setService] = useState('Follow-up consultation');
  const [kind, setKind] = useState('paid');
  const [fee, setFee] = useState('1500');
  const [note, setNote] = useState('');
  const [consent, setConsent] = useState(false);
  const [created, setCreated] = useState<FollowUpBooking | null>(null);
  const [error, setError] = useState('');
  const [repeat, setRepeat] = useState<RepeatFrequency>('once');
  const [visits, setVisits] = useState(4);
  const dates = followUpDates(date, repeat, visits);
  const week = useAvailabilityStore(s => s.week);
  const existing = useFollowUps();
  const unavailableDates = dates.filter(d => followUpSlotState(d, time, duration, week, existing, provider) !== 'available');
  if (created) return <>
    <DialogTitle className="text-2xl text-brand-purple-dark">{created.seriesId ? `${created.seriesCount} follow-ups scheduled` : created.status === 'confirmed' ? 'Follow-up confirmed' : 'Booking sent to client'}</DialogTitle>
    <DialogDescription>{created.status === 'confirmed' ? `${client} doesn’t need to book or pay.` : `${client} can confirm this appointment by paying in Lubin.`}</DialogDescription>
    <div className="space-y-3 border-y border-border py-4 text-brand-purple-dark"><p className="flex items-center gap-3 text-sm"><Check className="size-5" />{created.status === 'confirmed' ? 'Added to your demo calendar · Confirmed' : 'Time reserved in your demo calendar · Awaiting client payment'}</p><Link to="/profile" search={{ tab: 'calendar' }} className="text-sm font-semibold underline underline-offset-4">View provider calendar</Link></div>
    {created.seriesId && <div className="space-y-2 border-b border-border pb-4"><p className="text-sm font-semibold text-brand-purple-dark">{REPEAT_LABELS[repeat]} · {created.status === 'confirmed' ? 'All visits confirmed' : 'Payment required separately for each visit'}</p><ol className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">{dates.map((d, i) => <li key={d}>{i + 1}. {bookingDate({ ...created, date: d })}</li>)}</ol></div>}
    <ClientBooking booking={created} />
  </>;
  return <>
    <div><p className="mb-2 text-xs font-semibold uppercase text-brand-purple">AFTER THE APPOINTMENT</p><DialogTitle className="text-2xl text-brand-purple-dark">Book a follow-up</DialogTitle><DialogDescription className="mt-2">Schedule the next visit for {client}.</DialogDescription></div>
    <div className="flex items-center justify-between border-y border-border py-4"><div><p className="font-semibold text-brand-purple-dark">{client}</p><p className="mt-1 text-sm text-muted-foreground">With {provider} · Online</p></div><span className="rounded-full bg-brand-lavender px-3 py-1 text-xs text-brand-purple-dark">Same provider</span></div>
    <form className="grid items-start gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]" onSubmit={e => {
      e.preventDefault();
      if (!consent) { setError('Tick the agreement box before sending this booking.'); return; }
      const amount = kind === 'free' ? 0 : Number(fee);
      if (!date || !service.trim() || !Number.isFinite(amount) || amount < 0 || (kind === 'paid' && amount === 0) || new Date(`${date}T${time}:00+08:00`).getTime() <= Date.now()) { setError('Choose a future appointment and a valid fee, or select Free.'); return; }
      if (unavailableDates.length) { setError('Choose available dates and times for every visit.'); return; }
      const booking: FollowUpBooking = { id: `followup-${crypto.randomUUID()}`, sourceId, client, provider, date, time, duration, service: service.trim(), fee: amount, status: followUpStatus(amount), note };
      const seriesId = repeat === 'once' ? undefined : `series-${crypto.randomUUID()}`;
      const bookings = dates.map((d, i) => ({ ...booking, id: i === 0 ? booking.id : `followup-${crypto.randomUUID()}`, date: d, seriesId, occurrence: i + 1, seriesCount: dates.length, repeat }));
      saveFollowUpSeries(bookings); setCreated(bookings[0] ?? booking);
    }}>
      <div className="space-y-3">
        <FollowUpAvailabilityPicker date={date} time={time} duration={duration} week={week} bookings={existing} provider={provider} onSelect={(d, t) => { setDate(d); setTime(t); setError(''); }} onDuration={setDuration} />
        {unavailableDates.length > 0 && <p role="alert" className="text-sm text-destructive">Unavailable at {time}: {unavailableDates.join(', ')}. Choose another date or time{repeat !== 'once' ? ' for the series' : ''}.</p>}
      </div>
      <div className="space-y-6">
        <label className="block text-sm font-medium">Appointment type<input className={field} value={service} onChange={e => setService(e.target.value)} required /></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Repeat<select className={field} value={repeat} onChange={e => setRepeat(e.target.value as RepeatFrequency)}>{Object.entries(REPEAT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>{repeat !== 'once' && <label className="text-sm font-medium">Number of visits<select className={field} value={visits} onChange={e => setVisits(Number(e.target.value))}>{Array.from({ length: 11 }, (_, i) => i + 2).map(n => <option key={n} value={n}>{n} visits</option>)}</select></label>}</div>
        {repeat !== 'once' && <div className="border-y border-border py-4"><p className="text-sm font-semibold text-brand-purple-dark">{dates.length ? `${dates.length} visits · ${REPEAT_LABELS[repeat].toLowerCase()}` : 'Choose the first visit date'}</p>{dates.length > 0 && <ol className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">{dates.map((d, i) => <li key={d}>{i + 1}. {bookingDate({ date: d, time } as FollowUpBooking)}</li>)}</ol>}<p className="mt-3 text-xs text-muted-foreground">Same time, duration and provider for every visit. {kind === 'paid' ? 'Fee and promos apply to each visit separately.' : 'Every visit confirms automatically.'}</p></div>}
        <fieldset><legend className="mb-3 text-sm font-semibold">Payment</legend><div className="grid grid-cols-2 gap-3">{['paid', 'free'].map(value => <label key={value} className={`flex cursor-pointer items-center gap-3 rounded-md border p-4 ${kind === value ? 'border-brand-purple bg-brand-lavender' : 'border-border'}`}><input type="radio" name="follow-up-fee" value={value} checked={kind === value} onChange={() => setKind(value)} className="accent-brand-purple" /><span className="text-sm font-medium">{value === 'paid' ? 'Client pays' : 'Free follow-up'}</span></label>)}</div></fieldset>
        <div className="space-y-4">
          {kind === 'paid' ? <label className="block text-sm font-medium">{repeat === 'once' ? 'Appointment fee (₱)' : 'Fee per visit (₱)'}<input type="number" min={1} value={fee} onChange={e => setFee(e.target.value)} className={field} required /></label> : <p className="text-sm leading-relaxed text-muted-foreground">Confirmed automatically. The client receives their appointment details without a payment step.</p>}
          <label className="block text-sm font-medium">Note to client <span className="font-normal text-muted-foreground">(optional)</span><textarea rows={2} value={note} onChange={e => setNote(e.target.value)} className={field} /></label>
        </div>
        {kind === 'paid' && <p className="text-sm leading-relaxed text-muted-foreground">Awaiting payment until the client pays. Available offers and a promo-code field appear at checkout.</p>}
        <div className="rounded-lg border border-border bg-muted p-4 text-sm text-muted-foreground"><p>Your demo calendar: {kind === 'free' ? 'Added as confirmed' : 'Time reserved until the client pays'}{repeat !== 'once' ? ' for every visit' : ''}.</p><p className="mt-2">Client receives: Lubin notification · Email from {provider} · Calendar option</p><p className="mt-3 text-xs">Demo only · no real payment, email sending or external calendar sync. Sample fee and promos.</p></div>
        <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${consent ? 'border-brand-purple bg-brand-lavender' : error ? 'border-destructive bg-background' : 'border-border bg-background hover:border-brand-purple/50'}`}>
          <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 flex-none rounded accent-brand-purple" />
          <span className="text-[12.5px] leading-relaxed text-muted-foreground">I agree to Lubin's <Link to="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-purple-dark underline underline-offset-2">Terms</Link> and <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-purple-dark underline underline-offset-2">Privacy Policy</Link>. I confirm this booking is for {client} and that the fee and cancellation policy shown apply to each visit.</span>
        </label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className={`w-full ${cta}`}>{repeat !== 'once' ? kind === 'free' ? `Confirm ${dates.length || visits} free visits` : `Send ${dates.length || visits} bookings to client` : kind === 'free' ? 'Confirm free appointment' : 'Send booking to client'}<ArrowRight /></Button>
      </div>
    </form>
  </>;
}

export function ProviderFollowUps() {
  const bookings = useFollowUps();
  if (!bookings.length) return null;
  return <section className="border-y border-border py-5 font-body"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold text-brand-purple-dark">Follow-ups booked for clients</h2><Link to="/profile" search={{ tab: 'calendar' }} className="text-sm font-semibold text-brand-purple-dark underline underline-offset-4">View provider calendar</Link></div><div className="mt-3 divide-y divide-border">{bookings.slice(0, 3).map(b => <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-semibold">{b.client}</p><p className="mt-1 text-sm text-muted-foreground">{bookingDate(b)} · Manila</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${b.status === 'confirmed' ? 'bg-brand-lavender text-brand-purple-dark' : 'bg-secondary text-foreground'}`}>{b.status === 'confirmed' ? 'Confirmed' : 'Awaiting client payment'}</span></div>)}</div></section>;
}

export function ClientFollowUps() {
  const bookings = useFollowUps();
  const [page, setPage] = useState(1);
  if (!bookings.length) return null;
  const pages = Math.ceil(bookings.length / 3);
  const current = Math.min(page, pages);
  return <section className="space-y-4 font-body"><div><h2 className="text-xl font-semibold text-brand-purple-dark">Booked by your provider</h2><p className="mt-1 text-sm text-muted-foreground">Your next visits, without booking again.</p></div>{bookings.slice((current - 1) * 3, current * 3).map(b => <div key={b.id} className="rounded-lg border border-border bg-card p-5"><ClientBooking booking={b} /></div>)}{pages > 1 && <div className="flex items-center justify-between"><Button variant="outline" disabled={current === 1} onClick={() => setPage(current - 1)}>Previous</Button><span className="text-sm">Page {current} of {pages}</span><Button variant="outline" disabled={current === pages} onClick={() => setPage(current + 1)}>Next</Button></div>}</section>;
}

function ClientBooking({ booking }: { booking: FollowUpBooking }) {
  const all = useFollowUps();
  const b = all.find(item => item.id === booking.id) ?? booking;
  const [view, setView] = useState('lubin');
  const [checkout, setCheckout] = useState(false);
  const [promo, setPromo] = useState('');
  const [applied, setApplied] = useState('');
  const [error, setError] = useState('');
  const [method, setMethod] = useState('GCash');
  const total = followUpTotal(b.fee, applied);
  const confirmed = b.status === 'confirmed';
  function downloadCalendar() {
    const url = URL.createObjectURL(new Blob([calendarFile(b)], { type: 'text/calendar;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'lubin-follow-up.ics'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="space-y-4 font-body text-foreground">
    <div className="flex flex-wrap gap-2 border-b border-border pb-3" role="tablist" aria-label="Appointment notification preview">{['lubin', 'email', 'calendar'].map(v => <Button key={v} role="tab" aria-selected={view === v} variant={view === v ? 'secondary' : 'ghost'} onClick={() => setView(v)} className="capitalize text-brand-purple-dark">{v === 'lubin' ? 'In Lubin' : v === 'email' ? 'Email preview' : 'Calendar'}</Button>)}</div>
    {view === 'email' && <div className="border-b border-border pb-3 text-sm"><p className="font-semibold text-brand-purple-dark">{b.provider}</p><p className="mt-2 text-muted-foreground">From: {b.provider} · provider email</p><p className="mt-1 text-muted-foreground">To: {b.client} · registered email</p><p className="mt-1 font-medium">Subject: {confirmed ? `Your follow-up with ${b.provider} is confirmed` : `${b.provider} scheduled your follow-up`}</p><p className="mt-4">Hi {b.client},</p><p className="mt-2 leading-relaxed">{confirmed ? 'Your next appointment with me is confirmed. I look forward to seeing you.' : 'I’ve scheduled our next appointment. Please review the details below and complete payment in Lubin to confirm your visit.'}</p></div>}
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-brand-purple">{view === 'calendar' ? 'YOUR NEXT VISIT' : 'BOOKED BY YOUR PROVIDER'}</p><h3 className="mt-2 text-lg font-semibold text-brand-purple-dark">{b.service}</h3><p className="mt-1 text-sm text-muted-foreground">With {b.provider}</p></div><span className="shrink-0 rounded-full bg-brand-lavender px-3 py-1 text-xs font-semibold text-brand-purple-dark">{confirmed ? 'Confirmed' : 'Awaiting payment'}</span></div>
    <div className="flex items-center gap-3 border-y border-border py-4"><CalendarDays className="size-5 shrink-0 text-brand-purple" /><div><p className="text-sm font-semibold">{bookingDate(b)}</p><p className="mt-1 text-xs text-muted-foreground">Manila (GMT+8) · {b.duration} min · Online</p></div></div>
    {b.note && <p className="text-sm leading-relaxed text-muted-foreground">{b.note}</p>}
    {b.seriesId && <p className="text-sm font-medium text-brand-purple-dark">Recurring follow-up · Visit {b.occurrence} of {b.seriesCount} · {REPEAT_LABELS[b.repeat ?? 'weekly']}</p>}
    {confirmed ? <><p className="text-sm">{b.fee === 0 ? 'Free follow-up · No payment needed.' : `Paid ${money(b.paidAmount ?? b.fee)}${b.promo ? ` · ${b.promo}` : ''}`} Your appointment is confirmed.</p><Button variant="outline" onClick={downloadCalendar}><CalendarDays />Add to calendar</Button><p className="text-xs text-muted-foreground">Download for Google Calendar, Apple Calendar or Outlook. This demo doesn’t sync automatically.</p></> : <>
      <p className="text-sm leading-relaxed">Your provider has scheduled your next visit. Pay {money(b.fee)} to confirm, or use an eligible promo.</p>
      {view === 'calendar' && <p className="text-sm text-muted-foreground">This visit is awaiting payment. Add it to your calendar once confirmed.</p>}
      {!checkout && <Button className={cta} onClick={() => setCheckout(true)}>Review payment & promos<ArrowRight /></Button>}
      {checkout && <div className="space-y-4 border-t border-border pt-4"><h4 className="font-semibold text-brand-purple-dark">Confirm your follow-up</h4><p className="flex items-center gap-2 text-sm font-medium"><Ticket />Available demo promos</p><div className="space-y-2">{FOLLOW_UP_PROMOS.map(p => <label key={p.code} className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-border px-3 py-3"><span className="text-sm">{p.label}<span className="mt-1 block text-xs text-muted-foreground">{p.code}</span></span><input type="radio" name={`promo-${b.id}`} checked={applied === p.code} onChange={() => { setApplied(p.code); setPromo(p.code); setError(''); }} className="accent-brand-purple" /></label>)}</div>
        <label className="block text-sm font-medium">Have a promo code?<div className="mt-2 flex gap-2"><input aria-label="Promo code" value={promo} onChange={e => setPromo(e.target.value)} className={`${field} mt-0 min-w-0`} /><Button variant="outline" onClick={() => { const code = promo.trim().toUpperCase(); if (!FOLLOW_UP_PROMOS.some(p => p.code === code)) { setError('This promo isn’t available for this follow-up.'); return; } setApplied(code); setError(''); }}>Apply</Button></div></label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}{applied && <div className="flex justify-between text-sm"><p>{applied} applied</p><Button variant="link" size="sm" onClick={() => { setApplied(''); setPromo(''); }}>Remove</Button></div>}
        <dl className="space-y-2 border-y border-border py-4 text-sm"><div className="flex justify-between"><dt>Appointment fee</dt><dd>{money(b.fee)}</dd></div>{applied && <div className="flex justify-between"><dt>Promo savings</dt><dd>−{money(b.fee - total)}</dd></div>}<div className="flex justify-between text-base font-semibold"><dt>Total due</dt><dd>{money(total)}</dd></div></dl>
        {total > 0 && <fieldset><legend className="mb-2 text-sm font-medium">Payment method</legend><div className="flex flex-wrap gap-3">{['GCash', 'Maya', 'Card'].map(m => <label key={m} className="flex items-center gap-2 text-sm"><input type="radio" name={`method-${b.id}`} checked={method === m} onChange={() => setMethod(m)} className="accent-brand-purple" />{m}</label>)}</div></fieldset>}
        <Button className={`w-full ${cta}`} onClick={() => { saveFollowUp({ ...b, status: 'confirmed', paidAmount: total, promo: applied || undefined }); setCheckout(false); }}>{total === 0 ? 'Confirm free appointment' : `Pay ${money(total)} & confirm`}</Button><p className="text-xs text-muted-foreground">Demo only · No money is charged.</p>
      </div>}
    </>}
    {view === 'email' && <><p className="text-sm">{b.provider}</p><p className="flex items-center gap-2 text-xs text-muted-foreground"><Mail className="size-4" />Provider email preview only · Nothing has been sent</p></>}
  </div>;
}
