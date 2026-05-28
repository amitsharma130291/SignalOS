"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isReviewStatus } from "@/lib/review-status";

type ReviewStatusActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function updateOpportunityReviewStatus(
  _prevState: ReviewStatusActionState,
  formData: FormData,
): Promise<ReviewStatusActionState> {
  const painSignalId = String(formData.get("painSignalId") ?? "").trim();
  const nextStatus = String(formData.get("status") ?? "").trim();

  if (!painSignalId) {
    return { status: "error", message: "Pain signal id is required." };
  }

  if (!isReviewStatus(nextStatus)) {
    return { status: "error", message: "Invalid review status." };
  }

  await prisma.painSignal.update({
    where: { id: painSignalId },
    data: { status: nextStatus },
  });

  revalidatePath("/opportunities");
  return { status: "success", message: "Review status updated." };
}
