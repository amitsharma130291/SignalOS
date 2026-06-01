import type { BuyerMapping } from "./buyer-mapping-engine.ts";
import type { EvidenceAnalysis } from "./evidence-strength.ts";
import type { EvidencePack } from "./evidence-pack-generator.ts";
import type { SolutionGapAnalysis } from "./solution-gap-engine.ts";

export type TrustState = "missing" | "inferred" | "validated" | "human_confirmed";

export type EvidenceSource =
  | "workflow_signal"
  | "solution_gap"
  | "icp"
  | "buyer_mapping"
  | "readiness"
  | "company_research"
  | "job_posting"
  | "community_evidence"
  | "founder_confirmation";

export type TrustedField<T> = {
  value: T | null;
  trustState: TrustState;
  evidenceSources: EvidenceSource[];
  evidenceCount: number;
};

export type TrustBadge = {
  label: string;
  className: string;
};

export type QualificationTrustFields = {
  workflow: TrustedField<string>;
  businessImpact: TrustedField<string>;
  painOwner: TrustedField<string>;
  buyer: TrustedField<string>;
  budgetOwner: TrustedField<string>;
  economicBuyer: TrustedField<string>;
  frequency: TrustedField<string>;
  economicCase: TrustedField<string>;
};

export type QualificationTrustInput = {
  workflow?: string | null;
  businessImpact?: string | null;
  painOwner?: string | null;
  buyer?: string | null;
  budgetOwner?: string | null;
  economicBuyer?: string | null;
  frequency?: string | null;
  economicCase?: string | null;
  targetTitles?: string[];
  humanConfirmedFields?: Partial<Record<keyof QualificationTrustFields, boolean>>;
  evidenceAnalysis?: EvidenceAnalysis | null;
  evidencePack?: EvidencePack | null;
  buyerMapping?: BuyerMapping | null;
  solutionGapAnalysis?: SolutionGapAnalysis | null;
};

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function hasMissingPlaceholder(value: unknown) {
  if (typeof value !== "string") return false;
  const normalized = normalize(value);

  return (
    !normalized ||
    normalized === "unknown" ||
    normalized.includes("evidence needed") ||
    normalized.includes("missing")
  );
}

function hasInferencePlaceholder(value: unknown) {
  if (typeof value !== "string") return false;
  const normalized = normalize(value);

  return (
    normalized.includes("not confirmed") ||
    normalized.includes("estimated") ||
    normalized.includes("inferred")
  );
}

function hasValue(value: unknown) {
  if (typeof value !== "string") return value !== null && value !== undefined;
  return !hasMissingPlaceholder(value);
}

export function mergeEvidenceSources(...sourceGroups: Array<readonly EvidenceSource[] | undefined>) {
  const sources: EvidenceSource[] = [];

  for (const group of sourceGroups) {
    for (const source of group ?? []) {
      if (!sources.includes(source)) sources.push(source);
    }
  }

  return sources;
}

export function calculateEvidenceCount(sources: readonly EvidenceSource[]) {
  return mergeEvidenceSources(sources).length;
}

export function calculateTrustState({
  value,
  evidenceSources,
}: {
  value: unknown;
  evidenceSources: readonly EvidenceSource[];
}): TrustState {
  if (!hasValue(value)) return "missing";
  if (evidenceSources.includes("founder_confirmation")) return "human_confirmed";
  if (hasInferencePlaceholder(value)) return evidenceSources.length ? "inferred" : "missing";
  if (calculateEvidenceCount(evidenceSources) >= 2) return "validated";
  return "inferred";
}

export function buildTrustedField<T>(
  value: T | null | undefined,
  evidenceSources: readonly EvidenceSource[] = [],
): TrustedField<T> {
  const normalizedValue = hasValue(value) ? (value as T) : null;
  const mergedSources = normalizedValue ? mergeEvidenceSources(evidenceSources) : [];

  return {
    value: normalizedValue,
    trustState: calculateTrustState({ value: normalizedValue, evidenceSources: mergedSources }),
    evidenceSources: mergedSources,
    evidenceCount: calculateEvidenceCount(mergedSources),
  };
}

export function getTrustBadge(trustState: TrustState): TrustBadge {
  if (trustState === "human_confirmed") {
    return {
      label: "Human Confirmed",
      className: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
    };
  }

  if (trustState === "validated") {
    return {
      label: "Validated",
      className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    };
  }

  if (trustState === "inferred") {
    return {
      label: "Inferred",
      className: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    };
  }

  return {
    label: "Missing",
    className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  };
}

function withHumanConfirmation(
  sources: EvidenceSource[],
  field: keyof QualificationTrustFields,
  input: QualificationTrustInput,
) {
  return input.humanConfirmedFields?.[field]
    ? mergeEvidenceSources(sources, ["founder_confirmation"])
    : sources;
}

function hasEvidenceReason(input: QualificationTrustInput, reason: string) {
  return input.evidenceAnalysis?.evidenceReasons.includes(reason) ?? false;
}

function hasEvidenceCategory(input: QualificationTrustInput, label: string) {
  return input.evidencePack?.evidenceCategories.some((category) => category.label === label) ?? false;
}

function hasExplicitEconomicEvidence(input: QualificationTrustInput) {
  const text = normalize(input.economicCase);

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

function buildWorkflowSources(input: QualificationTrustInput) {
  const sources: EvidenceSource[] = [];
  if (hasEvidenceReason(input, "explicit workflow")) sources.push("workflow_signal");
  if (hasValue(input.workflow)) sources.push("solution_gap");
  if (hasEvidenceCategory(input, "Workflow Evidence")) sources.push("readiness");
  return withHumanConfirmation(sources, "workflow", input);
}

function buildBusinessImpactSources(input: QualificationTrustInput) {
  const sources: EvidenceSource[] = [];
  if (
    hasEvidenceReason(input, "explicit business impact") ||
    hasEvidenceReason(input, "business impact partially inferred")
  ) {
    sources.push("workflow_signal");
  }
  if (input.solutionGapAnalysis && hasValue(input.businessImpact)) sources.push("solution_gap");
  if (hasEvidenceCategory(input, "Business Evidence")) sources.push("readiness");
  return withHumanConfirmation(sources, "businessImpact", input);
}

function buildPainOwnerSources(input: QualificationTrustInput) {
  const sources: EvidenceSource[] = [];
  if (hasValue(input.painOwner)) sources.push("workflow_signal");
  if (hasValue(input.buyerMapping?.decisionMap.suffers)) sources.push("buyer_mapping");
  return withHumanConfirmation(sources, "painOwner", input);
}

function buildBuyerSources(input: QualificationTrustInput) {
  const sources: EvidenceSource[] = [];
  if (hasValue(input.buyerMapping?.decisionMap.buyer)) sources.push("buyer_mapping");
  if (hasValue(input.buyer)) sources.push("icp");
  if ((input.targetTitles?.length ?? 0) > 0) sources.push("icp");
  return withHumanConfirmation(sources, "buyer", input);
}

function buildBudgetOwnerSources(input: QualificationTrustInput) {
  const sources: EvidenceSource[] = [];
  if (hasValue(input.budgetOwner)) sources.push("icp");
  if (hasValue(input.economicBuyer)) sources.push("buyer_mapping");
  return withHumanConfirmation(sources, "budgetOwner", input);
}

function buildEconomicBuyerSources(input: QualificationTrustInput) {
  const sources: EvidenceSource[] = [];
  if (hasValue(input.economicBuyer)) sources.push("buyer_mapping");
  if (hasValue(input.budgetOwner)) sources.push("icp");
  return withHumanConfirmation(sources, "economicBuyer", input);
}

function buildFrequencySources(input: QualificationTrustInput) {
  const sources: EvidenceSource[] = [];
  if (hasEvidenceReason(input, "explicit frequency")) sources.push("workflow_signal");
  if (hasEvidenceCategory(input, "Workflow Evidence")) sources.push("readiness");
  return withHumanConfirmation(sources, "frequency", input);
}

function buildEconomicCaseSources(input: QualificationTrustInput) {
  const sources: EvidenceSource[] = [];
  const hasBudgetEvidence = hasValue(input.budgetOwner) || hasValue(input.economicBuyer);
  const hasCostEvidence = hasExplicitEconomicEvidence(input);

  if (!hasBudgetEvidence || !hasCostEvidence) {
    return withHumanConfirmation(sources, "economicCase", input);
  }

  if (hasValue(input.economicCase)) sources.push("solution_gap");
  if (hasBudgetEvidence) sources.push("buyer_mapping");
  if (hasCostEvidence) sources.push("readiness");
  return withHumanConfirmation(sources, "economicCase", input);
}

export function buildQualificationTrust(input: QualificationTrustInput): QualificationTrustFields {
  return {
    workflow: buildTrustedField(input.workflow, buildWorkflowSources(input)),
    businessImpact: buildTrustedField(input.businessImpact, buildBusinessImpactSources(input)),
    painOwner: buildTrustedField(input.painOwner, buildPainOwnerSources(input)),
    buyer: buildTrustedField(input.buyer, buildBuyerSources(input)),
    budgetOwner: buildTrustedField(input.budgetOwner, buildBudgetOwnerSources(input)),
    economicBuyer: buildTrustedField(input.economicBuyer, buildEconomicBuyerSources(input)),
    frequency: buildTrustedField(input.frequency, buildFrequencySources(input)),
    economicCase: buildTrustedField(input.economicCase, buildEconomicCaseSources(input)),
  };
}
