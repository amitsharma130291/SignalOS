import type { Prisma } from "@prisma/client";
import { calculateOpportunityScore } from "./opportunity-score.ts";
import { isReviewStatus, type ReviewStatus } from "./review-status.ts";

type RawInputForOpportunity = {
  rawText?: string | null;
  status?: string | null;
  metadata?: Prisma.JsonValue | null;
};

type MessageDraftForOpportunity = {
  id: string;
  subject?: string | null;
  body?: string | null;
  status?: string | null;
  generatedAt?: Date | string | null;
};

export type PainSignalForOpportunity = {
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
  icpGeneratedAt?: Date | string | null;
  rawInput?: RawInputForOpportunity | null;
  messages?: MessageDraftForOpportunity[] | null;
};

export type OpportunityDashboardItem = {
  id: string;
  rawSignalText: string;
  filterStatus: string;
  marketType: string;
  confidence: string;
  pain: string;
  urgency: string;
  affectedTeam: string;
  existingWorkaround: string;
  possibleIcp: string;
  monetizationScore: number;
  outreachAngle: string;
  targetTitles: string[];
  companySize: string;
  industry: string;
  buyer: string;
  budgetOwner: string;
  triggerEvent: string;
  outreachAngleRefined: string;
  reviewStatus: ReviewStatus;
  icpGenerated: boolean;
  latestDraft: {
    id: string;
    subject: string;
    body: string;
    status: string;
    generatedAt: Date | string | null;
  } | null;
  opportunityScore: ReturnType<typeof calculateOpportunityScore>;
};

function getFilterRecord(metadata?: Prisma.JsonValue | null) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  const filter = (metadata as Record<string, unknown>).filter;
  if (!filter || typeof filter !== "object" || Array.isArray(filter)) {
    return {};
  }

  return filter as Record<string, unknown>;
}

function parseTargetTitles(targetTitles?: Prisma.JsonValue | null) {
  if (!Array.isArray(targetTitles)) {
    return [];
  }

  return targetTitles.filter((title): title is string => typeof title === "string");
}

export function shapeOpportunity(signal: PainSignalForOpportunity): OpportunityDashboardItem {
  const filter = getFilterRecord(signal.rawInput?.metadata);
  const reviewStatus = isReviewStatus(signal.status) ? signal.status : "new";
  const targetTitles = parseTargetTitles(signal.targetTitles);
  const icpGenerated = Boolean(signal.icpGeneratedAt || targetTitles.length > 0);
  const filterStatus = signal.rawInput?.status ?? "unknown";
  const latestMessage = signal.messages?.[0] ?? null;

  return {
    id: signal.id,
    rawSignalText: signal.rawInput?.rawText ?? "Raw input unavailable",
    filterStatus,
    marketType: typeof filter.marketType === "string" ? filter.marketType : "unknown",
    confidence: typeof filter.confidence === "string" ? filter.confidence : "unknown",
    pain: signal.pain ?? "No pain summary available",
    urgency: signal.urgency ?? "unknown",
    affectedTeam: signal.affectedTeam ?? "Unknown",
    existingWorkaround: signal.existingWorkaround ?? "Unknown",
    possibleIcp: signal.possibleIcp ?? "Unknown",
    monetizationScore: signal.monetizationScore ?? 0,
    outreachAngle: signal.outreachAngle ?? "Unknown",
    targetTitles,
    companySize: signal.companySize ?? "Unknown",
    industry: signal.industry ?? "Unknown",
    buyer: signal.buyer ?? "Unknown",
    budgetOwner: signal.budgetOwner ?? "Unknown",
    triggerEvent: signal.triggerEvent ?? "Unknown",
    outreachAngleRefined: signal.outreachAngleRefined ?? "Unknown",
    reviewStatus,
    icpGenerated,
    latestDraft: latestMessage
      ? {
          id: latestMessage.id,
          subject: latestMessage.subject ?? "Untitled draft",
          body: latestMessage.body ?? "",
          status: latestMessage.status ?? "draft",
          generatedAt: latestMessage.generatedAt ?? null,
        }
      : null,
    opportunityScore: calculateOpportunityScore({
      b2bScore: signal.b2bScore,
      monetizationScore: signal.monetizationScore,
      urgency: signal.urgency,
      targetTitles,
      icpGeneratedAt: signal.icpGeneratedAt,
      rawInputStatus: filterStatus,
      status: reviewStatus,
    }),
  };
}

export function getOpportunityMetrics(opportunities: OpportunityDashboardItem[]) {
  return {
    total: opportunities.length,
    acceptedSignals: opportunities.filter((item) => item.filterStatus === "accepted").length,
    needsReview: opportunities.filter(
      (item) => item.filterStatus === "needs_review" || item.reviewStatus === "new",
    ).length,
    highUrgency: opportunities.filter((item) => item.urgency === "high").length,
    icpGenerated: opportunities.filter((item) => item.icpGenerated).length,
  };
}
