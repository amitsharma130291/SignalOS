import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BANNED_GENERIC_PHRASES,
  containsGenericPainPhrase,
  generatePainSummary,
} from "./pain-summary-generator.ts";
import { generateOutreachAngle } from "./outreach-angle-generator.ts";

describe("generatePainSummary", () => {
  it("includes Stripe and NetSuite for finance reconciliation", () => {
    const summary = generatePainSummary({
      rawText:
        "Our finance operations team manually reconciles Stripe payouts with NetSuite every week using spreadsheets.",
      affectedTeam: "Finance Ops",
      existingWorkaround: "Manual spreadsheets",
    });

    assert.equal(summary.includes("Stripe"), true);
    assert.equal(summary.includes("NetSuite"), true);
    assert.equal(summary.includes("reconciles"), true);
    assert.ok(summary.length <= 160);
  });

  it("preserves Stripe, NetSuite, and spreadsheet nouns in the finance coordinator template", () => {
    const summary = generatePainSummary({
      rawText:
        "Finance coordinators reconcile Stripe payouts with NetSuite every Friday using spreadsheets.",
      affectedTeam: "Finance Ops",
      existingWorkaround: "Manual spreadsheets",
    });

    assert.equal(
      summary,
      "Finance coordinators reconcile Stripe payouts with NetSuite manually through spreadsheets.",
    );
  });

  it("keeps recruiting scheduling specific instead of generic Operations", () => {
    const summary = generatePainSummary({
      rawText: "Recruiting coordinators manually track interview scheduling across spreadsheets and Slack.",
      affectedTeam: "Operations",
      existingWorkaround: "Manual spreadsheets",
    });

    assert.equal(summary.includes("Recruiting coordinators"), true);
    assert.equal(summary.includes("interview scheduling"), true);
    assert.equal(containsGenericPainPhrase(summary), false);
  });

  it("mentions onboarding and handoffs for customer success", () => {
    const summary = generatePainSummary({
      rawText: "Customer onboarding relies on repetitive spreadsheet tracking and Slack handoffs.",
      affectedTeam: "Customer Success",
      existingWorkaround: "Manual spreadsheets",
    });

    assert.equal(summary.includes("onboarding"), true);
    assert.equal(summary.includes("handoffs"), true);
    assert.equal(summary.includes("Slack"), true);
  });

  it("preserves CRM reporting workflow nouns", () => {
    const summary = generatePainSummary({
      rawText: "Sales ops manually updates CRM reporting dashboards every week.",
      affectedTeam: "Sales Ops",
      existingWorkaround: "Manual CRM field updates",
    });

    assert.equal(summary.includes("CRM"), true);
    assert.equal(summary.includes("reporting"), true);
  });

  it("preserves procurement approval workflow nouns", () => {
    const summary = generatePainSummary({
      rawText: "Teams coordinate procurement approvals manually across spreadsheets and Slack.",
      affectedTeam: "Operations",
      existingWorkaround: "Manual spreadsheets",
    });

    assert.equal(summary.includes("procurement approvals"), true);
    assert.equal(summary.includes("Slack"), true);
  });

  it("does not use banned generic phrases", () => {
    const summary = generatePainSummary({
      rawText: "Teams coordinate approvals manually.",
      affectedTeam: "Operations",
      existingWorkaround: "Manual operational workaround",
    });

    assert.equal(containsGenericPainPhrase(summary), false);
  });

  it("never emits banned generic phrases across common patterns", () => {
    const summaries = [
      generatePainSummary({
        rawText: "Support team has Zendesk tickets in a support queue.",
        affectedTeam: "Support",
        existingWorkaround: "Manual operational workaround",
      }),
      generatePainSummary({
        rawText: "Teams coordinate approvals manually.",
        affectedTeam: "Operations",
        existingWorkaround: "Manual operational workaround",
      }),
    ];

    for (const summary of summaries) {
      for (const phrase of BANNED_GENERIC_PHRASES) {
        assert.equal(summary.toLowerCase().includes(phrase), false);
      }
    }
  });
});

describe("generateOutreachAngle", () => {
  it("mentions reconciliation for finance", () => {
    const angle = generateOutreachAngle({
      rawText: "Finance ops reconciles Stripe payouts with NetSuite and spreadsheets.",
      affectedTeam: "Finance Ops",
      existingWorkaround: "Manual spreadsheets",
    });

    assert.equal(angle.includes("reconciliation"), true);
    assert.equal(angle.includes("Stripe"), true);
  });

  it("mentions CRM reporting for sales ops", () => {
    const angle = generateOutreachAngle({
      rawText: "Sales ops cleans CRM reporting in spreadsheets.",
      affectedTeam: "Sales Ops",
      existingWorkaround: "Manual spreadsheets and CRM workflows",
    });

    assert.equal(angle.includes("CRM reporting"), true);
  });

  it("mentions onboarding for customer success", () => {
    const angle = generateOutreachAngle({
      rawText: "Customer onboarding relies on Slack handoffs.",
      affectedTeam: "Customer Success",
      existingWorkaround: "Manual handoffs",
    });

    assert.equal(angle.includes("onboarding"), true);
  });

  it("preserves tools and workflow nouns where present", () => {
    const angle = generateOutreachAngle({
      rawText: "Recruiting coordinators manually track interview scheduling across spreadsheets and Slack.",
      affectedTeam: "Operations",
      existingWorkaround: "Manual spreadsheets",
    });

    assert.equal(angle.includes("interview scheduling"), true);
    assert.equal(angle.includes("Slack"), true);
  });

  it("keeps fallback text specific for low-confidence signals", () => {
    const angle = generateOutreachAngle({
      rawText: "Teams coordinate approval dashboards manually in Airtable.",
      affectedTeam: "Operations",
      existingWorkaround: "Manual processes",
    });

    assert.equal(angle.includes("approval"), true);
    assert.equal(angle.includes("Airtable"), true);
  });

  it("avoids generic operational work phrasing", () => {
    const angle = generateOutreachAngle({
      rawText: "Teams coordinate approvals manually.",
      affectedTeam: "Operations",
      existingWorkaround: "Manual operational workaround",
    });

    assert.equal(angle.toLowerCase().includes("operational work"), false);
    assert.equal(angle.toLowerCase().includes("improve operational workflows"), false);
    for (const phrase of BANNED_GENERIC_PHRASES) {
      assert.equal(angle.toLowerCase().includes(phrase), false);
    }
  });
});
