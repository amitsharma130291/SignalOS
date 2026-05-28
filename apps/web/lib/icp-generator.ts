export type ICPPainSignalInput = {
  pain?: string | null;
  affectedTeam?: string | null;
  urgency?: string | null;
  possibleIcp?: string | null;
  outreachAngle?: string | null;
  monetizationScore?: number | null;
};

export type GeneratedICP = {
  target_titles: string[];
  company_size: string;
  industry: string;
  buyer: string;
  budget_owner: string;
  trigger_event: string;
  outreach_angle_refined: string;
};

type ICPMapping = Omit<GeneratedICP, "outreach_angle_refined">;

const FALLBACK_ICP: ICPMapping = {
  target_titles: ["Operations Manager", "Head of Operations", "COO"],
  company_size: "50-500 employees",
  industry: "B2B",
  buyer: "Operations",
  budget_owner: "COO",
  trigger_event: "Manual operational work creating process bottlenecks",
};

const TEAM_MAPPINGS: Record<string, ICPMapping> = {
  "sales ops": {
    target_titles: ["RevOps Manager", "Sales Operations Lead", "VP Revenue Operations"],
    company_size: "50-500 employees",
    industry: "B2B SaaS",
    buyer: "Revenue Operations",
    budget_owner: "VP Sales",
    trigger_event: "Rapid sales growth creating reporting bottlenecks",
  },
  "customer success": {
    target_titles: [
      "Head of Customer Success",
      "Customer Success Operations",
      "VP Customer Experience",
    ],
    company_size: "50-500 employees",
    industry: "B2B SaaS",
    buyer: "Customer Success",
    budget_owner: "VP Customer Success",
    trigger_event: "Customer growth creating onboarding and retention workflow friction",
  },
  "finance ops": {
    target_titles: ["Finance Operations Manager", "Controller", "VP Finance"],
    company_size: "50-500 employees",
    industry: "B2B",
    buyer: "Finance Operations",
    budget_owner: "VP Finance",
    trigger_event: "Finance workflows becoming manual during operational growth",
  },
  support: {
    target_titles: ["Support Operations Manager", "Head of Support", "Customer Support Director"],
    company_size: "50-500 employees",
    industry: "B2B SaaS",
    buyer: "Support Operations",
    budget_owner: "VP Customer Experience",
    trigger_event: "Support volume increasing repetitive operational work",
  },
};

function normalizeTeam(affectedTeam?: string | null) {
  return affectedTeam?.trim().toLowerCase() ?? "";
}

function getMapping(affectedTeam?: string | null) {
  const normalizedTeam = normalizeTeam(affectedTeam);

  if (normalizedTeam.includes("sales") || normalizedTeam.includes("revops")) {
    return TEAM_MAPPINGS["sales ops"];
  }

  if (normalizedTeam.includes("customer success") || normalizedTeam.includes("onboarding")) {
    return TEAM_MAPPINGS["customer success"];
  }

  if (normalizedTeam.includes("finance")) {
    return TEAM_MAPPINGS["finance ops"];
  }

  if (normalizedTeam.includes("support")) {
    return TEAM_MAPPINGS.support;
  }

  return FALLBACK_ICP;
}

function refineOutreachAngle(signal: ICPPainSignalInput, mapping: ICPMapping) {
  if (signal.outreachAngle?.trim()) {
    return signal.outreachAngle.trim();
  }

  if (signal.pain?.trim()) {
    return `Help ${mapping.buyer.toLowerCase()} teams reduce ${signal.pain.trim().toLowerCase()}`;
  }

  return `Help ${mapping.buyer.toLowerCase()} teams reduce manual operational work.`;
}

export function generateICPFromPainSignal(signal: ICPPainSignalInput): GeneratedICP {
  const mapping = getMapping(signal.affectedTeam);

  return {
    target_titles: mapping.target_titles,
    company_size: mapping.company_size,
    industry: mapping.industry,
    buyer: mapping.buyer,
    budget_owner: mapping.budget_owner,
    trigger_event: mapping.trigger_event,
    outreach_angle_refined: refineOutreachAngle(signal, mapping),
  };
}
