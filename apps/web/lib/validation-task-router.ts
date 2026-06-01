import type { ActivationDecision } from "./activation-decision.ts";
import type { QualificationMilestone } from "./opportunity-readiness.ts";

export type ValidationTaskType = "validation" | "research" | "founder" | "sdr";
export type ValidationTaskPriority = "high" | "medium" | "low";
export type ValidationTaskStatus = "pending" | "completed";

export type ValidationTask = {
  id: string;
  opportunityId: string;
  title: string;
  description: string;
  taskType: ValidationTaskType;
  priority: ValidationTaskPriority;
  status: ValidationTaskStatus;
  blockerSource: string;
  generatedReason: string;
  createdAt: string;
};

export type ValidationProgress = {
  totalTasks: number;
  completedTasks: number;
  completionPercent: number;
};

export type ValidationTaskRouterInput = {
  opportunityId: string;
  activationDecision: ActivationDecision;
  blockers: Pick<QualificationMilestone, "name" | "blockerLabel" | "trustState">[];
  completedTaskIds?: string[];
  createdAt?: string;
};

export type ValidationTaskGroup = {
  priority: ValidationTaskPriority;
  tasks: ValidationTask[];
};

export type ValidationTaskViewModel = {
  hasTasks: boolean;
  emptyState: string;
  progressLabel: string;
  progress: ValidationProgress;
  groups: ValidationTaskGroup[];
};

type TaskTemplate = {
  title: string;
  description: string;
  taskType: ValidationTaskType;
  priority: ValidationTaskPriority;
  generatedReason: string;
};

const DEFAULT_CREATED_AT = "1970-01-01T00:00:00.000Z";

const ECONOMIC_VALIDATION_TASKS: TaskTemplate[] = [
  {
    title: "Quantify manual effort spent on workflow",
    description: "Estimate the time or effort currently spent handling this workflow manually.",
    taskType: "validation",
    priority: "high",
    generatedReason: "Economic validation requires quantified effort evidence.",
  },
  {
    title: "Estimate financial impact",
    description: "Translate the workflow pain into a cost, revenue, risk, or efficiency impact.",
    taskType: "validation",
    priority: "high",
    generatedReason: "Economic validation requires financial impact evidence.",
  },
  {
    title: "Validate business impact with evidence",
    description: "Attach concrete evidence that the business impact is real and material.",
    taskType: "validation",
    priority: "high",
    generatedReason: "Economic validation requires supporting business-impact proof.",
  },
];

const BUYER_PATH_TASKS: TaskTemplate[] = [
  {
    title: "Identify decision maker",
    description: "Find the person responsible for approving or rejecting a solution.",
    taskType: "sdr",
    priority: "high",
    generatedReason: "Buyer path validation requires a decision maker.",
  },
  {
    title: "Identify champion",
    description: "Find the operator or manager most likely to advocate for solving the pain.",
    taskType: "sdr",
    priority: "high",
    generatedReason: "Buyer path validation requires a likely internal champion.",
  },
  {
    title: "Validate purchasing workflow",
    description: "Confirm how this team evaluates and purchases tools for this workflow.",
    taskType: "validation",
    priority: "high",
    generatedReason: "Buyer path validation requires purchase-process evidence.",
  },
];

const BUDGET_OWNER_TASKS: TaskTemplate[] = [
  {
    title: "Identify budget owner",
    description: "Find the person or role that owns budget for this workflow.",
    taskType: "sdr",
    priority: "high",
    generatedReason: "Budget validation requires a budget owner.",
  },
  {
    title: "Validate purchasing authority",
    description: "Confirm whether the budget owner can approve or sponsor a purchase.",
    taskType: "validation",
    priority: "high",
    generatedReason: "Budget validation requires purchasing authority evidence.",
  },
];

const FREQUENCY_TASKS: TaskTemplate[] = [
  {
    title: "Determine workflow cadence",
    description: "Identify whether the workflow occurs daily, weekly, monthly, or ad hoc.",
    taskType: "research",
    priority: "medium",
    generatedReason: "Workflow validation requires cadence evidence.",
  },
  {
    title: "Validate occurrence frequency",
    description: "Confirm how often the workflow occurs with a source or operator signal.",
    taskType: "validation",
    priority: "medium",
    generatedReason: "Workflow validation requires frequency confirmation.",
  },
];

const BUSINESS_IMPACT_TASKS: TaskTemplate[] = [
  {
    title: "Gather supporting evidence",
    description: "Collect source material that shows the operational impact is real.",
    taskType: "research",
    priority: "medium",
    generatedReason: "Business impact needs supporting evidence.",
  },
  {
    title: "Validate operational impact",
    description: "Confirm how the workflow pain affects time, risk, revenue, or execution quality.",
    taskType: "validation",
    priority: "medium",
    generatedReason: "Business impact needs operational validation.",
  },
];

const TRUST_STATE_TASKS: TaskTemplate[] = [
  {
    title: "Collect supporting evidence",
    description: "Find evidence that confirms the qualification signal.",
    taskType: "research",
    priority: "medium",
    generatedReason: "Missing trust state requires supporting evidence.",
  },
  {
    title: "Verify inferred qualification signal",
    description: "Confirm whether the inferred signal is accurate enough to use.",
    taskType: "validation",
    priority: "medium",
    generatedReason: "Inferred trust state requires verification.",
  },
];

const MONITOR_TASKS: TaskTemplate[] = [
  {
    title: "Monitor account activity",
    description: "Watch for stronger evidence that the pain is active and recurring.",
    taskType: "research",
    priority: "medium",
    generatedReason: "Monitor decisions should collect additional market signals.",
  },
  {
    title: "Research additional qualification signals",
    description: "Look for evidence of business impact, buyer ownership, or workflow urgency.",
    taskType: "research",
    priority: "medium",
    generatedReason: "Monitor decisions are not ready for validation work.",
  },
];

const ESCALATE_TASKS: TaskTemplate[] = [
  {
    title: "Review opportunity with founder",
    description: "Ask a founder or analyst to review the uncertainty before GTM action.",
    taskType: "founder",
    priority: "high",
    generatedReason: "Escalated opportunities require human review.",
  },
  {
    title: "Resolve contradictory evidence",
    description: "Compare the strongest supporting and weakening evidence before outreach.",
    taskType: "founder",
    priority: "high",
    generatedReason: "Escalated opportunities need evidence reconciliation.",
  },
];

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function slugify(value: string) {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getBlockerSource(blocker: Pick<QualificationMilestone, "name" | "blockerLabel">) {
  return blocker.blockerLabel || blocker.name;
}

function getTemplatesForBlocker(
  blocker: Pick<QualificationMilestone, "name" | "blockerLabel" | "trustState">,
) {
  const blockerText = normalize(`${blocker.name} ${blocker.blockerLabel}`);

  if (blockerText.includes("budget owner")) return BUDGET_OWNER_TASKS;
  if (blockerText.includes("economic")) return ECONOMIC_VALIDATION_TASKS;
  if (blockerText.includes("buyer path")) return BUYER_PATH_TASKS;
  if (blockerText.includes("frequency") || blockerText.includes("workflow")) {
    return FREQUENCY_TASKS;
  }
  if (blockerText.includes("business impact") || blockerText.includes("impact weak")) {
    return BUSINESS_IMPACT_TASKS;
  }
  if (blocker.trustState === "missing" || blocker.trustState === "inferred") {
    return TRUST_STATE_TASKS;
  }

  return TRUST_STATE_TASKS;
}

function buildTask({
  opportunityId,
  blockerSource,
  completedTaskIds,
  createdAt,
  template,
  index,
}: {
  opportunityId: string;
  blockerSource: string;
  completedTaskIds: string[];
  createdAt: string;
  template: TaskTemplate;
  index: number;
}): ValidationTask {
  const id = `${opportunityId}:${slugify(blockerSource)}:${slugify(template.title)}:${index}`;

  return {
    id,
    opportunityId,
    title: template.title,
    description: template.description,
    taskType: template.taskType,
    priority: template.priority,
    status: completedTaskIds.includes(id) ? "completed" : "pending",
    blockerSource,
    generatedReason: template.generatedReason,
    createdAt,
  };
}

function uniqueTasks(tasks: ValidationTask[]) {
  const seenTitles = new Set<string>();

  return tasks.filter((task) => {
    const key = `${task.blockerSource}:${task.title}`;
    if (seenTitles.has(key)) return false;
    seenTitles.add(key);
    return true;
  });
}

export function calculateValidationProgress(tasks: ValidationTask[]): ValidationProgress {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.status === "completed").length;

  return {
    totalTasks,
    completedTasks,
    completionPercent: totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100),
  };
}

export function generateValidationTasks(input: ValidationTaskRouterInput): ValidationTask[] {
  const createdAt = input.createdAt ?? DEFAULT_CREATED_AT;
  const completedTaskIds = input.completedTaskIds ?? [];

  if (input.activationDecision === "ENGAGE" || input.activationDecision === "IGNORE") {
    return [];
  }

  if (input.activationDecision === "MONITOR") {
    return MONITOR_TASKS.map((template, index) =>
      buildTask({
        opportunityId: input.opportunityId,
        blockerSource: "Monitor",
        completedTaskIds,
        createdAt,
        template,
        index,
      }),
    );
  }

  if (input.activationDecision === "ESCALATE") {
    return ESCALATE_TASKS.map((template, index) =>
      buildTask({
        opportunityId: input.opportunityId,
        blockerSource: "Escalate",
        completedTaskIds,
        createdAt,
        template,
        index,
      }),
    );
  }

  return uniqueTasks(
    input.blockers.flatMap((blocker) => {
      const blockerSource = getBlockerSource(blocker);

      return getTemplatesForBlocker(blocker).map((template, index) =>
        buildTask({
          opportunityId: input.opportunityId,
          blockerSource,
          completedTaskIds,
          createdAt,
          template,
          index,
        }),
      );
    }),
  );
}

export function buildValidationTaskViewModel(tasks: ValidationTask[]): ValidationTaskViewModel {
  const progress = calculateValidationProgress(tasks);
  const priorities: ValidationTaskPriority[] = ["high", "medium", "low"];

  return {
    hasTasks: tasks.length > 0,
    emptyState: "All qualification requirements have been satisfied.",
    progressLabel:
      tasks.length === 0
        ? "No validation tasks required"
        : `${progress.completedTasks} / ${progress.totalTasks} Tasks Complete`,
    progress,
    groups: priorities
      .map((priority) => ({
        priority,
        tasks: tasks.filter((task) => task.priority === priority),
      }))
      .filter((group) => group.tasks.length > 0),
  };
}
