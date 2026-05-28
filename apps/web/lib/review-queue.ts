import type { Prisma } from "@prisma/client";
import { calculateOpportunityScore } from "./opportunity-score.ts";
import { preferHumanValue, hasHumanEditedState } from "./review-overrides.ts";
import { isReviewStatus, type ReviewStatus } from "./review-status.ts";

export type ReviewMessageRecord = {
  id: string;
  subject?: string | null;
  body?: string | null;
  status?: string | null;
  humanSubject?: string | null;
  humanBody?: string | null;
  reviewNotes?: string | null;
  reviewedAt?: Date | string | null;
  generatedAt?: Date | string | null;
};

export type PainSignalForReviewQueue = {
  id: string;
  pain?: string | null;
  urgency?: string | null;
  affectedTeam?: string | null;
  existingWorkaround?: string | null;
  possibleIcp?: string | null;
  monetizationScore?: number | null;
  outreachAngle?: string | null;
  b2bScore?: number | null;
  status?: string | null;
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
  humanNotes?: string | null;
  angleFeedback?: string | null;
  reviewedAt?: Date | string | null;
  messages?: ReviewMessageRecord[] | null;
};

function parseTitles(value?: Prisma.JsonValue | null) {
  return Array.isArray(value) ? value.filter((title): title is string => typeof title === "string") : [];
}

export function shapeReviewQueueItem(signal: PainSignalForReviewQueue) {
  const generatedTitles = parseTitles(signal.targetTitles);
  const humanTitles = parseTitles(signal.humanTargetTitles);
  const latestMessage = signal.messages?.[0] ?? null;
  const reviewStatus: ReviewStatus = isReviewStatus(signal.status) ? signal.status : "new";

  const hasPainSignalEdits = hasHumanEditedState({
    humanPain: signal.humanPain,
    humanUrgency: signal.humanUrgency,
    humanAffectedTeam: signal.humanAffectedTeam,
    humanExistingWorkaround: signal.humanExistingWorkaround,
    humanPossibleIcp: signal.humanPossibleIcp,
    humanMonetizationScore: signal.humanMonetizationScore,
    humanOutreachAngle: signal.humanOutreachAngle,
    humanTargetTitles: humanTitles,
    humanCompanySize: signal.humanCompanySize,
    humanIndustry: signal.humanIndustry,
    humanBuyer: signal.humanBuyer,
    humanBudgetOwner: signal.humanBudgetOwner,
    humanTriggerEvent: signal.humanTriggerEvent,
    humanOutreachAngleRefined: signal.humanOutreachAngleRefined,
    humanNotes: signal.humanNotes,
    angleFeedback: signal.angleFeedback,
    reviewedAt: signal.reviewedAt,
  });
  const hasMessageEdits = latestMessage
    ? hasHumanEditedState({
        humanSubject: latestMessage.humanSubject,
        humanBody: latestMessage.humanBody,
        reviewNotes: latestMessage.reviewNotes,
        reviewedAt: latestMessage.reviewedAt,
      })
    : false;

  const targetTitles = humanTitles.length ? humanTitles : generatedTitles;
  const monetizationScore = preferHumanValue(signal.humanMonetizationScore, signal.monetizationScore ?? 0);

  return {
    id: signal.id,
    painSignal: {
      id: signal.id,
    },
    status: reviewStatus,
    pain: preferHumanValue(signal.humanPain, signal.pain ?? "No pain summary available"),
    urgency: preferHumanValue(signal.humanUrgency, signal.urgency ?? "unknown"),
    affectedTeam: preferHumanValue(signal.humanAffectedTeam, signal.affectedTeam ?? "Unknown"),
    existingWorkaround: preferHumanValue(
      signal.humanExistingWorkaround,
      signal.existingWorkaround ?? "Unknown",
    ),
    possibleIcp: preferHumanValue(signal.humanPossibleIcp, signal.possibleIcp ?? "Unknown"),
    monetizationScore,
    outreachAngle: preferHumanValue(signal.humanOutreachAngle, signal.outreachAngle ?? "Unknown"),
    targetTitles,
    companySize: preferHumanValue(signal.humanCompanySize, signal.companySize ?? "Unknown"),
    industry: preferHumanValue(signal.humanIndustry, signal.industry ?? "Unknown"),
    buyer: preferHumanValue(signal.humanBuyer, signal.buyer ?? "Unknown"),
    budgetOwner: preferHumanValue(signal.humanBudgetOwner, signal.budgetOwner ?? "Unknown"),
    triggerEvent: preferHumanValue(signal.humanTriggerEvent, signal.triggerEvent ?? "Unknown"),
    outreachAngleRefined: preferHumanValue(
      signal.humanOutreachAngleRefined,
      signal.outreachAngleRefined ?? "Unknown",
    ),
    humanNotes: signal.humanNotes ?? "",
    angleFeedback: signal.angleFeedback ?? "",
    reviewedAt: signal.reviewedAt ?? null,
    hasHumanEdits: hasPainSignalEdits || hasMessageEdits,
    message: latestMessage
      ? {
          id: latestMessage.id,
          status: latestMessage.status ?? "draft",
          subject: preferHumanValue(latestMessage.humanSubject, latestMessage.subject ?? "Untitled draft"),
          body: preferHumanValue(latestMessage.humanBody, latestMessage.body ?? ""),
          reviewNotes: latestMessage.reviewNotes ?? "",
          reviewedAt: latestMessage.reviewedAt ?? null,
          generatedAt: latestMessage.generatedAt ?? null,
          hasHumanEdits: hasMessageEdits,
        }
      : null,
    opportunityScore: calculateOpportunityScore({
      b2bScore: signal.b2bScore,
      monetizationScore,
      urgency: preferHumanValue(signal.humanUrgency, signal.urgency ?? "unknown"),
      targetTitles,
      status: reviewStatus,
    }),
  };
}

export type ReviewQueueItem = ReturnType<typeof shapeReviewQueueItem>;

export function getReviewItemId(item: Pick<ReviewQueueItem, "painSignal">) {
  return item.painSignal.id;
}
