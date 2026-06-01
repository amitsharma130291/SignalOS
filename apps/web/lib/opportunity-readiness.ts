import type { BuyerMapping } from "./buyer-mapping-engine.ts";
import type { EvidenceAnalysis } from "./evidence-strength.ts";
import type { EvidencePack } from "./evidence-pack-generator.ts";
import {
  buildQualificationTrust,
  type QualificationTrustFields,
  type TrustState,
  type TrustedField,
} from "./evidence-trust.ts";
import type { SolutionGapAnalysis } from "./solution-gap-engine.ts";

export type OpportunityReadinessStage = "Discover" | "Validate" | "Outreach Ready";

export type QualificationMilestoneName =
  | "Workflow"
  | "Business Impact"
  | "Pain Owner"
  | "Buyer Path"
  | "Economic Case";

export type QualificationMilestone = {
  name: QualificationMilestoneName;
  complete: boolean;
  blockerLabel: string;
  detail: string;
  trustState: TrustState;
  evidenceSources: TrustedField<string>["evidenceSources"];
  evidenceCount: number;
};

export type OpportunityReadiness = {
  stage: OpportunityReadinessStage;
  completedMilestones: number;
  totalMilestones: number;
  milestones: QualificationMilestone[];
  blockers: QualificationMilestone[];
  trustedFields: QualificationTrustFields;
  nextBestAction: string;
  statusLabel: string;
  buyerPath: {
    painOwner: string;
    evaluator: string;
    budgetOwner: string;
  };
  outreachRecommendation: string;
};

export type OpportunityReadinessInput = {
  rawText?: string | null;
  pain?: string | null;
  affectedTeam?: string | null;
  frequency?: string | null;
  currentSolution?: string | null;
  solutionGap?: string | null;
  buyer?: string | null;
  budgetOwner?: string | null;
  targetTitles?: string[];
  humanConfirmedFields?: Partial<Record<keyof QualificationTrustFields, boolean>>;
  outreachAngle?: string | null;
  evidenceAnalysis: EvidenceAnalysis;
  evidencePack: EvidencePack;
  buyerMapping: BuyerMapping;
  solutionGapAnalysis: SolutionGapAnalysis;
};

const UNKNOWN = "Unknown";

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function display(value?: string | null) {
  return value?.trim() || UNKNOWN;
}

function isKnown(value?: string | null) {
  const normalized = normalize(value);
  return Boolean(normalized && normalized !== "unknown");
}

function hasGap(input: OpportunityReadinessInput, label: string) {
  return input.evidencePack.evidenceGaps.some((gap) => gap.label === label);
}

function hasAnyGap(input: OpportunityReadinessInput, labels: string[]) {
  return labels.some((label) => hasGap(input, label));
}

function hasConcreteBusinessImpact(input: OpportunityReadinessInput) {
  return (
    input.evidenceAnalysis.evidenceReasons.includes("explicit business impact") ||
    input.evidenceAnalysis.evidenceReasons.includes("business impact partially inferred") ||
    !hasAnyGap(input, ["Error/rework impact", "Escalation business impact", "Compliance cost impact"])
  );
}

function isTrustedForCompletion(trustState: TrustState) {
  return trustState === "validated" || trustState === "human_confirmed";
}

function getTrustPriority(trustState: TrustState) {
  if (trustState === "missing") return 0;
  if (trustState === "inferred") return 1;
  if (trustState === "validated") return 2;
  return 3;
}

function getBlockerLabel(
  name: QualificationMilestoneName,
  trustedField: TrustedField<string>,
  trustedFields: QualificationTrustFields,
) {
  if (name === "Economic Case" && trustedField.trustState === "missing") {
    const budgetMissing =
      trustedFields.budgetOwner.trustState === "missing" &&
      trustedFields.economicBuyer.trustState === "missing";

    return budgetMissing ? "Budget Owner Missing" : "Economic Case Missing";
  }

  if (trustedField.trustState === "missing") return `${name} Missing`;
  if (trustedField.trustState === "inferred") return `${name} Inferred`;
  return `${name} Not Validated`;
}

function hasExplicitEconomicEvidence(input: OpportunityReadinessInput) {
  const text = [input.rawText, input.pain, input.solutionGap, input.solutionGapAnalysis.businessImpact]
    .map(normalize)
    .filter(Boolean)
    .join(" ");

  return [
    "cost",
    "revenue",
    "dollar",
    "$",
    "hour",
    "manual effort",
    "headcount",
    "audit risk",
    "risk cost",
  ].some((term) => text.includes(term));
}

function addTrustToMilestone(
  milestone: Omit<QualificationMilestone, "complete" | "blockerLabel" | "trustState" | "evidenceSources" | "evidenceCount">,
  trustedField: TrustedField<string>,
  trustedFields: QualificationTrustFields,
): QualificationMilestone {
  return {
    name: milestone.name,
    blockerLabel: getBlockerLabel(milestone.name, trustedField, trustedFields),
    detail: milestone.detail,
    complete: isTrustedForCompletion(trustedField.trustState),
    trustState: trustedField.trustState,
    evidenceSources: trustedField.evidenceSources,
    evidenceCount: trustedField.evidenceCount,
  };
}

function buildMilestones(
  input: OpportunityReadinessInput,
  trustedFields: QualificationTrustFields,
): QualificationMilestone[] {
  const workflowIdentified =
    input.evidenceAnalysis.evidenceReasons.includes("explicit workflow") ||
    isKnown(input.currentSolution) ||
    isKnown(input.solutionGap);
  const businessImpactIdentified = hasConcreteBusinessImpact(input);
  const painOwnerIdentified =
    isKnown(input.affectedTeam) || isKnown(input.buyerMapping.decisionMap.suffers);
  const buyerPathIdentified =
    isKnown(input.buyer) ||
    isKnown(input.buyerMapping.decisionMap.buyer) ||
    input.buyerMapping.buyerClarityScore >= 7;
  const economicCaseIdentified =
    (isKnown(input.budgetOwner) || isKnown(input.buyerMapping.decisionMap.economicBuyer)) &&
    hasExplicitEconomicEvidence(input);

  return [
    addTrustToMilestone(
      {
        name: "Workflow",
        detail: workflowIdentified ? display(input.currentSolution) : "Workflow evidence needed",
      },
      trustedFields.workflow,
      trustedFields,
    ),
    addTrustToMilestone(
      {
        name: "Business Impact",
        detail: businessImpactIdentified
          ? input.solutionGapAnalysis.businessImpact
          : "Business impact evidence needed",
      },
      trustedFields.businessImpact,
      trustedFields,
    ),
    addTrustToMilestone(
      {
        name: "Pain Owner",
        detail: painOwnerIdentified
          ? display(input.buyerMapping.decisionMap.suffers ?? input.affectedTeam)
          : "Pain owner evidence needed",
      },
      trustedFields.painOwner,
      trustedFields,
    ),
    addTrustToMilestone(
      {
        name: "Buyer Path",
        detail: buyerPathIdentified
          ? display(input.buyerMapping.decisionMap.buyer ?? input.buyer)
          : "Evaluator evidence needed",
      },
      trustedFields.buyer,
      trustedFields,
    ),
    addTrustToMilestone(
      {
        name: "Economic Case",
        detail: economicCaseIdentified
          ? display(input.buyerMapping.decisionMap.economicBuyer ?? input.budgetOwner)
          : "Budget and cost evidence needed",
      },
      trustedFields.economicCase,
      trustedFields,
    ),
  ];
}

function getStage(evidenceScore: number, completedMilestones: number): OpportunityReadinessStage {
  if (completedMilestones === 5 && evidenceScore >= 8) return "Outreach Ready";
  if (evidenceScore <= 5 || completedMilestones <= 2) return "Discover";
  return "Validate";
}

function getNextBestAction(stage: OpportunityReadinessStage, blockers: QualificationMilestone[]) {
  if (stage === "Outreach Ready") return "Generate reviewed outreach draft.";
  const firstBlocker = blockers[0]?.blockerLabel;
  if (firstBlocker === "Workflow Missing" || firstBlocker === "Workflow Inferred") {
    return "Validate the recurring workflow.";
  }
  if (firstBlocker === "Business Impact Missing" || firstBlocker === "Business Impact Inferred") {
    return "Quantify business impact.";
  }
  if (firstBlocker === "Pain Owner Missing" || firstBlocker === "Pain Owner Inferred") {
    return "Confirm who owns the pain.";
  }
  if (firstBlocker === "Buyer Path Missing" || firstBlocker === "Buyer Path Inferred") {
    return "Identify pain owner and buyer path.";
  }
  if (firstBlocker === "Budget Owner Missing") return "Confirm budget owner.";
  if (firstBlocker === "Economic Case Missing" || firstBlocker === "Economic Case Inferred") {
    return "Validate budget and cost impact.";
  }
  return "Review supporting evidence.";
}

function getStatusLabel(stage: OpportunityReadinessStage, blockers: QualificationMilestone[]) {
  if (stage === "Outreach Ready") return "Outreach ready";
  if (stage === "Discover") return "Needs discovery";
  return `${blockers.length} qualification ${blockers.length === 1 ? "blocker" : "blockers"} remaining`;
}

export function generateOpportunityReadiness(input: OpportunityReadinessInput): OpportunityReadiness {
  const economicCase = [
    input.budgetOwner,
    input.buyerMapping.decisionMap.economicBuyer,
    hasExplicitEconomicEvidence(input)
      ? `${input.solutionGap ?? ""} ${input.solutionGapAnalysis.businessImpact}`.trim()
      : null,
  ]
    .filter(isKnown)
    .join(" + ");
  const trustedFields = buildQualificationTrust({
    workflow: input.currentSolution,
    businessImpact: input.solutionGapAnalysis.businessImpact,
    painOwner: input.buyerMapping.decisionMap.suffers ?? input.affectedTeam,
    buyer: input.buyerMapping.decisionMap.buyer ?? input.buyer,
    budgetOwner: input.budgetOwner,
    economicBuyer: input.buyerMapping.decisionMap.economicBuyer,
    frequency: input.frequency,
    economicCase,
    targetTitles: input.targetTitles,
    humanConfirmedFields: input.humanConfirmedFields,
    evidenceAnalysis: input.evidenceAnalysis,
    evidencePack: input.evidencePack,
    buyerMapping: input.buyerMapping,
    solutionGapAnalysis: input.solutionGapAnalysis,
  });
  const milestones = buildMilestones(input, trustedFields);
  const completedMilestones = milestones.filter((milestone) => milestone.complete).length;
  const blockers = milestones
    .filter((milestone) => !milestone.complete)
    .sort((first, second) => getTrustPriority(first.trustState) - getTrustPriority(second.trustState));
  const stage = getStage(input.evidenceAnalysis.evidenceScore, completedMilestones);

  return {
    stage,
    completedMilestones,
    totalMilestones: milestones.length,
    milestones,
    blockers,
    trustedFields,
    nextBestAction: getNextBestAction(stage, blockers),
    statusLabel: getStatusLabel(stage, blockers),
    buyerPath: {
      painOwner: display(input.buyerMapping.decisionMap.suffers ?? input.affectedTeam),
      evaluator: display(input.buyerMapping.decisionMap.buyer ?? input.buyer),
      budgetOwner: display(input.buyerMapping.decisionMap.economicBuyer ?? input.budgetOwner),
    },
    outreachRecommendation:
      stage === "Outreach Ready"
        ? input.outreachAngle?.trim() || "Use the validated workflow pain as the outreach angle."
        : "Resolve qualification blockers before outreach.",
  };
}
