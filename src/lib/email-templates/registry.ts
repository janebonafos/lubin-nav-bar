import type { ComponentType } from "react";
import { template as bookingConfirmation } from "./booking-confirmation";
import { template as bookingConfirmationClient } from "./booking-confirmation-client";
import { template as prescriptionSigningOtp } from "./prescription-signing-otp";
import { template as assessmentResultShared } from "./assessment-result-shared";
import AppointmentRescheduledEmail, {
  template as appointmentRescheduled,
} from "./appointment-rescheduled";
import AppointmentCancelledEmail, {
  template as appointmentCancelled,
} from "./appointment-cancelled";
import { template as appointmentCompleted } from "./appointment-completed";
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
  "appointment-rescheduled": appointmentRescheduled,
  "appointment-rescheduled-provider": {
    component: AppointmentRescheduledEmail,
    subject: (data: any) =>
      data.newDateTime ? `New time confirmed · ${data.newDateTime}` : "An appointment was rescheduled",
    displayName: "Appointment rescheduled (provider copy)",
    previewData: {
      recipientName: "Dr. Camille Lazaro",
      recipientRole: "provider",
      rescheduledByLabel: "Anna Reyes",
      counterpartName: "Anna Reyes",
      serviceName: "Initial consultation · 50 min",
      previousDateTime: "Aug 18, 2026 · 10:00 AM",
      newDateTime: "Aug 19, 2026 · 3:00 PM",
      duration: "50 min",
      timezone: "GMT+8",
      note: "Sorry — a work meeting was moved. Afternoon works better for me.",
      appointmentLink: "https://lubin.care/provider/appointments",
      addToCalendarLink: "https://lubin.care/provider/appointments",
      supportEmail: "support@lubin.care",
    },
  },
  "appointment-cancelled": appointmentCancelled,
  "appointment-cancelled-provider": {
    component: AppointmentCancelledEmail,
    subject: (data: any) =>
      data.cancelledDateTime
        ? `Cancelled · ${data.cancelledDateTime}`
        : "An appointment was cancelled",
    displayName: "Appointment cancelled (provider copy)",
    previewData: {
      recipientName: "Dr. Camille Lazaro",
      recipientRole: "provider",
      cancelledByLabel: "Anna Reyes",
      counterpartName: "Anna Reyes",
      serviceName: "Initial consultation · 50 min",
      cancelledDateTime: "Aug 18, 2026 · 10:00 AM",
      duration: "50 min",
      timezone: "GMT+8",
      reason: "Something urgent came up at work — I'll rebook soon.",
      refundLabel:
        "Cancelled more than 24 hours ahead, so the client is refunded in full and the slot is back in your availability.",
      appointmentLink: "https://lubin.care/provider/appointments",
      supportEmail: "support@lubin.care",
    },
  },
  "appointment-completed": appointmentCompleted,
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

