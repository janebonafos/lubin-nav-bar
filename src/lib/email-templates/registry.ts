import type { ComponentType } from "react";
import { template as bookingConfirmation } from "./booking-confirmation";
import { template as bookingConfirmationClient } from "./booking-confirmation-client";
import { template as prescriptionSigningOtp } from "./prescription-signing-otp";

export type TemplateEntry = {
  component: ComponentType<any>;
  subject: string | ((data: any) => string);
  displayName?: string;
  previewData?: Record<string, any>;
  to?: string | ((data: any) => string);
};

export const TEMPLATES: Record<string, TemplateEntry> = {
  "booking-confirmation": bookingConfirmation,
  "booking-confirmation-client": bookingConfirmationClient,
  "prescription-signing-otp": prescriptionSigningOtp,
};
