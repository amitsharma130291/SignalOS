export const INTERVIEW_STATUSES = ["scheduled", "completed", "cancelled"] as const;

export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number];

export function isInterviewStatus(value: string): value is InterviewStatus {
  return INTERVIEW_STATUSES.includes(value as InterviewStatus);
}

export function parseFounderConviction(value: FormDataEntryValue | string | number | null) {
  if (value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(String(value).trim());

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10) {
    throw new Error("Founder conviction must be between 1 and 10.");
  }

  return parsed;
}

export function buildOpportunityDiscoveryUpdate(input: {
  frequency?: string | null;
  currentSolution?: string | null;
  solutionGap?: string | null;
  founderConviction?: number | null;
}) {
  return {
    frequency: input.frequency?.trim() || null,
    currentSolution: input.currentSolution?.trim() || null,
    solutionGap: input.solutionGap?.trim() || null,
    founderConviction: input.founderConviction ?? null,
  };
}

export function buildInterviewCreateInput(input: {
  opportunityId: string;
  contactName?: string | null;
  company?: string | null;
  title?: string | null;
  status: string;
  notes?: string | null;
}) {
  if (!isInterviewStatus(input.status)) {
    throw new Error("Invalid interview status.");
  }

  return {
    opportunityId: input.opportunityId,
    contactName: input.contactName?.trim() || null,
    company: input.company?.trim() || null,
    title: input.title?.trim() || null,
    status: input.status,
    notes: input.notes?.trim() || null,
  };
}

export function getInterviewCount(value?: number | null) {
  return value ?? 0;
}
