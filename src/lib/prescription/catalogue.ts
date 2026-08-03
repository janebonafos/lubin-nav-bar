// Small demo medication catalogue used by the searchable medication selector.
// Selecting an entry populates the available strengths/formulations and routes
// so the provider never types unverified values from scratch.

export type CatalogueEntry = {
  name: string;
  genericName: string;
  medicationClass?: string;
  /** Strength and formulation options as marketed. */
  forms: string[];
  routes: string[];
  requiresLabs?: boolean;
  requiresPregnancyStatus?: boolean;
  controlled?: boolean;
};

export const MEDICATION_CATALOGUE: CatalogueEntry[] = [
  {
    name: "Sertraline",
    genericName: "Sertraline hydrochloride",
    medicationClass: "SSRI antidepressant",
    forms: ["25 mg film-coated tablet", "50 mg film-coated tablet", "100 mg film-coated tablet"],
    routes: ["Oral"],
    requiresLabs: true,
  },
  {
    name: "Escitalopram",
    genericName: "Escitalopram oxalate",
    medicationClass: "SSRI antidepressant",
    forms: ["5 mg tablet", "10 mg tablet", "20 mg tablet"],
    routes: ["Oral"],
  },
  {
    name: "Fluoxetine",
    genericName: "Fluoxetine hydrochloride",
    medicationClass: "SSRI antidepressant",
    forms: ["20 mg capsule", "20 mg/5 mL oral solution"],
    routes: ["Oral"],
  },
  {
    name: "Mirtazapine",
    genericName: "Mirtazapine",
    medicationClass: "Tetracyclic antidepressant",
    forms: ["15 mg tablet", "30 mg tablet", "45 mg tablet"],
    routes: ["Oral"],
  },
  {
    name: "Bupropion",
    genericName: "Bupropion hydrochloride",
    medicationClass: "NDRI antidepressant",
    forms: ["150 mg extended-release tablet", "300 mg extended-release tablet"],
    routes: ["Oral"],
    requiresLabs: true,
  },
  {
    name: "Quetiapine",
    genericName: "Quetiapine fumarate",
    medicationClass: "Atypical antipsychotic",
    forms: ["25 mg tablet", "100 mg tablet", "200 mg tablet"],
    routes: ["Oral"],
    requiresLabs: true,
  },
  {
    name: "Aripiprazole",
    genericName: "Aripiprazole",
    medicationClass: "Atypical antipsychotic",
    forms: ["5 mg tablet", "10 mg tablet", "15 mg tablet"],
    routes: ["Oral"],
    requiresLabs: true,
  },
  {
    name: "Lamotrigine",
    genericName: "Lamotrigine",
    medicationClass: "Mood stabiliser / anticonvulsant",
    forms: ["25 mg tablet", "50 mg tablet", "100 mg tablet"],
    routes: ["Oral"],
    requiresPregnancyStatus: true,
  },
  {
    name: "Lithium carbonate",
    genericName: "Lithium carbonate",
    medicationClass: "Mood stabiliser",
    forms: ["300 mg tablet", "400 mg modified-release tablet"],
    routes: ["Oral"],
    requiresLabs: true,
    requiresPregnancyStatus: true,
  },
  {
    name: "Buspirone",
    genericName: "Buspirone hydrochloride",
    medicationClass: "Anxiolytic",
    forms: ["5 mg tablet", "10 mg tablet"],
    routes: ["Oral"],
  },
  {
    name: "Hydroxyzine",
    genericName: "Hydroxyzine hydrochloride",
    medicationClass: "Antihistamine anxiolytic",
    forms: ["10 mg tablet", "25 mg tablet", "10 mg/5 mL syrup"],
    routes: ["Oral"],
  },
  {
    name: "Propranolol",
    genericName: "Propranolol hydrochloride",
    medicationClass: "Beta blocker",
    forms: ["10 mg tablet", "40 mg tablet"],
    routes: ["Oral"],
  },
  {
    name: "Melatonin",
    genericName: "Melatonin",
    medicationClass: "Sleep aid",
    forms: ["2 mg modified-release tablet", "3 mg tablet"],
    routes: ["Oral"],
  },
];

export function findCatalogue(name?: string): CatalogueEntry | undefined {
  if (!name) return undefined;
  const n = name.trim().toLowerCase();
  if (!n) return undefined;
  return MEDICATION_CATALOGUE.find(
    (c) => c.name.toLowerCase() === n || c.genericName.toLowerCase() === n,
  );
}

export function searchCatalogue(query: string, limit = 6): CatalogueEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return MEDICATION_CATALOGUE.slice(0, limit);
  return MEDICATION_CATALOGUE.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.genericName.toLowerCase().includes(q) ||
      (c.medicationClass ?? "").toLowerCase().includes(q),
  ).slice(0, limit);
}
