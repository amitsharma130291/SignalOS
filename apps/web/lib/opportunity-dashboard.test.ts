import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { matchesOpportunitySearch, shapeOpportunity } from "./opportunity-dashboard.ts";

describe("shapeOpportunity", () => {
  it("handles missing ICP fields gracefully", () => {
    const opportunity = shapeOpportunity({
      id: "pain-1",
      pain: "Manual reporting handoffs",
      status: "new",
      rawInput: {
        rawText: "Manual spreadsheet reporting handoffs",
        status: "accepted",
        metadata: {
          filter: {
            marketType: "b2b",
            confidence: "high",
          },
        },
      },
    });

    assert.equal(opportunity.companySize, "Unknown");
    assert.equal(opportunity.industry, "Unknown");
    assert.deepEqual(opportunity.targetTitles, []);
    assert.equal(opportunity.icpGenerated, false);
    assert.equal(opportunity.latestDraft, null);
    assert.equal(opportunity.rawSignalText, "Manual spreadsheet reporting handoffs");
    assert.equal(opportunity.frequency, "Unknown");
    assert.equal(opportunity.currentSolution, "Unknown");
    assert.equal(opportunity.solutionGap, "Unknown");
    assert.equal(opportunity.founderConviction, null);
    assert.equal(opportunity.interviewCount, 0);
  });

  it("handles missing raw input gracefully", () => {
    const opportunity = shapeOpportunity({
      id: "pain-1",
      pain: "Manual reporting handoffs",
      status: "interesting",
    });

    assert.equal(opportunity.rawSignalText, "Raw input unavailable");
    assert.equal(opportunity.filterStatus, "unknown");
    assert.equal(opportunity.marketType, "unknown");
    assert.equal(opportunity.reviewStatus, "interesting");
  });

  it("does not produce undefined values for missing optional fields", () => {
    const opportunity = shapeOpportunity({
      id: "pain-1",
    });

    assert.equal(
      Object.values(opportunity).some((value) => value === undefined),
      false,
    );
  });

  it("marks human-edited opportunity fields", () => {
    const opportunity = shapeOpportunity({
      id: "pain-1",
      pain: "Generated pain",
      humanPain: "Human pain",
    });

    assert.equal(opportunity.hasHumanEdits, true);
  });

  it("marks human-edited message fields", () => {
    const opportunity = shapeOpportunity({
      id: "pain-1",
      pain: "Generated pain",
      messages: [
        {
          id: "message-1",
          body: "Generated body",
          humanBody: "Human body",
        },
      ],
    });

    assert.equal(opportunity.hasHumanEdits, true);
  });

  it("does not mark generated-only opportunity fields as edited", () => {
    const opportunity = shapeOpportunity({
      id: "pain-1",
      pain: "Generated pain",
      messages: [
        {
          id: "message-1",
          body: "Generated body",
        },
      ],
    });

    assert.equal(opportunity.hasHumanEdits, false);
  });

  it("shapes opportunity discovery fields and interview count", () => {
    const opportunity = shapeOpportunity({
      id: "pain-1",
      frequency: "weekly",
      currentSolution: "spreadsheets",
      solutionGap: "no owner",
      founderConviction: 9,
      _count: {
        interviews: 2,
      },
    });

    assert.equal(opportunity.frequency, "weekly");
    assert.equal(opportunity.currentSolution, "spreadsheets");
    assert.equal(opportunity.solutionGap, "no owner");
    assert.equal(opportunity.founderConviction, 9);
    assert.equal(opportunity.interviewCount, 2);
  });

  it("handles missing frequency and solution gap", () => {
    const opportunity = shapeOpportunity({
      id: "pain-1",
      frequency: null,
      solutionGap: null,
      _count: {
        interviews: 0,
      },
    });

    assert.equal(opportunity.frequency, "Unknown");
    assert.equal(opportunity.solutionGap, "Unknown");
    assert.equal(opportunity.interviewCount, 0);
  });
});

describe("matchesOpportunitySearch", () => {
  const opportunity = shapeOpportunity({
    id: "pain-1",
    pain: "Support teams triage Zendesk tickets manually",
    affectedTeam: "Support",
    currentSolution: "Zendesk + spreadsheets",
    solutionGap: "Manual handoffs create escalation visibility gaps.",
    possibleIcp: "Support operations teams",
    outreachAngle: "Reduce ticket escalation follow-up",
    rawInput: {
      rawText: "Support team uses Zendesk and spreadsheets for escalations.",
    },
  });

  it("matches raw signal text case-insensitively", () => {
    assert.equal(matchesOpportunitySearch(opportunity, "zendesk"), true);
    assert.equal(matchesOpportunitySearch(opportunity, "ZENDESK"), true);
  });

  it("matches shaped opportunity fields", () => {
    assert.equal(matchesOpportunitySearch(opportunity, "support"), true);
    assert.equal(matchesOpportunitySearch(opportunity, "spreadsheets"), true);
    assert.equal(matchesOpportunitySearch(opportunity, "visibility gaps"), true);
    assert.equal(matchesOpportunitySearch(opportunity, "operations teams"), true);
    assert.equal(matchesOpportunitySearch(opportunity, "escalation"), true);
  });

  it("returns all results for blank search", () => {
    assert.equal(matchesOpportunitySearch(opportunity, ""), true);
    assert.equal(matchesOpportunitySearch(opportunity, "   "), true);
  });

  it("rejects non-matching searches", () => {
    assert.equal(matchesOpportunitySearch(opportunity, "Greenhouse"), false);
  });
});
