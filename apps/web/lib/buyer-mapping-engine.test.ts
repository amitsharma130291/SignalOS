import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateBuyerMapping } from "./buyer-mapping-engine.ts";

describe("generateBuyerMapping", () => {
  it("maps finance reconciliation to a clear buyer ecosystem", () => {
    const mapping = generateBuyerMapping({
      narrative:
        "Finance analysts export Stripe payouts into NetSuite every week and manually reconcile mismatches in spreadsheets.",
      pain: "Finance reconciliation slows month-end close.",
      affectedTeam: "Finance Ops",
      currentSolution: "Stripe + NetSuite + Spreadsheets",
      solutionGap: "Manual reconciliation creates month-end close delays.",
      businessImpact: "Month-end close delays and reporting delays.",
    });

    assert.equal(mapping.user, "Finance Analyst");
    assert.equal(mapping.buyer, "Controller");
    assert.equal(mapping.economicOwner, "CFO");
    assert.equal(mapping.department, "Finance");
    assert.deepEqual(mapping.buyingCommittee, [
      "Finance Analyst",
      "Finance Manager",
      "Controller",
      "CFO",
    ]);
    assert.deepEqual(mapping.decisionMap, {
      suffers: "Finance Analyst",
      champion: "Finance Manager",
      buyer: "Controller",
      pays: "CFO",
      economicBuyer: "CFO",
    });
    assert.ok(mapping.buyerClarityScore >= 8);
    assert.ok(mapping.buyerClarityReasons.includes("Clear user"));
    assert.ok(mapping.buyerClarityReasons.includes("Clear budget owner"));
  });

  it("maps operations reporting with partial economic-owner clarity", () => {
    const mapping = generateBuyerMapping({
      narrative:
        "Operations managers collect compliance information from six internal systems every quarter.",
      pain: "Operations reporting requires manual consolidation.",
      affectedTeam: "Operations",
      currentSolution: "Spreadsheets + Internal systems",
      solutionGap: "Manual spreadsheet consolidation creates audit preparation bottlenecks.",
      businessImpact: "Compliance reporting delays are partially inferred from audit preparation.",
    });

    assert.equal(mapping.user, "Operations Manager");
    assert.equal(mapping.buyer, "Head of Operations");
    assert.equal(mapping.economicOwner, "COO");
    assert.deepEqual(mapping.buyingCommittee, [
      "Operations Manager",
      "Head of Operations",
      "COO",
    ]);
    assert.deepEqual(mapping.decisionMap, {
      suffers: "Operations Manager",
      champion: "Operations Manager",
      buyer: "Head of Operations",
      pays: "COO",
      economicBuyer: "COO",
    });
  });

  it("keeps support triage buyer and economic owner uncertain", () => {
    const mapping = generateBuyerMapping({
      narrative:
        "Support managers maintain a spreadsheet of Zendesk escalations because ownership is unclear.",
      pain: "Support ticket triage has manual escalation tracking.",
      affectedTeam: "Support",
      currentSolution: "Zendesk + Spreadsheets",
      solutionGap: "Ownership may be unclear.",
      businessImpact: "Impact is weaker and not tied to budget ownership.",
    });

    assert.equal(mapping.user, "Support Manager");
    assert.equal(mapping.buyer, "Unknown");
    assert.equal(mapping.economicOwner, "Unknown");
    assert.deepEqual(mapping.buyingCommittee, ["Support Manager", "Support Lead"]);
    assert.deepEqual(mapping.decisionMap, {
      suffers: "Support Manager",
      champion: "Support Lead",
      buyer: "Unknown",
      pays: "Unknown",
      economicBuyer: "Unknown",
    });
    assert.ok(mapping.buyerClarityScore <= 5);
    assert.ok(mapping.buyerClarityReasons.includes("Buyer uncertain"));
    assert.ok(mapping.buyerClarityReasons.includes("Economic owner uncertain"));
  });

  it("maps customer success handoffs to a champion and moderate buyer clarity", () => {
    const mapping = generateBuyerMapping({
      narrative:
        "Customer success managers cross-check Salesforce notes and Slack threads before renewal handoffs.",
      pain: "Customer success handoffs create renewal visibility gaps.",
      affectedTeam: "Customer Success",
      currentSolution: "Salesforce + Slack + Spreadsheets",
      solutionGap: "Manual handoffs create renewal visibility gaps and record cleanup.",
      businessImpact: "Renewal risk is partly inferred.",
    });

    assert.equal(mapping.champion, "Customer Success Ops Manager");
    assert.equal(mapping.buyer, "Head of Customer Success");
    assert.equal(mapping.economicOwner, "Unknown");
    assert.deepEqual(mapping.buyingCommittee, [
      "Customer Success Manager",
      "Customer Success Ops Manager",
      "Head of Customer Success",
    ]);
    assert.deepEqual(mapping.decisionMap, {
      suffers: "Customer Success Manager",
      champion: "Customer Success Ops Manager",
      buyer: "Head of Customer Success",
      pays: "Unknown",
      economicBuyer: "Unknown",
    });
    assert.ok(mapping.buyerClarityScore >= 6);
    assert.ok(mapping.buyerClarityScore <= 8);
  });

  it("maps sales operations decision roles without hallucinating an executive", () => {
    const mapping = generateBuyerMapping({
      narrative:
        "Sales Operations managers reconcile Salesforce records, HubSpot opportunities, and Airtable forecasts before forecast meetings.",
      pain: "Sales Ops forecast numbers do not match across systems.",
      affectedTeam: "Sales Ops",
      currentSolution: "Salesforce + HubSpot + Airtable",
      solutionGap: "Manual forecast reconciliation creates inconsistent reporting.",
      businessImpact: "Forecast inaccuracies are visible in meetings.",
    });

    assert.deepEqual(mapping.decisionMap, {
      suffers: "Sales Operations Manager",
      champion: "Sales Operations Lead",
      buyer: "RevOps Manager",
      pays: "Unknown",
      economicBuyer: "Unknown",
    });
  });

  it("dedupes committee roles, filters unknowns, and caps at five members", () => {
    const mapping = generateBuyerMapping({
      narrative:
        "Operations managers manage compliance reporting, audit preparation, manual workflow ownership, and internal systems.",
      affectedTeam: "Operations",
      currentSolution: "Internal systems + Spreadsheets",
      solutionGap: "Compliance reporting requires manual audit preparation.",
      businessImpact: "Audit preparation bottlenecks.",
    });

    assert.equal(new Set(mapping.buyingCommittee).size, mapping.buyingCommittee.length);
    assert.equal(mapping.buyingCommittee.includes("Unknown"), false);
    assert.ok(mapping.buyingCommittee.length <= 5);
  });
});
