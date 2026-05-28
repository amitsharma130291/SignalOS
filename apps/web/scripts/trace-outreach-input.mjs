import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { generateOutreachDraft } from "../lib/outreach-generator.ts";
import { preferHumanValue } from "../lib/review-overrides.ts";

function parseTitles(value) {
  return Array.isArray(value) ? value.filter((title) => typeof title === "string") : [];
}

function buildGenerateOutreachDraftInput(signal) {
  const generatedTitles = parseTitles(signal.targetTitles);
  const humanTitles = parseTitles(signal.humanTargetTitles);

  return {
    id: signal.id,
    status: signal.status,
    rawText: signal.rawInput?.rawText ?? null,
    pain: signal.pain,
    humanPain: signal.humanPain,
    urgency: preferHumanValue(signal.humanUrgency, signal.urgency),
    affectedTeam: preferHumanValue(signal.humanAffectedTeam, signal.affectedTeam),
    existingWorkaround: preferHumanValue(
      signal.humanExistingWorkaround,
      signal.existingWorkaround,
    ),
    monetizationScore: preferHumanValue(
      signal.humanMonetizationScore,
      signal.monetizationScore,
    ),
    outreachAngle: signal.outreachAngle,
    humanOutreachAngle: signal.humanOutreachAngle,
    targetTitles: humanTitles.length ? humanTitles : generatedTitles,
    companySize: preferHumanValue(signal.humanCompanySize, signal.companySize),
    industry: preferHumanValue(signal.humanIndustry, signal.industry),
    buyer: preferHumanValue(signal.humanBuyer, signal.buyer),
    budgetOwner: preferHumanValue(signal.humanBudgetOwner, signal.budgetOwner),
    triggerEvent: preferHumanValue(signal.humanTriggerEvent, signal.triggerEvent),
    outreachAngleRefined: preferHumanValue(
      signal.humanOutreachAngleRefined,
      signal.outreachAngleRefined,
    ),
  };
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

try {
  const signal = await prisma.painSignal.findFirst({
    where: {
      OR: [
        { affectedTeam: { contains: "Finance", mode: "insensitive" } },
        { humanAffectedTeam: { contains: "Finance", mode: "insensitive" } },
        { pain: { contains: "finance", mode: "insensitive" } },
        { humanPain: { contains: "finance", mode: "insensitive" } },
        { rawInput: { rawText: { contains: "finance", mode: "insensitive" } } },
      ],
    },
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true,
      status: true,
      pain: true,
      urgency: true,
      affectedTeam: true,
      existingWorkaround: true,
      monetizationScore: true,
      outreachAngle: true,
      targetTitles: true,
      companySize: true,
      industry: true,
      buyer: true,
      budgetOwner: true,
      triggerEvent: true,
      outreachAngleRefined: true,
      humanPain: true,
      humanUrgency: true,
      humanAffectedTeam: true,
      humanExistingWorkaround: true,
      humanMonetizationScore: true,
      humanOutreachAngle: true,
      humanTargetTitles: true,
      humanCompanySize: true,
      humanIndustry: true,
      humanBuyer: true,
      humanBudgetOwner: true,
      humanTriggerEvent: true,
      humanOutreachAngleRefined: true,
      rawInput: {
        select: {
          rawText: true,
        },
      },
    },
  });

  if (!signal) {
    console.log(
      JSON.stringify(
        {
          error: "No Finance Ops pain signal found.",
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  } else {
    const input = buildGenerateOutreachDraftInput(signal);
    const generatedDraft = generateOutreachDraft(input);

    console.log(
      JSON.stringify(
        {
          rawText: input.rawText,
          generateOutreachDraftInput: input,
          generatedDraftBeforeSaving: generatedDraft,
        },
        null,
        2,
      ),
    );
  }
} finally {
  await prisma.$disconnect();
}
