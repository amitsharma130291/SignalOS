"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  buildOutreachDraftEditUpdate,
  buildOutreachDraftReviewUpdate,
  generateOutreachDraftForPainSignal,
  type OutreachDraftRepository,
  type SavedOutreachDraftRecord,
} from "@/lib/outreach-draft-service";
import type { GeneratedOutreachDraft } from "@/lib/outreach-generator";
import { preferHumanValue } from "@/lib/review-overrides";

type OutreachActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  itemId?: string;
};

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getOptionalString(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value ? value : null;
}

function parseTitles(value: unknown) {
  return Array.isArray(value) ? value.filter((title): title is string => typeof title === "string") : [];
}

function revalidateOutreachSurfaces() {
  revalidatePath("/outreach");
  revalidatePath("/opportunities");
  revalidatePath("/review");
}

function toSavedDraftRecord(draft: {
  id: string;
  painSignalId: string;
  generatedDraft: Prisma.JsonValue;
  qualityScore: number;
  qualityWarnings: Prisma.JsonValue;
  status: string;
  humanSubject: string | null;
  humanColdEmail: string | null;
  humanLinkedinMessage: string | null;
  humanCta: string | null;
  humanHook: string | null;
  humanNotes: string | null;
  humanEditedAt: Date | null;
  reviewedAt: Date | null;
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}): SavedOutreachDraftRecord {
  return {
    ...draft,
    generatedDraft: draft.generatedDraft as unknown as GeneratedOutreachDraft,
    qualityWarnings: parseTitles(draft.qualityWarnings),
    status: draft.status === "reviewed" || draft.status === "approved_for_outreach" || draft.status === "bad_messaging"
      ? draft.status
      : "draft_pending",
  };
}

const outreachRepository: OutreachDraftRepository = {
  async findPainSignalById(painSignalId) {
    const signal = await prisma.painSignal.findUnique({
      where: { id: painSignalId },
      select: {
        id: true,
        status: true,
        pain: true,
        urgency: true,
        affectedTeam: true,
        existingWorkaround: true,
        monetizationScore: true,
        outreachAngle: true,
        targetTitles: true,
        companySize: true,
        industry: true,
        buyer: true,
        budgetOwner: true,
        triggerEvent: true,
        outreachAngleRefined: true,
        humanPain: true,
        humanUrgency: true,
        humanAffectedTeam: true,
        humanExistingWorkaround: true,
        humanMonetizationScore: true,
        humanOutreachAngle: true,
        humanTargetTitles: true,
        humanCompanySize: true,
        humanIndustry: true,
        humanBuyer: true,
        humanBudgetOwner: true,
        humanTriggerEvent: true,
        humanOutreachAngleRefined: true,
        rawInput: {
          select: {
            rawText: true,
          },
        },
      },
    });

    if (!signal) return null;
    const generatedTitles = parseTitles(signal.targetTitles);
    const humanTitles = parseTitles(signal.humanTargetTitles);

    return {
      id: signal.id,
      status: signal.status,
      rawText: signal.rawInput?.rawText ?? null,
      pain: signal.pain,
      humanPain: signal.humanPain,
      urgency: preferHumanValue(signal.humanUrgency, signal.urgency),
      affectedTeam: preferHumanValue(signal.humanAffectedTeam, signal.affectedTeam),
      existingWorkaround: preferHumanValue(signal.humanExistingWorkaround, signal.existingWorkaround),
      monetizationScore: preferHumanValue(signal.humanMonetizationScore, signal.monetizationScore),
      outreachAngle: signal.outreachAngle,
      humanOutreachAngle: signal.humanOutreachAngle,
      targetTitles: humanTitles.length ? humanTitles : generatedTitles,
      companySize: preferHumanValue(signal.humanCompanySize, signal.companySize),
      industry: preferHumanValue(signal.humanIndustry, signal.industry),
      buyer: preferHumanValue(signal.humanBuyer, signal.buyer),
      budgetOwner: preferHumanValue(signal.humanBudgetOwner, signal.budgetOwner),
      triggerEvent: preferHumanValue(signal.humanTriggerEvent, signal.triggerEvent),
      outreachAngleRefined: preferHumanValue(signal.humanOutreachAngleRefined, signal.outreachAngleRefined),
    };
  },
  async findDraftByPainSignalId(painSignalId) {
    const draft = await prisma.outreachDraft.findUnique({
      where: { painSignalId },
    });

    return draft ? toSavedDraftRecord(draft) : null;
  },
  async saveGeneratedDraft(painSignalId, draft, generatedAt) {
    const saved = await prisma.outreachDraft.upsert({
      where: { painSignalId },
      create: {
        painSignalId,
        generatedDraft: draft as unknown as Prisma.InputJsonValue,
        qualityScore: draft.quality.score,
        qualityWarnings: draft.quality.warnings,
        status: "draft_pending",
        generatedAt,
      },
      update: {
        generatedDraft: draft as unknown as Prisma.InputJsonValue,
        qualityScore: draft.quality.score,
        qualityWarnings: draft.quality.warnings,
        status: "draft_pending",
        generatedAt,
      },
    });

    return toSavedDraftRecord(saved);
  },
};

export async function generateOutreachDraftAction(formData: FormData): Promise<void> {
  const painSignalId = getString(formData, "painSignalId");
  const regenerate = getString(formData, "regenerate") === "true";
  if (!painSignalId) return;

  await generateOutreachDraftForPainSignal(outreachRepository, painSignalId, { regenerate });
  revalidateOutreachSurfaces();
}

export async function updateOutreachDraftEdits(
  prevStateOrFormData: OutreachActionState | FormData,
  maybeFormData?: FormData,
): Promise<OutreachActionState> {
  const formData = prevStateOrFormData instanceof FormData ? prevStateOrFormData : maybeFormData;
  if (!formData) return { status: "error", message: "Outreach draft form data is required." };
  const draftId = getString(formData, "draftId");
  const painSignalId = getString(formData, "painSignalId");
  if (!draftId || !painSignalId) {
    return { status: "error", message: "Draft id and pain signal id are required.", itemId: painSignalId };
  }

  try {
    await prisma.outreachDraft.update({
      where: { id: draftId },
      data: buildOutreachDraftEditUpdate({
        subject: getOptionalString(formData, "subject"),
        coldEmail: getOptionalString(formData, "coldEmail"),
        linkedinMessage: getOptionalString(formData, "linkedinMessage"),
        cta: getOptionalString(formData, "cta"),
        hook: getOptionalString(formData, "hook"),
        notes: getOptionalString(formData, "notes"),
      }),
    });
  } catch (error) {
    console.error("Failed to save outreach draft edits", error);
    return { status: "error", message: "Could not save outreach draft edits.", itemId: painSignalId };
  }

  revalidateOutreachSurfaces();
  return { status: "success", message: "Outreach draft saved.", itemId: painSignalId };
}

export async function updateOutreachDraftStatus(formData: FormData): Promise<void> {
  const draftId = getString(formData, "draftId");
  const status = getString(formData, "status");
  if (!draftId) return;

  await prisma.outreachDraft.update({
    where: { id: draftId },
    data: buildOutreachDraftReviewUpdate(status),
  });
  revalidateOutreachSurfaces();
}
