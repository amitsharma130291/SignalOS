"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  buildMessageReviewDecisionUpdate,
  buildPainSignalReviewDecisionUpdate,
  type ReviewDecision,
} from "@/lib/review-overrides";

type ReviewActionState = {
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

function getOptionalNumber(formData: FormData, key: string) {
  const value = getString(formData, key);
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getTitles(formData: FormData) {
  const value = getString(formData, "targetTitles");
  if (!value) return Prisma.JsonNull;
  return value
    .split(",")
    .map((title) => title.trim())
    .filter(Boolean);
}

function revalidateReviewSurfaces() {
  revalidatePath("/review");
  revalidatePath("/opportunities");
}

export async function updateReviewDecision(
  prevStateOrFormData: ReviewActionState | FormData,
  maybeFormData?: FormData,
): Promise<ReviewActionState> {
  const formData = prevStateOrFormData instanceof FormData ? prevStateOrFormData : maybeFormData;
  if (!formData) return { status: "error", message: "Review form data is required." };
  const painSignalId = getString(formData, "painSignalId");
  const messageId = getOptionalString(formData, "messageId");
  const decision = getString(formData, "decision") as ReviewDecision;
  const notes = getOptionalString(formData, "notes");

  if (!painSignalId) {
    return { status: "error", message: "Pain signal id is required." };
  }

  if (!["approved", "rejected", "bad_angle"].includes(decision)) {
    return { status: "error", message: "Invalid review decision." };
  }

  const reviewedAt = new Date();

  await prisma.painSignal.update({
    where: { id: painSignalId },
    data: buildPainSignalReviewDecisionUpdate(decision, notes, reviewedAt),
  });

  if (messageId) {
    await prisma.message.update({
      where: { id: messageId },
      data: buildMessageReviewDecisionUpdate(decision, notes, reviewedAt),
    });
  }

  revalidateReviewSurfaces();
  return { status: "success", message: "Review decision saved." };
}

export async function saveReviewDecision(formData: FormData): Promise<void> {
  await updateReviewDecision(formData);
}

export async function updateReviewOverrides(
  prevStateOrFormData: ReviewActionState | FormData,
  maybeFormData?: FormData,
): Promise<ReviewActionState> {
  const formData = prevStateOrFormData instanceof FormData ? prevStateOrFormData : maybeFormData;
  if (!formData) return { status: "error", message: "Review form data is required." };
  const painSignalId = getString(formData, "painSignalId");
  const messageId = getOptionalString(formData, "messageId");

  if (!painSignalId) {
    return { status: "error", message: "Pain signal id is required." };
  }

  try {
    await prisma.painSignal.update({
      where: { id: painSignalId },
      data: {
        humanPain: getOptionalString(formData, "pain"),
        humanUrgency: getOptionalString(formData, "urgency"),
        humanAffectedTeam: getOptionalString(formData, "affectedTeam"),
        humanExistingWorkaround: getOptionalString(formData, "existingWorkaround"),
        humanPossibleIcp: getOptionalString(formData, "possibleIcp"),
        humanMonetizationScore: getOptionalNumber(formData, "monetizationScore"),
        humanOutreachAngle: getOptionalString(formData, "outreachAngle"),
        humanTargetTitles: getTitles(formData),
        humanCompanySize: getOptionalString(formData, "companySize"),
        humanIndustry: getOptionalString(formData, "industry"),
        humanBuyer: getOptionalString(formData, "buyer"),
        humanBudgetOwner: getOptionalString(formData, "budgetOwner"),
        humanTriggerEvent: getOptionalString(formData, "triggerEvent"),
        humanOutreachAngleRefined: getOptionalString(formData, "outreachAngleRefined"),
        humanNotes: getOptionalString(formData, "notes"),
      },
    });

    if (messageId) {
      await prisma.message.update({
        where: { id: messageId },
        data: {
          humanSubject: getOptionalString(formData, "subject"),
          humanBody: getOptionalString(formData, "body"),
          reviewNotes: getOptionalString(formData, "messageNotes"),
        },
      });
    }
  } catch (error) {
    console.error("Failed to save review overrides", error);
    return { status: "error", message: "Could not save review edits.", itemId: painSignalId };
  }

  revalidateReviewSurfaces();
  return { status: "success", message: "Human edits saved.", itemId: painSignalId };
}

export async function saveReviewOverrides(formData: FormData): Promise<void> {
  await updateReviewOverrides(formData);
}
