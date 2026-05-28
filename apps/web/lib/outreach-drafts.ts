import type { Prisma } from "@prisma/client";
import type { GeneratedOutreachDraft } from "./outreach-generator.ts";
import { preferHumanValue, hasHumanEditedState } from "./review-overrides.ts";
import { isOutreachDraftStatus, type OutreachDraftStatus } from "./outreach-status.ts";

export type OutreachDraftRecord = {
  id: string;
  generatedDraft: Prisma.JsonValue;
  qualityScore: number;
  qualityWarnings: Prisma.JsonValue;
  status: string;
  humanSubject?: string | null;
  humanColdEmail?: string | null;
  humanLinkedinMessage?: string | null;
  humanCta?: string | null;
  humanHook?: string | null;
  humanNotes?: string | null;
  humanEditedAt?: Date | string | null;
  reviewedAt?: Date | string | null;
  generatedAt?: Date | string | null;
};

export type PainSignalForOutreach = {
  id: string;
  status?: string | null;
  pain?: string | null;
  urgency?: string | null;
  affectedTeam?: string | null;
  existingWorkaround?: string | null;
  possibleIcp?: string | null;
  monetizationScore?: number | null;
  outreachAngle?: string | null;
  targetTitles?: Prisma.JsonValue | null;
  companySize?: string | null;
  industry?: string | null;
  buyer?: string | null;
  budgetOwner?: string | null;
  triggerEvent?: string | null;
  outreachAngleRefined?: string | null;
  humanPain?: string | null;
  humanUrgency?: string | null;
  humanAffectedTeam?: string | null;
  humanExistingWorkaround?: string | null;
  humanPossibleIcp?: string | null;
  humanMonetizationScore?: number | null;
  humanOutreachAngle?: string | null;
  humanTargetTitles?: Prisma.JsonValue | null;
  humanCompanySize?: string | null;
  humanIndustry?: string | null;
  humanBuyer?: string | null;
  humanBudgetOwner?: string | null;
  humanTriggerEvent?: string | null;
  humanOutreachAngleRefined?: string | null;
  outreachDraft?: OutreachDraftRecord | null;
};

const EMPTY_DRAFT: GeneratedOutreachDraft = {
  hook: "",
  problem: "",
  angle: "",
  cta: "",
  email_subjects: [],
  cold_email: "",
  linkedin_message: "",
  variants: {
    consultative: "",
    direct: "",
    executive: "",
  },
  quality: {
    score: 0,
    warnings: [],
  },
};

function parseStringArray(value: Prisma.JsonValue | null | undefined) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

export function parseGeneratedOutreachDraft(value: Prisma.JsonValue): GeneratedOutreachDraft {
  if (!isRecord(value)) return EMPTY_DRAFT;
  const variants = isRecord(value.variants) ? value.variants : {};
  const quality = isRecord(value.quality) ? value.quality : {};

  return {
    hook: getString(value, "hook"),
    problem: getString(value, "problem"),
    angle: getString(value, "angle"),
    cta: getString(value, "cta"),
    email_subjects: parseStringArray(value.email_subjects as Prisma.JsonValue),
    cold_email: getString(value, "cold_email"),
    linkedin_message: getString(value, "linkedin_message"),
    variants: {
      consultative: getString(variants, "consultative"),
      direct: getString(variants, "direct"),
      executive: getString(variants, "executive"),
    },
    quality: {
      score: typeof quality.score === "number" ? quality.score : 0,
      warnings: parseStringArray(quality.warnings as Prisma.JsonValue),
    },
  };
}

export function shapeOutreachItem(signal: PainSignalForOutreach) {
  const generatedTitles = parseStringArray(signal.targetTitles);
  const humanTitles = parseStringArray(signal.humanTargetTitles);
  const draft = signal.outreachDraft;
  const generatedDraft = draft ? parseGeneratedOutreachDraft(draft.generatedDraft) : null;
  const status: OutreachDraftStatus = draft && isOutreachDraftStatus(draft.status) ? draft.status : "draft_pending";
  const hasDraftEdits = draft
    ? hasHumanEditedState({
        humanSubject: draft.humanSubject,
        humanColdEmail: draft.humanColdEmail,
        humanLinkedinMessage: draft.humanLinkedinMessage,
        humanCta: draft.humanCta,
        humanHook: draft.humanHook,
        humanNotes: draft.humanNotes,
        humanEditedAt: draft.humanEditedAt,
      })
    : false;

  return {
    id: signal.id,
    painSignal: {
      id: signal.id,
      status: signal.status ?? "new",
    },
    pain: preferHumanValue(signal.humanPain, signal.pain ?? "No pain summary available"),
    urgency: preferHumanValue(signal.humanUrgency, signal.urgency ?? "unknown"),
    affectedTeam: preferHumanValue(signal.humanAffectedTeam, signal.affectedTeam ?? "Unknown"),
    existingWorkaround: preferHumanValue(
      signal.humanExistingWorkaround,
      signal.existingWorkaround ?? "Unknown",
    ),
    possibleIcp: preferHumanValue(signal.humanPossibleIcp, signal.possibleIcp ?? "Unknown"),
    monetizationScore: preferHumanValue(signal.humanMonetizationScore, signal.monetizationScore ?? 0),
    outreachAngle: preferHumanValue(signal.humanOutreachAngle, signal.outreachAngle ?? "Unknown"),
    targetTitles: humanTitles.length ? humanTitles : generatedTitles,
    companySize: preferHumanValue(signal.humanCompanySize, signal.companySize ?? "Unknown"),
    industry: preferHumanValue(signal.humanIndustry, signal.industry ?? "Unknown"),
    buyer: preferHumanValue(signal.humanBuyer, signal.buyer ?? "Unknown"),
    budgetOwner: preferHumanValue(signal.humanBudgetOwner, signal.budgetOwner ?? "Unknown"),
    triggerEvent: preferHumanValue(signal.humanTriggerEvent, signal.triggerEvent ?? "Unknown"),
    outreachAngleRefined: preferHumanValue(
      signal.humanOutreachAngleRefined,
      signal.outreachAngleRefined ?? "Unknown",
    ),
    draft: draft && generatedDraft
      ? {
          id: draft.id,
          status,
          generated: generatedDraft,
          subject: preferHumanValue(draft.humanSubject, generatedDraft.email_subjects[0] ?? ""),
          coldEmail: preferHumanValue(draft.humanColdEmail, generatedDraft.cold_email),
          linkedinMessage: preferHumanValue(draft.humanLinkedinMessage, generatedDraft.linkedin_message),
          cta: preferHumanValue(draft.humanCta, generatedDraft.cta),
          hook: preferHumanValue(draft.humanHook, generatedDraft.hook),
          notes: draft.humanNotes ?? "",
          qualityScore: draft.qualityScore,
          qualityWarnings: parseStringArray(draft.qualityWarnings),
          hasHumanEdits: hasDraftEdits,
          reviewedAt: draft.reviewedAt ?? null,
          generatedAt: draft.generatedAt ?? null,
        }
      : null,
  };
}

export type OutreachItem = ReturnType<typeof shapeOutreachItem>;
