# Architecture rules

- Chat-originated prescription requests use their separate local-only store; manual session prescriptions remain independent to avoid mixing workflows.
- Derive doctor attention counts from the shared chat-request response state through useChatRxQueue; subscribe to same-tab and cross-tab changes so all notification placements stay consistent.
- Use the shared ChatRxCount for doctor attention badges; this indicates pending work, never clinical triage or emergency status.
- Large demo queues use search, review-state filtering and pagination rather than expanding every request at once.
- Provider-booked follow-up designs share a separate local-only appointment store across provider and client views; recurring series expand into individually payable visits with shared series metadata, while email previews and manual calendar exports cannot send messages, charge money, or imply live synchronization.