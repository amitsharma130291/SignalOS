import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateICPFromPainSignal } from "./icp-generator.ts";
import { buildICPGenerateHandler } from "./icp-api.ts";
import { generateICPForPainSignal, type ICPRepository } from "./icp-service.ts";

describe("generateICPFromPainSignal", () => {
  it("maps Sales Ops pain to ranked revenue operations ICP", () => {
    const icp = generateICPFromPainSignal({
      affectedTeam: "Sales Ops",
      currentSolution: "HubSpot + Salesforce + Spreadsheets",
      solutionGap: "Outdated CRM data and manual verification create forecasting delays.",
      outreachAngle: "Reduce manual reporting handoffs for sales operations teams.",
    });

    assert.deepEqual(icp.target_titles, [
      "RevOps Manager",
      "Sales Operations Lead",
      "VP Revenue Operations",
    ]);
    assert.equal(icp.buyer, "RevOps Manager");
    assert.equal(icp.budget_owner, "VP Revenue");
    assert.equal(icp.trigger_event, "Forecast accuracy concerns");
    assert.equal(icp.industry, "B2B SaaS");
    assert.equal(icp.why_this_buyer, "Owns forecast accuracy and pipeline reporting.");
    assert.ok(icp.icp_confidence >= 90);
    assert.deepEqual(icp.icp_candidates.map((candidate) => candidate.title), icp.target_titles);
    assert.ok(Object.values(icp).every((value) => value !== undefined && value !== null));
  });

  it("maps Customer Success pain", () => {
    const icp = generateICPFromPainSignal({ affectedTeam: "Customer Success" });

    assert.deepEqual(icp.target_titles, [
      "Head of Customer Success",
      "Customer Success Operations Lead",
      "VP Customer Success",
    ]);
    assert.equal(icp.buyer, "Head of Customer Success");
    assert.equal(icp.budget_owner, "VP Customer Success");
    assert.equal(icp.trigger_event, "Renewal visibility problems");
  });

  it("maps Finance Ops pain", () => {
    const icp = generateICPFromPainSignal({ affectedTeam: "Finance Ops" });

    assert.deepEqual(icp.target_titles, ["Director Finance Operations", "Controller", "VP Finance"]);
    assert.equal(icp.buyer, "Director Finance Operations");
    assert.equal(icp.budget_owner, "VP Finance");
  });

  it("maps Support pain", () => {
    const icp = generateICPFromPainSignal({ affectedTeam: "Support" });

    assert.deepEqual(icp.target_titles, [
      "Head of Support",
      "Director of Customer Support",
      "VP Customer Experience",
    ]);
    assert.equal(icp.buyer, "Support Manager");
    assert.equal(icp.trigger_event, "Escalation backlog");
  });

  it("keeps finance ICP separate from support ICP", () => {
    const icp = generateICPFromPainSignal({
      affectedTeam: "Finance Ops",
      pain: "Finance ops manually reconciles Stripe payouts with NetSuite.",
    });

    assert.equal(icp.buyer, "Director Finance Operations");
    assert.equal(icp.budget_owner, "VP Finance");
    assert.equal(icp.target_titles.includes("Head of Support"), false);
    assert.equal(icp.trigger_event.includes("Escalation backlog"), false);
  });

  it("keeps support ICP separate from finance ICP", () => {
    const icp = generateICPFromPainSignal({
      affectedTeam: "Support",
      pain: "Support team manually triages tickets.",
    });

    assert.equal(icp.buyer, "Support Manager");
    assert.equal(icp.budget_owner, "VP Customer Experience");
    assert.equal(icp.target_titles.includes("Controller"), false);
    assert.equal(icp.trigger_event.includes("Month-end"), false);
  });

  it("keeps customer success ICP mapped to CS ownership", () => {
    const icp = generateICPFromPainSignal({
      affectedTeam: "Customer Success",
      pain: "Customer success has onboarding coordination issues.",
    });

    assert.equal(icp.buyer, "Head of Customer Success");
    assert.equal(icp.budget_owner, "VP Customer Success");
    assert.deepEqual(icp.target_titles, [
      "Head of Customer Success",
      "Customer Success Operations Lead",
      "VP Customer Success",
    ]);
  });

  it("maps Recruiting pain to talent operations ICP", () => {
    const icp = generateICPFromPainSignal({
      affectedTeam: "Recruiting",
      currentSolution: "LinkedIn + Greenhouse + Slack",
      solutionGap: "Manual status updates create recruiting coordination bottlenecks.",
    });

    assert.equal(icp.buyer, "Recruiting Operations Lead");
    assert.equal(icp.budget_owner, "VP Talent");
    assert.equal(icp.trigger_event, "Recruiting bottlenecks");
    assert.equal(icp.why_this_buyer, "Owns recruiting operations and hiring process efficiency.");
    assert.ok(icp.ranked_industries.some((industry) => industry.industry === "Technology companies"));
    assert.equal(icp.company_size, "100-1000 employees");
  });

  it("infers enterprise size and ranked finance industries from tool stack", () => {
    const icp = generateICPFromPainSignal({
      affectedTeam: "Finance Ops",
      currentSolution: "Stripe + NetSuite + Spreadsheets",
      solutionGap: "Month-end close delays and reconciliation issues.",
    });

    assert.equal(icp.company_size, "500+ employees");
    assert.ok(icp.company_size_confidence >= 80);
    assert.equal(icp.industry, "SaaS");
    assert.deepEqual(
      icp.ranked_industries.slice(0, 3).map((industry) => industry.industry),
      ["SaaS", "Fintech", "Marketplace"],
    );
    assert.ok(icp.icp_confidence >= 90);
  });

  it("generates quarterly compliance trigger for Operations audit signals", () => {
    const icp = generateICPFromPainSignal({
      affectedTeam: "Operations",
      rawText:
        "Operations managers collect compliance information from six internal systems at the end of every quarter. Reporting preparation requires manual spreadsheet consolidation before audits.",
      currentSolution: "Spreadsheets + Internal systems",
      solutionGap:
        "Manual spreadsheet consolidation across several systems creates compliance reporting delays and audit-prep bottlenecks.",
    });

    assert.equal(icp.buyer, "Operations Manager");
    assert.equal(icp.budget_owner, "COO");
    assert.equal(icp.trigger_event, "Quarterly compliance reporting deadline");
  });

  it("uses fallback logic when fields are missing", () => {
    const icp = generateICPFromPainSignal({});

    assert.deepEqual(icp.target_titles, ["Operations Manager", "Head of Operations", "COO"]);
    assert.equal(icp.industry, "B2B");
    assert.equal(icp.company_size, "50-500 employees");
    assert.equal(icp.buyer, "Operations Manager");
    assert.equal(icp.budget_owner, "COO");
    assert.ok(Object.values(icp).every((value) => value !== undefined && value !== null));
  });
});

describe("ICP generation service and API handler", () => {
  it("generates and persists ICP through the service", async () => {
    let updateCalled = false;
    const repository: ICPRepository = {
      async findPainSignalById() {
        return {
          id: "pain-1",
          affectedTeam: "Sales Ops",
          outreachAngle: "Reduce manual reporting handoffs for sales operations teams.",
        };
      },
      async updatePainSignalICP(_painSignalId, icp) {
        updateCalled = true;
        return {
          id: "pain-1",
          ...icp,
        };
      },
    };

    const result = await generateICPForPainSignal(repository, "pain-1");

    assert.equal(result.generated, true);
    assert.equal(updateCalled, true);
    assert.deepEqual((result.painSignal as Record<string, unknown>).target_titles, [
      "RevOps Manager",
      "Sales Operations Lead",
      "VP Revenue Operations",
    ]);
  });

  it("prevents duplicate generation when ICP already exists", async () => {
    let updateCalled = false;
    const repository: ICPRepository = {
      async findPainSignalById() {
        return {
          id: "pain-1",
          affectedTeam: "Sales Ops",
          targetTitles: ["RevOps Manager"],
          icpGeneratedAt: new Date(),
        };
      },
      async updatePainSignalICP() {
        updateCalled = true;
        return {};
      },
    };

    const result = await generateICPForPainSignal(repository, "pain-1");

    assert.equal(result.generated, false);
    assert.equal(updateCalled, false);
  });

  it("handles POST /api/icp/generate successfully", async () => {
    const repository: ICPRepository = {
      async findPainSignalById() {
        return {
          id: "pain-1",
          affectedTeam: "Support",
        };
      },
      async updatePainSignalICP(_painSignalId, icp) {
        return {
          id: "pain-1",
          ...icp,
        };
      },
    };
    const handler = buildICPGenerateHandler(repository);
    const response = await handler(
      new Request("http://localhost/api/icp/generate", {
        method: "POST",
        body: JSON.stringify({ painSignalId: "pain-1" }),
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.generated, true);
    assert.deepEqual(body.painSignal.target_titles, [
      "Head of Support",
      "Director of Customer Support",
      "VP Customer Experience",
    ]);
  });
});
