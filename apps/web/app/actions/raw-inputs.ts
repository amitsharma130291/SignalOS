"use server";

import { revalidatePath } from "next/cache";
import type { CreateRawInputState } from "@/lib/raw-input-form";
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
