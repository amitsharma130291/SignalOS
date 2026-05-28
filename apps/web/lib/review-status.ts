export const REVIEW_STATUSES = [
  "new",
  "approved",
  "rejected",
  "interesting",
  "follow_up_later",
  "bad_angle",
] as const;

export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export function isReviewStatus(value: unknown): value is ReviewStatus {
  return typeof value === "string" && REVIEW_STATUSES.includes(value as ReviewStatus);
}

export const MESSAGE_REVIEW_STATUSES = ["draft", "approved", "rejected", "bad_angle"] as const;

export type MessageReviewStatus = (typeof MESSAGE_REVIEW_STATUSES)[number];

export function isMessageReviewStatus(value: unknown): value is MessageReviewStatus {
  return (
    typeof value === "string" &&
    MESSAGE_REVIEW_STATUSES.includes(value as MessageReviewStatus)
  );
}
