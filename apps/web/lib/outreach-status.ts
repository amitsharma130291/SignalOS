export const OUTREACH_DRAFT_STATUSES = [
  "draft_pending",
  "reviewed",
  "approved_for_outreach",
  "bad_messaging",
] as const;

export type OutreachDraftStatus = (typeof OUTREACH_DRAFT_STATUSES)[number];

export function isOutreachDraftStatus(value: string): value is OutreachDraftStatus {
  return OUTREACH_DRAFT_STATUSES.includes(value as OutreachDraftStatus);
}
