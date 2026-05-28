import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  containsBannedPhrase,
  generateOutboundDraft,
  type MessageDraftInput,
} from "./message-generator.ts";
import { buildMessageGenerateHandler } from "./message-api.ts";
import {
  generateMessageDraftForPainSignal,
  type MessageRepository,
} from "./message-service.ts";

const SALES_OPS_SIGNAL: MessageDraftInput = {
  pain: "Sales reps lose time manually updating CRM fields after customer calls.",
  affectedTeam: "Sales Ops",
  existingWorkaround: "Manual CRM field updates",
  possibleIcp: "Sales Ops and RevOps teams at B2B companies",
  outreachAngle: "Reduce manual CRM updates for sales reps after customer calls.",
  urgency: "high",
  targetTitles: ["RevOps Manager", "Sales Operations Lead"],
  industry: "B2B SaaS",
  triggerEvent: "Rapid sales growth creating reporting bottlenecks",
};

function wordCount(value: string) {
  return value.split(/\s+/).filter(Boolean).length;
}

describe("generateOutboundDraft", () => {
  it("generates subject, body, observation, and question CTA", () => {
    const draft = generateOutboundDraft(SALES_OPS_SIGNAL);

    assert.ok(draft.subject.length > 0);
    assert.ok(draft.body.length > 0);
    assert.ok(draft.structure.observation.length > 0);
    assert.ok(draft.structure.question.endsWith("?"));
    assert.ok(draft.body.includes(draft.structure.question));
  });

  it("keeps body under the word limit and avoids empty text", () => {
    const draft = generateOutboundDraft(SALES_OPS_SIGNAL);

    assert.ok(wordCount(draft.body) <= 120);
    assert.notEqual(draft.body.trim(), "");
  });

  it("handles missing ICP fields gracefully without undefined/null leaks", () => {
    const draft = generateOutboundDraft({
      pain: "Manual reporting follow-up",
    });

    assert.equal(draft.body.includes("undefined"), false);
    assert.equal(draft.body.includes("null"), false);
    assert.ok(draft.subject.length > 0);
  });

  it("produces different messaging for different teams", () => {
    const salesDraft = generateOutboundDraft(SALES_OPS_SIGNAL);
    const supportDraft = generateOutboundDraft({
      pain: "Support team has repetitive ticket triage work.",
      affectedTeam: "Support",
      existingWorkaround: "Manual ticket routing",
      targetTitles: ["Head of Support"],
      industry: "B2B SaaS",
    });

    assert.notEqual(salesDraft.subject, supportDraft.subject);
    assert.notEqual(salesDraft.body, supportDraft.body);
  });

  it("avoids hype, spam phrases, excessive punctuation, and empty body", () => {
    const draft = generateOutboundDraft(SALES_OPS_SIGNAL);
    const combined = `${draft.subject} ${draft.body}`;

    assert.equal(containsBannedPhrase(combined), false);
    assert.equal(/!/.test(combined), false);
    assert.equal(/\?{2,}/.test(combined), false);
    assert.ok(draft.body.trim().length > 0);
  });
});

describe("message generation service and API handler", () => {
  it("saves and returns a generated draft", async () => {
    let savedPainSignalId = "";
    const repository: MessageRepository = {
      async findPainSignalById() {
        return {
          id: "pain-1",
          ...SALES_OPS_SIGNAL,
        };
      },
      async createMessageDraft(painSignalId, draft, generatedAt) {
        savedPainSignalId = painSignalId;
        return {
          id: "message-1",
          status: "draft",
          generatedAt,
          ...draft,
        };
      },
    };

    const result = await generateMessageDraftForPainSignal(repository, "pain-1");

    assert.equal(savedPainSignalId, "pain-1");
    assert.equal(result.draft.status, "draft");
    assert.ok(result.draft.subject.length > 0);
    assert.ok(result.draft.body.length > 0);
  });

  it("rejects invalid painSignalId in the API handler", async () => {
    const repository: MessageRepository = {
      async findPainSignalById() {
        throw new Error("Should not be called");
      },
      async createMessageDraft() {
        throw new Error("Should not be called");
      },
    };
    const handler = buildMessageGenerateHandler(repository);
    const response = await handler(
      new Request("http://localhost/api/messages/generate", {
        method: "POST",
        body: JSON.stringify({ painSignalId: "" }),
      }),
    );

    assert.equal(response.status, 400);
  });

  it("handles POST /api/messages/generate successfully", async () => {
    const repository: MessageRepository = {
      async findPainSignalById() {
        return {
          id: "pain-1",
          ...SALES_OPS_SIGNAL,
        };
      },
      async createMessageDraft(_painSignalId, draft, generatedAt) {
        return {
          id: "message-1",
          status: "draft",
          generatedAt,
          ...draft,
        };
      },
    };
    const handler = buildMessageGenerateHandler(repository);
    const response = await handler(
      new Request("http://localhost/api/messages/generate", {
        method: "POST",
        body: JSON.stringify({ painSignalId: "pain-1" }),
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.draft.status, "draft");
    assert.ok(body.draft.subject.length > 0);
    assert.ok(body.draft.body.length > 0);
  });
});
