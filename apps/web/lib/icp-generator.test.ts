import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateICPFromPainSignal } from "./icp-generator.ts";
import { buildICPGenerateHandler } from "./icp-api.ts";
import { generateICPForPainSignal, type ICPRepository } from "./icp-service.ts";

describe("generateICPFromPainSignal", () => {
  it("maps Sales Ops pain to revenue operations ICP", () => {
    const icp = generateICPFromPainSignal({
      affectedTeam: "Sales Ops",
      outreachAngle: "Reduce manual reporting handoffs for sales operations teams.",
    });

    assert.deepEqual(icp.target_titles, [
      "RevOps Manager",
      "Sales Operations Lead",
      "VP Revenue Operations",
    ]);
    assert.equal(icp.buyer, "Revenue Operations");
    assert.equal(icp.trigger_event, "Rapid sales growth creating reporting bottlenecks");
    assert.equal(icp.industry, "B2B SaaS");
    assert.ok(Object.values(icp).every((value) => value !== undefined && value !== null));
  });

  it("maps Customer Success pain", () => {
    const icp = generateICPFromPainSignal({ affectedTeam: "Customer Success" });

    assert.deepEqual(icp.target_titles, [
      "Head of Customer Success",
      "Customer Success Operations",
      "VP Customer Experience",
    ]);
    assert.equal(icp.buyer, "Customer Success");
    assert.equal(
      icp.trigger_event,
      "Customer growth creating onboarding and retention workflow friction",
    );
  });

  it("maps Finance Ops pain", () => {
    const icp = generateICPFromPainSignal({ affectedTeam: "Finance Ops" });

    assert.deepEqual(icp.target_titles, ["Finance Operations Manager", "Controller", "VP Finance"]);
    assert.equal(icp.buyer, "Finance Operations");
    assert.equal(icp.budget_owner, "VP Finance");
  });

  it("maps Support pain", () => {
    const icp = generateICPFromPainSignal({ affectedTeam: "Support" });

    assert.deepEqual(icp.target_titles, [
      "Support Operations Manager",
      "Head of Support",
      "Customer Support Director",
    ]);
    assert.equal(icp.buyer, "Support Operations");
    assert.equal(icp.trigger_event, "Support volume increasing repetitive operational work");
  });

  it("uses fallback logic when fields are missing", () => {
    const icp = generateICPFromPainSignal({});

    assert.deepEqual(icp.target_titles, ["Operations Manager", "Head of Operations", "COO"]);
    assert.equal(icp.industry, "B2B");
    assert.equal(icp.company_size, "50-500 employees");
    assert.equal(icp.buyer, "Operations");
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
      "Support Operations Manager",
      "Head of Support",
      "Customer Support Director",
    ]);
  });
});
