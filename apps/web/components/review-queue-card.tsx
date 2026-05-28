"use client";

import { saveReviewDecision } from "@/app/actions/review-queue";
import { ReviewEditForm } from "@/components/review-edit-form";
import { getReviewCardClassName } from "@/lib/review-edit-form-state";
import { getReviewItemId, type ReviewQueueItem } from "@/lib/review-queue";

function DecisionForm({
  item,
  decision,
  label,
}: {
  item: ReviewQueueItem;
  decision: "approved" | "rejected" | "bad_angle";
  label: string;
}) {
  const itemId = getReviewItemId(item);

  return (
    <form action={saveReviewDecision}>
      <input type="hidden" name="painSignalId" value={itemId} />
      <input type="hidden" name="messageId" value={item.message?.id ?? ""} />
      <input type="hidden" name="decision" value={decision} />
      <button
        type="submit"
        className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
      >
        {label}
      </button>
    </form>
  );
}

export function ReviewQueueCard({
  item,
  itemId,
  isOpen,
  isSaved,
  onToggleEdit,
  onSaved,
}: {
  item: ReviewQueueItem;
  itemId: string;
  isOpen: boolean;
  isSaved: boolean;
  onToggleEdit: () => void;
  onSaved: (savedItemId: string) => void;
}) {
  return (
    <article className={getReviewCardClassName(item.hasHumanEdits)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {item.status.replaceAll("_", " ")}
            </span>
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 font-medium text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
              {item.opportunityScore.score}/100 {item.opportunityScore.label}
            </span>
            {item.hasHumanEdits ? (
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200">
                Human edited
              </span>
            ) : null}
          </div>
          <h2 className="text-lg font-semibold leading-snug text-zinc-950 dark:text-zinc-50">
            {item.pain}
          </h2>
          <dl className="grid grid-cols-2 gap-2 text-xs text-zinc-500 dark:text-zinc-400 sm:grid-cols-4">
            <div>
              <dt className="font-medium text-zinc-700 dark:text-zinc-200">Team</dt>
              <dd>{item.affectedTeam}</dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-700 dark:text-zinc-200">Urgency</dt>
              <dd>{item.urgency}</dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-700 dark:text-zinc-200">Monetization</dt>
              <dd>{item.monetizationScore}</dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-700 dark:text-zinc-200">Buyer</dt>
              <dd>{item.buyer}</dd>
            </div>
          </dl>
          <p className="rounded-xl bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-900/70 dark:text-zinc-300">
            <span className="font-medium text-zinc-800 dark:text-zinc-100">Angle:</span>{" "}
            {item.outreachAngle}
          </p>
          {item.message ? (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-900/60">
              <p className="font-medium text-zinc-800 dark:text-zinc-100">
                {item.message.subject}
              </p>
              <p className="mt-1 whitespace-pre-line leading-relaxed text-zinc-600 dark:text-zinc-300">
                {item.message.body}
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 lg:w-60">
          <DecisionForm item={item} decision="approved" label="Approve" />
          <DecisionForm item={item} decision="rejected" label="Reject" />
          <DecisionForm item={item} decision="bad_angle" label="Flag Bad Angle" />
        </div>
      </div>

      <ReviewEditForm
        item={item}
        itemId={itemId}
        isOpen={isOpen}
        isSaved={isSaved}
        onToggleEdit={onToggleEdit}
        onSaved={onSaved}
      />
    </article>
  );
}
