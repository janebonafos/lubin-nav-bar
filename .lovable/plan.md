# Review: Professional → Appointments → Completed → Details (non-Rx flow)

Read-only review. No code changed. Prescription/Rx functionality excluded except where it blocks the non-Rx path.

## What the flow actually does today

1. **Provider dashboard** (`/provider-onboarding`) → **Appointments** (`/provider/appointments`, which renders the same `AppointmentsSection` used by the profile Appointments tab).
2. The list shows stat cards (This week / Completed / No-show rate), tabs All · Upcoming · Completed · Cancelled with counts, and one row per booking (date block, client, status pill, type, duration, time, mode).
3. For a **completed** booking the row action is **Details**, which opens `/appointment/details?id=…&d=<base64 appointment>` in a **new tab**. Upcoming rows instead expand inline and offer Join session / Record outcome (which opens the same details page).
4. The details page ("Complete your session notes") shows: back link to Appointments, header facts (Client, Appointment date/time, Session type + duration/mode, Status), a **progress timeline** (Private clinical notes → Summary for <client> → [Prescription, prescribers only] → Close the appointment) with a "Next:" hint bar, a collapsible **"Health information <client> shared"** panel (provider brief + assessment history), then the numbered step cards and a close-out card.

## Fields and actions on the completed details / post-session form

**Step 1 — Private clinical notes** (never shared)
- Free-text notes textarea; Add clinical notes / Edit, Save notes, Cancel.
- Escape hatch: "No private notes for this session" acknowledgement.
- Pill: Complete / Not started / Nothing to add.

**Step 2 — Shared summary for the client** (locked until step 1 is done)
- Session recap (badged "Required to share"), Agreed next steps (optional, bold/bullet/number toolbar, one step per line), collapsible "Add files, links, or take-home notes": file upload with title + description + link-to-next-step, helpful links with title/URL/description/link-to-step, take-home notes.
- Autosave draft indicator, Save draft, Preview as <client>, confirmation checkbox "I reviewed this summary…", Share summary with <client>.
- After sharing: per-field Edit, change detection, "Update summary".
- Escape hatch: checkbox "I have decided not to send a written summary" + Confirm and continue.

**Close out**
- Locked message while steps remain; when all steps are handled: "Mark the appointment as completed" (sets status completed + outcome completed, toast, publishes to the list); once completed: confirmation plus "Back to Appointments" and "Close".

Elsewhere in the flow: the inline expanded row also renders the notes block plus a **Payout review** status card.

## Blocking issues and inconsistencies

1. **The 5-option outcome selection is not reachable.** `OUTCOMES` (Completed, Client no-show, Provider no-show, Cancelled, Rescheduled) is defined but only used to render a label; close-out hard-codes `outcome: "completed"`. A provider cannot record a no-show or cancellation from the details page even though the list, label logic and payout copy all assume outcomes exist. `ProviderVisitWorkspace.tsx` is exported but imported nowhere — dead surface.
2. **"Completed" in the list is not the same as completed on the details page.** The list renders a completed appointment as **"confirmed"** until `publishedFollowUp` exists — so an item inside the Completed tab shows an Upcoming-style pill, and a provider who legitimately shares nothing (summary escape hatch) never gets the Completed pill even after closing the appointment. Tab filter (status) and pill (status + share) disagree.
3. **Step 1 done-state is lost on reload.** The card's done/check state uses `privateNotesSaved && hasNotes`, a session-only flag; the timeline uses `hasNotes`. After a reload the same step reads done in the timeline and not-done in the card.
4. **Step 2 can complete without its own required field.** Nothing enforces Session recap before sharing beyond the confirm checkbox, and "Confirm and continue" marks the step complete permanently — acknowledgements (`acks`) can never be undone.
5. **"Session ended · Follow-up in progress" is inferred from a fragile date parse.** Month/day/time strings are parsed with the **current year** and no timezone; unparseable values fall back to "not past", and year boundaries mis-order. Any appointment past its computed start shows post-session steps whether or not it was delivered.
6. **State lives in `localStorage` and the URL.** The appointment payload (client name, notes, amount, payment status) is base64-encoded into the link and cached under `lubin:appt-details:<id>`; the list re-hydrates from the same keys. Clearing the browser yields "Session not found", a second device shows nothing, and clinical/payment data sits in a shareable URL. The file marks this prototype-only — this is the main blocker to approving the flow as production behaviour.
7. **Details opens in a new tab** (`window.open`), so there is no in-app back stack; "Close" calls `history.back()` which is a no-op in a fresh tab and then duplicates "Back to Appointments".
8. **Non-Rx providers still see prescription-shaped copy.** Step 1 is badged "Required before prescribing", step 2 "Decision required before prescribing", and step 1's escape hatch explains prescribing rules — even for professions where the Prescription step is hidden entirely.
9. **Payout review appears only on the inline expanded row**, not on the details page, while the details-page outcome copy promises payout consequences the page never shows.
10. **Hard-coded client name in shared copy.** Supporting-information help text says "…Anna can use between sessions" and the take-home placeholder "What Anna can practice", regardless of the actual client.
11. **Minor.** Stat cards ("This week 6 · 3 confirmed · 3 pending", "No-show rate 2%") are static strings that contradict the seeded list. Attachments store metadata only — no file is persisted, so a shared file cannot actually be opened by the client.

## Suggested remediation order (only if you want these fixed)

1. Data source: load the appointment from authenticated data instead of URL payload + localStorage (items 6, 3).
2. Outcome recording: surface the five outcomes at close-out and drive status, pill and payout from the recorded outcome (items 1, 2, 9).
3. Step-state consistency: derive done-state from persisted data, allow undoing acknowledgements, require Session recap before sharing (items 3, 4).
4. Copy and labels: profession-aware badges, dynamic client name, reliable session-ended derivation (items 5, 8, 10).
5. Cleanup: remove or wire up `ProviderVisitWorkspace`, make stat cards real, navigate in-app for Details (items 1, 7, 11).