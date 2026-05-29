import { buildICPGenerateHandler } from "../../../../lib/icp-api.ts";
import type { ICPRepository } from "../../../../lib/icp-service.ts";
import { prisma } from "../../../../lib/prisma.ts";

function createPrismaICPRepository(): ICPRepository {
  return {
    async findPainSignalById(painSignalId) {
      return prisma.painSignal.findUnique({
        where: { id: painSignalId },
        select: {
          id: true,
          pain: true,
          urgency: true,
          affectedTeam: true,
          possibleIcp: true,
          outreachAngle: true,
          monetizationScore: true,
          currentSolution: true,
          solutionGap: true,
          rawInput: {
            select: {
              rawText: true,
            },
          },
          targetTitles: true,
          icpGeneratedAt: true,
        },
      });
    },
    async updatePainSignalICP(painSignalId, icp) {
      return prisma.painSignal.update({
        where: { id: painSignalId },
        data: {
          targetTitles: icp.target_titles,
          companySize: icp.company_size,
          industry: icp.industry,
          buyer: icp.buyer,
          budgetOwner: icp.budget_owner,
          triggerEvent: icp.trigger_event,
          outreachAngleRefined: icp.outreach_angle_refined,
          icpGeneratedAt: icp.icp_generated_at,
        },
        select: {
          id: true,
          pain: true,
          urgency: true,
          affectedTeam: true,
          possibleIcp: true,
          outreachAngle: true,
          monetizationScore: true,
          targetTitles: true,
          companySize: true,
          industry: true,
          buyer: true,
          budgetOwner: true,
          triggerEvent: true,
          outreachAngleRefined: true,
          icpGeneratedAt: true,
        },
      });
    },
  };
}

export const POST = buildICPGenerateHandler(createPrismaICPRepository());
