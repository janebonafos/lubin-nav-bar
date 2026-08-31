// Mock Philippine medication catalogue for the new-patient prescribing
// prototype. Local demo data only — no network, no backend. Generic (INN) name
// is always the primary label; brands are optional alternates.
//
// Dangerous / controlled preparations are included deliberately so the
// prototype can show the Phase 1 "not supported" message instead of hiding the
// situation from the provider.

export type PhCatalogueItem = {
  id: string;
  /** Generic (INN) name — always shown first. */
  generic: string;
  brands: string[];
  /** Strength + formulation as marketed locally. */
  forms: string[];
  routes: string[];
  className?: string;
  /** Dispensing unit shown next to quantity, e.g. "tablets". */
  unit: string;
  /** Dangerous drug (PH) / controlled substance — blocked in Phase 1. */
  dangerous?: boolean;
};

export const PH_MEDICATION_CATALOGUE: PhCatalogueItem[] = [
  {
    id: "sertraline",
    generic: "Sertraline hydrochloride",
    brands: ["Zoloft", "Deprax"],
    forms: ["25 mg film-coated tablet", "50 mg film-coated tablet", "100 mg film-coated tablet"],
    routes: ["Oral"],
    className: "SSRI antidepressant",
    unit: "tablets",
  },
  {
    id: "escitalopram",
    generic: "Escitalopram oxalate",
    brands: ["Lexapro", "Elopram"],
    forms: ["5 mg tablet", "10 mg tablet", "20 mg tablet"],
    routes: ["Oral"],
    className: "SSRI antidepressant",
    unit: "tablets",
  },
  {
    id: "fluoxetine",
    generic: "Fluoxetine hydrochloride",
    brands: ["Prozac", "Fluxene"],
    forms: ["20 mg capsule", "20 mg/5 mL oral solution"],
    routes: ["Oral"],
    className: "SSRI antidepressant",
    unit: "capsules",
  },
  {
    id: "mirtazapine",
    generic: "Mirtazapine",
    brands: ["Remeron"],
    forms: ["15 mg tablet", "30 mg tablet", "45 mg tablet"],
    routes: ["Oral"],
    className: "Tetracyclic antidepressant",
    unit: "tablets",
  },
  {
    id: "bupropion",
    generic: "Bupropion hydrochloride",
    brands: ["Wellbutrin XL"],
    forms: ["150 mg extended-release tablet", "300 mg extended-release tablet"],
    routes: ["Oral"],
    className: "NDRI antidepressant",
    unit: "tablets",
  },
  {
    id: "quetiapine",
    generic: "Quetiapine fumarate",
    brands: ["Seroquel", "Ketipinor"],
    forms: ["25 mg tablet", "100 mg tablet", "200 mg tablet"],
    routes: ["Oral"],
    className: "Atypical antipsychotic",
    unit: "tablets",
  },
  {
    id: "aripiprazole",
    generic: "Aripiprazole",
    brands: ["Abilify"],
    forms: ["5 mg tablet", "10 mg tablet", "15 mg tablet"],
    routes: ["Oral"],
    className: "Atypical antipsychotic",
    unit: "tablets",
  },
  {
    id: "lamotrigine",
    generic: "Lamotrigine",
    brands: ["Lamictal"],
    forms: ["25 mg tablet", "50 mg tablet", "100 mg tablet"],
    routes: ["Oral"],
    className: "Mood stabiliser / anticonvulsant",
    unit: "tablets",
  },
  {
    id: "lithium",
    generic: "Lithium carbonate",
    brands: ["Quilonum SR"],
    forms: ["300 mg tablet", "400 mg modified-release tablet"],
    routes: ["Oral"],
    className: "Mood stabiliser",
    unit: "tablets",
  },
  {
    id: "buspirone",
    generic: "Buspirone hydrochloride",
    brands: ["Buspar"],
    forms: ["5 mg tablet", "10 mg tablet"],
    routes: ["Oral"],
    className: "Anxiolytic",
    unit: "tablets",
  },
  {
    id: "hydroxyzine",
    generic: "Hydroxyzine hydrochloride",
    brands: ["Iterax"],
    forms: ["10 mg tablet", "25 mg tablet", "10 mg/5 mL syrup"],
    routes: ["Oral"],
    className: "Antihistamine anxiolytic",
    unit: "tablets",
  },
  {
    id: "propranolol",
    generic: "Propranolol hydrochloride",
    brands: ["Inderal"],
    forms: ["10 mg tablet", "40 mg tablet"],
    routes: ["Oral"],
    className: "Beta blocker",
    unit: "tablets",
  },
  {
    id: "melatonin",
    generic: "Melatonin",
    brands: ["Circadin"],
    forms: ["2 mg modified-release tablet", "3 mg tablet"],
    routes: ["Oral"],
    className: "Sleep aid",
    unit: "tablets",
  },
  {
    id: "clonazepam",
    generic: "Clonazepam",
    brands: ["Rivotril"],
    forms: ["0.5 mg tablet", "2 mg tablet"],
    routes: ["Oral"],
    className: "Benzodiazepine · dangerous drug",
    unit: "tablets",
    dangerous: true,
  },
  {
    id: "alprazolam",
    generic: "Alprazolam",
    brands: ["Xanor"],
    forms: ["0.5 mg tablet", "1 mg tablet"],
    routes: ["Oral"],
    className: "Benzodiazepine · dangerous drug",
    unit: "tablets",
    dangerous: true,
  },
  {
    id: "amoxicillin",
    generic: "Amoxicillin trihydrate",
    brands: ["Amoxil", "Moxatag"],
    forms: ["250 mg capsule", "500 mg capsule", "250 mg/5 mL suspension"],
    routes: ["Oral"],
    className: "Penicillin antibiotic",
    unit: "capsules",
  },
  {
    id: "azithromycin",
    generic: "Azithromycin",
    brands: ["Zithromax"],
    forms: ["250 mg tablet", "500 mg tablet"],
    routes: ["Oral"],
    className: "Macrolide antibiotic",
    unit: "tablets",
  },
  {
    id: "losartan",
    generic: "Losartan potassium",
    brands: ["Cozaar", "Lifezar"],
    forms: ["25 mg tablet", "50 mg tablet", "100 mg tablet"],
    routes: ["Oral"],
    className: "Angiotensin receptor blocker",
    unit: "tablets",
  },
  {
    id: "amlodipine",
    generic: "Amlodipine besilate",
    brands: ["Norvasc"],
    forms: ["5 mg tablet", "10 mg tablet"],
    routes: ["Oral"],
    className: "Calcium channel blocker",
    unit: "tablets",
  },
  {
    id: "metformin",
    generic: "Metformin hydrochloride",
    brands: ["Glucophage"],
    forms: ["500 mg tablet", "850 mg tablet", "500 mg extended-release tablet"],
    routes: ["Oral"],
    className: "Biguanide antidiabetic",
    unit: "tablets",
  },
  {
    id: "atorvastatin",
    generic: "Atorvastatin calcium",
    brands: ["Lipitor"],
    forms: ["10 mg tablet", "20 mg tablet", "40 mg tablet"],
    routes: ["Oral"],
    className: "Statin",
    unit: "tablets",
  },
  {
    id: "omeprazole",
    generic: "Omeprazole",
    brands: ["Losec"],
    forms: ["20 mg capsule", "40 mg capsule"],
    routes: ["Oral"],
    className: "Proton pump inhibitor",
    unit: "capsules",
  },
  {
    id: "paracetamol",
    generic: "Paracetamol",
    brands: ["Biogesic", "Tempra"],
    forms: ["500 mg tablet", "250 mg/5 mL syrup"],
    routes: ["Oral"],
    className: "Analgesic / antipyretic",
    unit: "tablets",
  },
  {
    id: "cetirizine",
    generic: "Cetirizine hydrochloride",
    brands: ["Zyrtec", "Virlix"],
    forms: ["10 mg tablet", "5 mg/5 mL syrup"],
    routes: ["Oral"],
    className: "Antihistamine",
    unit: "tablets",
  },
  {
    id: "salbutamol",
    generic: "Salbutamol",
    brands: ["Ventolin"],
    forms: ["2 mg tablet", "100 mcg/dose inhaler", "2 mg/5 mL syrup"],
    routes: ["Oral", "Inhalation"],
    className: "Short-acting beta agonist",
    unit: "doses",
  },
  {
    id: "levothyroxine",
    generic: "Levothyroxine sodium",
    brands: ["Synthroid", "Euthyrox"],
    forms: ["25 mcg tablet", "50 mcg tablet", "100 mcg tablet"],
    routes: ["Oral"],
    className: "Thyroid hormone",
    unit: "tablets",
  },
  {
    id: "tramadol",
    generic: "Tramadol hydrochloride",
    brands: ["Tramal"],
    forms: ["50 mg capsule"],
    routes: ["Oral"],
    className: "Opioid analgesic · dangerous drug",
    unit: "capsules",
    dangerous: true,
  },
  {
    id: "methylphenidate",
    generic: "Methylphenidate hydrochloride",
    brands: ["Ritalin", "Concerta"],
    forms: ["10 mg tablet", "18 mg extended-release tablet"],
    routes: ["Oral"],
    className: "Stimulant · dangerous drug",
    unit: "tablets",
    dangerous: true,
  },
];

export function searchPhCatalogue(query: string, limit = 6): PhCatalogueItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return PH_MEDICATION_CATALOGUE.filter(
    (m) =>
      m.generic.toLowerCase().includes(q) ||
      m.brands.some((b) => b.toLowerCase().includes(q)) ||
      (m.className ?? "").toLowerCase().includes(q),
  ).slice(0, limit);
}

export function findPhCatalogue(generic: string): PhCatalogueItem | undefined {
  const g = generic.trim().toLowerCase();
  if (!g) return undefined;
  return PH_MEDICATION_CATALOGUE.find(
    (m) => m.generic.toLowerCase() === g || m.brands.some((b) => b.toLowerCase() === g),
  );
}

export const PHASE1_DANGEROUS_MESSAGE =
  "Not supported in the Philippines Phase 1 prescribing flow.";

/** Structured SIG assembled from the discrete fields the provider entered. */
export function buildSig(input: {
  dose: string;
  route?: string;
  frequency: string;
  duration?: string;
  form?: string;
}): string {
  const parts: string[] = [];
  if (input.dose.trim()) parts.push(`Take ${input.dose.trim()}`);
  if (input.form?.trim()) parts.push(`(${input.form.trim()})`);
  if (input.route?.trim()) parts.push(`by ${input.route.trim().toLowerCase()} route`);
  if (input.frequency.trim()) parts.push(input.frequency.trim().toLowerCase());
  if (input.duration?.trim()) parts.push(`for ${input.duration.trim()}`);
  const sig = parts.join(" ").replace(/\s+/g, " ").trim();
  return sig ? `${sig}.` : "";
}
