import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyAffectedTeam } from "./extraction-classifier.ts";
import { mockPainExtractor } from "./mockPainExtractor.ts";

describe("classifyAffectedTeam", () => {
  it("routes finance keywords over incidental support keywords", () => {
    const result = classifyAffectedTeam(
      "Our finance operations team manually reconciles Stripe payouts with NetSuite every week using spreadsheets and Slack updates between accounting and customer support.",
    );

    assert.equal(result.team, "Finance Ops");
    assert.ok(result.confidence >= 0.75);
    assert.ok(result.matchedKeywords.includes("stripe"));
    assert.ok(result.matchedKeywords.includes("netsuite"));
    assert.ok(result.reasoning.some((reason) => reason.includes("outweighed")));
  });

  it("routes sales ops keywords over generic operations keywords", () => {
    const result = classifyAffectedTeam(
      "Sales ops uses manual operations workflows to clean CRM fields and pipeline reports for sales reps.",
    );

    assert.equal(result.team, "Sales Ops");
    assert.ok(result.confidence >= 0.75);
    assert.ok(result.matchedKeywords.includes("crm"));
  });

  it("does not route sales ops signals to generic operations", () => {
    const result = classifyAffectedTeam(
      "Sales teams update CRM reporting and pipeline dashboards manually.",
    );

    assert.equal(result.team, "Sales Ops");
  });

  it("routes support workflows correctly", () => {
    const result = classifyAffectedTeam(
      "The support team manually triages Zendesk tickets from a support queue every morning.",
    );

    assert.equal(result.team, "Support");
    assert.ok(result.confidence >= 0.75);
    assert.ok(result.matchedKeywords.includes("zendesk"));
  });

  it("does not route support signals to finance", () => {
    const result = classifyAffectedTeam(
      "Support teams triage Zendesk tickets from a support queue using spreadsheets.",
    );

    assert.equal(result.team, "Support");
  });

  it("falls back to operations when confidence is too low", () => {
    const result = classifyAffectedTeam("The team has some coordination issues.");

    assert.equal(result.team, "Operations");
    assert.ok(result.confidence < 0.55);
    assert.ok(result.reasoning.length > 0);
  });

  it("stores classification reasoning in mock extraction output", () => {
    const extraction = mockPainExtractor(
      "Finance ops reconciles Stripe payouts and NetSuite records with customer support updates.",
      { operationalScore: 8, b2bScore: 6 },
    );
    const classification = extraction.aiOutput.extractionClassification as {
      team?: string;
      reasoning?: string[];
    };

    assert.equal(extraction.affectedTeam, "Finance Ops");
    assert.equal(classification.team, "Finance Ops");
    assert.ok(Array.isArray(classification.reasoning));
  });
});
