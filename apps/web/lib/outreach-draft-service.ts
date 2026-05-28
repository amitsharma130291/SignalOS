import {
  generateOutreachDraft,
  type GeneratedOutreachDraft,
  type OutreachDraftInput,
} from "./outreach-generator.ts";
import {
  isOutreachDraftStatus,
  type OutreachDraftStatus,
} from "./outreach-status.ts";

export type OutreachPainSignalRecord = OutreachDraftInput & {
  id: string;
  status?: string | null;
};

export type SavedOutreachDraftRecord = {
  id: string;
  painSignalId: string;
  generatedDraft: GeneratedOutreachDraft;
  qualityScore: number;
  qualityWarnings: string[];
  status: OutreachDraftStatus;
  humanSubject?: string | null;
  humanColdEmail?: string | null;
  humanLinkedinMessage?: string | null;
  humanCta?: string | null;
  humanHook?: string | null;
  humanNotes?: string | null;
  humanEditedAt?: Date | string | null;
  reviewedAt?: Date | string | null;
  generatedAt: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type OutreachDraftRepository = {
  findPainSignalById: (painSignalId: string) => Promise<OutreachPainSignalRecord | null>;
  findDraftByPainSignalId: (painSignalId: string) => Promise<SavedOutreachDraftRecord | null>;
  saveGeneratedDraft: (
    painSignalId: string,
    draft: GeneratedOutreachDraft,
    generatedAt: Date,
  ) => Promise<SavedOutreachDraftRecord>;
};

export type GenerateOutreachDraftOptions = {
  regenerate?: boolean;
};

export function canGenerateOutreachDraft(status?: string | null) {
  return status === "approved" || status === "interesting";
}

export async function generateOutreachDraftForPainSignal(
  repository: OutreachDraftRepository,
  painSignalId: string,
  options: GenerateOutreachDraftOptions = {},
) {
  const painSignal = await repository.findPainSignalById(painSignalId);

  if (!painSignal) {
    throw new Error("Pain signal not found.");
  }

  if (!canGenerateOutreachDraft(painSignal.status)) {
    throw new Error("Outreach drafts can only be generated for approved or interesting opportunities.");
  }

  const existingDraft = await repository.findDraftByPainSignalId(painSignalId);
  if (existingDraft && !options.regenerate) {
    return {
      draft: existingDraft,
      created: false,
      regenerated: false,
    };
  }

  console.log("OUTREACH_DEBUG_INPUT", {
    painSignalId,
    rawText: painSignal.rawText,
    pain: painSignal.pain,
    humanPain: painSignal.humanPain,
    existingWorkaround: painSignal.existingWorkaround,
    outreachAngle: painSignal.outreachAngle,
    affectedTeam: painSignal.affectedTeam,
    targetTitles: painSignal.targetTitles,
  });

  const generatedDraft = generateOutreachDraft(painSignal);

  console.log("OUTREACH_DEBUG_OUTPUT", generatedDraft);
  const savedDraft = await repository.saveGeneratedDraft(painSignalId, generatedDraft, new Date());

  return {
    draft: savedDraft,
    created: !existingDraft,
    regenerated: Boolean(existingDraft),
  };
}

export function buildOutreachDraftEditUpdate(input: {
  subject?: string | null;
  coldEmail?: string | null;
  linkedinMessage?: string | null;
  cta?: string | null;
  hook?: string | null;
  notes?: string | null;
  editedAt?: Date;
}) {
  const editedAt = input.editedAt ?? new Date();

  return {
    humanSubject: input.subject?.trim() || null,
    humanColdEmail: input.coldEmail?.trim() || null,
    humanLinkedinMessage: input.linkedinMessage?.trim() || null,
    humanCta: input.cta?.trim() || null,
    humanHook: input.hook?.trim() || null,
    humanNotes: input.notes?.trim() || null,
    humanEditedAt: editedAt,
  };
}

export function buildOutreachDraftReviewUpdate(status: string, reviewedAt = new Date()) {
  if (!isOutreachDraftStatus(status)) {
    throw new Error("Invalid outreach draft status.");
  }

  return {
    status,
    reviewedAt,
  };
}
