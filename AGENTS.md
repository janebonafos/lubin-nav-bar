# Architecture rules

- Intake settings separate form sections and standard measures into tabs with collapsible section groups, preserving the existing shared local intake store and preview/editor flows.

- Chat-originated prescription requests use their separate local-only store; manual session prescriptions remain independent to avoid mixing workflows.
- Derive doctor attention counts from the shared chat-request response state through useChatRxQueue; subscribe to same-tab and cross-tab changes so all notification placements stay consistent.
- Use the shared ChatRxCount for doctor attention badges; this indicates pending work, never clinical triage or emergency status.
- Large demo queues use search, review-state filtering and pagination rather than expanding every request at once.
- Provider-booked follow-up designs share a separate local-only appointment store across provider and client views; recurring series expand into individually payable visits with shared series metadata, while email previews and manual calendar exports cannot send messages, charge money, or imply live synchronization.
- The provider demo calendar derives follow-up events directly from the shared follow-up store, so new recurring visits and client payment status updates cannot diverge between views.
- Calendar preview samples are seeded once into the shared local follow-up store, preserving existing bookings and skipping overlapping slots so sample events remain consistent across views.
- The follow-up booking calendar checks shared weekly hours and local follow-up overlaps for the full visit duration and each recurring date; it does not imply external-calendar availability. Visit-length options are chosen from what the provider's available hours allow at the selected time, not as a free dropdown.