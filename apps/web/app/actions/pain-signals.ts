"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { buildPainSignalExtractionWrite } from "@/lib/pain-extraction-persistence";
import { mockPainExtractor } from "@/lib/mockPainExtractor";
import { prisma } from "@/lib/prisma";

type ExtractPainActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

function getFilterMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  const filter = (metadata as Record<string, unknown>).filter;
  if (!filter || typeof filter !== "object" || Array.isArray(filter)) {
    return {};
  }

  return filter as Record<string, unknown>;
}

export async function extractPainAction(
  _prevState: ExtractPainActionState,
  formData: FormData,
): Promise<ExtractPainActionState> {
  const rawInputId = String(formData.get("rawInputId") ?? "").trim();

  if (!rawInputId) {
    return { status: "error", message: "Raw input id is required." };
  }

  const rawInput = await prisma.rawInput.findUnique({
    where: { id: rawInputId },
    select: {
      id: true,
      rawText: true,
      status: true,
      metadata: true,
      painSignals: {
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!rawInput) {
    return { status: "error", message: "Signal not found." };
  }

  if (rawInput.status === "filtered_out") {
    return { status: "error", message: "Filtered-out signals cannot be extracted." };
  }

  if (rawInput.status !== "accepted" && rawInput.status !== "needs_review") {
    return { status: "error", message: "Run filtering before extracting pain." };
  }

  const extraction = mockPainExtractor(rawInput.rawText, getFilterMetadata(rawInput.metadata));
  console.log("EXTRACTION_RESULT", {
    frequency: extraction.frequency,
    currentSolution: extraction.currentSolution,
    solutionGap: extraction.solutionGap,
    affectedTeam: extraction.affectedTeam,
    pain: extraction.pain,
  });
  const extractionWrite = buildPainSignalExtractionWrite(extraction);

  if (rawInput.painSignals.length > 0) {
    const updateData = {
      ...extractionWrite,
      aiOutput: extractionWrite.aiOutput as Prisma.InputJsonObject,
    };
    console.log("UPDATE_PAYLOAD", updateData);

    await prisma.painSignal.update({
      where: { id: rawInput.painSignals[0].id },
      data: updateData,
    });

    revalidatePath("/");
    revalidatePath("/opportunities");
    return { status: "success", message: "Pain extraction updated." };
  }

  await prisma.painSignal.create({
    data: {
      rawInputId: rawInput.id,
      ...extractionWrite,
      aiOutput: extractionWrite.aiOutput as Prisma.InputJsonObject,
      status: "new",
    },
  });

  revalidatePath("/");
  revalidatePath("/opportunities");
  return { status: "success", message: "Pain extracted." };
}
