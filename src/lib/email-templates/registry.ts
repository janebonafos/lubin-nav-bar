import type { ComponentType } from "react";
import { template as bookingConfirmation } from "./booking-confirmation";
import { template as bookingConfirmationClient } from "./booking-confirmation-client";
import { template as prescriptionSigningOtp } from "./prescription-signing-otp";
import AppointmentMessageEmail, {
  template as appointmentMessage,
} from "./appointment-message";

export type TemplateEntry = {
  component: ComponentType<any>;
  subject: string | ((data: any) => string);
  displayName?: string;
  previewData?: Record<string, any>;
  to?: string | ((data: any) => string);
  /** Optional Reply-To header value for transactional sends. */
  replyTo?: string | undefined | ((data: any) => string | undefined);
};


export const TEMPLATES: Record<string, TemplateEntry> = {
  "booking-confirmation": bookingConfirmation,
  "booking-confirmation-client": bookingConfirmationClient,
  "prescription-signing-otp": prescriptionSigningOtp,
  "appointment-message": appointmentMessage,
  "appointment-message-sender-copy": {
    component: AppointmentMessageEmail,
    subject: "Copy of your message · Lubin appointment",
    displayName: "Appointment message (sender's copy)",
    previewData: {
      recipientRole: "provider",
      recipientName: "Dr. Camille Lazaro",
      authorName: "Dr. Camille Lazaro",
      authorRole: "provider",
      messageBody:
        "Hi Anna — thanks for letting me know. I have a 3:00 PM slot on Aug 19 if that works better for you. Nothing to prepare beforehand.",
      sentAt: "Aug 17, 2:24 PM",
      appointmentLabel: "Initial consultation · 50 min",
      appointmentDateTime: "Aug 18, 2026 · 10:00 AM (GMT+8)",
      threadLink: "https://lubin.care/provider/appointments",
      replyToAddress: "provider-cu1@messages.lubin.care",
      supportEmail: "support@lubin.care",
    },
    replyTo: (data) => data.replyToAddress,
  },
};

