import { createFileRoute } from "@tanstack/react-router";

type RefBody = {
  medication?: {
    name?: string;
    genericName?: string;
    dose?: string;
    route?: string;
    frequency?: string;
    duration?: string;
    indication?: string;
    rationale?: string;
  };
  country?: "US" | "PH";
  patientContext?: { firstName?: string; age?: number; sex?: string };
  presenting?: string;
  observations?: string;
  plan?: string;
  allergies?: string;
  conditions?: string;
  pregnancyStatus?: string;
  bipolarHistory?: string;
  ageYears?: number;
  labs?: string;
  sharedSafetyResponse?: { item?: string; response?: string; date?: string; assessment?: string };
  currentMedications?: { name: string; dose?: string; frequency?: string }[];
  includedAssessments?: { name: string; score?: number; statusLabel?: string }[];
};

const SOURCE_GUIDES: Record<"US" | "PH", string> = {
  US: `Jurisdiction: UNITED STATES.
Prioritise, in this order: (1) current FDA-approved prescribing information / official drug labelling (DailyMed, FDA label PDF), (2) applicable evidence-based clinical practice guidelines (e.g. APA, AAFP, USPSTF).
Use US generic naming. State DEA controlled-substance schedule when applicable.`,
  PH: `Jurisdiction: PHILIPPINES.
Prioritise, in this order: (1) Philippine FDA-approved product information / registration, (2) Philippine National Drug Formulary or applicable local DOH guidance, (3) current local prescribing requirements (S2 yellow prescription form for Dangerous Drugs).
Use INN/generic names first as required by the Generics Act, with locally familiar brand names in parentheses.`,
};

const SYSTEM_PROMPT = `You are a medication reference assistant for licensed prescribers. You produce a NEUTRAL reference summary. You never make a clinical determination and never tell the clinician what to prescribe.

Rules:
- Fill every field you can from well-established prescribing information. If you genuinely do not know a field, return an empty string for it rather than guessing.
- "boxedWarning" must be an empty string when the medication has no boxed warning.
- The patient section must be strictly limited to the supplied visit context. Never invent allergies, conditions, labs, or prior trials. When something was not supplied, say so plainly (e.g. "No allergy information supplied").
- Never write "no issue", "none" or "no concern" for a patient field when the information was not supplied. Write exactly "Information required" plus what is needed.
- Age-dependent warnings: if no age was supplied, do not evaluate them. Write "Information required: patient age or date of birth".
- Pregnancy and lactation: use the exact pregnancy and lactation wording from the approved product information for this jurisdiction. Do NOT use letter categories such as "Pregnancy Category C" unless that exact wording appears in the applicable current approved product label for this jurisdiction.
- Do not call the medication first-line, preferred or recommended unless you cite the specific guideline or label section in the same sentence, with the clinical context it applies to.
- "missingInformation" must list the information a prescriber would still need before deciding.
- Sources: list 1-4 sources with a real, direct, stable URL (official label/registry/formulary/guideline pages only — never a search page or blog). Include the publication or revision date if known, else "", and the publishing organisation.
- Each source MUST carry a "kind": "label" only when the URL is the exact regulator- or manufacturer-approved product label for THIS medication in THIS jurisdiction; "formulary" for a government formulary or national reference; "secondary" for any other drug reference. Never mark a secondary reference as "label".
- If you cannot identify any authoritative prescribing-information source for this medication in this jurisdiction, return "sources": [] and "sourcesAvailable": false.
- Return STRICT JSON, nothing else:
{
  "general": {
    "genericName": string, "brandNames": string, "medicationClass": string,
    "approvedIndications": string, "mechanism": string, "strengthsForms": string,
    "referenceDosing": string, "administration": string,
    "commonAdverseEffects": string, "seriousAdverseEffects": string,
    "boxedWarning": string, "contraindications": string, "interactions": string,
    "monitoring": string, "renalHepatic": string, "pregnancyLactation": string,
    "discontinuation": string, "controlledSubstance": string, "availability": string
  },
  "patient": {
    "aiRationale": string, "targetSymptoms": string, "patientInfoConsidered": string,
    "allergiesReviewed": string, "currentMedicationsReviewed": string,
    "potentialInteractions": string, "relevantConditions": string,
    "previousTrials": string, "labMonitoring": string, "missingInformation": string
  },
  "sources": [{ "title": string, "url": string, "revisedAt": string, "jurisdiction": string, "organisation": string, "kind": "label" | "formulary" | "secondary" }],
  "sourcesAvailable": boolean
}`;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export const Route = createFileRoute("/api/medication-reference")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as RefBody;
          const name = str(body.medication?.name);
          if (!name) {
            return Response.json({ error: "Medication name required" }, { status: 400 });
          }
          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) {
            return Response.json({ error: "AI not configured" }, { status: 500 });
          }
          const country = body.country === "PH" ? "PH" : "US";
          const m = body.medication ?? {};

          const lines: string[] = [
            `Medication: ${name}${m.genericName ? ` (generic: ${m.genericName})` : ""}`,
            `Prescribed as: ${[m.dose, m.route, m.frequency, m.duration].filter(Boolean).join(", ") || "not yet specified"}`,
          ];
          if (m.indication) lines.push(`Indication on the draft: ${m.indication}`);
          if (m.rationale) lines.push(`AI rationale recorded on the draft: ${m.rationale}`);
          if (body.patientContext) {
            const c = body.patientContext;
            lines.push(
              `Patient: ${c.firstName ?? "unspecified"}${c.age ? `, age ${c.age}` : ""}${c.sex ? `, ${c.sex}` : ""}`,
            );
          }
          if (body.presenting) lines.push(`Presenting concerns: ${body.presenting}`);
          if (body.observations) lines.push(`Observations: ${body.observations}`);
          if (body.plan) lines.push(`Clinician plan: ${body.plan}`);
          lines.push(
            body.allergies
              ? `Allergies on file: ${body.allergies}`
              : "Allergies on file: none supplied",
          );
          if (body.currentMedications?.length) {
            lines.push("Current medications on file:");
            for (const cm of body.currentMedications) {
              lines.push(
                `- ${cm.name}${cm.dose ? ` ${cm.dose}` : ""}${cm.frequency ? `, ${cm.frequency}` : ""}`,
              );
            }
          } else {
            lines.push("Current medications on file: none supplied");
          }
          lines.push(
            body.conditions
              ? `Relevant medical conditions on file: ${body.conditions}`
              : "Relevant medical conditions on file: none supplied",
          );
          lines.push(
            `Pregnancy and breastfeeding status on file: ${body.pregnancyStatus || "not documented"}`,
          );
          lines.push(
            `Bipolar or mania history on file: ${body.bipolarHistory || "not documented"}`,
          );
          lines.push(
            typeof body.ageYears === "number"
              ? `Patient age on file: ${body.ageYears}`
              : "Patient age on file: not documented — do not evaluate age-dependent warnings",
          );
          lines.push(
            body.labs
              ? `Laboratory or organ-function information on file: ${body.labs}`
              : "Laboratory or organ-function information on file: none supplied",
          );
          if (body.sharedSafetyResponse?.response) {
            const sf = body.sharedSafetyResponse;
            lines.push(
              `Shared assessment safety response (${sf.assessment ?? "assessment"}, ${sf.date ?? "date not stated"}): item "${sf.item ?? ""}" answered "${sf.response}". Report this response verbatim and never infer it from a total score.`,
            );
          }
          if (body.includedAssessments?.length) {
            lines.push("Assessment results:");
            for (const a of body.includedAssessments) {
              lines.push(`- ${a.name}: ${a.score ?? "—"}${a.statusLabel ? `, ${a.statusLabel}` : ""}`);
            }
          }

          const upstream = await fetch(
            "https://ai.gateway.lovable.dev/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-3.6-flash",
                response_format: { type: "json_object" },
                messages: [
                  {
                    role: "system",
                    content: `${SYSTEM_PROMPT}\n\n${SOURCE_GUIDES[country]}`,
                  },
                  {
                    role: "user",
                    content: `${lines.join("\n")}\n\nProduce the medication reference JSON now.`,
                  },
                ],
              }),
            },
          );
          if (!upstream.ok) {
            if (upstream.status === 429)
              return Response.json(
                { error: "Rate limit reached, try again shortly." },
                { status: 429 },
              );
            if (upstream.status === 402)
              return Response.json({ error: "AI credits exhausted." }, { status: 402 });
            console.error("AI gateway error:", upstream.status, await upstream.text());
            return Response.json({ error: "AI gateway error" }, { status: 500 });
          }
          const data = (await upstream.json()) as {
            choices?: { message?: { content?: string } }[];
          };
          let parsed: {
            general?: Record<string, unknown>;
            patient?: Record<string, unknown>;
            sources?: Record<string, unknown>[];
            sourcesAvailable?: boolean;
          } = {};
          try {
            parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "");
          } catch {
            return Response.json(
              { error: "Could not parse AI response." },
              { status: 500 },
            );
          }
          const g = parsed.general ?? {};
          const p = parsed.patient ?? {};
          const sources = (parsed.sources ?? [])
            .map((s) => ({
              title: str(s.title),
              url: str(s.url),
              revisedAt: str(s.revisedAt),
              jurisdiction:
                str(s.jurisdiction) || (country === "PH" ? "Philippines" : "United States"),
              organisation: str(s.organisation),
              kind: (["label", "formulary", "secondary"] as const).includes(
                str(s.kind) as "label",
              )
                ? (str(s.kind) as "label" | "formulary" | "secondary")
                : "secondary",
            }))
            .filter((s) => s.title && /^https?:\/\//i.test(s.url));

          return Response.json({
            medicationName: name,
            country,
            general: {
              genericName: str(g.genericName),
              brandNames: str(g.brandNames),
              medicationClass: str(g.medicationClass),
              approvedIndications: str(g.approvedIndications),
              mechanism: str(g.mechanism),
              strengthsForms: str(g.strengthsForms),
              referenceDosing: str(g.referenceDosing),
              administration: str(g.administration),
              commonAdverseEffects: str(g.commonAdverseEffects),
              seriousAdverseEffects: str(g.seriousAdverseEffects),
              boxedWarning: str(g.boxedWarning),
              contraindications: str(g.contraindications),
              interactions: str(g.interactions),
              monitoring: str(g.monitoring),
              renalHepatic: str(g.renalHepatic),
              pregnancyLactation: str(g.pregnancyLactation),
              discontinuation: str(g.discontinuation),
              controlledSubstance: str(g.controlledSubstance),
              availability: str(g.availability),
            },
            patient: {
              aiRationale: str(p.aiRationale),
              targetSymptoms: str(p.targetSymptoms),
              patientInfoConsidered: str(p.patientInfoConsidered),
              allergiesReviewed: str(p.allergiesReviewed),
              currentMedicationsReviewed: str(p.currentMedicationsReviewed),
              potentialInteractions: str(p.potentialInteractions),
              relevantConditions: str(p.relevantConditions),
              previousTrials: str(p.previousTrials),
              labMonitoring: str(p.labMonitoring),
              missingInformation: str(p.missingInformation),
            },
            sources,
            sourcesAvailable: sources.length > 0 && parsed.sourcesAvailable !== false,
            checkedAt: Date.now(),
          });
        } catch (e) {
          console.error(e);
          return Response.json({ error: "Unexpected error" }, { status: 500 });
        }
      },
    },
  },
});