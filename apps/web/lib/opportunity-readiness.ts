import type { BuyerMapping } from "./buyer-mapping-engine.ts";
import type { EvidenceAnalysis } from "./evidence-strength.ts";
import type { EvidencePack } from "./evidence-pack-generator.ts";
import type { SolutionGapAnalysis } from "./solution-gap-engine.ts";

export type OpportunityReadinessStage = "Discover" | "Validate" | "Outreach Ready";

export type QualificationMilestoneName =
  | "Workflow Identified"
  | "Business Impact Identified"
  | "Pain Owner Identified"
  | "Buyer Path Identified"
  | "Economic Case Identified";

export type QualificationMilestone = {
  name: QualificationMilestoneName;
  complete: boolean;
  detail: string;
};

export type OpportunityReadiness = {
  stage: OpportunityReadinessStage;
  completedMilestones: number;
  totalMilestones: number;
  milestones: QualificationMilestone[];
  blockers: QualificationMilestone[];
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
  pain?: string | null;
  affectedTeam?: string | null;
  frequency?: string | null;
  currentSolution?: string | null;
  solutionGap?: string | null;
  buyer?: string | null;
  budgetOwner?: string | null;
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

function buildMilestones(input: OpportunityReadinessInput): QualificationMilestone[] {
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
    !hasAnyGap(input, ["Budget owner confirmation", "Quantified manual effort", "Error/rework impact"]);

  return [
    {
      name: "Workflow Identified",
      complete: workflowIdentified,
      detail: workflowIdentified ? display(input.currentSolution) : "Workflow evidence needed",
    },
    {
      name: "Business Impact Identified",
      complete: businessImpactIdentified,
      detail: businessImpactIdentified
        ? input.solutionGapAnalysis.businessImpact
        : "Business impact evidence needed",
    },
    {
      name: "Pain Owner Identified",
      complete: painOwnerIdentified,
      detail: painOwnerIdentified
        ? display(input.buyerMapping.decisionMap.suffers ?? input.affectedTeam)
        : "Pain owner evidence needed",
    },
    {
      name: "Buyer Path Identified",
      complete: buyerPathIdentified,
      detail: buyerPathIdentified
        ? display(input.buyerMapping.decisionMap.buyer ?? input.buyer)
        : "Evaluator evidence needed",
    },
    {
      name: "Economic Case Identified",
      complete: economicCaseIdentified,
      detail: economicCaseIdentified
        ? display(input.buyerMapping.decisionMap.economicBuyer ?? input.budgetOwner)
        : "Budget and cost evidence needed",
    },
  ];
}

function getStage(evidenceScore: number, completedMilestones: number): OpportunityReadinessStage {
  if (completedMilestones === 5 && evidenceScore >= 8) return "Outreach Ready";
  if (evidenceScore <= 5 || completedMilestones <= 2) return "Discover";
  return "Validate";
}

function getNextBestAction(stage: OpportunityReadinessStage, blockers: QualificationMilestone[]) {
  if (stage === "Outreach Ready") return "Generate reviewed outreach draft.";
  const firstBlocker = blockers[0]?.name;
  if (firstBlocker === "Workflow Identified") return "Validate the recurring workflow.";
  if (firstBlocker === "Business Impact Identified") return "Quantify business impact.";
  if (firstBlocker === "Pain Owner Identified") return "Confirm who owns the pain.";
  if (firstBlocker === "Buyer Path Identified") return "Identify who evaluates this solution.";
  if (firstBlocker === "Economic Case Identified") return "Confirm budget owner and cost impact.";
  return "Review supporting evidence.";
}

function getStatusLabel(stage: OpportunityReadinessStage, blockers: QualificationMilestone[]) {
  if (stage === "Outreach Ready") return "Outreach ready";
  if (stage === "Discover") return "Needs discovery";
  return `${blockers.length} qualification ${blockers.length === 1 ? "blocker" : "blockers"} remaining`;
}

export function generateOpportunityReadiness(input: OpportunityReadinessInput): OpportunityReadiness {
  const milestones = buildMilestones(input);
  const completedMilestones = milestones.filter((milestone) => milestone.complete).length;
  const blockers = milestones.filter((milestone) => !milestone.complete);
  const stage = getStage(input.evidenceAnalysis.evidenceScore, completedMilestones);

  return {
    stage,
    completedMilestones,
    totalMilestones: milestones.length,
    milestones,
    blockers,
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
