import type { MockPainExtractionResult } from "./mockPainExtractor.ts";

export function buildPainSignalExtractionWrite(extraction: MockPainExtractionResult) {
  return {
    pain: extraction.pain,
    b2bScore: extraction.b2bScore,
    urgency: extraction.urgency,
    frequency: extraction.frequency,
    affectedTeam: extraction.affectedTeam,
    existingWorkaround: extraction.existingWorkaround,
    currentSolution: extraction.currentSolution,
    solutionGap: extraction.solutionGap,
    possibleIcp: extraction.possibleIcp,
    monetizationScore: extraction.monetizationScore,
    outreachAngle: extraction.outreachAngle,
    aiModel: extraction.aiModel,
    promptVersion: extraction.promptVersion,
    aiOutput: extraction.aiOutput,
  };
}
