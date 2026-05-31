export type BuyerMappingInput = {
  narrative?: string | null;
  pain?: string | null;
  affectedTeam?: string | null;
  currentSolution?: string | null;
  solutionGap?: string | null;
  businessImpact?: string | null;
};

export type DecisionMap = {
  suffers: string | null;
  champion: string | null;
  buyer: string | null;
  pays: string | null;
  economicBuyer: string | null;
};

export type BuyerMapping = {
  user: string;
  buyer: string;
  champion: string;
  economicOwner: string;
  department: string;
  companySizeFit: string[];
  buyerClarityScore: number;
  buyerClarityReasons: string[];
  buyingCommittee: string[];
  decisionMap: DecisionMap;
};

type Department =
  | "Finance"
  | "Operations"
  | "Sales Operations"
  | "Customer Success"
  | "Support"
  | "Recruiting"
  | "General Operations";

const UNKNOWN = "Unknown";

const DEPARTMENT_SIGNALS: Record<Department, string[]> = {
  Finance: [
    "finance",
    "stripe",
    "netsuite",
    "reconcile",
    "reconciliation",
    "payout",
    "month-end close",
    "month end close",
    "controller",
    "cfo",
  ],
  Operations: ["operations", "compliance", "audit", "reporting", "internal systems"],
  "Sales Operations": [
    "sales ops",
    "sales operations",
    "revops",
    "forecast",
    "salesforce",
    "hubspot",
    "pipeline",
  ],
  "Customer Success": ["customer success", "renewal", "renewals", "csm", "handoff"],
  Support: ["support", "ticket", "tickets", "triage", "zendesk", "escalation", "escalations"],
  Recruiting: ["recruiting", "candidate", "interview", "greenhouse", "applicant"],
  "General Operations": ["workflow", "spreadsheet", "manual", "handoff"],
};

const ROLE_SIGNALS = {
  dailyOperator: ["analyst", "manager", "lead", "ops", "operator", "coordinator"],
  approval: ["controller", "head", "director", "vp", "manager", "owner"],
  economicOwner: ["cfo", "coo", "vp", "chief", "budget"],
};

const ENTERPRISE_SYSTEMS = [
  "netsuite",
  "salesforce",
  "zendesk",
  "workday",
  "greenhouse",
  "hubspot",
  "internal systems",
];

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function hasAny(text: string, terms: readonly string[]) {
  return terms.some((term) => text.includes(term));
}

function addReason(reasons: string[], reason: string) {
  if (!reasons.includes(reason)) reasons.push(reason);
}

function clampScore(score: number) {
  return Math.max(0, Math.min(10, score));
}

function getAnalysisText(input: BuyerMappingInput) {
  return [
    input.narrative,
    input.pain,
    input.affectedTeam,
    input.currentSolution,
    input.solutionGap,
    input.businessImpact,
  ]
    .map(normalize)
    .filter(Boolean)
    .join(" ");
}

function inferDepartment(input: BuyerMappingInput, text: string): Department {
  const affectedTeam = normalize(input.affectedTeam);

  for (const department of Object.keys(DEPARTMENT_SIGNALS) as Department[]) {
    if (affectedTeam.includes(department.toLowerCase())) {
      return department;
    }
  }

  let bestDepartment: Department = "General Operations";
  let bestScore = 0;
  for (const [department, signals] of Object.entries(DEPARTMENT_SIGNALS) as [
    Department,
    string[],
  ][]) {
    const score = signals.filter((signal) => text.includes(signal)).length;
    if (score > bestScore) {
      bestScore = score;
      bestDepartment = department;
    }
  }

  return bestDepartment;
}

function inferUser(department: Department, text: string) {
  if (department === "Finance") {
    if (text.includes("analyst") || hasAny(text, ["export", "reconcile", "payout"])) {
      return "Finance Analyst";
    }
    return "Finance Ops Manager";
  }

  if (department === "Operations") return "Operations Manager";
  if (department === "Sales Operations") return "Sales Operations Manager";
  if (department === "Customer Success") return "Customer Success Manager";
  if (department === "Support") return "Support Manager";
  if (department === "Recruiting") return "Recruiting Coordinator";

  return hasAny(text, ROLE_SIGNALS.dailyOperator) ? "Operations Manager" : UNKNOWN;
}

function inferBuyer(department: Department, text: string) {
  if (department === "Finance") {
    if (hasAny(text, ["close", "netsuite", "reconciliation", "reporting"])) return "Controller";
    return "Finance Manager";
  }

  if (department === "Operations") {
    if (hasAny(text, ["compliance", "audit", "reporting"])) return "Head of Operations";
    return "Operations Manager";
  }

  if (department === "Sales Operations") {
    if (hasAny(text, ["forecast", "pipeline", "salesforce", "hubspot"])) return "RevOps Manager";
    return "Sales Operations Manager";
  }

  if (department === "Customer Success") {
    if (hasAny(text, ["renewal", "handoff", "customer"])) return "Head of Customer Success";
    return "Customer Success Manager";
  }

  if (department === "Recruiting") return "Head of Recruiting";

  return UNKNOWN;
}

function inferChampion(department: Department, text: string) {
  if (department === "Finance") return "Finance Manager";
  if (department === "Operations") return "Operations Manager";
  if (department === "Sales Operations") return "Sales Operations Lead";
  if (department === "Customer Success") return "Customer Success Ops Manager";
  if (department === "Support") return "Support Lead";
  if (department === "Recruiting") return "Recruiting Manager";

  return hasAny(text, ROLE_SIGNALS.dailyOperator) ? "Operations Lead" : UNKNOWN;
}

function inferEconomicOwner(department: Department, text: string) {
  if (department === "Finance" && hasAny(text, ["close", "revenue", "audit", "netsuite"])) {
    return "CFO";
  }

  if (department === "Operations" && hasAny(text, ["coo", "budget owner", "compliance", "audit"])) {
    return "COO";
  }

  if (department === "Sales Operations" && hasAny(text, ["vp revenue", "chief revenue", "cro"])) {
    return "VP Revenue";
  }

  if (department === "Customer Success" && hasAny(text, ["vp customer success", "chief customer"])) {
    return "VP Customer Success";
  }

  return UNKNOWN;
}

function inferCompanySizeFit(text: string) {
  if (hasAny(text, ENTERPRISE_SYSTEMS) || hasAny(text, ["compliance", "audit", "forecast"])) {
    return ["Mid Market", "Enterprise"];
  }

  if (hasAny(text, ["spreadsheet", "manual"])) {
    return ["SMB", "Mid Market"];
  }

  return ["Mid Market"];
}

function scoreBuyerClarity(
  mapping: Omit<
    BuyerMapping,
    "buyerClarityScore" | "buyerClarityReasons" | "buyingCommittee" | "decisionMap"
  >,
) {
  const reasons: string[] = [];
  let score = 0;

  if (mapping.user !== UNKNOWN) {
    score += 3;
    addReason(reasons, "Clear user");
  } else {
    addReason(reasons, "User unclear");
  }

  if (mapping.buyer !== UNKNOWN) {
    score += 3;
    addReason(reasons, "Buyer inferred from workflow ownership");
  } else {
    addReason(reasons, "Buyer uncertain");
  }

  if (mapping.champion !== UNKNOWN) {
    score += 2;
    addReason(reasons, "Clear champion");
  } else {
    addReason(reasons, "Champion unclear");
  }

  if (mapping.economicOwner !== UNKNOWN) {
    score += 2;
    addReason(reasons, "Clear budget owner");
  } else {
    addReason(reasons, "Economic owner uncertain");
  }

  if (mapping.department !== "General Operations") {
    addReason(reasons, "Clear department");
  }

  return {
    buyerClarityScore: clampScore(score),
    buyerClarityReasons: reasons,
  };
}

function isRoleTitle(value: string) {
  if (!value || value === UNKNOWN) return false;

  const roleTerms = [
    "Analyst",
    "Controller",
    "Coordinator",
    "CFO",
    "COO",
    "CRO",
    "Customer",
    "Finance",
    "Head",
    "Lead",
    "Manager",
    "Operations",
    "Recruiting",
    "Revenue",
    "RevOps",
    "Sales",
    "Success",
    "Support",
    "VP",
  ];
  const words = value.trim().split(/\s+/);
  if (words.length === 1 && !roleTerms.includes(value)) return false;

  return (
    words.every((word) => word === "of" || /^[A-Z][A-Za-z]+$|^[A-Z]{2,}$/.test(word)) &&
    words.some((word) => roleTerms.includes(word))
  );
}

function buildBuyingCommittee(
  mapping: Omit<
    BuyerMapping,
    "buyerClarityScore" | "buyerClarityReasons" | "buyingCommittee" | "decisionMap"
  >,
) {
  const roles = [mapping.user, mapping.champion, mapping.buyer, mapping.economicOwner];
  const committee: string[] = [];

  for (const role of roles) {
    if (!isRoleTitle(role) || committee.includes(role)) continue;
    committee.push(role);
    if (committee.length === 5) break;
  }

  return committee;
}

function buildDecisionMap(
  mapping: Omit<
    BuyerMapping,
    "buyerClarityScore" | "buyerClarityReasons" | "buyingCommittee" | "decisionMap"
  >,
): DecisionMap {
  const economicBuyer =
    mapping.department === "Finance" || mapping.department === "Operations"
      ? mapping.economicOwner
      : UNKNOWN;

  return {
    suffers: mapping.user,
    champion: mapping.champion,
    buyer: mapping.buyer,
    pays: economicBuyer,
    economicBuyer,
  };
}

export function generateBuyerMapping(input: BuyerMappingInput): BuyerMapping {
  const text = getAnalysisText(input);
  const department = inferDepartment(input, text);
  const baseMapping = {
    user: inferUser(department, text),
    buyer: inferBuyer(department, text),
    champion: inferChampion(department, text),
    economicOwner: inferEconomicOwner(department, text),
    department,
    companySizeFit: inferCompanySizeFit(text),
  };
  const clarity = scoreBuyerClarity(baseMapping);
  const buyingCommittee = buildBuyingCommittee(baseMapping);
  const decisionMap = buildDecisionMap(baseMapping);

  return {
    ...baseMapping,
    ...clarity,
    buyingCommittee,
    decisionMap,
  };
}
