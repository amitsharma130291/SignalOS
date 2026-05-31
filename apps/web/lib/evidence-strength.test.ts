import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateEvidenceStrength, getEvidenceScoreModifier } from "./evidence-strength.ts";

describe("generateEvidenceStrength", () => {
  it("classifies finance reconciliation as high evidence", () => {
    const evidence = generateEvidenceStrength({
      title: "Finance reconciliation",
      summary:
        "Every Friday finance exports Stripe payouts into NetSuite and spreadsheets. Month-end close keeps slipping.",
      current_solution: "Stripe + NetSuite + Spreadsheets",
      solution_gap:
        "Manual reconciliation creates mismatches, exception tracking work, and month-end close delays.",
      frequency: "weekly",
      urgency: "high",
      affected_team: "Finance Ops",
    });

    assert.equal(evidence.evidenceStrength, "high");
    assert.ok(evidence.evidenceScore >= 8);
    assert.ok(evidence.evidenceScore <= 10);
    assert.ok(evidence.evidenceReasons.includes("explicit frequency"));
    assert.ok(evidence.evidenceReasons.includes("explicit business impact"));
  });

  it("classifies operations compliance as medium because impact is inferred", () => {
    const evidence = generateEvidenceStrength({
      title: "Operations compliance",
      summary:
        "Operations managers collect compliance information from six internal systems every quarter.",
      current_solution: "Spreadsheets + Internal systems",
      solution_gap:
        "Manual spreadsheet consolidation creates compliance reporting delays and audit-prep bottlenecks.",
      frequency: "quarterly",
      urgency: "high",
      affected_team: "Operations",
    });

    assert.equal(evidence.evidenceStrength, "medium");
    assert.ok(evidence.evidenceScore >= 5);
    assert.ok(evidence.evidenceScore <= 7);
    assert.ok(evidence.evidenceReasons.includes("business impact partially inferred"));
  });

  it("classifies sales ops as medium evidence with a mid-range score", () => {
    const evidence = generateEvidenceStrength({
      title: "Sales Ops forecasting",
      summary:
        "Sales Operations reviews HubSpot opportunities, Airtable forecasts, Salesforce records, and Slack updates before every leadership forecast meeting. Numbers rarely match and managers manually reconcile the differences.",
      current_solution: "Salesforce + HubSpot + Airtable + Slack",
      solution_gap: "Forecast inaccuracies, manual reconciliation, and inconsistent reporting.",
      frequency: "unknown",
      urgency: "medium",
      affected_team: "Sales Ops",
    });

    assert.equal(evidence.evidenceStrength, "medium");
    assert.ok(evidence.evidenceScore >= 5);
    assert.ok(evidence.evidenceScore <= 8);
  });

  it("classifies customer success renewal workflow as medium evidence", () => {
    const evidence = generateEvidenceStrength({
      title: "Customer Success renewals",
      summary: "Customer success keeps a renewal spreadsheet and cross-checks Salesforce notes.",
      current_solution: "Salesforce + Slack + Spreadsheets",
      solution_gap: "Renewal visibility gaps and manual record cleanup.",
      frequency: "weekly",
      urgency: "medium",
      affected_team: "Customer Success",
    });

    assert.equal(evidence.evidenceStrength, "medium");
    assert.ok(evidence.evidenceScore >= 5);
    assert.ok(evidence.evidenceScore <= 7);
  });

  it("classifies support escalation spreadsheet as low evidence", () => {
    const evidence = generateEvidenceStrength({
      title: "Support escalation spreadsheet",
      summary: "Support managers maintain a spreadsheet of Zendesk escalations.",
      current_solution: "Zendesk + Spreadsheets",
      solution_gap: "Ownership may be unclear.",
      frequency: "unknown",
      urgency: "low",
      affected_team: "Support",
    });

    assert.equal(evidence.evidenceStrength, "low");
    assert.ok(evidence.evidenceScore >= 0);
    assert.ok(evidence.evidenceScore <= 4);
  });

  it("maps evidence strength to score modifiers", () => {
    assert.equal(getEvidenceScoreModifier("high"), 5);
    assert.equal(getEvidenceScoreModifier("medium"), 0);
    assert.equal(getEvidenceScoreModifier("low"), -5);
  });

  it("keeps evidence score clamped between 0 and 10", () => {
    const high = generateEvidenceStrength({
      title: "Finance reconciliation",
      summary:
        "Daily finance workflow exports Stripe payouts into NetSuite and spreadsheets; month-end close delays, reporting delays, and revenue loss are explicit.",
      current_solution: "Stripe + NetSuite + Salesforce + HubSpot + Spreadsheets",
      solution_gap:
        "Month-end close delays, reporting delays, forecast inaccuracies, missed escalations, and revenue loss.",
      frequency: "daily",
      urgency: "high",
      affected_team: "Finance Ops",
    });
    const low = generateEvidenceStrength({
      title: "Noise",
      summary: "Team lunch and future plans.",
      current_solution: "Unknown",
      solution_gap: "Unknown",
      frequency: "unknown",
      urgency: "low",
      affected_team: "Unknown",
    });

    assert.equal(high.evidenceScore <= 10, true);
    assert.equal(low.evidenceScore >= 0, true);
  });

  it("unknown frequency lowers evidence score", () => {
    const withFrequency = generateEvidenceStrength({
      title: "Finance reconciliation",
      summary: "Finance exports Stripe payouts into NetSuite; month-end close delays are explicit.",
      current_solution: "Stripe + NetSuite + Spreadsheets",
      solution_gap: "Month-end close delays.",
      frequency: "weekly",
      affected_team: "Finance Ops",
    });
    const withoutFrequency = generateEvidenceStrength({
      title: "Finance reconciliation",
      summary: "Finance exports Stripe payouts into NetSuite; month-end close delays are explicit.",
      current_solution: "Stripe + NetSuite + Spreadsheets",
      solution_gap: "Month-end close delays.",
      frequency: "unknown",
      affected_team: "Finance Ops",
    });

    assert.ok(withFrequency.evidenceScore > withoutFrequency.evidenceScore);
  });

  it("explicit business impact raises evidence score", () => {
    const explicit = generateEvidenceStrength({
      title: "Finance reconciliation",
      summary: "Finance exports Stripe payouts into NetSuite; month-end close delays are explicit.",
      current_solution: "Stripe + NetSuite + Spreadsheets",
      solution_gap: "Month-end close delays.",
      frequency: "weekly",
      affected_team: "Finance Ops",
    });
    const inferred = generateEvidenceStrength({
      title: "Finance reconciliation",
      summary: "Finance exports Stripe payouts into NetSuite and might reduce visibility.",
      current_solution: "Stripe + NetSuite + Spreadsheets",
      solution_gap: "Might reduce visibility.",
      frequency: "weekly",
      affected_team: "Finance Ops",
    });

    assert.ok(explicit.evidenceScore > inferred.evidenceScore);
  });
});
