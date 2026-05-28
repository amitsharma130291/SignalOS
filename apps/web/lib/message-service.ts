import { generateOutboundDraft, type GeneratedOutboundDraft, type MessageDraftInput } from "./message-generator.ts";

export type MessagePainSignalRecord = MessageDraftInput & {
  id: string;
};

export type SavedMessageDraft = GeneratedOutboundDraft & {
  id: string;
  status: "draft";
  generatedAt: Date | string;
};

export type MessageRepository = {
  findPainSignalById: (painSignalId: string) => Promise<MessagePainSignalRecord | null>;
  createMessageDraft: (
    painSignalId: string,
    draft: GeneratedOutboundDraft,
    generatedAt: Date,
  ) => Promise<SavedMessageDraft>;
};

export async function generateMessageDraftForPainSignal(
  repository: MessageRepository,
  painSignalId: string,
) {
  const painSignal = await repository.findPainSignalById(painSignalId);

  if (!painSignal) {
    throw new Error("Pain signal not found.");
  }

  const draft = generateOutboundDraft(painSignal);
  const generatedAt = new Date();
  const message = await repository.createMessageDraft(painSignalId, draft, generatedAt);

  return {
    draft: message,
  };
}
