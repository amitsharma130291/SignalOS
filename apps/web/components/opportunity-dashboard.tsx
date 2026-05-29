"use client";

import { useMemo, useState } from "react";
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
import type { OpportunityDashboardItem } from "@/lib/opportunity-dashboard";
import type { ReviewStatus } from "@/lib/review-status";

type OpportunityFilter =
  | "all"
  | ReviewStatus
  | "high_opportunity"
  | "needs_review";

const FILTERS: { id: OpportunityFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "interesting", label: "Interesting" },
  { id: "follow_up_later", label: "Follow Up Later" },
  { id: "high_opportunity", label: "High Opportunity" },
  { id: "needs_review", label: "Needs Review" },
];

function getScoreBadgeClassName(label: string) {
  if (label === "high") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300";
  }

  if (label === "medium") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300";
  }

  return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";
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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => new Set());
  const filteredOpportunities = useMemo(
    () => opportunities.filter((item) => matchesFilter(item, filter)),
    [filter, opportunities],
  );

  function toggleSection(opportunityId: string, sectionId: OpportunitySectionId) {
    setExpandedSections((current) => toggleOpportunitySection(current, opportunityId, sectionId));
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
      </div>

      {filteredOpportunities.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white/70 p-8 text-center dark:border-zinc-700 dark:bg-zinc-950/60">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            No opportunities match this filter.
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
                <div className="min-w-0 flex-1 space-y-2.5">
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

                  <dl className="grid grid-cols-1 gap-2 rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400 sm:grid-cols-2">
                    <div>
                      <dt className="font-medium text-zinc-700 dark:text-zinc-200">Frequency</dt>
                      <dd>{item.frequency}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-zinc-700 dark:text-zinc-200">
                        Current Solution
                      </dt>
                      <dd>{item.currentSolution}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="font-medium text-zinc-700 dark:text-zinc-200">
                        Solution Gap
                      </dt>
                      <dd>{item.solutionGap}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="font-medium text-zinc-700 dark:text-zinc-200">
                        Founder Conviction
                      </dt>
                      <dd>{item.founderConviction ?? "Not scored"}</dd>
                    </div>
                  </dl>

                  <p className="rounded-xl border border-zinc-200 bg-white/70 px-3 py-2 text-xs leading-relaxed text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-300">
                    <span className="font-medium text-zinc-800 dark:text-zinc-100">
                      Outreach angle:
                    </span>{" "}
                    {item.outreachAngle}
                  </p>

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
