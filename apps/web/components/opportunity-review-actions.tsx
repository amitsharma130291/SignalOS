"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { updateOpportunityReviewStatus } from "@/app/actions/opportunities";
import { REVIEW_STATUSES, type ReviewStatus } from "@/lib/review-status";

const reviewActionInitialState = {
  status: "idle",
} as const;

const STATUS_LABELS: Record<ReviewStatus, string> = {
  new: "New",
  approved: "Approve",
  rejected: "Reject",
  interesting: "Interesting",
  follow_up_later: "Follow Up Later",
};

function ReviewButton({
  status,
  currentStatus,
}: {
  status: ReviewStatus;
  currentStatus: ReviewStatus;
}) {
  const { pending } = useFormStatus();
  const active = status === currentStatus;

  return (
    <button
      type="submit"
      name="status"
      value={status}
      disabled={pending || active}
      className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed ${
        active
          ? "border-indigo-500 bg-indigo-600 text-white shadow-sm dark:border-indigo-400 dark:bg-indigo-500"
          : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
      }`}
    >
      {STATUS_LABELS[status]}
    </button>
  );
}

export function OpportunityReviewActions({
  opportunityId,
  currentStatus,
}: {
  opportunityId: string;
  currentStatus: ReviewStatus;
}) {
  const [state, formAction] = useActionState(
    updateOpportunityReviewStatus,
    reviewActionInitialState,
  );
  const router = useRouter();

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/60"
    >
      <input type="hidden" name="painSignalId" value={opportunityId} />
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Human Review
      </p>
      <div className="flex flex-wrap gap-2">
        {REVIEW_STATUSES.map((status) => (
          <ReviewButton key={status} status={status} currentStatus={currentStatus} />
        ))}
      </div>
      {state.status === "error" && state.message ? (
        <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{state.message}</p>
      ) : null}
    </form>
  );
}
