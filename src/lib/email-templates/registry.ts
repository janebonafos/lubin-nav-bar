import type { ComponentType } from "react";

export type TemplateEntry = {
  component: ComponentType<any>;
  subject: string | ((data: Record<string, unknown>) => string);
  displayName?: string;
  previewData?: Record<string, unknown>;
  to?: string | ((data: Record<string, unknown>) => string);
};

export const TEMPLATES: Record<string, TemplateEntry> = {};
