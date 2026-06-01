import type { FounderConvictionResult } from "./founder-conviction.ts";
import type { OpportunityScoreResult } from "./opportunity-score.ts";
import type { OpportunityReadiness } from "./opportunity-readiness.ts";
import type { TrustState } from "./evidence-trust.ts";

export type ActivationDecision = "ENGAGE" | "VALIDATE" | "MONITOR" | "IGNORE" | "ESCALATE";

export type ActivationDecisionResult = {
  activationDecision: ActivationDecision;
  activationReason: string;
  activationConfidence: number;
};

export type ActivationDecisionInput = {
  opportunityReadiness: OpportunityReadiness;
  opportunityScore: OpportunityScoreResult;
  founderConvictionRecommendation: FounderConvictionResult;
};

const CRITICAL_MILESTONES = ["Workflow", "Business Impact", "Buyer Path", "Economic Case"];

function isTrusted(trustState: TrustState) {
  return trustState === "validated" || trustState === "human_confirmed";
}

function isWeakTrust(trustState: TrustState) {
  return trustState === "missing" || trustState === "inferred";
}

function hasTrustedCriticalFields(readiness: OpportunityReadiness) {
  return (
    isTrusted(readiness.trustedFields.businessImpact.trustState) &&
    isTrusted(readiness.trustedFields.buyer.trustState) &&
    isTrusted(readiness.trustedFields.economicCase.trustState)
  );
}

function getCriticalBlockers(readiness: OpportunityReadiness) {
  return readiness.blockers.filter((blocker) => CRITICAL_MILESTONES.includes(blocker.name));
}

function hasCriticalBlockers(readiness: OpportunityReadiness) {
  return getCriticalBlockers(readiness).length > 0;
}

function hasSomeEvidence(readiness: OpportunityReadiness) {
  return readiness.milestones.some((milestone) => milestone.trustState !== "missing");
}

function isStrongOpportunity(input: ActivationDecisionInput) {
  return (
    input.opportunityScore.score >= 60 ||
    input.opportunityScore.label === "high" ||
    input.founderConvictionRecommendation.recommendation === "high"
  );
}

function isLowOpportunity(input: ActivationDecisionInput) {
  return (
    input.opportunityScore.score < 30 &&
    input.founderConvictionRecommendation.recommendation === "low" &&
    input.opportunityReadiness.completedMilestones <= 1
  );
}

function hasHighUncertainty(input: ActivationDecisionInput) {
  const missingCritical = getCriticalBlockers(input.opportunityReadiness).filter(
    (blocker) => blocker.trustState === "missing",
  );

  return input.opportunityReadiness.completedMilestones <= 2 || missingCritical.length >= 2;
}

function shouldEngage(input: ActivationDecisionInput) {
  const stage = input.opportunityReadiness.stage;

  return (
    (stage === "Validate" || stage === "Outreach Ready") &&
    hasTrustedCriticalFields(input.opportunityReadiness) &&
    !hasCriticalBlockers(input.opportunityReadiness)
  );
}

function shouldEscalate(input: ActivationDecisionInput) {
  return isStrongOpportunity(input) && hasHighUncertainty(input);
}

function shouldValidate(input: ActivationDecisionInput) {
  return isStrongOpportunity(input) && hasCriticalBlockers(input.opportunityReadiness);
}

function shouldIgnore(input: ActivationDecisionInput) {
  return isLowOpportunity(input) && !hasSomeEvidence(input.opportunityReadiness);
}

function getPrimaryBlocker(readiness: OpportunityReadiness) {
  return getCriticalBlockers(readiness)[0] ?? readiness.blockers[0] ?? null;
}

export function generateActivationReason(
  activationDecision: ActivationDecision,
  input: ActivationDecisionInput,
) {
  const primaryBlocker = getPrimaryBlocker(input.opportunityReadiness);

  if (activationDecision === "ENGAGE") {
    return "Workflow, business impact, buyer path, and economic case are validated.";
  }

  if (activationDecision === "VALIDATE") {
    if (primaryBlocker?.name === "Economic Case") {
      return "Economic case remains inferred or missing and budget/cost evidence must be validated.";
    }
    if (primaryBlocker?.name === "Buyer Path") {
      return "Buyer path remains inferred or missing and must be confirmed before outreach.";
    }
    if (primaryBlocker?.name === "Business Impact") {
      return "Business impact remains inferred or missing and must be quantified before outreach.";
    }
    return "Strong opportunity, but one or more critical qualification signals need validation.";
  }

  if (activationDecision === "ESCALATE") {
    return "High-potential opportunity has high uncertainty and needs founder or analyst review.";
  }

  if (activationDecision === "IGNORE") {
    return "Opportunity score is low and there is no meaningful qualification progress.";
  }

  return "Workflow exists, but impact, buyer path, or economic evidence remains too weak for validation.";
}

export function calculateActivationConfidence(
  activationDecision: ActivationDecision,
  input: ActivationDecisionInput,
) {
  const readinessRatio =
    input.opportunityReadiness.totalMilestones === 0
      ? 0
      : input.opportunityReadiness.completedMilestones / input.opportunityReadiness.totalMilestones;
  const scoreRatio = input.opportunityScore.score / 100;
  const criticalTrustRatio =
    [
      input.opportunityReadiness.trustedFields.businessImpact.trustState,
      input.opportunityReadiness.trustedFields.buyer.trustState,
      input.opportunityReadiness.trustedFields.economicCase.trustState,
    ].filter(isTrusted).length / 3;
  const blockerPenalty = Math.min(0.25, input.opportunityReadiness.blockers.length * 0.04);
  const base =
    activationDecision === "ENGAGE"
      ? 0.72
      : activationDecision === "VALIDATE"
        ? 0.64
        : activationDecision === "ESCALATE"
          ? 0.62
          : activationDecision === "MONITOR"
            ? 0.58
            : 0.66;
  const confidence =
    base + readinessRatio * 0.14 + scoreRatio * 0.1 + criticalTrustRatio * 0.12 - blockerPenalty;

  return Math.max(0.35, Math.min(0.97, Math.round(confidence * 100) / 100));
}

export function generateActivationDecision(
  input: ActivationDecisionInput,
): ActivationDecisionResult {
  let activationDecision: ActivationDecision = "MONITOR";

  if (shouldEngage(input)) {
    activationDecision = "ENGAGE";
  } else if (shouldEscalate(input)) {
    activationDecision = "ESCALATE";
  } else if (shouldValidate(input)) {
    activationDecision = "VALIDATE";
  } else if (shouldIgnore(input)) {
    activationDecision = "IGNORE";
  } else if (
    input.opportunityReadiness.milestones.every((milestone) => isWeakTrust(milestone.trustState)) &&
    input.opportunityScore.score < 40
  ) {
    activationDecision = "IGNORE";
  }

  return {
    activationDecision,
    activationReason: generateActivationReason(activationDecision, input),
    activationConfidence: calculateActivationConfidence(activationDecision, input),
  };
}
