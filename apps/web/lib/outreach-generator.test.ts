import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BANNED_OUTREACH_PHRASES,
  cleanGeneratedCopy,
  evaluateOutreachQuality,
  extractWorkflowContext,
  generateOutreachDraft,
  type OutreachDraftInput,
} from "./outreach-generator.ts";

const financeSignal: OutreachDraftInput = {
  rawText:
    "Our finance operations team manually reconciles Stripe payouts with NetSuite every week using spreadsheets and Slack updates between accounting and customer support.",
  pain: "Finance Ops reconciles Stripe and NetSuite by hand before monthly reporting.",
  affectedTeam: "Finance Ops",
  urgency: "high",
  existingWorkaround: "spreadsheets and manual checks",
  monetizationScore: 5,
  outreachAngleRefined: "Stripe and NetSuite reconciliation before monthly reporting",
  targetTitles: ["VP Finance", "Controller"],
  triggerEvent: "monthly close volume increases",
};

describe("generateOutreachDraft", () => {
  function getAllGeneratedCopy(draft: ReturnType<typeof generateOutreachDraft>) {
    return [
      ...draft.email_subjects,
      draft.hook,
      draft.problem,
      draft.angle,
      draft.cta,
      draft.cold_email,
      draft.linkedin_message,
      draft.variants.consultative,
      draft.variants.direct,
      draft.variants.executive,
    ].join(" ");
  }

  it("extracts workflow context from raw signal text", () => {
    const context = extractWorkflowContext(financeSignal.rawText);

    assert.deepEqual(context.tools, ["Stripe", "NetSuite", "Slack", "spreadsheets"]);
    assert.ok(context.workflows.includes("reconciliation"));
    assert.ok(context.objects.includes("payouts"));
    assert.equal(context.action, "reconcile");
  });

  it("returns all required structured fields", () => {
    const draft = generateOutreachDraft(financeSignal);

    assert.ok(draft.hook);
    assert.ok(draft.problem);
    assert.ok(draft.angle);
    assert.ok(draft.cta);
    assert.equal(draft.email_subjects.length, 3);
    assert.ok(draft.cold_email.includes(draft.cta));
    assert.ok(draft.linkedin_message);
    assert.ok(draft.quality.score >= 0 && draft.quality.score <= 100);
  });

  it("generates non-empty variants", () => {
    const draft = generateOutreachDraft(financeSignal);

    assert.ok(draft.variants.consultative.includes("?"));
    assert.ok(draft.variants.direct.includes("?"));
    assert.ok(draft.variants.executive.includes("?"));
  });

  it("includes hook, problem, angle, and CTA in the cold email", () => {
    const draft = generateOutreachDraft(financeSignal);

    assert.ok(draft.cold_email.includes(draft.hook));
    assert.ok(draft.cold_email.includes(draft.problem));
    assert.ok(draft.cold_email.includes(draft.angle));
    assert.ok(draft.cold_email.includes(draft.cta));
  });

  it("is deterministic for the same input", () => {
    assert.deepEqual(generateOutreachDraft(financeSignal), generateOutreachDraft(financeSignal));
  });

  it("uses concrete finance reconciliation copy", () => {
    const draft = generateOutreachDraft(financeSignal);

    assert.equal(draft.email_subjects[0], "Reducing Stripe and NetSuite reconciliation work");
    assert.equal(
      draft.hook,
      "Noticed finance teams often reconcile Stripe payouts with NetSuite manually through spreadsheets and Slack updates.",
    );
    assert.ok(draft.problem.includes("reporting delays"));
    assert.ok(draft.problem.includes("transaction volume grows"));
    assert.ok(draft.angle.includes("finance visibility"));
  });

  it("preserves concrete workflow nouns and tools", () => {
    const draft = generateOutreachDraft(financeSignal);
    const allCopy = getAllGeneratedCopy(draft);

    for (const expected of ["Stripe", "NetSuite", "reconciliation", "spreadsheets", "Slack", "reporting"]) {
      assert.ok(allCopy.includes(expected), `Expected outreach copy to include ${expected}`);
    }
  });

  it("does not emit banned outreach phrases in generated copy", () => {
    const genericSignal: OutreachDraftInput = {
      pain: "Finance workflows becoming manual during operational growth",
      affectedTeam: "Finance Ops",
      existingWorkaround: "manual operational workaround",
      outreachAngleRefined: "reduce manual operational work",
      outreachAngle: "handle reduce manual operational work",
      triggerEvent: "operational growth",
      targetTitles: ["VP Finance"],
    };
    const draft = generateOutreachDraft(genericSignal);
    const generatedCopy = getAllGeneratedCopy(draft).toLowerCase();

    for (const phrase of BANNED_OUTREACH_PHRASES) {
      assert.equal(generatedCopy.includes(phrase), false, `Found banned phrase: ${phrase}`);
    }
  });

  it("generates approvals-specific copy from weak rawText", () => {
    const draft = generateOutreachDraft({
      rawText: "Our team spends too much time coordinating internal approvals.",
      pain: "Finance Ops team relies on manual operational workaround to manage operational work.",
      humanPain: "Finance Ops team relies on manual operational workaround to manage operational work.",
      affectedTeam: "Finance Ops",
      existingWorkaround: "Manual operational workaround",
      outreachAngle: "handle reduce manual operational work",
      targetTitles: ["VP Finance"],
    });
    const allCopy = getAllGeneratedCopy(draft);

    assert.equal(draft.email_subjects[0], "Coordinating internal approvals");
    assert.ok(draft.cold_email.includes("coordinating internal approvals manually"));
    assert.ok(draft.cold_email.includes("follow-up gaps and delays"));
    assert.ok(draft.cta.includes("trying to tighten up?"));
    assert.equal(allCopy.includes("finance workflows"), false);
    assert.equal(allCopy.includes("manual manual"), false);
    assert.equal(allCopy.includes("coordinationaround"), false);
  });

  it("does not overuse affected team when rawText only supports approvals", () => {
    const draft = generateOutreachDraft({
      rawText: "Our team spends too much time coordinating internal approvals.",
      pain: "Finance Ops team relies on manual operational workaround to manage operational work.",
      affectedTeam: "Finance Ops",
      existingWorkaround: "Manual operational workaround",
      targetTitles: ["VP Finance"],
    });

    assert.equal(draft.hook.startsWith("Noticed teams"), true);
    assert.equal(draft.hook.includes("finance teams"), false);
  });

  it("cleans malformed generated copy", () => {
    assert.equal(
      cleanGeneratedCopy("manual manual coordinationaround workflowworkflow approvalapproval"),
      "manual coordination around workflow approval",
    );
  });

  it("uses rawText nouns over generic pain text", () => {
    const draft = generateOutreachDraft({
      rawText:
        "Our sales ops team keeps CRM reporting updated in Salesforce using spreadsheets before Monday pipeline reviews.",
      pain: "manual operational work",
      affectedTeam: "Sales Ops",
      existingWorkaround: "manual operational workaround",
      outreachAngle: "handle reduce manual operational work",
      targetTitles: ["VP Sales"],
    });
    const allCopy = getAllGeneratedCopy(draft);

    assert.ok(allCopy.includes("CRM"));
    assert.ok(allCopy.includes("reporting"));
    assert.ok(allCopy.includes("Salesforce"));
    assert.equal(allCopy.toLowerCase().includes("operational work"), false);
  });

  it("grounds CRM reporting signals in CRM and reporting", () => {
    const draft = generateOutreachDraft({
      rawText: "Sales Ops manually updates CRM reports from HubSpot and Salesforce every Friday.",
      affectedTeam: "Sales Ops",
      targetTitles: ["Revenue Operations"],
    });
    const allCopy = getAllGeneratedCopy(draft);

    assert.ok(allCopy.includes("CRM"));
    assert.ok(allCopy.includes("reporting"));
  });

  it("grounds onboarding Slack spreadsheet signals in onboarding handoffs", () => {
    const draft = generateOutreachDraft({
      rawText:
        "Customer success manages onboarding handoffs with Slack updates and spreadsheets after kickoff calls.",
      affectedTeam: "Customer Success",
      targetTitles: ["Head of Customer Success"],
    });
    const allCopy = getAllGeneratedCopy(draft);

    assert.ok(allCopy.includes("onboarding"));
    assert.ok(allCopy.includes("handoffs"));
    assert.ok(allCopy.includes("Slack"));
    assert.ok(allCopy.includes("spreadsheets"));
  });

  it("preserves recruiting interview scheduling from raw signal", () => {
    const draft = generateOutreachDraft({
      rawText: "Recruiting coordinators handle interview scheduling through Slack and spreadsheets.",
      affectedTeam: "Recruiting",
      targetTitles: ["Head of Recruiting"],
    });
    const allCopy = getAllGeneratedCopy(draft);

    assert.ok(allCopy.includes("interview scheduling"));
    assert.ok(allCopy.includes("Slack"));
  });

  it("uses human pain when rawText is missing and human pain is concrete", () => {
    const draft = generateOutreachDraft({
      pain: "manual operational work",
      humanPain: "Customer onboarding handoffs are tracked in Slack and spreadsheets.",
      affectedTeam: "Customer Success",
      targetTitles: ["Head of Customer Success"],
    });
    const allCopy = getAllGeneratedCopy(draft);

    assert.ok(allCopy.includes("onboarding"));
    assert.ok(allCopy.includes("Slack"));
    assert.ok(allCopy.includes("spreadsheets"));
  });

  it("falls back safely when rawText is missing", () => {
    const draft = generateOutreachDraft({
      pain: "Approvals are tracked manually.",
      affectedTeam: "Operations",
      targetTitles: ["COO"],
    });

    assert.ok(draft.cold_email);
    assert.ok(draft.cta.includes("?"));
  });
});

describe("evaluateOutreachQuality", () => {
  it("warns on long copy", () => {
    const quality = evaluateOutreachQuality(financeSignal, `${"word ".repeat(131)}?`);

    assert.ok(quality.warnings.includes("Cold email is too long for first-touch outreach."));
  });

  it("warns on generic copy", () => {
    const quality = evaluateOutreachQuality(
      financeSignal,
      "We help streamline operations and improve efficiency. Worth talking?",
    );

    assert.ok(quality.warnings.includes("Copy uses generic operational phrasing."));
  });

  it("rewards personalization with a stronger score", () => {
    const personalized = evaluateOutreachQuality(
      financeSignal,
      "Noticed finance teams handle Stripe and NetSuite reconciliation with spreadsheets. Worth comparing how VP Finance teams handle this workflow?",
    );
    const generic = evaluateOutreachQuality(
      financeSignal,
      "We help teams improve efficiency. Worth talking?",
    );

    assert.ok(personalized.score > generic.score);
  });

  it("keeps score between 0 and 100", () => {
    const quality = evaluateOutreachQuality(financeSignal, "streamline operations ".repeat(50), "");

    assert.ok(quality.score >= 0);
    assert.ok(quality.score <= 100);
  });

  it("penalizes malformed copy", () => {
    const quality = evaluateOutreachQuality(
      { rawText: "Our team spends too much time coordinating internal approvals." },
      "manual manual coordinationaround",
    );

    assert.ok(quality.score <= 40);
    assert.ok(quality.warnings.includes("Copy contains duplicate adjacent words."));
    assert.ok(quality.warnings.includes("Copy contains malformed joined words."));
  });

  it("penalizes banned generic copy", () => {
    const quality = evaluateOutreachQuality(
      financeSignal,
      "manual operational workaround creates operational work. Worth comparing?",
    );

    assert.ok(quality.score <= 40);
    assert.ok(quality.warnings.includes("Copy uses generic operational phrasing."));
  });
});
