import { generateICPFromPainSignal, type GeneratedICP, type ICPPainSignalInput } from "./icp-generator.ts";

export type ICPPainSignalRecord = ICPPainSignalInput & {
  id: string;
  targetTitles?: unknown;
  icpGeneratedAt?: Date | string | null;
};

export type ICPPainSignalUpdate = GeneratedICP & {
  icp_generated_at: Date;
};

export type ICPRepository = {
  findPainSignalById: (painSignalId: string) => Promise<ICPPainSignalRecord | null>;
  updatePainSignalICP: (
    painSignalId: string,
    icp: ICPPainSignalUpdate,
  ) => Promise<Record<string, unknown>>;
};

export type GenerateICPResult = {
  painSignal: ICPPainSignalRecord | Record<string, unknown>;
  generated: boolean;
};

function hasExistingICP(signal: ICPPainSignalRecord) {
  return Boolean(signal.icpGeneratedAt || signal.targetTitles);
}

export async function generateICPForPainSignal(
  repository: ICPRepository,
  painSignalId: string,
): Promise<GenerateICPResult> {
  const painSignal = await repository.findPainSignalById(painSignalId);

  if (!painSignal) {
    throw new Error("Pain signal not found.");
  }

  if (hasExistingICP(painSignal)) {
    return {
      painSignal,
      generated: false,
    };
  }

  const icp = generateICPFromPainSignal(painSignal);
  const updatedPainSignal = await repository.updatePainSignalICP(painSignalId, {
    ...icp,
    icp_generated_at: new Date(),
  });

  return {
    painSignal: updatedPainSignal,
    generated: true,
  };
}
