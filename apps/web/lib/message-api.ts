import {
  generateMessageDraftForPainSignal,
  type MessageRepository,
} from "./message-service.ts";

export function buildMessageGenerateHandler(repository: MessageRepository) {
  return async function POST(request: Request) {
    const body = (await request.json().catch(() => null)) as { painSignalId?: unknown } | null;
    const painSignalId = typeof body?.painSignalId === "string" ? body.painSignalId.trim() : "";

    if (!painSignalId) {
      return Response.json({ error: "painSignalId is required." }, { status: 400 });
    }

    try {
      const result = await generateMessageDraftForPainSignal(repository, painSignalId);
      return Response.json(result);
    } catch (error) {
      if (error instanceof Error && error.message === "Pain signal not found.") {
        return Response.json({ error: error.message }, { status: 404 });
      }

      console.error("Failed to generate message draft", error);
      return Response.json({ error: "Could not generate message draft." }, { status: 500 });
    }
  };
}
