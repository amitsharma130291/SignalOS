"use client";

import { useMemo, useState, type ReactNode } from "react";
import { FounderConvictionEditor } from "@/components/founder-conviction-editor";
import { GenerateDraftButton } from "@/components/message-draft-actions";
import { OpportunityReviewActions } from "@/components/opportunity-review-actions";
import {
  isOpportunitySectionExpanded,
  toggleOpportunitySection,
  type OpportunitySectionId,
} from "@/lib/dashboard-section-state";
import {
  getVisibleScoreReasons,
  shouldShowScoreDetailsToggle,
} from "@/lib/dashboard-score-details";
import {
  matchesOpportunitySearch,
  type OpportunityDashboardItem,
} from "@/lib/opportunity-dashboard";
import { getTrustBadge, type TrustState } from "@/lib/evidence-trust";
import type { ReviewStatus } from "@/lib/review-status";
import {
  buildValidationTaskViewModel,
  shouldShowValidationTaskSection,
  type ValidationTaskPriority,
} from "@/lib/validation-task-router";

type OpportunityFilter =
  | "all"
  | ReviewStatus
  | "high_opportunity"
  | "needs_review";

type EvidencePackSectionId =
  | "known"
  | "validation";

const FILTERS: { id: OpportunityFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "interesting", label: "Interesting" },
  { id: "follow_up_later", label: "Follow Up Later" },
  { id: "high_opportunity", label: "High Opportunity" },
  { id: "needs_review", label: "Needs Review" },
];

const DEFAULT_OPEN_EVIDENCE_PACK_SECTIONS: EvidencePackSectionId[] = [];

function formatEvidenceCategoryLabel(label: string) {
  return label
    .replace("Workflow Evidence", "Workflow")
    .replace("System Evidence", "Systems")
    .replace("Business Evidence", "Business Impact")
    .replace("Ownership Evidence", "Ownership");
}

function formatKnownEvidenceItem(item: string) {
  return item
    .replace(" workflow cadence", " cadence")
    .replace(" appears in the current workflow", "")
    .replace(" team is affected", "")
    .replace(" delay is present", " delays")
    .replace(" workflow is present", "")
    .replace(" is part of the workflow", "");
}

function getResearchSummaryField(summary: string, field: "Problem" | "Impact" | "Unknowns") {
  const line = summary
    .split("\n")
    .find((part) => part.trim().toLowerCase().startsWith(`${field.toLowerCase()}:`));

  return line?.replace(`${field}:`, "").trim() || "Not enough evidence yet";
}

function compactProblem(item: OpportunityDashboardItem) {
  const team = item.affectedTeam === "Unknown" ? "Team" : item.affectedTeam;
  const solution = item.currentSolution === "Unknown" ? "manual workflow" : item.currentSolution;

  if (item.solutionGap.toLowerCase().includes("compliance")) {
    return "Manual compliance reporting workflow";
  }

  if (item.solutionGap.toLowerCase().includes("reconciliation")) {
    return "Manual finance reconciliation workflow";
  }

  if (item.solutionGap.toLowerCase().includes("escalation")) {
    return "Manual escalation ownership workflow";
  }

  return `${team} workflow through ${solution}`;
}

function compactImpact(item: OpportunityDashboardItem) {
  const impact = getResearchSummaryField(item.evidencePack.researchSummary, "Impact")
    .replace(" make the workflow operationally important.", "")
    .replace(" create operational risk and workflow friction.", " and operational friction")
    .replace("The workflow matters because ", "")
    .replace("manual ownership and follow-up create ", "");

  return impact.length > 90 ? `${impact.slice(0, 87).trim()}...` : impact;
}

function getValidationGainBadgeClassName(gain: string) {
  if (gain === "High") {
    return "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300";
  }

  if (gain === "Medium") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300";
  }

  return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";
}

function getValidationTaskPriorityBadgeClassName(priority: ValidationTaskPriority) {
  if (priority === "high") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300";
  }

  if (priority === "medium") {
    return "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300";
  }

  return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";
}

function formatValidationTaskPriority(priority: ValidationTaskPriority) {
  return priority.toUpperCase();
}

function getScoreBadgeClassName(label: string) {
  if (label === "high") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300";
  }

  if (label === "medium") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300";
  }

  return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";
}

function getAutomationPotentialBadgeClassName(value: string) {
  if (value === "High") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300";
  }

  if (value === "Medium") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300";
  }

  return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";
}

function getReadinessStageBadgeClassName(stage: string) {
  if (stage === "READY") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300";
  }

  if (stage === "VALIDATE") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300";
  }

  if (stage === "ESCALATE") {
    return "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300";
  }

  if (stage === "IGNORE") {
    return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";
  }

  return "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300";
}

function getActivationDecisionClassName(decision: string) {
  if (decision === "ENGAGE") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300";
  }

  if (decision === "VALIDATE") {
    return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-300";
  }

  if (decision === "ESCALATE") {
    return "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900/70 dark:bg-violet-950/30 dark:text-violet-300";
  }

  if (decision === "IGNORE") {
    return "border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300";
  }

  return "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/70 dark:bg-sky-950/30 dark:text-sky-300";
}

function getActivationDecisionMeaning(decision: string) {
  if (decision === "ENGAGE") {
    return "Opportunity is qualified and outreach-ready.";
  }

  if (decision === "VALIDATE") {
    return "Qualification evidence is incomplete. Validate remaining requirements before outreach.";
  }

  if (decision === "ESCALATE") {
    return "Strategic review recommended before outreach.";
  }

  if (decision === "IGNORE") {
    return "Current evidence does not support qualification.";
  }

  return "Signals are emerging, but qualification evidence remains incomplete.";
}

function getActivationDecisionDisplayReason(item: OpportunityDashboardItem) {
  const decision = item.activationDecision.activationDecision;
  const primaryBlocker = item.opportunityReadiness.blockers[0]?.name;

  if (decision === "ENGAGE") return "Qualification requirements are complete.";
  if (decision === "MONITOR") return "Impact and buyer path remain unverified.";
  if (decision === "IGNORE") return "Business impact and buying intent remain weak.";
  if (decision === "ESCALATE") return "Opportunity requires human evaluation.";

  if (primaryBlocker === "Economic Case") return "Economic validation is still required.";
  if (primaryBlocker === "Buyer Path") return "Buyer path remains unverified.";
  if (primaryBlocker === "Business Impact") return "Business impact remains unverified.";
  if (primaryBlocker === "Workflow") return "Workflow validation is still required.";

  return "Economic validation is still required.";
}

function getDisplayBlockerLabel(label?: string) {
  if (!label) return "No qualification blockers";
  if (
    label === "Economic Case Inferred" ||
    label === "Economic Case Missing" ||
    label === "Economic Case Not Validated" ||
    label === "Budget Owner Missing"
  ) {
    return "Economic Validation Required";
  }
  if (
    label === "Buyer Path Missing" ||
    label === "Buyer Path Inferred" ||
    label === "Buyer Path Not Validated"
  ) {
    return "Buyer Path Unverified";
  }
  if (
    label === "Business Impact Missing" ||
    label === "Business Impact Inferred" ||
    label === "Business Impact Not Validated"
  ) {
    return "Business Impact Unverified";
  }
  if (
    label === "Workflow Missing" ||
    label === "Workflow Inferred" ||
    label === "Workflow Not Validated"
  ) {
    return "Workflow Validation Required";
  }
  if (
    label === "Pain Owner Missing" ||
    label === "Pain Owner Inferred" ||
    label === "Pain Owner Not Validated"
  ) {
    return "Pain Owner Unverified";
  }

  return "Review Required";
}

function getActivationNextBestAction(decision: string) {
  if (decision === "ENGAGE") return "Generate outreach draft";
  if (decision === "VALIDATE") return "Collect missing evidence";
  if (decision === "ESCALATE") return "Request strategic review";
  if (decision === "IGNORE") return "No action recommended";
  return "Observe additional signals";
}

function formatActivationConfidence(confidence: number) {
  return `${Math.round(confidence * 100)}%`;
}

function getActivationReadinessLabel(decision: string) {
  if (decision === "ENGAGE") return "READY";
  if (decision === "MONITOR") return "DISCOVER";
  return decision;
}

function getCollapsedActivationSummary(item: OpportunityDashboardItem) {
  const decision = item.activationDecision.activationDecision;

  if (decision === "ENGAGE") return "Qualified and outreach-ready.";
  if (decision === "VALIDATE") return "Economic validation required.";
  if (decision === "MONITOR") return "Evidence still emerging.";
  if (decision === "IGNORE") return "Insufficient opportunity signal.";
  return "Manual review recommended.";
}

function getReadinessSummary(item: OpportunityDashboardItem) {
  const blockerCount = item.opportunityReadiness.blockers.length;
  const blockerLabel = blockerCount === 1 ? "Blocker" : "Blockers";

  return {
    milestoneText: `${item.opportunityReadiness.completedMilestones} / ${item.opportunityReadiness.totalMilestones} Milestones Complete`,
    blockerText:
      blockerCount === 0 ? "" : `${blockerCount} ${blockerLabel} Remaining`,
  };
}

function getMilestoneClassName(trustState: string) {
  if (trustState === "human_confirmed") {
    return "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/70 dark:bg-sky-950/30 dark:text-sky-300";
  }

  if (trustState === "validated") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300";
  }

  if (trustState === "inferred") {
    return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-300";
  }

  return "border-zinc-200 bg-white text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300";
}

function getMilestoneTitle({
  complete,
  name,
}: {
  complete: boolean;
  name: string;
  trustState: string;
}) {
  if (complete) return `✓ ${name}`;
  return name;
}

function formatTrustBadgeLabel(label: string, sourceCount: number) {
  const sourceLabel = sourceCount === 1 ? "source" : "sources";

  return `${label} • ${sourceCount} ${sourceLabel}`;
}

function getMilestoneBadgeLabel({
  complete,
  name,
  blockerLabel,
  trustState,
}: {
  complete: boolean;
  name: string;
  blockerLabel: string;
  trustState: TrustState;
}) {
  if (complete) return getTrustBadge(trustState).label;
  if (name === "Economic Case") return "Validation Required";
  return getDisplayBlockerLabel(blockerLabel);
}

function shouldShowSeparateMilestoneSourceCount(complete: boolean) {
  return !complete;
}

function formatGeneratedAt(value: Date | string | null) {
  if (!value) return "Unknown";
  return new Date(value).toISOString().replace("T", " ").slice(0, 19);
}

function matchesFilter(item: OpportunityDashboardItem, filter: OpportunityFilter) {
  if (filter === "all") return true;
  if (filter === "high_opportunity") return item.opportunityScore.label === "high";
  if (filter === "needs_review") {
    return item.filterStatus === "needs_review" || item.reviewStatus === "new";
  }

  return item.reviewStatus === filter;
}

export function OpportunityDashboard({
  opportunities,
}: {
  opportunities: OpportunityDashboardItem[];
}) {
  const [filter, setFilter] = useState<OpportunityFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => new Set());
  const [collapsedActivationDecisions, setCollapsedActivationDecisions] = useState<Set<string>>(
    () => new Set(),
  );
  const [collapsedValidationTasks, setCollapsedValidationTasks] = useState<Set<string>>(
    () => new Set(),
  );
  const [toggledEvidencePackSections, setToggledEvidencePackSections] = useState<Set<string>>(
    () => new Set(),
  );
  const filteredOpportunities = useMemo(
    () =>
      opportunities.filter(
        (item) => matchesFilter(item, filter) && matchesOpportunitySearch(item, searchQuery),
      ),
    [filter, opportunities, searchQuery],
  );
  const hasSearch = searchQuery.trim().length > 0;

  function toggleSection(opportunityId: string, sectionId: OpportunitySectionId) {
    setExpandedSections((current) => toggleOpportunitySection(current, opportunityId, sectionId));
  }

  function isActivationDecisionExpanded(opportunityId: string) {
    return !collapsedActivationDecisions.has(opportunityId);
  }

  function toggleActivationDecision(opportunityId: string) {
    setCollapsedActivationDecisions((current) => {
      const nextSections = new Set(current);
      if (nextSections.has(opportunityId)) {
        nextSections.delete(opportunityId);
      } else {
        nextSections.add(opportunityId);
      }
      return nextSections;
    });
  }

  function isValidationTasksExpanded(opportunityId: string) {
    return !collapsedValidationTasks.has(opportunityId);
  }

  function toggleValidationTasks(opportunityId: string) {
    setCollapsedValidationTasks((current) => {
      const nextSections = new Set(current);
      if (nextSections.has(opportunityId)) {
        nextSections.delete(opportunityId);
      } else {
        nextSections.add(opportunityId);
      }
      return nextSections;
    });
  }

  function getEvidencePackSectionKey(opportunityId: string, sectionId: EvidencePackSectionId) {
    return `${opportunityId}:evidence_pack:${sectionId}`;
  }

  function isEvidencePackSectionExpanded(
    opportunityId: string,
    sectionId: EvidencePackSectionId,
  ) {
    const sectionKey = getEvidencePackSectionKey(opportunityId, sectionId);
    const isDefaultOpen = DEFAULT_OPEN_EVIDENCE_PACK_SECTIONS.includes(sectionId);

    return isDefaultOpen
      ? !toggledEvidencePackSections.has(sectionKey)
      : toggledEvidencePackSections.has(sectionKey);
  }

  function toggleEvidencePackSection(opportunityId: string, sectionId: EvidencePackSectionId) {
    const sectionKey = getEvidencePackSectionKey(opportunityId, sectionId);

    setToggledEvidencePackSections((current) => {
      const nextSections = new Set(current);
      if (nextSections.has(sectionKey)) {
        nextSections.delete(sectionKey);
      } else {
        nextSections.add(sectionKey);
      }
      return nextSections;
    });
  }

  function renderEvidencePackSection({
    item,
    sectionId,
    title,
    count,
    children,
  }: {
    item: OpportunityDashboardItem;
    sectionId: EvidencePackSectionId;
    title: string;
    count: number;
    children: ReactNode;
  }) {
    const isExpanded = isEvidencePackSectionExpanded(item.id, sectionId);

    return (
      <div className="rounded-xl border border-zinc-200 bg-white/70 p-2 dark:border-zinc-800 dark:bg-zinc-950/60">
        <button
          type="button"
          onClick={() => toggleEvidencePackSection(item.id, sectionId)}
          className="flex w-full items-center justify-between gap-2 text-left font-medium text-zinc-700 dark:text-zinc-200"
        >
          <span>
            {isExpanded ? "▾" : "▸"} {title} ({count})
          </span>
        </button>
        {isExpanded ? <div className="mt-2">{children}</div> : null}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-zinc-200/80 bg-white/85 p-3 shadow-sm backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-950/85">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === option.id
                  ? "border-indigo-300 bg-indigo-600 text-white shadow-sm dark:border-indigo-400 dark:bg-indigo-500"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Search opportunities</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search raw signal, pain, team, solution, gap, ICP, or angle..."
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none transition-colors placeholder:text-zinc-400 focus:border-indigo-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
          </label>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Showing {filteredOpportunities.length} of {opportunities.length} opportunities
          </p>
        </div>
      </div>

      {filteredOpportunities.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white/70 p-8 text-center dark:border-zinc-700 dark:bg-zinc-950/60">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {hasSearch ? "No opportunities match this search." : "No opportunities match this filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOpportunities.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/90 shadow-sm ring-1 ring-white/70 backdrop-blur-sm transition-shadow hover:shadow-md dark:border-zinc-800/80 dark:bg-zinc-950/90 dark:ring-white/5"
            >
              <div className="border-b border-zinc-100 px-4 py-2.5 dark:border-zinc-900">
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {item.filterStatus.replaceAll("_", " ")}
                  </span>
                  <span className="rounded-full bg-violet-100 px-2.5 py-1 font-medium uppercase text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                    {item.marketType}
                  </span>
                  <span className="rounded-full bg-sky-100 px-2.5 py-1 font-medium text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
                    {item.confidence} confidence
                  </span>
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {item.reviewStatus.replaceAll("_", " ")}
                  </span>
                  {item.hasHumanEdits ? (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                      human edited
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="space-y-1.5">
                    <p className="rounded-xl bg-zinc-50 px-3 py-2 text-xs leading-relaxed text-zinc-500 dark:bg-zinc-900/70 dark:text-zinc-400">
                      {item.rawSignalText}
                    </p>
                    <p className="text-lg font-semibold leading-snug text-zinc-950 dark:text-zinc-50 sm:text-xl">
                      {item.pain}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getScoreBadgeClassName(
                          item.opportunityScore.label,
                        )}`}
                      >
                        {item.opportunityScore.score}/100 {item.opportunityScore.label}
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {item.reviewStatus.replaceAll("_", " ")}
                      </span>
                    </div>
                  </div>

                  <dl className="grid grid-cols-2 gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 xl:grid-cols-4">
                    <div>
                      <dt className="font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                        Urgency
                      </dt>
                      <dd className="capitalize">{item.urgency}</dd>
                    </div>
                    <div>
                      <dt className="font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                        Affected Team
                      </dt>
                      <dd>{item.affectedTeam}</dd>
                    </div>
                    <div>
                      <dt className="font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                        Monetization Score
                      </dt>
                      <dd>{item.monetizationScore}</dd>
                    </div>
                    <div>
                      <dt className="font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                        Interviews
                      </dt>
                      <dd>{item.interviewCount}</dd>
                    </div>
                  </dl>

                  <dl className="grid grid-cols-1 gap-2 rounded-xl border border-zinc-200 bg-zinc-50/80 p-2.5 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400 sm:grid-cols-2">
                    <div>
                      <dt className="font-medium text-zinc-700 dark:text-zinc-200">Frequency</dt>
                      <dd className="line-clamp-2">{item.frequency}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-zinc-700 dark:text-zinc-200">
                        Current Solution
                      </dt>
                      <dd className="line-clamp-2">{item.currentSolution}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="font-medium text-zinc-700 dark:text-zinc-200">
                        Solution Gap
                      </dt>
                      <dd className="line-clamp-2">{item.solutionGap}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="font-medium text-zinc-700 dark:text-zinc-200">
                        Founder Conviction
                      </dt>
                      <dd>{item.founderConviction ?? "Not scored"}</dd>
                    </div>
                  </dl>

                  <p className="rounded-xl border border-zinc-200 bg-white/70 px-3 py-1.5 text-xs leading-relaxed text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-300">
                    <span className="font-medium text-zinc-800 dark:text-zinc-100">
                      Outreach angle:
                    </span>{" "}
                    {item.outreachAngle}
                  </p>

                  <div
                    className={`rounded-xl border p-2.5 ${getActivationDecisionClassName(
                      item.activationDecision.activationDecision,
                    )}`}
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-xs font-semibold uppercase tracking-wide opacity-80">
                          Activation Decision
                        </h3>
                        <div className="mt-0.5 flex items-baseline justify-between gap-3">
                          <p className="text-2xl font-bold tracking-tight">
                            {item.activationDecision.activationDecision}
                          </p>
                          {isActivationDecisionExpanded(item.id) ? null : (
                            <p className="hidden min-w-0 flex-1 truncate text-sm font-medium sm:block">
                              {getCollapsedActivationSummary(item)}
                            </p>
                          )}
                          <div className="flex shrink-0 items-end gap-1.5 text-right">
                            <div>
                              <p className="text-[9px] font-semibold uppercase tracking-wide opacity-70">
                                Confidence
                              </p>
                              <p className="text-base font-bold leading-none">
                                {formatActivationConfidence(item.activationDecision.activationConfidence)}
                              </p>
                            </div>
                            <span
                              title={`Confidence is calculated from:
• Opportunity Readiness
• Evidence Coverage
• Trust State Strength
• Buyer Certainty
• Economic Validation`}
                              className="mb-0.5 inline-flex size-4 cursor-help items-center justify-center rounded-full bg-white/70 text-[10px] font-bold opacity-80 dark:bg-zinc-950/40"
                              aria-label="Confidence calculation details"
                            >
                              ?
                            </span>
                          </div>
                        </div>
                        <p
                          className={`mt-0.5 text-sm font-medium ${
                            isActivationDecisionExpanded(item.id) ? "" : "truncate sm:hidden"
                          }`}
                        >
                          {isActivationDecisionExpanded(item.id)
                            ? getActivationDecisionMeaning(item.activationDecision.activationDecision)
                            : getCollapsedActivationSummary(item)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleActivationDecision(item.id)}
                        className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold transition-colors hover:bg-white dark:bg-zinc-950/40 dark:hover:bg-zinc-950"
                        aria-expanded={isActivationDecisionExpanded(item.id)}
                      >
                        <span
                          className={`transition-transform duration-200 ${
                            isActivationDecisionExpanded(item.id) ? "rotate-180" : "rotate-0"
                          }`}
                        >
                          ▾
                        </span>
                        {isActivationDecisionExpanded(item.id) ? "Collapse" : "Expand"}
                      </button>
                    </div>
                    <div
                      className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                        isActivationDecisionExpanded(item.id)
                          ? "grid-rows-[1fr] opacity-100"
                          : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <p className="mt-2 rounded-lg bg-white/60 px-2 py-1.5 text-xs leading-relaxed dark:bg-zinc-950/30">
                          <span className="font-semibold">Reason:</span>{" "}
                          {getActivationDecisionDisplayReason(item)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/60">
                    <div className="space-y-2.5 text-xs text-zinc-500 dark:text-zinc-400">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            Opportunity Readiness
                          </h3>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-zinc-600 dark:text-zinc-300">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase opacity-80 ${getReadinessStageBadgeClassName(
                                getActivationReadinessLabel(
                                  item.activationDecision.activationDecision,
                                ),
                              )}`}
                            >
                              {getActivationReadinessLabel(
                                item.activationDecision.activationDecision,
                              )}
                            </span>
                            <span className="font-medium text-zinc-800 dark:text-zinc-100">
                              {getReadinessSummary(item).milestoneText}
                            </span>
                            {getReadinessSummary(item).blockerText ? (
                              <span>{getReadinessSummary(item).blockerText}</span>
                            ) : null}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleSection(item.id, "evidence_pack")}
                          className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                          {isOpportunitySectionExpanded(expandedSections, item.id, "evidence_pack")
                            ? "Hide Readiness Details"
                            : "View Readiness Details"}
                        </button>
                      </div>

                      <div>
                        <p className="font-medium text-zinc-700 dark:text-zinc-200">
                          Qualification Milestones
                        </p>
                        <ul className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-5">
                          {item.opportunityReadiness.milestones.map((milestone) => (
                            <li
                              key={milestone.name}
                              className={`flex min-h-[116px] flex-col rounded-xl border px-2.5 py-2 ${getMilestoneClassName(
                                milestone.trustState,
                              )}`}
                            >
                              <p className="min-h-4 font-semibold">
                                {getMilestoneTitle(milestone)}
                              </p>
                              <span
                                className={`mt-1 inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  getTrustBadge(milestone.trustState).className
                                }`}
                              >
                                {milestone.complete
                                  ? formatTrustBadgeLabel(
                                      getMilestoneBadgeLabel(milestone),
                                      milestone.evidenceSources.length,
                                    )
                                  : getMilestoneBadgeLabel(milestone)}
                              </span>
                              {shouldShowSeparateMilestoneSourceCount(milestone.complete) ? (
                                <p className="mt-0.5 text-[10px] opacity-70">
                                  {milestone.evidenceSources.length}{" "}
                                  {milestone.evidenceSources.length === 1 ? "source" : "sources"}
                                </p>
                              ) : null}
                              <p className="mt-1 line-clamp-2 text-[11px] opacity-80">
                                {milestone.detail}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {item.activationDecision.activationDecision === "ENGAGE" ? (
                        <div className="grid grid-cols-1 gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 p-2 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300 sm:grid-cols-2">
                          <div>
                            <p className="font-medium">Buyer Path</p>
                            <p className="mt-0.5">
                              {item.opportunityReadiness.buyerPath.painOwner} →{" "}
                              {item.opportunityReadiness.buyerPath.evaluator} →{" "}
                              {item.opportunityReadiness.buyerPath.budgetOwner}
                            </p>
                            <p className="mt-1 font-medium">✓ No qualification blockers</p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {[
                                item.opportunityReadiness.trustedFields.painOwner,
                                item.opportunityReadiness.trustedFields.buyer,
                                item.opportunityReadiness.trustedFields.economicBuyer,
                              ].map((field, index) => (
                                <span
                                  key={`${index}:${field.value ?? "unknown"}:${field.trustState}`}
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                    getTrustBadge(field.trustState).className
                                  }`}
                                >
                                  {formatTrustBadgeLabel(
                                    getTrustBadge(field.trustState).label,
                                    field.evidenceSources.length,
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="font-medium">Next Best Action</p>
                            <p className="mt-0.5">
                              {getActivationNextBestAction(
                                item.activationDecision.activationDecision,
                              )}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr]">
                          <div className="rounded-xl border border-zinc-200 bg-white/70 p-2 dark:border-zinc-800 dark:bg-zinc-950/60">
                            <p className="font-medium text-zinc-700 dark:text-zinc-200">Blockers</p>
                            {item.opportunityReadiness.blockers.length ? (
                              <ul className="mt-1 flex flex-wrap gap-1">
                                {item.opportunityReadiness.blockers.map((blocker) => (
                                  <li
                                    key={blocker.name}
                                    className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                                  >
                                    {getDisplayBlockerLabel(blocker.blockerLabel)}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="mt-1 font-medium text-emerald-700 dark:text-emerald-300">
                                ✓ No qualification blockers
                              </p>
                            )}
                          </div>
                          <div className="rounded-xl border border-zinc-200 bg-white/70 p-2 dark:border-zinc-800 dark:bg-zinc-950/60">
                            <p className="font-medium text-zinc-700 dark:text-zinc-200">
                              Next Best Action
                            </p>
                            <p className="mt-1 text-zinc-600 dark:text-zinc-300">
                              {getActivationNextBestAction(
                                item.activationDecision.activationDecision,
                              )}
                            </p>
                          </div>
                        </div>
                      )}

                      {isOpportunitySectionExpanded(expandedSections, item.id, "evidence_pack") ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-1 gap-2 rounded-xl border border-zinc-200 bg-white/70 p-2 dark:border-zinc-800 dark:bg-zinc-950/60 sm:grid-cols-2">
                            <div>
                              <p className="font-medium text-zinc-700 dark:text-zinc-200">Problem</p>
                              <p className="mt-0.5 line-clamp-2">{compactProblem(item)}</p>
                            </div>
                            <div>
                              <p className="font-medium text-zinc-700 dark:text-zinc-200">Impact</p>
                              <p className="mt-0.5 line-clamp-2">{compactImpact(item)}</p>
                            </div>
                          </div>

                          {renderEvidencePackSection({
                            item,
                            sectionId: "known",
                            title: "Supporting Evidence",
                            count: item.evidencePack.currentEvidence.known.length,
                            children: (
                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                                {item.evidencePack.evidenceCategories.map((category) => (
                                  <div key={category.label}>
                                    <p className="font-medium text-zinc-700 dark:text-zinc-200">
                                      {formatEvidenceCategoryLabel(category.label)}
                                    </p>
                                    <ul className="mt-1 flex flex-wrap gap-1">
                                      {category.items.map((item) => (
                                        <li
                                          key={item}
                                          className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-950 dark:text-zinc-300"
                                        >
                                          {formatKnownEvidenceItem(item)}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                            ),
                          })}

                          {item.activationDecision.activationDecision === "ENGAGE"
                            ? null
                            : renderEvidencePackSection({
                                item,
                                sectionId: "validation",
                                title: "Validation Tasks",
                                count: item.evidencePack.validationPlan.length,
                                children: item.evidencePack.validationPlan.length ? (
                                  <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white/70 dark:border-zinc-800 dark:bg-zinc-950/60">
                                    <div className="grid grid-cols-[72px_1fr] gap-2 border-b border-zinc-200 px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:border-zinc-800 dark:text-zinc-500 sm:grid-cols-[88px_1fr_1.4fr_1.2fr]">
                                      <span>Gain</span>
                                      <span>Task</span>
                                      <span className="hidden sm:block">Question</span>
                                      <span className="hidden sm:block">Why</span>
                                    </div>
                                    {item.evidencePack.validationPlan.map((validationItem) => (
                                      <div
                                        key={validationItem.validationItem}
                                        className="grid grid-cols-[72px_1fr] gap-2 border-b border-zinc-100 px-2 py-1.5 last:border-b-0 dark:border-zinc-900 sm:grid-cols-[88px_1fr_1.4fr_1.2fr]"
                                      >
                                        <span
                                          className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${getValidationGainBadgeClassName(
                                            validationItem.expectedConfidenceGain,
                                          )}`}
                                        >
                                          {validationItem.expectedConfidenceGain}
                                        </span>
                                        <div>
                                          <p className="font-medium text-zinc-700 dark:text-zinc-200">
                                            {validationItem.validationItem}
                                          </p>
                                          <p className="mt-0.5 text-zinc-500 dark:text-zinc-400 sm:hidden">
                                            Q: {validationItem.questionToAnswer}
                                          </p>
                                          <p className="mt-0.5 text-zinc-500 dark:text-zinc-400 sm:hidden">
                                            Why: {validationItem.whyItMatters}
                                          </p>
                                        </div>
                                        <p className="hidden text-zinc-600 dark:text-zinc-300 sm:block">
                                          {validationItem.questionToAnswer}
                                        </p>
                                        <p className="hidden text-zinc-500 dark:text-zinc-400 sm:block">
                                          {validationItem.whyItMatters}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p>Validation tasks satisfied.</p>
                                ),
                              })}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {shouldShowValidationTaskSection({
                    activationDecision: item.activationDecision.activationDecision,
                    taskCount: item.validationTasks.length,
                    blockerCount: item.opportunityReadiness.blockers.length,
                  }) ? (
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/60">
                      {(() => {
                        const validationTaskView = buildValidationTaskViewModel(item.validationTasks);
                        const isExpanded = isValidationTasksExpanded(item.id);

                        return (
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                Validation Tasks
                              </h3>
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                <span className="font-medium text-zinc-800 dark:text-zinc-100">
                                  {validationTaskView.progressLabel}
                                </span>
                                <span>{validationTaskView.progress.completionPercent}%</span>
                                <span>
                                  {validationTaskView.progress.totalTasks}{" "}
                                  {validationTaskView.progress.totalTasks === 1 ? "task" : "tasks"}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleValidationTasks(item.id)}
                              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800"
                              aria-expanded={isExpanded}
                            >
                              <span
                                className={`transition-transform duration-200 ${
                                  isExpanded ? "rotate-180" : "rotate-0"
                                }`}
                              >
                                ▾
                              </span>
                              {isExpanded ? "Collapse" : "Expand"}
                            </button>
                          </div>

                          <div
                            className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                              isExpanded
                                ? "grid-rows-[1fr] opacity-100"
                                : "grid-rows-[0fr] opacity-0"
                            }`}
                          >
                            <div className="overflow-hidden">
                              {validationTaskView.hasTasks ? (
                                <div className="mt-2 space-y-2">
                                  {validationTaskView.groups.map((group) => (
                                    <div
                                      key={group.priority}
                                      className="rounded-xl border border-zinc-200 bg-white/70 p-2 dark:border-zinc-800 dark:bg-zinc-950/60"
                                    >
                                      <span
                                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${getValidationTaskPriorityBadgeClassName(
                                          group.priority,
                                        )}`}
                                      >
                                        {formatValidationTaskPriority(group.priority)}
                                      </span>
                                      <ul className="mt-1.5 divide-y divide-zinc-100 dark:divide-zinc-900">
                                        {group.tasks.map((task) => (
                                          <li
                                            key={task.id}
                                            className="grid grid-cols-[1fr_auto] gap-2 py-1.5 first:pt-0 last:pb-0"
                                          >
                                            <div>
                                              <p className="font-medium text-zinc-700 dark:text-zinc-200">
                                                {task.status === "completed" ? "✓ " : ""}
                                                {task.title}
                                              </p>
                                              <p className="mt-0.5 line-clamp-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                                                {task.description}
                                              </p>
                                            </div>
                                            <span
                                              className={`h-fit rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                                task.status === "completed"
                                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                                                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                                              }`}
                                            >
                                              {task.status === "completed" ? "Completed" : "Pending"}
                                            </span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="mt-2 rounded-xl border border-zinc-200 bg-white/70 p-2 font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-300">
                                  {item.activationDecision.activationDecision === "ENGAGE"
                                    ? "No validation tasks required"
                                    : validationTaskView.emptyState}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        );
                      })()}
                    </div>
                  ) : null}

                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Solution Gap Analysis
                      </h3>
                      <button
                        type="button"
                        onClick={() => toggleSection(item.id, "solution_gap")}
                        className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        {isOpportunitySectionExpanded(expandedSections, item.id, "solution_gap")
                          ? "Hide Analysis"
                          : "View Analysis"}
                      </button>
                    </div>
                    {isOpportunitySectionExpanded(expandedSections, item.id, "solution_gap") ? (
                      <div className="mt-2 space-y-2 text-xs text-zinc-500 dark:text-zinc-400">
                        <div>
                          <p className="font-medium text-zinc-700 dark:text-zinc-200">
                            Current Solution
                          </p>
                          <p>{item.solutionGapAnalysis.currentSolution}</p>
                        </div>
                        <div>
                          <p className="font-medium text-zinc-700 dark:text-zinc-200">
                            Failure Modes
                          </p>
                          {item.solutionGapAnalysis.failureModes.length ? (
                            <ul className="mt-1 list-disc space-y-0.5 pl-4">
                              {item.solutionGapAnalysis.failureModes.map((mode) => (
                                <li key={mode}>{mode}</li>
                              ))}
                            </ul>
                          ) : (
                            <p>None detected</p>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-zinc-700 dark:text-zinc-200">
                            Root Cause
                          </p>
                          <p>{item.solutionGapAnalysis.rootCause}</p>
                        </div>
                        <div>
                          <p className="font-medium text-zinc-700 dark:text-zinc-200">
                            Business Impact
                          </p>
                          <p>{item.solutionGapAnalysis.businessImpact}</p>
                        </div>
                        <div>
                          <p className="font-medium text-zinc-700 dark:text-zinc-200">
                            Automation Potential
                          </p>
                          <span
                            className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${getAutomationPotentialBadgeClassName(
                              item.solutionGapAnalysis.automationPotential,
                            )}`}
                          >
                            {item.solutionGapAnalysis.automationPotential}
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
                    <div className="space-y-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            Buyer Mapping
                          </h3>
                          <p className="mt-1 text-zinc-600 dark:text-zinc-300">
                            Buyer Clarity {item.buyerMapping.buyerClarityScore}/10
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleSection(item.id, "buyer_mapping")}
                          className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                          {isOpportunitySectionExpanded(expandedSections, item.id, "buyer_mapping")
                            ? "Hide Mapping"
                            : "View Mapping"}
                        </button>
                      </div>
                      {isOpportunitySectionExpanded(expandedSections, item.id, "buyer_mapping") ? (
                        <>
                          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <div>
                              <dt className="font-medium text-zinc-700 dark:text-zinc-200">User</dt>
                              <dd>{item.buyerMapping.user}</dd>
                            </div>
                            <div>
                              <dt className="font-medium text-zinc-700 dark:text-zinc-200">Buyer</dt>
                              <dd>{item.buyerMapping.buyer}</dd>
                            </div>
                            <div>
                              <dt className="font-medium text-zinc-700 dark:text-zinc-200">
                                Champion
                              </dt>
                              <dd>{item.buyerMapping.champion}</dd>
                            </div>
                            <div>
                              <dt className="font-medium text-zinc-700 dark:text-zinc-200">
                                Economic Owner
                              </dt>
                              <dd>{item.buyerMapping.economicOwner}</dd>
                            </div>
                            <div>
                              <dt className="font-medium text-zinc-700 dark:text-zinc-200">
                                Department
                              </dt>
                              <dd>{item.buyerMapping.department}</dd>
                            </div>
                            <div>
                              <dt className="font-medium text-zinc-700 dark:text-zinc-200">
                                Company Size Fit
                              </dt>
                              <dd>{item.buyerMapping.companySizeFit.join(", ")}</dd>
                            </div>
                            <div className="sm:col-span-2">
                              <dt className="font-medium text-zinc-700 dark:text-zinc-200">
                                Buying Committee
                              </dt>
                              {item.buyerMapping.buyingCommittee.length ? (
                                <dd className="mt-1 flex flex-wrap gap-1.5">
                                  {item.buyerMapping.buyingCommittee.map((role) => (
                                    <span
                                      key={role}
                                      className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-600 dark:bg-zinc-950 dark:text-zinc-300"
                                    >
                                      {role}
                                    </span>
                                  ))}
                                </dd>
                              ) : (
                                <dd>Unknown</dd>
                              )}
                            </div>
                          </dl>
                          <div>
                            <p className="font-medium text-zinc-700 dark:text-zinc-200">
                              Decision Map
                            </p>
                            <dl className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
                              <div>
                                <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                                  Who Suffers
                                </dt>
                                <dd>{item.buyerMapping.decisionMap.suffers ?? "Unknown"}</dd>
                              </div>
                              <div>
                                <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                                  Who Champions
                                </dt>
                                <dd>{item.buyerMapping.decisionMap.champion ?? "Unknown"}</dd>
                              </div>
                              <div>
                                <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                                  Who Buys
                                </dt>
                                <dd>{item.buyerMapping.decisionMap.buyer ?? "Unknown"}</dd>
                              </div>
                              <div>
                                <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                                  Who Pays
                                </dt>
                                <dd>{item.buyerMapping.decisionMap.pays ?? "Unknown"}</dd>
                              </div>
                              <div>
                                <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                                  Economic Buyer
                                </dt>
                                <dd>{item.buyerMapping.decisionMap.economicBuyer ?? "Unknown"}</dd>
                              </div>
                            </dl>
                          </div>
                          {item.buyerMapping.buyerClarityReasons.length ? (
                            <div>
                              <p className="font-medium text-zinc-700 dark:text-zinc-200">
                                Reasons
                              </p>
                              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                                {item.buyerMapping.buyerClarityReasons.map((reason) => (
                                  <li key={reason}>{reason}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        ICP
                      </h3>
                      <button
                        type="button"
                        onClick={() => toggleSection(item.id, "icp")}
                        className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        {isOpportunitySectionExpanded(expandedSections, item.id, "icp")
                          ? "Hide ICP"
                          : "View ICP"}
                      </button>
                    </div>
                    {isOpportunitySectionExpanded(expandedSections, item.id, "icp") ? (
                      <dl className="mt-2 grid grid-cols-1 gap-2 text-xs text-zinc-500 dark:text-zinc-400 sm:grid-cols-2">
                        <div>
                          <dt className="font-medium text-zinc-700 dark:text-zinc-200">
                            Target Titles
                          </dt>
                          <dd>
                            {item.targetTitles.length ? item.targetTitles.join(", ") : "Unknown"}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-medium text-zinc-700 dark:text-zinc-200">Industry</dt>
                          <dd>{item.industry}</dd>
                        </div>
                        <div>
                          <dt className="font-medium text-zinc-700 dark:text-zinc-200">
                            Company Size
                          </dt>
                          <dd>{item.companySize}</dd>
                        </div>
                        <div>
                          <dt className="font-medium text-zinc-700 dark:text-zinc-200">Buyer</dt>
                          <dd>{item.buyer}</dd>
                        </div>
                        <div>
                          <dt className="font-medium text-zinc-700 dark:text-zinc-200">
                            Budget Owner
                          </dt>
                          <dd>{item.budgetOwner}</dd>
                        </div>
                        <div>
                          <dt className="font-medium text-zinc-700 dark:text-zinc-200">
                            Trigger Event
                          </dt>
                          <dd>{item.triggerEvent}</dd>
                        </div>
                        <div className="sm:col-span-2">
                          <dt className="font-medium text-zinc-700 dark:text-zinc-200">
                            Refined Outreach Angle
                          </dt>
                          <dd>{item.outreachAngleRefined}</dd>
                        </div>
                      </dl>
                    ) : null}
                  </div>
                </div>

                <div className="w-full shrink-0 lg:w-72">
                  <OpportunityReviewActions
                    opportunityId={item.id}
                    currentStatus={item.reviewStatus}
                  />
                  <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
                    <FounderConvictionEditor
                      opportunityId={item.id}
                      founderConviction={item.founderConviction}
                      recommendation={item.founderConvictionRecommendation}
                    />
                    <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                      Interviews: {item.interviewCount}
                    </p>
                  </div>
                  <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-zinc-700 dark:text-zinc-200">
                        Message Draft
                      </p>
                      <GenerateDraftButton
                        painSignalId={item.id}
                        hasDraft={Boolean(item.latestDraft)}
                      />
                    </div>
                    {item.latestDraft ? (
                      <div className="mt-2 space-y-2">
                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                            Subject
                          </p>
                          <p className="mt-1 font-medium text-zinc-800 dark:text-zinc-100">
                            {item.latestDraft.subject}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                            Body
                          </p>
                          <p className="mt-1 whitespace-pre-line leading-relaxed text-zinc-600 dark:text-zinc-300">
                            {item.latestDraft.body}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
                            {item.latestDraft.status}
                          </span>
                          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
                            {formatGeneratedAt(item.latestDraft.generatedAt)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                        Generate a review-only outbound draft. Nothing is sent or queued.
                      </p>
                    )}
                  </div>
                  <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-zinc-700 dark:text-zinc-200">
                        Score Details
                      </p>
                      {shouldShowScoreDetailsToggle(item.opportunityScore.reasons) ? (
                        <button
                          type="button"
                          onClick={() => toggleSection(item.id, "score")}
                          className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                          {isOpportunitySectionExpanded(expandedSections, item.id, "score")
                            ? "Hide Details"
                            : "View Score Details"}
                        </button>
                      ) : null}
                    </div>
                    {isOpportunitySectionExpanded(expandedSections, item.id, "score") ? (
                      <ul className="mt-2 list-inside list-disc space-y-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                        {getVisibleScoreReasons(item.opportunityScore.reasons, true).map(
                          (reason) => (
                            <li key={reason}>{reason}</li>
                          ),
                        )}
                      </ul>
                    ) : null}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
