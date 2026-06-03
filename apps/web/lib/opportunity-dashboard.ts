import type { Prisma } from "@prisma/client";
import {
  generateActivationDecision,
  type ActivationDecisionResult,
} from "./activation-decision.ts";
import {
  generateBuyerMapping,
  type BuyerMapping,
} from "./buyer-mapping-engine.ts";
import {
  generateEvidenceStrength,
  type EvidenceAnalysis,
} from "./evidence-strength.ts";
import {
  generateEvidencePack,
  type EvidencePack,
} from "./evidence-pack-generator.ts";
import {
  generateFounderConviction,
  type FounderConvictionResult,
} from "./founder-conviction.ts";
import {
  generateOpportunityReadiness,
  type OpportunityReadiness,
} from "./opportunity-readiness.ts";
import {
  generateOpportunityThesis,
  type OpportunityThesis,
} from "./opportunity-thesis.ts";
import { calculateOpportunityScore } from "./opportunity-score.ts";
import { getInterviewCount } from "./opportunity-validation.ts";
import { hasHumanEditedState, preferHumanValue } from "./review-overrides.ts";
import { isReviewStatus, type ReviewStatus } from "./review-status.ts";
import {
  generateSolutionGapAnalysis,
  type SolutionGapAnalysis,
} from "./solution-gap-engine.ts";
import {
  generateValidationTasks,
  type ValidationTask,
} from "./validation-task-router.ts";
import {
  generateMarketValidation,
  type MarketValidation,
} from "./market-validation.ts";

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
  humanSubject?: string | null;
  humanBody?: string | null;
  reviewNotes?: string | null;
  reviewedAt?: Date | string | null;
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
  frequency?: string | null;
  currentSolution?: string | null;
  solutionGap?: string | null;
  founderConviction?: number | null;
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
  rawInput?: RawInputForOpportunity | null;
  messages?: MessageDraftForOpportunity[] | null;
  _count?: {
    interviews?: number | null;
  } | null;
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
  frequency: string;
  currentSolution: string;
  solutionGap: string;
  solutionGapAnalysis: SolutionGapAnalysis;
  evidenceAnalysis: EvidenceAnalysis;
  evidencePack: EvidencePack;
  activationDecision: ActivationDecisionResult;
  validationTasks: ValidationTask[];
  opportunityThesis: OpportunityThesis;
  marketValidation: MarketValidation;
  opportunityReadiness: OpportunityReadiness;
  buyerMapping: BuyerMapping;
  founderConviction: number | null;
  founderConvictionRecommendation: FounderConvictionResult;
  interviewCount: number;
  targetTitles: string[];
  companySize: string;
  industry: string;
  buyer: string;
  budgetOwner: string;
  triggerEvent: string;
  outreachAngleRefined: string;
  reviewStatus: ReviewStatus;
  icpGenerated: boolean;
  hasHumanEdits: boolean;
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
  const generatedTargetTitles = parseTargetTitles(signal.targetTitles);
  const humanTargetTitles = parseTargetTitles(signal.humanTargetTitles);
  const targetTitles = humanTargetTitles.length ? humanTargetTitles : generatedTargetTitles;
  const icpGenerated = Boolean(signal.icpGeneratedAt || targetTitles.length > 0);
  const filterStatus = signal.rawInput?.status ?? "unknown";
  const latestMessage = signal.messages?.[0] ?? null;
  const hasHumanEdits = hasHumanEditedState({
    humanPain: signal.humanPain,
    humanUrgency: signal.humanUrgency,
    humanAffectedTeam: signal.humanAffectedTeam,
    humanExistingWorkaround: signal.humanExistingWorkaround,
    humanPossibleIcp: signal.humanPossibleIcp,
    humanMonetizationScore: signal.humanMonetizationScore,
    humanOutreachAngle: signal.humanOutreachAngle,
    humanTargetTitles,
    humanCompanySize: signal.humanCompanySize,
    humanIndustry: signal.humanIndustry,
    humanBuyer: signal.humanBuyer,
    humanBudgetOwner: signal.humanBudgetOwner,
    humanTriggerEvent: signal.humanTriggerEvent,
    humanOutreachAngleRefined: signal.humanOutreachAngleRefined,
    humanNotes: signal.humanNotes,
    angleFeedback: signal.angleFeedback,
    reviewedAt: signal.reviewedAt,
    humanSubject: latestMessage?.humanSubject,
    humanBody: latestMessage?.humanBody,
    reviewNotes: latestMessage?.reviewNotes,
    messageReviewedAt: latestMessage?.reviewedAt,
  });
  const monetizationScore = preferHumanValue(
    signal.humanMonetizationScore,
    signal.monetizationScore ?? 0,
  );
  const frequency = signal.frequency?.trim() || "Unknown";
  const currentSolution = signal.currentSolution?.trim() || "Unknown";
  const solutionGap = signal.solutionGap?.trim() || "Unknown";
  const pain = preferHumanValue(signal.humanPain, signal.pain ?? "No pain summary available");
  const urgency = preferHumanValue(signal.humanUrgency, signal.urgency ?? "unknown");
  const affectedTeam = preferHumanValue(signal.humanAffectedTeam, signal.affectedTeam ?? "Unknown");
  const buyer = preferHumanValue(signal.humanBuyer, signal.buyer ?? "Unknown");
  const budgetOwner = preferHumanValue(signal.humanBudgetOwner, signal.budgetOwner ?? "Unknown");
  const triggerEvent = preferHumanValue(signal.humanTriggerEvent, signal.triggerEvent ?? "Unknown");
  const companySize = preferHumanValue(signal.humanCompanySize, signal.companySize ?? "Unknown");
  const industry = preferHumanValue(signal.humanIndustry, signal.industry ?? "Unknown");
  const founderConvictionRecommendation = generateFounderConviction({
    pain,
    rawText: signal.rawInput?.rawText,
    urgency,
    frequency,
    currentSolution,
    solutionGap,
    affectedTeam,
    monetizationScore,
    filterScore: typeof filter.score === "number" ? filter.score : undefined,
    buyer,
    budgetOwner,
    triggerEvent,
    targetTitles,
    companySize,
    industry,
  });
  const solutionGapAnalysis = generateSolutionGapAnalysis({
    rawText: signal.rawInput?.rawText,
    pain,
    affectedTeam,
    currentSolution,
    solutionGap,
  });
  const evidenceAnalysis = generateEvidenceStrength({
    title: pain,
    summary: signal.rawInput?.rawText,
    current_solution: currentSolution,
    solution_gap: solutionGap,
    frequency,
    urgency,
    affected_team: affectedTeam,
  });
  const buyerMapping = generateBuyerMapping({
    narrative: signal.rawInput?.rawText,
    pain,
    affectedTeam,
    currentSolution,
    solutionGap,
    businessImpact: solutionGapAnalysis.businessImpact,
  });
  const evidencePack = generateEvidencePack({
    rawText: signal.rawInput?.rawText,
    pain,
    urgency,
    frequency,
    affectedTeam,
    currentSolution,
    solutionGap,
    monetizationScore,
    founderConviction: signal.founderConviction,
    evidenceAnalysis,
    buyerMapping,
  });
  const opportunityReadiness = generateOpportunityReadiness({
    rawText: signal.rawInput?.rawText,
    pain,
    affectedTeam,
    frequency,
    currentSolution,
    solutionGap,
    buyer,
    budgetOwner,
    targetTitles,
    humanConfirmedFields: {
      businessImpact: Boolean(signal.humanPain || signal.humanNotes),
      painOwner: Boolean(signal.humanAffectedTeam),
      buyer: Boolean(signal.humanBuyer),
      budgetOwner: Boolean(signal.humanBudgetOwner),
      economicBuyer: Boolean(signal.humanBudgetOwner),
      economicCase: Boolean(signal.humanBudgetOwner || signal.humanMonetizationScore),
    },
    outreachAngle: preferHumanValue(signal.humanOutreachAngle, signal.outreachAngle ?? "Unknown"),
    evidenceAnalysis,
    evidencePack,
    buyerMapping,
    solutionGapAnalysis,
  });
  const opportunityScore = calculateOpportunityScore({
    b2bScore: signal.b2bScore,
    monetizationScore,
    urgency,
    rawText: signal.rawInput?.rawText,
    pain,
    affectedTeam,
    frequency,
    currentSolution,
    solutionGap,
    automationPotential: solutionGapAnalysis.automationPotential,
    evidenceStrength: evidenceAnalysis.evidenceStrength,
    targetTitles,
    icpGeneratedAt: signal.icpGeneratedAt,
    rawInputStatus: filterStatus,
    status: reviewStatus,
  });
  const activationDecision = generateActivationDecision({
    opportunityReadiness,
    opportunityScore,
    founderConvictionRecommendation,
  });
  const validationTasks = generateValidationTasks({
    opportunityId: signal.id,
    activationDecision: activationDecision.activationDecision,
    blockers: opportunityReadiness.blockers,
  });
  const opportunityThesis = generateOpportunityThesis({
    rawText: signal.rawInput?.rawText,
    pain,
    affectedTeam,
    frequency,
    urgency,
    currentSolution,
    solutionGap,
    buyer,
    budgetOwner,
    activationDecision,
    opportunityReadiness,
    buyerMapping,
    solutionGapAnalysis,
  });
  const marketValidation = generateMarketValidation({
    rawText: signal.rawInput?.rawText,
    pain,
    affectedTeam,
    currentSolution,
    solutionGap,
    opportunityThesis,
  });

  return {
    id: signal.id,
    rawSignalText: signal.rawInput?.rawText ?? "Raw input unavailable",
    filterStatus,
    marketType: typeof filter.marketType === "string" ? filter.marketType : "unknown",
    confidence: typeof filter.confidence === "string" ? filter.confidence : "unknown",
    pain,
    urgency,
    affectedTeam,
    existingWorkaround: preferHumanValue(
      signal.humanExistingWorkaround,
      signal.existingWorkaround ?? "Unknown",
    ),
    possibleIcp: preferHumanValue(signal.humanPossibleIcp, signal.possibleIcp ?? "Unknown"),
    monetizationScore,
    outreachAngle: preferHumanValue(signal.humanOutreachAngle, signal.outreachAngle ?? "Unknown"),
    frequency,
    currentSolution,
    solutionGap,
    solutionGapAnalysis,
    evidenceAnalysis,
    evidencePack,
    activationDecision,
    validationTasks,
    opportunityThesis,
    marketValidation,
    opportunityReadiness,
    buyerMapping,
    founderConviction: signal.founderConviction ?? null,
    founderConvictionRecommendation,
    interviewCount: getInterviewCount(signal._count?.interviews),
    targetTitles,
    companySize,
    industry,
    buyer,
    budgetOwner,
    triggerEvent,
    outreachAngleRefined: preferHumanValue(
      signal.humanOutreachAngleRefined,
      signal.outreachAngleRefined ?? "Unknown",
    ),
    reviewStatus,
    icpGenerated,
    hasHumanEdits,
    latestDraft: latestMessage
      ? {
          id: latestMessage.id,
          subject: preferHumanValue(latestMessage.humanSubject, latestMessage.subject ?? "Untitled draft"),
          body: preferHumanValue(latestMessage.humanBody, latestMessage.body ?? ""),
          status: latestMessage.status ?? "draft",
          generatedAt: latestMessage.generatedAt ?? null,
        }
      : null,
    opportunityScore,
  };
}

export function matchesOpportunitySearch(item: OpportunityDashboardItem, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return [
    item.rawSignalText,
    item.pain,
    item.affectedTeam,
    item.currentSolution,
    item.solutionGap,
    item.possibleIcp,
    item.outreachAngle,
  ].some((value) => value.toLowerCase().includes(normalizedQuery));
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
