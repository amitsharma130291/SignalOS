export type ReviewDecision = "approved" | "rejected" | "bad_angle";

export function preferHumanValue<T>(humanValue: T | null | undefined, generatedValue: T) {
  if (typeof humanValue === "string") {
    return humanValue.trim() ? humanValue : generatedValue;
  }

  return humanValue ?? generatedValue;
}

export function hasHumanOverride(values: Record<string, unknown>) {
  return Object.values(values).some((value) => {
    if (typeof value === "string") return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return value !== null && value !== undefined;
  });
}

export function hasHumanEditedState(values: Record<string, unknown>) {
  return hasHumanOverride(values);
}

export function buildPainSignalReviewDecisionUpdate(
  decision: ReviewDecision,
  notes?: string | null,
  reviewedAt = new Date(),
) {
  const base = {
    status: decision,
    reviewedAt,
    humanNotes: notes?.trim() || null,
  };

  if (decision === "bad_angle") {
    return {
      ...base,
      angleFeedback: "bad_angle",
    };
  }

  return base;
}

export function buildMessageReviewDecisionUpdate(
  decision: ReviewDecision,
  notes?: string | null,
  reviewedAt = new Date(),
) {
  return {
    status: decision,
    reviewedAt,
    reviewNotes: notes?.trim() || null,
  };
}
