import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildQualificationTrust,
  buildTrustedField,
  calculateEvidenceCount,
  calculateTrustState,
  getTrustBadge,
  mergeEvidenceSources,
  type EvidenceSource,
} from "./evidence-trust.ts";

describe("evidence trust primitives", () => {
  it("marks unknown values as missing with no evidence", () => {
    const field = buildTrustedField("Unknown", ["workflow_signal"]);

    assert.equal(field.value, null);
    assert.equal(field.trustState, "missing");
    assert.equal(field.evidenceCount, 0);
    assert.deepEqual(field.evidenceSources, []);
  });

  it("marks single-source deterministic values as inferred", () => {
    const field = buildTrustedField("Controller", ["buyer_mapping"]);

    assert.equal(field.value, "Controller");
    assert.equal(field.trustState, "inferred");
    assert.equal(field.evidenceCount, 1);
  });

  it("marks multi-source values as validated", () => {
    const field = buildTrustedField("CFO", ["buyer_mapping", "icp"]);

    assert.equal(field.trustState, "validated");
    assert.equal(field.evidenceCount, 2);
  });

  it("marks founder confirmation as the highest trust state", () => {
    const field = buildTrustedField("VP Finance", ["buyer_mapping", "founder_confirmation"]);

    assert.equal(field.trustState, "human_confirmed");
    assert.equal(field.evidenceCount, 2);
  });

  it("deduplicates evidence sources before counting", () => {
    const sources: EvidenceSource[] = mergeEvidenceSources(
      ["workflow_signal", "buyer_mapping"],
      ["buyer_mapping", "icp"],
    );

    assert.deepEqual(sources, ["workflow_signal", "buyer_mapping", "icp"]);
    assert.equal(calculateEvidenceCount(sources), 3);
  });

  it("calculates trust state independently from field construction", () => {
    assert.equal(calculateTrustState({ value: null, evidenceSources: [] }), "missing");
    assert.equal(calculateTrustState({ value: "Finance", evidenceSources: ["icp"] }), "inferred");
    assert.equal(
      calculateTrustState({ value: "Finance", evidenceSources: ["icp", "workflow_signal"] }),
      "validated",
    );
    assert.equal(
      calculateTrustState({ value: "Finance", evidenceSources: ["founder_confirmation"] }),
      "human_confirmed",
    );
  });

  it("generates deterministic trust badges", () => {
    assert.equal(getTrustBadge("missing").label, "Missing");
    assert.equal(getTrustBadge("inferred").label, "Inferred");
    assert.equal(getTrustBadge("validated").label, "Validated");
    assert.equal(getTrustBadge("human_confirmed").label, "Human Confirmed");
  });

  it("prevents contradictory placeholder values from being validated", () => {
    const unknownField = buildTrustedField("Unknown", ["workflow_signal", "readiness"]);
    const evidenceNeededField = buildTrustedField("Business impact evidence needed", [
      "workflow_signal",
      "solution_gap",
    ]);
    const inferredField = buildTrustedField("Buyer inferred from ICP", ["icp", "buyer_mapping"]);

    assert.equal(unknownField.trustState, "missing");
    assert.equal(evidenceNeededField.trustState, "missing");
    assert.equal(inferredField.trustState, "inferred");
  });
});

describe("buildQualificationTrust", () => {
  it("builds trust-aware qualification fields from existing outputs", () => {
    const trust = buildQualificationTrust({
      workflow: "Stripe + NetSuite reconciliation",
      businessImpact: "Month-end close delays and reporting risk.",
      painOwner: "Finance Analyst",
      buyer: "Controller",
      budgetOwner: "CFO",
      economicBuyer: "CFO",
      frequency: "daily",
      economicCase: "Manual effort and budget owner are present.",
      targetTitles: ["Controller"],
      humanConfirmedFields: {
        buyer: true,
      },
      evidenceAnalysis: {
        evidenceStrength: "high",
        evidenceScore: 10,
        evidenceReasons: ["explicit workflow", "explicit business impact", "explicit frequency"],
      },
      evidencePack: {
        researchSummary: "",
        evidenceDrivers: { positive: [], negative: [] },
        currentEvidence: { known: [] },
        evidenceCategories: [
          { label: "Workflow Evidence", items: ["daily reconciliation process"] },
          { label: "Business Evidence", items: ["Month-end close delays"] },
        ],
        evidenceGaps: [],
        validationPlan: [],
        validationQuestions: [],
        nextResearchActions: [],
        evidenceUpgradePlan: {
          currentScore: 10,
          targetScore: 10,
          steps: [],
          status: "achieved",
          message: "Evidence target achieved.",
        },
      },
      buyerMapping: {
        user: "Finance Analyst",
        buyer: "Controller",
        champion: "Finance Manager",
        economicOwner: "CFO",
        department: "Finance",
        companySizeFit: ["Mid Market", "Enterprise"],
        buyerClarityScore: 10,
        buyerClarityReasons: [],
        buyingCommittee: ["Finance Analyst", "Controller", "CFO"],
        decisionMap: {
          suffers: "Finance Analyst",
          champion: "Finance Manager",
          buyer: "Controller",
          pays: "CFO",
          economicBuyer: "CFO",
        },
      },
      solutionGapAnalysis: {
        currentSolution: "Stripe + NetSuite",
        failureModes: ["reconciliation mismatches"],
        rootCause: "Data spread across finance systems and spreadsheets.",
        businessImpact: "Month-end close delays and reporting risk.",
        automationPotential: "High",
      },
    });

    assert.equal(trust.workflow.trustState, "validated");
    assert.equal(trust.businessImpact.trustState, "validated");
    assert.equal(trust.painOwner.trustState, "validated");
    assert.equal(trust.buyer.trustState, "human_confirmed");
    assert.equal(trust.frequency.trustState, "validated");
    assert.equal(trust.economicCase.trustState, "validated");
  });

  it("does not validate economic case without budget and cost evidence", () => {
    const trust = buildQualificationTrust({
      businessImpact: "Month-end close delays and reporting risk.",
      economicCase: "Budget and cost evidence needed",
      evidencePack: {
        researchSummary: "",
        evidenceDrivers: { positive: [], negative: [] },
        currentEvidence: { known: [] },
        evidenceCategories: [{ label: "Business Evidence", items: ["Month-end close delays"] }],
        evidenceGaps: [
          {
            label: "Budget owner confirmation",
            whyItMatters: "Need proof that budget owner controls this KPI.",
            evidenceNeeded: "",
          },
          {
            label: "Quantified manual effort",
            whyItMatters: "Need evidence of hours/week or manual effort.",
            evidenceNeeded: "",
          },
        ],
        validationPlan: [],
        validationQuestions: [],
        nextResearchActions: [],
        evidenceUpgradePlan: {
          currentScore: 7,
          targetScore: 8,
          steps: [],
          status: "needs_validation",
          message: "Additional validation required.",
        },
      },
      solutionGapAnalysis: {
        currentSolution: "NetSuite + spreadsheets",
        failureModes: ["reconciliation mismatches"],
        rootCause: "Data spread across finance systems and spreadsheets.",
        businessImpact: "Month-end close delays and reporting risk.",
        automationPotential: "High",
      },
    });

    assert.equal(trust.economicCase.trustState, "missing");
    assert.equal(trust.economicCase.evidenceCount, 0);
  });

  it("keeps economic case inferred when budget exists but cost evidence is missing", () => {
    const trust = buildQualificationTrust({
      budgetOwner: "CFO",
      economicBuyer: "CFO",
      economicCase: "CFO",
      evidencePack: {
        researchSummary: "",
        evidenceDrivers: { positive: [], negative: [] },
        currentEvidence: { known: [] },
        evidenceCategories: [],
        evidenceGaps: [
          {
            label: "Quantified manual effort",
            whyItMatters: "Need evidence of hours/week or manual effort.",
            evidenceNeeded: "",
          },
        ],
        validationPlan: [],
        validationQuestions: [],
        nextResearchActions: [],
        evidenceUpgradePlan: {
          currentScore: 7,
          targetScore: 8,
          steps: [],
          status: "needs_validation",
          message: "Additional validation required.",
        },
      },
    });

    assert.equal(trust.economicCase.trustState, "inferred");
    assert.equal(trust.economicCase.evidenceCount, 0);
  });

  it("preserves missing state for absent qualification fields", () => {
    const trust = buildQualificationTrust({});

    assert.equal(trust.workflow.trustState, "missing");
    assert.equal(trust.buyer.trustState, "missing");
    assert.equal(trust.economicBuyer.trustState, "missing");
    assert.equal(trust.economicCase.evidenceCount, 0);
  });
});
