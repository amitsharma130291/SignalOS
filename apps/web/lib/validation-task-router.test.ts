import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ActivationDecision } from "./activation-decision.ts";
import type { QualificationMilestone } from "./opportunity-readiness.ts";
import {
  buildValidationTaskViewModel,
  calculateValidationProgress,
  generateValidationTasks,
  shouldShowValidationTaskSection,
  type ValidationTask,
} from "./validation-task-router.ts";

const CREATED_AT = "2026-06-02T00:00:00.000Z";

function blocker(
  name: QualificationMilestone["name"],
  blockerLabel: string,
  trustState: QualificationMilestone["trustState"] = "missing",
): Pick<QualificationMilestone, "name" | "blockerLabel" | "trustState"> {
  return {
    name,
    blockerLabel,
    trustState,
  };
}

function tasksFor({
  activationDecision = "VALIDATE",
  blockers = [],
  completedTaskIds = [],
}: {
  activationDecision?: ActivationDecision;
  blockers?: Pick<QualificationMilestone, "name" | "blockerLabel" | "trustState">[];
  completedTaskIds?: string[];
} = {}) {
  return generateValidationTasks({
    opportunityId: "opp-1",
    activationDecision,
    blockers,
    completedTaskIds,
    createdAt: CREATED_AT,
  });
}

function titles(tasks: ValidationTask[]) {
  return tasks.map((task) => task.title);
}

describe("generateValidationTasks blocker mappings", () => {
  it("generates high-priority economic validation tasks", () => {
    const tasks = tasksFor({
      blockers: [blocker("Economic Case", "Economic Validation Required", "inferred")],
    });

    assert.deepEqual(titles(tasks), [
      "Quantify manual effort spent on workflow",
      "Estimate financial impact",
      "Validate business impact with evidence",
    ]);
    assert.ok(tasks.every((task) => task.priority === "high"));
    assert.ok(tasks.every((task) => task.taskType === "validation"));
  });

  it("maps economic case inferred to economic validation tasks", () => {
    const tasks = tasksFor({
      blockers: [blocker("Economic Case", "Economic Case Inferred", "inferred")],
    });

    assert.equal(tasks[0].title, "Quantify manual effort spent on workflow");
  });

  it("generates high-priority buyer path tasks", () => {
    const tasks = tasksFor({
      blockers: [blocker("Buyer Path", "Buyer Path Unverified")],
    });

    assert.deepEqual(titles(tasks), [
      "Identify decision maker",
      "Identify champion",
      "Validate purchasing workflow",
    ]);
    assert.ok(tasks.every((task) => task.priority === "high"));
  });

  it("maps buyer path missing to buyer path tasks", () => {
    const tasks = tasksFor({
      blockers: [blocker("Buyer Path", "Buyer Path Missing")],
    });

    assert.equal(tasks[0].title, "Identify decision maker");
  });

  it("generates budget owner tasks", () => {
    const tasks = tasksFor({
      blockers: [blocker("Economic Case", "Budget Owner Missing")],
    });

    assert.deepEqual(titles(tasks), ["Identify budget owner", "Validate purchasing authority"]);
    assert.ok(tasks.every((task) => task.priority === "high"));
  });

  it("generates medium-priority frequency tasks", () => {
    const tasks = tasksFor({
      blockers: [blocker("Workflow", "Frequency Unknown")],
    });

    assert.deepEqual(titles(tasks), [
      "Determine workflow cadence",
      "Validate occurrence frequency",
    ]);
    assert.ok(tasks.every((task) => task.priority === "medium"));
  });

  it("generates business impact weak tasks", () => {
    const tasks = tasksFor({
      blockers: [blocker("Business Impact", "Business Impact Weak")],
    });

    assert.deepEqual(titles(tasks), ["Gather supporting evidence", "Validate operational impact"]);
    assert.ok(tasks.every((task) => task.priority === "medium"));
  });

  it("generates trust-state missing fallback tasks", () => {
    const tasks = tasksFor({
      blockers: [blocker("Pain Owner", "Pain Owner Unverified", "missing")],
    });

    assert.deepEqual(titles(tasks), [
      "Collect supporting evidence",
      "Verify inferred qualification signal",
    ]);
    assert.ok(tasks.every((task) => task.priority === "medium"));
  });

  it("sets deterministic task metadata", () => {
    const [task] = tasksFor({
      blockers: [blocker("Buyer Path", "Buyer Path Missing")],
    });

    assert.equal(
      task.id,
      "opp-1:buyer-path-missing:identify-decision-maker:0",
    );
    assert.equal(task.opportunityId, "opp-1");
    assert.equal(task.status, "pending");
    assert.equal(task.blockerSource, "Buyer Path Missing");
    assert.equal(task.createdAt, CREATED_AT);
  });
});

describe("generateValidationTasks activation integration", () => {
  it("returns no tasks for ENGAGE", () => {
    assert.deepEqual(
      tasksFor({
        activationDecision: "ENGAGE",
        blockers: [blocker("Economic Case", "Economic Case Inferred", "inferred")],
      }),
      [],
    );
  });

  it("returns blocker-derived tasks for VALIDATE", () => {
    const tasks = tasksFor({
      activationDecision: "VALIDATE",
      blockers: [blocker("Buyer Path", "Buyer Path Missing")],
    });

    assert.equal(tasks.length, 3);
    assert.equal(tasks[0].blockerSource, "Buyer Path Missing");
  });

  it("returns research-only tasks for MONITOR", () => {
    const tasks = tasksFor({
      activationDecision: "MONITOR",
      blockers: [blocker("Buyer Path", "Buyer Path Missing")],
    });

    assert.deepEqual(titles(tasks), [
      "Monitor account activity",
      "Research additional qualification signals",
    ]);
    assert.ok(tasks.every((task) => task.taskType === "research"));
  });

  it("returns no tasks for IGNORE", () => {
    assert.deepEqual(
      tasksFor({
        activationDecision: "IGNORE",
        blockers: [blocker("Buyer Path", "Buyer Path Missing")],
      }),
      [],
    );
  });

  it("returns founder-review tasks for ESCALATE", () => {
    const tasks = tasksFor({
      activationDecision: "ESCALATE",
      blockers: [blocker("Economic Case", "Economic Case Missing")],
    });

    assert.deepEqual(titles(tasks), [
      "Review opportunity with founder",
      "Resolve contradictory evidence",
    ]);
    assert.ok(tasks.every((task) => task.taskType === "founder"));
    assert.ok(tasks.every((task) => task.priority === "high"));
  });
});

describe("calculateValidationProgress", () => {
  it("returns 0% for no tasks", () => {
    assert.deepEqual(calculateValidationProgress([]), {
      totalTasks: 0,
      completedTasks: 0,
      completionPercent: 0,
    });
  });

  it("calculates partial completion", () => {
    const tasks = tasksFor({
      blockers: [blocker("Buyer Path", "Buyer Path Missing")],
    });
    const updatedTasks = tasks.map((task, index) => ({
      ...task,
      status: index === 0 ? ("completed" as const) : task.status,
    }));

    assert.deepEqual(calculateValidationProgress(updatedTasks), {
      totalTasks: 3,
      completedTasks: 1,
      completionPercent: 33,
    });
  });

  it("calculates 100% completion", () => {
    const tasks = tasksFor({
      blockers: [blocker("Workflow", "Frequency Unknown")],
    }).map((task) => ({
      ...task,
      status: "completed" as const,
    }));

    assert.deepEqual(calculateValidationProgress(tasks), {
      totalTasks: 2,
      completedTasks: 2,
      completionPercent: 100,
    });
  });

  it("marks tasks completed from completedTaskIds", () => {
    const pendingTasks = tasksFor({
      blockers: [blocker("Workflow", "Frequency Unknown")],
    });
    const completedTasks = tasksFor({
      blockers: [blocker("Workflow", "Frequency Unknown")],
      completedTaskIds: [pendingTasks[0].id],
    });

    assert.equal(completedTasks[0].status, "completed");
    assert.equal(completedTasks[1].status, "pending");
  });
});

describe("buildValidationTaskViewModel", () => {
  it("returns UI empty state when no tasks render", () => {
    const viewModel = buildValidationTaskViewModel([]);

    assert.equal(viewModel.hasTasks, false);
    assert.equal(viewModel.emptyState, "All qualification requirements have been satisfied.");
    assert.equal(viewModel.progressLabel, "No validation tasks required");
  });

  it("groups tasks by priority for rendering", () => {
    const tasks = tasksFor({
      blockers: [
        blocker("Buyer Path", "Buyer Path Missing"),
        blocker("Workflow", "Frequency Unknown"),
      ],
    });
    const viewModel = buildValidationTaskViewModel(tasks);

    assert.equal(viewModel.hasTasks, true);
    assert.deepEqual(
      viewModel.groups.map((group) => group.priority),
      ["high", "medium"],
    );
  });

  it("provides completed rendering state", () => {
    const tasks = tasksFor({
      blockers: [blocker("Workflow", "Frequency Unknown")],
    }).map((task) => ({
      ...task,
      status: "completed" as const,
    }));
    const viewModel = buildValidationTaskViewModel(tasks);

    assert.equal(viewModel.progressLabel, "2 / 2 Tasks Complete");
    assert.equal(viewModel.progress.completionPercent, 100);
    assert.ok(viewModel.groups[0].tasks.every((task) => task.status === "completed"));
  });

  it("exposes priority groups needed for priority badges", () => {
    const viewModel = buildValidationTaskViewModel(
      tasksFor({
        blockers: [blocker("Economic Case", "Economic Validation Required")],
      }),
    );

    assert.equal(viewModel.groups[0].priority, "high");
    assert.equal(viewModel.groups[0].tasks[0].priority, "high");
  });
});

describe("shouldShowValidationTaskSection", () => {
  it("hides the section for fully ready ENGAGE opportunities", () => {
    assert.equal(
      shouldShowValidationTaskSection({
        activationDecision: "ENGAGE",
        taskCount: 0,
        blockerCount: 0,
      }),
      false,
    );
  });

  it("shows the section for ENGAGE when tasks exist", () => {
    assert.equal(
      shouldShowValidationTaskSection({
        activationDecision: "ENGAGE",
        taskCount: 1,
        blockerCount: 0,
      }),
      true,
    );
  });

  it("shows the section for ENGAGE when blockers exist", () => {
    assert.equal(
      shouldShowValidationTaskSection({
        activationDecision: "ENGAGE",
        taskCount: 0,
        blockerCount: 1,
      }),
      true,
    );
  });

  it("shows the section for VALIDATE", () => {
    assert.equal(
      shouldShowValidationTaskSection({
        activationDecision: "VALIDATE",
        taskCount: 3,
        blockerCount: 1,
      }),
      true,
    );
  });

  it("shows the section for MONITOR", () => {
    assert.equal(
      shouldShowValidationTaskSection({
        activationDecision: "MONITOR",
        taskCount: 2,
        blockerCount: 0,
      }),
      true,
    );
  });

  it("shows the section for ESCALATE", () => {
    assert.equal(
      shouldShowValidationTaskSection({
        activationDecision: "ESCALATE",
        taskCount: 2,
        blockerCount: 0,
      }),
      true,
    );
  });

  it("keeps IGNORE visible if blockers or tasks are present", () => {
    assert.equal(
      shouldShowValidationTaskSection({
        activationDecision: "IGNORE",
        taskCount: 0,
        blockerCount: 1,
      }),
      true,
    );
  });
});
