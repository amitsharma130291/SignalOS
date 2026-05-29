export type ICPPainSignalInput = {
  pain?: string | null;
  affectedTeam?: string | null;
  urgency?: string | null;
  possibleIcp?: string | null;
  outreachAngle?: string | null;
  monetizationScore?: number | null;
  currentSolution?: string | null;
  solutionGap?: string | null;
  rawText?: string | null;
};

export type ICPCandidate = {
  title: string;
  confidence: number;
};

export type RankedIndustry = {
  industry: string;
  confidence: number;
};

export type CompanySizeEstimate = {
  estimate: string;
  confidence: number;
  matchedSignals: string[];
};

export type GeneratedICP = {
  target_titles: string[];
  company_size: string;
  industry: string;
  buyer: string;
  budget_owner: string;
  trigger_event: string;
  outreach_angle_refined: string;
  icp_candidates: ICPCandidate[];
  ranked_industries: RankedIndustry[];
  company_size_confidence: number;
  company_size_signals: string[];
  icp_confidence: number;
  why_this_buyer: string;
};

type ICPMapping = {
  candidates: ICPCandidate[];
  buyer: string;
  budget_owner: string;
  fallbackIndustry: string;
  whyThisBuyer: string;
};

const FALLBACK_ICP: ICPMapping = {
  candidates: [
    { title: "Operations Manager", confidence: 68 },
    { title: "Head of Operations", confidence: 61 },
    { title: "COO", confidence: 54 },
  ],
  buyer: "Operations Manager",
  budget_owner: "COO",
  fallbackIndustry: "B2B",
  whyThisBuyer: "Responsible for cross-functional reporting and compliance processes.",
};

const TEAM_MAPPINGS: Record<string, ICPMapping> = {
  "sales ops": {
    candidates: [
      { title: "RevOps Manager", confidence: 92 },
      { title: "Sales Operations Lead", confidence: 82 },
      { title: "VP Revenue Operations", confidence: 72 },
    ],
    buyer: "RevOps Manager",
    budget_owner: "VP Revenue",
    fallbackIndustry: "B2B SaaS",
    whyThisBuyer: "Owns forecast accuracy and pipeline reporting.",
  },
  "customer success": {
    candidates: [
      { title: "Head of Customer Success", confidence: 92 },
      { title: "Customer Success Operations Lead", confidence: 81 },
      { title: "VP Customer Success", confidence: 70 },
    ],
    buyer: "Head of Customer Success",
    budget_owner: "VP Customer Success",
    fallbackIndustry: "B2B SaaS",
    whyThisBuyer: "Responsible for renewal visibility and customer health.",
  },
  "finance ops": {
    candidates: [
      { title: "Director Finance Operations", confidence: 93 },
      { title: "Controller", confidence: 82 },
      { title: "VP Finance", confidence: 73 },
    ],
    buyer: "Director Finance Operations",
    budget_owner: "VP Finance",
    fallbackIndustry: "B2B",
    whyThisBuyer: "Owns reconciliation accuracy and month-end close.",
  },
  support: {
    candidates: [
      { title: "Head of Support", confidence: 92 },
      { title: "Director of Customer Support", confidence: 81 },
      { title: "VP Customer Experience", confidence: 67 },
    ],
    buyer: "Support Manager",
    budget_owner: "VP Customer Experience",
    fallbackIndustry: "Customer-support-heavy businesses",
    whyThisBuyer: "Responsible for ticket escalation workflows.",
  },
  recruiting: {
    candidates: [
      { title: "Recruiting Operations Lead", confidence: 91 },
      { title: "Head of Talent Acquisition", confidence: 80 },
      { title: "VP Talent", confidence: 69 },
    ],
    buyer: "Recruiting Operations Lead",
    budget_owner: "VP Talent",
    fallbackIndustry: "Recruiting-intensive businesses",
    whyThisBuyer: "Owns recruiting operations and hiring process efficiency.",
  },
  operations: {
    candidates: [
      { title: "Operations Manager", confidence: 88 },
      { title: "Head of Operations", confidence: 78 },
      { title: "COO", confidence: 68 },
    ],
    buyer: "Operations Manager",
    budget_owner: "COO",
    fallbackIndustry: "B2B",
    whyThisBuyer: "Responsible for cross-functional reporting and compliance processes.",
  },
};

const TOOL_PATTERNS: Record<string, string> = {
  netsuite: "NetSuite",
  salesforce: "Salesforce",
  workday: "Workday",
  servicenow: "ServiceNow",
  hubspot: "HubSpot",
  zendesk: "Zendesk",
  greenhouse: "Greenhouse",
  airtable: "Airtable",
  "google sheets": "Google Sheets",
  slack: "Slack",
  stripe: "Stripe",
  spreadsheet: "Spreadsheets",
  spreadsheets: "Spreadsheets",
};

function normalizeTeam(affectedTeam?: string | null) {
  return affectedTeam?.trim().toLowerCase() ?? "";
}

function getSignalText(signal: ICPPainSignalInput) {
  return [
    signal.rawText,
    signal.pain,
    signal.currentSolution,
    signal.solutionGap,
    signal.possibleIcp,
    signal.outreachAngle,
    signal.affectedTeam,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
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

  if (normalizedTeam.includes("recruiting") || normalizedTeam.includes("talent")) {
    return TEAM_MAPPINGS.recruiting;
  }

  if (normalizedTeam.includes("operations")) {
    return TEAM_MAPPINGS.operations;
  }

  return FALLBACK_ICP;
}

function getTeamKey(affectedTeam?: string | null) {
  const normalizedTeam = normalizeTeam(affectedTeam);
  if (normalizedTeam.includes("sales") || normalizedTeam.includes("revops")) return "sales ops";
  if (normalizedTeam.includes("customer success") || normalizedTeam.includes("onboarding")) {
    return "customer success";
  }
  if (normalizedTeam.includes("finance")) return "finance ops";
  if (normalizedTeam.includes("support")) return "support";
  if (normalizedTeam.includes("recruiting") || normalizedTeam.includes("talent")) return "recruiting";
  if (normalizedTeam.includes("operations")) return "operations";
  return "unknown";
}

function getTools(signalText: string) {
  return Array.from(
    new Set(
      Object.entries(TOOL_PATTERNS)
        .filter(([keyword]) => signalText.includes(keyword))
        .map(([, label]) => label),
    ),
  );
}

function inferCompanySize(tools: string[]): CompanySizeEstimate {
  const enterpriseTools = ["NetSuite", "Salesforce", "Workday", "ServiceNow"].filter((tool) =>
    tools.includes(tool),
  );
  if (enterpriseTools.length > 0) {
    return {
      estimate: "500+ employees",
      confidence: Math.min(95, 78 + enterpriseTools.length * 6),
      matchedSignals: enterpriseTools,
    };
  }

  const midMarketTools = ["HubSpot", "Zendesk", "Greenhouse"].filter((tool) => tools.includes(tool));
  if (midMarketTools.length > 0) {
    return {
      estimate: "100-1000 employees",
      confidence: Math.min(90, 74 + midMarketTools.length * 5),
      matchedSignals: midMarketTools,
    };
  }

  const smbTools = ["Airtable", "Google Sheets", "Slack"].filter((tool) => tools.includes(tool));
  const sheetsOnly = tools.length === 1 && tools.includes("Google Sheets");
  if (smbTools.length > 0 || sheetsOnly) {
    return {
      estimate: "50-500 employees",
      confidence: Math.min(84, 66 + smbTools.length * 5),
      matchedSignals: smbTools,
    };
  }

  return {
    estimate: "50-500 employees",
    confidence: 45,
    matchedSignals: [],
  };
}

function inferIndustries(signalText: string, tools: string[], mapping: ICPMapping): RankedIndustry[] {
  const industries: RankedIndustry[] = [];
  const add = (industry: string, confidence: number) => {
    if (!industries.some((candidate) => candidate.industry === industry)) {
      industries.push({ industry, confidence });
    }
  };

  if (tools.includes("Stripe") && tools.includes("NetSuite")) {
    add("SaaS", 90);
    add("Fintech", 82);
    add("Marketplace", 74);
  }

  if (tools.includes("Salesforce") && signalText.includes("customer success")) {
    add("SaaS", 88);
  }

  if (tools.includes("Greenhouse") && signalText.includes("linkedin")) {
    add("Technology companies", 86);
    add("Recruiting-intensive businesses", 78);
  }

  if (tools.includes("Zendesk")) {
    add("Customer-support-heavy businesses", 84);
  }

  if (tools.includes("HubSpot") || tools.includes("Salesforce")) {
    add("B2B SaaS", 76);
  }

  if (industries.length === 0) {
    add(mapping.fallbackIndustry, 58);
  }

  return industries.sort((left, right) => right.confidence - left.confidence);
}

function generateTriggerEvent(teamKey: string, signalText: string) {
  if (teamKey === "finance ops") {
    if (signalText.includes("month-end") || signalText.includes("month end")) return "Month-end close delays";
    if (signalText.includes("audit")) return "Audit preparation";
    if (signalText.includes("transaction volume") || signalText.includes("volume")) {
      return "Transaction volume growth";
    }
    return "Month-end close delays";
  }

  if (teamKey === "sales ops") {
    if (signalText.includes("forecast")) return "Forecast accuracy concerns";
    return "Revenue reporting issues";
  }

  if (teamKey === "customer success") {
    if (signalText.includes("churn")) return "Churn risk reviews";
    return "Renewal visibility problems";
  }

  if (teamKey === "recruiting") {
    if (signalText.includes("volume")) return "Hiring volume increase";
    return "Recruiting bottlenecks";
  }

  if (teamKey === "support") {
    if (/\bslas?\b/i.test(signalText)) return "SLA misses";
    return "Escalation backlog";
  }

  if (teamKey === "operations") {
    if (signalText.includes("compliance")) return "Compliance reporting deadlines";
    return "Cross-system reporting complexity";
  }

  return "Cross-system reporting complexity";
}

function hasPainCategory(signalText: string) {
  return [
    "reconciliation",
    "forecast",
    "renewal",
    "churn",
    "candidate",
    "interview",
    "escalation",
    "ticket",
    "compliance",
    "reporting",
    "workflow",
    "bottleneck",
  ].some((keyword) => signalText.includes(keyword));
}

function calculateICPConfidence({
  teamKey,
  tools,
  hasPain,
  triggerEvent,
  mapping,
}: {
  teamKey: string;
  tools: string[];
  hasPain: boolean;
  triggerEvent: string;
  mapping: ICPMapping;
}) {
  let confidence = 40;

  if (teamKey !== "unknown") confidence += 24;
  if (tools.length > 0) confidence += Math.min(18, tools.length * 6);
  if (hasPain) confidence += 12;
  if (triggerEvent) confidence += 8;
  if (mapping.buyer) confidence += 8;

  if (teamKey === "unknown") confidence = Math.min(confidence, 75);
  if (tools.length === 0 && !hasPain) confidence = Math.min(confidence, 60);

  return Math.max(0, Math.min(100, confidence));
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
  const teamKey = getTeamKey(signal.affectedTeam);
  const signalText = getSignalText(signal);
  const tools = getTools(signalText);
  const companySize = inferCompanySize(tools);
  const rankedIndustries = inferIndustries(signalText, tools, mapping);
  const triggerEvent = generateTriggerEvent(teamKey, signalText);
  const icpConfidence = calculateICPConfidence({
    teamKey,
    tools,
    hasPain: hasPainCategory(signalText),
    triggerEvent,
    mapping,
  });

  return {
    target_titles: mapping.candidates.map((candidate) => candidate.title),
    company_size: companySize.estimate,
    industry: rankedIndustries[0]?.industry ?? mapping.fallbackIndustry,
    buyer: mapping.buyer,
    budget_owner: mapping.budget_owner,
    trigger_event: triggerEvent,
    outreach_angle_refined: refineOutreachAngle(signal, mapping),
    icp_candidates: mapping.candidates,
    ranked_industries: rankedIndustries,
    company_size_confidence: companySize.confidence,
    company_size_signals: companySize.matchedSignals,
    icp_confidence: icpConfidence,
    why_this_buyer: mapping.whyThisBuyer,
  };
}
