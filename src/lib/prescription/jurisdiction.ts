// Jurisdiction detection. The prescribing jurisdiction drives the legal
// requirements, so it is detected from the prescriber's device locale/timezone
// and always shown as an overridable value — never silently assumed.
import type { RxCountry } from "./store";

export type DetectedJurisdiction = {
  country: RxCountry | null;
  /** Plain-language source shown next to the value, e.g. "Asia/Manila". */
  source: string;
};

const PH_ZONES = ["Asia/Manila"];

export function detectJurisdiction(): DetectedJurisdiction {
  if (typeof window === "undefined") return { country: null, source: "" };
  let zone = "";
  try {
    zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  } catch {
    zone = "";
  }
  const locale = (navigator.language || "").toUpperCase();
  if (PH_ZONES.includes(zone) || locale.endsWith("-PH")) {
    return { country: "PH", source: zone || locale };
  }
  if (zone.startsWith("America/") || locale.endsWith("-US")) {
    return { country: "US", source: zone || locale };
  }
  return { country: null, source: zone || locale };
}

/** Requirements a prescription must carry in each jurisdiction, used for the
 *  visible coverage checklist. */
export const JURISDICTION_REQUIREMENTS: Record<RxCountry, string[]> = {
  PH: [
    "Patient full name, age and sex",
    "Patient address",
    "Generic (INN) name written first",
    "Prescriber name, PRC and PTR numbers",
    "Clinic address and contact",
    "Date issued and prescriber signature",
  ],
  US: [
    "Patient full name and date of birth",
    "Patient address",
    "Drug name, strength, quantity and directions",
    "Prescriber name, NPI and state licence",
    "Practice address and contact",
    "Date issued and prescriber signature",
  ],
};
