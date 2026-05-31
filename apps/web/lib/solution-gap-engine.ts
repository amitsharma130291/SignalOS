export type AutomationPotential = "Low" | "Medium" | "High";

export type SolutionGapAnalysisInput = {
  rawText?: string | null;
  pain?: string | null;
  affectedTeam?: string | null;
  currentSolution?: string | null;
  solutionGap?: string | null;
};

export type SolutionGapAnalysis = {
  currentSolution: string;
  failureModes: string[];
  rootCause: string;
  businessImpact: string;
  automationPotential: AutomationPotential;
};

const TOOL_PATTERNS: Record<string, string> = {
  stripe: "Stripe",
  netsuite: "NetSuite",
  salesforce: "Salesforce",
  hubspot: "HubSpot",
  airtable: "Airtable",
  slack: "Slack",
  linkedin: "LinkedIn",
  greenhouse: "Greenhouse",
  zendesk: "Zendesk",
  email: "Email",
  spreadsheet: "Spreadsheets",
  spreadsheets: "Spreadsheets",
  "internal systems": "Internal systems",
  "six internal systems": "Internal systems",
  "several systems": "Internal systems",
};

const UNKNOWN_ANALYSIS: SolutionGapAnalysis = {
  currentSolution: "Unknown",
  failureModes: [],
  rootCause: "No clear operational workflow detected.",
  businessImpact: "No clear business impact detected.",
  automationPotential: "Low",
};

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function isUnknown(value?: string | null) {
  const normalized = normalize(value);
  return !normalized || normalized === "unknown";
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function getCombinedText(input: SolutionGapAnalysisInput) {
  return [input.rawText, input.pain, input.affectedTeam, input.currentSolution, input.solutionGap]
    .map((value) => normalize(value))
    .filter(Boolean)
    .join(" ");
}

function inferCurrentSolution(input: SolutionGapAnalysisInput, text: string) {
  if (!isUnknown(input.currentSolution)) return input.currentSolution?.trim() ?? "Unknown";

  const tools = unique(
    Object.entries(TOOL_PATTERNS)
      .filter(([keyword]) => text.includes(keyword))
      .map(([, label]) => label),
  );

  return tools.length ? tools.join(" + ") : "Unknown";
}

function getTeam(input: SolutionGapAnalysisInput, text: string) {
  const team = normalize(input.affectedTeam);
  if (team.includes("finance")) return "finance";
  if (team.includes("sales")) return "sales";
  if (team.includes("customer success")) return "customer-success";
  if (team.includes("recruiting")) return "recruiting";
  if (team.includes("support")) return "support";
  if (team.includes("operations")) return "operations";

  if (text.includes("stripe") || text.includes("netsuite") || text.includes("reconciliation")) {
    return "finance";
  }
  if (text.includes("forecast") || text.includes("hubspot") || text.includes("salesforce")) {
    return "sales";
  }
  if (text.includes("renewal") || text.includes("customer health")) return "customer-success";
  if (text.includes("candidate") || text.includes("greenhouse")) return "recruiting";
  if (text.includes("zendesk") || text.includes("escalation")) return "support";
  if (text.includes("compliance") || text.includes("audit")) return "operations";

  return "unknown";
}

function hasOperationalWorkflow(text: string, currentSolution: string) {
  return (
    !isUnknown(currentSolution) ||
    [
      "manual",
      "spreadsheet",
      "reconciliation",
      "forecast",
      "renewal",
      "candidate",
      "escalation",
      "compliance",
      "audit",
      "reporting",
    ].some((term) => text.includes(term))
  );
}

function getFailureModes(team: string): string[] {
  if (team === "finance") {
    return ["reconciliation mismatches", "exception tracking work", "reporting delays"];
  }
  if (team === "sales") {
    return ["forecast inaccuracies", "manual reconciliation", "inconsistent reporting"];
  }
  if (team === "customer-success") {
    return ["renewal visibility gaps", "manual record cleanup", "customer health inconsistencies"];
  }
  if (team === "recruiting") {
    return ["candidate status drift", "interview feedback bottlenecks", "scheduling delays"];
  }
  if (team === "support") {
    return ["ownership ambiguity", "escalation tracking gaps", "missed escalations"];
  }
  if (team === "operations") {
    return ["spreadsheet consolidation work", "reporting delays", "audit preparation bottlenecks"];
  }

  return [];
}

function getRootCause(team: string) {
  if (team === "finance") return "Data spread across finance systems and spreadsheets.";
  if (team === "sales") return "Forecast data lives across multiple sales systems.";
  if (team === "customer-success") return "Customer information is fragmented across tools.";
  if (team === "recruiting") return "Candidate workflow spans disconnected recruiting systems.";
  if (team === "support") return "Escalation ownership is not tracked in a single system.";
  if (team === "operations") {
    return "Compliance reporting requires manual consolidation across systems.";
  }

  return UNKNOWN_ANALYSIS.rootCause;
}

function getBusinessImpact(team: string) {
  if (team === "finance") return "Month-end close delays and reporting risk.";
  if (team === "sales") return "Reduced forecast accuracy and slower decision making.";
  if (team === "customer-success") return "Renewal risk and reduced customer visibility.";
  if (team === "recruiting") return "Slower hiring process and poor candidate experience.";
  if (team === "support") return "Longer response times and missed escalations.";
  if (team === "operations") return "Audit preparation delays and reporting inefficiency.";

  return UNKNOWN_ANALYSIS.businessImpact;
}

function getAutomationPotential(team: string, text: string, currentSolution: string): AutomationPotential {
  if (!hasOperationalWorkflow(text, currentSolution)) return "Low";

  if (team === "finance" || team === "sales" || team === "operations") return "High";
  if (team === "customer-success" || team === "recruiting" || team === "support") return "Medium";

  if (
    text.includes("spreadsheet") ||
    text.includes("manual reconciliation") ||
    text.includes("multiple systems") ||
    text.includes("reporting")
  ) {
    return "High";
  }

  if (
    text.includes("coordination") ||
    text.includes("approval") ||
    text.includes("onboarding") ||
    text.includes("candidate")
  ) {
    return "Medium";
  }

  return "Low";
}

export function generateSolutionGapAnalysis(
  input: SolutionGapAnalysisInput,
): SolutionGapAnalysis {
  const text = getCombinedText(input);
  const currentSolution = inferCurrentSolution(input, text);

  if (!hasOperationalWorkflow(text, currentSolution)) return UNKNOWN_ANALYSIS;

  const team = getTeam(input, text);
  const failureModes = getFailureModes(team);

  if (failureModes.length === 0) {
    return {
      currentSolution,
      failureModes: ["manual coordination", "visibility gaps"],
      rootCause: "Workflow context is too sparse to isolate a specific system failure.",
      businessImpact: "Operational follow-up may slow down execution.",
      automationPotential: getAutomationPotential(team, text, currentSolution),
    };
  }

  return {
    currentSolution,
    failureModes,
    rootCause: getRootCause(team),
    businessImpact: getBusinessImpact(team),
    automationPotential: getAutomationPotential(team, text, currentSolution),
  };
}
