import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateFounderConviction } from "./founder-conviction.ts";

const financeInput = {
  rawText:
    "Finance analysts download Stripe payouts every day and manually reconcile them against NetSuite. Exceptions are tracked in spreadsheets and month-end close is delayed whenever transaction volume increases.",
  pain: "Finance Ops manually reconciles Stripe payouts with NetSuite through spreadsheets.",
  urgency: "high",
  frequency: "daily",
  currentSolution: "Stripe + NetSuite + Spreadsheets",
  solutionGap:
    "Manual reconciliation and cross-checking create mismatches, exception tracking, reporting delays, and month-end close delays.",
  affectedTeam: "Finance Ops",
  monetizationScore: 8,
  buyer: "Director Finance Operations",
  budgetOwner: "VP Finance",
  triggerEvent: "Month-end close delays",
  targetTitles: ["Director Finance Operations", "Controller", "VP Finance"],
  companySize: "500+ employees",
  industry: "SaaS",
};

describe("generateFounderConviction", () => {
  it("scores high conviction finance opportunities", () => {
    const result = generateFounderConviction(financeInput);

    assert.ok(result.score >= 8);
    assert.ok(result.score <= 10);
    assert.equal(result.recommendation, "high");
    assert.ok(result.reasons.includes("Daily workflow"));
    assert.ok(result.reasons.includes("Revenue or budget impact"));
    assert.ok(result.reasons.includes("Multi-system workflow"));
  });

  it("scores high conviction Sales Ops opportunities", () => {
    const result = generateFounderConviction({
      rawText:
        "Revenue managers export HubSpot opportunities into spreadsheets every Monday before forecast calls. Team leads manually verify pipeline numbers because CRM data is often outdated.",
      pain: "Sales Ops teams track CRM reporting updates across HubSpot and spreadsheets.",
      urgency: "medium",
      frequency: "weekly",
      currentSolution: "HubSpot + Spreadsheets",
      solutionGap:
        "Outdated CRM data and manual verification create forecasting delays and reporting accuracy issues.",
      affectedTeam: "Sales Ops",
      monetizationScore: 7,
      buyer: "RevOps Manager",
      budgetOwner: "VP Revenue",
      triggerEvent: "Forecast accuracy concerns",
      targetTitles: ["RevOps Manager", "Sales Operations Lead"],
      industry: "B2B SaaS",
    });

    assert.ok(result.score >= 7.5);
    assert.ok(result.score <= 9);
    assert.equal(result.recommendation, "high");
  });

  it("scores medium conviction Customer Success opportunities", () => {
    const result = generateFounderConviction({
      rawText:
        "Customer Success managers export Salesforce account data into Airtable every Monday before renewal meetings. Teams manually clean customer records and cross-check health scores.",
      pain: "Customer Success teams review account health before renewal meetings.",
      urgency: "medium",
      frequency: "weekly",
      currentSolution: "Salesforce + Airtable",
      solutionGap:
        "Manual cleanup and health-score cross-checking create reporting delays and renewal visibility gaps.",
      affectedTeam: "Customer Success",
      monetizationScore: 5,
      buyer: "Head of Customer Success",
      budgetOwner: "VP Customer Success",
      triggerEvent: "Renewal visibility problems",
      targetTitles: ["Head of Customer Success"],
    });

    assert.ok(result.score >= 5.5);
    assert.ok(result.score <= 7.5);
    assert.equal(result.recommendation, "medium");
  });

  it("scores medium conviction Support opportunities", () => {
    const result = generateFounderConviction({
      rawText:
        "Support agents copy Zendesk tickets into Slack channels throughout the day to coordinate escalations. Team leads maintain escalation spreadsheets because ownership is unclear.",
      pain: "Support teams triage Zendesk tickets and Slack escalation handoffs.",
      urgency: "medium",
      frequency: "daily",
      currentSolution: "Zendesk + Slack + Spreadsheets",
      solutionGap:
        "Unclear ownership and manual escalation tracking create visibility gaps, missed escalations, and response delays.",
      affectedTeam: "Support",
      monetizationScore: 4,
      buyer: "Support Manager",
      budgetOwner: "VP Customer Experience",
      triggerEvent: "Escalation backlog",
      targetTitles: ["Head of Support"],
    });

    assert.ok(result.score >= 5.5);
    assert.ok(result.score <= 7.5);
    assert.equal(result.recommendation, "medium");
  });

  it("scores weak discussion signals low", () => {
    const result = generateFounderConviction({
      rawText: "Support leaders occasionally discuss ticket ownership during monthly meetings.",
      pain: "Support leaders discuss ticket ownership.",
      urgency: "low",
      frequency: "monthly",
      currentSolution: "Unknown",
      solutionGap: "Unknown",
      affectedTeam: "Support",
      monetizationScore: 1,
      filterScore: 0,
      buyer: "Unknown",
      budgetOwner: "Unknown",
      triggerEvent: "Unknown",
      targetTitles: [],
    });

    assert.ok(result.score >= 0);
    assert.ok(result.score <= 3);
    assert.equal(result.recommendation, "low");
    assert.ok(result.risks.includes("Unknown current solution"));
  });

  it("scores quarterly Operations compliance audit signals as medium conviction", () => {
    const result = generateFounderConviction({
      rawText:
        "Operations managers collect compliance information from six internal systems at the end of every quarter. Reporting preparation requires manual spreadsheet consolidation before audits.",
      pain: "Teams coordinate compliance reporting and spreadsheets manually.",
      urgency: "high",
      frequency: "quarterly",
      currentSolution: "Spreadsheets + Internal systems",
      solutionGap:
        "Manual spreadsheet consolidation across several systems creates compliance reporting delays and audit-prep bottlenecks.",
      affectedTeam: "Operations",
      monetizationScore: 9,
      buyer: "Operations Manager",
      budgetOwner: "COO",
      triggerEvent: "Quarterly compliance reporting deadline",
      targetTitles: ["Operations Manager", "Head of Operations", "COO"],
      companySize: "50-500 employees",
      industry: "B2B",
    });

    assert.ok(result.score >= 5.5);
    assert.ok(result.score <= 7.5);
    assert.equal(result.recommendation, "medium");
    assert.equal(result.risks.includes("Single-tool workflow"), false);
  });

  it("scores noise/offsite signals very low", () => {
    const result = generateFounderConviction({
      rawText: "Our company had a team lunch on Friday and everyone discussed future plans.",
      pain: "No meaningful operational pain detected.",
      urgency: "low",
      frequency: "unknown",
      currentSolution: "Unknown",
      solutionGap: "Unknown",
      affectedTeam: "Operations",
      monetizationScore: 1,
      filterScore: 0,
      buyer: "Unknown",
      budgetOwner: "Unknown",
      triggerEvent: "Unknown",
      targetTitles: [],
    });

    assert.ok(result.score >= 0);
    assert.ok(result.score <= 1);
    assert.equal(result.recommendation, "low");
    assert.ok(result.risks.includes("Generic pain wording"));
  });

  it("adds risks for unknown buyer and current solution", () => {
    const result = generateFounderConviction({
      pain: "Teams coordinate reporting manually.",
      urgency: "medium",
      frequency: "weekly",
      currentSolution: "Unknown",
      solutionGap: "Reporting delays",
      buyer: "Unknown",
      budgetOwner: "Unknown",
      triggerEvent: "Revenue reporting issues",
      targetTitles: [],
    });

    assert.ok(result.risks.includes("Unknown current solution"));
    assert.ok(result.risks.includes("Unknown buyer"));
    assert.ok(result.risks.includes("Unknown budget owner"));
  });

  it("boosts multi-tool workflows", () => {
    const singleTool = generateFounderConviction({
      ...financeInput,
      currentSolution: "NetSuite",
    });
    const multiTool = generateFounderConviction(financeInput);

    assert.ok(multiTool.score > singleTool.score);
    assert.ok(multiTool.reasons.includes("Multi-system workflow"));
  });

  it("boosts daily frequency above monthly frequency", () => {
    const daily = generateFounderConviction(financeInput);
    const monthly = generateFounderConviction({
      ...financeInput,
      frequency: "monthly",
    });

    assert.ok(daily.score > monthly.score);
  });

  it("never scores above 10", () => {
    const result = generateFounderConviction({
      ...financeInput,
      validationScore: 100,
      currentSolution: "Stripe + NetSuite + Salesforce + HubSpot + Spreadsheets",
      solutionGap:
        "Manual reconciliation creates delays, bottlenecks, missed deadlines, mismatches, visibility gaps, response delays, reporting delays, close delays, and forecast accuracy issues.",
    });

    assert.equal(result.score <= 10, true);
  });

  it("never scores below 0", () => {
    const result = generateFounderConviction({
      pain: "No meaningful operational pain detected.",
      urgency: "low",
      frequency: "unknown",
      currentSolution: "Unknown",
      solutionGap: "Unknown",
      filterScore: -10,
      monetizationScore: 0,
      buyer: "Unknown",
      budgetOwner: "Unknown",
      triggerEvent: "Unknown",
      targetTitles: [],
    });

    assert.equal(result.score >= 0, true);
  });
});
