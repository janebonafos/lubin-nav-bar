# Simplify closed appointment conversations

## What will change
- Keep the existing message history visible when an appointment is cancelled or completed.
- Replace the composer and send button with one small centered system-style message inside the conversation.
- Use this copy: “You can no longer send messages in this conversation. If you need anything, email info@lubin.ai.”
- Remove the crossed-out message icon and the separate closed-chat card.
- Apply the same closed state for clients and providers.

## Technical details
- Add a closed-state option to the existing appointment conversation component so it renders past messages but omits the prompt input.
- Pass cancelled/completed status from both appointment views into that component.
- Reuse the current message-thread styling and AI Elements message primitives.
