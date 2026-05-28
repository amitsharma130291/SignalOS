"use client";

import { useMemo, useState } from "react";
import { OpportunityReviewActions } from "@/components/opportunity-review-actions";
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
  const filteredOpportunities = useMemo(
    () => opportunities.filter((item) => matchesFilter(item, filter)),
    [filter, opportunities],
  );

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
        <div className="space-y-4">
          {filteredOpportunities.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white/90 shadow-sm ring-1 ring-white/70 backdrop-blur-sm transition-shadow hover:shadow-md dark:border-zinc-800/80 dark:bg-zinc-950/90 dark:ring-white/5"
            >
              <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-900">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {item.filterStatus.replaceAll("_", " ")}
                  </span>
                  <span className="rounded-full bg-violet-100 px-2.5 py-1 font-medium uppercase text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                    {item.marketType}
                  </span>
                  <span className="rounded-full bg-sky-100 px-2.5 py-1 font-medium text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
                    {item.confidence} confidence
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 font-medium ${getScoreBadgeClassName(
                      item.opportunityScore.label,
                    )}`}
                  >
                    {item.opportunityScore.score}/100 {item.opportunityScore.label}
                  </span>
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {item.reviewStatus.replaceAll("_", " ")}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1 space-y-4">
                  <div className="space-y-2">
                    <p className="rounded-xl bg-zinc-50 px-3 py-2 text-sm leading-relaxed text-zinc-500 dark:bg-zinc-900/70 dark:text-zinc-400">
                      {item.rawSignalText}
                    </p>
                    <p className="text-lg font-semibold leading-relaxed text-zinc-900 dark:text-zinc-50">
                      {item.pain}
                    </p>
                  </div>

                  <dl className="grid grid-cols-1 gap-3 text-xs text-zinc-500 dark:text-zinc-400 sm:grid-cols-2 xl:grid-cols-3">
                    <div>
                      <dt className="font-medium text-zinc-700 dark:text-zinc-200">Urgency</dt>
                      <dd className="capitalize">{item.urgency}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-zinc-700 dark:text-zinc-200">
                        Affected Team
                      </dt>
                      <dd>{item.affectedTeam}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-zinc-700 dark:text-zinc-200">
                        Existing Workaround
                      </dt>
                      <dd>{item.existingWorkaround}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-zinc-700 dark:text-zinc-200">
                        Monetization Score
                      </dt>
                      <dd>{item.monetizationScore}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-zinc-700 dark:text-zinc-200">
                        Possible ICP
                      </dt>
                      <dd>{item.possibleIcp}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-zinc-700 dark:text-zinc-200">
                        Outreach Angle
                      </dt>
                      <dd>{item.outreachAngle}</dd>
                    </div>
                  </dl>

                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        ICP
                      </h3>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
                        Human review required
                      </span>
                    </div>
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
                  </div>
                </div>

                <div className="w-full shrink-0 lg:w-72">
                  <OpportunityReviewActions
                    opportunityId={item.id}
                    currentStatus={item.reviewStatus}
                  />
                  <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
                    <p className="font-semibold text-zinc-700 dark:text-zinc-200">Score reasons</p>
                    <ul className="mt-1 list-inside list-disc space-y-1">
                      {item.opportunityScore.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
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
