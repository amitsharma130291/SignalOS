export const REVIEW_STATUSES = [
  "new",
  "approved",
  "rejected",
  "interesting",
  "follow_up_later",
] as const;

export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export function isReviewStatus(value: unknown): value is ReviewStatus {
  return typeof value === "string" && REVIEW_STATUSES.includes(value as ReviewStatus);
}
