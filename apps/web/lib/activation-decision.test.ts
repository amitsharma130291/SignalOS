import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateActivationConfidence,
  generateActivationDecision,
  generateActivationReason,
  type ActivationDecision,
  type ActivationDecisionInput,
} from "./activation-decision.ts";
import type { TrustState } from "./evidence-trust.ts";
import type { FounderConvictionResult } from "./founder-conviction.ts";
import type { OpportunityScoreResult } from "./opportunity-score.ts";
import type { OpportunityReadiness } from "./opportunity-readiness.ts";

type MilestoneSpec = {
  name: "Workflow" | "Business Impact" | "Pain Owner" | "Buyer Path" | "Economic Case";
  trustState: TrustState;
};

const DEFAULT_MILESTONES: MilestoneSpec[] = [
  { name: "Workflow", trustState: "validated" },
  { name: "Business Impact", trustState: "validated" },
  { name: "Pain Owner", trustState: "validated" },
  { name: "Buyer Path", trustState: "validated" },
  { name: "Economic Case", trustState: "validated" },
];

function trustedField(value: string, trustState: TrustState) {
  const hasEvidence = trustState !== "missing";

  return {
    value: hasEvidence ? value : null,
    trustState,
    evidenceSources: hasEvidence ? (["workflow_signal"] as const) : [],
    evidenceCount: hasEvidence ? 1 : 0,
  };
}

function makeFounderConviction(
  recommendation: FounderConvictionResult["recommendation"] = "high",
): FounderConvictionResult {
  return {
    score: recommendation === "high" ? 9 : recommendation === "medium" ? 6 : 2,
    reasons: [],
    risks: [],
    recommendation,
  };
}

function makeScore(score: number): OpportunityScoreResult {
  return {
    score,
    label: score >= 70 ? "high" : score >= 40 ? "medium" : "low",
    reasons: [],
  };
}

function makeReadiness({
  stage = "Validate",
  milestones = DEFAULT_MILESTONES,
}: {
  stage?: OpportunityReadiness["stage"];
  milestones?: MilestoneSpec[];
} = {}): OpportunityReadiness {
  const fullMilestones = DEFAULT_MILESTONES.map((defaultMilestone) => {
    const override = milestones.find((milestone) => milestone.name === defaultMilestone.name);
    return override ?? defaultMilestone;
  });
  const qualificationMilestones = fullMilestones.map((milestone) => {
    const complete =
      milestone.trustState === "validated" || milestone.trustState === "human_confirmed";

    return {
      name: milestone.name,
      complete,
      blockerLabel:
        milestone.trustState === "missing"
          ? `${milestone.name} Missing`
          : milestone.trustState === "inferred"
            ? `${milestone.name} Inferred`
            : `${milestone.name} Not Validated`,
      detail: complete ? `${milestone.name} detail` : `${milestone.name} evidence needed`,
      trustState: milestone.trustState,
      evidenceSources: complete || milestone.trustState === "inferred" ? ["workflow_signal" as const] : [],
      evidenceCount: complete || milestone.trustState === "inferred" ? 1 : 0,
    };
  });
  const blockers = qualificationMilestones.filter((milestone) => !milestone.complete);

  return {
    stage,
    completedMilestones: qualificationMilestones.filter((milestone) => milestone.complete).length,
    totalMilestones: qualificationMilestones.length,
    milestones: qualificationMilestones,
    blockers,
    trustedFields: {
      workflow: trustedField("Workflow", fullMilestones[0].trustState),
      businessImpact: trustedField("Business impact", fullMilestones[1].trustState),
      painOwner: trustedField("Pain owner", fullMilestones[2].trustState),
      buyer: trustedField("Buyer", fullMilestones[3].trustState),
      budgetOwner: trustedField("Budget owner", fullMilestones[4].trustState),
      economicBuyer: trustedField("Economic buyer", fullMilestones[4].trustState),
      frequency: trustedField("daily", "validated"),
      economicCase: trustedField("Economic case", fullMilestones[4].trustState),
    },
    nextBestAction: "Generate reviewed outreach draft.",
    statusLabel: "Outreach ready",
    buyerPath: {
      painOwner: "Finance Analyst",
      evaluator: "Controller",
      budgetOwner: "CFO",
    },
    outreachRecommendation: "Prepare reviewed outreach.",
  };
}

function makeInput({
  score = 85,
  founderRecommendation = "high",
  readiness = makeReadiness(),
}: {
  score?: number;
  founderRecommendation?: FounderConvictionResult["recommendation"];
  readiness?: OpportunityReadiness;
} = {}): ActivationDecisionInput {
  return {
    opportunityReadiness: readiness,
    opportunityScore: makeScore(score),
    founderConvictionRecommendation: makeFounderConviction(founderRecommendation),
  };
}

function expectDecision(input: ActivationDecisionInput, expected: ActivationDecision) {
  assert.equal(generateActivationDecision(input).activationDecision, expected);
}

describe("generateActivationDecision", () => {
  it("returns ENGAGE for outreach-ready trusted opportunities", () => {
    expectDecision(makeInput({ readiness: makeReadiness({ stage: "Outreach Ready" }) }), "ENGAGE");
  });

  it("returns ENGAGE for validate-stage opportunities with trusted critical fields", () => {
    expectDecision(makeInput({ readiness: makeReadiness({ stage: "Validate" }) }), "ENGAGE");
  });

  it("does not require human confirmation to engage when critical fields are validated", () => {
    const result = generateActivationDecision(makeInput());

    assert.equal(result.activationDecision, "ENGAGE");
    assert.match(result.activationReason, /validated/);
  });

  it("returns VALIDATE when economic case is inferred on a strong opportunity", () => {
    expectDecision(
      makeInput({
        readiness: makeReadiness({
          milestones: [{ name: "Economic Case", trustState: "inferred" }],
        }),
      }),
      "VALIDATE",
    );
  });

  it("returns VALIDATE when buyer path is missing on a strong opportunity", () => {
    expectDecision(
      makeInput({
        readiness: makeReadiness({
          milestones: [{ name: "Buyer Path", trustState: "missing" }],
        }),
      }),
      "VALIDATE",
    );
  });

  it("returns VALIDATE when business impact is inferred on a strong opportunity", () => {
    expectDecision(
      makeInput({
        readiness: makeReadiness({
          milestones: [{ name: "Business Impact", trustState: "inferred" }],
        }),
      }),
      "VALIDATE",
    );
  });

  it("uses founder conviction to treat medium score opportunities as strong", () => {
    expectDecision(
      makeInput({
        score: 52,
        founderRecommendation: "high",
        readiness: makeReadiness({
          milestones: [{ name: "Economic Case", trustState: "missing" }],
        }),
      }),
      "VALIDATE",
    );
  });

  it("returns ESCALATE for high score with several missing critical signals", () => {
    expectDecision(
      makeInput({
        score: 88,
        readiness: makeReadiness({
          stage: "Discover",
          milestones: [
            { name: "Business Impact", trustState: "missing" },
            { name: "Buyer Path", trustState: "missing" },
            { name: "Economic Case", trustState: "missing" },
          ],
        }),
      }),
      "ESCALATE",
    );
  });

  it("returns ESCALATE for high founder conviction with low completion", () => {
    expectDecision(
      makeInput({
        score: 58,
        founderRecommendation: "high",
        readiness: makeReadiness({
          stage: "Discover",
          milestones: [
            { name: "Workflow", trustState: "validated" },
            { name: "Business Impact", trustState: "missing" },
            { name: "Buyer Path", trustState: "missing" },
            { name: "Economic Case", trustState: "missing" },
          ],
        }),
      }),
      "ESCALATE",
    );
  });

  it("returns MONITOR for medium opportunities with some evidence but low trust", () => {
    expectDecision(
      makeInput({
        score: 45,
        founderRecommendation: "medium",
        readiness: makeReadiness({
          stage: "Discover",
          milestones: [
            { name: "Workflow", trustState: "validated" },
            { name: "Business Impact", trustState: "missing" },
            { name: "Buyer Path", trustState: "missing" },
            { name: "Economic Case", trustState: "missing" },
          ],
        }),
      }),
      "MONITOR",
    );
  });

  it("returns MONITOR when workflow exists but critical fields remain weak", () => {
    expectDecision(
      makeInput({
        score: 39,
        founderRecommendation: "medium",
        readiness: makeReadiness({
          stage: "Discover",
          milestones: [
            { name: "Workflow", trustState: "inferred" },
            { name: "Business Impact", trustState: "missing" },
            { name: "Buyer Path", trustState: "missing" },
            { name: "Economic Case", trustState: "missing" },
          ],
        }),
      }),
      "MONITOR",
    );
  });

  it("returns IGNORE for low score with no qualification progress", () => {
    expectDecision(
      makeInput({
        score: 15,
        founderRecommendation: "low",
        readiness: makeReadiness({
          stage: "Discover",
          milestones: DEFAULT_MILESTONES.map((milestone) => ({
            name: milestone.name,
            trustState: "missing",
          })),
        }),
      }),
      "IGNORE",
    );
  });

  it("returns IGNORE for low score where every milestone is weak", () => {
    expectDecision(
      makeInput({
        score: 28,
        founderRecommendation: "medium",
        readiness: makeReadiness({
          milestones: DEFAULT_MILESTONES.map((milestone) => ({
            name: milestone.name,
            trustState: "inferred",
          })),
        }),
      }),
      "IGNORE",
    );
  });

  it("reason mentions economic case for economic validation blockers", () => {
    const result = generateActivationDecision(
      makeInput({
        readiness: makeReadiness({
          milestones: [{ name: "Economic Case", trustState: "inferred" }],
        }),
      }),
    );

    assert.match(result.activationReason, /Economic case/);
  });

  it("reason mentions buyer path for buyer blockers", () => {
    const result = generateActivationDecision(
      makeInput({
        readiness: makeReadiness({
          milestones: [{ name: "Buyer Path", trustState: "missing" }],
        }),
      }),
    );

    assert.match(result.activationReason, /Buyer path/);
  });

  it("reason mentions business impact for impact blockers", () => {
    const result = generateActivationDecision(
      makeInput({
        readiness: makeReadiness({
          milestones: [{ name: "Business Impact", trustState: "inferred" }],
        }),
      }),
    );

    assert.match(result.activationReason, /Business impact/);
  });

  it("generates explicit monitor reason", () => {
    const result = generateActivationDecision(
      makeInput({
        score: 45,
        founderRecommendation: "medium",
        readiness: makeReadiness({
          stage: "Discover",
          milestones: [
            { name: "Workflow", trustState: "validated" },
            { name: "Business Impact", trustState: "missing" },
            { name: "Buyer Path", trustState: "missing" },
            { name: "Economic Case", trustState: "missing" },
          ],
        }),
      }),
    );

    assert.equal(result.activationDecision, "MONITOR");
    assert.match(result.activationReason, /too weak/);
  });

  it("generates explicit ignore reason", () => {
    const result = generateActivationDecision(
      makeInput({
        score: 10,
        founderRecommendation: "low",
        readiness: makeReadiness({
          milestones: DEFAULT_MILESTONES.map((milestone) => ({
            name: milestone.name,
            trustState: "missing",
          })),
        }),
      }),
    );

    assert.equal(result.activationDecision, "IGNORE");
    assert.match(result.activationReason, /low/);
  });

  it("calculates confidence inside expected range", () => {
    const result = generateActivationDecision(makeInput());

    assert.ok(result.activationConfidence >= 0.35);
    assert.ok(result.activationConfidence <= 0.97);
  });

  it("assigns high confidence to engage decisions", () => {
    const result = generateActivationDecision(makeInput());

    assert.equal(result.activationDecision, "ENGAGE");
    assert.ok(result.activationConfidence >= 0.85);
  });

  it("reduces confidence when blockers exist", () => {
    const engageConfidence = calculateActivationConfidence("ENGAGE", makeInput());
    const validateInput = makeInput({
      readiness: makeReadiness({
        milestones: [{ name: "Economic Case", trustState: "inferred" }],
      }),
    });
    const validateConfidence = calculateActivationConfidence("VALIDATE", validateInput);

    assert.ok(validateConfidence < engageConfidence);
  });

  it("can generate reason independently", () => {
    const input = makeInput();

    assert.match(generateActivationReason("ENGAGE", input), /validated/);
  });
});
