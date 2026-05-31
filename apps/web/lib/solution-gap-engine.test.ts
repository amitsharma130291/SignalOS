import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateSolutionGapAnalysis } from "./solution-gap-engine.ts";

describe("generateSolutionGapAnalysis", () => {
  it("generates finance reconciliation analysis", () => {
    const analysis = generateSolutionGapAnalysis({
      rawText:
        "Every Friday our finance team exports Stripe payouts into NetSuite and then manually updates a spreadsheet to investigate mismatches. The process takes half a day and month-end close keeps slipping.",
      affectedTeam: "Finance Ops",
      currentSolution: "Stripe + NetSuite + Spreadsheets",
    });

    assert.equal(analysis.currentSolution, "Stripe + NetSuite + Spreadsheets");
    assert.ok(analysis.failureModes.includes("reconciliation mismatches"));
    assert.ok(analysis.failureModes.includes("exception tracking work"));
    assert.equal(analysis.rootCause, "Data spread across finance systems and spreadsheets.");
    assert.equal(analysis.businessImpact, "Month-end close delays and reporting risk.");
    assert.equal(analysis.automationPotential, "High");
  });

  it("generates sales ops forecasting analysis", () => {
    const analysis = generateSolutionGapAnalysis({
      rawText:
        "Sales Operations reviews HubSpot opportunities, Airtable forecasts, Salesforce records, and Slack updates before every leadership forecast meeting. Numbers rarely match and managers manually reconcile the differences.",
      affectedTeam: "Sales Ops",
    });

    assert.ok(analysis.failureModes.includes("forecast inaccuracies"));
    assert.ok(analysis.failureModes.includes("manual reconciliation"));
    assert.equal(analysis.rootCause, "Forecast data lives across multiple sales systems.");
    assert.equal(analysis.automationPotential, "High");
  });

  it("generates customer success renewal analysis", () => {
    const analysis = generateSolutionGapAnalysis({
      rawText:
        "Our customer success managers keep a renewal spreadsheet because Salesforce doesn't capture all of the context they need. Before renewal meetings they spend hours cross-checking notes from Slack and customer calls.",
      affectedTeam: "Customer Success",
    });

    assert.ok(analysis.failureModes.includes("renewal visibility gaps"));
    assert.ok(analysis.failureModes.includes("manual record cleanup"));
    assert.equal(analysis.rootCause, "Customer information is fragmented across tools.");
    assert.equal(analysis.automationPotential, "Medium");
  });

  it("generates recruiting workflow analysis", () => {
    const analysis = generateSolutionGapAnalysis({
      rawText:
        "Recruiters move candidate information from LinkedIn into Greenhouse several times per day. Interview feedback arrives through Slack and email, forcing coordinators to manually update candidate status.",
      affectedTeam: "Recruiting",
    });

    assert.ok(analysis.failureModes.includes("candidate status drift"));
    assert.ok(analysis.failureModes.includes("interview feedback bottlenecks"));
    assert.equal(analysis.rootCause, "Candidate workflow spans disconnected recruiting systems.");
    assert.equal(analysis.automationPotential, "Medium");
  });

  it("generates support escalation analysis", () => {
    const analysis = generateSolutionGapAnalysis({
      rawText:
        "Support managers maintain a spreadsheet of critical Zendesk escalations because ownership isn't clear once engineering gets involved. Urgent issues are occasionally missed.",
      affectedTeam: "Support",
    });

    assert.ok(analysis.failureModes.includes("ownership ambiguity"));
    assert.ok(analysis.failureModes.includes("missed escalations"));
    assert.equal(analysis.rootCause, "Escalation ownership is not tracked in a single system.");
    assert.equal(analysis.automationPotential, "Medium");
  });

  it("generates operations compliance analysis", () => {
    const analysis = generateSolutionGapAnalysis({
      rawText:
        "Operations managers collect compliance information from six internal systems at the end of every quarter. Reporting preparation requires manual spreadsheet consolidation before audits.",
      affectedTeam: "Operations",
    });

    assert.ok(analysis.failureModes.includes("spreadsheet consolidation work"));
    assert.ok(analysis.failureModes.includes("audit preparation bottlenecks"));
    assert.equal(
      analysis.rootCause,
      "Compliance reporting requires manual consolidation across systems.",
    );
    assert.equal(analysis.businessImpact, "Audit preparation delays and reporting inefficiency.");
    assert.equal(analysis.automationPotential, "High");
  });

  it("returns low automation potential for noise", () => {
    const analysis = generateSolutionGapAnalysis({
      rawText: "Our company had a team lunch on Friday and everyone discussed future plans.",
      affectedTeam: "Operations",
      currentSolution: "Unknown",
      solutionGap: "Unknown",
    });

    assert.equal(analysis.currentSolution, "Unknown");
    assert.deepEqual(analysis.failureModes, []);
    assert.equal(analysis.automationPotential, "Low");
  });
});
