# Getting the prescription to the patient — two paths, one link

Today a signed prescription is either sent to a pharmacy or "given to the patient", and it shows up in the patient's prescription list only if the demo already treats them as the account holder. This plan adds the missing piece: the prescription always travels with a secure claim link, and that link behaves differently depending on whether the person already has a Lubin account.

Frontend prototype only — same local browser storage approach as the rest of the prescription work. No backend, no real email sending.

## The one mechanism behind both flows

Every issued prescription gets an opaque claim link (and the same link as a QR code on the printed/PDF copy). The link is the single route both flows enter through, so there is only one thing to explain to a patient and one thing to build.

```text
prescription signed
   |
   +-- email to patient: medications, prescriber, date + "Open my prescription"
   +-- QR code on the document (for a printed or screenshotted copy)
                 |
                 v
        /rx-claim/<opaque id>
                 |
     +-----------+------------------------+
     |                                    |
 already signed in                   not signed in
 (email matches account)             |
     |                               v
 prescription is already        prescription preview (medication names,
 in "My prescriptions";         prescriber, date) + "Create your free
 link opens it directly        Lubin account to keep this" -> Google /
                              Facebook / LinkedIn / email sign-up
                                     |
                                     v
                        after sign-up: "Is this you?" confirm step
                        - name on the prescription
                        - date of birth
                        - "I'm signing in for someone I care for"
                                     |
                                     v
                        prescription saved to the right profile
```

## Flow 1 — patient is already on Lubin

- At signing, if the patient's email matches an existing account, the prescription is attached to that profile immediately. Nothing for them to claim.
- Their email says "Your prescription is in your Lubin account" and the button opens it straight from their prescriptions list.
- The claim link still works if they open it from a different device — it recognises the signed-in account and just opens the record.

## Flow 2 — patient is not registered yet

- Email says a prescription was issued, lists the medications, strength, prescriber and date, and offers "Open my prescription".
- The link opens a read-only preview so they can use the prescription at a pharmacy right away, even before signing up — no dead end.
- Above the preview: a short card — "Keep this prescription in your health passport" — with Google, Facebook, LinkedIn or email sign-up.
- After sign-up, a single confirm step matches them to the prescription: the name on the prescription and date of birth, then it lands in their profile.
- If the sign-up email is different from the one the prescriber used, that is fine — the confirm step is what links them, not the email.

## Guardian / caregiver case

The confirm step includes "I'm claiming this for someone I care for". Choosing it asks who they are to the patient (parent, guardian, carer) and then files the prescription under the patient's record inside the guardian's account, clearly labelled with the patient's name — so a parent claiming a child's prescription never has it mixed into their own medication list. This reuses the existing caregiver-access idea already in the health passport.

## Unclaimed prescriptions, from the prescriber's side

The provider's prescription list gets a quiet status per record: "In patient's account", "Sent — not yet opened", or "Opened, not yet claimed". Plus a "Resend link" action. Nothing else in the provider workflow changes.

## Where the work lands

- `src/lib/prescription/documents.ts` — add claim state (unclaimed / opened / claimed), claimed-by, and the guardian relationship to the signed document record.
- `src/lib/prescription/viewHandoff.ts` — extend the existing opaque-id mechanism to produce the durable claim id used by the email and QR code.
- New `src/routes/rx-claim.$claimId.tsx` — the single entry route: preview, sign-up prompt, and the "Is this you?" confirm step (including the guardian branch).
- `src/components/appointment/DeliveryStep.tsx` — the "give to patient" path records the claim link and shows it/QR instead of only a confirmation line.
- `src/components/appointment/EPrescriptionDocument.tsx` — QR code of the claim link in the document footer.
- New `src/lib/email-templates/prescription-issued.tsx` + `registry.ts` — branded email with medication names, prescriber, date and the claim button; two subject/copy variants for the registered and unregistered cases.
- `src/components/profile/ClientPrescriptionsSection.tsx` — show prescriptions claimed for a dependent under the patient's name.
- `src/components/profile/ProviderPrescriptionsSection.tsx` — claim status chip and "Resend link".

## Notes

- Sign-up uses the existing prototype auth screen; no real accounts or verification are wired.
- The QR code needs a small QR library; if adding one is not wanted, the document can show the short link text instead.
- The claim link carries no patient or medication data in the URL, consistent with the current prescription-view handoff.
