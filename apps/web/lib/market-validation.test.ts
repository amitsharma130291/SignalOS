import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateActivationDecision } from "./activation-decision.ts";
import {
  clusterMarketEvidenceThemes,
  extractMarketValidation,
  generateCanonicalPainQueries,
  generateMarketValidation,
  getMarketValidationSignal,
  MockMarketValidationProvider,
  scoreMarketEvidence,
  type MarketValidationSearchResult,
} from "./market-validation.ts";
import { shapeOpportunity } from "./opportunity-dashboard.ts";

const financeInput = {
  rawText:
    "Finance analysts reconcile Stripe payouts against NetSuite every day and close reporting slips.",
  pain: "Finance Ops manually reconciles Stripe payouts with NetSuite through spreadsheets.",
  affectedTeam: "Finance Ops",
  currentSolution: "Stripe + NetSuite + Spreadsheets",
  solutionGap: "Manual reconciliation creates reporting delays and month-end close risk.",
};

const salesOpsInput = {
  rawText: "Sales Ops reconciles forecast inputs across Salesforce, HubSpot, and spreadsheets.",
  pain: "Forecast mismatches require manual CRM cleanup.",
  affectedTeam: "Sales Operations",
  currentSolution: "Salesforce + HubSpot + Spreadsheets",
  solutionGap: "Forecast updates require cross-system manual work.",
};

const customerSuccessInput = {
  rawText: "Customer Success reviews renewal risk across Salesforce, Slack, and spreadsheets.",
  pain: "Renewal visibility gaps make customer health hard to track.",
  affectedTeam: "Customer Success",
  currentSolution: "Salesforce + Slack + Spreadsheets",
  solutionGap: "Customer health context is fragmented before renewals.",
};

const supportInput = {
  rawText: "Support managers track Zendesk escalations in spreadsheets and Slack.",
  pain: "Escalation ownership is unclear and urgent tickets get missed.",
  affectedTeam: "Support",
  currentSolution: "Zendesk + Slack + Spreadsheets",
  solutionGap: "Escalation follow-up is delayed.",
};

const operationsInput = {
  rawText: "Operations prepares audit evidence across spreadsheets and email.",
  pain: "Compliance reporting and evidence collection are manual.",
  affectedTeam: "Operations",
  currentSolution: "Spreadsheets + Email",
  solutionGap: "Audit preparation is delayed by manual evidence collection.",
};

describe("generateCanonicalPainQueries", () => {
  it("generates finance pain queries", () => {
    assert.deepEqual(generateCanonicalPainQueries(financeInput), [
      "stripe netsuite reconciliation spreadsheet",
      "month end close manual reconciliation",
      "finance operations payout reconciliation",
    ]);
  });

  it("generates sales ops pain queries", () => {
    assert.deepEqual(generateCanonicalPainQueries(salesOpsInput), [
      "sales forecast spreadsheet reconciliation",
      "hubspot salesforce forecast mismatch",
      "revops forecast data cleanup",
    ]);
  });

  it("generates customer success pain queries", () => {
    assert.deepEqual(generateCanonicalPainQueries(customerSuccessInput), [
      "renewal spreadsheet salesforce slack",
      "customer success renewal visibility gaps",
      "customer health data spreadsheet",
    ]);
  });

  it("generates support pain queries", () => {
    assert.deepEqual(generateCanonicalPainQueries(supportInput), [
      "zendesk escalation spreadsheet ownership",
      "support escalation ownership unclear",
      "missed escalations support operations",
    ]);
  });

  it("generates operations pain queries", () => {
    assert.deepEqual(generateCanonicalPainQueries(operationsInput), [
      "compliance reporting spreadsheet audit prep",
      "audit evidence collection spreadsheets",
      "manual compliance reporting internal systems",
    ]);
  });

  it("generates fallback generic queries", () => {
    assert.deepEqual(
      generateCanonicalPainQueries({
        pain: "Manual workflow creates operational follow-up gaps.",
        affectedTeam: "Revenue Team",
        currentSolution: "Spreadsheets",
        solutionGap: "Manual status tracking.",
      }),
      [
        "manual workflow spreadsheet tracking",
        "operational follow up gaps internal systems",
        "manual status tracking business operations",
      ],
    );
  });
});

describe("MockMarketValidationProvider", () => {
  it("returns deterministic source-tagged results without network calls", async () => {
    const provider = new MockMarketValidationProvider();
    const queries = generateCanonicalPainQueries(financeInput);
    const first = await provider.searchCommunityEvidence(queries);
    const second = await provider.searchCommunityEvidence(queries);

    assert.deepEqual(first, second);
    assert.ok(first.length >= 5);
    assert.ok(first.every((result) => result.title && result.snippet && result.url));
    assert.ok(first.some((result) => result.source === "reddit"));
    assert.ok(first.some((result) => result.source === "g2"));
    assert.ok(first.every((result) => !result.url.includes("api.")));
  });
});

describe("extractMarketValidation", () => {
  it("extracts pain examples, counts unique complaints, and source breakdown", () => {
    const results: MarketValidationSearchResult[] = [
      {
        title: "Finance close issue",
        snippet: "Finance teams report payout mismatches across Stripe and NetSuite.",
        url: "mock://reddit/finance-1",
        source: "reddit",
      },
      {
        title: "Duplicate close issue",
        snippet: "Finance teams report payout mismatches across Stripe and NetSuite.",
        url: "mock://forum/finance-duplicate",
        source: "forum",
      },
      {
        title: "Close review",
        snippet: "Month-end close is delayed by manual spreadsheet reconciliation.",
        url: "mock://g2/finance-2",
        source: "g2",
      },
    ];

    const validation = extractMarketValidation(results);

    assert.equal(validation.complaintCount, 2);
    assert.deepEqual(validation.sourceBreakdown, {
      reddit: 1,
      g2: 1,
      capterra: 0,
      hackernews: 0,
      forums: 0,
    });
    assert.deepEqual(validation.painExamples, [
      "Finance teams report payout mismatches across Stripe and NetSuite.",
      "Month-end close is delayed by manual spreadsheet reconciliation.",
    ]);
    assert.deepEqual(validation.sourceUrls, ["mock://reddit/finance-1", "mock://g2/finance-2"]);
    assert.deepEqual(validation.evidenceSources, [
      {
        source: "reddit",
        title: "Finance close issue",
        identifier: "finance-1",
        url: "mock://reddit/finance-1",
        excerpt: "Finance teams report payout mismatches across Stripe and NetSuite.",
        confidence: 0.7,
      },
      {
        source: "g2",
        title: "Close review",
        identifier: "finance-2",
        url: "mock://g2/finance-2",
        excerpt: "Month-end close is delayed by manual spreadsheet reconciliation.",
        confidence: 0.9,
      },
    ]);
  });
});

describe("clusterMarketEvidenceThemes", () => {
  it("clusters finance reconciliation themes", () => {
    assert.deepEqual(
      clusterMarketEvidenceThemes([
        "Payout reconciliation mismatches delay reporting.",
        "Spreadsheet reconciliation creates month-end close delays.",
      ]),
      ["Reconciliation mismatch", "Spreadsheet tracking", "Reporting delays"],
    );
  });

  it("clusters sales forecast themes", () => {
    assert.ok(
      clusterMarketEvidenceThemes([
        "Forecast accuracy suffers when CRM cleanup happens in spreadsheets.",
      ]).includes("Forecast accuracy"),
    );
  });

  it("clusters CS renewal themes", () => {
    assert.ok(
      clusterMarketEvidenceThemes([
        "Renewal visibility gaps come from customer health data in spreadsheets.",
      ]).includes("Renewal visibility"),
    );
  });

  it("clusters support escalation themes", () => {
    assert.ok(
      clusterMarketEvidenceThemes([
        "Escalation ownership is unclear when urgent tickets are tracked in spreadsheets.",
      ]).includes("Escalation ownership"),
    );
  });

  it("clusters operations compliance themes", () => {
    assert.ok(
      clusterMarketEvidenceThemes([
        "Audit preparation depends on manual compliance reporting and evidence collection.",
      ]).includes("Audit preparation"),
    );
  });
});

describe("scoreMarketEvidence", () => {
  it("uses weighted source scoring and theme diversity bonus", () => {
    const score = scoreMarketEvidence({
      sourceBreakdown: {
        reddit: 2,
        g2: 2,
        capterra: 1,
        hackernews: 1,
        forums: 2,
      },
      topThemes: ["Spreadsheet tracking", "Reporting delays", "Manual cleanup"],
      complaintCount: 8,
    });

    assert.ok(score >= 80);
  });

  it("keeps weak evidence low", () => {
    const score = scoreMarketEvidence({
      sourceBreakdown: {
        reddit: 1,
        g2: 0,
        capterra: 0,
        hackernews: 0,
        forums: 0,
      },
      topThemes: ["Spreadsheet tracking"],
      complaintCount: 1,
    });

    assert.ok(score < 25);
  });

  it("clamps strong evidence to 100", () => {
    const score = scoreMarketEvidence({
      sourceBreakdown: {
        reddit: 20,
        g2: 20,
        capterra: 20,
        hackernews: 20,
        forums: 20,
      },
      topThemes: ["A", "B", "C", "D"],
      complaintCount: 100,
    });

    assert.equal(score, 100);
  });

  it("maps market signals from evidence scores", () => {
    assert.equal(getMarketValidationSignal(85), "Strong");
    assert.equal(getMarketValidationSignal(70), "Moderate");
    assert.equal(getMarketValidationSignal(69), "Weak");
  });
});

describe("generateMarketValidation", () => {
  it("generates strong deterministic market validation for canonical contexts", () => {
    const finance = generateMarketValidation(financeInput);
    const sales = generateMarketValidation(salesOpsInput);
    const cs = generateMarketValidation(customerSuccessInput);
    const support = generateMarketValidation(supportInput);
    const operations = generateMarketValidation(operationsInput);

    for (const validation of [finance, sales, cs, support, operations]) {
      assert.ok(validation.evidenceScore >= 60);
      assert.ok(validation.complaintCount >= 5);
      assert.ok(validation.topThemes.length >= 2);
      assert.ok(validation.painExamples.length > 0);
      assert.ok(validation.sourceUrls.length > 0);
      assert.ok(validation.evidenceSources.length > 0);
      assert.ok(validation.evidenceSources.every((source) => source.source && source.identifier));
    }

    assert.ok(sales.evidenceScore >= 90 && sales.evidenceScore <= 95);
    assert.ok(finance.evidenceScore >= 80 && finance.evidenceScore <= 90);
    assert.ok(cs.evidenceScore >= 80 && cs.evidenceScore <= 88);
    assert.ok(operations.evidenceScore >= 75 && operations.evidenceScore <= 85);
    assert.ok(support.evidenceScore >= 60 && support.evidenceScore <= 75);
    assert.equal(sales.marketSignal, "Strong");
    assert.equal(finance.marketSignal, "Moderate");
  });
});

describe("market validation dashboard integration", () => {
  it("includes marketValidation in the opportunity dashboard view model", () => {
    const opportunity = shapeOpportunity({
      id: "pain-1",
      pain: financeInput.pain,
      affectedTeam: financeInput.affectedTeam,
      frequency: "daily",
      urgency: "high",
      currentSolution: financeInput.currentSolution,
      solutionGap: financeInput.solutionGap,
      buyer: "Controller",
      budgetOwner: "VP Finance",
      rawInput: {
        rawText: financeInput.rawText,
      },
    });

    assert.equal(typeof opportunity.marketValidation.evidenceScore, "number");
    assert.equal(typeof opportunity.marketValidation.marketSignal, "string");
    assert.equal(typeof opportunity.marketValidation.complaintCount, "number");
    assert.ok(Array.isArray(opportunity.marketValidation.topThemes));
    assert.ok(Array.isArray(opportunity.marketValidation.painExamples));
    assert.ok(Array.isArray(opportunity.marketValidation.sourceUrls));
    assert.ok(Array.isArray(opportunity.marketValidation.evidenceSources));
    assert.deepEqual(Object.keys(opportunity.marketValidation.sourceBreakdown), [
      "reddit",
      "g2",
      "capterra",
      "hackernews",
      "forums",
    ]);
  });

  it("does not change existing activation, thesis, or validation task behavior", () => {
    const opportunity = shapeOpportunity({
      id: "pain-1",
      pain: financeInput.pain,
      affectedTeam: financeInput.affectedTeam,
      frequency: "daily",
      urgency: "high",
      currentSolution: financeInput.currentSolution,
      solutionGap: financeInput.solutionGap,
      buyer: "Controller",
      budgetOwner: "VP Finance",
      rawInput: {
        rawText: financeInput.rawText,
      },
    });
    const activation = generateActivationDecision({
      opportunityReadiness: opportunity.opportunityReadiness,
      opportunityScore: opportunity.opportunityScore,
      founderConvictionRecommendation: opportunity.founderConvictionRecommendation,
    });

    assert.deepEqual(opportunity.activationDecision, activation);
    assert.equal(typeof opportunity.opportunityThesis.executiveSummary, "string");
    assert.ok(Array.isArray(opportunity.validationTasks));
  });
});
