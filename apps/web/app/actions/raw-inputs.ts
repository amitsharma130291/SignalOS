"use server";

import { revalidatePath } from "next/cache";
import type { CreateRawInputState } from "@/lib/raw-input-form";
import { filterRawInput } from "@/lib/filterRawInput";
import { prisma } from "@/lib/prisma";

const ALLOWED_INPUT_TYPES = [
  "manual_note",
  "reddit_post",
  "job_listing",
  "linkedin_post",
  "support_thread",
  "forum_thread",
  "other",
] as const;

type InputType = (typeof ALLOWED_INPUT_TYPES)[number];
type FilterActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function createRawInputAction(
  _prevState: CreateRawInputState,
  formData: FormData,
): Promise<CreateRawInputState> {
  const inputType = String(formData.get("inputType") ?? "").trim();
  const rawText = String(formData.get("rawText") ?? "").trim();
  const sourceName = String(formData.get("sourceName") ?? "").trim();
  const sourceUrl = String(formData.get("sourceUrl") ?? "").trim();

  if (!ALLOWED_INPUT_TYPES.includes(inputType as InputType)) {
    return { status: "error", message: "Please select a valid input type." };
  }

  if (!rawText) {
    return { status: "error", message: "Raw text is required." };
  }

  try {
    await prisma.rawInput.create({
      data: {
        inputType,
        rawText,
        sourceName: sourceName || null,
        sourceUrl: sourceUrl || null,
      },
    });
  } catch (error) {
    console.error("Failed to create raw input", error);
    return {
      status: "error",
      message: "Could not save signal. Please try again.",
    };
  }

  revalidatePath("/");
  return { status: "success", message: "Signal saved." };
}

export async function runFilterAction(
  _prevState: FilterActionState,
  formData: FormData,
): Promise<FilterActionState> {
  const rawInputId = String(formData.get("rawInputId") ?? "").trim();

  if (!rawInputId) {
    return { status: "error", message: "Raw input id is required." };
  }

  const rawInput = await prisma.rawInput.findUnique({
    where: { id: rawInputId },
    select: {
      id: true,
      rawText: true,
      sourceName: true,
      metadata: true,
    },
  });

  if (!rawInput) {
    return { status: "error", message: "Signal not found." };
  }

  const filterResult = filterRawInput(rawInput.rawText, rawInput.sourceName);
  const existingMetadata =
    rawInput.metadata && typeof rawInput.metadata === "object" && !Array.isArray(rawInput.metadata)
      ? rawInput.metadata
      : {};

  await prisma.rawInput.update({
    where: { id: rawInput.id },
    data: {
      status: filterResult.status,
      metadata: {
        ...existingMetadata,
        filter: {
          ...filterResult,
          filteredAt: new Date().toISOString(),
        },
      },
    },
  });

  revalidatePath("/");
  return { status: "success", message: "Filter completed." };
}

export async function runFilterOnAllNewAction(
  prevState: FilterActionState,
): Promise<FilterActionState> {
  void prevState;

  const newRawInputs = await prisma.rawInput.findMany({
    where: { status: "new" },
    select: {
      id: true,
      rawText: true,
      sourceName: true,
      metadata: true,
    },
  });

  if (newRawInputs.length === 0) {
    return { status: "success", message: "No new signals to filter." };
  }

  await prisma.$transaction(
    newRawInputs.map((rawInput) => {
      const filterResult = filterRawInput(rawInput.rawText, rawInput.sourceName);
      const existingMetadata =
        rawInput.metadata && typeof rawInput.metadata === "object" && !Array.isArray(rawInput.metadata)
          ? rawInput.metadata
          : {};

      return prisma.rawInput.update({
        where: { id: rawInput.id },
        data: {
          status: filterResult.status,
          metadata: {
            ...existingMetadata,
            filter: {
              ...filterResult,
              filteredAt: new Date().toISOString(),
            },
          },
        },
      });
    }),
  );

  revalidatePath("/");
  return { status: "success", message: `Filtered ${newRawInputs.length} signals.` };
}
