import { buildMessageGenerateHandler } from "../../../../lib/message-api.ts";
import type { MessageRepository } from "../../../../lib/message-service.ts";
import { prisma } from "../../../../lib/prisma.ts";

function createPrismaMessageRepository(): MessageRepository {
  return {
    async findPainSignalById(painSignalId) {
      return prisma.painSignal.findUnique({
        where: { id: painSignalId },
        select: {
          id: true,
          pain: true,
          urgency: true,
          affectedTeam: true,
          existingWorkaround: true,
          possibleIcp: true,
          outreachAngle: true,
          targetTitles: true,
          industry: true,
          triggerEvent: true,
        },
      });
    },
    async createMessageDraft(painSignalId, draft, generatedAt) {
      const message = await prisma.message.create({
        data: {
          painSignalId,
          subject: draft.subject,
          body: draft.body,
          status: "draft",
          generatedAt,
          requiresHumanReview: true,
          metadata: {
            generator: "deterministic-v1",
            structure: draft.structure,
          },
        },
        select: {
          id: true,
          subject: true,
          body: true,
          status: true,
          generatedAt: true,
        },
      });

      return {
        ...draft,
        id: message.id,
        status: "draft",
        generatedAt: message.generatedAt,
      };
    },
  };
}

export const POST = buildMessageGenerateHandler(createPrismaMessageRepository());
