import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ActivationDecisionResult } from "./activation-decision.ts";
import type { BuyerMapping } from "./buyer-mapping-engine.ts";
import type { QualificationTrustFields, TrustState, TrustedField } from "./evidence-trust.ts";
import {
  calculateOpportunityThesisConfidence,
  generateOpportunityThesis,
  getOpportunityThesisConfidenceLabel,
  type OpportunityThesisInput,
} from "./opportunity-thesis.ts";
import type { OpportunityReadiness } from "./opportunity-readiness.ts";
import type { SolutionGapAnalysis } from "./solution-gap-engine.ts";
import { shapeOpportunity } from "./opportunity-dashboard.ts";

function field(value: string | null, trustState: TrustState): TrustedField<string> {
  return {
    value,
    trustState,
    evidenceSources: trustState === "missing" ? [] : ["workflow_signal", "buyer_mapping"],
    evidenceCount: trustState === "missing" ? 0 : 2,
  };
}

function trust(overrides: Partial<QualificationTrustFields> = {}): QualificationTrustFields {
  return {
    workflow: field("Stripe + NetSuite + Spreadsheets", "validated"),
    businessImpact: field("Month-end close delays and reporting risk.", "validated"),
    painOwner: field("Finance Ops", "validated"),
    buyer: field("Controller", "validated"),
    budgetOwner: field("VP Finance", "validated"),
    economicBuyer: field("CFO", "validated"),
    frequency: field("daily", "validated"),
    economicCase: field("Manual effort creates close-delay and reporting-risk cost.", "validated"),
    ...overrides,
  };
}

function readiness(overrides: Partial<OpportunityReadiness> = {}): OpportunityReadiness {
  const trustedFields = overrides.trustedFields ?? trust();
  const completedMilestones =
    overrides.completedMilestones ??
    Object.values({
      workflow: trustedFields.workflow,
      businessImpact: trustedFields.businessImpact,
      painOwner: trustedFields.painOwner,
      buyer: trustedFields.buyer,
      economicCase: trustedFields.economicCase,
    }).filter((trustedField) =>
      ["validated", "human_confirmed"].includes(trustedField.trustState),
    ).length;

  return {
    stage: "Outreach Ready",
    completedMilestones,
    totalMilestones: 5,
    milestones: [],
    blockers: [],
    trustedFields,
    nextBestAction: "Generate reviewed outreach draft.",
    statusLabel: "Outreach ready",
    buyerPath: {
      painOwner: "Finance Ops",
      evaluator: "Controller",
      budgetOwner: "CFO",
    },
    outreachRecommendation: "Use the validated workflow pain as the outreach angle.",
    ...overrides,
  };
}

function buyerMapping(overrides: Partial<BuyerMapping> = {}): BuyerMapping {
  return {
    user: "Finance Analyst",
    buyer: "Controller",
    champion: "Finance Ops Manager",
    economicOwner: "CFO",
    department: "Finance",
    companySizeFit: ["Mid-market"],
    buyerClarityScore: 9,
    buyerClarityReasons: ["Clear finance buyer"],
    buyingCommittee: ["Finance Analyst", "Controller", "CFO"],
    decisionMap: {
      suffers: "Finance Analyst",
      champion: "Finance Ops Manager",
      buyer: "Controller",
      pays: "VP Finance",
      economicBuyer: "CFO",
    },
    ...overrides,
  };
}

function solutionGap(overrides: Partial<SolutionGapAnalysis> = {}): SolutionGapAnalysis {
  return {
    currentSolution: "Stripe + NetSuite + Spreadsheets",
    failureModes: ["reconciliation mismatches", "exception tracking work"],
    rootCause: "Data spread across finance systems and spreadsheets.",
    businessImpact: "Month-end close delays and reporting risk.",
    automationPotential: "High",
    ...overrides,
  };
}

function activation(
  activationDecision: ActivationDecisionResult["activationDecision"] = "ENGAGE",
  activationConfidence = 0.94,
): ActivationDecisionResult {
  return {
    activationDecision,
    activationReason: "Qualification requirements are complete.",
    activationConfidence,
  };
}

function input(overrides: Partial<OpportunityThesisInput> = {}): OpportunityThesisInput {
  return {
    rawText:
      "Finance analysts reconcile Stripe payouts against NetSuite every day and close reporting slips.",
    pain: "Finance Ops manually reconciles Stripe payouts with NetSuite through spreadsheets.",
    affectedTeam: "Finance Ops",
    frequency: "daily",
    urgency: "high",
    currentSolution: "Stripe + NetSuite + Spreadsheets",
    solutionGap: "Manual reconciliation creates reporting delays and month-end close risk.",
    buyer: "Controller",
    budgetOwner: "VP Finance",
    activationDecision: activation(),
    opportunityReadiness: readiness(),
    buyerMapping: buyerMapping(),
    solutionGapAnalysis: solutionGap(),
    ...overrides,
  };
}

function sentenceCount(value: string) {
  return value.split(/[.!?]\s+/).filter((sentence) => sentence.trim().length > 0).length;
}

describe("generateOpportunityThesis", () => {
  it("produces a complete high-confidence thesis for fully qualified ENGAGE opportunities", () => {
    const thesis = generateOpportunityThesis(input());

    assert.ok(thesis.thesisHeadline.length <= 140);
    assert.match(thesis.thesisHeadline, /Finance teams/);
    assert.match(thesis.thesisHeadline, /month-end close delays/);
    assert.match(thesis.thesisHeadline, /manual reconciliation/);
    assert.match(thesis.problem, /Month-end reconciliation/);
    assert.match(thesis.executiveSummary, /Finance is relying on/);
    assert.equal(thesis.painOwner, "Finance Ops");
    assert.match(thesis.businessImpact, /Month-end close/);
    assert.equal(thesis.buyerPath, "Finance Ops Manager -> Controller -> CFO");
    assert.deepEqual(thesis.buyerPathRoles, [
      { label: "Champion", value: "Finance Ops Manager" },
      { label: "Buyer", value: "Controller" },
      { label: "Economic Buyer", value: "CFO" },
    ]);
    assert.match(thesis.economicCase, /finance teams lose confidence in operating numbers/);
    assert.equal(
      thesis.whyNow,
      "Month-end close delays create recurring reporting pressure every reporting cycle.",
    );
    assert.match(thesis.whyCurrentSolutionFails, /Because finance data is disconnected/);
    assert.ok(thesis.confidence >= 0.85);
    assert.equal(thesis.confidenceLabel, "Very High Confidence");
  });

  it("requires economic validation when economic case is missing", () => {
    const weakReadiness = readiness({
      completedMilestones: 4,
      trustedFields: trust({
        economicCase: field(null, "missing"),
      }),
    });
    const thesis = generateOpportunityThesis(
      input({
        activationDecision: activation("VALIDATE", 0.7),
        opportunityReadiness: weakReadiness,
      }),
    );

    assert.match(thesis.economicCase, /Close delays may create reporting risk/);
    assert.ok(thesis.confidence < 0.85);
    assert.match(thesis.executiveSummary, /Cost justification remains incomplete/);
    assert.doesNotMatch(thesis.executiveSummary, /Additional validation is required before outreach/);
  });

  it("does not overstate urgency for MONITOR when buyer path is missing", () => {
    const weakReadiness = readiness({
      stage: "Discover",
      completedMilestones: 2,
      trustedFields: trust({
        buyer: field(null, "missing"),
      }),
    });
    const thesis = generateOpportunityThesis(
      input({
        frequency: "Unknown",
        urgency: "unknown",
        activationDecision: activation("MONITOR", 0.62),
        opportunityReadiness: weakReadiness,
      }),
    );

    assert.equal(thesis.buyerPath, "Finance Ops Manager");
    assert.deepEqual(thesis.buyerPathRoles, [
      { label: "Champion", value: "Finance Ops Manager" },
      { label: "Buyer", value: "Unknown" },
      { label: "Economic Buyer", value: "Unknown" },
    ]);
    assert.equal(
      thesis.whyNow,
      "Month-end close delays create recurring reporting pressure every reporting cycle.",
    );
  });

  it("mentions spreadsheet coordination for spreadsheet workflows", () => {
    const thesis = generateOpportunityThesis(
      input({
        currentSolution: "Spreadsheets",
        solutionGapAnalysis: solutionGap({
          currentSolution: "Spreadsheets",
          rootCause: "Manual spreadsheet coordination creates reporting lag.",
        }),
      }),
    );

    assert.match(thesis.whyCurrentSolutionFails, /Because finance data is disconnected/);
  });

  it("mentions fragmented systems for multi-system workflows", () => {
    const thesis = generateOpportunityThesis(
      input({
        rawText:
          "Sales Ops reconciles forecast inputs across Salesforce, HubSpot, Airtable, and Slack.",
        pain: "Sales Ops reconciles pipeline changes across multiple systems.",
        currentSolution: "Salesforce + HubSpot + Airtable + Slack",
        solutionGap: "Forecast updates require cross-system manual work.",
        solutionGapAnalysis: solutionGap({
          currentSolution: "Salesforce + HubSpot + Airtable + Slack",
          rootCause: "Forecast data lives across multiple sales systems.",
        }),
      }),
    );

    assert.match(thesis.whyCurrentSolutionFails, /Because revenue operations data is fragmented/);
  });

  it("uses safe fallback copy when evidence is missing", () => {
    const missingReadiness = readiness({
      completedMilestones: 0,
      trustedFields: trust({
        businessImpact: field(null, "missing"),
        painOwner: field(null, "missing"),
        buyer: field(null, "missing"),
        economicCase: field(null, "missing"),
      }),
    });
    const thesis = generateOpportunityThesis(
      input({
        affectedTeam: "Unknown",
        buyer: "Unknown",
        budgetOwner: "Unknown",
        activationDecision: activation("MONITOR", 0.55),
        opportunityReadiness: missingReadiness,
        buyerMapping: buyerMapping({
          user: "Unknown",
          buyer: "Unknown",
          champion: "Unknown",
          economicOwner: "Unknown",
          buyerClarityScore: 0,
          decisionMap: {
            suffers: null,
            champion: null,
            buyer: null,
            pays: null,
            economicBuyer: null,
          },
        }),
      }),
    );

    assert.equal(thesis.painOwner, "Unknown");
    assert.equal(thesis.businessImpact, "Business impact requires validation.");
    assert.equal(thesis.buyerPath, "Buying path requires validation.");
    assert.match(thesis.economicCase, /Economic impact remains speculative/);
  });

  it("calculates higher confidence when more fields are validated", () => {
    const highConfidence = calculateOpportunityThesisConfidence(input());
    const lowConfidence = calculateOpportunityThesisConfidence(
      input({
        activationDecision: activation("MONITOR", 0.55),
        opportunityReadiness: readiness({
          completedMilestones: 1,
          trustedFields: trust({
            businessImpact: field(null, "missing"),
            buyer: field(null, "missing"),
            economicCase: field(null, "missing"),
          }),
        }),
      }),
    );

    assert.ok(highConfidence > lowConfidence);
  });

  it("generates executive summary for partially qualified opportunities", () => {
    const thesis = generateOpportunityThesis(
      input({
        activationDecision: activation("VALIDATE", 0.74),
        opportunityReadiness: readiness({
          completedMilestones: 3,
          trustedFields: trust({
            economicCase: field(null, "missing"),
          }),
        }),
      }),
    );

    assert.match(thesis.executiveSummary, /Cost justification remains incomplete/);
    assert.match(thesis.executiveSummary, /Economic impact/);
    assert.doesNotMatch(thesis.executiveSummary, /Additional validation is required before outreach/);
    assert.doesNotMatch(thesis.executiveSummary, /Champion:|Buyer:|Economic Buyer:/);
  });

  it("generates a 4-6 sentence investment memo narrative", () => {
    const thesis = generateOpportunityThesis(input());

    assert.ok(sentenceCount(thesis.executiveSummary) >= 4);
    assert.ok(sentenceCount(thesis.executiveSummary) <= 6);
    assert.match(thesis.executiveSummary, /is relying on/);
    assert.match(thesis.executiveSummary, /Workflow ownership appears/);
    assert.match(thesis.executiveSummary, /close-cycle risk/);
    assert.doesNotMatch(thesis.executiveSummary, /The likely champion is/);
    assert.doesNotMatch(thesis.executiveSummary, /Problem|Business Impact|Buyer Path|Economic Case/);
  });

  it("splits problem into summary and supporting detail", () => {
    const thesis = generateOpportunityThesis(input());

    assert.equal(
      thesis.problemSummary,
      "Month-end reconciliation is performed manually across Stripe, NetSuite, and Spreadsheets.",
    );
    assert.equal(
      thesis.problemSupportingDetail,
      "Teams spend significant effort cross-checking records and resolving exceptions.",
    );
    assert.doesNotMatch(thesis.problemSummary, /\.\.\.|and$/);
    assert.doesNotMatch(thesis.problemSupportingDetail, /\.\.\.|and$/);
  });

  it("generates conservative executive summary for low-confidence opportunities", () => {
    const thesis = generateOpportunityThesis(
      input({
        activationDecision: activation("MONITOR", 0.45),
        opportunityReadiness: readiness({
          completedMilestones: 0,
          trustedFields: trust({
            businessImpact: field(null, "missing"),
            buyer: field(null, "missing"),
            economicCase: field(null, "missing"),
          }),
        }),
      }),
    );

    assert.match(thesis.executiveSummary, /Cost justification remains incomplete/);
    assert.doesNotMatch(thesis.executiveSummary, /Additional validation is required before outreach/);
  });

  it("deduplicates repeated buyer path roles", () => {
    const thesis = generateOpportunityThesis(
      input({
        buyerMapping: buyerMapping({
          user: "Operations Manager",
          champion: "Operations Manager",
          buyer: "Head of Operations",
          economicOwner: "COO",
          decisionMap: {
            suffers: "Operations Manager",
            champion: "Operations Manager",
            buyer: "Head of Operations",
            pays: "COO",
            economicBuyer: "COO",
          },
        }),
      }),
    );

    assert.equal(
      thesis.buyerPath,
      "Operations Manager -> Head of Operations -> COO",
    );
    assert.deepEqual(thesis.buyerPathRoles, [
      { label: "Champion", value: "Operations Manager" },
      { label: "Buyer", value: "Head of Operations" },
      { label: "Economic Buyer", value: "COO" },
    ]);
  });

  it("renders champion and buyer without economic buyer when economic owner is missing", () => {
    const thesis = generateOpportunityThesis(
      input({
        budgetOwner: "Unknown",
        buyerMapping: buyerMapping({
          champion: "Finance Manager",
          buyer: "Controller",
          economicOwner: "Unknown",
          decisionMap: {
            suffers: "Finance Analyst",
            champion: "Finance Manager",
            buyer: "Controller",
            pays: null,
            economicBuyer: null,
          },
        }),
      }),
    );

    assert.equal(thesis.buyerPath, "Finance Manager -> Controller");
    assert.deepEqual(thesis.buyerPathRoles, [
      { label: "Champion", value: "Finance Manager" },
      { label: "Buyer", value: "Controller" },
      { label: "Economic Buyer", value: "Unknown" },
    ]);
  });

  it("handles single-role buyer path without repeating unknown internals", () => {
    const thesis = generateOpportunityThesis(
      input({
        buyerMapping: buyerMapping({
          user: "Support Manager",
          champion: "Support Manager",
          buyer: "Unknown",
          economicOwner: "Unknown",
          decisionMap: {
            suffers: "Support Manager",
            champion: "Support Manager",
            buyer: null,
            pays: null,
            economicBuyer: null,
          },
        }),
        opportunityReadiness: readiness({
          trustedFields: trust({
            buyer: field(null, "missing"),
          }),
        }),
      }),
    );

    assert.equal(
      thesis.buyerPath,
      "Support Manager",
    );
    assert.deepEqual(thesis.buyerPathRoles, [
      { label: "Champion", value: "Support Manager" },
      { label: "Buyer", value: "Unknown" },
      { label: "Economic Buyer", value: "Unknown" },
    ]);
  });

  it("normalizes long buyer paths into three executive roles", () => {
    const thesis = generateOpportunityThesis(
      input({
        buyerMapping: buyerMapping({
          user: "Finance Analyst",
          champion: "Finance Ops Manager",
          buyer: "Controller",
          economicOwner: "CFO",
          buyingCommittee: ["Finance Analyst", "Finance Ops Manager", "Controller", "VP Finance", "CFO"],
          decisionMap: {
            suffers: "Finance Analyst",
            champion: "Finance Ops Manager",
            buyer: "Controller",
            pays: "VP Finance",
            economicBuyer: "CFO",
          },
        }),
      }),
    );

    assert.equal(thesis.buyerPathRoles.length, 3);
    assert.equal(thesis.buyerPath, "Finance Ops Manager -> Controller -> CFO");
  });

  it("uses frequency-driven why now evidence", () => {
    const thesis = generateOpportunityThesis(
      input({
        rawText: "Support reviews escalations weekly.",
        pain: "Support tracks escalations manually.",
        frequency: "weekly",
        urgency: "medium",
        solutionGap: "Escalation ownership is unclear.",
        solutionGapAnalysis: solutionGap({
          businessImpact: "Escalation follow-up creates operational friction.",
        }),
      }),
    );

    assert.equal(
      thesis.whyNow,
      "Escalation delays negatively impact customer experience and team responsiveness.",
    );
  });

  it("generates concise headline for forecast evidence", () => {
    const thesis = generateOpportunityThesis(
      input({
        rawText:
          "Sales Ops reconciles forecast inputs across Salesforce, HubSpot, Airtable, and Slack.",
        pain: "Sales Ops reconciles pipeline changes across multiple systems.",
        affectedTeam: "Sales Ops",
        currentSolution: "Salesforce + HubSpot + Airtable + Slack",
        solutionGap: "Forecast updates require cross-system manual work.",
        buyerMapping: buyerMapping({
          department: "Sales Ops",
        }),
        opportunityReadiness: readiness({
          trustedFields: trust({
            workflow: field("Salesforce + HubSpot + Airtable + Slack", "validated"),
            businessImpact: field("Forecast inaccuracies and revenue visibility risk.", "validated"),
            painOwner: field("Sales Ops", "validated"),
          }),
        }),
        solutionGapAnalysis: solutionGap({
          businessImpact: "Forecast inaccuracies and revenue visibility risk.",
        }),
      }),
    );

    assert.ok(thesis.thesisHeadline.length <= 140);
    assert.match(thesis.thesisHeadline, /Sales Ops teams/);
    assert.match(thesis.thesisHeadline, /forecast inaccuracies/);
    assert.match(thesis.thesisHeadline, /fragmented workflows/);
  });

  it("formats two-system headlines without broken trailing conjunctions", () => {
    const thesis = generateOpportunityThesis(
      input({
        currentSolution: "NetSuite + Stripe",
        solutionGap: "Manual reconciliation creates month-end close delays.",
      }),
    );

    assert.match(thesis.thesisHeadline, /NetSuite and Stripe/);
    assert.doesNotMatch(thesis.thesisHeadline, /\band\.$/i);
    assert.ok(thesis.thesisHeadline.length <= 140);
  });

  it("formats three-system headlines with complete grammar", () => {
    const thesis = generateOpportunityThesis(input());

    assert.match(thesis.thesisHeadline, /Stripe, NetSuite, and spreadsheets/);
    assert.doesNotMatch(thesis.thesisHeadline, /\band\.$/i);
    assert.ok(thesis.thesisHeadline.length <= 140);
  });

  it("formats four-plus-system headlines without ending in and", () => {
    const thesis = generateOpportunityThesis(
      input({
        rawText:
          "Sales Ops reconciles forecast inputs across Salesforce, HubSpot, Airtable, and Slack.",
        pain: "Sales Ops reconciles forecast inputs across multiple GTM systems.",
        currentSolution: "Salesforce + HubSpot + Airtable + Slack",
        solutionGap: "Forecast updates require cross-system manual work.",
        buyerMapping: buyerMapping({
          department: "Sales Operations",
        }),
        opportunityReadiness: readiness({
          trustedFields: trust({
            workflow: field("Salesforce + HubSpot + Airtable + Slack", "validated"),
            businessImpact: field("Forecast inaccuracies and revenue visibility risk.", "validated"),
            painOwner: field("Sales Operations", "validated"),
          }),
        }),
        solutionGapAnalysis: solutionGap({
          businessImpact: "Forecast inaccuracies and revenue visibility risk.",
        }),
      }),
    );

    assert.match(thesis.thesisHeadline, /Salesforce, HubSpot, Airtable \+ Slack/);
    assert.doesNotMatch(thesis.thesisHeadline, /\band\.$/i);
    assert.ok(thesis.thesisHeadline.length <= 140);
  });

  it("handles missing data in thesis headline gracefully", () => {
    const thesis = generateOpportunityThesis(
      input({
        rawText: null,
        pain: null,
        affectedTeam: "Unknown",
        currentSolution: "Unknown",
        solutionGap: "Unknown",
        buyerMapping: buyerMapping({
          department: "Unknown",
        }),
        opportunityReadiness: readiness({
          completedMilestones: 0,
          trustedFields: trust({
            workflow: field(null, "missing"),
            businessImpact: field(null, "missing"),
            painOwner: field(null, "missing"),
            buyer: field(null, "missing"),
            economicCase: field(null, "missing"),
          }),
        }),
        solutionGapAnalysis: solutionGap({
          currentSolution: "Unknown",
          rootCause: "Unknown",
          businessImpact: "Unknown",
          failureModes: [],
        }),
      }),
    );

    assert.ok(thesis.thesisHeadline.length <= 140);
    assert.match(thesis.thesisHeadline, /Teams are experiencing operational friction/);
  });

  it("uses business-impact-driven why now evidence", () => {
    const thesis = generateOpportunityThesis(
      input({
        rawText: "Operations team is preparing compliance reporting.",
        pain: "Compliance reporting is manually consolidated.",
        solutionGap: "Audit preparation is delayed.",
        frequency: "Unknown",
        urgency: "medium",
        solutionGapAnalysis: solutionGap({
          businessImpact: "Audit preparation pressure.",
          rootCause: "Compliance evidence is coordinated manually.",
          failureModes: ["manual evidence collection"],
        }),
      }),
    );

    assert.equal(thesis.whyNow, "Audit preparation creates recurring compliance pressure.");
  });

  it("differentiates sales ops narrative from generic spreadsheet fallback", () => {
    const thesis = generateOpportunityThesis(
      input({
        rawText:
          "Sales Ops reconciles forecast inputs across Salesforce, HubSpot, Airtable, and Slack.",
        pain: "Forecast inputs are fragmented across multiple GTM systems.",
        affectedTeam: "Sales Operations",
        currentSolution: "Salesforce + HubSpot + Airtable + Slack",
        solutionGap: "Forecast updates require cross-system manual work.",
        buyerMapping: buyerMapping({
          department: "Sales Operations",
        }),
        opportunityReadiness: readiness({
          trustedFields: trust({
            painOwner: field("Revenue Operations", "validated"),
            buyer: field("VP Sales", "validated"),
            budgetOwner: field("CRO", "validated"),
            economicBuyer: field("CRO", "validated"),
            businessImpact: field("Forecast inaccuracies and revenue visibility risk.", "validated"),
            economicCase: field("Forecast confidence is reduced.", "inferred"),
          }),
        }),
        solutionGapAnalysis: solutionGap({
          businessImpact: "Forecast inaccuracies and revenue visibility risk.",
          rootCause: "Forecast inputs are fragmented across GTM systems.",
          failureModes: ["manual forecast reconciliation"],
        }),
      }),
    );

    assert.match(thesis.executiveSummary, /Sales Operations is trying to keep forecast inputs aligned/);
    assert.match(thesis.executiveSummary, /Because revenue operations data is fragmented/);
    assert.doesNotMatch(thesis.executiveSummary, /Manual spreadsheet coordination/);
    assert.match(thesis.economicCase, /planning risk for revenue teams/);
    assert.equal(
      thesis.whyNow,
      "Forecast accuracy directly affects planning and revenue execution.",
    );
  });

  it("differentiates customer success narrative and urgency", () => {
    const thesis = generateOpportunityThesis(
      input({
        rawText:
          "Customer Success reviews customer health across Salesforce, Slack, and Gainsight before renewals.",
        pain: "Renewal risk is hard to identify because customer health data is disconnected.",
        affectedTeam: "Customer Success",
        currentSolution: "Salesforce + Slack + Gainsight",
        solutionGap: "Renewal visibility gaps increase churn risk.",
        buyerMapping: buyerMapping({
          department: "Customer Success",
        }),
        opportunityReadiness: readiness({
          trustedFields: trust({
            painOwner: field("Customer Success Manager", "validated"),
            buyer: field("VP Customer Success", "validated"),
            budgetOwner: field("Chief Customer Officer", "validated"),
            economicBuyer: field("Chief Customer Officer", "validated"),
            businessImpact: field("Renewal visibility gaps increase churn risk.", "validated"),
            economicCase: field("Revenue exposure is likely.", "inferred"),
          }),
        }),
        solutionGapAnalysis: solutionGap({
          businessImpact: "Renewal visibility gaps increase churn risk.",
          rootCause: "Customer health data is spread across several tools.",
          failureModes: ["disconnected customer health data"],
        }),
      }),
    );

    assert.match(thesis.executiveSummary, /Customer Success is trying to understand renewal risk/);
    assert.match(thesis.executiveSummary, /Because customer health data is spread/);
    assert.match(thesis.economicCase, /potential churn exposure/);
    assert.equal(
      thesis.whyNow,
      "Renewal visibility gaps increase churn risk if left unresolved.",
    );
  });

  it("differentiates support narrative and economic case", () => {
    const thesis = generateOpportunityThesis(
      input({
        rawText:
          "Support managers track escalations in Slack and Zendesk, but ownership is unclear.",
        pain: "Escalation ownership is inconsistent and response times are increasing.",
        affectedTeam: "Support",
        currentSolution: "Slack + Zendesk",
        solutionGap: "Escalation follow-up is delayed.",
        buyerMapping: buyerMapping({
          department: "Support",
        }),
        opportunityReadiness: readiness({
          trustedFields: trust({
            painOwner: field("Support Manager", "validated"),
            buyer: field("Head of Support", "validated"),
            budgetOwner: field("VP Support", "validated"),
            economicBuyer: field("VP Support", "validated"),
            businessImpact: field(
              "Escalation delays increase response times and customer experience risk.",
              "validated",
            ),
            economicCase: field("Escalation inefficiency is visible.", "inferred"),
          }),
        }),
        solutionGapAnalysis: solutionGap({
          businessImpact: "Escalation delays increase response times and customer experience risk.",
          rootCause: "Escalation ownership is not consistently tracked.",
          failureModes: ["unclear escalation ownership"],
        }),
      }),
    );

    assert.match(thesis.executiveSummary, /Support Manager appears closest to the escalation workflow/);
    assert.match(thesis.executiveSummary, /Because escalation ownership is not consistently tracked/);
    assert.match(thesis.economicCase, /customer experience and capacity risk/);
    assert.equal(
      thesis.whyNow,
      "Escalation delays negatively impact customer experience and team responsiveness.",
    );
  });

  it("returns why now fallback when timing evidence is missing", () => {
    const thesis = generateOpportunityThesis(
      input({
        rawText: "General workflow issue.",
        pain: "Manual workflow issue.",
        currentSolution: "Unknown",
        solutionGap: "Unknown",
        frequency: "Unknown",
        urgency: "unknown",
        activationDecision: activation("MONITOR", 0.5),
        solutionGapAnalysis: solutionGap({
          businessImpact: "Unknown",
          rootCause: "Unknown",
          failureModes: [],
        }),
      }),
    );

    assert.equal(
      thesis.whyNow,
      "Additional evidence is required before timing can be assessed.",
    );
  });

  it("distinguishes validated, partial, and missing economic cases", () => {
    const validated = generateOpportunityThesis(input());
    const partial = generateOpportunityThesis(
      input({
        opportunityReadiness: readiness({
          trustedFields: trust({
            economicCase: field("Estimated close-delay cost", "inferred"),
          }),
        }),
      }),
    );
    const missing = generateOpportunityThesis(
      input({
        opportunityReadiness: readiness({
          trustedFields: trust({
            budgetOwner: field(null, "missing"),
            economicBuyer: field(null, "missing"),
            economicCase: field(null, "missing"),
          }),
        }),
      }),
    );

    assert.match(validated.economicCase, /finance teams lose confidence in operating numbers/);
    assert.match(partial.economicCase, /close-cycle risk/);
    assert.match(missing.economicCase, /Close delays may create reporting risk/);
  });

  it("uses explicit effort evidence in validated economic case", () => {
    const thesis = generateOpportunityThesis(
      input({
        rawText:
          "Finance spends 10-15 hours per week reconciling Stripe payouts before month-end close.",
        opportunityReadiness: readiness({
          trustedFields: trust({
            economicCase: field("Manual work costs 10-15 hours per week.", "validated"),
          }),
        }),
      }),
    );

    assert.equal(
      thesis.economicCase,
      "Economic impact appears validated. Manual work creates 10-15 hours per week of reporting overhead, which matters because close delays reduce operating visibility; exact cost ownership still needs confirmation.",
    );
  });

  it("aligns economic case language to confidence tiers", () => {
    const high = generateOpportunityThesis(
      input({
        activationDecision: activation("VALIDATE", 0.9),
        opportunityReadiness: readiness({
          trustedFields: trust({
            economicCase: field("Estimated close-delay cost", "inferred"),
          }),
        }),
      }),
    );
    const moderate = generateOpportunityThesis(
      input({
        activationDecision: activation("VALIDATE", 0.7),
        opportunityReadiness: readiness({
          completedMilestones: 4,
          trustedFields: trust({
            economicCase: field("Estimated close-delay cost", "inferred"),
          }),
        }),
      }),
    );
    const low = generateOpportunityThesis(
      input({
        activationDecision: activation("MONITOR", 0.3),
        opportunityReadiness: readiness({
          completedMilestones: 1,
          trustedFields: trust({
            buyer: field(null, "missing"),
            budgetOwner: field(null, "missing"),
            economicBuyer: field(null, "missing"),
            economicCase: field(null, "missing"),
          }),
        }),
      }),
    );

    assert.match(high.economicCase, /^High|^Economic impact appears likely/);
    assert.match(moderate.economicCase, /^Economic impact is emerging/);
    assert.match(low.economicCase, /^Economic impact remains speculative/);
  });

  it("keeps current solution failure distinct from problem framing", () => {
    const thesis = generateOpportunityThesis(input());

    assert.notEqual(thesis.problemSummary, thesis.whyCurrentSolutionFails);
    assert.match(thesis.problemSummary, /performed manually/);
    assert.match(thesis.whyCurrentSolutionFails, /^Because .+, the team cannot .+, resulting in .+\.$/);
  });

  it("generates distinct executive narrative openings by opportunity type", () => {
    const finance = generateOpportunityThesis(input());
    const sales = generateOpportunityThesis(
      input({
        rawText: "Sales Ops tracks forecast changes across Salesforce and HubSpot.",
        pain: "Forecast accuracy is reduced by fragmented sales systems.",
        affectedTeam: "Sales Operations",
        currentSolution: "Salesforce + HubSpot",
        solutionGap: "Forecast updates require manual reconciliation.",
        buyerMapping: buyerMapping({ department: "Sales Operations" }),
        solutionGapAnalysis: solutionGap({
          businessImpact: "Forecast inaccuracies affect revenue planning.",
        }),
      }),
    );
    const cs = generateOpportunityThesis(
      input({
        rawText: "Customer Success reviews customer health before renewals.",
        pain: "Renewal risk is hard to identify early.",
        affectedTeam: "Customer Success",
        currentSolution: "Salesforce + Gainsight",
        solutionGap: "Customer health data is disconnected.",
        buyerMapping: buyerMapping({ department: "Customer Success" }),
        solutionGapAnalysis: solutionGap({
          businessImpact: "Renewal visibility gaps increase churn risk.",
        }),
      }),
    );
    const support = generateOpportunityThesis(
      input({
        rawText: "Support tracks escalations across Slack and Zendesk.",
        pain: "Escalation ownership is unclear.",
        affectedTeam: "Support",
        currentSolution: "Slack + Zendesk",
        solutionGap: "Escalation follow-up is delayed.",
        buyerMapping: buyerMapping({ department: "Support" }),
        opportunityReadiness: readiness({
          trustedFields: trust({
            painOwner: field("Support Manager", "validated"),
          }),
        }),
        solutionGapAnalysis: solutionGap({
          businessImpact: "Escalation delays increase response times.",
        }),
      }),
    );
    const operations = generateOpportunityThesis(
      input({
        rawText: "Operations prepares audit evidence across spreadsheets and email.",
        pain: "Compliance reporting is manually consolidated.",
        affectedTeam: "Operations",
        currentSolution: "Spreadsheets + Email",
        solutionGap: "Audit preparation is delayed.",
        buyerMapping: buyerMapping({ department: "Operations" }),
        solutionGapAnalysis: solutionGap({
          businessImpact: "Audit preparation creates compliance pressure.",
        }),
      }),
    );
    const openings = [
      finance.executiveSummary.split(".")[0],
      sales.executiveSummary.split(".")[0],
      cs.executiveSummary.split(".")[0],
      support.executiveSummary.split(".")[0],
      operations.executiveSummary.split(".")[0],
    ];

    assert.equal(new Set(openings).size, 5);
    for (const opening of openings) {
      assert.doesNotMatch(opening, /owns the pain/);
    }
  });

  it("uses only standardized validation badge labels", () => {
    const complete = generateOpportunityThesis(input());
    const incomplete = generateOpportunityThesis(
      input({
        opportunityReadiness: readiness({
          trustedFields: trust({
            buyer: field(null, "missing"),
            businessImpact: field(null, "missing"),
            economicCase: field(null, "missing"),
          }),
        }),
      }),
    );
    const allowed = new Set([
      "Problem Validated",
      "Buyer Identified",
      "Impact Validated",
      "Economic Impact Validated",
      "Buyer Validation Needed",
      "Economic Validation Needed",
      "Cost Validation Needed",
    ]);

    for (const indicator of [...complete.healthIndicators, ...incomplete.healthIndicators]) {
      assert.ok(allowed.has(indicator.label));
    }
  });

  it("maps confidence labels", () => {
    assert.equal(getOpportunityThesisConfidenceLabel(0.96), "Very High Confidence");
    assert.equal(getOpportunityThesisConfidenceLabel(0.9), "High Confidence");
    assert.equal(getOpportunityThesisConfidenceLabel(0.75), "Moderate Confidence");
    assert.equal(getOpportunityThesisConfidenceLabel(0.69), "Low Confidence");
  });

  it("includes confidence explanation and health indicators", () => {
    const thesis = generateOpportunityThesis(
      input({
        opportunityReadiness: readiness({
          trustedFields: trust({
            economicCase: field(null, "missing"),
          }),
        }),
      }),
    );

    assert.match(thesis.confidenceExplanation, /evidence quality/);
    assert.deepEqual(
      thesis.healthIndicators.map((indicator) => indicator.label),
      [
        "Problem Validated",
        "Buyer Identified",
        "Impact Validated",
        "Economic Validation Needed",
      ],
    );
    assert.deepEqual(
      thesis.healthIndicators.map((indicator) => indicator.status),
      ["validated", "validated", "validated", "warning"],
    );
  });

  it("is included in the opportunity dashboard view model", () => {
    const opportunity = shapeOpportunity({
      id: "pain-1",
      pain: "Finance Ops manually reconciles Stripe payouts with NetSuite through spreadsheets.",
      affectedTeam: "Finance Ops",
      frequency: "daily",
      urgency: "high",
      currentSolution: "Stripe + NetSuite + Spreadsheets",
      solutionGap: "Manual reconciliation creates reporting delays and month-end close risk.",
      buyer: "Controller",
      budgetOwner: "VP Finance",
      rawInput: {
        rawText:
          "Finance analysts reconcile Stripe payouts against NetSuite every day and reporting slips.",
      },
    });

    assert.equal(typeof opportunity.opportunityThesis.problem, "string");
    assert.equal(typeof opportunity.opportunityThesis.problemSummary, "string");
    assert.equal(typeof opportunity.opportunityThesis.problemSupportingDetail, "string");
    assert.equal(typeof opportunity.opportunityThesis.thesisHeadline, "string");
    assert.equal(typeof opportunity.opportunityThesis.executiveSummary, "string");
    assert.equal(typeof opportunity.opportunityThesis.painOwner, "string");
    assert.equal(typeof opportunity.opportunityThesis.businessImpact, "string");
    assert.equal(typeof opportunity.opportunityThesis.buyerPath, "string");
    assert.ok(Array.isArray(opportunity.opportunityThesis.buyerPathRoles));
    assert.equal(typeof opportunity.opportunityThesis.economicCase, "string");
    assert.equal(typeof opportunity.opportunityThesis.whyNow, "string");
    assert.equal(typeof opportunity.opportunityThesis.whyCurrentSolutionFails, "string");
    assert.equal(typeof opportunity.opportunityThesis.confidence, "number");
    assert.equal(typeof opportunity.opportunityThesis.confidenceLabel, "string");
    assert.equal(typeof opportunity.opportunityThesis.confidenceExplanation, "string");
    assert.ok(Array.isArray(opportunity.opportunityThesis.healthIndicators));
  });
});
